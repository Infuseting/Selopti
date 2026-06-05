import { DOMScanner } from './scanner.js';
import { PropertyDataProvider } from './provider.js';
import { UIHTMLRenderer } from './ui.js';
import { geoManager } from './geo.js';
import { SeloptiInserter } from './insert.js';
import { getData, getBasicStats } from './extract.js';
import { seloptiExport } from './export.js';

const rentCache = new Map();

export class SeloptiEngine {
  constructor() {
    this.scanner = new DOMScanner((id, element, url) => this.handleMatchedElement(id, element, url));
    this.inserter = new SeloptiInserter();
  }

  init() {
    this.scanner.start(document);
  }

  handleMatchedElement(id, element, fullHref) {
    console.log("Selopti: handleMatchedElement called for", fullHref);
    PropertyDataProvider.fetchPropertyData(fullHref).then(async (result) => {
      console.log("Selopti: fetchPropertyData result", result);
      if (!result) return;
      const { zoneId, data } = result;
      const basicStats = getBasicStats(data);

      let averageRentM2 = null;
      if (zoneId) {
        console.log("Selopti: engine.js: zoneId is present:", zoneId);
        if (!rentCache.has(zoneId)) {
          console.log("Selopti: engine.js: zoneId not in cache, creating promise");
          // On stocke directement la Promesse. Toutes les autres exécutions vont "attendre" cette même promesse.
          const fetchPromise = new Promise((resolve) => {
            console.log("Selopti: engine.js: Promise executing for zoneId:", zoneId);
            const handler = (e) => {
              console.log("Selopti: engine.js: rent-result handler triggered for zoneId", zoneId);
              window.removeEventListener(`selopti:rent-result-${zoneId}`, handler);
              const rentData = e.detail;
              if (rentData?.items?.length > 0) {
                const item = rentData.items[0];
                resolve(item.apartmentPrice?.value || item.housePrice?.value || item.hybridPrice?.value || null);
              } else {
                resolve(null);
              }
            };
            window.addEventListener(`selopti:rent-result-${zoneId}`, handler);
            console.log("Selopti: engine.js: dispatching selopti:do-fetch-rent event");
            window.dispatchEvent(new CustomEvent('selopti:do-fetch-rent', { detail: zoneId }));
          });
          rentCache.set(zoneId, fetchPromise);
        }
        // Si 10 requêtes partent en même temps, les 9 suivantes feront simplement un await sur la promesse de la 1ère !
        console.log("Selopti: engine.js: awaiting averageRentM2");
        averageRentM2 = await rentCache.get(zoneId);
        console.log("Selopti: engine.js: averageRentM2 is", averageRentM2);
      } else {
        console.log("Selopti: engine.js: NO zoneId for this element");
      }

      geoManager.subscribe(id, async (geoData) => {
        const { coordinates } = geoData;
        const extractData = getData(data);

        // Exclure l'estimation de facture énergétique (coût locataire, pas propriétaire)
        const CHARGES_A_EXCLURE = ["estimation de la facture énergétique"];
        const fraisMensuel = (extractData?.priceInfo ?? [])
          .filter(price => !CHARGES_A_EXCLURE.some(label => price[0]?.toLowerCase().includes(label)))
          .map(price => {
            const text = price[1];
            // Normalise le séparateur de milliers français : "2.145" → "2145"
            const normalized = text.replace(/(\d{1,3})\.(\d{3})(?!\d)/g, '$1$2');
            const nombres = (normalized.match(/\d+/g) ?? [])
              .map(Number)
              .filter(n => !(n >= 1900 && n <= 2099)); // exclure les années
            if (nombres.length === 0) return 0;
            // Moyenne des bornes pour les plages "entre X et Y"
            const valeur = nombres.reduce((a, b) => a + b, 0) / nombres.length;
            const lower = text.toLowerCase();
            if (lower.includes("trimestre")) return valeur / 3;
            if (lower.includes("/an") || lower.includes("€/an") || /\ban\b/.test(lower) || lower.includes("annuel")) return valeur / 12;
            return valeur; // défaut : mensuel
          })
          .reduce((a, b) => a + b, 0);
        const bedrooms = basicStats.bedrooms || 0;
        const surface = basicStats.surface || 0;
        const classicMonthly = (averageRentM2 && surface) ? averageRentM2 * surface : 0;
        const classicAnnual = classicMonthly * 12;

        // Modèle coloc : chaque chambre loue sa surface privative à un tarif €/m² supérieur
        // (les chambres en coloc se louent ~50% plus cher au m² qu'un appart entier car offre fragmentée)
        // Les espaces communs (~20m²) sont répartis implicitement dans le tarif de chambre.
        const COLOC_COMMON_AREA_M2 = 20; // cuisine, salle de bain, couloir
        const COLOC_ROOM_PREMIUM = 1.5;  // prime €/m² par rapport au marché appart entier
        const MIN_ROOM_M2 = 9;           // minimum légal en France
        const privateM2PerRoom = bedrooms > 0
          ? Math.max(MIN_ROOM_M2, (surface - COLOC_COMMON_AREA_M2) / bedrooms)
          : 0;
        const roomPrice = (privateM2PerRoom > 0 && averageRentM2)
          ? privateM2PerRoom * averageRentM2 * COLOC_ROOM_PREMIUM
          : 0;
        const colocMonthly = roomPrice * bedrooms;
        const colocAnnual = colocMonthly * 12;




        // Prix : DOM = prix affiché sur la page (source fiable), tracking = prix analytics
        const propertyPrice = extractData?.price || basicStats?.price || 0;
        const trackingPrice = basicStats?.price || 0;
        const downPayment = propertyPrice * 0.20;
        const loanAmount = propertyPrice * 0.80;
        const annualRate = 0.04;
        const monthlyRate = annualRate / 12;
        const loanDurationYears = 20;
        const numPayments = loanDurationYears * 12;
        const monthlyMortgage = loanAmount > 0 ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) : 0;
        const annualMortgage = monthlyMortgage * 12;

        const classicNetCashflowMonthly = classicMonthly - fraisMensuel - monthlyMortgage;
        const classicNetCashflowAnnual = classicAnnual - (fraisMensuel * 12) - annualMortgage;
        // Rentabilité brute = loyers bruts / prix (sans déduire charges ni crédit)
        const classicRentabilityBrute = propertyPrice > 0 ? (classicAnnual / propertyPrice) * 100 : 0;
        // Rentabilité nette = (loyers - charges exploitation) / prix (hors financement)
        const classicRentabilityNette = propertyPrice > 0 ? ((classicAnnual - fraisMensuel * 12) / propertyPrice) * 100 : 0;

        const simulationsData = {
          loanDetails: {
            propertyPrice: propertyPrice,
            trackingPrice: trackingPrice,
            downPayment: downPayment,
            loanAmount: loanAmount,
            rate: annualRate,
            durationYears: loanDurationYears
          }
        };

        simulationsData["classic"] = {
          monthlyRent: classicMonthly,
          annualRevenue: classicAnnual,
          monthlyFrais: fraisMensuel,
          annualFrais: fraisMensuel * 12,
          monthlyMortgage: monthlyMortgage,
          annualMortgage: annualMortgage,
          netCashflowMonthly: classicNetCashflowMonthly,
          netCashflowAnnual: classicNetCashflowAnnual,
          rentabilityBrute: classicRentabilityBrute,
          rentabilityNette: classicRentabilityNette
        };

        if (bedrooms > 1) {
          const colocNetCashflowMonthly = colocMonthly - fraisMensuel - monthlyMortgage;
          const colocNetCashflowAnnual = colocAnnual - (fraisMensuel * 12) - annualMortgage;
          const colocRentabilityBrute = propertyPrice > 0 ? (colocAnnual / propertyPrice) * 100 : 0;
          const colocRentabilityNette = propertyPrice > 0 ? ((colocAnnual - fraisMensuel * 12) / propertyPrice) * 100 : 0;

          simulationsData["collocation"] = {
            roomPrice: roomPrice,
            monthlyRent: colocMonthly,
            annualRevenue: colocAnnual,
            monthlyFrais: fraisMensuel,
            annualFrais: fraisMensuel * 12,
            monthlyMortgage: monthlyMortgage,
            annualMortgage: annualMortgage,
            netCashflowMonthly: colocNetCashflowMonthly,
            netCashflowAnnual: colocNetCashflowAnnual,
            rentabilityBrute: colocRentabilityBrute,
            rentabilityNette: colocRentabilityNette,
            params: {
              bedrooms: bedrooms,
              privateM2PerRoom: Math.round(privateM2PerRoom * 10) / 10,
              commonAreaM2: COLOC_COMMON_AREA_M2,
              roomPremium: COLOC_ROOM_PREMIUM
            }
          };
        }


        const finalData = {
          ...extractData,
          coordinates: geoData.coordinates,
          georisques: geoData.georisques,
          averageRentM2,
          simulations: simulationsData
        };

        seloptiExport.save({
          url: fullHref,
          zoneId,
          basicStats,
          extractData,
          averageRentM2,
          geoData,
          simulations: simulationsData
        });

        const html = UIHTMLRenderer.renderDetailsHTML(finalData, averageRentM2);
        this.inserter.insertHTML(id, element, html);
      });
    });
  }
}
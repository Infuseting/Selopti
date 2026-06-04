import { DOMScanner } from './scanner.js';
import { PropertyDataProvider } from './provider.js';
import { UIHTMLRenderer } from './ui.js';
import { geoManager } from './geo.js';
import { SeloptiInserter } from './insert.js';
import { getData, getBasicStats } from './extract.js';

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
        coordinates.longitude;
        coordinates.latitude;

        const COLOC_COEF = 0.75
        const fraisMensuel = extractData?.priceInfo.map(price => {
          const nombres = price[1].match(/\d+/g).map(Number);
          const plusGrand = Math.max(...nombres);
          const type = price[1].toLowerCase().includes("an") ? "annual" : "monthly";
          return type === "annual" ? plusGrand / 12 : plusGrand;
        }).reduce((a, b) => a + b, 0)
        const bedrooms = basicStats.bedrooms || 0;
        const surface = basicStats.surface || 0;
        const classicMonthly = (averageRentM2 && surface) ? averageRentM2 * surface : 0;
        const classicAnnual = classicMonthly * 12;
        const studioBaseline = 0;
        const roomPrice = classicMonthly * COLOC_COEF;
        const colocMonthly = roomPrice * bedrooms;
        const colocAnnual = colocMonthly * 12;




        const propertyPrice = extractData?.price;
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
        const classicRentability = propertyPrice > 0 ? (classicNetCashflowAnnual / propertyPrice) * 100 : 0;

        const simulationsData = {
          loanDetails: {
            propertyPrice: propertyPrice,
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
          rentabilityPercent: classicRentability
        };

        if (bedrooms > 1) {
          const colocNetCashflowMonthly = colocMonthly - fraisMensuel - monthlyMortgage;
          const colocNetCashflowAnnual = colocAnnual - (fraisMensuel * 12) - annualMortgage;
          const colocRentability = propertyPrice > 0 ? (colocNetCashflowAnnual / propertyPrice) * 100 : 0;

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
            rentabilityPercent: colocRentability,
            params: {
              bedrooms: bedrooms,
              studioBaseline: studioBaseline,
              coefficient: COLOC_COEF
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

        const html = UIHTMLRenderer.renderDetailsHTML(finalData);
        this.inserter.insertHTML(id, element, html);
      });
    });
  }
}
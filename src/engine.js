import { DOMScanner } from './scanner.js';
import { PropertyDataProvider } from './provider.js';
import { UIHTMLRenderer } from './ui.js';
import { geoManager } from './geo.js';
import { SeloptiInserter } from './insert.js';
import { getData, getBasicStats } from './extract.js';
import { rentManager } from './rent.js';

export class SeloptiEngine {
  constructor() {
    this.scanner = new DOMScanner((id, element, url) => this.handleMatchedElement(id, element, url));
    this.inserter = new SeloptiInserter();
  }

  init() {
    this.scanner.start(document);
  }

  handleMatchedElement(id, element, fullHref) {
    PropertyDataProvider.fetchPropertyData(fullHref).then(async (data) => {
      const basicStats = getBasicStats(data);

      geoManager.subscribe(id, async (geoData) => {
        const { coordinates } = geoData;
        let taxEstimate = null;
        if (coordinates?.latitude && coordinates?.longitude && basicStats.surface != null) {
          const taxUrl = `http://localhost:8080/api/tax/estimate?lat=${coordinates.latitude}&lon=${coordinates.longitude}&surface=${basicStats.surface || 65}&type=D`;
          console.log('[Selopti] Tax API request:', taxUrl);
          try {
            const taxRes = await fetch(taxUrl);
            taxEstimate = await taxRes.json();
            console.log('[Selopti] Tax API response:', taxEstimate);
          } catch (e) {
            console.warn('[Selopti] Tax API unavailable:', e);
          }
        } else {
          console.warn('[Selopti] Tax API skipped — missing coordinates or surface', { coordinates, surface: basicStats.surface });
        }

        const extractData = getData(data, taxEstimate);

        rentManager.fetchLocalRent(basicStats.zipCode).then(rentEstimate => {
          const COLOC_COEF = 0.75
          const fraisMensuel = extractData?.priceInfo.map(price => {
            const nombres = price[1].match(/\d+/g).map(Number);
            const plusGrand = Math.max(...nombres);
            const type = price[1].toLowerCase().includes("an") ? "annual" : "monthly";
            return type === "annual" ? plusGrand / 12 : plusGrand;
          }).reduce((a, b) => a + b, 0)
          const bedrooms = basicStats.bedrooms || 0;
          const classicMonthly = rentEstimate?.rentPerSqm * basicStats.surface || 0;
          const classicAnnual = classicMonthly * 12;
          const studioBaseline = Math.round(rentEstimate?.rentPerSqm * 12);
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
            rentEstimate: rentEstimate,
            simulations: simulationsData,
            taxEstimate: taxEstimate
          };

          const html = UIHTMLRenderer.renderDetailsHTML(finalData);
          this.inserter.insertHTML(id, element, html);
        });
      });
    });
  }
}
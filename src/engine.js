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
    PropertyDataProvider.fetchPropertyData(fullHref).then((data) => {
      const extractData = getData(data);
      const basicStats = getBasicStats(data);

      geoManager.subscribe(id, (geoData) => {
        rentManager.fetchLocalRent(basicStats.zipCode, basicStats.surface).then(rentEstimate => {
          // Calculations for simulations
          const price = basicStats.price || 0;
          const bedrooms = basicStats.bedrooms || 0;
          
          // 1. Classic Rental
          const classicMonthly = rentEstimate?.estimatedRent || 0;
          const classicAnnual = classicMonthly * 12;
          const classicYield = price > 0 ? (classicAnnual / price) * 100 : 0;

          // 2. Colocation Rental
          // Based on a studio baseline (20m2) with a 0.85 attractive coefficient
          const rentPerSqm = rentEstimate?.rentPerSqm || 0;
          const studioBaseline = Math.round(rentPerSqm * 20);
          const roomPrice = Math.round(studioBaseline * 0.85);
          const colocMonthly = roomPrice * bedrooms;
          const colocAnnual = colocMonthly * 12;
          const colocYield = price > 0 ? (colocAnnual / price) * 100 : 0;

          const finalData = {
            ...extractData,
            coordinates: geoData.coordinates,
            georisques: geoData.georisques,
            rentEstimate: rentEstimate,
            simulations: {
              classic: {
                monthlyRent: classicMonthly,
                annualRevenue: classicAnnual,
                grossYield: classicYield.toFixed(2) + " %"
              },
              colocation: {
                roomPrice: roomPrice,
                monthlyRent: colocMonthly,
                annualRevenue: colocAnnual,
                grossYield: colocYield.toFixed(2) + " %",
                params: {
                  bedrooms: bedrooms,
                  studioBaseline: studioBaseline,
                  coefficient: 0.85
                }
              }
            }
          };

          const html = UIHTMLRenderer.renderDetailsHTML(finalData);
          this.inserter.insertHTML(id, element, html);
        });
      });
    });
  }
}
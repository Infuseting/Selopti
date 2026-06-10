import { DOMScanner } from './scanner.js';
import { PropertyDataProvider } from './provider.js';
import { UIHTMLRenderer } from './ui.js';
import { geoManager } from './geo.js';
import { SeloptiInserter } from './insert.js';
import { getData, getBasicStats } from './extract.js';
import { seloptiExport } from './export.js';
import { RentService } from './services/RentService.js';
import { PriceHistoryService } from './services/PriceHistoryService.js';
import { ChargesParser } from './finance/ChargesParser.js';
import { MortgageCalculator } from './finance/MortgageCalculator.js';
import { FinancialSimulator } from './finance/FinancialSimulator.js';
import { normalizeSeloptiConfig } from './config.js';

/**
 * SeloptiEngine
 *
 * Single Responsibility: orchestrate the data-flow from DOM element detection
 * to final UI rendering.  All heavy lifting is delegated to injected services.
 *
 * Dependency Inversion: depends on abstractions passed at construction time,
 * not on concrete singletons or hard-coded `new` calls.
 */
export class SeloptiEngine {
  /**
   * @param {object} [deps] - Optional dependency overrides (useful for testing).
   * @param {DOMScanner}          [deps.scanner]
   * @param {SeloptiInserter}     [deps.inserter]
   * @param {RentService}         [deps.rentService]
   * @param {PriceHistoryService} [deps.priceHistoryService]
   * @param {ChargesParser}       [deps.chargesParser]
   * @param {FinancialSimulator}  [deps.simulator]
   */
  constructor({
    scanner,
    inserter,
    rentService,
    priceHistoryService,
    chargesParser,
    simulator,
    config,
  } = {}) {
    const runtimeConfig = normalizeSeloptiConfig(config);
    this.inserter = inserter ?? new SeloptiInserter();
    this._rentService = rentService ?? new RentService();
    this._priceHistoryService = priceHistoryService ?? new PriceHistoryService(runtimeConfig.priceTracker);
    this._chargesParser = chargesParser ?? new ChargesParser(runtimeConfig.chargesExcludedLabels);
    this._simulator = simulator ?? new FinancialSimulator(
      new MortgageCalculator(runtimeConfig.mortgage),
      runtimeConfig.coloc,
    );
    this.scanner = scanner ?? new DOMScanner(
      (id, element, url) => this._handleMatchedElement(id, element, url),
    );
  }

  init() {
    this.scanner.start(document);
  }

  async _handleMatchedElement(id, element, fullHref) {
    this.inserter.insertHTML(id, element, UIHTMLRenderer.renderLoadingHTML());

    const result = await PropertyDataProvider.fetchPropertyData(fullHref);
    if (!result) return;
    

    const { zoneId, data } = result;
    const basicStats = getBasicStats(data);
    const averageRentM2 = zoneId
      ? await this._rentService.fetchAverageRentM2(zoneId)
      : null;

    geoManager.subscribe(id, (geoData) => {
      this._renderProperty({ id, element, fullHref, zoneId, data, basicStats, averageRentM2, geoData });
    });
  }

  async _renderProperty({ id, element, fullHref, zoneId, data, basicStats, averageRentM2, geoData }) {
    const extractData = getData(data);
    const monthlyCharges = this._chargesParser.parseMonthly(extractData?.priceInfo);
    const propertyPrice = extractData?.price || basicStats?.price || 0;

    const priceHistory = await this._priceHistoryService.track(fullHref, propertyPrice);

    const simulationsData = this._simulator.simulate({
      propertyPrice,
      trackingPrice: basicStats?.price || 0,
      surface: basicStats.surface || 0,
      bedrooms: basicStats.bedrooms || 0,
      monthlyCharges,
      averageRentM2,
    });

    const finalData = {
      ...extractData,
      coordinates: geoData.coordinates,
      georisques: geoData.georisques,
      averageRentM2,
      simulations: simulationsData,
      priceHistory,
    };

    seloptiExport.save({
      url: fullHref,
      zoneId,
      basicStats,
      extractData,
      averageRentM2,
      geoData,
      simulations: simulationsData,
      priceHistory,
    });

    const html = UIHTMLRenderer.renderDetailsHTML(finalData, averageRentM2);
    this.inserter.insertHTML(id, element, html);
  }
}
import { COLOC_CONFIG } from '../config.js';

/**
 * FinancialSimulator
 *
 * Single Responsibility: orchestrate investment simulation scenarios for a
 * given property, producing a unified `simulationsData` object consumed by
 * the UI renderer and the exporter.
 *
 * Open/Closed: new rental scenarios (e.g. Airbnb short-term) can be added
 * without modifying existing logic — simply extend `_buildScenarios` or
 * subclass `FinancialSimulator`.
 *
 * Dependency Inversion: depends on the `MortgageCalculator` abstraction
 * injected at construction time, not on a concrete implementation.
 */
export class FinancialSimulator {
  /**
   * @param {import('./MortgageCalculator.js').MortgageCalculator} mortgageCalculator
   * @param {typeof COLOC_CONFIG} [colocConfig]
   */
  constructor(mortgageCalculator, colocConfig = COLOC_CONFIG) {
    this._mortgage = mortgageCalculator;
    this._colocConfig = colocConfig;
  }

  /**
   * Run all applicable simulations for a property.
   *
   * @param {object}      params
   * @param {number}      params.propertyPrice   - Displayed / DOM price.
   * @param {number}      params.trackingPrice   - Analytics tracking price.
   * @param {number}      params.surface         - Property surface in m².
   * @param {number}      params.bedrooms        - Number of bedrooms.
   * @param {number}      params.monthlyCharges  - Pre-computed monthly owner costs.
   * @param {number|null} params.averageRentM2   - Market rent in €/m² (or null).
   * @returns {object} simulationsData
   */
  simulate({ propertyPrice, trackingPrice, surface, bedrooms, monthlyCharges, averageRentM2 }) {
    const mortgage = this._mortgage.compute(propertyPrice);

    const simulationsData = {
      loanDetails: {
        propertyPrice,
        trackingPrice,
        downPayment: mortgage.downPayment,
        loanAmount: mortgage.loanAmount,
        rate: mortgage.rate,
        durationYears: mortgage.durationYears,
      },
    };

    // ── Classic rental ──────────────────────────────────────────────────────
    const classicMonthlyRent = this._computeClassicMonthly(surface, averageRentM2);
    simulationsData.classic = this._buildScenario({
      monthlyRent: classicMonthlyRent,
      monthlyCharges,
      mortgage,
      propertyPrice,
    });

    // ── Colocation (only applicable with 2+ bedrooms) ───────────────────────
    if (bedrooms > 1) {
      const privateM2PerRoom = this._computePrivateM2PerRoom(surface, bedrooms);
      const colocMonthlyRent = this._computeColocMonthly(privateM2PerRoom, bedrooms, averageRentM2);
      const roomPrice = bedrooms > 0 ? colocMonthlyRent / bedrooms : 0;
      const { commonAreaM2, roomPremium } = this._colocConfig;

      simulationsData.collocation = {
        roomPrice,
        ...this._buildScenario({
          monthlyRent: colocMonthlyRent,
          monthlyCharges,
          mortgage,
          propertyPrice,
        }),
        params: {
          bedrooms,
          privateM2PerRoom: Math.round(privateM2PerRoom * 10) / 10,
          commonAreaM2,
          roomPremium,
        },
      };
    }

    return simulationsData;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Build a standardised scenario result object.
   * @private
   */
  _buildScenario({ monthlyRent, monthlyCharges, mortgage, propertyPrice }) {
    const annualRent = monthlyRent * 12;
    const annualCharges = monthlyCharges * 12;

    return {
      monthlyRent,
      annualRevenue: annualRent,
      monthlyFrais: monthlyCharges,
      annualFrais: annualCharges,
      monthlyMortgage: mortgage.monthlyPayment,
      annualMortgage: mortgage.annualPayment,
      netCashflowMonthly: monthlyRent - monthlyCharges - mortgage.monthlyPayment,
      netCashflowAnnual: annualRent - annualCharges - mortgage.annualPayment,
      // Gross yield: gross rents / price (no charges, no financing)
      rentabilityBrute: propertyPrice > 0 ? (annualRent / propertyPrice) * 100 : 0,
      // Net yield: (rents − operating charges) / price (no financing)
      rentabilityNette: propertyPrice > 0 ? ((annualRent - annualCharges) / propertyPrice) * 100 : 0,
    };
  }

  /** @private */
  _computeClassicMonthly(surface, averageRentM2) {
    return averageRentM2 && surface ? averageRentM2 * surface : 0;
  }

  /** @private */
  _computePrivateM2PerRoom(surface, bedrooms) {
    const { commonAreaM2, minRoomM2 } = this._colocConfig;
    return bedrooms > 0
      ? Math.max(minRoomM2, (surface - commonAreaM2) / bedrooms)
      : 0;
  }

  /** @private */
  _computeColocMonthly(privateM2PerRoom, bedrooms, averageRentM2) {
    if (!averageRentM2 || privateM2PerRoom <= 0) return 0;
    return privateM2PerRoom * averageRentM2 * this._colocConfig.roomPremium * bedrooms;
  }
}

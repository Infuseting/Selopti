import { MORTGAGE_DEFAULTS } from '../config.js';

/**
 * MortgageCalculator
 *
 * Single Responsibility: compute standard annuity mortgage figures for a
 * given property price using configurable loan parameters.
 *
 * The calculation uses the standard annuity formula:
 *   M = P × (r(1+r)^n) / ((1+r)^n − 1)
 * where P = loan principal, r = monthly rate, n = number of payments.
 */
export class MortgageCalculator {
  /**
   * @param {object} [params]
   * @param {number} [params.annualRate]       - Annual interest rate (default 4 %).
   * @param {number} [params.durationYears]    - Loan term in years (default 20).
   * @param {number} [params.downPaymentRatio] - Down-payment fraction (default 20 %).
   */
  constructor({
    annualRate = MORTGAGE_DEFAULTS.annualRate,
    durationYears = MORTGAGE_DEFAULTS.durationYears,
    downPaymentRatio = MORTGAGE_DEFAULTS.downPaymentRatio,
  } = {}) {
    this.annualRate = annualRate;
    this.durationYears = durationYears;
    this.downPaymentRatio = downPaymentRatio;
  }

  /**
   * Compute all mortgage figures for a given property price.
   *
   * @param {number} propertyPrice
   * @returns {{
   *   downPayment: number,
   *   loanAmount: number,
   *   monthlyPayment: number,
   *   annualPayment: number,
   *   rate: number,
   *   durationYears: number,
   * }}
   */
  compute(propertyPrice) {
    const downPayment = propertyPrice * this.downPaymentRatio;
    const loanAmount = propertyPrice * (1 - this.downPaymentRatio);

    const monthlyRate = this.annualRate / 12;
    const numPayments = this.durationYears * 12;
    const factor = Math.pow(1 + monthlyRate, numPayments);

    const monthlyPayment =
      loanAmount > 0
        ? loanAmount * (monthlyRate * factor) / (factor - 1)
        : 0;

    return {
      downPayment,
      loanAmount,
      monthlyPayment,
      annualPayment: monthlyPayment * 12,
      rate: this.annualRate,
      durationYears: this.durationYears,
    };
  }
}

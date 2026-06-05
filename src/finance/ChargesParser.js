import { CHARGES_EXCLUDED_LABELS } from '../config.js';

/**
 * ChargesParser
 *
 * Single Responsibility: convert a structured `priceInfo` array (pairs of
 * [label, valueText]) into a single monthly owner-cost figure in euros.
 *
 * Knows how to:
 *  - Skip items whose label matches an exclusion list (e.g. tenant energy bills).
 *  - Normalise French number formatting ("2.145" → 2145).
 *  - Convert quarterly / annual amounts to a monthly equivalent.
 *  - Average range values ("entre X et Y" → (X+Y)/2).
 */
export class ChargesParser {
  /**
   * @param {string[]} [excludedLabels] - Lowercase substrings; entries whose
   *   label contains any of these strings are skipped.
   */
  constructor(excludedLabels = CHARGES_EXCLUDED_LABELS) {
    this._excludedLabels = excludedLabels;
  }

  /**
   * Computes the total monthly charges from a priceInfo array.
   *
   * @param {Array<[string, string]>} priceInfo
   * @returns {number} Total monthly amount in €.
   */
  parseMonthly(priceInfo) {
    return (priceInfo ?? [])
      .filter(([label]) => !this._isExcluded(label))
      .map(([, text]) => this._toMonthlyAmount(text))
      .reduce((sum, value) => sum + value, 0);
  }

  /** @private */
  _isExcluded(label) {
    const lower = (label ?? '').toLowerCase();
    return this._excludedLabels.some((excluded) => lower.includes(excluded));
  }

  /** @private */
  _toMonthlyAmount(text) {
    // Normalise French thousands separator: "2.145" → "2145"
    const normalized = text.replace(/(\d{1,3})\.(\d{3})(?!\d)/g, '$1$2');

    const numbers = (normalized.match(/\d+/g) ?? [])
      .map(Number)
      .filter((n) => !(n >= 1900 && n <= 2099)); // exclude years

    if (numbers.length === 0) return 0;

    // Average the bounds for range values ("entre X et Y")
    const value = numbers.reduce((a, b) => a + b, 0) / numbers.length;

    const lower = text.toLowerCase();
    if (lower.includes('trimestre')) return value / 3;
    if (
      lower.includes('/an') ||
      lower.includes('€/an') ||
      /\ban\b/.test(lower) ||
      lower.includes('annuel')
    ) {
      return value / 12;
    }

    return value; // default: treat as monthly
  }
}

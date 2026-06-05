/**
 * Selopti – Centralized configuration.
 * All magic numbers, tuning parameters and domain constants live here.
 * Modify this file to adjust simulation defaults without touching business logic.
 */

/** Default mortgage simulation parameters. */
export const MORTGAGE_DEFAULTS = {
  /** Annual interest rate, e.g. 0.04 = 4 %. */
  annualRate: 0.02,
  /** Loan duration in years. */
  durationYears: 20,
  /** Fraction of the property price paid upfront as a down payment. */
  downPaymentRatio: 0,
};

/** Colocation (house-sharing) simulation parameters. */
export const COLOC_CONFIG = {
  /** Assumed private bedroom size in m² for house-sharing simulations. */
  roomSizeM2: 10,
  /** Weight applied to shared area value in per-room pricing. */
  appartCoef: 0.4,
};

/**
 * Labels (lowercase substrings) for charge items that are TENANT costs,
 * not owner costs, and must be excluded from the monthly-charges computation.
 */
export const CHARGES_EXCLUDED_LABELS = [
  'estimation de la facture énergétique',
];

/**
 * Regex to extract the zone ID from the SeLoger page HTML.
 * Matches the last path segment of any `city-zipcode/ZONEID` pattern.
 * Example match: `/rouen-76000/ABC123` → captures `ABC123`.
 */
export const ZONE_ID_REGEX = /\/[a-zA-Z-]+-\d{5}\/([a-zA-Z0-9]+)/;

/** Regex to extract a SeLoger property ID from URLs ending in `123456789.htm`. */
export const PROPERTY_ID_REGEX = /(\d*)\.htm/;

/** Remote API configuration for property price history tracking. */
export const PRICE_TRACKER_CONFIG = {
  /** Set to false to disable HTTP tracking without code changes. */
  enabled: true,
  /** Server endpoint receiving `{ propertyId, url, price }` and returning graph data. */
  endpoint: 'http://localhost:3000/api/prices/track',
  /** Abort remote tracking request after this timeout (ms). */
  timeoutMs: 5000,
};

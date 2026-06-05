/**
 * Selopti – Centralized configuration.
 * All magic numbers, tuning parameters and domain constants live here.
 * Modify this file to adjust simulation defaults without touching business logic.
 */

/** Default mortgage simulation parameters. */
export const MORTGAGE_DEFAULTS = {
  /** Annual interest rate, e.g. 0.04 = 4 %. */
  annualRate: 0.04,
  /** Loan duration in years. */
  durationYears: 20,
  /** Fraction of the property price paid upfront as a down payment. */
  downPaymentRatio: 0.20,
};

/** Colocation (house-sharing) simulation parameters. */
export const COLOC_CONFIG = {
  /** Estimated shared-area m² (kitchen, bathroom, hallway). */
  commonAreaM2: 20,
  /** Price premium per m² for individual rooms vs. a whole apartment.
   *  Rooms in shared housing rent ~50 % dearer per m² due to fractional supply. */
  roomPremium: 1.5,
  /** French legal minimum room size in m². */
  minRoomM2: 9,
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

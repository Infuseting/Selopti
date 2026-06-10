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
  downPaymentRatio: 0.20,
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
export const PRICE_TRACKER_DEFAULTS = {
  /** Set to false to disable HTTP tracking without code changes. */
  enabled: true,
  /** Server endpoint receiving `{ propertyId, url, price }` and returning graph data. */
  endpoint: 'http://localhost:3000/api/prices/track',
  /** Abort remote tracking request after this timeout (ms). */
  timeoutMs: 5000,
  /** Time window used to aggregate tracking writes into a single request. */
  batchWindowMs: 100,
  /** Maximum number of requests grouped into one batch. */
  batchSize: 25,
};

export const PRICE_TRACKER_CONFIG = PRICE_TRACKER_DEFAULTS;
export const PRICE_TRACKER_STORAGE_KEY = 'selopti_price_tracker_config';
export const SELOPTI_CONFIG_STORAGE_KEY = 'selopti_config';
export const SELOPTI_CONFIG_DEFAULTS = {
  mortgage: {
    ...MORTGAGE_DEFAULTS,
  },
  coloc: {
    ...COLOC_CONFIG,
  },
  chargesExcludedLabels: [...CHARGES_EXCLUDED_LABELS],
  priceTracker: {
    ...PRICE_TRACKER_DEFAULTS,
  },
};

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toNonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toRatio(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed > 1) return parsed / 100;
  return parsed;
}

function toStringList(value, fallback) {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => String(item).trim())
      .filter(Boolean);
    return items.length > 0 ? [...new Set(items)] : fallback;
  }

  if (typeof value === 'string') {
    const items = value
      .split(/[\n,;]/g)
      .map((item) => String(item).trim())
      .filter(Boolean);
    return items.length > 0 ? [...new Set(items)] : fallback;
  }

  return fallback;
}

export function normalizeMortgageConfig(config = {}) {
  return {
    annualRate: toRatio(config.annualRate, MORTGAGE_DEFAULTS.annualRate),
    durationYears: toPositiveInteger(config.durationYears, MORTGAGE_DEFAULTS.durationYears),
    downPaymentRatio: toRatio(config.downPaymentRatio, MORTGAGE_DEFAULTS.downPaymentRatio),
  };
}

export function normalizeColocConfig(config = {}) {
  return {
    roomSizeM2: toFiniteNumber(config.roomSizeM2, COLOC_CONFIG.roomSizeM2),
    appartCoef: toFiniteNumber(config.appartCoef, COLOC_CONFIG.appartCoef),
  };
}

export function normalizeChargesExcludedLabels(value = []) {
  return toStringList(value, CHARGES_EXCLUDED_LABELS);
}

export function normalizePriceTrackerConfig(config = {}) {
  return {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : PRICE_TRACKER_DEFAULTS.enabled,
    endpoint: typeof config.endpoint === 'string' && config.endpoint.trim()
      ? config.endpoint.trim()
      : PRICE_TRACKER_DEFAULTS.endpoint,
    timeoutMs: toPositiveInteger(config.timeoutMs, PRICE_TRACKER_DEFAULTS.timeoutMs),
    batchWindowMs: toNonNegativeInteger(config.batchWindowMs, PRICE_TRACKER_DEFAULTS.batchWindowMs),
    batchSize: toPositiveInteger(config.batchSize, PRICE_TRACKER_DEFAULTS.batchSize),
  };
}

export function normalizeSeloptiConfig(config = {}) {
  return {
    mortgage: normalizeMortgageConfig(config.mortgage ?? config.mortgageDefaults ?? {}),
    coloc: normalizeColocConfig(config.coloc ?? config.colocConfig ?? {}),
    chargesExcludedLabels: normalizeChargesExcludedLabels(
      config.chargesExcludedLabels ?? config.charges?.excludedLabels ?? [],
    ),
    priceTracker: normalizePriceTrackerConfig(
      config.priceTracker ?? config.priceTrackerConfig ?? config.tracker ?? {},
    ),
  };
}

async function storageGet(key) {
  const browserStorage = globalThis.browser?.storage?.local;
  if (browserStorage?.get) {
    return browserStorage.get(key);
  }

  const chromeStorage = globalThis.chrome?.storage?.local;
  if (!chromeStorage?.get) return {};

  return new Promise((resolve) => {
    chromeStorage.get(key, (result) => resolve(result ?? {}));
  });
}

async function storageSet(values) {
  const browserStorage = globalThis.browser?.storage?.local;
  if (browserStorage?.set) {
    return browserStorage.set(values);
  }

  const chromeStorage = globalThis.chrome?.storage?.local;
  if (!chromeStorage?.set) return undefined;

  return new Promise((resolve) => {
    chromeStorage.set(values, () => resolve());
  });
}

async function storageRemove(key) {
  const browserStorage = globalThis.browser?.storage?.local;
  if (browserStorage?.remove) {
    return browserStorage.remove(key);
  }

  const chromeStorage = globalThis.chrome?.storage?.local;
  if (!chromeStorage?.remove) return undefined;

  return new Promise((resolve) => {
    chromeStorage.remove(key, () => resolve());
  });
}

export async function loadPriceTrackerConfig() {
  const config = await loadSeloptiConfig();
  return config.priceTracker;
}

export async function savePriceTrackerConfig(config) {
  const existing = await loadSeloptiConfig();
  const next = {
    ...existing,
    priceTracker: normalizePriceTrackerConfig(config),
  };
  await saveSeloptiConfig(next);
  return next.priceTracker;
}

export async function resetPriceTrackerConfig() {
  const existing = await loadSeloptiConfig();
  const next = {
    ...existing,
    priceTracker: { ...PRICE_TRACKER_DEFAULTS },
  };
  await saveSeloptiConfig(next);
  return next.priceTracker;
}

export async function loadSeloptiConfig() {
  const raw = await storageGet(SELOPTI_CONFIG_STORAGE_KEY);
  const savedConfig = raw?.[SELOPTI_CONFIG_STORAGE_KEY];
  if (savedConfig) {
    return normalizeSeloptiConfig(savedConfig);
  }

  const legacyTracker = await storageGet(PRICE_TRACKER_STORAGE_KEY);
  const legacyTrackerConfig = legacyTracker?.[PRICE_TRACKER_STORAGE_KEY];
  if (legacyTrackerConfig) {
    return normalizeSeloptiConfig({ priceTracker: legacyTrackerConfig });
  }

  return normalizeSeloptiConfig();
}

export async function saveSeloptiConfig(config) {
  const normalized = normalizeSeloptiConfig(config);
  await storageSet({
    [SELOPTI_CONFIG_STORAGE_KEY]: normalized,
    [PRICE_TRACKER_STORAGE_KEY]: normalized.priceTracker,
  });
  return normalized;
}

export async function resetSeloptiConfig() {
  await storageRemove(SELOPTI_CONFIG_STORAGE_KEY);
  await storageRemove(PRICE_TRACKER_STORAGE_KEY);
  return normalizeSeloptiConfig();
}

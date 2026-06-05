import { PRICE_TRACKER_CONFIG, PROPERTY_ID_REGEX } from '../config.js';

/**
 * PriceHistoryService
 *
 * Sends the latest observed price for a property to the backend and
 * returns the normalized history payload used to render the chart.
 */
export class PriceHistoryService {
  /**
   * @param {typeof PRICE_TRACKER_CONFIG} [config]
   */
  constructor(config = PRICE_TRACKER_CONFIG) {
    this._config = config;
    /** @type {Map<string, Promise<object|null>>} */
    this._inflight = new Map();
  }

  /**
   * Push current price and retrieve chart/history data.
   *
   * @param {string} url
   * @param {number} price
   * @returns {Promise<object|null>}
   */
  track(url, price) {
    if (!this._config.enabled) return Promise.resolve(null);

    const propertyId = this.extractPropertyId(url);
    if (!propertyId || !price || price <= 0) return Promise.resolve(null);

    const cacheKey = `${propertyId}:${price}`;
    if (!this._inflight.has(cacheKey)) {
      this._inflight.set(cacheKey, this._requestTracking({ propertyId, url, price }));
    }

    return this._inflight.get(cacheKey)
      .finally(() => this._inflight.delete(cacheKey));
  }

  /**
   * @param {string} url
   * @returns {string|null}
   */
  extractPropertyId(url) {
    if (!url) return null;
    const match = PROPERTY_ID_REGEX.exec(String(url));
    return match?.[1] || null;
  }

  /** @private */
  async _requestTracking({ propertyId, url, price }) {
    return new Promise((resolve) => {
      const requestId = `${propertyId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const resultEventName = `selopti:price-track-result-${requestId}`;

      const onResult = (event) => {
        clearTimeout(timer);
        globalThis.removeEventListener(resultEventName, onResult);

        const payload = event?.detail;
        if (payload?.success !== true) {
          resolve(null);
          return;
        }

        resolve(this._normalizePayload(payload.data, propertyId));
      };

      const timer = setTimeout(() => {
        globalThis.removeEventListener(resultEventName, onResult);
        resolve(null);
      }, this._config.timeoutMs);

      globalThis.addEventListener(resultEventName, onResult);
      globalThis.dispatchEvent(new CustomEvent('selopti:do-track-price', {
        detail: {
          requestId,
          endpoint: this._config.endpoint,
          payload: { propertyId, url, price },
        },
      }));
    });
  }

  /** @private */
  _normalizePayload(raw, fallbackPropertyId) {
    if (!raw || typeof raw !== 'object') return null;

    let historySource = [];
    if (Array.isArray(raw.history)) historySource = raw.history;
    else if (Array.isArray(raw.points)) historySource = raw.points;
    else if (Array.isArray(raw.data)) historySource = raw.data;

    const history = historySource
      .map((point) => {
        const value = Number(point?.price ?? point?.value ?? point?.amount ?? 0);
        const at = point?.capturedAt ?? point?.recordedAt ?? point?.date ?? point?.timestamp ?? null;
        if (!Number.isFinite(value) || value <= 0) return null;
        return {
          price: value,
          capturedAt: at,
        };
      })
      .filter(Boolean);

    return {
      propertyId: raw.propertyId ?? fallbackPropertyId,
      history,
      lastChange: raw.lastChange ?? null,
    };
  }
}

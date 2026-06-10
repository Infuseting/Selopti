import { PRICE_TRACKER_CONFIG, PROPERTY_ID_REGEX, loadPriceTrackerConfig, normalizePriceTrackerConfig } from '../config.js';

const USER_UUID_STORAGE_KEY = 'selopti_user_uuid';

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
    this._config = normalizePriceTrackerConfig(config);
    this._userUuid = this._getOrCreateUserUuid();
    /** @type {Map<string, Promise<object|null>>} */
    this._inflight = new Map();
    /** @type {Array<{ requestId: string, propertyId: string, url: string, price: number, userUuid: string }>} */
    this._pendingRequests = [];
    this._batchTimer = null;
    this._configPromise = config === PRICE_TRACKER_CONFIG
      ? loadPriceTrackerConfig().then((loadedConfig) => {
        this._config = loadedConfig;
        return loadedConfig;
      }).catch(() => this._config)
      : Promise.resolve(this._config);

    const storageOnChanged = globalThis.browser?.storage?.onChanged ?? globalThis.chrome?.storage?.onChanged;
    if (storageOnChanged?.addListener) {
      storageOnChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;

        const change = changes?.selopti_price_tracker_config;
        if (!change) return;

        this._config = normalizePriceTrackerConfig(change.newValue ?? {});
      });
    }
  }

  /**
   * Push current price and retrieve chart/history data.
   *
   * @param {string} url
   * @param {number} price
   * @returns {Promise<object|null>}
   */
  async track(url, price) {
    await this._configPromise;

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
      this._pendingRequests.push({
        requestId,
        propertyId,
        url,
        price,
        userUuid: this._userUuid,
      });
      this._scheduleBatchFlush();
    });
  }

  /** @private */
  _getOrCreateUserUuid() {
    try {
      const existing = globalThis.localStorage?.getItem(USER_UUID_STORAGE_KEY);
      if (existing) return existing;
    } catch (_) {
      // Ignore localStorage access errors and fall back to an ephemeral ID.
    }

    const generated = this._generateUuid();

    try {
      globalThis.localStorage?.setItem(USER_UUID_STORAGE_KEY, generated);
    } catch (_) {
      // Ignore localStorage access errors and continue with the generated ID.
    }

    return generated;
  }

  /** @private */
  _generateUuid() {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : ((random & 0x3) | 0x8);
      return value.toString(16);
    });
  }

  /** @private */
  _scheduleBatchFlush() {
    if (this._batchTimer) return;

    this._batchTimer = setTimeout(() => {
      this._batchTimer = null;
      this._flushBatch();
    }, this._config.batchWindowMs ?? 100);
  }

  /** @private */
  _flushBatch() {
    if (this._pendingRequests.length === 0) return;

    const batchSize = this._config.batchSize ?? this._pendingRequests.length;
    const requests = this._pendingRequests.splice(0, batchSize);

    globalThis.dispatchEvent(new CustomEvent('selopti:do-track-price', {
      detail: {
        endpoint: this._config.endpoint,
        requests,
      },
    }));

    if (this._pendingRequests.length > 0) {
      this._scheduleBatchFlush();
    }
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

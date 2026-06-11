/**
 * RentService
 *
 * Single Responsibility: resolve the average rent per m² for a given zone ID.
 *
 * The actual HTTP request runs in the page world (injector.js) because it needs
 * the native fetch that bypasses DataDome. Communication happens through
 * CustomEvents dispatched on `window`:
 *   - OUT: `selopti:do-fetch-rent`  → asks the injector to perform the fetch
 *   - IN:  `selopti:rent-result-{zoneId}` → receives the result
 *
 * Concurrent calls for the same zoneId share a single underlying Promise,
 * preventing duplicate network requests.
 */
export class RentService {
  constructor() {
    /** @type {Map<string, Promise<number|null>>} */
    this._cache = new Map();
  }

  /**
   * Returns a Promise that resolves to the average rent per m² (€/m²),
   * or `null` if the data is unavailable.
   *
   * @param {string} zoneId
   * @returns {Promise<number|null>}
   */
  fetchAverageRentM2(zoneId) {
    if (!this._cache.has(zoneId)) {
      this._cache.set(zoneId, this._requestRent(zoneId));
    }
    return this._cache.get(zoneId);
  }

  /** @private */
  _requestRent(zoneId) {
    return new Promise((resolve) => {
      const eventName = `selopti:rent-result-${zoneId}`;

      const handler = (event) => {
        window.removeEventListener(eventName, handler);
        let rentData = null;
        try {
          rentData = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
        } catch (err) {
          console.error("Selopti: Failed to parse rent result detail", err);
        }
        if (rentData?.items?.length > 0) {
          const item = rentData.items[0];
          resolve(
            item.apartmentPrice?.value ??
            item.housePrice?.value ??
            item.hybridPrice?.value ??
            null,
          );
        } else {
          resolve(null);
        }
      };

      window.addEventListener(eventName, handler);
      window.dispatchEvent(new CustomEvent('selopti:do-fetch-rent', { detail: zoneId }));
    });
  }
}

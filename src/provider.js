import { fetchUrl } from './util.js';
import { ZONE_ID_REGEX } from './config.js';

const propertyCache = new Map();

/**
 * PropertyDataProvider
 *
 * Single Responsibility: fetch a SeLoger property page and parse its embedded
 * JSON payload plus zone ID.
 *
 * Results are cached by URL so concurrent requests for the same property share
 * a single underlying fetch (Promise deduplication).
 */
export class PropertyDataProvider {
  /**
   * Fetches and parses the property page data.
   *
   * @param {string} url - Property page URL.
   * @returns {Promise<{ zoneId: string, data: object }|null>}
   */
  static fetchPropertyData(url) {
    if (!propertyCache.has(url)) {
      propertyCache.set(url, PropertyDataProvider._fetch(url));
    }
    return propertyCache.get(url);
  }

  /** @private */
  static async _fetch(url) {
    const result = await fetchUrl(url);
    if (result.success !== 'true') return null;

    const text = result.data?.[0]?.text ?? '';

    const lifecycleMatch = text.match(
      /window\["__UFRN_LIFECYCLE_SERVERREQUEST__"\]=JSON\.parse\("(.*)"\)/,
    );
    if (!lifecycleMatch) return null;

    const zoneMatch = text.match(ZONE_ID_REGEX);
    if (!zoneMatch) return null;
    const zoneId = zoneMatch[1].toUpperCase();

    try {
      const unescaped = JSON.parse('"' + lifecycleMatch[1] + '"');
      const data = JSON.parse(unescaped);
      return { zoneId, data };
    } catch (err) {
      console.error('Selopti: Error parsing UFRN_LIFECYCLE_SERVERREQUEST', err);
      return null;
    }
  }
}

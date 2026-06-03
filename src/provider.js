import { fetchUrl } from './util.js';

const propertyCache = new Map();

export class PropertyDataProvider {
  /**
   * Fetches and parses the property page data
   * @param {string} url - Property page URL
   * @returns {Promise<Object|null>} JSON data or null on failure
   */
  static fetchPropertyData(url) {
    if (!propertyCache.has(url)) {
      const fetchPromise = (async () => {
        const result = await fetchUrl(url);
        if (result.success !== "true") {
          return null;
        }

        const text = result.data && result.data[0] ? result.data[0].text : '';
        const regex = /window\["__UFRN_LIFECYCLE_SERVERREQUEST__"\]=JSON.parse\("(.*)"\)/;
        const match = text.match(regex);
        if (!match) return null;
        const zoneId = /rouen-76000\/([a-zA-Z0-9]+)/;
        const match2 = text.match(zoneId)[1];
        if (!match2) return null;

        try {
          const data = JSON.parse('"' + match[1] + '"');
          return { zoneId: match2, data };
        } catch (err) {
          console.error("Selopti: Erreur parsing UFRN_LIFECYCLE_SERVERREQUEST", err);
          return null;
        }
      })();
      propertyCache.set(url, fetchPromise);
    }
    return propertyCache.get(url);
  }
}

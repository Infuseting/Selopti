import { fetchUrl } from './util.js';

export class PropertyDataProvider {
  /**
   * Fetches and parses the property page data
   * @param {string} url - Property page URL
   * @returns {Promise<Object|null>} JSON data or null on failure
   */
  static async fetchPropertyData(url) {
    const result = await fetchUrl(url);
    if (result.success !== "true") {
      return null;
    }

    const text = result.data && result.data[0] ? result.data[0].text : '';
    const regex = /window\["__UFRN_LIFECYCLE_SERVERREQUEST__"\]=JSON.parse\("(.*)"\)/;
    const match = text.match(regex);
    if (!match) return null;

    try {
      return JSON.parse(JSON.parse('"' + match[1] + '"'));
    } catch (err) {
      console.error("Selopti: Erreur parsing UFRN_LIFECYCLE_SERVERREQUEST", err);
      return null;
    }
  }
}

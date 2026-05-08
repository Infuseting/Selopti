export class RentDataManager {
  constructor() {
    this.apiUrl = 'http://localhost:8080/api/rent';
  }

  /**
   * Fetches local rent data for a specific area
   * @param {string} zipCode - The zip code of the property
   * @returns {Promise<number|null>} The estimated rent, or null if API is not ready
   */
  async fetchLocalRent(zipCode, surface = 20) {
    if (!zipCode) return null;
    try {
      const response = await fetch(`${this.apiUrl}/estimate?zipCode=${zipCode}&surface=${surface}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (err) {
      console.error("[Selopti] Rent API not reachable:", err);
      return null;
    }
  }
}

export const rentManager = new RentDataManager();

const STORAGE_KEY = 'selopti_export';
const MAX_ENTRIES = 500;

/**
 * Accumulates raw property data for debugging price inconsistencies.
 * Access from the browser console via: window.seloptiExport.download()
 */
class SeloptiExporter {
  constructor() {
    this.entries = this._load();
  }

  /**
   * Save a property snapshot.
   * @param {Object} params
   * @param {string}  params.url
   * @param {string}  params.zoneId
   * @param {Object}  params.basicStats       - from getBasicStats() (tracking data)
   * @param {Object}  params.extractData      - from getData() (DOM extracted data)
   * @param {number|null} params.averageRentM2
   * @param {Object}  params.geoData
   * @param {Object}  params.simulations      - computed simulationsData
   */
  save({ url, zoneId, basicStats, extractData, averageRentM2, geoData, simulations }) {
    const entry = {
      capturedAt: new Date().toISOString(),
      url,
      zoneId: zoneId ?? null,

      // Raw inputs — useful to spot where prices diverge
      raw: {
        // Prix extrait du tracking (source: advertising.tracking_config)
        priceFromTracking: basicStats?.price ?? null,
        // Prix extrait du DOM (source: sections.price)
        priceFromDOM: extractData?.price ?? null,
        surface: basicStats?.surface ?? null,
        bedrooms: basicStats?.bedrooms ?? null,
        zipCode: basicStats?.zipCode ?? null,
        averageRentM2: averageRentM2 ?? null,
        // Toutes les charges/taxes parsées (copropriété, foncière, énergie…)
        priceInfo: extractData?.priceInfo ?? [],
        priceRegion: extractData?.priceRegion ?? [],
        energy: extractData?.energy ?? [],
        coordinates: geoData?.coordinates ?? null,
      },

      // Résultats des calculs
      simulations,
    };

    // Avoid duplicates: replace if same URL already present
    const idx = this.entries.findIndex(e => e.url === url);
    if (idx !== -1) {
      this.entries[idx] = entry;
    } else {
      this.entries.push(entry);
      if (this.entries.length > MAX_ENTRIES) {
        this.entries.shift();
      }
    }

    this._persist();
    console.log(`Selopti Export: ${this.entries.length} properties saved. Call seloptiExport.download() to export.`);
  }

  /** Download all entries as a JSON file. */
  download() {
    const json = JSON.stringify(this.entries, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selopti-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`Selopti Export: downloaded ${this.entries.length} entries.`);
  }

  /** Clear all saved entries. */
  clear() {
    this.entries = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    console.log('Selopti Export: cleared.');
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch (e) {
      // localStorage peut être plein ou bloqué
      console.warn('Selopti Export: could not persist to localStorage', e);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }
}

export const seloptiExport = new SeloptiExporter();

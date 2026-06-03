export async function getGeorisques(coordinates) {
  if (!coordinates || !coordinates.latitude || !coordinates.longitude) return {};

  try {
    const response = await fetch(
      `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${coordinates.longitude},${coordinates.latitude}`
    );
    const data = await response.json();

    if (!data || !data.data || !data.data.length || !data.data[0].risques_detail) {
      return {};
    }

    const risques = data.data[0].risques_detail;
    const numToLibelle = {};
    risques.forEach((r) => {
      numToLibelle[String(r.num_risque)] = r.libelle_risque_long;
    });

    const categories = {};
    risques.forEach((r) => {
      const num = String(r.num_risque);
      const parentNum = num.length > 2 ? num.slice(0, 2) : num;
      const parentName = numToLibelle[parentNum] || 'Autres';

      if (!categories[parentName]) categories[parentName] = [];
      categories[parentName].push([r.libelle_risque_long]);
    });

    return categories;
  } catch (err) {
    return {};
  }
}

export class GeoDataManager {
  constructor() {
    this.listeners = new Map(); // Map<id, { callback, data }>
    this.coordinatesCache = new Map(); // Map<id, { coordinates, price }>
    this.georisquesCache = new Map(); // Cache par coordonnées pour éviter les requêtes dupliquées
  }

  recordCoordinates(classifieds) {
    if (!Array.isArray(classifieds)) return;

    classifieds.forEach(classified => {
      if (!classified.id || !classified.coordinates) return;

      const id = classified.id;
      const data = {
        coordinates: classified.coordinates,
        price: classified.price
      };

      this.coordinatesCache.set(id, data);

      const listener = this.listeners.get(id);
      if (listener && !listener.data) {
        listener.data = data;
        this._triggerListener(id, data);
      }

      if (classified.groupedClassifieds && Array.isArray(classified.groupedClassifieds)) {
        classified.groupedClassifieds.forEach(grouped => {
          const groupId = grouped.id;
          const groupData = {
            coordinates: classified.coordinates,
            price: grouped.price
          };

          this.coordinatesCache.set(groupId, groupData);

          const groupListener = this.listeners.get(groupId);
          if (groupListener && !groupListener.data) {
            groupListener.data = groupData;
            this._triggerListener(groupId, groupData);
          }
        });
      }
    });
  }

  subscribe(id, callback) {
    const data = this.coordinatesCache.get(id);

    if (!data) {
      this.listeners.set(id, { callback, data: null });
      return;
    }

    this.listeners.set(id, { callback, data });
    this._triggerListener(id, data);
  }

  unsubscribe(id) {
    this.listeners.delete(id);
  }

  _triggerListener(id, data) {
    const coordinates = data.coordinates;
    const cacheKey = this._getCacheKey(coordinates);

    if (this.georisquesCache.has(cacheKey)) {
      const listener = this.listeners.get(id);
      if (listener) {
        listener.callback({ ...data, georisques: this.georisquesCache.get(cacheKey) });
      }
      return;
    }

    this._fetchGeorisques(id, data, cacheKey);
  }

  _getCacheKey(coordinates) {
    return `${coordinates.latitude},${coordinates.longitude}`;
  }

  async _fetchGeorisques(id, data, cacheKey) {
    const coordinates = data.coordinates;
    if (!coordinates || !coordinates.latitude || !coordinates.longitude) return;

    if (!this.georisquesCache.has(cacheKey)) {
      const fetchPromise = (async () => {
        return await getGeorisques(coordinates);
      })();
      this.georisquesCache.set(cacheKey, fetchPromise);
    }

    const categories = await this.georisquesCache.get(cacheKey);

    for (const [listenerId, listener] of this.listeners) {
      if (listener.data &&
        this._getCacheKey(listener.data.coordinates) === cacheKey) {
        listener.callback({ ...listener.data, georisques: categories });
      }
    }
  }
}

export const geoManager = new GeoDataManager();

window.addEventListener('selopti:geo-data', (event) => {
  if (event.detail && event.detail.classifieds) {
    geoManager.recordCoordinates(event.detail.classifieds);
  }
});

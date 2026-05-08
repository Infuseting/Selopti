(() => {
  // src/geo.js
  async function getGeorisques(coordinates) {
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
        const parentName = numToLibelle[parentNum] || "Autres";
        if (!categories[parentName]) categories[parentName] = [];
        categories[parentName].push([r.libelle_risque_long]);
      });
      return categories;
    } catch (err) {
      return {};
    }
  }
  var GeoDataManager = class {
    constructor() {
      this.listeners = /* @__PURE__ */ new Map();
      this.coordinatesCache = /* @__PURE__ */ new Map();
      this.georisquesCache = /* @__PURE__ */ new Map();
    }
    recordCoordinates(classifieds) {
      if (!Array.isArray(classifieds)) return;
      classifieds.forEach((classified) => {
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
          classified.groupedClassifieds.forEach((grouped) => {
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
      const categories = await getGeorisques(coordinates);
      this.georisquesCache.set(cacheKey, categories);
      for (const [listenerId, listener] of this.listeners) {
        if (listener.data && this._getCacheKey(listener.data.coordinates) === cacheKey) {
          listener.callback({ ...listener.data, georisques: categories });
        }
      }
    }
  };
  var geoManager = new GeoDataManager();
  window.addEventListener("selopti:geo-data", (event) => {
    if (event.detail && event.detail.classifieds) {
      geoManager.recordCoordinates(event.detail.classifieds);
    }
  });

  // src/scanner.js
  var SelogerLinkExtractor = class {
    static getLink(el, id) {
      if (!el) return null;
      try {
        if (el.tagName === "A" && el.href) return el.href;
      } catch (e) {
      }
      try {
        if (el.querySelector) {
          const desc = el.querySelector("a[href]");
          if (desc && desc.href) return desc.href;
        }
      } catch (e) {
      }
      let parent = el.parentElement;
      while (parent) {
        try {
          if (parent.tagName === "A" && parent.href) return parent.href;
        } catch (e) {
        }
        parent = parent.parentElement;
      }
      try {
        if (id) {
          const anchors = document.querySelectorAll('a[href*="' + id + '"]');
          if (anchors && anchors.length) return anchors[0].href;
        }
      } catch (e) {
      }
      return null;
    }
  };
  var DOMScanner = class {
    constructor(onElementMatched) {
      this.ID_PATTERN = /^(?:classified-card-(?:carouselitem-)?|carouselitem-)(.+)$/;
      this.observedElements = /* @__PURE__ */ new Set();
      this.observer = null;
      this.onElementMatched = onElementMatched;
    }
    start(root = document) {
      if (this.observer) return;
      const scan = (node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const element = node;
        if (element.id) {
          this._checkAndNotify(element.id, element);
        }
        const children = element.querySelectorAll("[id]");
        for (const child of children) {
          this._checkAndNotify(child.id, child);
        }
      };
      this.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const addedNode of mutation.addedNodes) {
            scan(addedNode);
          }
        }
      });
      this.observer.observe(root, { childList: true, subtree: true });
      scan(root);
    }
    stop() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
    _checkAndNotify(rawId, element) {
      const match = this.ID_PATTERN.exec(rawId);
      if (match && !this.observedElements.has(element) && match[1] !== "autopromo") {
        this.observedElements.add(element);
        const id = match[1];
        const url = SelogerLinkExtractor.getLink(element, id);
        if (url) {
          this.onElementMatched(id, element, url);
        }
      }
    }
  };

  // src/util.js
  async function fetchUrl(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        return {
          success: "false",
          error: [`Request failed with status ${response.status}`]
        };
      }
      const text = await response.text();
      return {
        success: "true",
        data: [{
          url,
          status: response.status,
          text
        }]
      };
    } catch (err) {
      return {
        success: "false",
        error: [err instanceof Error ? err.message : String(err)]
      };
    }
  }

  // src/provider.js
  var PropertyDataProvider = class {
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
      const text = result.data && result.data[0] ? result.data[0].text : "";
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
  };

  // src/ui.js
  var UIHTMLRenderer = class {
    static renderDetailsHTML(data) {
      return `
      <div class="selopti-details">
        <h3>Selopti</h3>
        <pre>${this.escapeHTML(JSON.stringify({
        data
      }, null, 2))}</pre>
      </div>
    `;
    }
    static escapeHTML(value) {
      return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    }
  };

  // src/insert.js
  var TARGET_SELECTOR = 'div[data-testid="cardmfe-description-box-text-test-id"]';
  function normalizeTestId(id) {
    return String(id).replace(/[^a-zA-Z0-9_-]/g, "-");
  }
  var SeloptiInserter = class {
    constructor(root = document) {
      this.root = root;
      this.containers = /* @__PURE__ */ new Map();
    }
    getTarget(hostElement) {
      if (!hostElement) {
        return null;
      }
      if (hostElement.matches && hostElement.matches(TARGET_SELECTOR)) {
        return hostElement;
      }
      return hostElement.querySelector(TARGET_SELECTOR);
    }
    ensureContainer(id, hostElement) {
      const target = this.getTarget(hostElement);
      if (!target) {
        return null;
      }
      const testId = `selopti-text-${normalizeTestId(id)}`;
      const existingContainer = target.querySelector(`:scope > div[data-testid="${testId}"]`);
      if (existingContainer) {
        this.containers.set(testId, existingContainer);
        return existingContainer;
      }
      const container = document.createElement("div");
      container.dataset.testid = testId;
      target.appendChild(container);
      this.containers.set(testId, container);
      return container;
    }
    insertHTML(id, hostElement, html) {
      const container = this.ensureContainer(id, hostElement);
      if (!container) {
        return null;
      }
      container.innerHTML = "";
      const template = document.createElement("template");
      template.innerHTML = html;
      const fragment = template.content.cloneNode(true);
      container.appendChild(fragment);
      return container;
    }
  };

  // src/extract.js
  function getPriceInfo(object) {
    const result = [];
    const data = object?.app_cldp?.data?.classified?.sections?.price?.components;
    data.forEach((component) => {
      if (component.type != "SECONDARY") return result;
      component?.units[0]?.details[0]?.prices?.forEach((price) => {
        result.push([
          price?.label?.main,
          price?.value?.main?.value.replaceAll("\u202F", "")
        ]);
      });
    });
    return result;
  }
  function getPriceRegion(object) {
    const result = [];
    const data = object?.app_cldp?.data?.classified?.sections?.priceComparison;
    result.push([
      data?.pricePerSqm?.replaceAll("\u202F", "") ?? "",
      data?.data?.low?.replaceAll("\u202F", "") ?? "",
      data?.data?.high?.replaceAll("\u202F", "") ?? ""
    ]);
    return result;
  }
  function getFeatures(object) {
    const result = [];
    const data = object?.app_cldp?.data?.classified?.sections;
    data?.hardFacts?.facts?.forEach((element) => {
      result.push(element?.value);
    });
    data?.features?.preview?.forEach((element) => {
      result.push(element?.value);
    });
    data?.features?.details?.categories?.forEach((category) => {
      category?.elements?.forEach((element) => {
        result.push(element?.value);
      });
    });
    return [...new Set(result)];
  }
  function getEnergy(object) {
    const result = [];
    const data = object?.app_cldp?.data?.classified?.sections?.energy;
    data?.features?.forEach((element) => {
      result.push(
        [
          element?.label,
          element?.value
        ]
      );
    });
    const certificates = data?.certificates?.[0];
    certificates?.features?.forEach((element) => {
      if (["minMaxEstimation", "nameOfCertificate"].includes(element?.type)) {
        result.push([
          element?.label,
          element?.value
        ]);
      }
    });
    certificates?.scales?.forEach((element) => {
      result.push([
        element?.name,
        element?.efficiencyClass?.rating ?? "Non d\xE9fini"
      ]);
    });
    return result;
  }
  function getDescription(object) {
    const data = object?.app_cldp?.data?.classified?.sections?.description?.description;
    return data.replaceAll("\n", "\\n");
  }
  function getTimeMetadata(object) {
    let result = [];
    const data = object?.app_cldp?.data?.classified?.metadata;
    result.push(["Date de cr\xE9ation", data?.creationDate]);
    result.push(["Date de mise \xE0 jour", data?.updateDate]);
    return result;
  }
  function getEncadrementLoyers(object) {
    const result = [];
    const data = object?.app_cldp?.data?.classified?.sections?.location;
    const city = data?.adress?.city;
    const postalCode = data?.adress?.zipCode;
    const neighborhood = data?.adress?.district;
    return "NON IMPLEMENTE VOUS DEVEZ VERIFIER VOUS-MEME";
  }
  function getBasicStats(object) {
    const tracking = object?.app_cldp?.data?.classified?.advertising?.tracking_config;
    const location = object?.app_cldp?.data?.classified?.sections?.location?.address;
    return {
      price: tracking?.prix ?? 0,
      bedrooms: tracking?.nb_chambres ?? 0,
      surface: tracking?.surface ?? 0,
      zipCode: tracking?.cp ?? location?.zipCode ?? ""
    };
  }
  function getData(object) {
    return {
      priceInfo: getPriceInfo(object),
      priceRegion: getPriceRegion(object),
      features: getFeatures(object),
      energy: getEnergy(object),
      description: getDescription(object),
      timeMetadata: getTimeMetadata(object),
      encadrementLoyers: getEncadrementLoyers(object)
    };
  }

  // src/rent.js
  var RentDataManager = class {
    constructor() {
      this.apiUrl = "http://localhost:8080/api/rent";
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
  };
  var rentManager = new RentDataManager();

  // src/engine.js
  var SeloptiEngine = class {
    constructor() {
      this.scanner = new DOMScanner((id, element, url) => this.handleMatchedElement(id, element, url));
      this.inserter = new SeloptiInserter();
    }
    init() {
      this.scanner.start(document);
    }
    handleMatchedElement(id, element, fullHref) {
      PropertyDataProvider.fetchPropertyData(fullHref).then((data) => {
        const extractData = getData(data);
        const basicStats = getBasicStats(data);
        geoManager.subscribe(id, (geoData) => {
          rentManager.fetchLocalRent(basicStats.zipCode, basicStats.surface).then((rentEstimate) => {
            const price = basicStats.price || 0;
            const bedrooms = basicStats.bedrooms || 0;
            const classicMonthly = rentEstimate?.estimatedRent || 0;
            const classicAnnual = classicMonthly * 12;
            const classicYield = price > 0 ? classicAnnual / price * 100 : 0;
            const rentPerSqm = rentEstimate?.rentPerSqm || 0;
            const studioBaseline = Math.round(rentPerSqm * 20);
            const roomPrice = Math.round(studioBaseline * 0.85);
            const colocMonthly = roomPrice * bedrooms;
            const colocAnnual = colocMonthly * 12;
            const colocYield = price > 0 ? colocAnnual / price * 100 : 0;
            const finalData = {
              ...extractData,
              coordinates: geoData.coordinates,
              georisques: geoData.georisques,
              rentEstimate,
              simulations: {
                classic: {
                  monthlyRent: classicMonthly,
                  annualRevenue: classicAnnual,
                  grossYield: classicYield.toFixed(2) + " %"
                },
                colocation: {
                  roomPrice,
                  monthlyRent: colocMonthly,
                  annualRevenue: colocAnnual,
                  grossYield: colocYield.toFixed(2) + " %",
                  params: {
                    bedrooms,
                    studioBaseline,
                    coefficient: 0.85
                  }
                }
              }
            };
            const html = UIHTMLRenderer.renderDetailsHTML(finalData);
            this.inserter.insertHTML(id, element, html);
          });
        });
      });
    }
  };

  // src/content.js
  var injectorScript = document.createElement("script");
  injectorScript.src = chrome.runtime.getURL("dist/injector.js");
  injectorScript.type = "text/javascript";
  (document.head || document.documentElement).appendChild(injectorScript);
  window.addEventListener("selopti:geo-intercepted", (event) => {
    window.dispatchEvent(new CustomEvent("selopti:geo-data", {
      detail: event.detail
    }));
  });
  var engine = new SeloptiEngine();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      engine.init();
    });
  } else {
    engine.init();
  }
  window.seloptiInserter = engine.inserter;
})();

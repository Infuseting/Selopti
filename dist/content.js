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
      if (!this.georisquesCache.has(cacheKey)) {
        const fetchPromise = (async () => {
          return await getGeorisques(coordinates);
        })();
        this.georisquesCache.set(cacheKey, fetchPromise);
      }
      const categories = await this.georisquesCache.get(cacheKey);
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
        if (el.tagName === "A" && el.href) {
          const desc = el.querySelector("a[href]");
          if (desc && desc.title && desc.title.toLowerCase().includes("viager")) return null;
          return el.href;
        }
      } catch (e) {
      }
      try {
        if (el.querySelector) {
          const desc = el.querySelector("a[href]");
          if (desc && desc.title && desc.title.toLowerCase().includes("viager")) return null;
          if (desc && desc.href) return desc.href;
        }
      } catch (e) {
      }
      let parent = el.parentElement;
      while (parent) {
        try {
          if (parent.tagName === "A" && parent.href) {
            const desc = parent.querySelector("a[href]");
            if (desc && desc.title && desc.title.toLowerCase().includes("viager")) return null;
            return parent.href;
          }
        } catch (e) {
        }
        parent = parent.parentElement;
      }
      try {
        if (id) {
          const anchors = document.querySelectorAll('a[href*="' + id + '"]');
          for (const anchor of anchors) {
            if (anchor && anchor.title && anchor.title.toLowerCase().includes("viager")) continue;
            if (anchor && anchor.href) return anchor.href;
          }
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
  var propertyCache = /* @__PURE__ */ new Map();
  var PropertyDataProvider = class {
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
          const text = result.data && result.data[0] ? result.data[0].text : "";
          const regex = /window\["__UFRN_LIFECYCLE_SERVERREQUEST__"\]=JSON.parse\("(.*)"\)/;
          const match = text.match(regex);
          if (!match) return null;
          const zoneId = /rouen-76000\/([a-zA-Z0-9]+)/;
          const match2 = text.match(zoneId)[1].toLocaleUpperCase();
          if (!match2) return null;
          try {
            const unescapedString = JSON.parse('"' + match[1] + '"');
            const data = JSON.parse(unescapedString);
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
  };

  // src/ui.js
  var UIHTMLRenderer = class {
    static renderDetailsHTML(data) {
      const classic = data.simulations?.classic;
      const coloc = data.simulations?.collocation;
      const rentEst = data.rentEstimate;
      if (!classic) return "";
      const formatCurr = (val) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);
      const formatPct = (val) => new Intl.NumberFormat("fr-FR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(val / 100);
      const formatDateInfo = (dateString) => {
        if (!dateString) return { dateStr: "N/A", daysAgoStr: "" };
        try {
          const d = new Date(dateString);
          if (isNaN(d.getTime())) return { dateStr: dateString, daysAgoStr: "" };
          const dCopy = new Date(d);
          dCopy.setHours(0, 0, 0, 0);
          const today = /* @__PURE__ */ new Date();
          today.setHours(0, 0, 0, 0);
          const diffTime = today - dCopy;
          const diffDays = Math.floor(diffTime / (1e3 * 60 * 60 * 24));
          let daysAgoStr = "";
          if (diffDays === 0) daysAgoStr = "(Aujourd'hui)";
          else if (diffDays === 1) daysAgoStr = "(Hier)";
          else if (diffDays > 1) daysAgoStr = `(Il y a ${diffDays} jours)`;
          else if (diffDays < 0) daysAgoStr = `(Dans ${Math.abs(diffDays)} jours)`;
          const dateStr = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(d);
          return { dateStr, daysAgoStr };
        } catch (e) {
          return { dateStr: dateString, daysAgoStr: "" };
        }
      };
      let createdInfo = { dateStr: "N/A", daysAgoStr: "" };
      let updatedInfo = { dateStr: "N/A", daysAgoStr: "" };
      if (data.timeMetadata) {
        data.timeMetadata.forEach(([label, value]) => {
          if (label === "Date de cr\xE9ation") createdInfo = formatDateInfo(value);
          if (label === "Date de mise \xE0 jour") updatedInfo = formatDateInfo(value);
        });
      }
      return `<pre style="white-space: pre-wrap; word-break: break-word; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">${this.escapeHTML(JSON.stringify(data, null, 2))}</pre>`;
    }
    static formatGeorisques(georisques) {
      if (!georisques || Object.keys(georisques).length === 0) return "<div>Aucun risque identifi\xE9.</div>";
      let html = '<div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; overflow-x: auto;">';
      for (const [key, val] of Object.entries(georisques)) {
        if (Array.isArray(val)) {
          const children = val.map((v) => Array.isArray(v) ? v[0] : v);
          const filteredChildren = children.filter((child) => child.toLowerCase() !== key.toLowerCase());
          if (filteredChildren.length === 0) {
            html += `<div style="margin-bottom: 6px;"><strong>${key}</strong></div>`;
          } else {
            html += `<div style="margin-bottom: 6px;"><strong>${key} :</strong>`;
            html += `<ul style="margin: 4px 0 8px 0; padding-left: 24px; color: #475569; list-style-type: disc;">`;
            filteredChildren.forEach((child) => {
              html += `<li>${child}</li>`;
            });
            html += `</ul></div>`;
          }
        } else {
          html += `<div style="margin-bottom: 6px;"><strong>${key} :</strong> ${typeof val === "object" ? JSON.stringify(val) : val}</div>`;
        }
      }
      html += "</div>";
      return html;
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
  function getPrix(object) {
    const label = object?.app_cldp?.data?.classified?.sections?.price?.base?.main?.value?.main?.ariaLabel;
    if (!label) return 0;
    return Number(label.replace(/\D/g, ""));
  }
  function getPriceInfo(object) {
    const result = [];
    const data = object?.app_cldp?.data?.classified?.sections?.price?.components;
    data?.forEach((component) => {
      if (component.type != "SECONDARY") return result;
      component?.units?.[0]?.details?.[0]?.prices?.forEach((price) => {
        result.push([
          price?.label?.main,
          price?.value?.main?.value?.replaceAll("\u202F", "") ?? ""
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
    return data?.replaceAll("\n", "\\n") ?? "";
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
  function getFallbackPriceInfo(object, priceInfo) {
    let priceLabels = priceInfo.map(([label, value]) => label);
    let description = getDescription(object);
    const taxEstimate = object?.app_cldp?.data?.classified?.sections?.taxEstimate;
    if (!priceLabels.includes("Charges de copropri\xE9t\xE9")) {
      let extractedCharges = null;
      let m = description.match(/charges\s+(?:.{0,50}?)annuelles(?:.{0,100}?)?(?:[:\s]|sont\s+de\s+)+([\d\s.,]+)\s*(?:€|euros)/i);
      if (m) extractedCharges = `${m[1].trim()} \u20AC/an`;
      else {
        m = description.match(/charges\s+(?:.{0,50}?)mensuelles(?:.{0,100}?)?(?:[:\s]|sont\s+de\s+)+([\d\s.,]+)\s*(?:€|euros)/i);
        if (m) extractedCharges = `${m[1].trim()} \u20AC/mois`;
        else {
          m = description.match(/(?:charges.{0,50}?vendeur.*?|charges.{0,50}?s'élèvent.*?)([\d\s.,]+)\s*(?:€|euros)\s*par\s+(mois|an|trimestre)/i);
          if (m) extractedCharges = `${m[1].trim()} \u20AC/${m[2]}`;
          else {
            m = description.match(/\+\s*([\d\s.,]+)\s*(?:€|euros)\s*(?:de\s*)?charges/i);
            if (m) extractedCharges = `${m[1].trim()} \u20AC/mois`;
            else {
              m = description.match(/loyer.{0,50}?([\d\s.,]+)\s*(?:€|euros).{0,50}?hors\s*charges.{0,50}?([\d\s.,]+)\s*(?:€|euros).{0,50}?charges\s*comprises/i);
              if (m) {
                const rent = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
                const cc = parseFloat(m[2].replace(/\s/g, "").replace(",", "."));
                extractedCharges = `${(cc - rent).toFixed(2).replace(".", ",")} \u20AC/mois`;
              } else {
                m = description.match(/charges\s*(?:de\s+copropriété\s*)?[:\-]\s*([\d\s.,]+)\s*(?:€|euros)/i);
                if (m) extractedCharges = `${m[1].trim()} \u20AC/an`;
              }
            }
          }
        }
      }
      if (extractedCharges) {
        priceInfo.push([
          "Charges de copropri\xE9t\xE9",
          extractedCharges
        ]);
      }
    }
    if (!priceLabels.includes("Estimation de la facture \xE9nerg\xE9tique")) {
      let m = description.match(/entre\s+([\d\s.,]+)\s*(?:€|euros)?\s*et\s+([\d\s.,]+)\s*(?:€|euros)/i);
      if (m) {
        priceInfo.push([
          "Estimation de la facture \xE9nerg\xE9tique",
          `entre ${m[1].trim()} et ${m[2].trim()} \u20AC/an`
        ]);
      }
    }
    if (!priceLabels.includes("Taxe Fonci\xE8re")) {
      let m = description.match(/taxe\s+fonci[eè]re(?:.*?)?[:\s]+([\d\s.,]+)\s*(?:€|euros)/i);
      if (m) {
        priceInfo.push(["Taxe Fonci\xE8re", `${m[1].trim()} \u20AC/an`]);
      } else if (taxEstimate?.estimatedTaxeFonciereMin != null && taxEstimate?.estimatedTaxeFonciereMax != null) {
        const min = Math.round(taxEstimate.estimatedTaxeFonciereMin);
        const max = Math.round(taxEstimate.estimatedTaxeFonciereMax);
        priceInfo.push(["Taxe Fonci\xE8re", `entre ${min} et ${max} \u20AC/an`]);
      }
    }
    return priceInfo;
  }
  function getData(object) {
    let priceInfo = getPriceInfo(object);
    priceInfo = getFallbackPriceInfo(object, priceInfo);
    return {
      price: getPrix(object),
      priceInfo,
      priceRegion: getPriceRegion(object),
      features: getFeatures(object),
      energy: getEnergy(object),
      description: getDescription(object),
      timeMetadata: getTimeMetadata(object),
      encadrementLoyers: getEncadrementLoyers(object)
    };
  }

  // src/engine.js
  var rentCache = /* @__PURE__ */ new Map();
  var SeloptiEngine = class {
    constructor() {
      this.scanner = new DOMScanner((id, element, url) => this.handleMatchedElement(id, element, url));
      this.inserter = new SeloptiInserter();
    }
    init() {
      this.scanner.start(document);
    }
    handleMatchedElement(id, element, fullHref) {
      console.log("Selopti: handleMatchedElement called for", fullHref);
      PropertyDataProvider.fetchPropertyData(fullHref).then(async (result) => {
        console.log("Selopti: fetchPropertyData result", result);
        if (!result) return;
        const { zoneId, data } = result;
        const basicStats = getBasicStats(data);
        let averageRentM2 = null;
        if (zoneId) {
          console.log("Selopti: engine.js: zoneId is present:", zoneId);
          if (!rentCache.has(zoneId)) {
            console.log("Selopti: engine.js: zoneId not in cache, creating promise");
            const fetchPromise = new Promise((resolve) => {
              console.log("Selopti: engine.js: Promise executing for zoneId:", zoneId);
              const handler = (e) => {
                console.log("Selopti: engine.js: rent-result handler triggered for zoneId", zoneId);
                window.removeEventListener(`selopti:rent-result-${zoneId}`, handler);
                const rentData = e.detail;
                if (rentData?.items?.length > 0) {
                  const item = rentData.items[0];
                  resolve(item.apartmentPrice?.value || item.housePrice?.value || item.hybridPrice?.value || null);
                } else {
                  resolve(null);
                }
              };
              window.addEventListener(`selopti:rent-result-${zoneId}`, handler);
              console.log("Selopti: engine.js: dispatching selopti:do-fetch-rent event");
              window.dispatchEvent(new CustomEvent("selopti:do-fetch-rent", { detail: zoneId }));
            });
            rentCache.set(zoneId, fetchPromise);
          }
          console.log("Selopti: engine.js: awaiting averageRentM2");
          averageRentM2 = await rentCache.get(zoneId);
          console.log("Selopti: engine.js: averageRentM2 is", averageRentM2);
        } else {
          console.log("Selopti: engine.js: NO zoneId for this element");
        }
        geoManager.subscribe(id, async (geoData) => {
          const { coordinates } = geoData;
          const extractData = getData(data);
          coordinates.longitude;
          coordinates.latitude;
          const COLOC_COEF = 0.75;
          const fraisMensuel = extractData?.priceInfo.map((price) => {
            const nombres = price[1].match(/\d+/g).map(Number);
            const plusGrand = Math.max(...nombres);
            const type = price[1].toLowerCase().includes("an") ? "annual" : "monthly";
            return type === "annual" ? plusGrand / 12 : plusGrand;
          }).reduce((a, b) => a + b, 0);
          const bedrooms = basicStats.bedrooms || 0;
          const surface = basicStats.surface || 0;
          const classicMonthly = averageRentM2 && surface ? averageRentM2 * surface : 0;
          const classicAnnual = classicMonthly * 12;
          const studioBaseline = 0;
          const roomPrice = classicMonthly * COLOC_COEF;
          const colocMonthly = roomPrice * bedrooms;
          const colocAnnual = colocMonthly * 12;
          const propertyPrice = extractData?.price;
          const downPayment = propertyPrice * 0.2;
          const loanAmount = propertyPrice * 0.8;
          const annualRate = 0.04;
          const monthlyRate = annualRate / 12;
          const loanDurationYears = 20;
          const numPayments = loanDurationYears * 12;
          const monthlyMortgage = loanAmount > 0 ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) : 0;
          const annualMortgage = monthlyMortgage * 12;
          const classicNetCashflowMonthly = classicMonthly - fraisMensuel - monthlyMortgage;
          const classicNetCashflowAnnual = classicAnnual - fraisMensuel * 12 - annualMortgage;
          const classicRentability = propertyPrice > 0 ? classicNetCashflowAnnual / propertyPrice * 100 : 0;
          const simulationsData = {
            loanDetails: {
              propertyPrice,
              downPayment,
              loanAmount,
              rate: annualRate,
              durationYears: loanDurationYears
            }
          };
          simulationsData["classic"] = {
            monthlyRent: classicMonthly,
            annualRevenue: classicAnnual,
            monthlyFrais: fraisMensuel,
            annualFrais: fraisMensuel * 12,
            monthlyMortgage,
            annualMortgage,
            netCashflowMonthly: classicNetCashflowMonthly,
            netCashflowAnnual: classicNetCashflowAnnual,
            rentabilityPercent: classicRentability
          };
          if (bedrooms > 1) {
            const colocNetCashflowMonthly = colocMonthly - fraisMensuel - monthlyMortgage;
            const colocNetCashflowAnnual = colocAnnual - fraisMensuel * 12 - annualMortgage;
            const colocRentability = propertyPrice > 0 ? colocNetCashflowAnnual / propertyPrice * 100 : 0;
            simulationsData["collocation"] = {
              roomPrice,
              monthlyRent: colocMonthly,
              annualRevenue: colocAnnual,
              monthlyFrais: fraisMensuel,
              annualFrais: fraisMensuel * 12,
              monthlyMortgage,
              annualMortgage,
              netCashflowMonthly: colocNetCashflowMonthly,
              netCashflowAnnual: colocNetCashflowAnnual,
              rentabilityPercent: colocRentability,
              params: {
                bedrooms,
                studioBaseline,
                coefficient: COLOC_COEF
              }
            };
          }
          const finalData = {
            ...extractData,
            coordinates: geoData.coordinates,
            georisques: geoData.georisques,
            averageRentM2,
            simulations: simulationsData
          };
          const html = UIHTMLRenderer.renderDetailsHTML(finalData);
          this.inserter.insertHTML(id, element, html);
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
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("distributionTypes") === "Buy") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        engine.init();
      });
    } else {
      engine.init();
    }
  }
  window.seloptiInserter = engine.inserter;
})();

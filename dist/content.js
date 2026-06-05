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
    static renderDetailsHTML(data, averageRentM2) {
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
      return `
      <div class="selopti-container" style="font-family: 'Inter', system-ui, sans-serif; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 16px; padding: 20px; margin-top: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1); border: 1px solid rgba(0,0,0,0.05); color: #1e293b; transition: transform 0.2s ease, box-shadow 0.2s ease; width: 100%; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <h3 style="margin: 0; font-size: 20px; font-weight: 700; background: linear-gradient(to right, #1e293b, #334155); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Selopti Insights</h3>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
            ${createdInfo.dateStr !== "N/A" ? `
            <span style="background: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; border: 1px solid #e2e8f0; line-height: 1;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Publi\xE9 : ${createdInfo.dateStr} <span style="font-weight: 400; opacity: 0.8;">${createdInfo.daysAgoStr}</span>
            </span>` : ""}
            ${updatedInfo.dateStr !== "N/A" && updatedInfo.dateStr !== createdInfo.dateStr ? `
            <span style="background: #fffbeb; color: #b45309; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; border: 1px solid #fde68a; line-height: 1;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21v-5h5"></path></svg>
              M\xE0J : ${updatedInfo.dateStr} <span style="font-weight: 400; opacity: 0.8;">${updatedInfo.daysAgoStr}</span>
            </span>` : ""}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; position: relative; overflow: hidden; min-width: 0;">
            <div style="position: absolute; top: 0; right: 0; width: 40px; height: 40px; background: linear-gradient(135deg, transparent 50%, rgba(59, 130, 246, 0.1) 50%);"></div>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              Loyer Est.
            </span>
            <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${formatCurr(classic.monthlyRent)} <span style="font-size: 13px; font-weight: 500; color: #64748b;">/m</span></div>
            ${rentEst && rentEst.rentPerSqm ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Ref: ${formatCurr(rentEst.rentPerSqm)}/m\xB2</div>` : ""}
          </div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; position: relative; overflow: hidden; min-width: 0;">
            <div style="position: absolute; top: 0; right: 0; width: 40px; height: 40px; background: linear-gradient(135deg, transparent 50%, rgba(239, 68, 68, 0.1) 50%);"></div>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>
              Mensualit\xE9 Pr\xEAt
            </span>
            <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${formatCurr(classic.monthlyMortgage)} <span style="font-size: 13px; font-weight: 500; color: #64748b;">/m</span></div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${data.simulations.loanDetails.durationYears} ans @ ${formatPct(data.simulations.loanDetails.rate * 100)}</div>
          </div>
        </div>

        <!-- Classic Scenario -->
        <div style="margin-bottom: ${coloc ? "20px" : "0"}; background: #ffffff; border-radius: 12px; border: 1px solid #f1f5f9; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
              Location Classique
            </h4>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: ${classic.netCashflowMonthly >= 0 ? "#ecfdf5" : "#fef2f2"}; border: 1px solid ${classic.netCashflowMonthly >= 0 ? "#a7f3d0" : "#fecaca"};">
              <div style="font-size: 12px; color: ${classic.netCashflowMonthly >= 0 ? "#059669" : "#dc2626"}; font-weight: 600;">Cashflow Net mensuel</div>
              <div style="font-size: 16px; font-weight: 800; color: ${classic.netCashflowMonthly >= 0 ? "#065f46" : "#991b1b"};">${formatCurr(classic.netCashflowMonthly)} <span style="font-size: 13px; font-weight: 500; opacity: 0.8;">/m</span></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: #eff6ff; border: 1px solid #bfdbfe;">
              <div style="font-size: 12px; color: #2563eb; font-weight: 600;">Rentabilit\xE9 Brute</div>
              <div style="font-size: 16px; font-weight: 800; color: #1e3a8a;">${formatPct(classic.rentabilityBrute)}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: #f0fdf4; border: 1px solid #bbf7d0;">
              <div style="font-size: 12px; color: #16a34a; font-weight: 600;">Rentabilit\xE9 Nette charges</div>
              <div style="font-size: 16px; font-weight: 800; color: #14532d;">${formatPct(classic.rentabilityNette)}</div>
            </div>
          </div>
        </div>

        <!-- Coloc Scenario -->
        ${coloc ? `
        <div style="background: #ffffff; border-radius: 12px; border: 1px solid #f1f5f9; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Colocation (${coloc.params.bedrooms} ch.)
            </h4>
            <span style="font-size: 12px; font-weight: 600; color: #8b5cf6; background: #ede9fe; padding: 2px 8px; border-radius: 10px;">${formatCurr(coloc.roomPrice)}/ch \xB7 ${coloc.params.privateM2PerRoom}m\xB2</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: ${coloc.netCashflowMonthly >= 0 ? "#ecfdf5" : "#fef2f2"}; border: 1px solid ${coloc.netCashflowMonthly >= 0 ? "#a7f3d0" : "#fecaca"};">
              <div style="font-size: 12px; color: ${coloc.netCashflowMonthly >= 0 ? "#059669" : "#dc2626"}; font-weight: 600;">Cashflow Net mensuel</div>
              <div style="font-size: 16px; font-weight: 800; color: ${coloc.netCashflowMonthly >= 0 ? "#065f46" : "#991b1b"};">${formatCurr(coloc.netCashflowMonthly)} <span style="font-size: 13px; font-weight: 500; opacity: 0.8;">/m</span></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: #faf5ff; border: 1px solid #e9d5ff;">
              <div style="font-size: 12px; color: #9333ea; font-weight: 600;">Rentabilit\xE9 Brute</div>
              <div style="font-size: 16px; font-weight: 800; color: #581c87;">${formatPct(coloc.rentabilityBrute)}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: #f5f3ff; border: 1px solid #ddd6fe;">
              <div style="font-size: 12px; color: #7c3aed; font-weight: 600;">Rentabilit\xE9 Nette charges</div>
              <div style="font-size: 16px; font-weight: 800; color: #4c1d95;">${formatPct(coloc.rentabilityNette)}</div>
            </div>
          </div>
        </div>
        ` : ""}
        <!-- D\xE9tails Techniques & Financiers -->
        <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 13px; color: #475569; line-height: 1.6; word-break: break-word;">
          <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">Param\xE8tres de calcul :</h5>
          <ul style="margin: 0 0 12px 0; padding-left: 20px;">
            <li><strong>Prix affich\xE9 (page) :</strong> ${formatCurr(data.simulations.loanDetails.propertyPrice)}
              
            </li>
            <li><strong>Apport (20%) :</strong> ${formatCurr(data.simulations.loanDetails.downPayment)}</li>
            <li><strong>Montant du pr\xEAt :</strong> ${formatCurr(data.simulations.loanDetails.loanAmount)}</li>
            <li><strong>Frais mensuels estim\xE9s :</strong> ${formatCurr(classic.monthlyFrais)} (${formatCurr(classic.annualFrais)}/an)</li>
            <li><strong>Revenus Locatifs (Classique) :</strong> ${formatCurr(classic.annualRevenue)}/an</li>
            <li><strong>Loyer moyen zone (\u20AC/m\xB2) :</strong> ${averageRentM2 ? averageRentM2 + " \u20AC" : "N/A"}</li>
            ${coloc ? `<li><strong>Revenus Locatifs (Coloc) :</strong> ${formatCurr(coloc.annualRevenue)}/an</li>` : ""}
          </ul>

          <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">Informations Extraites (Charges/Taxes) :</h5>
          <ul style="margin: 0 0 12px 0; padding-left: 20px;">
            ${data.priceInfo && data.priceInfo.length ? data.priceInfo.map(([label, value]) => `<li><strong>${label} :</strong> ${value}</li>`).join("") : "<li>Aucune charge/taxe extraite.</li>"}
          </ul>
          
          <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">\xC9nergie & DPE :</h5>
          <ul style="margin: 0 0 12px 0; padding-left: 20px;">
            ${data.energy && data.energy.length ? data.energy.map(([label, value]) => `<li><strong>${label} :</strong> ${value}</li>`).join("") : "<li>Non renseign\xE9</li>"}
          </ul>

          ${data.georisques ? `
          <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">Risques (G\xE9orisques) :</h5>
          ${this.formatGeorisques(data.georisques)}
          ` : ""}
        </div>
        
      </div> 
    `;
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

  // src/export.js
  var STORAGE_KEY = "selopti_export";
  var MAX_ENTRIES = 500;
  var SeloptiExporter = class {
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
        capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
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
          coordinates: geoData?.coordinates ?? null
        },
        // Résultats des calculs
        simulations
      };
      const idx = this.entries.findIndex((e) => e.url === url);
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
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selopti-export-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Selopti Export: downloaded ${this.entries.length} entries.`);
    }
    /** Clear all saved entries. */
    clear() {
      this.entries = [];
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {
      }
      console.log("Selopti Export: cleared.");
    }
    _persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
      } catch (e) {
        console.warn("Selopti Export: could not persist to localStorage", e);
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
  };
  var seloptiExport = new SeloptiExporter();

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
          const CHARGES_A_EXCLURE = ["estimation de la facture \xE9nerg\xE9tique"];
          const fraisMensuel = (extractData?.priceInfo ?? []).filter((price) => !CHARGES_A_EXCLURE.some((label) => price[0]?.toLowerCase().includes(label))).map((price) => {
            const text = price[1];
            const normalized = text.replace(/(\d{1,3})\.(\d{3})(?!\d)/g, "$1$2");
            const nombres = (normalized.match(/\d+/g) ?? []).map(Number).filter((n) => !(n >= 1900 && n <= 2099));
            if (nombres.length === 0) return 0;
            const valeur = nombres.reduce((a, b) => a + b, 0) / nombres.length;
            const lower = text.toLowerCase();
            if (lower.includes("trimestre")) return valeur / 3;
            if (lower.includes("/an") || lower.includes("\u20AC/an") || /\ban\b/.test(lower) || lower.includes("annuel")) return valeur / 12;
            return valeur;
          }).reduce((a, b) => a + b, 0);
          const bedrooms = basicStats.bedrooms || 0;
          const surface = basicStats.surface || 0;
          const classicMonthly = averageRentM2 && surface ? averageRentM2 * surface : 0;
          const classicAnnual = classicMonthly * 12;
          const COLOC_COMMON_AREA_M2 = 20;
          const COLOC_ROOM_PREMIUM = 1.5;
          const MIN_ROOM_M2 = 9;
          const privateM2PerRoom = bedrooms > 0 ? Math.max(MIN_ROOM_M2, (surface - COLOC_COMMON_AREA_M2) / bedrooms) : 0;
          const roomPrice = privateM2PerRoom > 0 && averageRentM2 ? privateM2PerRoom * averageRentM2 * COLOC_ROOM_PREMIUM : 0;
          const colocMonthly = roomPrice * bedrooms;
          const colocAnnual = colocMonthly * 12;
          const propertyPrice = extractData?.price || basicStats?.price || 0;
          const trackingPrice = basicStats?.price || 0;
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
          const classicRentabilityBrute = propertyPrice > 0 ? classicAnnual / propertyPrice * 100 : 0;
          const classicRentabilityNette = propertyPrice > 0 ? (classicAnnual - fraisMensuel * 12) / propertyPrice * 100 : 0;
          const simulationsData = {
            loanDetails: {
              propertyPrice,
              trackingPrice,
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
            rentabilityBrute: classicRentabilityBrute,
            rentabilityNette: classicRentabilityNette
          };
          if (bedrooms > 1) {
            const colocNetCashflowMonthly = colocMonthly - fraisMensuel - monthlyMortgage;
            const colocNetCashflowAnnual = colocAnnual - fraisMensuel * 12 - annualMortgage;
            const colocRentabilityBrute = propertyPrice > 0 ? colocAnnual / propertyPrice * 100 : 0;
            const colocRentabilityNette = propertyPrice > 0 ? (colocAnnual - fraisMensuel * 12) / propertyPrice * 100 : 0;
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
              rentabilityBrute: colocRentabilityBrute,
              rentabilityNette: colocRentabilityNette,
              params: {
                bedrooms,
                privateM2PerRoom: Math.round(privateM2PerRoom * 10) / 10,
                commonAreaM2: COLOC_COMMON_AREA_M2,
                roomPremium: COLOC_ROOM_PREMIUM
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
          seloptiExport.save({
            url: fullHref,
            zoneId,
            basicStats,
            extractData,
            averageRentM2,
            geoData,
            simulations: simulationsData
          });
          const html = UIHTMLRenderer.renderDetailsHTML(finalData, averageRentM2);
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
  window.seloptiExport = seloptiExport;
})();

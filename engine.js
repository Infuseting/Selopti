class PropertyParser {
  static georisquesCache = new Map();

  /**
   * Fetches the environmental risks for the given coordinates.
   */
  static async fetchGeorisques(coords) {
    if (!coords || !coords.lat || !coords.lng) return null;
    
    const cacheKey = `${coords.lat},${coords.lng}`;
    if (this.georisquesCache.has(cacheKey)) {
      return this.georisquesCache.get(cacheKey);
    }

    const promise = (async () => {
      try {
        const response = await fetch(`https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${coords.lng},${coords.lat}`);
        const data = await response.json();
        
        if (data && data.data && data.data.length > 0) {
          const risquesDetail = data.data[0].risques_detail || [];
          const risquesNames = risquesDetail.map(r => r.libelle_risque_long);
          return [...new Set(risquesNames)];
        }
        return [];
      } catch (err) {
        console.error("[Selopti] Failed to fetch georisques:", err);
        return null;
      }
    })();

    this.georisquesCache.set(cacheKey, promise);
    return promise;
  }

  /**
   * Extracts all financial data (energy estimate, charges, property tax) into a single object.
   */
  static extractFinancials(doc, descText) {
    const financials = {};
    
    // 1. Try to find the cdp-price section
    const priceSection = doc.querySelector("section[data-testid='cdp-price']");
    if (priceSection) {
      // Find all elements to look for labels
      const allElements = Array.from(priceSection.querySelectorAll("*"));
      
      // Energy Estimate
      const energyLabel = allElements.find(el => el.textContent && el.textContent.trim() === "Estimation de la facture énergétique");
      if (energyLabel && energyLabel.nextElementSibling) {
        financials.energy = energyLabel.nextElementSibling.textContent.trim();
      }

      // Charges from cdp-price
      const chargesLabel = allElements.find(el => el.textContent && el.textContent.trim() === "Charges de copropriété");
      if (chargesLabel && chargesLabel.nextElementSibling) {
        const chargeText = chargesLabel.nextElementSibling.textContent.trim();
        const match = chargeText.match(/(\d[\d\s\u00A0]*(?:[.,]\d{1,2})?)/);
        if (match) {
          financials.charges = {
            amount: match[1].replace(/[\s\u00A0]/g, "").replace(",", "."),
            frequency: /(mensuel|mois|month)/i.test(chargeText) ? "monthly" : "yearly"
          };
        }
      }
    }

    // 2. Fallback for Charges (cdp-co-ownership)
    if (!financials.charges) {
      const coOwnershipEl = doc.querySelector("section[data-testid='cdp-co-ownership']");
      if (coOwnershipEl) {
        const spans = Array.from(coOwnershipEl.querySelectorAll("span"));
        const labelSpan = spans.find(s => s.textContent.includes("Charges de copropriété"));
        if (labelSpan && labelSpan.nextElementSibling) {
          const chargeText = labelSpan.nextElementSibling.textContent;
          const match = chargeText.match(/(\d[\d\s\u00A0]*(?:[.,]\d{1,2})?)/);
          if (match) {
            financials.charges = {
              amount: match[1].replace(/[\s\u00A0]/g, "").replace(",", "."),
              frequency: /(mensuel|mois|month)/i.test(chargeText) ? "monthly" : "yearly"
            };
          }
        }
      }
    }

    // 3. Final Fallback for Charges (description regex)
    if (!financials.charges) {
      financials.charges = this.extractChargesFallback(descText);
    }

    // 4. Extract Taxe Foncière
    financials.taxeFonciere = this.extractTaxeFonciere(descText);

    return financials;
  }

  /**
   * Fallback method: Extracts charge amount and frequency from description text.
   */
  static extractChargesFallback(descText) {
    // Exclure "hors charges" ou "hors charge" pour ne pas capturer de faux montants
    const cleanText = descText.replace(/hors[\s-]charges?/gi, "");

    const chargeMatch = cleanText.match(
      /charges?[^\n]*?(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:€|euros?)/i
    );

    if (!chargeMatch) {
      return { amount: "Inconnu", frequency: "yearly" };
    }

    const amount = chargeMatch[1].replace(/\s/g, "").replace(",", ".");

    // Determine frequency based on context
    const context = cleanText.substring(
      Math.max(0, chargeMatch.index - 50),
      Math.min(cleanText.length, chargeMatch.index + 100)
    );
    const frequency = /(mensuel|par mois|monthly|\/month)/i.test(context)
      ? "monthly"
      : "yearly";

    return { amount, frequency };
  }

  /**
   * Extracts geographic coordinates from the document or raw HTML.
   */
  static extractCoordinates(doc, html) {
    // Try standard OpenGraph or Geo meta tags first
    const metaLat = doc.querySelector("meta[property='place:location:latitude'], meta[name='geo.position']");
    const metaLng = doc.querySelector("meta[property='place:location:longitude']");

    if (metaLat && metaLat.content) {
      if (metaLat.name === 'geo.position') {
        const parts = metaLat.content.split(';');
        if (parts.length === 2) {
          return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
        }
      } else if (metaLng && metaLng.content) {
        return { lat: parseFloat(metaLat.content), lng: parseFloat(metaLng.content) };
      }
    }

    // Fallback: search for coordinates in the raw HTML (usually inside JSON state like window.__PRELOADED_STATE__)
    const latMatch = html.match(/"lat(?:itude)?"\s*:\s*(-?\d+\.\d{3,})/);
    const lngMatch = html.match(/"l(?:ng|on|ongitude)"\s*:\s*(-?\d+\.\d{3,})/);

    if (latMatch && lngMatch) {
      return { lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[1]) };
    }

    return null;
  }

  /**
   * Extracts the number of bedrooms from keyfacts text.
   */
  static extractBedrooms(text) {
    if (!text) return null;
    const match = text.match(/(\d+)\s*chambres?/i);
    return match ? match[1] : null;
  }

  /**
   * Extracts the surface area (m²) from keyfacts text.
   */
  static extractSurface(text) {
    if (!text) return null;
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*m²?/i);
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  /**
   * Extracts the price from an element's text.
   */
  static extractPrice(element) {
    if (!element || !element.textContent) return null;
    const match = element.textContent.match(/(\d[\d\s\u00A0]*)\s*€/);
    if (match) {
      return parseFloat(match[1].replace(/[\s\u00A0]/g, ""));
    }
    return null;
  }

  /**
   * Extracts 'Taxe Foncière' from description text.
   */
  static extractTaxeFonciere(text) {
    if (!text) return null;
    const match = text.match(/taxe fonci(?:è|e)re[^\d]*?(\d[\d\s\u00A0]*(?:[.,]\d{1,2})?)\s*(?:€|euros?)/i);
    if (match) {
      return match[1].replace(/[\s\u00A0]/g, "").replace(",", ".");
    }
    return null;
  }

  /**
   * Extracts elevator presence from features text.
   */
  static extractElevator(featuresText) {
    if (/(pas d'|sans )ascenseur/i.test(featuresText)) {
      return "Non";
    }
    if (/ascenseur/i.test(featuresText)) {
      return "Oui";
    }
    return "Non"; // Default to Non if nothing found
  }
}

class SeloptiEngine {
  constructor() {
    this.ID_PATTERN = /^(?:classified-card-(?:carouselitem-)?|carouselitem-)(.+)$/;
    this.processedCards = new WeakSet();
    this.geoStore = new Map();
    this.listenForGeoData();
  }

  listenForGeoData() {
    window.addEventListener("message", (event) => {
      if (event.source !== window || !event.data || event.data.type !== "SELOPTI_GEO_DATA") {
        return;
      }
      
      const classifieds = event.data.data.classifieds || [];
      classifieds.forEach(item => {
        if (item.coordinates && item.coordinates.latitude && item.coordinates.longitude) {
          const coords = { lat: item.coordinates.latitude, lng: item.coordinates.longitude };
          
          if (item.id) {
            this.geoStore.set(item.id, coords);
            this.updateCardUI(item.id, coords);
          }
          
          if (item.groupedClassifieds) {
            item.groupedClassifieds.forEach(groupItem => {
              if (groupItem.id) {
                this.geoStore.set(groupItem.id, coords);
                this.updateCardUI(groupItem.id, coords);
              }
            });
          }
        }
      });
    });
  }

  async updateCardUI(id, coords) {
    const cardEl = document.getElementById(`classified-card-${id}`) || 
                   document.getElementById(`classified-card-carouselitem-${id}`) || 
                   document.getElementById(`carouselitem-${id}`);
                   
    if (cardEl && this.processedCards.has(cardEl)) {
      const target = DOMNavigator.findTargetContainer(cardEl);
      if (target) {
        CardUI.injectCoordinates(target, coords, id);
        
        const risques = await PropertyParser.fetchGeorisques(coords);
        if (risques !== null) {
          CardUI.injectGeorisques(target, risques, id);
        }
      }
    }
  }

  extractId(card) {
    const match = card.id.match(this.ID_PATTERN);
    return match ? match[1] : null;
  }

  calculateProfitability(surface, bedroomsCount, financials, price) {
    if (!surface || !price) return null;

    // 1. Loyer estimé
    let baseRent = 14 * surface;
    const nbBedrooms = bedroomsCount ? parseInt(bedroomsCount) : 0;
    const multiplier = (nbBedrooms > 1) ? (0.7 * nbBedrooms) : 1;
    const estimatedRent = baseRent * multiplier;

    // 2. Charges
    let monthlyCharges = 0;
    if (financials.charges && financials.charges.amount && !isNaN(parseFloat(financials.charges.amount))) {
      let chargeAmount = parseFloat(financials.charges.amount);
      if (financials.charges.frequency === "yearly") {
        monthlyCharges += chargeAmount / 12;
      } else {
        monthlyCharges += chargeAmount;
      }
    }
    if (financials.taxeFonciere && !isNaN(parseFloat(financials.taxeFonciere))) {
      monthlyCharges += parseFloat(financials.taxeFonciere) / 12;
    }

    // 3. Crédit (Prix + 8% frais de notaire)
    const totalPrice = price * 1.08;
    const J = 0.04 / 12; // 4% annuel
    const N = 240; // 20 ans
    const monthlyLoan = totalPrice * (J / (1 - Math.pow(1 + J, -N)));

    // 4. Rentabilité Nette
    const cashflow = estimatedRent - monthlyCharges - monthlyLoan;

    return {
      cashflow,
      estimatedRent,
      monthlyCharges,
      monthlyLoan,
      totalPrice
    };
  }

  processCard(card) {
    if (this.processedCards.has(card)) return;

    const cardId = this.extractId(card);
    if (!cardId) return;

    this.processedCards.add(card);
    console.log(`[Selopti] Processing card ${cardId}`);

    const target = DOMNavigator.findTargetContainer(card);
    if (target) {
      CardUI.injectFeatures(target, cardId);
      this.enrichCard(card, target, cardId);
    }
  }

  async enrichCard(card, target, cardId) {
    const link = DOMNavigator.findPropertyLink(card);
    if (!link) return;

    try {
      const response = await fetch(link);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const descEl = doc.querySelector("[class*='Section'][class*='Description']");
      const featuresEl = doc.querySelector("section[class*='Section'][data-testid='cdp-features']");

      const descText = descEl ? descEl.innerText : "";
      const featuresText = featuresEl ? featuresEl.innerText : "";

      // 1. Extract and inject Financials
      const financials = PropertyParser.extractFinancials(doc, descText);
      if (Object.keys(financials).length > 0) {
        CardUI.injectFinancials(target, financials, cardId);
      }

      // 2. Extract and inject Elevator info
      const elevatorInfo = PropertyParser.extractElevator(featuresText);
      CardUI.injectElevator(target, elevatorInfo);

      // 3. Extract and inject Bedrooms & Surface
      const keyfactsEl = card.querySelector("[data-testid='cardmfe-keyfacts-testid']") || doc.querySelector("[data-testid='cardmfe-keyfacts-testid']");
      const keyfactsText = keyfactsEl ? keyfactsEl.textContent : "";
      const bedroomsCount = PropertyParser.extractBedrooms(keyfactsText);
      const surface = PropertyParser.extractSurface(keyfactsText) || PropertyParser.extractSurface(descText);
      if (bedroomsCount) {
        CardUI.injectBedrooms(target, bedroomsCount);
      }

      // 3.5 Calculate and inject Profitability
      const price = PropertyParser.extractPrice(card) || PropertyParser.extractPrice(doc);
      const profitability = this.calculateProfitability(surface, bedroomsCount, financials, price);
      if (profitability) {
        CardUI.injectProfitability(target, profitability, cardId);
      }

      // 4. Extract and inject Coordinates
      const coords = this.geoStore.get(cardId) || PropertyParser.extractCoordinates(doc, html);
      if (coords && target) {
        CardUI.injectCoordinates(target, coords, cardId);
        
        const risques = await PropertyParser.fetchGeorisques(coords);
        if (risques !== null) {
          CardUI.injectGeorisques(target, risques, cardId);
        }
      }

    } catch (err) {
      console.error(`[Selopti] Failed to enrich card ${card.id}:`, err);
    }
  }

  scan(root = document.body) {
    if (!root) return;
    const cards = root.querySelectorAll("[id^='classified-card-'], [id^='carouselitem-']");
    cards.forEach((card) => this.processCard(card));
  }

  init() {
    console.log("[Selopti] Engine starting...");

    // Initial scan
    this.scan();

    // Mutation Observer for dynamic content
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if node is a card itself
            if (node.id && (node.id.startsWith("classified-card-") || node.id.startsWith("carouselitem-"))) {
              this.processCard(node);
            }
            // Scan for cards inside the node
            this.scan(node);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}

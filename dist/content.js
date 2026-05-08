(() => {
  // src/extract.js
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
  function getPriceInfo(text) {
    const parser = new DOMParser();
    let doc = parser.parseFromString(text, "text/html");
    let xpath = '//section[@data-testid="cdp-price"]';
    let result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const priceList = [];
    if (!result.singleNodeValue) return priceList;
    const priceDiv = result.singleNodeValue.querySelectorAll(":scope > div > div > div")[1];
    if (priceDiv.textContent == null || priceDiv.textContent.trim() === "") return priceList;
    const priceDiv2 = priceDiv.querySelectorAll(":scope > div > div > div > div > div > div");
    priceDiv2.forEach((div) => {
      const listDiv = div.querySelectorAll(":scope > div");
      priceList.push([listDiv[0].textContent.trim(), listDiv[1].querySelectorAll(":scope > span")[1].textContent.trim()]);
    });
    return priceList;
  }
  function getPriceRegion(text) {
    const parser = new DOMParser();
    let doc = parser.parseFromString(text, "text/html");
    let xpath = '//section[@data-testid="cdp-price-comparison"]';
    let result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const priceRegion = [];
    if (!result.singleNodeValue) return priceRegion;
    const priceRegionDiv = result.singleNodeValue.querySelector(":scope > div > div > div > div > div:not([class])");
    const priceRegionDiv2 = priceRegionDiv.querySelectorAll(":scope > div");
    priceRegionDiv2.forEach((div, idx) => {
      const regex = /(\d[\d\s\\u00A0,.]*)\s*€\/m²/g;
      if (idx == 0) {
        const matches = div.textContent.replaceAll("\u202F", "").match(regex);
        matches.forEach((match) => {
          priceRegion.push(match.replaceAll(" ", "").replaceAll("\xA0", "")?.replaceAll("\u202F", ""));
        });
      }
      if (idx == 2) {
        const matches = div.textContent.replaceAll(" ", "").match(regex);
        matches.forEach((match) => {
          priceRegion.push(match.replaceAll(" ", "").replaceAll("\xA0", "").replaceAll("\u202F", ""));
        });
      }
    });
    return priceRegion;
  }
  function getFeatures(text) {
    const parser = new DOMParser();
    let doc = parser.parseFromString(text, "text/html");
    let xpath = '//section[@data-testid="cdp-features"]';
    let result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const features = [];
    if (!result.singleNodeValue) return [];
    const featuresDiv = result.singleNodeValue.querySelectorAll("li");
    featuresDiv.forEach((div) => {
      features.push(div.textContent.trim());
    });
    return features;
  }
  function getEnergy(text) {
    const parser = new DOMParser();
    let doc = parser.parseFromString(text, "text/html");
    let xpath = '//section[@data-testid="cdp-energy"]';
    let result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const energyList = [];
    if (!result.singleNodeValue) return energyList;
    const el = result.singleNodeValue.querySelectorAll("div[data-testid='cdp-energy-certificate-preview']");
    if (el != null && el.length) {
      const h3 = el[0].querySelectorAll("h3");
      const score = el[0].querySelectorAll(" div[data-testid='cdp-preview-scale-highlighted']");
      score.forEach((div, idx) => {
        energyList.push([h3[idx].textContent, div.textContent.trim()]);
      });
    }
    ;
    const energyDiv = result.singleNodeValue.querySelectorAll("li");
    if (energyDiv && energyDiv.length) {
      energyDiv.forEach((item) => {
        const candidates = [...item.querySelectorAll("div")].filter((div) => {
          const children = div.querySelectorAll(":scope > span");
          return children.length === 2;
        });
        candidates.forEach((div) => {
          const spans = div.querySelectorAll(":scope > span");
          energyList.push([
            spans[0].textContent.trim(),
            spans[1].textContent.trim()
          ]);
        });
      });
    }
    return energyList;
  }

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

  // src/engine.js
  var SeloptiEngine = class {
    constructor() {
      this.ID_PATTERN = /^(?:classified-card-(?:carouselitem-)?|carouselitem-)(.+)$/;
      this.observedElements = /* @__PURE__ */ new Set();
      this.observer = null;
    }
    init() {
      this.startObserver(document);
    }
    startObserver(root = document) {
      if (this.observer) {
        return;
      }
      const scan = (node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        const element = node;
        if (element.id) {
          const match = this.ID_PATTERN.exec(element.id);
          if (match && !this.observedElements.has(element)) {
            this.observedElements.add(element);
            this.handleMatchedElement(match[1], element);
          }
        }
        const children = element.querySelectorAll("[id]");
        for (const child of children) {
          const match = this.ID_PATTERN.exec(child.id);
          if (match && !this.observedElements.has(child) && match[1] != "autopromo") {
            this.observedElements.add(child);
            this.handleMatchedElement(match[1], child);
          }
        }
      };
      this.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const addedNode of mutation.addedNodes) {
            scan(addedNode);
          }
        }
      });
      this.observer.observe(root, {
        childList: true,
        subtree: true
      });
      scan(root);
    }
    stopObserver() {
      if (!this.observer) {
        return;
      }
      this.observer.disconnect();
      this.observer = null;
    }
    /**
     * @param {string} id
     * @param {Element} element
     */
    handleMatchedElement(id, element) {
      const fullHref = SelogerLinkExtractor.getLink(element, id);
      if (!fullHref) {
        return;
      }
      fetchUrl(fullHref).then((result) => {
        if (result.success !== "true") {
          console.error("Selopti fetch failed for", id, result.error || []);
          return;
        }
        const text = result.data && result.data[0] ? result.data[0].text : "";
        const priceInfo = getPriceInfo(text);
        const priceRegion = getPriceRegion(text);
        const features = getFeatures(text);
        const energy = getEnergy(text);
        console.log(id);
        console.log(energy);
      });
    }
  };

  // src/content.js
  var engine = new SeloptiEngine();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => engine.init());
  } else {
    engine.init();
  }
})();

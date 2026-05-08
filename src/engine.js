import { SelogerLinkExtractor, getFeatures, getPriceInfo, getPriceRegion, getEnergy } from './extract.js';
import { fetchUrl } from './util.js';

export class SeloptiEngine {
  constructor() {
    this.ID_PATTERN = /^(?:classified-card-(?:carouselitem-)?|carouselitem-)(.+)$/;
    this.observedElements = new Set();
    this.observer = null;
  }

  init() {
    this.startObserver(document);
  }

  startObserver(root = document) {
    if (this.observer) {
      return;
    }

    /**
     * @param {Node} node
     */
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
      subtree: true,
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
        console.error('Selopti fetch failed for', id, result.error || []);
        return;
      }

      const text = result.data && result.data[0] ? result.data[0].text : '';
      const priceInfo = getPriceInfo(text);
      const priceRegion = getPriceRegion(text);
      const features = getFeatures(text);
      const energy = getEnergy(text);
      console.log(id);
      console.log(energy);
    });
  }
}
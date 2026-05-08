export class SelogerLinkExtractor {
  static getLink(el, id) {
    if (!el) return null;
    try { if (el.tagName === 'A' && el.href) return el.href; } catch (e) { }

    try {
      if (el.querySelector) {
        const desc = el.querySelector('a[href]');
        if (desc && desc.href) return desc.href;
      }
    } catch (e) { }

    let parent = el.parentElement;
    while (parent) {
      try { if (parent.tagName === 'A' && parent.href) return parent.href; } catch (e) { }
      parent = parent.parentElement;
    }

    try {
      if (id) {
        const anchors = document.querySelectorAll('a[href*="' + id + '"]');
        if (anchors && anchors.length) return anchors[0].href;
      }
    } catch (e) { }

    return null;
  }
}

export class DOMScanner {
  constructor(onElementMatched) {
    this.ID_PATTERN = /^(?:classified-card-(?:carouselitem-)?|carouselitem-)(.+)$/;
    this.observedElements = new Set();
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
}

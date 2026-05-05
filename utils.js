class DOMNavigator {
  /**
   * Finds the n-th child of a specific tag type.
   */
  static getChildByTag(parent, tagName, index) {
    if (!parent || !parent.children) return null;
    const children = Array.from(parent.children).filter(
      (c) => c.tagName === tagName.toUpperCase()
    );
    return children[index] || null;
  }

  /**
   * Specific path for SeLoger cards: div[0]/div[0]/div[0]/div[1]/div[0]
   */
  static findTargetContainer(card) {
    try {
      const d1 = this.getChildByTag(card, "DIV", 0);
      const d2 = this.getChildByTag(d1, "DIV", 0);
      const d3 = this.getChildByTag(d2, "DIV", 0);
      const d4 = this.getChildByTag(d3, "DIV", 1);
      return this.getChildByTag(d4, "DIV", 0);
    } catch (e) {
      return null;
    }
  }

  /**
   * Finds the link to the property page: div[0] > a
   */
  static findPropertyLink(card) {
    const firstDiv = this.getChildByTag(card, "DIV", 0);
    const linkEl = firstDiv?.querySelector(":scope > a");
    return linkEl ? linkEl.href : null;
  }
}

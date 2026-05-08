
// Class-based helper to find the full SeLoger announcement URL related to an element
export class SelogerLinkExtractor {
  static getLink(el, id) {
    if (!el) return null;
    try { if (el.tagName === 'A' && el.href) return el.href; } catch (e) {}

    try {
      if (el.querySelector) {
        const desc = el.querySelector('a[href]');
        if (desc && desc.href) return desc.href;
      }
    } catch (e) {}

    let parent = el.parentElement;
    while (parent) {
      try { if (parent.tagName === 'A' && parent.href) return parent.href; } catch (e) {}
      parent = parent.parentElement;
    }

    try {
      if (id) {
        const anchors = document.querySelectorAll('a[href*="' + id + '"]');
        if (anchors && anchors.length) return anchors[0].href;
      }
    } catch (e) {}

    return null;
  }
}

export function getPriceInfo(text) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(text, 'text/html');
  
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

export function getPriceRegion(text) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(text, 'text/html');

  let xpath = '//section[@data-testid="cdp-price-comparison"]';
  let result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const priceRegion = [];
  if (!result.singleNodeValue) return priceRegion;
  const priceRegionDiv = result.singleNodeValue.querySelector(":scope > div > div > div > div > div:not([class])");
  const priceRegionDiv2 = priceRegionDiv.querySelectorAll(":scope > div");
  priceRegionDiv2.forEach((div, idx) => {
    const regex = /(\d[\d\s\\u00A0,.]*)\s*€\/m²/g;
    if (idx == 0) {
      const matches = div.textContent.replaceAll(" ", "").match(regex);
      matches.forEach((match) => {
        priceRegion.push(match.replaceAll(" ", "").replaceAll("\u00A0", "")?.replaceAll(" ", ""));
      });
    }
    if (idx == 2) {
      const matches = div.textContent.replaceAll(" ", "").match(regex);
      matches.forEach((match) => {
        priceRegion.push(match.replaceAll(" ", "").replaceAll("\u00A0", "").replaceAll(" ", ""));
      });
    }
  });
  return priceRegion;
}

export function getFeatures(text) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(text, 'text/html');

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

export function getEnergy(text) {

  const parser = new DOMParser();
  let doc = parser.parseFromString(text, 'text/html');
  
  let xpath = '//section[@data-testid="cdp-energy"]';
  let result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);

  const energyList = [];
  if (!result.singleNodeValue) return energyList;
  const el = result.singleNodeValue.querySelectorAll("div[data-testid='cdp-energy-certificate-preview']");
  if (el != null && el.length) {
    const h3 = el[0].querySelectorAll("h3");
    const score = el[0].querySelectorAll(" div[data-testid='cdp-preview-scale-highlighted']")
    score.forEach((div,idx) => {
      energyList.push([h3[idx].textContent, div.textContent.trim()]);
    });    
  };

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
          spans[1].textContent.trim(),
        ]);
      });
    });
  }


  return energyList;
}

export function getDescription(text) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(text, 'text/html');

  let xpath="//div[data-testid='cdp-main-description-expandable-text']";
  let result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  return result.singleNodeValue ? result.singleNodeValue.textContent.trim() : "";
}
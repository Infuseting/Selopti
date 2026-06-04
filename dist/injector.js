(() => {
  // src/injector.js
  var originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    try {
      let url = args[0];
      if (url instanceof Request) {
        url = url.url;
      }
      url = String(url);
      if (url.includes("geo") || url.includes("Geo")) {
        const clone = response.clone();
        clone.json().then((data) => {
          if (data && data.classifieds) {
            window.dispatchEvent(new CustomEvent("selopti:geo-intercepted", {
              detail: data
            }));
          }
        }).catch((err) => {
          console.error("Selopti: Erreur lors de l'analyse du JSON geo", err);
        });
      }
      const geomMatch = url.match(/geom\?.*?placeId=([^&]+)/);
      if (geomMatch) {
        const placeId = geomMatch[1];
        const clone = response.clone();
        clone.json().then((data) => {
          window.dispatchEvent(new CustomEvent("selopti:geom-intercepted", {
            detail: { placeId, data }
          }));
        }).catch((err) => console.error(err));
      }
      const rentMatch = url.match(/prices\/rent\/([^/?]+)/);
      if (rentMatch) {
        const placeId = rentMatch[1];
        const clone = response.clone();
        clone.json().then((data) => {
          window.dispatchEvent(new CustomEvent("selopti:rent-intercepted", {
            detail: { placeId, data }
          }));
        }).catch((err) => console.error(err));
      }
    } catch (err) {
      console.error("Selopti: Erreur lors de l'interception de la requ\xEAte", err);
    }
    return response;
  };
  window.addEventListener("selopti:do-fetch-rent", async (e) => {
    console.log("Selopti: Event selopti:do-fetch-rent fired", e);
    const zoneId = e.detail;
    try {
      console.log(zoneId.toUpperCase());
      const res = await window.fetch(`https://www.seloger.com/serp-bff/map/tile/prices/rent/${zoneId.toUpperCase()}`);
      console.log(res);
      if (!res.ok) {
        window.dispatchEvent(new CustomEvent(`selopti:rent-result-${zoneId}`, { detail: null }));
        return;
      }
      const data = await res.json();
      console.log(data);
      window.dispatchEvent(new CustomEvent(`selopti:rent-result-${zoneId}`, { detail: data }));
    } catch (err) {
      console.error("Selopti: Error fetching rent for zoneId", zoneId, err);
      window.dispatchEvent(new CustomEvent(`selopti:rent-result-${zoneId}`, { detail: null }));
    }
  });
})();

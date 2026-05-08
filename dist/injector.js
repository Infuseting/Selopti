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
    } catch (err) {
      console.error("Selopti: Erreur lors de l'interception de la requ\xEAte", err);
    }
    return response;
  };
})();

(() => {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

    // Intercept requests containing 'geo' or 'classifiedList' in the URL
    if (url.includes('geo') || url.includes('classifiedList') || url.includes('classified')) {
      console.log(`[Selopti Interceptor] Intercepted fetch to ${url}`);
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        
        if (data && data.classifieds) {
          console.log(`[Selopti Interceptor] Found ${data.classifieds.length} classifieds in fetch response.`);
          window.postMessage({
            type: "SELOPTI_GEO_DATA",
            data: data
          }, "*");
        }
      } catch (err) {
        console.error("[Selopti Interceptor] Error parsing fetch response:", err);
      }
    }

    return response;
  };
  
  // Also intercept XMLHttpRequest just in case SeLoger uses it
  const originalXHR = window.XMLHttpRequest;
  function newXHR() {
    const xhr = new originalXHR();
    xhr.addEventListener('load', function() {
      if (xhr.responseURL && (xhr.responseURL.includes('geo') || xhr.responseURL.includes('classifiedList') || xhr.responseURL.includes('classified'))) {
        console.log(`[Selopti Interceptor] Intercepted XHR to ${xhr.responseURL}`);
        try {
          const data = JSON.parse(xhr.responseText);
          if (data && data.classifieds) {
            console.log(`[Selopti Interceptor] Found ${data.classifieds.length} classifieds in XHR response.`);
            window.postMessage({
              type: "SELOPTI_GEO_DATA",
              data: data
            }, "*");
          }
        } catch (e) {
          console.error("[Selopti Interceptor] Error parsing XHR response:", e);
        }
      }
    });
    return xhr;
  }
  window.XMLHttpRequest = newXHR;

  console.log("[Selopti] Network interceptor installed.");
})();

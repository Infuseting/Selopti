// Expose seloptiExport helper in the page world (reads from localStorage shared with content script)
window.seloptiExport = {
  get entries() {
    try { return JSON.parse(localStorage.getItem('selopti_export') || '[]'); } catch { return []; }
  },
  download() {
    const entries = this.entries;
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selopti-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`Selopti Export: downloaded ${entries.length} entries.`);
  },
  clear() {
    localStorage.removeItem('selopti_export');
    console.log('Selopti Export: cleared.');
  },
};

const originalFetch = window.fetch;

window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);

  try {
    let url = args[0];
    if (url instanceof Request) {
      url = url.url;
    }
    url = String(url);

    // Vérifier spécifiquement pour la requête geo
    if (url.includes('geo') || url.includes('Geo')) {
      const clone = response.clone();
      clone.json().then(data => {
        if (data && data.classifieds) {
          window.dispatchEvent(new CustomEvent('selopti:geo-intercepted', {
            detail: data
          }));
        }
      }).catch(err => {
        console.error("Selopti: Erreur lors de l'analyse du JSON geo", err);
      });
    }

    const geomMatch = url.match(/geom\?.*?placeId=([^&]+)/);
    if (geomMatch) {
      const placeId = geomMatch[1];
      const clone = response.clone();
      clone.json().then(data => {
        window.dispatchEvent(new CustomEvent('selopti:geom-intercepted', {
          detail: { placeId, data }
        }));
      }).catch(err => console.error(err));
    }

    const rentMatch = url.match(/prices\/rent\/([^/?]+)/);
    if (rentMatch) {
      const placeId = rentMatch[1];
      const clone = response.clone();
      clone.json().then(data => {
        window.dispatchEvent(new CustomEvent('selopti:rent-intercepted', {
          detail: { placeId, data }
        }));
      }).catch(err => console.error(err));
    }
  } catch (err) {
    console.error("Selopti: Erreur lors de l'interception de la requête", err);
  }

  return response;
};

// Écoute des demandes de fetch depuis le content script (pour utiliser le fetch natif avec Datadome)
window.addEventListener('selopti:do-fetch-rent', async (e) => {
  console.log("Selopti: Event selopti:do-fetch-rent fired", e);
  const zoneId = e.detail;
  try {
    console.log(zoneId.toUpperCase())
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

window.addEventListener('selopti:do-track-price', async (e) => {
  const detail = e?.detail ?? {};
  const requestId = detail.requestId;
  const endpoint = detail.endpoint;
  const payload = detail.payload;

  if (!requestId || !endpoint || !payload) return;

  const resultEventName = `selopti:price-track-result-${requestId}`;

  try {
    const res = await window.fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      window.dispatchEvent(new CustomEvent(resultEventName, {
        detail: { success: false, status: res.status },
      }));
      return;
    }

    const data = await res.json();
    window.dispatchEvent(new CustomEvent(resultEventName, {
      detail: { success: true, data },
    }));
  } catch (err) {
    console.error('Selopti: price tracking failed', err);
    window.dispatchEvent(new CustomEvent(resultEventName, {
      detail: { success: false, error: String(err) },
    }));
  }
});

// ── Selopti interaction layer ──────────────────────────────────────────────
// Registered on document in CAPTURE phase, before SeLoger's own handlers,
// so we can stop navigation and handle details/tooltips ourselves.
(function initSeloptiInteractionLayer() {
  if (globalThis.__seloptiLayerInit) return;
  globalThis.__seloptiLayerInit = true;

  // ── Tooltip element (created lazily once body exists) ──────────────────
  let _tip = null;
  function getTip() {
    if (_tip && document.body.contains(_tip)) return _tip;
    _tip = document.createElement('div');
    _tip.id = 'selopti-tooltip';
    const s = _tip.style;
    s.position      = 'fixed';
    s.zIndex        = '2147483647';
    s.pointerEvents = 'none';
    s.display       = 'none';
    s.maxWidth      = '300px';
    s.background    = '#0f172a';
    s.color         = '#f1f5f9';
    s.fontFamily    = "'Inter', system-ui, sans-serif";
    s.fontSize      = '12px';
    s.lineHeight    = '1.55';
    s.padding       = '10px 13px';
    s.borderRadius  = '10px';
    s.boxShadow     = '0 8px 28px rgba(0,0,0,0.35)';
    s.whiteSpace    = 'pre-line';
    (document.body || document.documentElement).appendChild(_tip);
    return _tip;
  }

  // ── Click: prevent card navigation + handle details toggle ────────────
  // capture=true → fires before EVERY other listener in the page
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const container = target.closest('.selopti-container');
    if (!container) return;

    // Prevent <a> navigation and stop all other handlers
    e.preventDefault();
    e.stopImmediatePropagation();

    // Manually toggle <details> because preventDefault cancels the native
    // activation behaviour of <summary>
    const summary = target.closest('summary');
    if (summary) {
      const details = summary.closest('details');
      if (details) details.open = !details.open;
    }
  }, true);

  // Stop mousedown/pointerdown from bubbling to SeLoger (prevents drag-select
  // or other press-start handlers on the card)
  ['mousedown', 'pointerdown'].forEach((type) => {
    document.addEventListener(type, (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('.selopti-container')) {
        e.stopImmediatePropagation();
      }
    }, true);
  });

  // ── Tooltip: mouseover (bubbles, so we catch all inner elements) ───────
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const el = target.closest('[data-selopti-tip]');
    if (!el) return;
    const text = el.dataset.seloptiTip;
    if (!text) return;

    const tip = getTip();
    tip.innerHTML = text;
    tip.style.display = 'block';

    const rect  = el.getBoundingClientRect();
    const tipW  = 300;
    const tipH  = tip.offsetHeight || 80;
    const gap   = 8;
    let top    = rect.top - tipH - gap;
    if (top < 8) top = rect.bottom + gap;
    let left   = rect.left + rect.width / 2 - tipW / 2;
    if (left + tipW > globalThis.innerWidth - 8) left = globalThis.innerWidth - tipW - 8;
    if (left < 8) left = 8;

    tip.style.top  = Math.round(top)  + 'px';
    tip.style.left = Math.round(left) + 'px';
  }, true);

  document.addEventListener('mouseout', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('[data-selopti-tip]')) return;
    // Hide only when truly leaving the element (not moving to a child)
    if (!target.contains(e.relatedTarget)) {
      const tip = document.getElementById('selopti-tooltip');
      if (tip) tip.style.display = 'none';
    }
  }, true);

}());

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
    if (url.includes('/geo') || url.includes('/Geo')) {
      const clone = response.clone();
      clone.json().then(data => {
        if (data && data.classifieds) {
          window.dispatchEvent(new CustomEvent('selopti:geo-intercepted', {
            detail: JSON.stringify(data)
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
    window.dispatchEvent(new CustomEvent(`selopti:rent-result-${zoneId}`, { detail: JSON.stringify(data) }));
  } catch (err) {
    console.error("Selopti: Error fetching rent for zoneId", zoneId, err);
    window.dispatchEvent(new CustomEvent(`selopti:rent-result-${zoneId}`, { detail: null }));
  }
});

window.addEventListener('selopti:do-track-price', async (e) => {
  let detail = {};
  try {
    detail = typeof e.detail === 'string' ? JSON.parse(e.detail) : (e.detail || {});
  } catch (err) {
    console.error("Selopti: Failed to parse do-track-price detail", err);
    return;
  }
  const endpoint = detail.endpoint;
  const requests = Array.isArray(detail.requests)
    ? detail.requests
    : (detail.requestId && detail.payload)
      ? [{ requestId: detail.requestId, ...detail.payload }]
      : [];

  if (!endpoint || requests.length === 0) return;

  const emitResult = (requestId, result) => {
    if (!requestId) return;
    window.dispatchEvent(new CustomEvent(`selopti:price-track-result-${requestId}`, {
      detail: JSON.stringify(result),
    }));
  };

  try {
    const res = await window.fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requests),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    const resultItems = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : null;

    if (!res.ok) {
      if (resultItems) {
        resultItems.forEach((item) => {
          emitResult(item?.requestId, {
            success: false,
            status: item?.status ?? res.status,
            error: item?.error ?? `Request failed with status ${res.status}`,
          });
        });
      } else {
        requests.forEach((request) => {
          emitResult(request.requestId, {
            success: false,
            status: res.status,
          });
        });
      }
      return;
    }

    if (resultItems) {
      resultItems.forEach((item) => {
        if (item?.success === false) {
          emitResult(item.requestId, {
            success: false,
            status: item.status ?? 500,
            error: item.error ?? 'Tracking failed',
          });
          return;
        }

        emitResult(item.requestId, {
          success: true,
          data: item?.data ?? item,
        });
      });
      return;
    }

    const fallbackRequest = requests[0];
    emitResult(fallbackRequest.requestId, {
      success: true,
      data,
    });
  } catch (err) {
    console.error('Selopti: price tracking failed', err);
    requests.forEach((request) => {
      emitResult(request.requestId, {
        success: false,
        error: String(err),
      });
    });
  }
});

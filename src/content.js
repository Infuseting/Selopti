/**
 * Selopti - Content Script Entry Point
 * Ce script injecte d'abord l'intercepteur dans la page, puis charge l'engine
 */

// 1. Injecter l'intercepteur fetch IMMÉDIATEMENT dans le contexte de la page
const injectorScript = document.createElement('script');
injectorScript.src = chrome.runtime.getURL('dist/injector.js');
injectorScript.type = 'text/javascript';
(document.head || document.documentElement).appendChild(injectorScript);

// 2. Écouter les événements geo interceptés
window.addEventListener('selopti:geo-intercepted', (event) => {

  // Passer les données à l'engine via un event custom
  window.dispatchEvent(new CustomEvent('selopti:geo-data', {
    detail: event.detail
  }));
});

// 3. Importer les modules et charger l'engine
import './geo.js'; // S'assure que le manager geo écoute les événements de l'injector
import { SeloptiEngine } from './engine.js';
import { seloptiExport } from './export.js';

const engine = new SeloptiEngine();
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("distributionTypes") === "Buy") {
  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', () => {
      engine.init();
    });
  } else {
    engine.init();
  }
}

window.seloptiInserter = engine.inserter;
window.seloptiExport = seloptiExport;


/**
 * Selopti - Non-module Entry Point
 * When scripts are loaded in the order (util.js, extract.js, engine.js, content.js),
 * `SeloptiEngine` will be defined globally by `engine.js` and we can start it here.
 */

import { SeloptiEngine } from './engine.js';

const engine = new SeloptiEngine();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => engine.init());
} else {
  engine.init();
}

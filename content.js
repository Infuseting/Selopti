/**
 * Selopti - Entry Point
 */

(() => {
  const engine = new SeloptiEngine();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => engine.init());
  } else {
    engine.init();
  }
})();

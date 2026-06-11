import {
  loadSeloptiConfig,
  normalizePriceTrackerConfig,
  normalizeSeloptiConfig,
  resetSeloptiConfig,
  saveSeloptiConfig,
} from './config.js';

// ── DOM refs ──────────────────────────────────────────────────────────────
const form                    = document.getElementById('settings-form');
const statusEl                = document.getElementById('status');
const resetButton             = document.getElementById('reset-button');

// Mortgage
const mortgageAnnualRateInput    = document.getElementById('mortgageAnnualRate');
const mortgageDurationYearsInput = document.getElementById('mortgageDurationYears');
const mortgageDownPaymentInput   = document.getElementById('mortgageDownPaymentRatio');

// Coloc + vacancy
const colocRoomSizeInput     = document.getElementById('colocRoomSizeM2');
const colocAppartCoefInput   = document.getElementById('colocAppartCoef');
const vacanceClassiqueInput  = document.getElementById('vacanceClassiqueMois');
const vacanceColocInput      = document.getElementById('vacanceColocMois');

// ROI hypotheses
const fraisNotaireInput      = document.getElementById('fraisNotairePct');
const terrainPctInput        = document.getElementById('terrainPct');
const pnoAnnualInput         = document.getElementById('pnoAnnualPct');
const entretienAnnualInput   = document.getElementById('entretienAnnualPct');
const tmiInput               = document.getElementById('tmi');

// Charges
const chargesExcludedInput   = document.getElementById('chargesExcludedLabels');

// Tracking
const enabledInput           = document.getElementById('enabled');
const endpointInput          = document.getElementById('endpoint');
const timeoutInput           = document.getElementById('timeoutMs');
const batchWindowInput       = document.getElementById('batchWindowMs');
const batchSizeInput         = document.getElementById('batchSize');
const tabButtons             = Array.from(document.querySelectorAll('.nav-item[data-tab]'));
const tabPanels              = Array.from(document.querySelectorAll('.tab-panel'));

// ── Helpers ───────────────────────────────────────────────────────────────
function setStatus(message, tone = 'info') {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function pctOut(decimalValue) {
  return String((Number(decimalValue) * 100).toFixed(2)).replace(/\.00$/, '');
}

function parseLabelList(value) {
  return String(value ?? '')
    .split(/[\n,;]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function activateTab(tabName) {
  tabButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });

  tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
}

function setupTabs() {
  const initialTab = globalThis.location.hash?.replace('#', '') || tabButtons[0]?.dataset.tab || 'pret';
  activateTab(initialTab);

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      activateTab(button.dataset.tab);
      history.replaceState(null, '', `#${button.dataset.tab}`);
    });
  });
}

// ── Fill form from config ─────────────────────────────────────────────────
function fillForm(config) {
  const c = normalizeSeloptiConfig(config);

  // Mortgage
  mortgageAnnualRateInput.value    = pctOut(c.mortgage.annualRate);
  mortgageDurationYearsInput.value = String(c.mortgage.durationYears);
  mortgageDownPaymentInput.value   = pctOut(c.mortgage.downPaymentRatio);

  // Coloc + vacancy
  colocRoomSizeInput.value    = String(c.coloc.roomSizeM2);
  colocAppartCoefInput.value  = String(c.coloc.appartCoef);
  vacanceClassiqueInput.value = String(c.roi.vacanceClassiqueMois);
  vacanceColocInput.value     = String(c.roi.vacanceColocMois);

  // ROI hypotheses
  fraisNotaireInput.value    = pctOut(c.roi.fraisNotairePct);
  terrainPctInput.value      = pctOut(c.roi.terrainPct);
  pnoAnnualInput.value       = pctOut(c.roi.pnoAnnualPct);
  entretienAnnualInput.value = pctOut(c.roi.entretienAnnualPct);
  tmiInput.value             = pctOut(c.roi.tmi);

  // Charges
  chargesExcludedInput.value = c.chargesExcludedLabels.join('\n');

  // Tracking
  enabledInput.checked     = c.priceTracker.enabled;
  endpointInput.value      = c.priceTracker.endpoint;
  timeoutInput.value       = String(c.priceTracker.timeoutMs);
  batchWindowInput.value   = String(c.priceTracker.batchWindowMs);
  batchSizeInput.value     = String(c.priceTracker.batchSize);
}

// ── Read form into config ─────────────────────────────────────────────────
function readFormConfig() {
  return normalizeSeloptiConfig({
    mortgage: {
      annualRate:       Number(mortgageAnnualRateInput.value) / 100,
      durationYears:    mortgageDurationYearsInput.value,
      downPaymentRatio: Number(mortgageDownPaymentInput.value) / 100,
    },
    coloc: {
      roomSizeM2:  colocRoomSizeInput.value,
      appartCoef:  colocAppartCoefInput.value,
    },
    roi: {
      vacanceClassiqueMois: vacanceClassiqueInput.value,
      vacanceColocMois:     vacanceColocInput.value,
      fraisNotairePct:      Number(fraisNotaireInput.value) / 100,
      terrainPct:           Number(terrainPctInput.value) / 100,
      pnoAnnualPct:         Number(pnoAnnualInput.value) / 100,
      entretienAnnualPct:   Number(entretienAnnualInput.value) / 100,
      tmi:                  Number(tmiInput.value) / 100,
    },
    chargesExcludedLabels: parseLabelList(chargesExcludedInput.value),
    priceTracker: normalizePriceTrackerConfig({
      enabled:      enabledInput.checked,
      endpoint:     endpointInput.value,
      timeoutMs:    timeoutInput.value,
      batchWindowMs: batchWindowInput.value,
      batchSize:    batchSizeInput.value,
    }),
  });
}

// ── Event handlers ────────────────────────────────────────────────────────
async function loadSettings() {
  setStatus('Chargement\u2026', 'info');
  const config = await loadSeloptiConfig();
  fillForm(config);
  setStatus('', 'info');
}

async function handleSubmit(event) {
  event.preventDefault();
  try {
    const config = await saveSeloptiConfig(readFormConfig());
    fillForm(config);
    setStatus('Configuration enregistr\u00e9e.', 'success');
  } catch (error) {
    setStatus(
      `Impossible d\u2019enregistrer\u00a0: ${error instanceof Error ? error.message : String(error)}`,
      'error',
    );
  }
}

async function handleReset() {
  try {
    const config = await resetSeloptiConfig();
    fillForm(config);
    setStatus('Configuration r\u00e9initialis\u00e9e.', 'success');
  } catch (error) {
    setStatus(
      `Impossible de r\u00e9initialiser\u00a0: ${error instanceof Error ? error.message : String(error)}`,
      'error',
    );
  }
}

form.addEventListener('submit', handleSubmit);
resetButton.addEventListener('click', handleReset);
setupTabs();

loadSettings().catch(error => {
  setStatus(
    `Impossible de charger\u00a0: ${error instanceof Error ? error.message : String(error)}`,
    'error',
  );
});

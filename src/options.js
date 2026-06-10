import {
  loadSeloptiConfig,
  normalizePriceTrackerConfig,
  normalizeSeloptiConfig,
  resetSeloptiConfig,
  saveSeloptiConfig,
} from './config.js';

const form = document.getElementById('settings-form');
const mortgageAnnualRateInput = document.getElementById('mortgageAnnualRate');
const mortgageDurationYearsInput = document.getElementById('mortgageDurationYears');
const mortgageDownPaymentRatioInput = document.getElementById('mortgageDownPaymentRatio');
const colocRoomSizeInput = document.getElementById('colocRoomSizeM2');
const colocAppartCoefInput = document.getElementById('colocAppartCoef');
const chargesExcludedLabelsInput = document.getElementById('chargesExcludedLabels');
const enabledInput = document.getElementById('enabled');
const endpointInput = document.getElementById('endpoint');
const timeoutInput = document.getElementById('timeoutMs');
const batchWindowInput = document.getElementById('batchWindowMs');
const batchSizeInput = document.getElementById('batchSize');
const statusElement = document.getElementById('status');
const resetButton = document.getElementById('reset-button');

function setStatus(message, tone = 'info') {
  statusElement.textContent = message;
  statusElement.dataset.tone = tone;
}

function formatPercentage(value) {
  return String((Number(value) * 100).toFixed(2)).replace(/\.00$/, '');
}

function parseLabelList(value) {
  return String(value ?? '')
    .split(/[\n,;]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fillForm(config) {
  const normalized = normalizeSeloptiConfig(config);
  enabledInput.checked = normalized.priceTracker.enabled;
  endpointInput.value = normalized.priceTracker.endpoint;
  timeoutInput.value = String(normalized.priceTracker.timeoutMs);
  batchWindowInput.value = String(normalized.priceTracker.batchWindowMs);
  batchSizeInput.value = String(normalized.priceTracker.batchSize);

  mortgageAnnualRateInput.value = formatPercentage(normalized.mortgage.annualRate);
  mortgageDurationYearsInput.value = String(normalized.mortgage.durationYears);
  mortgageDownPaymentRatioInput.value = formatPercentage(normalized.mortgage.downPaymentRatio);

  colocRoomSizeInput.value = String(normalized.coloc.roomSizeM2);
  colocAppartCoefInput.value = String(normalized.coloc.appartCoef);

  chargesExcludedLabelsInput.value = normalized.chargesExcludedLabels.join('\n');
}

function readFormConfig() {
  return normalizeSeloptiConfig({
    mortgage: {
      annualRate: Number(mortgageAnnualRateInput.value) / 100,
      durationYears: mortgageDurationYearsInput.value,
      downPaymentRatio: Number(mortgageDownPaymentRatioInput.value) / 100,
    },
    coloc: {
      roomSizeM2: colocRoomSizeInput.value,
      appartCoef: colocAppartCoefInput.value,
    },
    chargesExcludedLabels: parseLabelList(chargesExcludedLabelsInput.value),
    priceTracker: normalizePriceTrackerConfig({
      enabled: enabledInput.checked,
      endpoint: endpointInput.value,
      timeoutMs: timeoutInput.value,
      batchWindowMs: batchWindowInput.value,
      batchSize: batchSizeInput.value,
    }),
  });
}

async function loadSettings() {
  setStatus('Chargement de la configuration…', 'info');
  const config = await loadSeloptiConfig();
  fillForm(config);
  setStatus('Configuration chargée.', 'success');
}

async function handleSubmit(event) {
  event.preventDefault();

  try {
    const config = await saveSeloptiConfig(readFormConfig());
    fillForm(config);
    setStatus('Configuration enregistrée.', 'success');
  } catch (error) {
    setStatus(`Impossible d’enregistrer la configuration: ${error instanceof Error ? error.message : String(error)}`, 'error');
  }
}

async function handleReset() {
  try {
    const config = await resetSeloptiConfig();
    fillForm(config);
    setStatus('Configuration réinitialisée.', 'success');
  } catch (error) {
    setStatus(`Impossible de réinitialiser la configuration: ${error instanceof Error ? error.message : String(error)}`, 'error');
  }
}

form.addEventListener('submit', handleSubmit);
resetButton.addEventListener('click', handleReset);

loadSettings().catch((error) => {
  setStatus(`Impossible de charger la configuration: ${error instanceof Error ? error.message : String(error)}`, 'error');
});
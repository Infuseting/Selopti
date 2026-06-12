import { ROI_DEFAULTS } from '../config.js';

/**
 * ROIScorer
 *
 * Computes a rapid ROI score for a real-estate property based on available
 * data. Missing inputs are estimated with conservative assumptions tagged
 * [ESTIMÉ].
 *
 * Applies Single Responsibility Principle by breaking the scoring logic into
 * smaller, manageable sub-methods.
 */
export class ROIScorer {
  /**
   * Initializes the scorer with the given configuration.
   *
   * @param {import('../config.js').ROI_DEFAULTS} [roiConfig] - Normalized ROI hypothesis config.
   */
  constructor(roiConfig = {}) {
    this._cfg = {
      fraisNotairePct:      roiConfig.fraisNotairePct      ?? ROI_DEFAULTS.fraisNotairePct,
      pnoAnnualPct:         roiConfig.pnoAnnualPct         ?? ROI_DEFAULTS.pnoAnnualPct,
      entretienAnnualPct:   roiConfig.entretienAnnualPct   ?? ROI_DEFAULTS.entretienAnnualPct,
      vacanceClassiqueMois: roiConfig.vacanceClassiqueMois ?? ROI_DEFAULTS.vacanceClassiqueMois,
      vacanceColocMois:     roiConfig.vacanceColocMois     ?? ROI_DEFAULTS.vacanceColocMois,
      tmi:                  roiConfig.tmi                  ?? ROI_DEFAULTS.tmi,
      terrainPct:           roiConfig.terrainPct           ?? ROI_DEFAULTS.terrainPct,
    };
  }

  /**
   * Calculates the full ROI score and all financial metrics.
   *
   * @param {object} params - Input parameters for ROI calculation.
   * @param {number} [params.propertyPrice=0] - The price of the property.
   * @param {number} [params.surface=0] - The surface area.
   * @param {number} [params.bedrooms=0] - The number of bedrooms.
   * @param {number} [params.monthlyCharges=0] - Known monthly charges.
   * @param {object} [params.simulations={}] - Financing simulations.
   * @param {Array}  [params.priceInfo=[]] - Price details array.
   * @param {Array}  [params.energy=[]] - Energy details array.
   * @param {Array}  [params.features=[]] - Property features array.
   * @param {string} [params.description=''] - Property description.
   * @returns {object} The complete ROI score and associated metrics.
   */
  score({
    propertyPrice  = 0,
    surface        = 0,
    bedrooms       = 0,
    monthlyCharges = 0,
    simulations    = {},
    priceInfo      = [],
    energy         = [],
    features       = [],
    description    = '',
  } = {}) {
    const context = {
      propertyPrice, surface, bedrooms, monthlyCharges, simulations,
      priceInfo, energy, features, description,
      hypotheses: [],
      flags: [],
      isColoc: bedrooms >= 2,
    };

    context.structure = context.isColoc ? 'LMNP' : 'Location nue';
    context.scenario = (context.isColoc && simulations.collocation) ? simulations.collocation : (simulations.classic || {});
    context.monthlyRent = context.scenario.monthlyRent ?? 0;
    context.monthlyMortgage = context.scenario.monthlyMortgage ?? 0;

    const acquisition = this._estimateAcquisition(context);
    const charges = this._estimateCharges(context, acquisition.prixTotal);
    const breakEven = this._calculateBreakEven(context, charges);
    const kpis = this._computeKPIs(context, acquisition, charges);
    const amortissement = this._calculateAmortissementLMNP(context, acquisition, kpis, charges);
    const evaluation = this._evaluateScoreAndFlags(context, kpis, amortissement, acquisition);

    return {
      structure_detectee: context.structure,
      kpis: kpis,
      amortissement_annuel_estime: amortissement.annuel,
      resultat_fiscal_estime: amortissement.resultatFiscal,
      break_even: breakEven,
      charges_detail: charges.detail,
      amort_detail: amortissement.detail,
      fiscal_detail: amortissement.fiscalDetail,
      hypotheses: context.hypotheses,
      flags: evaluation.flags,
      verdict: evaluation.verdict,
    };
  }

  /**
   * Estimates acquisition costs including notary fees.
   *
   * @param {object} context - Execution context containing property details.
   * @returns {object} The acquisition details.
   */
  _estimateAcquisition(context) {
    const fraisNotaire = Math.round(context.propertyPrice * this._cfg.fraisNotairePct);
    const prixTotal = context.propertyPrice + fraisNotaire;
    
    context.hypotheses.push(
      `[ESTIM\u00c9] Frais de notaire : ${(this._cfg.fraisNotairePct * 100).toFixed(0)} % = ${fraisNotaire} \u20ac`,
    );

    return { fraisNotaire, prixTotal };
  }

  /**
   * Estimates recurrent charges, including insurance, maintenance, vacancy, taxes, and co-ownership.
   *
   * @param {object} context - Execution context.
   * @param {number} prixTotal - Total acquisition price.
   * @returns {object} The computed charges and details.
   */
  _estimateCharges(context, prixTotal) {
    const pno = (context.propertyPrice * this._cfg.pnoAnnualPct) / 12;
    const entretien = (context.propertyPrice * this._cfg.entretienAnnualPct) / 12;

    const vacanceMois = context.isColoc ? this._cfg.vacanceColocMois : this._cfg.vacanceClassiqueMois;
    const vacance = (context.monthlyRent * vacanceMois) / 12;
    const vacancePct = ((vacanceMois / 12) * 100).toFixed(1);

    context.hypotheses.push(
      `[ESTIM\u00c9] Assurance PNO : ${(this._cfg.pnoAnnualPct * 100).toFixed(1)} %/an = ${Math.round(pno * 12)} \u20ac/an`,
      `[ESTIM\u00c9] Entretien/travaux : ${(this._cfg.entretienAnnualPct * 100).toFixed(1)} %/an = ${Math.round(entretien * 12)} \u20ac/an`,
      `[ESTIM\u00c9] Vacance locative (${context.isColoc ? 'coloc' : 'classique'}) : ${vacanceMois} mois/an (${vacancePct} %)`,
    );

    let tfEstimee = 0;
    if (this._isValueMissing(context.priceInfo, 'fonci\u00e8re') && this._isValueMissing(context.priceInfo, 'fonciere')) {
      tfEstimee = context.monthlyRent / 12;
      const tfLabel = `[ESTIM\u00c9] ~${Math.round(tfEstimee * 12).toLocaleString('fr-FR')} \u20ac/an (1 mois de loyer)`;
      const tfEntry = (context.priceInfo || []).find(([l]) => /fonci[e\u00e8]re/i.test(String(l ?? '')));
      if (tfEntry) {
        tfEntry[1] = tfLabel;
      } else {
        context.priceInfo.push(['Taxe Fonci\u00e8re', tfLabel]);
      }
    }

    let chargesCoproEstimees = 0;
    if (
      context.surface > 0 &&
      !this._isMaison(context.features, context.description) &&
      this._isValueMissing(context.priceInfo, 'copropri\u00e9t\u00e9') &&
      this._isValueMissing(context.priceInfo, 'copropriete')
    ) {
      chargesCoproEstimees = (context.surface * 15) / 12;
      context.hypotheses.push(
        `[ESTIM\u00c9] Charges de copropri\u00e9t\u00e9 : 15 \u20ac/m\u00b2/an = ${Math.round(chargesCoproEstimees * 12)} \u20ac/an`,
      );
    }

    const totalChargesMensuelles = context.monthlyCharges + pno + entretien + vacance + tfEstimee + chargesCoproEstimees;
    const fixedMonthly = context.monthlyCharges + pno + entretien + tfEstimee + chargesCoproEstimees;

    return {
      pno, entretien, vacance, vacanceMois, tfEstimee, chargesCoproEstimees, totalChargesMensuelles, fixedMonthly,
      detail: {
        loyer:         Math.round(context.monthlyRent),
        credit:        Math.round(context.monthlyMortgage),
        extraites:     Math.round(context.monthlyCharges),
        pno:           Math.round(pno),
        entretien:     Math.round(entretien),
        vacance:       Math.round(vacance),
        tf_estimee:    Math.round(tfEstimee),
        copro_estimee: Math.round(chargesCoproEstimees),
        total:         Math.round(totalChargesMensuelles),
        frais_notaire: Math.round(context.propertyPrice * this._cfg.fraisNotairePct),
        prix_bien:     context.propertyPrice,
        prix_total:    prixTotal,
        vacance_mois:  vacanceMois,
      }
    };
  }

  /**
   * Calculates break-even thresholds.
   *
   * @param {object} context - Execution context.
   * @param {object} charges - Computed charges.
   * @returns {object} Break-even analysis details.
   */
  _calculateBreakEven(context, charges) {
    let chambresMinBreakEven = null;
    const roomPrice = context.simulations.collocation?.roomPrice ?? 0;
    const maxBedrooms = context.simulations.collocation?.params?.bedrooms ?? context.bedrooms;
    
    if (context.isColoc && roomPrice > 0 && maxBedrooms > 0) {
      const totalFixed = charges.fixedMonthly + context.monthlyMortgage;
      chambresMinBreakEven = Math.min(maxBedrooms, Math.ceil(totalFixed / roomPrice));
      if (chambresMinBreakEven <= 0) chambresMinBreakEven = 1;
    }

    let moisMinClassique = null;
    const classicMonthlyRent = context.simulations.classic?.monthlyRent ?? 0;
    if (classicMonthlyRent > 0) {
      const classicMortgage = context.simulations.classic?.monthlyMortgage ?? context.monthlyMortgage;
      const annualFixed = (charges.fixedMonthly + classicMortgage) * 12;
      moisMinClassique = Number.parseFloat(Math.min(12, annualFixed / classicMonthlyRent).toFixed(1));
    }

    return {
      chambres_min_coloc:   chambresMinBreakEven,
      chambres_total_coloc: context.isColoc ? maxBedrooms : null,
      mois_min_classique:   moisMinClassique,
    };
  }

  /**
   * Computes key performance indicators like gross/net yield and cashflow.
   *
   * @param {object} context - Execution context.
   * @param {object} acquisition - Acquisition details.
   * @param {object} charges - Computed charges.
   * @returns {object} Key performance indicators.
   */
  _computeKPIs(context, acquisition, charges) {
    const loyersAnnuelsBruts = context.monthlyRent * 12;
    const chargesAnnuellesROI = charges.totalChargesMensuelles * 12;

    const rentabiliteBrute = acquisition.prixTotal > 0 ? (loyersAnnuelsBruts / acquisition.prixTotal) * 100 : 0;
    const rentabiliteNette = acquisition.prixTotal > 0 ? ((loyersAnnuelsBruts - chargesAnnuellesROI) / acquisition.prixTotal) * 100 : 0;

    const cashflowMensuel = Math.round(context.monthlyRent - charges.totalChargesMensuelles - context.monthlyMortgage);
    const grm = loyersAnnuelsBruts > 0 ? acquisition.prixTotal / loyersAnnuelsBruts : 0;
    const effortEpargne = Math.max(0, -cashflowMensuel);

    return {
      prix_total_acquisition: acquisition.prixTotal,
      loyers_annuels_bruts:   loyersAnnuelsBruts,
      rentabilite_brute_pct:  Number.parseFloat(rentabiliteBrute.toFixed(2)),
      rentabilite_nette_pct:  Number.parseFloat(rentabiliteNette.toFixed(2)),
      cashflow_mensuel:       cashflowMensuel,
      grm:                    Number.parseFloat(grm.toFixed(1)),
      effort_epargne_mensuel: effortEpargne,
      chargesAnnuellesROI:    chargesAnnuellesROI,
    };
  }

  /**
   * Calculates the depreciation logic specific to the LMNP tax structure.
   *
   * @param {object} context - Execution context.
   * @param {object} acquisition - Acquisition details.
   * @param {object} kpis - Computed KPIs.
   * @param {object} charges - Computed charges.
   * @returns {object} Amortissement details.
   */
  _calculateAmortissementLMNP(context, acquisition, kpis, charges) {
    if (context.structure !== 'LMNP') return { annuel: null, resultatFiscal: null, detail: null, fiscalDetail: null };

    const terrain = context.propertyPrice * this._cfg.terrainPct;
    context.hypotheses.push(
      `[ESTIM\u00c9] Terrain non amortissable : ${(this._cfg.terrainPct * 100).toFixed(0)} % = ${Math.round(terrain)} \u20ac`,
    );

    const v = context.propertyPrice - terrain;
    const aStructure = Math.round(v * 0.6  / 50);
    const aToiture = Math.round(v * 0.1  / 25);
    const aFacade = Math.round(v * 0.05 / 25);
    const aInstallations = Math.round(v * 0.15 / 15);
    const aMobilier = Math.round(v * 0.1  / 7);
    const annuel = aStructure + aToiture + aFacade + aInstallations + aMobilier;

    const moisLoues = 12 - charges.vacanceMois;
    const resultatFiscal = Math.round(context.monthlyRent * moisLoues - kpis.chargesAnnuellesROI - annuel);

    return {
      annuel,
      resultatFiscal,
      detail: {
        prix_bien:     context.propertyPrice,
        terrain:       Math.round(terrain),
        terrain_pct:   this._cfg.terrainPct,
        base:          Math.round(v),
        structure:     aStructure,
        toiture:       aToiture,
        facade:        aFacade,
        installations: aInstallations,
        mobilier:      aMobilier,
        total:         annuel,
      },
      fiscalDetail: {
        loyers_effectifs:  Math.round(context.monthlyRent * moisLoues),
        mois_loues:        moisLoues,
        charges_annuelles: Math.round(kpis.chargesAnnuellesROI),
        amortissement:     annuel,
        resultat:          resultatFiscal,
      }
    };
  }

  /**
   * Generates flags and calculates the continuous score.
   *
   * @param {object} context - Execution context.
   * @param {object} kpis - Computed KPIs.
   * @param {object} amortissement - Amortissement details.
   * @param {object} charges - Computed charges.
   * @returns {object} Final score, signal, reasons, and flags array.
   */
  _evaluateScoreAndFlags(context, kpis, amortissement, charges) {
    const dpe = this._extractDPE(context.energy);
    
    if (kpis.rentabilite_brute_pct < 4) {
      context.flags.push({ type: 'warning', message: `Rentabilit\u00e9 brute faible : ${kpis.rentabilite_brute_pct} % (seuil 4 %)` });
    }
    if (dpe && ['F', 'G'].includes(dpe)) {
      context.flags.push({ type: 'warning', message: `DPE ${dpe} \u2014 risque d'interdiction de location \u00e0 venir` });
    }
    if (!dpe) {
      context.flags.push({ type: 'warning', message: 'DPE non renseign\u00e9 \u2014 co\u00fbt \u00e9nerg\u00e9tique estim\u00e9 en hypoth\u00e8se G (conservateur)' });
    }
    if (kpis.cashflow_mensuel < -500) {
      context.flags.push({ type: 'warning', message: `Effort d'\u00e9pargne \u00e9lev\u00e9 : ${(-kpis.cashflow_mensuel)} \u20ac/m` });
    }
    if (kpis.grm > 20) {
      context.flags.push({ type: 'warning', message: `GRM \u00e9lev\u00e9 : ${kpis.grm}x (> 20 ans pour r\u00e9cup\u00e9rer l'investissement)` });
    }
    if (context.structure === 'LMNP' && kpis.rentabilite_brute_pct > 6) {
      context.flags.push({ type: 'info', message: `Potentiel LMNP : colocation ${context.bedrooms} ch. \u2014 ${kpis.rentabilite_brute_pct} % brut` });
    }
    if (context.structure === 'LMNP' && amortissement.resultatFiscal !== null && amortissement.resultatFiscal < 0) {
      context.flags.push({ type: 'ok', message: `D\u00e9ficit LMNP actif : ${Math.abs(amortissement.resultatFiscal)} \u20ac/an \u2014 imp\u00f4t foncier = 0 \u20ac` });
    }
    if (kpis.rentabilite_nette_pct > 4 && kpis.cashflow_mensuel > 0) {
      context.flags.push({ type: 'ok', message: 'Rentabilit\u00e9 nette > 4 % et cashflow positif' });
    }

    const estimatedCount = context.hypotheses.filter(h => h.startsWith('[ESTIM\u00c9]')).length;
    if (estimatedCount > 3) {
      context.flags.push({ type: 'info', message: `${estimatedCount} hypoth\u00e8ses estim\u00e9es \u2014 fiabilit\u00e9 r\u00e9duite` });
    }

    const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
    let score = 0;

    const rn = kpis.rentabilite_nette_pct;
    if (rn >= 7) score += 6;
    else if (rn >= 5) score += lerp(5, 6, (rn - 5) / 2);
    else if (rn >= 4) score += lerp(3.5, 5, rn - 4);
    else if (rn >= 3) score += lerp(2.5, 3.5, rn - 3);
    else if (rn >= 2) score += lerp(1.5, 2.5, rn - 2);
    else if (rn >= 1) score += lerp(0.5, 1.5, rn - 1);
    else score += lerp(0, 0.5, rn);

    const cf = kpis.cashflow_mensuel;
    if (cf >= 500) score += 2;
    else if (cf >= 200) score += lerp(1.4, 2, (cf - 200) / 300);
    else if (cf >= 0) score += lerp(0.8, 1.4, cf / 200);
    else if (cf >= -300) score += lerp(0.3, 0.8, (cf + 300) / 300);
    else if (cf >= -700) score += lerp(0, 0.3, (cf + 700) / 400);

    const grm = kpis.grm;
    if (grm <= 10) score += 1;
    else if (grm <= 20) score += lerp(0.05, 1, (20 - grm) / 10);

    if (!dpe) score -= 0.2;
    else if (dpe === 'G') score -= 0.8;
    else if (dpe === 'F') score -= 0.4;
    else if (dpe === 'E') score -= 0.15;

    // We can infer missingData from context hypotheses. 
    // If tfEstimee was > 0, we added an hypothesis.
    const missingData = (charges?.tfEstimee > 0 ? 1 : 0) + (charges?.chargesCoproEstimees > 0 ? 1 : 0);
    if (missingData === 0) score += 0.3;
    else if (missingData === 1) score -= 0.1;
    else score -= 0.3;

    score = Number.parseFloat(Math.min(10, Math.max(0, score)).toFixed(1));

    let signal;
    if (score >= 7) signal = 'GO';
    else if (score >= 4) signal = 'ATTENTION';
    else signal = 'STOP';

    const raisons = [
      `Rentabilit\u00e9 nette ${rn} %`,
      `Cashflow ${cf >= 0 ? '+' : ''}${cf} \u20ac/m`,
    ];
    if (dpe && ['F', 'G'].includes(dpe)) raisons.push(`DPE ${dpe} \u2014 risque r\u00e9glementaire`);
    if (grm > 20) raisons.push(`GRM ${grm}x`);

    return { flags: context.flags, verdict: { signal, score, raisons } };
  }

  /**
   * Helper method to determine if a value is missing from the extracted info.
   *
   * @param {Array} priceInfo - The extracted price information.
   * @param {string} labelSubstring - The substring to search for.
   * @returns {boolean} True if the value is missing or invalid.
   */
  _isValueMissing(priceInfo, labelSubstring) {
    const entry = (priceInfo || []).find(([l]) =>
      l?.toLowerCase().includes(labelSubstring.toLowerCase()),
    );
    if (!entry) return true;
    const [, val] = entry;
    return !val || /non renseign\u00e9/i.test(String(val)) || !/\d/.test(String(val));
  }

  /**
   * Identifies if a property is likely a house based on its features and description.
   *
   * @param {Array} features - Array of property features.
   * @param {string} description - The property description text.
   * @returns {boolean} True if the property is a house.
   */
  _isMaison(features, description) {
    const text = [...(features || []), description || ''].join(' ').toLowerCase();
    return /\bmaison\b|\bvilla\b|\bpavillon\b/.test(text);
  }

  /**
   * Extracts the energy rating (DPE) from the provided energy array.
   *
   * @param {Array} energy - Array representing energy details.
   * @returns {string|null} The DPE rating or null if missing.
   */
  _extractDPE(energy) {
    if (!Array.isArray(energy)) return null;
    for (const [label, value] of energy) {
      const val = String(value ?? '').trim().toUpperCase();
      if (/^[A-G]$/.test(val)) return val;
      if (label && /dpe|consommation|\u00e9nergetique|bilan|classe/i.test(String(label))) {
        const m = /\b([A-G])\b/i.exec(String(value ?? ''));
        if (m) return m[1].toUpperCase();
      }
    }
    return null;
  }
}

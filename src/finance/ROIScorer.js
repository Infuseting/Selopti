import { ROI_DEFAULTS } from '../config.js';

/**
 * ROIScorer
 *
 * Computes a rapid ROI score for a real-estate property based on available
 * data.  Missing inputs are estimated with conservative assumptions tagged
 * [ESTIMÉ].
 *
 * Output schema:
 *   { structure_detectee, kpis, amortissement_annuel_estime,
 *     resultat_fiscal_estime, hypotheses, flags, verdict }
 */
export class ROIScorer {
  /**
   * @param {import('../config.js').ROI_DEFAULTS} [roiConfig]
   *   Normalized ROI hypothesis config injected by the engine.
   *   Falls back to ROI_DEFAULTS when omitted.
   */
  constructor(roiConfig = {}) {
    this._cfg = {
      fraisNotairePct:    roiConfig.fraisNotairePct    ?? ROI_DEFAULTS.fraisNotairePct,
      pnoAnnualPct:       roiConfig.pnoAnnualPct       ?? ROI_DEFAULTS.pnoAnnualPct,
      entretienAnnualPct: roiConfig.entretienAnnualPct ?? ROI_DEFAULTS.entretienAnnualPct,
      vacanceClassiqueMois: roiConfig.vacanceClassiqueMois ?? ROI_DEFAULTS.vacanceClassiqueMois,
      vacanceColocMois:     roiConfig.vacanceColocMois     ?? ROI_DEFAULTS.vacanceColocMois,
      tmi:        roiConfig.tmi        ?? ROI_DEFAULTS.tmi,
      terrainPct: roiConfig.terrainPct ?? ROI_DEFAULTS.terrainPct,
    };
  }

  /**
   * @param {object}  params
   * @param {number}  params.propertyPrice
   * @param {number}  params.surface
   * @param {number}  params.bedrooms
   * @param {number}  params.monthlyCharges  - already-parsed owner charges
   * @param {object}  params.simulations     - FinancialSimulator output
   * @param {Array}   params.priceInfo       - [[label, value], ...]
   * @param {Array}   params.energy          - [[label, value], ...]
   * @param {Array}   params.features
   * @param {string}  params.description
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
    const cfg        = this._cfg;
    const hypotheses = [];
    const flags      = [];

    // -- Structure detection ------------------------------------------------
    const isColoc   = bedrooms >= 2;
    const structure = isColoc ? 'LMNP' : 'Location nue';

    // -- Pick best available scenario ---------------------------------------
    const scenario        = (isColoc && simulations.collocation)
      ? simulations.collocation
      : (simulations.classic || {});
    const monthlyRent     = scenario.monthlyRent     ?? 0;
    const monthlyMortgage = scenario.monthlyMortgage ?? 0;

    // -- Prix total d'acquisition ------------------------------------------
    const fraisNotaire = Math.round(propertyPrice * cfg.fraisNotairePct);
    const prixTotal    = propertyPrice + fraisNotaire;
    hypotheses.push(
      `[ESTIM\u00c9] Frais de notaire : ${(cfg.fraisNotairePct * 100).toFixed(0)} % = ${fraisNotaire} \u20ac`,
    );

    // -- Additional estimated charges --------------------------------------
    const pno       = (propertyPrice * cfg.pnoAnnualPct) / 12;
    const entretien = (propertyPrice * cfg.entretienAnnualPct) / 12;

    // Vacancy: different rate for coloc vs classic
    const vacanceMois = isColoc ? cfg.vacanceColocMois : cfg.vacanceClassiqueMois;
    const vacance     = (monthlyRent * vacanceMois) / 12;
    const vacancePct  = ((vacanceMois / 12) * 100).toFixed(1);

    hypotheses.push(
      `[ESTIM\u00c9] Assurance PNO : ${(cfg.pnoAnnualPct * 100).toFixed(1)} %/an = ${Math.round(pno * 12)} \u20ac/an`,
      `[ESTIM\u00c9] Entretien/travaux : ${(cfg.entretienAnnualPct * 100).toFixed(1)} %/an = ${Math.round(entretien * 12)} \u20ac/an`,
      `[ESTIM\u00c9] Vacance locative (${isColoc ? 'coloc' : 'classique'}) : ${vacanceMois} mois/an (${vacancePct} %)`,
    );

    // Taxe fonciere -- estimate if not extracted
    let tfEstimee = 0;
    if (
      this._isValueMissing(priceInfo, 'fonci\u00e8re') &&
      this._isValueMissing(priceInfo, 'fonciere')
    ) {
      tfEstimee = monthlyRent / 12;
      const tfLabel = `[ESTIM\u00c9] ~${Math.round(tfEstimee * 12).toLocaleString('fr-FR')} \u20ac/an (1 mois de loyer)`;
      const tfEntry = (priceInfo || []).find(([l]) => /fonci[e\u00e8]re/i.test(String(l ?? '')));
      if (tfEntry) {
        tfEntry[1] = tfLabel;
      } else {
        priceInfo.push(['Taxe Fonci\u00e8re', tfLabel]);
      }
    }

    // Charges copropriete -- estimate if apartment and not extracted
    let chargesCoproEstimees = 0;
    if (
      surface > 0 &&
      !this._isMaison(features, description) &&
      this._isValueMissing(priceInfo, 'copropri\u00e9t\u00e9') &&
      this._isValueMissing(priceInfo, 'copropriete')
    ) {
      chargesCoproEstimees = (surface * 15) / 12;
      hypotheses.push(
        `[ESTIM\u00c9] Charges de copropri\u00e9t\u00e9 : 15 \u20ac/m\u00b2/an = ${Math.round(chargesCoproEstimees * 12)} \u20ac/an`,
      );
    }

    const totalChargesMensuelles =
      monthlyCharges + pno + entretien + vacance + tfEstimee + chargesCoproEstimees;

    // -- Break-even analysis -----------------------------------------------
    // fixedMonthly = all recurring costs that don't depend on occupancy
    // (excludes vacancy since we're computing from occupancy)
    const fixedMonthly = monthlyCharges + pno + entretien + tfEstimee + chargesCoproEstimees;

    // Minimum rooms to rent in colocation to break even (cover all costs)
    let chambresMinBreakEven = null;
    const roomPrice     = simulations.collocation?.roomPrice ?? 0;
    const maxBedrooms   = simulations.collocation?.params?.bedrooms ?? bedrooms;
    if (isColoc && roomPrice > 0 && maxBedrooms > 0) {
      const totalFixed = fixedMonthly + monthlyMortgage;
      chambresMinBreakEven = Math.min(maxBedrooms, Math.ceil(totalFixed / roomPrice));
      if (chambresMinBreakEven <= 0) chambresMinBreakEven = 1;
    }

    // Minimum months to rent per year in classic rental to break even
    let moisMinClassique = null;
    const classicMonthlyRent = simulations.classic?.monthlyRent ?? 0;
    if (classicMonthlyRent > 0) {
      const classicMortgage = simulations.classic?.monthlyMortgage ?? monthlyMortgage;
      const annualFixed = (fixedMonthly + classicMortgage) * 12;
      moisMinClassique = Number.parseFloat(Math.min(12, annualFixed / classicMonthlyRent).toFixed(1));
    }

    // -- KPIs ---------------------------------------------------------------
    const loyersAnnuelsBruts  = monthlyRent * 12;
    const chargesAnnuellesROI = totalChargesMensuelles * 12;

    const rentabiliteBrute = prixTotal > 0
      ? (loyersAnnuelsBruts / prixTotal) * 100
      : 0;
    const rentabiliteNette = prixTotal > 0
      ? ((loyersAnnuelsBruts - chargesAnnuellesROI) / prixTotal) * 100
      : 0;

    const cashflowMensuel = Math.round(monthlyRent - totalChargesMensuelles - monthlyMortgage);
    const grm             = loyersAnnuelsBruts > 0 ? prixTotal / loyersAnnuelsBruts : 0;
    const effortEpargne   = Math.max(0, -cashflowMensuel);

    // -- Charges detail (exposed for UI tooltips) --------------------------
    const chargesDetail = {
      loyer:         Math.round(monthlyRent),
      credit:        Math.round(monthlyMortgage),
      extraites:     Math.round(monthlyCharges),
      pno:           Math.round(pno),
      entretien:     Math.round(entretien),
      vacance:       Math.round(vacance),
      tf_estimee:    Math.round(tfEstimee),
      copro_estimee: Math.round(chargesCoproEstimees),
      total:         Math.round(totalChargesMensuelles),
      frais_notaire: fraisNotaire,
      prix_bien:     propertyPrice,
      prix_total:    prixTotal,
      vacance_mois:  vacanceMois,
    };

    // -- Amortissement LMNP (decomposition par composants) -----------------
    let amortissementAnnuel = null;
    let resultatFiscal      = null;
    let amortDetail         = null;
    let fiscalDetail        = null;
    let terrain             = 0;

    if (structure === 'LMNP') {
      terrain = propertyPrice * cfg.terrainPct;
      hypotheses.push(
        `[ESTIM\u00c9] Terrain non amortissable : ${(cfg.terrainPct * 100).toFixed(0)} % = ${Math.round(terrain)} \u20ac`,
      );
      const v              = propertyPrice - terrain;
      const aStructure     = Math.round(v * 0.6  / 50);
      const aToiture       = Math.round(v * 0.1  / 25);
      const aFacade        = Math.round(v * 0.05 / 25);
      const aInstallations = Math.round(v * 0.15 / 15);
      const aMobilier      = Math.round(v * 0.1  / 7);
      amortissementAnnuel  = aStructure + aToiture + aFacade + aInstallations + aMobilier;
      amortDetail = {
        prix_bien:     propertyPrice,
        terrain:       Math.round(terrain),
        terrain_pct:   cfg.terrainPct,
        base:          Math.round(v),
        structure:     aStructure,
        toiture:       aToiture,
        facade:        aFacade,
        installations: aInstallations,
        mobilier:      aMobilier,
        total:         amortissementAnnuel,
      };
      // Loyers effectifs = (12 - vacanceMois) mois
      const moisLoues = 12 - vacanceMois;
      resultatFiscal  = Math.round(
        monthlyRent * moisLoues - chargesAnnuellesROI - amortissementAnnuel,
      );
      fiscalDetail = {
        loyers_effectifs:  Math.round(monthlyRent * moisLoues),
        mois_loues:        moisLoues,
        charges_annuelles: Math.round(chargesAnnuellesROI),
        amortissement:     amortissementAnnuel,
        resultat:          resultatFiscal,
      };
    }

    // -- Flags --------------------------------------------------------------
    const dpe = this._extractDPE(energy);

    if (rentabiliteBrute < 4) {
      flags.push({
        type: 'warning',
        message: `Rentabilit\u00e9 brute faible : ${rentabiliteBrute.toFixed(1)} % (seuil 4 %)`,
      });
    }
    if (dpe && ['F', 'G'].includes(dpe)) {
      flags.push({
        type: 'warning',
        message: `DPE ${dpe} \u2014 risque d'interdiction de location \u00e0 venir`,
      });
    }
    if (!dpe) {
      flags.push({
        type: 'warning',
        message: 'DPE non renseign\u00e9 \u2014 co\u00fbt \u00e9nerg\u00e9tique estim\u00e9 en hypoth\u00e8se G (conservateur)',
      });
    }
    if (cashflowMensuel < -500) {
      flags.push({
        type: 'warning',
        message: `Effort d'\u00e9pargne \u00e9lev\u00e9 : ${(-cashflowMensuel)} \u20ac/m`,
      });
    }
    if (grm > 20) {
      flags.push({
        type: 'warning',
        message: `GRM \u00e9lev\u00e9 : ${grm.toFixed(1)}x (> 20 ans pour r\u00e9cup\u00e9rer l'investissement)`,
      });
    }
    if (structure === 'LMNP' && rentabiliteBrute > 6) {
      flags.push({
        type: 'info',
        message: `Potentiel LMNP : colocation ${bedrooms} ch. \u2014 ${rentabiliteBrute.toFixed(1)} % brut`,
      });
    }
    if (structure === 'LMNP' && resultatFiscal !== null && resultatFiscal < 0) {
      flags.push({
        type: 'ok',
        message: `D\u00e9ficit LMNP actif : ${Math.abs(resultatFiscal)} \u20ac/an \u2014 imp\u00f4t foncier = 0 \u20ac`,
      });
    }
    if (rentabiliteNette > 4 && cashflowMensuel > 0) {
      flags.push({ type: 'ok', message: 'Rentabilit\u00e9 nette > 4 % et cashflow positif' });
    }

    const estimatedCount = hypotheses.filter(h => h.startsWith('[ESTIM\u00c9]')).length;
    if (estimatedCount > 3) {
      flags.push({
        type: 'info',
        message: `${estimatedCount} hypoth\u00e8ses estim\u00e9es \u2014 fiabilit\u00e9 r\u00e9duite`,
      });
    }

    // -- Score /10 (continuous model) ----------------------------------------
    const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
    let score = 0;

    // 1. Rentabilité nette (0–6 pts, interpolation linéaire par paliers)
    if      (rentabiliteNette >= 7) score += 6;
    else if (rentabiliteNette >= 5) score += lerp(5,   6,   (rentabiliteNette - 5) / 2);
    else if (rentabiliteNette >= 4) score += lerp(3.5, 5,    rentabiliteNette - 4);
    else if (rentabiliteNette >= 3) score += lerp(2.5, 3.5,  rentabiliteNette - 3);
    else if (rentabiliteNette >= 2) score += lerp(1.5, 2.5,  rentabiliteNette - 2);
    else if (rentabiliteNette >= 1) score += lerp(0.5, 1.5,  rentabiliteNette - 1);
    else                            score += lerp(0,   0.5,  rentabiliteNette);

    // 2. Cashflow mensuel (0–2 pts, interpolation linéaire)
    if      (cashflowMensuel >= 500)  score += 2;
    else if (cashflowMensuel >= 200)  score += lerp(1.4, 2,   (cashflowMensuel - 200) / 300);
    else if (cashflowMensuel >= 0)    score += lerp(0.8, 1.4,  cashflowMensuel / 200);
    else if (cashflowMensuel >= -300) score += lerp(0.3, 0.8, (cashflowMensuel + 300) / 300);
    else if (cashflowMensuel >= -700) score += lerp(0,   0.3, (cashflowMensuel + 700) / 400);

    // 3. GRM (0–1 pt, continu : plus court = mieux)
    if      (grm <= 10) score += 1;
    else if (grm <= 20) score += lerp(0.05, 1, (20 - grm) / 10);

    // 4. DPE — malus (0 à −0.8 pt)
    if      (!dpe)          score -= 0.2;
    else if (dpe === 'G')   score -= 0.8;
    else if (dpe === 'F')   score -= 0.4;
    else if (dpe === 'E')   score -= 0.15;

    // 5. Données manquantes (−0.3 à +0.3 pt)
    const missingData = (tfEstimee > 0 ? 1 : 0) + (chargesCoproEstimees > 0 ? 1 : 0);
    if      (missingData === 0) score += 0.3;
    else if (missingData === 1) score -= 0.1;
    else                        score -= 0.3;

    score = Number.parseFloat(Math.min(10, Math.max(0, score)).toFixed(1));

    let signal;
    if      (score >= 7) signal = 'GO';
    else if (score >= 4) signal = 'ATTENTION';
    else                 signal = 'STOP';

    const raisons = [
      `Rentabilit\u00e9 nette ${rentabiliteNette.toFixed(1)} %`,
      `Cashflow ${cashflowMensuel >= 0 ? '+' : ''}${cashflowMensuel} \u20ac/m`,
    ];
    if (dpe && ['F', 'G'].includes(dpe)) raisons.push(`DPE ${dpe} \u2014 risque r\u00e9glementaire`);
    if (grm > 20) raisons.push(`GRM ${grm.toFixed(1)}x`);

    return {
      structure_detectee: structure,
      kpis: {
        prix_total_acquisition: prixTotal,
        loyers_annuels_bruts:   loyersAnnuelsBruts,
        rentabilite_brute_pct:  Number.parseFloat(rentabiliteBrute.toFixed(2)),
        rentabilite_nette_pct:  Number.parseFloat(rentabiliteNette.toFixed(2)),
        cashflow_mensuel:       cashflowMensuel,
        grm:                    Number.parseFloat(grm.toFixed(1)),
        effort_epargne_mensuel: effortEpargne,
      },
      amortissement_annuel_estime: amortissementAnnuel,
      resultat_fiscal_estime:      resultatFiscal,
      break_even: {
        chambres_min_coloc:   chambresMinBreakEven,
        chambres_total_coloc: isColoc ? maxBedrooms : null,
        mois_min_classique:   moisMinClassique,
      },
      charges_detail: chargesDetail,
      amort_detail:   amortDetail,
      fiscal_detail:  fiscalDetail,
      hypotheses,
      flags,
      verdict: { signal, score, raisons },
    };
  }

  // -- Private helpers -------------------------------------------------------

  _isValueMissing(priceInfo, labelSubstring) {
    const entry = (priceInfo || []).find(([l]) =>
      l?.toLowerCase().includes(labelSubstring.toLowerCase()),
    );
    if (!entry) return true;
    const [, val] = entry;
    return !val || /non renseign\u00e9/i.test(String(val)) || !/\d/.test(String(val));
  }

  _isMaison(features, description) {
    const text = [...(features || []), description || ''].join(' ').toLowerCase();
    return /\bmaison\b|\bvilla\b|\bpavillon\b/.test(text);
  }

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

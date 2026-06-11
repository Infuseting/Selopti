export function getPrix(object) {
  const label = object?.app_cldp?.data?.classified?.sections?.price?.base?.main?.value?.main?.ariaLabel;
  if (!label) return 0;
  return Number(label.replace(/\D/g, ''));
}

// ── DPE energy consumption table (kWh EP/m²/year, ADEME midpoints) ────────
const DPE_KWH_M2 = { A: 50, B: 90, C: 150, D: 230, E: 300, F: 380, G: 500 };
// Weighted average primary energy price in France (€/kWh EP), 2024
const ENERGY_PRICE = 0.17;

/** Returns the DPE letter (A–G) found in an energy array, or null. */
function dpeClassFromEnergy(energy) {
  for (const [, val] of energy) {
    if (/^[A-G]$/i.test(String(val ?? '').trim())) {
      return String(val).trim().toUpperCase();
    }
  }
  return null;
}

export function getPriceInfo(object) {
  const result = [];
  const data = object?.app_cldp?.data?.classified?.sections?.price?.components;
  data?.forEach((component) => {
    if (component.type != "SECONDARY") return result;
    component?.units?.[0]?.details?.[0]?.prices?.forEach((price) => {
      result.push([
        price?.label?.main,
        price?.value?.main?.value?.replaceAll(" ", "") ?? ""
      ])
    })
  })
  return result;
}

export function getPriceRegion(object) {
  const result = [];
  const data = object?.app_cldp?.data?.classified?.sections?.priceComparison;
  result.push([
    data?.pricePerSqm?.replaceAll(" ", "") ?? "",
    data?.data?.low?.replaceAll(" ", "") ?? "",
    data?.data?.high?.replaceAll(" ", "") ?? ""
  ])
  return result;
}

export function getFeatures(object) {
  const result = [];
  const data = object?.app_cldp?.data?.classified?.sections
  data?.hardFacts?.facts?.forEach((element) => {
    result.push(element?.value)
  })
  data?.features?.preview?.forEach((element) => {
    result.push(element?.value)
  })
  data?.features?.details?.categories?.forEach((category) => {
    category?.elements?.forEach((element) => {
      result.push(element?.value)
    })
  })

  return [...new Set(result)];
}

export function getEnergy(object) {
  const result = [];
  const data = object?.app_cldp?.data?.classified?.sections?.energy;
  data?.features?.forEach((element) => {
    result.push(
      [
        element?.label,
        element?.value
      ]
    )
  })
  const certificates = data?.certificates?.[0];
  certificates?.features?.forEach((element) => {
    if (["minMaxEstimation", "nameOfCertificate"].includes(element?.type)) {
      result.push([
        element?.label,
        element?.value
      ])
    }

  });
  certificates?.scales?.forEach((element) => {
    result.push([
      element?.name,
      element?.efficiencyClass?.rating ?? "Non défini",

    ])
  })

  // Fallback: extract DPE class from description if not already present
  const hasDpeClass = result.some(([, v]) => /^[A-G]$/i.test(String(v ?? '').trim()));
  if (!hasDpeClass) {
    const description = getDescription(object);
    const dpeRe = /(?:dpe|classe\s+énergie|étiquette\s+énergie)\s*[:\-–]?\s*([A-G])\b/i;
    const m = dpeRe.exec(description);
    if (m) {
      // Remove any 'Non défini' DPE entry before adding the real class
      for (let i = result.length - 1; i >= 0; i--) {
        const [lbl, val] = result[i];
        if (/dpe|diagnostic.*énerget/i.test(String(lbl ?? '')) &&
            /non\s*(?:défini|renseigné)/i.test(String(val ?? ''))) {
          result.splice(i, 1);
        }
      }
      result.push(['Diagnostic de performance énergétique (DPE)', m[1].toUpperCase()]);
    }
  }

  return result;
}

export function getDescription(object) {
  const data = object?.app_cldp?.data?.classified?.sections?.description?.description;
  return data?.replaceAll('\n', String.raw`\n`) ?? '';
}

export function getTimeMetadata(object) {
  const data = object?.app_cldp?.data?.classified?.metadata;
  return [
    ['Date de création', data?.creationDate],
    ['Date de mise à jour', data?.updateDate],
  ];
}

export function getEncadrementLoyers(_object) {
  // Rent-control lookup not yet implemented.
  return null;
}

export function getBasicStats(object) {
  const tracking = object?.app_cldp?.data?.classified?.advertising?.tracking_config;
  const location = object?.app_cldp?.data?.classified?.sections?.location?.address;
  return {
    price: tracking?.prix ?? 0,
    bedrooms: tracking?.nb_chambres ?? 0,
    surface: tracking?.surface ?? 0,
    zipCode: tracking?.cp ?? location?.zipCode ?? ""
  };
}
export function getFallbackPriceInfo(object, priceInfo, surface = 0, energy = []) {
  const description  = getDescription(object);
  const taxEstimate  = object?.app_cldp?.data?.classified?.sections?.taxEstimate;
  const priceLabels  = new Set(priceInfo.map(([label]) => label));

  const pushOrKeep = (label, value) => {
    if (!priceLabels.has(label)) {
      priceInfo.push([label, value]);
      priceLabels.add(label);
    }
  };

  // Normalise French number string → float ("2 145,50" → 2145.5)
  const parseAmount = (raw) =>
    Number.parseFloat(raw.replace(/\s/g, '').replace(/\.(\d{3})(?!\d)/g, '$1').replace(',', '.'));

  // ── Charges de copropriété ───────────────────────────────────────────────
  if (!priceLabels.has('Charges de copropriété')) {
    let extracted = null;

    const try1 = /charges[^€\n]{0,40}annuelles?[^€\d\n]{0,20}(\d[\d\s.,]*)\s*(?:€|euros)/i.exec(description);
    const try2 = /charges[^€\n]{0,40}mensuelles?[^€\d\n]{0,20}(\d[\d\s.,]*)\s*(?:€|euros)/i.exec(description);
    const try3 = /charges[^€\n]{0,40}trimestrielles?[^€\d\n]{0,20}(\d[\d\s.,]*)\s*(?:€|euros)/i.exec(description);
    const try4 = /\+\s*(\d[\d\s.,]*)\s*(?:€|euros)\s*(?:de\s*)?charges/i.exec(description);
    const try5 = /charges\s+(?:de\s+copropri[eé]t[eé]\s*)?[-:–]\s*(\d[\d\s.,]*)\s*(?:€|euros)/i.exec(description);

    if (try1)      extracted = `${try1[1].trim()} €/an`;
    else if (try2) extracted = `${try2[1].trim()} €/mois`;
    else if (try3) extracted = `${try3[1].trim()} €/trimestre`;
    else if (try4) extracted = `${try4[1].trim()} €/mois`;
    else if (try5) extracted = `${try5[1].trim()} €/an`;
    else {
      // "loyer X € hors charges … Y € charges comprises" → derive
      const hcM = /loyer.{0,80}?(\d[\d\s.,]*)\s*(?:€|euros).{0,80}?hors\s*charges.{0,80}?(\d[\d\s.,]*)\s*(?:€|euros)/i.exec(description);
      if (hcM) {
        const diff = parseAmount(hcM[2]) - parseAmount(hcM[1]);
        if (diff > 0) extracted = `${diff.toFixed(0)} €/mois`;
      }
    }

    pushOrKeep('Charges de copropriété', extracted ?? 'Non renseigné');
  }

  // ── Estimation de la facture énergétique ─────────────────────────────────
  if (!priceLabels.has('Estimation de la facture énergétique')) {
    let extracted = null;
    // Try parsing from description first ("entre X et Y €")
    const m1 = /entre\s+(\d[\d\s.,]*)\s*(?:€|euros)?\s*(?:et|à)\s+(\d[\d\s.,]*)\s*(?:€|euros)/i.exec(description);
    if (m1) {
      extracted = `entre ${m1[1].trim()} et ${m1[2].trim()} €/an`;
    } else if (surface > 0) {
      // Fallback: estimate from DPE × surface, default to G (conservative) if DPE unknown
      const dpeReal = dpeClassFromEnergy(energy);
      const dpe     = dpeReal ?? 'G';
      const kwhM2   = DPE_KWH_M2[dpe] ?? DPE_KWH_M2.G;
      const cost    = Math.round((surface * kwhM2 * ENERGY_PRICE) / 100) * 100;
      const note    = dpeReal ? `DPE ${dpe}` : 'DPE inconnu → hypothèse G';
      extracted = `[ESTIMÉ] ~${cost.toLocaleString('fr-FR')} €/an (${note}, ${surface} m²)`;
    }
    pushOrKeep('Estimation de la facture énergétique', extracted ?? 'Non renseigné');
  }

  // ── Taxe Foncière ─────────────────────────────────────────────────────────
  if (!priceLabels.has('Taxe Foncière')) {
    let extracted = null;
    // "taxe foncière : 1 200 €" / "taxe foncière de 1200 €"
    const tfM = /taxe\s+fonci[eè]re[^€\d\n]{0,30}(\d[\d\s.,]*)\s*(?:€|euros)/i.exec(description);
    if (tfM) {
      extracted = `${tfM[1].trim()} €/an`;
    } else if (taxEstimate?.estimatedTaxeFonciereMin != null && taxEstimate?.estimatedTaxeFonciereMax != null) {
      const min = Math.round(taxEstimate.estimatedTaxeFonciereMin);
      const max = Math.round(taxEstimate.estimatedTaxeFonciereMax);
      extracted = `entre ${min} et ${max} €/an`;
    }
    pushOrKeep('Taxe Foncière', extracted ?? 'Non renseigné');
  }

  return priceInfo;
}

export function getData(object) {
  const { surface } = getBasicStats(object);
  const energy      = getEnergy(object);
  let priceInfo     = getPriceInfo(object);
  priceInfo         = getFallbackPriceInfo(object, priceInfo, surface, energy);
  return {
    price: getPrix(object),
    priceInfo,
    priceRegion: getPriceRegion(object),
    features: getFeatures(object),
    energy,
    description: getDescription(object),
    timeMetadata: getTimeMetadata(object),
  };
}
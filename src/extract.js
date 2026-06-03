export function getPrix(object) {
  return object?.app_cldp?.data?.classified?.sections?.price?.base?.main?.value?.main?.ariaLabel.split(" ")[0];
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
  const result = []
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
  return result;
}

export function getDescription(object) {
  const data = object?.app_cldp?.data?.classified?.sections?.description?.description;
  return data?.replaceAll("\n", "\\n") ?? "";
}

export function getTimeMetadata(object) {
  let result = []
  const data = object?.app_cldp?.data?.classified?.metadata
  result.push(["Date de création", data?.creationDate])
  result.push(["Date de mise à jour", data?.updateDate])
  return result;
}

export function getEncadrementLoyers(object) {
  const result = [];
  const data = object?.app_cldp?.data?.classified?.sections?.location;
  const city = data?.adress?.city;
  const postalCode = data?.adress?.zipCode;
  const neighborhood = data?.adress?.district;
  return "NON IMPLEMENTE VOUS DEVEZ VERIFIER VOUS-MEME";
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
export function getFallbackPriceInfo(object, priceInfo) {
  let priceLabels = priceInfo.map(([label, value]) => label);
  let description = getDescription(object);
  const taxEstimate = object?.app_cldp?.data?.classified?.sections?.taxEstimate;
  if (!priceLabels.includes("Charges de copropriété")) {
    let extractedCharges = null;
    let m = description.match(/charges\s+(?:.{0,50}?)annuelles(?:.{0,100}?)?(?:[:\s]|sont\s+de\s+)+([\d\s.,]+)\s*(?:€|euros)/i);
    if (m) extractedCharges = `${m[1].trim()} €/an`;
    else {
      m = description.match(/charges\s+(?:.{0,50}?)mensuelles(?:.{0,100}?)?(?:[:\s]|sont\s+de\s+)+([\d\s.,]+)\s*(?:€|euros)/i);
      if (m) extractedCharges = `${m[1].trim()} €/mois`;
      else {
        m = description.match(/(?:charges.{0,50}?vendeur.*?|charges.{0,50}?s'élèvent.*?)([\d\s.,]+)\s*(?:€|euros)\s*par\s+(mois|an|trimestre)/i);
        if (m) extractedCharges = `${m[1].trim()} €/${m[2]}`;
        else {
          m = description.match(/\+\s*([\d\s.,]+)\s*(?:€|euros)\s*(?:de\s*)?charges/i);
          if (m) extractedCharges = `${m[1].trim()} €/mois`;
          else {
            m = description.match(/loyer.{0,50}?([\d\s.,]+)\s*(?:€|euros).{0,50}?hors\s*charges.{0,50}?([\d\s.,]+)\s*(?:€|euros).{0,50}?charges\s*comprises/i);
            if (m) {
              const rent = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
              const cc = parseFloat(m[2].replace(/\s/g, '').replace(',', '.'));
              extractedCharges = `${(cc - rent).toFixed(2).replace('.', ',')} €/mois`;
            } else {
              m = description.match(/charges\s*(?:de\s+copropriété\s*)?[:\-]\s*([\d\s.,]+)\s*(?:€|euros)/i);
              if (m) extractedCharges = `${m[1].trim()} €/an`;
            }
          }
        }
      }
    }

    if (extractedCharges) {
      priceInfo.push([
        "Charges de copropriété",
        extractedCharges
      ]);
    }
  }

  if (!priceLabels.includes("Estimation de la facture énergétique")) {
    let m = description.match(/entre\s+([\d\s.,]+)\s*(?:€|euros)?\s*et\s+([\d\s.,]+)\s*(?:€|euros)/i);
    if (m) {
      priceInfo.push([
        "Estimation de la facture énergétique",
        `entre ${m[1].trim()} et ${m[2].trim()} €/an`
      ]);
    }
  }

  if (!priceLabels.includes("Taxe Foncière")) {
    let m = description.match(/taxe\s+fonci[eè]re(?:.*?)?[:\s]+([\d\s.,]+)\s*(?:€|euros)/i);
    if (m) {
      priceInfo.push(["Taxe Foncière", `${m[1].trim()} €/an`]);
    } else if (taxEstimate?.estimatedTaxeFonciereMin != null && taxEstimate?.estimatedTaxeFonciereMax != null) {
      const min = Math.round(taxEstimate.estimatedTaxeFonciereMin);
      const max = Math.round(taxEstimate.estimatedTaxeFonciereMax);
      priceInfo.push(["Taxe Foncière", `entre ${min} et ${max} €/an`]);
    }
  }
  return priceInfo
}

export function getData(object) {
  let priceInfo = getPriceInfo(object)
  priceInfo = getFallbackPriceInfo(object, priceInfo)
  return {
    price: getPrix(object),
    priceInfo: priceInfo,
    priceRegion: getPriceRegion(object),
    features: getFeatures(object),
    energy: getEnergy(object),
    description: getDescription(object),
    timeMetadata: getTimeMetadata(object),
    encadrementLoyers: getEncadrementLoyers(object)
  }
}
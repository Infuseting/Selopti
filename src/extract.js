export function getPriceInfo(object) {
  const result = [];
  const data = object?.app_cldp?.data?.classified?.sections?.price?.components;
  data.forEach((component) => {
    if (component.type != "SECONDARY") return result;
    component?.units[0]?.details[0]?.prices?.forEach((price) => {
      result.push([
        price?.label?.main,
        price?.value?.main?.value.replaceAll(" ", "")
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
  return data.replaceAll("\n", "\\n");

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

export function getData(object) {
  return {
    priceInfo: getPriceInfo(object),
    priceRegion: getPriceRegion(object),
    features: getFeatures(object),
    energy: getEnergy(object),
    description: getDescription(object),
    timeMetadata: getTimeMetadata(object),
    encadrementLoyers: getEncadrementLoyers(object)
  }
}
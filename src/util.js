export async function fetchUrl(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return {
        success: "false",
        error: [`Request failed with status ${response.status}`],
      };
    }

    const text = await response.text();
    return {
      success: "true",
      data: [{
        url,
        status: response.status,
        text,
      }],
    };
  } catch (err) {
    return {
      success: "false",
      error: [err instanceof Error ? err.message : String(err)],
    };
  }
}

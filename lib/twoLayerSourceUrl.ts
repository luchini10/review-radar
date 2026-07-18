const CONSERVATIVE_TRACKING_PARAMETERS = new Set([
  "_ga",
  "_gl",
  "dclid",
  "fbclid",
  "gad_source",
  "gbraid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "srsltid",
  "wbraid",
]);

function isTrackingParameter(name: string) {
  const normalized = name.toLowerCase();
  return (
    normalized.startsWith("utm_") ||
    CONSERVATIVE_TRACKING_PARAMETERS.has(normalized)
  );
}

export function normalizeTwoLayerSourceUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Two-layer source URL must use HTTP or HTTPS");
  }

  for (const name of [...parsed.searchParams.keys()]) {
    if (isTrackingParameter(name)) parsed.searchParams.delete(name);
  }
  return parsed.toString().replace(/\/$/, "");
}

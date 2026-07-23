// T8B link preference: rank identity-verified Direct-Terra product links so
// the displayed buy link comes from the product's actual manufacturer website
// or a popular retailer whenever one is available, and clean the display URL
// of tracking noise. This module RANKS and CLEANS already-verified links; it
// never admits a link on its own — every candidate has still passed the full
// identity/type/eligibility/wrapper gates in directTerraAssetVerifier first.

import { canonicalBrand } from "./brandMatching.ts";

export const DIRECT_TERRA_LINK_PREFERENCE_VERSION =
  "direct-terra-link-preference-v1";

export type DirectTerraLinkHostClass =
  | "manufacturer"
  | "popular_retailer"
  | "other";

// Popular US retailers by registrable domain, with display labels for the UI.
// Site-level policy (never product-specific), mirroring the source-tier idea:
// these are stores a shopper recognizes and can safely buy from.
const POPULAR_RETAILERS = new Map<string, string>([
  ["amazon.com", "Amazon"],
  ["homedepot.com", "Home Depot"],
  ["lowes.com", "Lowe's"],
  ["walmart.com", "Walmart"],
  ["bestbuy.com", "Best Buy"],
  ["target.com", "Target"],
  ["acehardware.com", "Ace Hardware"],
  ["costco.com", "Costco"],
  ["samsclub.com", "Sam's Club"],
  ["wayfair.com", "Wayfair"],
  ["bhphotovideo.com", "B&H"],
  ["newegg.com", "Newegg"],
  ["staples.com", "Staples"],
  ["officedepot.com", "Office Depot"],
  ["tractorsupply.com", "Tractor Supply"],
  ["harborfreight.com", "Harbor Freight"],
  ["menards.com", "Menards"],
  ["northerntool.com", "Northern Tool"],
  ["dickssportinggoods.com", "DICK'S Sporting Goods"],
  ["rei.com", "REI"],
  ["chewy.com", "Chewy"],
  ["petsmart.com", "PetSmart"],
  ["petco.com", "Petco"],
  ["autozone.com", "AutoZone"],
  ["zoro.com", "Zoro"],
  ["grainger.com", "Grainger"],
]);

// Minimal multi-part public suffixes so registrableDomain() does not truncate
// common non-US retail domains into nonsense. US-focused; extend as needed.
const MULTI_PART_SUFFIXES = new Set([
  "co.uk",
  "com.au",
  "co.jp",
  "com.mx",
  "co.nz",
  "com.br",
  "com.ca",
]);

function hostOf(url: string) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

export function registrableDomain(hostname: string) {
  const labels = hostname.toLowerCase().replace(/^www\./, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_PART_SUFFIXES.has(lastTwo)) {
    return labels.slice(-3).join(".");
  }
  return lastTwo;
}

function compactIdentity(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// A registrable domain counts as the brand's own manufacturer site when its
// leading label matches the canonical brand: exactly, or by a >=5 character
// prefix in either direction (milwaukeetool.com for Milwaukee; vacmaster.com
// for "Vacmaster Professional"). This only affects PREFERENCE and labeling —
// identity acceptance always happened earlier in the verifier.
export function isDirectTerraManufacturerHost(url: string, brand: string) {
  try {
    const registrable = registrableDomain(hostOf(url));
    const label = registrable.split(".")[0] || "";
    const compactBrand = compactIdentity(canonicalBrand(brand));
    if (!label || !compactBrand) return false;
    if (label === compactBrand) return true;
    return (
      (compactBrand.length >= 5 && label.startsWith(compactBrand)) ||
      (label.length >= 5 && compactBrand.startsWith(label))
    );
  } catch {
    return false;
  }
}

export function classifyDirectTerraLinkHost(
  url: string,
  brand: string,
): DirectTerraLinkHostClass {
  try {
    const registrable = registrableDomain(hostOf(url));
    if (isDirectTerraManufacturerHost(url, brand)) return "manufacturer";
    if (POPULAR_RETAILERS.has(registrable)) return "popular_retailer";
    return "other";
  } catch {
    return "other";
  }
}

// True when the exact compact model appears inside the URL path — the
// difference between lowes.com/pd/DEWALT-...DXV16P-QT.../5013926563 (self-
// identifying) and homedepot.com/p/304795082 (bare id, title-matched only).
export function directTerraModelInUrlPath(url: string, model: string) {
  try {
    const compactModel = compactIdentity(model);
    if (compactModel.length < 3) return false;
    return compactIdentity(new URL(url).pathname).includes(compactModel);
  } catch {
    return false;
  }
}

export const DIRECT_TERRA_LINK_SCORES = Object.freeze({
  manufacturerWithModel: 600,
  popularRetailerWithModel: 500,
  manufacturer: 400,
  popularRetailer: 300,
  otherWithModel: 200,
  other: 100,
  unavailable: 0,
});

// A citation link at or above this score is already ideal; the orchestrator
// skips the extra organic lookup for that product.
export const DIRECT_TERRA_ORGANIC_SKIP_SCORE =
  DIRECT_TERRA_LINK_SCORES.popularRetailerWithModel;

export function scoreDirectTerraProductLink(
  url: string | null | undefined,
  target: { brand: string; model: string },
) {
  if (!url) return DIRECT_TERRA_LINK_SCORES.unavailable;
  try {
    const hostClass = classifyDirectTerraLinkHost(url, target.brand);
    const modelInPath = directTerraModelInUrlPath(url, target.model);
    if (hostClass === "manufacturer") {
      return modelInPath
        ? DIRECT_TERRA_LINK_SCORES.manufacturerWithModel
        : DIRECT_TERRA_LINK_SCORES.manufacturer;
    }
    if (hostClass === "popular_retailer") {
      return modelInPath
        ? DIRECT_TERRA_LINK_SCORES.popularRetailerWithModel
        : DIRECT_TERRA_LINK_SCORES.popularRetailer;
    }
    return modelInPath
      ? DIRECT_TERRA_LINK_SCORES.otherWithModel
      : DIRECT_TERRA_LINK_SCORES.other;
  } catch {
    return DIRECT_TERRA_LINK_SCORES.unavailable;
  }
}

// Display hygiene. Manufacturer and popular-retailer product pages address a
// product by path alone, so the entire query/hash (tracking, merchandising
// widgets such as MERCH=REC-…, session junk) is dropped. Unknown hosts keep
// their (already tracking-stripped) URL untouched, because rare storefronts
// can address variants via query parameters.
export function cleanDirectTerraDisplayUrl(url: string, brand: string) {
  try {
    const hostClass = classifyDirectTerraLinkHost(url, brand);
    if (hostClass === "other") return url;
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

// "View at Home Depot" beats a generic button: the shopper should see, before
// clicking, that the link goes to a store or brand they recognize.
export function directTerraRetailerDisplayLabel(url: string, brand?: string) {
  try {
    const registrable = registrableDomain(hostOf(url));
    const retailerLabel = POPULAR_RETAILERS.get(registrable);
    if (retailerLabel) return retailerLabel;
    if (brand && isDirectTerraManufacturerHost(url, brand)) {
      return registrable;
    }
    return registrable;
  } catch {
    return null;
  }
}

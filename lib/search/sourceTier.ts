// Generalized source-quality tiers for discovery — cross-category DATA, never
// category control flow. Used to (1) mine product-name seeds from the most
// trusted lists first, and (2) exclude source/retailer names from being mistaken
// for product names. No product category appears here.
//
//   Tier 1 — trusted editorial / lab / expert review sources (best-of lists)
//   Tier 2 — major retailers / marketplaces (price + availability proof)
//   Tier 3 — manufacturer / brand spec pages (good specs, biased ranking)
//   Tier 4 — everything else (lower-trust SEO / affiliate)

export type SourceTier = 1 | 2 | 3 | 4;

// Editorial/expert review domains (and their bare brand word, for seed exclusion).
const TIER1_EDITORIAL = [
  "nytimes.com", "wirecutter.com", "rtings.com", "consumerreports.org",
  "pcmag.com", "cnet.com", "tomsguide.com", "techradar.com", "wired.com",
  "theverge.com", "seriouseats.com", "americastestkitchen.com", "goodhousekeeping.com",
  "outdoorgearlab.com", "thespruce.com", "thespruceeats.com", "popularmechanics.com",
  "gearpatrol.com", "reviewed.com", "bhg.com", "forbes.com", "businessinsider.com",
  "nymag.com", "thestrategist.com", "engadget.com", "digitaltrends.com",
  "soundguys.com", "housebeautiful.com", "familyhandyman.com", "bobvila.com",
];

const TIER2_MARKETPLACE = [
  "amazon.com", "walmart.com", "target.com", "bestbuy.com", "homedepot.com",
  "lowes.com", "costco.com", "samsclub.com", "wayfair.com", "chewy.com",
  "rei.com", "newegg.com", "acehardware.com", "overstock.com", "qvc.com",
  "bjs.com", "menards.com", "tractorsupply.com", "petco.com", "petsmart.com",
];

// Community/forum signal — useful sentiment but not editorial ranking.
const COMMUNITY = ["reddit.com", "youtube.com", "quora.com"];

function hostOf(input: string): string {
  try {
    const url = input.includes("://") ? new URL(input) : new URL(`https://${input}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return (input || "").replace(/^www\./, "").toLowerCase();
  }
}

const matches = (host: string, list: string[]) =>
  list.some((domain) => host === domain || host.endsWith(`.${domain}`));

export function sourceTier(urlOrHost: string): SourceTier {
  const host = hostOf(urlOrHost);

  if (!host) {
    return 4;
  }

  if (matches(host, TIER1_EDITORIAL)) {
    return 1;
  }

  if (matches(host, TIER2_MARKETPLACE)) {
    return 2;
  }

  // Manufacturer/brand spec pages are usually a bare brand domain (.com with a
  // short host) that isn't a marketplace or editorial site. We can't enumerate
  // every brand, so Tier 3 is "looks like a first-party brand domain"; otherwise 4.
  if (matches(host, COMMUNITY)) {
    return 4;
  }

  return 3;
}

export function isTier1Editorial(urlOrHost: string): boolean {
  return sourceTier(urlOrHost) === 1;
}

// Bare brand/host words for known sources (e.g. "wirecutter", "amazon",
// "consumer reports") so seed extraction never treats a SOURCE name as a product.
export const SOURCE_NAME_TOKENS: Set<string> = new Set(
  [...TIER1_EDITORIAL, ...TIER2_MARKETPLACE, ...COMMUNITY]
    .map((domain) => domain.replace(/\.(com|org|net)$/, ""))
    .flatMap((name) => [name, name.replace(/[^a-z]/g, "")])
    .concat(["consumer", "reports", "good", "housekeeping", "toms", "guide", "test", "kitchen", "spruce", "gear", "patrol", "popular", "mechanics", "business", "insider", "strategist", "digital", "trends"]),
);

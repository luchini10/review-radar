const NON_PRODUCT_SOURCE_DOMAINS = [
  "nytimes.com",
  "wirecutter.com",
  "rtings.com",
  "consumerreports.org",
  "pcmag.com",
  "cnet.com",
  "tomsguide.com",
  "techradar.com",
  "wired.com",
  "theverge.com",
  "seriouseats.com",
  "americastestkitchen.com",
  "goodhousekeeping.com",
  "outdoorgearlab.com",
  "thespruce.com",
  "thespruceeats.com",
  "popularmechanics.com",
  "gearpatrol.com",
  "reviewed.com",
  "bhg.com",
  "forbes.com",
  "businessinsider.com",
  "nymag.com",
  "thestrategist.com",
  "engadget.com",
  "digitaltrends.com",
  "soundguys.com",
  "housebeautiful.com",
  "familyhandyman.com",
  "bobvila.com",
  "reddit.com",
  "youtube.com",
  "quora.com",
];

const RETAILER_DOMAINS = [
  "amazon.com",
  "walmart.com",
  "target.com",
  "bestbuy.com",
  "homedepot.com",
  "lowes.com",
  "costco.com",
  "samsclub.com",
  "wayfair.com",
  "chewy.com",
  "rei.com",
  "newegg.com",
  "acehardware.com",
  "overstock.com",
  "qvc.com",
  "bjs.com",
  "menards.com",
  "tractorsupply.com",
  "petco.com",
  "petsmart.com",
];

const NON_PRODUCT_HOST_LABELS = new Set([
  "community",
  "docs",
  "documentation",
  "help",
  "knowledgebase",
  "manual",
  "manuals",
  "support",
]);

const NON_PRODUCT_PATH_TOKEN =
  /(?:^|[-_])(?:community|docs|documentation|downloads?|help|knowledge-?base|manuals?|support)(?:[-_]|$)/i;

function hostOf(input: string) {
  try {
    const url = input.includes("://")
      ? new URL(input)
      : new URL(`https://${input}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return (input || "").replace(/^www\./, "").toLowerCase();
  }
}

function matchesDomain(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isNonProductSource(urlOrHost: string) {
  const host = hostOf(urlOrHost);
  if (
    NON_PRODUCT_SOURCE_DOMAINS.some((domain) => matchesDomain(host, domain)) ||
    host.split(".").some((label) => NON_PRODUCT_HOST_LABELS.has(label))
  ) {
    return true;
  }

  try {
    const url = urlOrHost.includes("://")
      ? new URL(urlOrHost)
      : new URL(`https://${urlOrHost}`);
    return url.pathname
      .split("/")
      .filter(Boolean)
      .some((segment) => NON_PRODUCT_PATH_TOKEN.test(segment));
  } catch {
    return false;
  }
}

export const SOURCE_NAME_TOKENS = new Set(
  [...NON_PRODUCT_SOURCE_DOMAINS, ...RETAILER_DOMAINS]
    .map((domain) => domain.replace(/\.(com|org|net)$/, ""))
    .flatMap((name) => [name, name.replace(/[^a-z]/g, "")])
    .concat([
      "consumer",
      "reports",
      "good",
      "housekeeping",
      "toms",
      "guide",
      "test",
      "kitchen",
      "spruce",
      "gear",
      "patrol",
      "popular",
      "mechanics",
      "business",
      "insider",
      "strategist",
      "digital",
      "trends",
    ]),
);

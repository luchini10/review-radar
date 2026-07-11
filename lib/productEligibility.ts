import type {
  Citation,
  ProductEligibilityVerdict,
  ProductRecommendation,
  RawProductCandidate,
} from "@/types/review-radar";
import { parseBestProductPriceText } from "./priceParsing.ts";
import { isGenericProductEvidenceUrl } from "./productEvidenceIdentity.ts";

type ProductEligibilityInput = {
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  name?: string | null;
  price?: number | null;
  productName?: string | null;
  retailer?: string | null;
  snippet?: string | null;
  sourceTitle?: string | null;
  sourceType?: "canonical" | "citation" | "offer" | "primary" | "search" | "serper";
  url?: string | null;
};

const evidenceOnlyDomains = [
  "apartmenttherapy.com",
  "bareefers.org",
  "blogspot.com",
  "cnet.com",
  "consumerreports.org",
  "facebook.com",
  "forbes.com",
  "goodhousekeeping.com",
  "home-barista.com",
  "instagram.com",
  "klarna.com",
  "laptopmag.com",
  "mashable.com",
  "medium.com",
  "nytimes.com",
  "pcmag.com",
  "pinterest.com",
  "price.com",
  "popularmechanics.com",
  "reddit.com",
  "runrepeat.com",
  "runnersworld.com",
  "rtings.com",
  "sneakerfiles.com",
  "substack.com",
  "techradar.com",
  "theverge.com",
  "thespruce.com",
  "thespruceats.com",
  "thesprucepets.com",
  "tomsguide.com",
  "wirecutter.com",
  "windowscentral.com",
  "wordpress.com",
  "wwd.com",
  "youtube.com",
  "youtu.be",
];

function verdict(
  status: ProductEligibilityVerdict["status"],
  confidence: ProductEligibilityVerdict["confidence"],
  canRenderAsProductCard: boolean,
  canUseAsEvidence: boolean,
  reasons: string[],
): ProductEligibilityVerdict {
  return {
    status,
    confidence,
    canRenderAsProductCard,
    canUseAsEvidence,
    reasons,
  };
}

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$.'"\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseHttpUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);

    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function normalizeProductEligibilityUrl(value: string | null | undefined) {
  const parsed = parseHttpUrl(value);

  if (!parsed) {
    return "";
  }

  parsed.hash = "";

  for (const key of Array.from(parsed.searchParams.keys())) {
    const lowerKey = key.toLowerCase();

    if (
      lowerKey.startsWith("utm_") ||
      lowerKey === "ascsubtag" ||
      lowerKey === "camp" ||
      lowerKey === "creative" ||
      lowerKey === "creativeasin" ||
      lowerKey === "linkcode" ||
      lowerKey === "tag"
    ) {
      parsed.searchParams.delete(key);
    }
  }

  return parsed.toString().replace(/\/$/, "");
}

export function normalizedEligibilityHost(value: string | URL | null | undefined) {
  const parsed = typeof value === "string" ? parseHttpUrl(value) : value;

  return parsed ? parsed.hostname.toLowerCase().replace(/^www\./, "") : "";
}

function domainMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

function evidenceOnlyDomain(host: string) {
  return evidenceOnlyDomains.some((domain) => domainMatches(host, domain));
}

function hostLooksLikeSupportOrDocumentation(host: string) {
  const labels = host.split(".").filter(Boolean);
  const firstLabel = labels[0] || "";
  const compactHost = labels.join("");

  return (
    /^(?:blog|docs?|help|journal|knowledgebase|manuals?|news|press|stories|support)$/i.test(
      firstLabel,
    ) ||
    /(?:devicereport|manualslib|manualsplus|productdocumentation|productmanuals)/i.test(
      compactHost,
    )
  );
}

function urlPath(parsed: URL | null) {
  return parsed?.pathname.toLowerCase() || "";
}

function hasSearchParam(parsed: URL) {
  return ["k", "q", "query", "search"].some((key) => parsed.searchParams.has(key));
}

function hasListingParam(parsed: URL) {
  return [
    "categoryid",
    "department",
    "facet",
    "facets",
    "filter",
    "filters",
    "qp",
  ].some((key) => parsed.searchParams.has(key));
}

function pathHasCatalogIdentifier(parsed: URL) {
  return parsed.pathname
    .split("/")
    .filter(Boolean)
    .some((segment) => /^(?:ab|pcm)?cat[a-z0-9_-]*\.c$/i.test(segment));
}

function isKnownProductUrl(parsed: URL) {
  const host = normalizedEligibilityHost(parsed);
  const path = urlPath(parsed);

  if (domainMatches(host, "amazon.com")) {
    return /\/(?:dp|gp\/product)\//i.test(path);
  }

  if (domainMatches(host, "walmart.com")) {
    return /\/ip\//i.test(path);
  }

  if (domainMatches(host, "target.com")) {
    return /\/p\//i.test(path);
  }

  if (domainMatches(host, "nike.com")) {
    return /\/t\//i.test(path);
  }

  if (domainMatches(host, "homedepot.com")) {
    return /\/p\//i.test(path) && !/\/p\/reviews\//i.test(path);
  }

  if (domainMatches(host, "lowes.com")) {
    return /\/pd\//i.test(path);
  }

  if (domainMatches(host, "bestbuy.com")) {
    return (
      /\/site\/[^/]+\/\d+\.p$/i.test(path) ||
      /\/product\/[^/]+\/[a-z0-9]+\/sku\/\d+$/i.test(path)
    );
  }

  if (domainMatches(host, "wayfair.com")) {
    return /\/pdp\//i.test(path);
  }

  if (domainMatches(host, "ajmadison.com")) {
    return /\/cgi-bin\/ajmadison\/[^/]+\.html$/i.test(path);
  }

  return false;
}

function pathLooksLikeProductDetail(parsed: URL) {
  const path = urlPath(parsed).replace(/\/+$/, "");
  const productPathPatterns = [
    /\/(?:dp|gp\/product)\//i,
    /\/(?:ip|p|pd|pdp|product|products|item|sku|site)\//i,
  ];

  if (productPathPatterns.some((pattern) => pattern.test(path))) {
    return path.split("/").filter(Boolean).length >= 2;
  }

  const finalSegment = path.split("/").filter(Boolean).pop() || "";

  return (
    finalSegment.length >= 10 &&
    /\d/.test(finalSegment) &&
    /[a-z]/i.test(finalSegment) &&
    !/\b(?:search|results|category|collection|browse|catalog|shop)\b/i.test(
      finalSegment,
    )
  );
}

function pathLooksLikeEvidenceOrSupportPage(parsed: URL) {
  const path = urlPath(parsed);

  return [
    /\/app\/answers(?:\/|$)/i,
    /\/(?:answer|answers)\//i,
    /\/(?:advice|community|communities|conversation|conversations)\//i,
    /\/(?:article|articles)\//i,
    /\/(?:blog|blogs)\//i,
    /\/(?:discover-learn|learning-center|learn)\//i,
    /\/(?:docs|documentation|manual|manuals)\//i,
    /\/(?:forum|forums)\//i,
    /\/(?:help|help-library|support)\//i,
    /(?:^|[-_/])(?:customer[-_]?care|customer[-_]?service)(?:[-_/]|$)/i,
    /\/(?:knowledge-base|knowledgebase|kb)\//i,
    /\/(?:news|newsroom)\//i,
    /\/(?:post|posts|reel|reels)\//i,
    /\/(?:press-release|press-releases|standard|standards)\//i,
    /\/(?:q-a|qa|question|questions)\//i,
    /\/(?:review|reviews)\//i,
    /\/(?:thread|threads)\//i,
    /\/(?:topic|topics)\//i,
    /\/(?:troubleshoot|troubleshooting)\//i,
    /\/(?:19|20)\d{2}\/(?:0?[1-9]|1[0-2])\/[^/]+\.html$/i,
    /(?:^|[-/])(?:comparison|comparisons|versus|vs)(?:[-/]|$)/i,
    /viewtopic/i,
    /\.pdf$/i,
  ].some((pattern) => pattern.test(path));
}

function stemCategoryToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function normalizedPathTokens(value: string) {
  return normalizeText(value.replace(/[-/]+/g, " "))
    .split(" ")
    .filter(Boolean)
    .map(stemCategoryToken);
}

function pathLooksLikeGenericProductCollection(
  parsed: URL,
  title: string,
  category: string | null | undefined,
) {
  if (!category || titleHasModelOrSku(title)) {
    return false;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const productSegmentIndex = segments.findIndex((segment) =>
    /^products?$/i.test(segment),
  );

  if (productSegmentIndex < 0 || productSegmentIndex === segments.length - 1) {
    return false;
  }

  const finalSegment = segments[segments.length - 1] || "";

  if (/\d/.test(finalSegment)) {
    return false;
  }

  const categoryTokens = new Set(normalizedPathTokens(category));
  const genericLandingTokens = new Set([
    "all",
    "commercial",
    "featured",
    "home",
    "indoor",
    "outdoor",
    "portable",
    "product",
    "quality",
    "residential",
    "solution",
    "system",
  ]);
  const distinctiveTokens = normalizedPathTokens(finalSegment).filter(
    (token) =>
      !categoryTokens.has(token) && !genericLandingTokens.has(token),
  );
  const titleTokens = normalizedPathTokens(title);
  const categoryAppearsNearTitleStart = Array.from(categoryTokens).every(
    (token) => {
      const index = titleTokens.indexOf(token);
      return index >= 0 && index <= 4;
    },
  );

  return distinctiveTokens.length === 0 && categoryAppearsNearTitleStart;
}

function pathLooksLikeOpaqueProductCollection(parsed: URL, title: string) {
  if (isKnownProductUrl(parsed)) {
    return false;
  }

  const segments = parsed.pathname
    .toLowerCase()
    .split("/")
    .filter(Boolean);
  const finalSegment = segments[segments.length - 1] || "";

  // Some manufacturer CMS routes encode a category/collection in an opaque
  // suffix. Digits in these slugs are catalog identifiers, not product models.
  if (
    /(?:^|[-_.])ocs[-_.]?c$/i.test(finalSegment) ||
    /(?:^|[-_.])product[-_.]?(?:collection|family|lineup|range)s?$/i.test(
      finalSegment,
    )
  ) {
    return true;
  }

  const collectionSegmentIndex = segments.findIndex((segment) =>
    /^(?:families|family|lineup|lineups|range|ranges|series)$/i.test(segment),
  );

  if (collectionSegmentIndex < 0) {
    return false;
  }

  const trailingPath = segments.slice(collectionSegmentIndex + 1).join(" ");

  if (!trailingPath) {
    return true;
  }

  // A concrete model in both the title and the path is affirmative detail-page
  // evidence. Without that agreement, a nested family/series route stays a
  // collection even if it contains images, prices, or catalog-like digits.
  const titleModels = normalizeText(title)
    .split(" ")
    .filter(
      (token) =>
        token.length >= 3 &&
        /[a-z]/i.test(token) &&
        /\d/.test(token) &&
        /^[a-z0-9-]+$/i.test(token),
    );

  return !titleModels.some((model) =>
    normalizeText(trailingPath).split(" ").includes(model),
  );
}

function isLikelyListingOrSearchUrl(parsed: URL) {
  const host = normalizedEligibilityHost(parsed);
  const path = urlPath(parsed);
  const normalizedPath = normalizeText(path);
  const knownProductUrl = isKnownProductUrl(parsed);

  if (isGenericProductEvidenceUrl(parsed.toString())) {
    return true;
  }

  if (
    !knownProductUrl &&
    (hasListingParam(parsed) || pathHasCatalogIdentifier(parsed))
  ) {
    return true;
  }

  if (
    hasSearchParam(parsed) &&
    /\b(?:s|search|results|sale|shop|browse|category|collection)\b/i.test(
      normalizedPath,
    )
  ) {
    return true;
  }

  if (domainMatches(host, "amazon.com") && !isKnownProductUrl(parsed)) {
    return true;
  }

  if (domainMatches(host, "nike.com")) {
    return !/\/t\//i.test(path);
  }

  if (host === "about.nike.com" || host === "news.nike.com") {
    return true;
  }

  if (domainMatches(host, "wayfair.com")) {
    return (
      /\/(?:furniture|keyword\.php)\//i.test(path) ||
      /\/sb\d+\//i.test(path) ||
      path.includes("keyword.php")
    ) && !isKnownProductUrl(parsed);
  }

  if (domainMatches(host, "homedepot.com")) {
    return /\/(?:b|c)\//i.test(path) || /\/p\/reviews\//i.test(path);
  }

  if (domainMatches(host, "lowes.com")) {
    return /\/(?:c|pl)\//i.test(path) && !isKnownProductUrl(parsed);
  }

  if (domainMatches(host, "target.com")) {
    return /\/(?:s|c)\//i.test(path) && !isKnownProductUrl(parsed);
  }

  if (domainMatches(host, "walmart.com")) {
    return /\/(?:browse|cp|search)\//i.test(path) && !isKnownProductUrl(parsed);
  }

  if (domainMatches(host, "ebay.com")) {
    return /\/(?:b|sch|t)\//i.test(path) && !isKnownProductUrl(parsed);
  }

  if (domainMatches(host, "bestbuy.com")) {
    return (
      /\/site\/(?:searchpage|shop|collection)\b/i.test(path) ||
      /\/site\/(?:[^/]+\/)*[^/]+\.c$/i.test(path)
    ) && !knownProductUrl;
  }

  if (domainMatches(host, "dickssportinggoods.com")) {
    return /\/(?:a|c|f|s)\//i.test(path) && !isKnownProductUrl(parsed);
  }

  if (domainMatches(host, "footlocker.com")) {
    return /\/(?:buy|category|search|collection)\//i.test(path) &&
      !isKnownProductUrl(parsed);
  }

  if (domainMatches(host, "ajmadison.com")) {
    return /\/c\//i.test(path) && !isKnownProductUrl(parsed);
  }

  if (domainMatches(host, "ikea.com")) {
    return /\/(?:cat|rooms|search)\//i.test(path);
  }

  if (
    (host === "nba.com" || host.endsWith(".nba.com")) &&
    /\b(?:rule|rules|court|dimension|dimensions|equipment)\b/i.test(path)
  ) {
    return true;
  }

  return /\b(?:search|results|category|categories|collection|collections|browse|catalog|department|departments|shop)\b/i.test(
    normalizedPath,
  );
}

function textLooksLikeNonProduct(value: string) {
  if (!value) {
    return false;
  }

  return [
    /^\s*application error\b/i,
    /\bclient-side exception has occurred\b/i,
    /\b(?:complaints?|lawsuit|recall notice)\b/i,
    /\b(?:customer reviews?|reviews?)\s+(?:for|of)\b/i,
    /\b(?:support article|help library|error code list|troubleshooting)\b/i,
    /\b(?:device|product)\.report\b/i,
    /\b(?:quick\s*start\s*guide|user\s*manual|owners?\s*manual|owner'?s\s*manual|instruction\s*manual|installation\s*guide|installation\s*instructions|use\s+and\s+care\s+guide|care\s+guide)\b/i,
    /\b(?:buying guide|shopping guide|purchase guide|size guide|measurement guide|measuring guide)\b/i,
    /\bthings?\s+to\s+avoid\s+when\s+(?:buying|purchasing|shopping\s+for)\b/i,
    /\b(?:forum|thread|question|q&a|discussion|reddit)\b/i,
    /\b(?:compare\s+(?:prices?|stores?)|price comparison|klarna)\b/i,
    /\b(?:is|are)\s+on\s+sale\b/i,
    /\blowest\s+price\s+ever\b/i,
    /^(?:ranking|ranked)\s+(?:the\s+)?(?:top|best)\s+\d+\b/i,
    /^(?:the\s+)?(?:top|best)\s+\d+\b/i,
    /^(?:the\s+)?\d+\s+best\b/i,
    /^best\s+\w.{3,}\s+of\s+20\d\d/i,
    /^\s*cut\s+in\s+half\b/i,
    /^\s*review\s*:/i,
    /\breview\b\s*(?:\||-|$)/i,
    /\b(?:tried\s+and\s+tested|tested\s+and\s+reviewed|hands[-\s]?on\s+review)\b/i,
    /\b(?:official images|release info|newsroom|built for|colorways?\s+\+\s+release dates|complete guide|franchise history|shuffles?\s+its\s+lineup)\b/i,
    /\b\w+\s+out,\s+\w+.+\s+in\?\s*$/i,
    /\b(?:rule\s+no\.?|court dimensions?|backboard dimensions?|dimensions?\s*(?:&|and)\s*drawings?|equipment\s*-\s*nba official)\b/i,
    /\bhas\s+tested\b/i,
    /\bfrom\s+top\s+brands\b/i,
    /\bspecification\s+version\s+\d/i,
  ].some((pattern) => pattern.test(value));
}

function textLooksLikeEditorialTitle(value: string) {
  const title = value.trim();

  if (!title) {
    return false;
  }

  return [
    /^(?:is|are|was|were|do|does|did|can|could|should|would|will|what|which|who|why|how)\b.{4,180}\?\s*(?:[-|:]\s*.+)?$/i,
    /\b(?:actually good|should you buy|worth (?:buying|it)|our (?:long-term )?verdict|pros and cons|everything you need to know|what you need to know)\b/i,
    /\b(?:comparison|comparison chart|comparison guide)\b/i,
    /\b[a-z0-9-]+\s+(?:vs\.?|versus)\s+[a-z0-9-]+\b/i,
    /\b(?:press release|standards? article)\b/i,
    /^\s*(?:ansi|astm|iec|ieee|iso|ul)\s+\d{3,}(?::\d{4})?\b/i,
    /^\s*[^|]{2,100}\b(?:announces?|debuts?|introduces?|launches?|unveils?)\b/i,
    /\b(?:twin|multi)[ -]?packs?\s+(?:and|&)\s+bundles?\b/i,
    /(?:^|[-|])\s*page\s+\d+\s*(?:[-|]|$)/i,
  ].some((pattern) => pattern.test(title));
}

function textLooksLikeListing(value: string) {
  if (!value) {
    return false;
  }

  return [
    /\bsearch results?\b/i,
    /\bresults for\b/i,
    /^\s*compare\s+(?:at|prices?|stores?)\b/i,
    /^\s*shop\s+(?:all|by|for|from|category|collection)\b/i,
    /^\s*best\s+.+\s+-\s+(?:ebay|amazon|walmart|target|the home depot|lowe'?s|best buy)\b/i,
    /\bshopping\s+(?:advice|guide|results?)\b/i,
    /\bcategory\b/i,
    /\bcollection\b/i,
    /^\s*buy online\b/i,
    /\+\s*free\s+shipping/i,
    /\b(?:shoes|sneakers|boots|sandals|shirts|pants|jackets|chairs|desks|tables|vacuums|appliances|tools|grills|mattresses|sofas|couches|tvs|televisions|laptops)\s+(?:for|from)\s+(?:men|women|kids|top brands|speed|running|basketball|walking|pc gaming)\b/i,
    /^\s*(?:basketball|running|walking|training|tennis|hiking)\s+(?:shoes|sneakers)\s*(?:\||-|for|from)\b/i,
    /^\s*(?:business|gaming)\s+laptops?\s*(?:\||-|for|from)\b/i,
    /\b\d{2,3}\s*(?:inch|in\.?|")\s+(?:tvs?|televisions)\s*(?:\||-|for|from)\b/i,
    /\b(?:desks|refrigerators|microwaves|microwave ovens|countertop microwave ovens|mini fridges|sectional sleeper sofas|sofas|couches|vacuums|gloves|tv stands|cabinets)\s*(?:&|-|\|)\s*(?:wayfair|aj madison|the home depot|amazon|walmart|target|lowe'?s|best buy|b&h|b and h|bh photo)\b/i,
  ].some((pattern) => pattern.test(value));
}

function titleLooksLikeSpecificProduct(title: string) {
  const normalized = normalizeText(title);

  if (textLooksLikeNonProduct(title) || textLooksLikeListing(title)) {
    return false;
  }

  if (title.includes(" / ") && !/\b(?:model|adult|youth|inch|in\.|series|pro)\b/i.test(title)) {
    return false;
  }

  return normalized.split(" ").filter((word) => word.length > 1).length >= 3;
}

function titleHasBasicProductIdentity(title: string) {
  const normalized = normalizeText(title);

  if (textLooksLikeNonProduct(title) || textLooksLikeListing(title)) {
    return false;
  }

  return normalized.split(" ").filter((word) => word.length > 1).length >= 2;
}

function isInternalProductSource(sourceType: ProductEligibilityInput["sourceType"]) {
  return sourceType === "primary" || sourceType === "canonical" || sourceType === "offer";
}

function titleHasModelOrSku(title: string) {
  const tokens = normalizeText(title).split(" ").filter(Boolean);

  return tokens.some((token) => {
    if (token.length < 4 || token.length > 24) {
      return false;
    }

    if (!/[a-z]/i.test(token) || !/\d/.test(token)) {
      return false;
    }

    return /^[a-z0-9-]+$/i.test(token);
  });
}

function isFinitePrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasHttpImage(value: string | null | undefined) {
  return Boolean(parseHttpUrl(value));
}

export function classifyProductEligibility(
  input: ProductEligibilityInput,
): ProductEligibilityVerdict {
  const name = (input.name || input.productName || "").trim();
  const title = (input.sourceTitle || name).trim();
  const snippet = (input.snippet || "").trim();
  const combinedText = [name, title, snippet].filter(Boolean).join(" ");
  const titleText = [name, title].filter(Boolean).join(" ");
  const parsedUrl = parseHttpUrl(input.url);

  if (
    textLooksLikeNonProduct(combinedText) ||
    textLooksLikeEditorialTitle(name) ||
    textLooksLikeEditorialTitle(title)
  ) {
    return verdict("non_product", "high", false, true, [
      "Title or snippet looks like an article, support page, complaint, error, or other non-product content.",
    ]);
  }

  if (textLooksLikeListing(titleText)) {
    return verdict("listing_or_search", "high", false, false, [
      "Title looks like a category, listing, comparison, or search page.",
    ]);
  }

  if (!parsedUrl) {
    return titleLooksLikeSpecificProduct(title)
      ? verdict("likely_product", "low", true, true, [
          "No usable URL was available, but the title looks like a specific product.",
        ])
      : verdict("unknown", "low", false, true, [
          "No usable product URL was available.",
        ]);
  }

  const host = normalizedEligibilityHost(parsedUrl);
  const internallySourcedProduct = isInternalProductSource(input.sourceType);
  const hasBasicProductIdentity =
    titleLooksLikeSpecificProduct(title) ||
    (internallySourcedProduct && titleHasBasicProductIdentity(title));

  if (isLikelyListingOrSearchUrl(parsedUrl)) {
    return verdict("listing_or_search", "high", false, false, [
      "URL looks like a category, listing, search, or browse page.",
    ]);
  }

  if (pathLooksLikeOpaqueProductCollection(parsedUrl, titleText)) {
    return verdict("listing_or_search", "high", false, false, [
      "URL has a manufacturer collection, family, lineup, range, or series page shape.",
    ]);
  }

  if (
    pathLooksLikeGenericProductCollection(
      parsedUrl,
      titleText,
      input.category,
    )
  ) {
    return verdict("listing_or_search", "high", false, false, [
      "URL and title look like a generic product-family collection.",
    ]);
  }

  if (
    evidenceOnlyDomain(host) ||
    hostLooksLikeSupportOrDocumentation(host) ||
    pathLooksLikeEvidenceOrSupportPage(parsedUrl)
  ) {
    return verdict("evidence_only", "high", false, true, [
      "URL belongs to an evidence, review, discussion, news, or support source.",
    ]);
  }

  if (isKnownProductUrl(parsedUrl)) {
    return verdict("buyable_product", "high", true, true, [
      "URL matches a known product-detail page pattern.",
    ]);
  }

  if (pathLooksLikeProductDetail(parsedUrl) && hasBasicProductIdentity) {
    return verdict("buyable_product", "medium", true, true, [
      "URL and title look like a product-detail page.",
    ]);
  }

  if (
    hasBasicProductIdentity &&
    isFinitePrice(input.price) &&
    hasHttpImage(input.imageUrl)
  ) {
    return verdict("likely_product", "medium", true, true, [
      "Specific title, price, and image make this look like a buyable product.",
    ]);
  }

  if (
    internallySourcedProduct &&
    hasBasicProductIdentity &&
    hasHttpImage(input.imageUrl)
  ) {
    return verdict("likely_product", "low", true, true, [
      "Specific internal product record has an image, but product-page confidence is low.",
    ]);
  }

  if (
    internallySourcedProduct &&
    hasBasicProductIdentity &&
    isFinitePrice(input.price)
  ) {
    return verdict("likely_product", "low", true, true, [
      "Specific internal product record has price evidence, but product-page confidence is low.",
    ]);
  }

  if (hasBasicProductIdentity && titleHasModelOrSku(title)) {
    return verdict("likely_product", "low", true, true, [
      "Specific title includes a model-like token, but URL confidence is low.",
    ]);
  }

  return verdict("unknown", "low", false, true, [
    "Could not prove this is a buyable product page.",
  ]);
}

export function productRecommendationEligibility(
  product: ProductRecommendation,
): ProductEligibilityVerdict {
  const firstCitation = product.citations[0];
  const firstOffer = product.metadata?.offers?.[0];

  return classifyProductEligibility({
    brand: product.metadata?.brand?.value || product.canonicalIdentity?.brand,
    category: product.category,
    imageUrl: product.product_image_url || product.metadata?.image?.value,
    name: product.name,
    price:
      product.metadata?.offers?.find(
        (offer) => offer.price.value !== null && Number.isFinite(offer.price.value),
      )?.price.value ??
      parseBestProductPriceText(product.estimated_price_range) ??
      null,
    productName: product.name,
    retailer: firstOffer?.retailer,
    snippet: firstCitation?.what_it_supports,
    sourceTitle: product.metadata?.title?.value || product.name,
    sourceType: "primary",
    url:
      product.product_page_url ||
      product.metadata?.canonicalUrl?.value ||
      firstOffer?.url ||
      firstCitation?.url,
  });
}

export function candidateEligibility(
  candidate: RawProductCandidate,
): ProductEligibilityVerdict {
  const firstSource = candidate.evidenceSources[0];

  return classifyProductEligibility({
    brand: candidate.brand,
    category: candidate.category,
    imageUrl: candidate.imageUrl,
    name: candidate.name,
    price: candidate.price,
    productName: candidate.name,
    retailer: candidate.retailer,
    snippet: firstSource?.snippet,
    sourceTitle: firstSource?.title || candidate.name,
    sourceType: "serper",
    url: candidate.productUrl || firstSource?.url,
  });
}

export function citationEligibility(
  citation: Citation,
  productName: string,
  category?: string,
): ProductEligibilityVerdict {
  return classifyProductEligibility({
    category,
    name: productName,
    productName,
    snippet: citation.what_it_supports,
    sourceTitle: citation.title,
    sourceType: "citation",
    url: citation.url,
  });
}

export const productEligibilityTestExports = {
  isKnownProductUrl,
  isLikelyListingOrSearchUrl,
  pathLooksLikeOpaqueProductCollection,
  pathLooksLikeEvidenceOrSupportPage,
  textLooksLikeListing,
  textLooksLikeNonProduct,
  titleLooksLikeSpecificProduct,
};

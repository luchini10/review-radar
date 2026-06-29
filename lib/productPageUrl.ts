import type {
  Citation,
  ProductRecommendation,
  RecommendationResult,
} from "@/types/review-radar";
import { classifyProductEligibility } from "./productEligibility.ts";
import {
  classifyProductEvidenceIdentity,
  isGenericProductEvidenceUrl,
} from "./productEvidenceIdentity.ts";

export type ProductPageUrlType = "official" | "retailer" | "source" | "unknown";

export type ProductPageLink = {
  confidence: "high" | "medium" | "low";
  isProductPage: boolean;
  label: string;
  type: ProductPageUrlType;
  url: string;
};

type ProductPageCandidate = {
  confidence: "high" | "medium" | "low";
  isProductPage: boolean;
  score: number;
  sourceTitle?: string;
  sourceType: "canonical" | "citation" | "offer" | "primary";
  type: ProductPageUrlType;
  url: string;
};

const PRODUCT_PATH_PARTS = [
  "/dp/",
  "/gp/product/",
  "/ip/",
  "/item/",
  "/p/",
  "/pd/",
  "/product",
  "/products",
  "/shop/",
  "/site/",
  "/sku",
  "/catalog/product",
  "/buy/",
];

const EDITORIAL_PATH_PARTS = [
  "/article",
  "/best-",
  "/blog",
  "/deal",
  "/guide",
  "/news",
  "/product-reviews",
  "/review",
  "/reviews",
  "/roundup",
];

const REPUTABLE_RETAILER_DOMAINS = [
  "ajmadison.com",
  "amazon.com",
  "appliancesconnection.com",
  "bhphotovideo.com",
  "bestbuy.com",
  "costco.com",
  "crateandbarrel.com",
  "crutchfield.com",
  "homedepot.com",
  "ikea.com",
  "lowes.com",
  "macys.com",
  "newegg.com",
  "target.com",
  "walmart.com",
  "wayfair.com",
];

const OFFICIAL_BRAND_DOMAINS: Record<string, string[]> = {
  amazon: ["amazon.com"],
  apple: ["apple.com"],
  article: ["article.com"],
  bissell: ["bissell.com"],
  bosch: ["bosch-home.com"],
  breville: ["breville.com"],
  burrow: ["burrow.com"],
  blueair: ["blueair.com"],
  coway: ["cowaymega.com", "coway.com"],
  cuisinart: ["cuisinart.com"],
  dell: ["dell.com"],
  dyson: ["dyson.com"],
  frigidaire: ["frigidaire.com"],
  ge: ["geappliances.com"],
  "ge appliances": ["geappliances.com"],
  google: ["store.google.com", "google.com"],
  honeywell: ["honeywell.com", "honeywellpluggedin.com"],
  hp: ["hp.com"],
  ikea: ["ikea.com"],
  instant: ["instantpot.com", "instanthome.com"],
  "instant pot": ["instantpot.com", "instanthome.com"],
  kitchenaid: ["kitchenaid.com"],
  lenovo: ["lenovo.com"],
  levoit: ["levoit.com"],
  lg: ["lg.com"],
  microsoft: ["microsoft.com"],
  miele: ["miele.com", "mieleusa.com"],
  nike: ["nike.com"],
  ninja: ["ninjakitchen.com"],
  samsung: ["samsung.com"],
  shark: ["sharkclean.com"],
  sony: ["sony.com"],
  vitamix: ["vitamix.com"],
  "west elm": ["westelm.com"],
  whirlpool: ["whirlpool.com"],
  winix: ["winixamerica.com", "winix.com"],
};

function normalizeUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
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

    return parsed.toString();
  } catch {
    return "";
  }
}

function hostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function domainMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

function hostBase(host: string) {
  const parts = host.split(".");

  if (parts.length < 2) {
    return host;
  }

  return parts[parts.length - 2] || host;
}

function normalizeBrand(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactBrand(value: string) {
  return value.replace(/[^a-z0-9]+/g, "");
}

function productNameBrand(product: ProductRecommendation) {
  const lowerName = product.name.toLowerCase();
  const knownBrand = Object.keys(OFFICIAL_BRAND_DOMAINS)
    .sort((left, right) => right.length - left.length)
    .find((brand) => lowerName.startsWith(`${brand} `));

  return knownBrand || "";
}

function productBrands(product: ProductRecommendation) {
  const brands = [
    normalizeBrand(product.metadata?.brand?.value),
    normalizeBrand(product.canonicalIdentity?.brand),
    productNameBrand(product),
  ].filter(Boolean);

  return Array.from(new Set(brands));
}

function pathLooksProductLike(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase();

    return PRODUCT_PATH_PARTS.some((part) => path.includes(part));
  } catch {
    return false;
  }
}

function pathLooksLikeOpaqueProductCode(url: string) {
  try {
    const segments = new URL(url).pathname
      .toLowerCase()
      .split("/")
      .filter(Boolean);
    const productIndex = segments.findIndex((segment) => segment === "product");
    const productCode = productIndex >= 0 ? segments[productIndex + 1] : "";

    return Boolean(
      productCode &&
        /^[a-z]{1,5}\d{2,8}[a-z0-9-]*$/.test(productCode) &&
        segments.length <= productIndex + 2,
    );
  } catch {
    return false;
  }
}

function productWords(productName: string) {
  return productName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
}

function titleMentionsProduct(
  title: string | undefined,
  productName: string,
  brands: string[],
) {
  const normalizedTitle = normalizeBrand(title);
  const brandWords = new Set(brands.flatMap((brand) => productWords(brand)));
  const words = productWords(productName).filter((word) => !brandWords.has(word));

  return (
    words.length >= 2 &&
    words.filter((word) => normalizedTitle.includes(word)).length >=
      Math.min(2, words.length)
  );
}

function pathMentionsProduct(url: string, productName: string, brands: string[]) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    const brandWords = new Set(brands.flatMap((brand) => productWords(brand)));
    const words = productWords(productName).filter((word) => !brandWords.has(word));
    const modelWords = words.filter((word) => /\d/.test(word));
    const nonModelWords = words.filter((word) => !/\d/.test(word));

    if (modelWords.length > 0) {
      const nonModelMatchCount = nonModelWords.filter((word) =>
        path.includes(word),
      ).length;

      return (
        (modelWords.every((word) => path.includes(word)) &&
          words.some((word) => path.includes(word))) ||
        (nonModelWords.length >= 3 && nonModelMatchCount >= 3)
      );
    }

    return (
      words.length >= 2 &&
      words.filter((word) => path.includes(word)).length >= Math.min(2, words.length)
    );
  } catch {
    return false;
  }
}

function pathLooksEditorial(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase();

    return EDITORIAL_PATH_PARTS.some((part) => path.includes(part));
  } catch {
    return false;
  }
}

function urlLooksGenericListingPage(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.toLowerCase();

    if (
      /(?:^|\/)(?:search|searchpage|collections?|category|categories?|catalog|browse)(?:[/.]|$)/.test(
        path,
      ) ||
      /(?:^|[/.])[^/]*hidden[^/]*(?:[/.]|$)/.test(path)
    ) {
      return true;
    }

    if (
      host === "homedepot.com" &&
      (path.startsWith("/b/") || path.startsWith("/c/"))
    ) {
      return true;
    }

    if (
      host === "walmart.com" &&
      (path.startsWith("/browse/") || path.startsWith("/cp/"))
    ) {
      return true;
    }

    if (host === "target.com" && path.startsWith("/c/")) {
      return true;
    }

    if (host === "about.nike.com" || host === "news.nike.com") {
      return true;
    }

    if (host === "nike.com" && !/\/t\//i.test(path)) {
      return true;
    }

    if (
      host === "dickssportinggoods.com" &&
      /\/(?:a|c|f|s)\//i.test(path)
    ) {
      return true;
    }

    if (
      host === "footlocker.com" &&
      /\/(?:buy|category|search|collection)\//i.test(path)
    ) {
      return true;
    }

    if (host === "runrepeat.com") {
      return true;
    }

    if (
      host === "klarna.com" ||
      host === "pinterest.com" ||
      host === "runnersworld.com" ||
      host === "sneakerfiles.com" ||
      host === "wwd.com"
    ) {
      return true;
    }

    if (
      (host === "nba.com" || host.endsWith(".nba.com")) &&
      /\b(?:rule|rules|court|dimension|dimensions|equipment)\b/i.test(path)
    ) {
      return true;
    }

    if (host === "amazon.com" && path.startsWith("/s")) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function sourceTitleMentionsBrand(title: string | undefined, brands: string[]) {
  const normalizedTitle = normalizeBrand(title);

  return brands.some((brand) => brand && normalizedTitle.includes(brand));
}

function officialDomainMatch(host: string, brands: string[]) {
  for (const brand of brands) {
    const mappedDomains = OFFICIAL_BRAND_DOMAINS[brand] || [];

    if (mappedDomains.some((domain) => domainMatches(host, domain))) {
      return true;
    }

    const compact = compactBrand(brand);
    const base = hostBase(host);

    if (compact.length >= 4 && compactBrand(base) === compact) {
      return true;
    }
  }

  return false;
}

function isReputableRetailer(host: string) {
  return REPUTABLE_RETAILER_DOMAINS.some((domain) => domainMatches(host, domain));
}

function classifyCandidate(input: {
  brands: string[];
  productName: string;
  sourceTitle?: string;
  sourceType: ProductPageCandidate["sourceType"];
  url: string;
}): ProductPageCandidate | null {
  const url = normalizeUrl(input.url);

  if (!url) {
    return null;
  }

  const host = hostname(url);
  const identityTitle =
    input.sourceType === "primary" ? "" : input.sourceTitle;
  const evidenceIdentity = classifyProductEvidenceIdentity({
    productName: input.productName,
    sourceTitle: identityTitle,
    url,
  });

  if (
    evidenceIdentity === "generic_evidence" ||
    evidenceIdentity === "conflicting_product" ||
    isGenericProductEvidenceUrl(url)
  ) {
    return null;
  }

  const eligibility = classifyProductEligibility({
    name: input.productName,
    productName: input.productName,
    sourceTitle: input.sourceTitle,
    sourceType: input.sourceType,
    url,
  });

  if (
    eligibility.status === "evidence_only" ||
    eligibility.status === "listing_or_search" ||
    eligibility.status === "non_product"
  ) {
    return null;
  }

  const isEditorial = pathLooksEditorial(url);
  const isGenericListing = urlLooksGenericListingPage(url);

  if (isGenericListing) {
    return null;
  }

  const productPath = pathLooksProductLike(url);
  const pathMentions = pathMentionsProduct(url, input.productName, input.brands);
  const opaqueProductCode = pathLooksLikeOpaqueProductCode(url);
  const independentTitle =
    input.sourceType !== "primary" && input.sourceTitle !== input.productName;
  const titleMatches = titleMentionsProduct(
    input.sourceTitle,
    input.productName,
    input.brands,
  );
  const official =
    officialDomainMatch(host, input.brands) ||
    (input.sourceType === "canonical" &&
      input.brands.length > 0 &&
      sourceTitleMentionsBrand(input.sourceTitle, input.brands) &&
      officialDomainMatch(host, input.brands));

  if (
    official &&
    input.sourceType === "primary" &&
    productPath &&
    opaqueProductCode &&
    !pathMentions
  ) {
    return null;
  }

  const isProductPage =
    !isEditorial &&
    evidenceIdentity === "same_product" &&
    (pathMentions ||
      (productPath && independentTitle && titleMatches));
  const retailer = isReputableRetailer(host);
  const type: ProductPageUrlType = official
    ? "official"
    : retailer
      ? "retailer"
      : isEditorial || input.sourceType === "citation"
        ? "source"
        : "unknown";
  const confidence =
    official || retailer || isProductPage
      ? "high"
      : type === "source"
        ? "medium"
        : "low";
  const baseScore =
    type === "official"
      ? isProductPage
        ? 400
        : 350
      : type === "retailer"
        ? 280
        : type === "unknown" && isProductPage
          ? 220
          : type === "source"
            ? 120
            : 80;
  const sourceBonus =
    input.sourceType === "canonical"
      ? 20
      : input.sourceType === "primary"
        ? 12
        : input.sourceType === "offer"
          ? 8
          : 0;

  return {
    confidence,
    isProductPage,
    score: baseScore + sourceBonus,
    sourceTitle: input.sourceTitle,
    sourceType: input.sourceType,
    type,
    url,
  };
}

function productPageLabel(candidate: ProductPageCandidate) {
  if (candidate.type === "official") {
    return candidate.isProductPage
      ? "View Official Product Page"
      : "View Official Brand Page";
  }

  if (candidate.type === "retailer") {
    return "View Retailer Page";
  }

  if (candidate.type === "source") {
    return "View Source Page";
  }

  return "View Product Page";
}

function citationCandidates(
  citations: Citation[],
  productName: string,
  brands: string[],
): ProductPageCandidate[] {
  return citations.flatMap((citation) => {
    const candidate = classifyCandidate({
      brands,
      productName,
      sourceTitle: citation.title,
      sourceType: "citation",
      url: citation.url,
    });

    return candidate ? [candidate] : [];
  });
}

function getProductPageCandidates(product: ProductRecommendation) {
  const brands = productBrands(product);
  const candidates = [
    classifyCandidate({
      brands,
      productName: product.name,
      sourceTitle: product.metadata?.title?.value || product.name,
      sourceType: "canonical",
      url: product.metadata?.canonicalUrl?.value || "",
    }),
    classifyCandidate({
      brands,
      productName: product.name,
      sourceTitle: product.name,
      sourceType: "primary",
      url: product.product_page_url,
    }),
    ...(product.metadata?.offers || []).flatMap((offer) => {
      const candidate = classifyCandidate({
        brands,
        productName: product.name,
        sourceTitle: offer.retailer || product.name,
        sourceType: "offer",
        url: offer.url,
      });

      return candidate ? [candidate] : [];
    }),
    ...citationCandidates(product.citations, product.name, brands),
  ].filter((candidate): candidate is ProductPageCandidate => Boolean(candidate));
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.url)) {
      return false;
    }

    seen.add(candidate.url);
    return true;
  });
}

export function getProductPageLink(
  product: ProductRecommendation,
): ProductPageLink | null {
  const bestCandidate = getProductPageCandidates(product)
    .filter((candidate) => candidate.isProductPage)
    .sort((left, right) => right.score - left.score)[0];

  if (!bestCandidate) {
    return null;
  }

  return {
    confidence: bestCandidate.confidence,
    isProductPage: bestCandidate.isProductPage,
    label: productPageLabel(bestCandidate),
    type: bestCandidate.type,
    url: bestCandidate.url,
  };
}

export function prioritizeProductPageUrl(
  product: ProductRecommendation,
): ProductRecommendation {
  const link = getProductPageLink(product);
  const nextUrl = link?.url || "";

  if (nextUrl === product.product_page_url) {
    return product;
  }

  return {
    ...product,
    product_page_url: nextUrl,
  };
}

export function prioritizeProductPageUrlsInResult(
  result: RecommendationResult,
): RecommendationResult {
  return {
    ...result,
    exactMatches: result.exactMatches.map(prioritizeProductPageUrl),
    nearMatches: result.nearMatches.map(prioritizeProductPageUrl),
    premiumAboveBudget: (result.premiumAboveBudget || []).map(
      prioritizeProductPageUrl,
    ),
    recommendations: result.recommendations.map(prioritizeProductPageUrl),
  };
}

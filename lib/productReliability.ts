import type {
  ProductPriceConfidence,
  ProductRecommendation,
  ProductReliabilityCheck,
} from "@/types/review-radar";
import { assessProductPriceTrust } from "./productPriceTrust.ts";

function compact(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function hostOf(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function canonicalUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.toLowerCase().replace(/[?#].*$/, "").replace(/\/$/, "");
  }
}

export function assessProductPriceReliability(
  product: ProductRecommendation,
): {
  confidence: ProductPriceConfidence;
  price: number | null;
  warnings: string[];
} {
  const trust = product.priceTrust || assessProductPriceTrust(product);
  const confidence: ProductPriceConfidence =
    trust.status === "verified"
      ? "verified"
      : trust.status === "usable"
        ? "likely"
        : trust.status === "suspicious"
          ? "suspicious"
          : trust.status === "conflicting"
            ? "conflicting"
            : "unverified";

  return {
    confidence,
    price: trust.price,
    warnings: trust.warnings,
  };
}

function identityConfidence(product: ProductRecommendation) {
  const canonical = product.canonicalIdentity;
  const metadata = product.metadata;
  const pageUrl = canonicalUrl(
    metadata?.canonicalUrl?.value || product.product_page_url,
  );
  const offerHosts = new Set(
    (metadata?.offers || []).map((offer) => hostOf(offer.url)).filter(Boolean),
  );
  const citationHosts = new Set(
    (product.citations || []).map((citation) => hostOf(citation.url)).filter(Boolean),
  );
  const title = compact(metadata?.title?.value || product.name);
  const hasModel =
    Boolean(metadata?.modelNumber?.value || canonical?.modelNumber) ||
    /\b[A-Z]{1,5}[-\s]?\d{2,}[A-Z0-9-]*\b/.test(title);
  const hasBrand = Boolean(metadata?.brand?.value || canonical?.brand);
  const sourceHostCount = new Set([
    hostOf(pageUrl),
    ...offerHosts,
    ...citationHosts,
  ].filter(Boolean)).size;

  if (
    canonical?.confidence === "High" ||
    (pageUrl && hasBrand && (hasModel || sourceHostCount >= 2))
  ) {
    return "high";
  }

  if (
    canonical?.confidence === "Medium" ||
    pageUrl ||
    hasBrand ||
    hasModel ||
    sourceHostCount >= 2
  ) {
    return "medium";
  }

  return "low";
}

export function assessProductReliability(
  product: ProductRecommendation,
): ProductReliabilityCheck {
  const priceTrust = product.priceTrust || assessProductPriceTrust(product);
  const price = assessProductPriceReliability({ ...product, priceTrust });
  const identity = identityConfidence(product);
  const warnings = [...price.warnings];
  const reasons: string[] = [];
  const credibilityTier = product.marketConfidence?.tier;

  if (identity === "low") {
    warnings.push("Product identity is weak or poorly verified.");
  } else {
    reasons.push(`Product identity confidence is ${identity}.`);
  }

  if (priceTrust.status === "verified") {
    reasons.push("Current price is verified from a product or retailer page.");
  } else if (priceTrust.status === "usable") {
    reasons.push("Price evidence is usable but not as strong as product-page pricing.");
  } else if (priceTrust.status === "needs_verification" || priceTrust.status === "missing") {
    warnings.push("Current price needs verification.");
  } else if (priceTrust.status === "suspicious") {
    warnings.push("Price evidence may be for an accessory, promo, payment, or variant instead of the full product.");
  }

  if (credibilityTier === "strong" || credibilityTier === "moderate") {
    reasons.push(`${product.marketConfidence?.label || "Market confidence"} found.`);
  } else if (credibilityTier === "weak") {
    warnings.push("Market evidence is weak.");
  }

  const canBeBestMatch =
    identity !== "low" &&
    priceTrust.status !== "suspicious" &&
    priceTrust.status !== "conflicting";

  return {
    canBeBestMatch,
    identityConfidence: identity,
    price: price.price,
    priceConfidence: price.confidence,
    reasons,
    warnings,
  };
}

export const productReliabilityTestExports = {
  assessProductPriceReliability,
};

import {
  parseBestProductPriceText,
  priceEvidenceLooksImplausiblyLow,
  plausibleProductPrice,
} from "./priceParsing.ts";
import type {
  ProductOffer,
  ProductPriceConfidence,
  ProductRecommendation,
  ProductReliabilityCheck,
} from "@/types/review-radar";

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

function fieldConfidenceRank(value: string | undefined) {
  if (value === "High") {
    return 3;
  }

  if (value === "Medium") {
    return 2;
  }

  if (value === "Low") {
    return 1;
  }

  return 0;
}

function sourceTypeRank(value: string | undefined) {
  if (value === "json_ld" || value === "manufacturer_page") {
    return 4;
  }

  if (value === "retailer_page" || value === "open_graph") {
    return 3;
  }

  if (value === "serper") {
    return 2;
  }

  if (value === "openai" || value === "snippet") {
    return 1;
  }

  return 0;
}

function offerStrength(offer: ProductOffer) {
  return (
    sourceTypeRank(offer.price.sourceType) * 10 +
    fieldConfidenceRank(offer.price.confidence)
  );
}

function pricedOffers(product: ProductRecommendation) {
  return (product.metadata?.offers || [])
    .filter(
      (offer) =>
        offer.price.value !== null &&
        Number.isFinite(offer.price.value) &&
        offer.price.value > 0,
    )
    .sort((first, second) => offerStrength(second) - offerStrength(first));
}

function priceSignals(product: ProductRecommendation) {
  const offers = pricedOffers(product);
  const offerPrices = offers.map((offer) => offer.price.value);
  const textPrice = parseBestProductPriceText(product.estimated_price_range);
  const plausible = plausibleProductPrice(offerPrices, textPrice, {
    category: product.category,
    productName: product.name,
  });

  return {
    offers,
    offerPrices,
    plausible,
    textPrice,
  };
}

function hasConflictingPriceEvidence(product: ProductRecommendation) {
  const { offerPrices, textPrice } = priceSignals(product);
  const signals = [
    ...offerPrices,
    ...(textPrice !== null ? [textPrice] : []),
  ].filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value > 0,
  );

  if (signals.length < 2) {
    return false;
  }

  const low = Math.min(...signals);
  const high = Math.max(...signals);

  return high >= 100 && low > 0 && high / low >= 2.25;
}

function textPriceLooksLikeRange(value: string | undefined) {
  return /\b(?:about|around|roughly|approximately)\b/i.test(value || "") ||
    /\$?\d[\d,]*(?:\.\d+)?\s*(?:-|to)\s*\$?\d[\d,]*(?:\.\d+)?/i.test(
      value || "",
    );
}

export function assessProductPriceReliability(
  product: ProductRecommendation,
): {
  confidence: ProductPriceConfidence;
  price: number | null;
  warnings: string[];
} {
  const { offers, plausible, textPrice } = priceSignals(product);
  const warnings: string[] = [];

  if (
    priceEvidenceLooksImplausiblyLow(
      offers.map((offer) => offer.price.value),
      textPrice,
      {
        category: product.category,
        productName: product.name,
      },
    )
  ) {
    warnings.push(
      "Price evidence looks implausibly low for the full product; it may be a payment, promo, accessory, or variant price.",
    );
    return {
      confidence: "unverified",
      price: null,
      warnings,
    };
  }

  if (hasConflictingPriceEvidence(product)) {
    warnings.push("Conflicting price evidence found across sources.");
    return {
      confidence: "conflicting",
      price: plausible,
      warnings,
    };
  }

  const strongestOffer = offers[0];

  if (strongestOffer && plausible !== null) {
    const sourceRank = sourceTypeRank(strongestOffer.price.sourceType);
    const confidenceRank = fieldConfidenceRank(strongestOffer.price.confidence);

    if (sourceRank >= 3 && confidenceRank >= 2) {
      return {
        confidence: "verified",
        price: plausible,
        warnings,
      };
    }

    return {
      confidence: "likely",
      price: plausible,
      warnings,
    };
  }

  if (textPrice !== null) {
    return {
      confidence: textPriceLooksLikeRange(product.estimated_price_range)
        ? "range"
        : "likely",
      price: textPrice,
      warnings,
    };
  }

  warnings.push("No verified current price found.");
  return {
    confidence: "unverified",
    price: null,
    warnings,
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
  const price = assessProductPriceReliability(product);
  const identity = identityConfidence(product);
  const warnings = [...price.warnings];
  const reasons: string[] = [];
  const credibilityTier = product.marketConfidence?.tier;

  if (identity === "low") {
    warnings.push("Product identity is weak or poorly verified.");
  } else {
    reasons.push(`Product identity confidence is ${identity}.`);
  }

  if (price.confidence === "verified") {
    reasons.push("Current price is verified from a product or retailer page.");
  } else if (price.confidence === "likely" || price.confidence === "range") {
    reasons.push("Price evidence is usable but not as strong as product-page pricing.");
  }

  if (credibilityTier === "strong" || credibilityTier === "moderate") {
    reasons.push(`${product.marketConfidence?.label || "Market confidence"} found.`);
  } else if (credibilityTier === "weak") {
    warnings.push("Market evidence is weak.");
  }

  const canBeBestMatch =
    identity !== "low" &&
    price.confidence !== "conflicting" &&
    price.confidence !== "unverified";

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

import type {
  ProductMetadata,
  ProductOffer,
  ProductPriceTrust,
} from "@/types/review-radar";
import {
  formatDollars,
  parseBestProductPriceText,
  plausibleProductPrice,
  priceEvidenceLooksImplausiblyLow,
} from "./priceParsing.ts";

type PriceSignal = {
  confidence: "High" | "Medium" | "Low";
  price: number;
  source: string;
  sourceType: string;
  url?: string;
};

type ProductPriceTrustInput = {
  category?: string | null;
  estimated_price_range?: string;
  metadata?: ProductMetadata;
  name: string;
};

function sourceTypeRank(value: string | undefined) {
  if (value === "json_ld" || value === "manufacturer_page") {
    return 5;
  }

  if (value === "retailer_page" || value === "open_graph") {
    return 4;
  }

  if (value === "serper") {
    return 3;
  }

  if (value === "openai" || value === "snippet") {
    return 1;
  }

  return 0;
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

function signalStrength(signal: PriceSignal) {
  return sourceTypeRank(signal.sourceType) * 10 + fieldConfidenceRank(signal.confidence);
}

function pricedOffers(product: ProductPriceTrustInput): PriceSignal[] {
  return (product.metadata?.offers || [])
    .filter(
      (offer): offer is ProductOffer =>
        offer.price.value !== null &&
        Number.isFinite(offer.price.value) &&
        offer.price.value > 0,
    )
    .map((offer) => ({
      confidence: offer.price.confidence,
      price: offer.price.value as number,
      source: offer.retailer || offer.price.sourceUrl || "offer metadata",
      sourceType: offer.price.sourceType,
      url: offer.url,
    }))
    .sort((first, second) => signalStrength(second) - signalStrength(first));
}

function textPriceSource(product: ProductPriceTrustInput): PriceSignal | null {
  const price = parseBestProductPriceText(product.estimated_price_range);

  return price === null
    ? null
    : {
        confidence: "Low",
        price,
        source: "recommendation text",
        sourceType: "openai",
      };
}

function textPriceLooksLikeRange(value: string | undefined) {
  return /\b(?:about|around|roughly|approximately)\b/i.test(value || "") ||
    /\$?\d[\d,]*(?:\.\d+)?\s*(?:-|to)\s*\$?\d[\d,]*(?:\.\d+)?/i.test(
      value || "",
    );
}

function hasConflictingSignals(signals: PriceSignal[]) {
  if (signals.length < 2) {
    return false;
  }

  const prices = signals.map((signal) => signal.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);

  return high >= 100 && low > 0 && high / low >= 2.25;
}

function statusDisplay(status: ProductPriceTrust["status"], price: number | null) {
  if (price !== null && (status === "verified" || status === "usable")) {
    return formatDollars(price);
  }

  if (price !== null && status === "conflicting") {
    return `${formatDollars(price)} needs verification`;
  }

  if (status === "suspicious") {
    return "Price not trusted";
  }

  if (status === "missing") {
    return "Price not found";
  }

  return "Price needs verification";
}

export function assessProductPriceTrust(
  product: ProductPriceTrustInput,
): ProductPriceTrust {
  const offerSignals = pricedOffers(product);
  const textSignal = textPriceSource(product);
  const allSignals = textSignal ? [textSignal, ...offerSignals] : offerSignals;
  const sources = Array.from(new Set(allSignals.map((signal) => signal.source)));
  const plausible = plausibleProductPrice(
    offerSignals.map((signal) => signal.price),
    textSignal?.price ?? null,
    {
      category: product.category,
      productName: product.name,
    },
  );
  const warnings: string[] = [];

  if (allSignals.length === 0) {
    warnings.push("No verified current price found.");
    return {
      canBeExactWithBudget: false,
      canUseForBudget: false,
      displayText: statusDisplay("missing", null),
      price: null,
      sources,
      status: "missing",
      warnings,
    };
  }

  if (
    priceEvidenceLooksImplausiblyLow(
      offerSignals.map((signal) => signal.price),
      textSignal?.price ?? null,
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
      canBeExactWithBudget: false,
      canUseForBudget: false,
      displayText: statusDisplay("suspicious", null),
      price: null,
      sources,
      status: "suspicious",
      warnings,
    };
  }

  if (hasConflictingSignals(allSignals)) {
    warnings.push("Conflicting price evidence found across sources.");
    return {
      canBeExactWithBudget: false,
      canUseForBudget: false,
      displayText: statusDisplay("conflicting", plausible),
      price: plausible,
      sources,
      status: "conflicting",
      warnings,
    };
  }

  const strongestOffer = offerSignals[0];

  if (strongestOffer && plausible !== null) {
    const strongestRank = signalStrength(strongestOffer);
    const status: ProductPriceTrust["status"] =
      strongestRank >= signalStrength({
        confidence: "Medium",
        price: strongestOffer.price,
        source: "",
        sourceType: "retailer_page",
      })
        ? "verified"
        : "usable";

    return {
      canBeExactWithBudget: true,
      canUseForBudget: true,
      displayText: statusDisplay(status, plausible),
      price: plausible,
      sources,
      status,
      warnings,
    };
  }

  if (textSignal) {
    // A specific, plausible text price (it already cleared the implausibly-low and
    // conflicting checks above) is good enough to test against a budget and to be an
    // exact match. Otherwise budget-only or thin-evidence searches return zero exact
    // matches even for clearly in-budget products, because retailers often bot-wall
    // the structured-offer fetch and only a recommendation-text price survives. A
    // vague range/approx ("around $250", "$250 to $350") stays unusable since it is
    // too imprecise for a firm budget. Cross-category: no product type is referenced.
    // Confidence stays capped (thin evidence) and the card still tells the shopper to
    // verify the current store price.
    const looksVague = textPriceLooksLikeRange(product.estimated_price_range);
    const trustedTextPrice = !looksVague && plausible !== null;

    warnings.push(
      trustedTextPrice
        ? "Price came from recommendation text; usable for budget but verify the current store price."
        : "Price came from recommendation text instead of product-page pricing.",
    );

    return {
      canBeExactWithBudget: trustedTextPrice,
      canUseForBudget: trustedTextPrice,
      displayText: `${formatDollars(textSignal.price)} needs verification`,
      price: textSignal.price,
      sources,
      status: "needs_verification",
      warnings,
    };
  }

  warnings.push("No trusted current price found.");
  return {
    canBeExactWithBudget: false,
    canUseForBudget: false,
    displayText: statusDisplay("missing", null),
    price: null,
    sources,
    status: "missing",
    warnings,
  };
}

export const productPriceTrustTestExports = {
  hasConflictingSignals,
  pricedOffers,
  textPriceLooksLikeRange,
  textPriceSource,
};

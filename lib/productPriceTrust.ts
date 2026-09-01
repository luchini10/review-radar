import type {
  ProductMetadata,
  ProductOffer,
  ProductPriceTrust,
} from "@/types/review-radar";
import {
  plausibleProductPrice,
  priceEvidenceLooksImplausiblyLow,
} from "./priceParsing.ts";

type PriceSignal = {
  confidence: "High" | "Medium" | "Low";
  price: number;
  sourceType: string;
};

type ProductPriceTrustInput = {
  category?: string | null;
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
        offer.price.value > 0 &&
        offer.priceCurrency.value?.toUpperCase() === "USD",
    )
    .map((offer) => ({
      confidence: offer.price.confidence,
      price: offer.price.value as number,
      sourceType: offer.price.sourceType,
    }))
    .sort((first, second) => signalStrength(second) - signalStrength(first));
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

export function assessProductPriceTrust(
  product: ProductPriceTrustInput,
): ProductPriceTrust {
  const offerSignals = pricedOffers(product);
  const allSignals = offerSignals;
  const strongestRank = Math.max(
    0,
    ...offerSignals.map((signal) => signalStrength(signal)),
  );
  const strongestSignals = offerSignals.filter(
    (signal) => signalStrength(signal) === strongestRank,
  );
  const plausible = plausibleProductPrice(
    strongestSignals.map((signal) => signal.price),
    null,
    {
      category: product.category,
      productName: product.name,
    },
  );
  if (allSignals.length === 0) {
    return {
      price: null,
      status: "missing",
    };
  }

  if (
    priceEvidenceLooksImplausiblyLow(
      strongestSignals.map((signal) => signal.price),
      null,
      {
        category: product.category,
        productName: product.name,
      },
    )
  ) {
    return {
      price: null,
      status: "suspicious",
    };
  }

  if (hasConflictingSignals(allSignals)) {
    return {
      price: plausible,
      status: "conflicting",
    };
  }

  const strongestOffer = offerSignals[0];

  if (strongestOffer && plausible !== null) {
    const status: ProductPriceTrust["status"] =
      strongestRank >= signalStrength({
        confidence: "Medium",
        price: strongestOffer.price,
        sourceType: "retailer_page",
      })
        ? "verified"
        : "usable";

    return {
      price: plausible,
      status,
    };
  }

  return {
    price: null,
    status: "missing",
  };
}

export const productPriceTrustTestExports = {
  hasConflictingSignals,
  pricedOffers,
};

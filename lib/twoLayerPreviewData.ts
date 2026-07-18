import type { TwoLayerProductCard } from "./twoLayerRecommendation.ts";
import type { TwoLayerDisplaySource } from "./twoLayerApiContract.ts";

export type TwoLayerPreviewSource = TwoLayerDisplaySource;

export const TWO_LAYER_PREVIEW_PATH = "/oai-t3-preview";

export function isTwoLayerPreviewAvailable(nodeEnv: string | undefined) {
  return nodeEnv === "development";
}

export const twoLayerPreviewSources: TwoLayerPreviewSource[] = [
  {
    id: "s1",
    label: "Manufacturer source",
    title: "Controlled manufacturer specification example",
    url: null,
  },
  {
    id: "s2",
    label: "Professional test",
    title: "Controlled independent test example",
    url: null,
  },
  {
    id: "s3",
    label: "Owner feedback",
    title: "Controlled owner-feedback example",
    url: null,
  },
  {
    id: "s4",
    label: "Commerce receipt",
    title: "Controlled exact-offer verification example",
    url: null,
  },
];

export const twoLayerPreviewCards = [
  {
    key: "example-durable-canister-c1",
    rank: 1,
    recommendationStatus: "Best Match",
    identity: {
      brand: "Example",
      product_name: "Example Durable Canister",
      model: "C1",
      variant: null,
    },
    identityVerification: {
      state: "not_verified",
      label: "Exact model and variant not independently verified",
      observedAt: null,
    },
    assessment: {
      why: {
        value:
          "This is the strongest research match for shoppers prioritizing durable construction, mixed-floor cleaning, and low ongoing maintenance.",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s1", "s2"],
      },
      bestFor: {
        value: "Best for larger homes with mixed floors and pets.",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s1", "s2"],
      },
      mainTradeoff: {
        value: "The main tradeoff is a heavier body that is less convenient on stairs.",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s2"],
      },
    },
    pros: [
      {
        value: "Strong whole-home cleaning design",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s1", "s2"],
      },
      {
        value: "Serviceable parts and a large bag",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s1"],
      },
    ],
    cons: [
      {
        value: "Bulky for frequent stair carrying",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s2"],
      },
    ],
    claims: [
      {
        claimType: "specification",
        value: "The manufacturer reports a sealed bagged filtration system.",
        trust: "source_reported",
        label: "Source-reported",
        sourceIds: ["s1"],
        evidenceScope: "unresolved",
      },
      {
        claimType: "professional_performance",
        value: "The cited test reports strong pet-hair pickup.",
        trust: "source_reported",
        label: "Source-reported",
        sourceIds: ["s2"],
        evidenceScope: "unresolved",
      },
    ],
    commerce: {
      state: "not_verified",
      label: "Check current price",
      priceAmount: null,
      currency: null,
      seller: null,
      productUrl: null,
      availability: null,
      observedAt: null,
    },
    image: {
      state: "not_verified",
      label: "Not independently verified",
      url: null,
    },
  },
  {
    key: "example-pet-upright-u2",
    rank: 2,
    recommendationStatus: "Best Match",
    identity: {
      brand: "Example",
      product_name: "Example Pet Upright",
      model: "U2",
      variant: "Blue",
    },
    identityVerification: {
      state: "verified",
      label: "Independently verified",
      observedAt: "2026-07-17T16:00:00.000Z",
    },
    assessment: {
      why: {
        value:
          "This is the strongest value-oriented upright in the controlled research example.",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s2", "s3"],
      },
      bestFor: {
        value: "Best for pet owners who prefer a familiar upright design.",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s2", "s3"],
      },
      mainTradeoff: {
        value: "It is less repairable than the durable canister example.",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s2"],
      },
    },
    pros: [
      {
        value: "Strong value for a full-size upright",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s2"],
      },
      {
        value: "Positive owner feedback for pet-hair cleaning",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s3"],
      },
    ],
    cons: [
      {
        value: "Heavier than a cordless stick",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s2"],
      },
    ],
    claims: [
      {
        claimType: "owner_feedback",
        value: "The cited owner sample frequently praises pickup and ease of use.",
        trust: "source_reported",
        label: "Source-reported",
        sourceIds: ["s3"],
        evidenceScope: "unresolved",
      },
    ],
    commerce: {
      state: "verified",
      label: "Independently verified",
      priceAmount: 449.99,
      currency: "USD",
      seller: "Example Retailer",
      productUrl: "https://example.com/products/example-pet-upright-u2",
      availability: "in_stock",
      observedAt: "2026-07-17T16:00:00.000Z",
    },
    image: {
      state: "not_verified",
      label: "Not independently verified",
      url: null,
    },
  },
  {
    key: "example-cordless-stick-s3",
    rank: 3,
    recommendationStatus: "Close Match",
    identity: {
      brand: "Example",
      product_name: "Example Cordless Stick",
      model: "S3",
      variant: "Copper",
    },
    identityVerification: {
      state: "not_verified",
      label: "Exact model and variant not independently verified",
      observedAt: null,
    },
    assessment: {
      why: {
        value:
          "This is a close match for shoppers who value quick cordless cleaning more than maximum runtime or capacity.",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s2", "s3"],
      },
      bestFor: {
        value: "Best for apartments and frequent small cleanups.",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s2"],
      },
      mainTradeoff: {
        value: "Runtime and bin capacity are lower than the full-size examples.",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s1", "s2"],
      },
    },
    pros: [
      {
        value: "Convenient for quick cleaning",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s2"],
      },
    ],
    cons: [
      {
        value: "Limited runtime under high power",
        trust: "research_synthesis",
        label: "AI research synthesis",
        sourceIds: ["s1", "s2"],
      },
    ],
    claims: [
      {
        claimType: "owner_feedback",
        value:
          "The owner evidence comes from a related color listing, so exact-variant applicability is unresolved.",
        trust: "source_reported",
        label: "Source-reported",
        sourceIds: ["s3"],
        evidenceScope: "family_or_variant",
      },
    ],
    commerce: {
      state: "not_verified",
      label: "Check current price",
      priceAmount: null,
      currency: null,
      seller: null,
      productUrl: null,
      availability: null,
      observedAt: null,
    },
    image: {
      state: "not_verified",
      label: "Not independently verified",
      url: null,
    },
  },
] satisfies TwoLayerProductCard[];

export function summarizeTwoLayerPreview(cards = twoLayerPreviewCards) {
  return {
    cardCount: cards.length,
    verifiedCommerceCount: cards.filter(
      (card) => card.commerce.state === "verified",
    ).length,
    unverifiedCommerceCount: cards.filter(
      (card) => card.commerce.state === "not_verified",
    ).length,
    verifiedIdentityCount: cards.filter(
      (card) => card.identityVerification.state === "verified",
    ).length,
    closeMatchCount: cards.filter(
      (card) => card.recommendationStatus === "Close Match",
    ).length,
  };
}

import { createHash } from "node:crypto";

import { z } from "zod";

import { classifyProductEligibility } from "./productEligibility.ts";
import { twoLayerDisplayText } from "./twoLayerDisplayText.ts";
import { normalizeTwoLayerSourceUrl } from "./twoLayerSourceUrl.ts";

export const TWO_LAYER_RESEARCH_VERSION = "oai-two-layer-research-v1";
export const TWO_LAYER_COMMERCE_RECEIPT_VERSION =
  "oai-two-layer-commerce-receipt-v1";
export const TWO_LAYER_PRESENTATION_VERSION = "oai-two-layer-presentation-v1";

export const TWO_LAYER_TRUST_LABELS = {
  research_synthesis: "AI research synthesis",
  source_reported: "Source-reported",
  verified_transactional: "Independently verified",
  unresolved: "Not independently verified",
} as const;

const nonEmptyText = z.string().trim().min(1);
const nullableText = z.string().trim().min(1).nullable();
const sourceId = z.string().regex(/^s[1-9][0-9]*$/);
const sourceIds = z.array(sourceId).min(1);
const httpUrl = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "URL must use HTTP or HTTPS");

const identitySchema = z
  .object({
    brand: nonEmptyText,
    product_name: nonEmptyText,
    model: nullableText,
    variant: nullableText,
    source_ids: sourceIds,
  })
  .strict();

const researchClaimSchema = z
  .object({
    claim_type: z.enum([
      "specification",
      "professional_performance",
      "owner_feedback",
      "warranty_or_support",
      "other",
    ]),
    text: nonEmptyText,
    source_ids: z.array(sourceId),
    evidence_scope: z.enum([
      "exact_model",
      "family_or_variant",
      "category_or_general",
      "unresolved",
    ]),
  })
  .strict();

const sourcedResearchTextSchema = z
  .object({
    text: nonEmptyText,
    source_ids: sourceIds,
  })
  .strict();

const recommendationSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    rank: z.number().int().min(1).max(10),
    recommendation_status: z.enum(["Best Match", "Close Match"]),
    identity: identitySchema,
    assessment: z
      .object({
        why: nonEmptyText,
        best_for: nonEmptyText,
        main_tradeoff: nonEmptyText,
        source_ids: sourceIds,
      })
      .strict(),
    pros: z.array(sourcedResearchTextSchema),
    cons: z.array(sourcedResearchTextSchema),
    claims: z.array(researchClaimSchema),
  })
  .strict();

export const twoLayerResearchSchema = z
  .object({
    version: z.literal(TWO_LAYER_RESEARCH_VERSION),
    research_text_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sources: z
      .array(
        z
          .object({
            id: sourceId,
            title: nonEmptyText,
            url: httpUrl,
            role: z.enum([
              "official_product",
              "purchase_page",
              "manufacturer_spec",
              "professional_test",
              "owner_feedback",
              "warranty_support",
              "other",
            ]),
          })
          .strict(),
      )
      .min(1),
    recommendations: z.array(recommendationSchema).min(1).max(10),
  })
  .strict();

export type TwoLayerResearch = z.infer<typeof twoLayerResearchSchema>;
export type TwoLayerIdentity = Omit<TwoLayerResearch["recommendations"][number]["identity"], "source_ids">;

const receiptIdentitySchema = z
  .object({
    brand: nonEmptyText,
    product_name: nonEmptyText,
    model: nullableText,
    variant: nullableText,
  })
  .strict();

export const twoLayerCommerceReceiptSchema = z
  .object({
    version: z.literal(TWO_LAYER_COMMERCE_RECEIPT_VERSION),
    product_key: nonEmptyText,
    target_identity_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    verified_identity: receiptIdentitySchema,
    source_url: httpUrl,
    source_title: nonEmptyText,
    seller: nonEmptyText,
    price_amount: z.number().finite().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    availability: z.literal("in_stock"),
    image_url: httpUrl.nullable(),
    observed_at: z.string().datetime({ offset: true }),
  })
  .strict();

export type TwoLayerCommerceReceipt = z.infer<
  typeof twoLayerCommerceReceiptSchema
>;

export function hashTwoLayerResearchText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedIdentityPart(value: string | null) {
  return (value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function twoLayerIdentityFingerprint(identity: TwoLayerIdentity) {
  const canonicalIdentity = [
    normalizedIdentityPart(identity.brand),
    normalizedIdentityPart(identity.product_name),
    normalizedIdentityPart(identity.model),
    normalizedIdentityPart(identity.variant),
  ].join("\u001f");
  return createHash("sha256").update(canonicalIdentity).digest("hex");
}

function normalizedRegistryUrl(value: string) {
  return normalizeTwoLayerSourceUrl(value);
}

function recommendationTextFields(
  recommendation: TwoLayerResearch["recommendations"][number],
) {
  return [
    recommendation.identity.brand,
    recommendation.identity.product_name,
    recommendation.identity.model,
    recommendation.identity.variant,
    recommendation.assessment.why,
    recommendation.assessment.best_for,
    recommendation.assessment.main_tradeoff,
    ...recommendation.pros.map((item) => item.text),
    ...recommendation.cons.map((item) => item.text),
    ...recommendation.claims.map((claim) => claim.text),
  ].filter((value): value is string => value !== null);
}

function referencedSourceIds(research: TwoLayerResearch) {
  return research.recommendations.flatMap((recommendation) => [
    ...recommendation.identity.source_ids,
    ...recommendation.assessment.source_ids,
    ...recommendation.pros.flatMap((item) => item.source_ids),
    ...recommendation.cons.flatMap((item) => item.source_ids),
    ...recommendation.claims.flatMap((claim) => claim.source_ids),
  ]);
}

export function validateTwoLayerResearchExtraction(input: {
  rawResearchText: string;
  responseSourceUrls: readonly string[];
  formattedOutput: unknown;
}): TwoLayerResearch {
  const research = twoLayerResearchSchema.parse(input.formattedOutput);
  const errors: string[] = [];

  if (
    research.research_text_sha256 !==
    hashTwoLayerResearchText(input.rawResearchText)
  ) {
    errors.push("research_text_hash_mismatch");
  }

  const sourceIdsInCatalog = research.sources.map((source) => source.id);
  if (new Set(sourceIdsInCatalog).size !== sourceIdsInCatalog.length) {
    errors.push("duplicate_source_id");
  }

  const sourceUrlsInCatalog = research.sources.map((source) =>
    normalizedRegistryUrl(source.url),
  );
  if (new Set(sourceUrlsInCatalog).size !== sourceUrlsInCatalog.length) {
    errors.push("duplicate_source_url");
  }

  const responseUrlRegistry = new Set(
    input.responseSourceUrls.map(normalizedRegistryUrl),
  );
  for (const source of research.sources) {
    if (!responseUrlRegistry.has(normalizedRegistryUrl(source.url))) {
      errors.push(`source_url_not_in_response_registry:${source.id}`);
    }
  }

  const sourceIdCatalog = new Set(sourceIdsInCatalog);
  for (const id of referencedSourceIds(research)) {
    if (!sourceIdCatalog.has(id)) {
      errors.push(`unknown_source_id:${id}`);
    }
  }

  const keys = research.recommendations.map((recommendation) =>
    recommendation.key,
  );
  if (new Set(keys).size !== keys.length) {
    errors.push("duplicate_recommendation_key");
  }

  let priorProductPosition = -1;
  research.recommendations.forEach((recommendation, index) => {
    if (recommendation.rank !== index + 1) {
      errors.push(`rank_order_mismatch:${recommendation.key}`);
    }
    const productPosition = input.rawResearchText.indexOf(
      recommendation.identity.product_name,
    );
    if (productPosition <= priorProductPosition) {
      errors.push(`recommendation_order_not_preserved:${recommendation.key}`);
    }
    priorProductPosition = productPosition;
    for (const field of recommendationTextFields(recommendation)) {
      if (!input.rawResearchText.includes(field)) {
        errors.push(`formatter_added_text:${recommendation.key}:${field}`);
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(`Invalid two-layer research extraction: ${errors.join(",")}`);
  }

  return research;
}

type TrustValue = {
  value: string;
  trust: "research_synthesis";
  label: (typeof TWO_LAYER_TRUST_LABELS)["research_synthesis"];
  sourceIds: string[];
};

export type TwoLayerProductCard = {
  key: string;
  rank: number;
  recommendationStatus: "Best Match" | "Close Match";
  identity: TwoLayerIdentity;
  identityVerification:
    | {
        state: "not_verified";
        label: "Exact model and variant not independently verified";
        observedAt: null;
      }
    | {
        state: "verified";
        label: (typeof TWO_LAYER_TRUST_LABELS)["verified_transactional"];
        observedAt: string;
      };
  assessment: {
    why: TrustValue;
    bestFor: TrustValue;
    mainTradeoff: TrustValue;
  };
  pros: TrustValue[];
  cons: TrustValue[];
  claims: Array<
    {
      claimType: TwoLayerResearch["recommendations"][number]["claims"][number]["claim_type"];
      value: string;
      sourceIds: string[];
      evidenceScope: TwoLayerResearch["recommendations"][number]["claims"][number]["evidence_scope"];
    } &
      (
        | {
            trust: "source_reported";
            label: (typeof TWO_LAYER_TRUST_LABELS)["source_reported"];
          }
        | {
            trust: "research_synthesis";
            label: (typeof TWO_LAYER_TRUST_LABELS)["research_synthesis"];
          }
      )
  >;
  commerce:
    | {
        state: "not_verified";
        label: "Check current price";
        priceAmount: null;
        currency: null;
        seller: null;
        productUrl: null;
        availability: null;
        observedAt: null;
      }
    | {
        state: "verified";
        label: (typeof TWO_LAYER_TRUST_LABELS)["verified_transactional"];
        priceAmount: number;
        currency: string;
        seller: string;
        productUrl: string;
        availability: "in_stock";
        observedAt: string;
      };
  image:
    | {
        state: "not_verified";
        label: (typeof TWO_LAYER_TRUST_LABELS)["unresolved"];
        url: null;
      }
    | {
        state: "verified";
        label: (typeof TWO_LAYER_TRUST_LABELS)["verified_transactional"];
        url: string;
      };
};

export type TwoLayerReceiptDecision = {
  productKey: string | null;
  status: "attached" | "rejected" | "ignored";
  reason:
    | "verified_exact_offer"
    | "invalid_receipt"
    | "unknown_product"
    | "multiple_receipts"
    | "target_fingerprint_mismatch"
    | "verified_identity_mismatch"
    | "not_direct_product_page";
};

function researchTrustValue(value: string, sourceIds: string[]): TrustValue {
  return {
    value: twoLayerDisplayText(value),
    trust: "research_synthesis",
    label: TWO_LAYER_TRUST_LABELS.research_synthesis,
    sourceIds: [...sourceIds],
  };
}

function unverifiedCommerce(): TwoLayerProductCard["commerce"] {
  return {
    state: "not_verified",
    label: "Check current price",
    priceAmount: null,
    currency: null,
    seller: null,
    productUrl: null,
    availability: null,
    observedAt: null,
  };
}

function unverifiedImage(): TwoLayerProductCard["image"] {
  return {
    state: "not_verified",
    label: TWO_LAYER_TRUST_LABELS.unresolved,
    url: null,
  };
}

function productKeyFromUnknown(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const key = (value as Record<string, unknown>).product_key;
  return typeof key === "string" && key.trim() ? key : null;
}

export function buildTwoLayerProductCards(
  input: {
    rawResearchText: string;
    responseSourceUrls: readonly string[];
    formattedOutput: unknown;
    receiptInputs: readonly unknown[];
  },
): {
  version: typeof TWO_LAYER_PRESENTATION_VERSION;
  cards: TwoLayerProductCard[];
  receiptDecisions: TwoLayerReceiptDecision[];
} {
  const research = validateTwoLayerResearchExtraction({
    rawResearchText: input.rawResearchText,
    responseSourceUrls: input.responseSourceUrls,
    formattedOutput: input.formattedOutput,
  });
  const decisions: TwoLayerReceiptDecision[] = [];
  const recommendations = new Map(
    research.recommendations.map((recommendation) => [
      recommendation.key,
      recommendation,
    ]),
  );
  const parsedReceipts: TwoLayerCommerceReceipt[] = [];

  for (const receiptInput of input.receiptInputs) {
    const result = twoLayerCommerceReceiptSchema.safeParse(receiptInput);
    if (!result.success) {
      decisions.push({
        productKey: productKeyFromUnknown(receiptInput),
        status: "rejected",
        reason: "invalid_receipt",
      });
      continue;
    }
    if (!recommendations.has(result.data.product_key)) {
      decisions.push({
        productKey: result.data.product_key,
        status: "ignored",
        reason: "unknown_product",
      });
      continue;
    }
    parsedReceipts.push(result.data);
  }

  const receiptsByProduct = new Map<string, TwoLayerCommerceReceipt[]>();
  for (const receipt of parsedReceipts) {
    const prior = receiptsByProduct.get(receipt.product_key) || [];
    prior.push(receipt);
    receiptsByProduct.set(receipt.product_key, prior);
  }

  const acceptedReceipts = new Map<string, TwoLayerCommerceReceipt>();
  for (const [productKey, receipts] of receiptsByProduct) {
    if (receipts.length !== 1) {
      for (const receipt of receipts) {
        decisions.push({
          productKey: receipt.product_key,
          status: "rejected",
          reason: "multiple_receipts",
        });
      }
      continue;
    }

    const receipt = receipts[0];
    const recommendation = recommendations.get(productKey);
    if (!recommendation) continue;
    const identity: TwoLayerIdentity = {
      brand: recommendation.identity.brand,
      product_name: recommendation.identity.product_name,
      model: recommendation.identity.model,
      variant: recommendation.identity.variant,
    };
    const targetFingerprint = twoLayerIdentityFingerprint(identity);

    if (receipt.target_identity_fingerprint !== targetFingerprint) {
      decisions.push({
        productKey,
        status: "rejected",
        reason: "target_fingerprint_mismatch",
      });
      continue;
    }
    if (
      twoLayerIdentityFingerprint(receipt.verified_identity) !==
      targetFingerprint
    ) {
      decisions.push({
        productKey,
        status: "rejected",
        reason: "verified_identity_mismatch",
      });
      continue;
    }

    const eligibility = classifyProductEligibility({
      brand: receipt.verified_identity.brand,
      name: receipt.source_title,
      productName: receipt.verified_identity.product_name,
      price: receipt.price_amount,
      retailer: receipt.seller,
      imageUrl: receipt.image_url,
      sourceTitle: receipt.source_title,
      sourceType: "offer",
      url: receipt.source_url,
    });
    if (
      eligibility.status !== "buyable_product" ||
      !eligibility.canRenderAsProductCard
    ) {
      decisions.push({
        productKey,
        status: "rejected",
        reason: "not_direct_product_page",
      });
      continue;
    }

    acceptedReceipts.set(productKey, receipt);
    decisions.push({
      productKey,
      status: "attached",
      reason: "verified_exact_offer",
    });
  }

  const cards = research.recommendations.map((recommendation) => {
    const rawIdentity: TwoLayerIdentity = {
      brand: recommendation.identity.brand,
      product_name: recommendation.identity.product_name,
      model: recommendation.identity.model,
      variant: recommendation.identity.variant,
    };
    const identity: TwoLayerIdentity = {
      brand: twoLayerDisplayText(rawIdentity.brand),
      product_name: twoLayerDisplayText(rawIdentity.product_name),
      model: rawIdentity.model ? twoLayerDisplayText(rawIdentity.model) : null,
      variant: rawIdentity.variant
        ? twoLayerDisplayText(rawIdentity.variant)
        : null,
    };
    const receipt = acceptedReceipts.get(recommendation.key);
    return {
      key: recommendation.key,
      rank: recommendation.rank,
      recommendationStatus: recommendation.recommendation_status,
      identity,
      identityVerification: receipt
        ? {
            state: "verified" as const,
            label: TWO_LAYER_TRUST_LABELS.verified_transactional,
            observedAt: receipt.observed_at,
          }
        : {
            state: "not_verified" as const,
            label: "Exact model and variant not independently verified" as const,
            observedAt: null,
          },
      assessment: {
        why: researchTrustValue(
          recommendation.assessment.why,
          recommendation.assessment.source_ids,
        ),
        bestFor: researchTrustValue(
          recommendation.assessment.best_for,
          recommendation.assessment.source_ids,
        ),
        mainTradeoff: researchTrustValue(
          recommendation.assessment.main_tradeoff,
          recommendation.assessment.source_ids,
        ),
      },
      pros: recommendation.pros.map((item) =>
        researchTrustValue(item.text, item.source_ids),
      ),
      cons: recommendation.cons.map((item) =>
        researchTrustValue(item.text, item.source_ids),
      ),
      claims: recommendation.claims.map((claim) => ({
        claimType: claim.claim_type,
        value: twoLayerDisplayText(claim.text),
        ...(claim.source_ids.length > 0
          ? {
              trust: "source_reported" as const,
              label: TWO_LAYER_TRUST_LABELS.source_reported,
            }
          : {
              trust: "research_synthesis" as const,
              label: TWO_LAYER_TRUST_LABELS.research_synthesis,
            }),
        sourceIds: [...claim.source_ids],
        evidenceScope: claim.evidence_scope,
      })),
      commerce: receipt
        ? {
            state: "verified" as const,
            label: TWO_LAYER_TRUST_LABELS.verified_transactional,
            priceAmount: receipt.price_amount,
            currency: receipt.currency,
            seller: receipt.seller,
            productUrl: receipt.source_url,
            availability: receipt.availability,
            observedAt: receipt.observed_at,
          }
        : unverifiedCommerce(),
      image:
        receipt?.image_url
          ? {
              state: "verified" as const,
              label: TWO_LAYER_TRUST_LABELS.verified_transactional,
              url: receipt.image_url,
            }
          : unverifiedImage(),
    } satisfies TwoLayerProductCard;
  });

  return {
    version: TWO_LAYER_PRESENTATION_VERSION,
    cards,
    receiptDecisions: decisions,
  };
}

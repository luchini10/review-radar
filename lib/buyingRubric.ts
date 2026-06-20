import type {
  ProductRecommendation,
  RecommendationApiRequest,
} from "@/types/review-radar";

export type RubricFit = {
  boost: number;
  matchedSignals: string[];
  missingSignals: string[];
  penalty: number;
  profileKey: string;
  redFlags: string[];
};

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceText(product: ProductRecommendation) {
  return [
    product.name,
    product.category,
    product.metadata?.title?.value || "",
    product.metadata?.brand?.value || "",
    product.product_page_url,
    product.why_recommended,
    product.best_for,
    product.price_value_verdict,
    ...product.pros,
    ...product.cons,
    ...product.common_complaints,
    ...product.citations.map(
      (citation) => `${citation.title} ${citation.what_it_supports} ${citation.url}`,
    ),
    ...(product.evidenceBucket?.positiveEvidence || []).map(
      (item) => `${item.claim} ${item.sourceTitle} ${item.snippet}`,
    ),
    ...(product.evidenceBucket?.negativeEvidence || []).map(
      (item) => `${item.claim} ${item.sourceTitle} ${item.snippet}`,
    ),
    ...(product.evidenceBucket?.ownerOpinion?.praises || []),
    ...(product.evidenceBucket?.ownerOpinion?.concerns || []),
  ].join(" ");
}

function itemMatches(text: string, item: string) {
  const normalizedItem = normalizeText(item);

  if (!normalizedItem) {
    return false;
  }

  if (text.includes(normalizedItem)) {
    return true;
  }

  const tokens = normalizedItem
    .split(" ")
    .filter(
      (token) =>
        token.length > 3 &&
        !/^(with|that|from|good|best|high|low|clear|named|page|product|explicit|mentions|without|details|balanced|equivalent|version|specific)$/.test(
          token,
        ),
    );

  const matchedTokens = tokens.filter((token) => text.includes(token));

  if (tokens.length === 1) {
    return matchedTokens.length === 1 && tokens[0].length >= 6;
  }

  if (tokens.length === 2) {
    return matchedTokens.length === 2;
  }

  return (
    matchedTokens.length >= Math.min(3, Math.ceil(tokens.length * 0.45)) &&
    matchedTokens.length / tokens.length >= 0.4
  );
}

function supportedItems(text: string, items: string[]) {
  return items.filter((item) => itemMatches(text, item));
}

export function computeRubricFit(
  product: ProductRecommendation,
  input: RecommendationApiRequest,
): RubricFit {
  const rubric = input.discoveryStrategy?.buyingRubric;

  if (!rubric) {
    return {
      boost: 0,
      matchedSignals: [],
      missingSignals: [],
      penalty: 0,
      profileKey: "none",
      redFlags: [],
    };
  }

  const text = normalizeText(evidenceText(product));
  const qualityMatches = supportedItems(text, rubric.qualitySignals);
  const reviewMatches = supportedItems(text, rubric.reviewSignals);
  const factMatches = supportedItems(text, rubric.mustVerifyFacts);
  const redFlags = supportedItems(text, rubric.redFlags);
  const missingSignals = rubric.mustVerifyFacts
    .filter((item) => !factMatches.includes(item))
    .slice(0, 6);
  const boost = Math.min(
    12,
    qualityMatches.length * 2.5 + reviewMatches.length * 2 + factMatches.length,
  );
  const penalty = Math.min(14, redFlags.length * 5 + missingSignals.length * 0.75);

  return {
    boost,
    matchedSignals: [...qualityMatches, ...reviewMatches, ...factMatches].slice(0, 10),
    missingSignals,
    penalty,
    profileKey: normalizeText(rubric.category) || "openai_rubric",
    redFlags,
  };
}

export const buyingRubricTestExports = {
  itemMatches,
};

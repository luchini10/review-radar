import type {
  ProductRecommendation,
  RecommendationApiRequest,
  RecommendationResult,
  RequirementComparison,
  StructuredRequirements,
} from "@/types/review-radar";
import type { SelectedSmartFeature } from "@/types/smart-features";
import {
  brandAliasesFor,
  brandEvidenceMatches,
  canonicalBrand,
  detectKnownBrands,
} from "./brandMatching.ts";
import { isComponentSubstitution } from "./formFactor.ts";
import { baseProductCategoryFromQuery } from "./productCategory.ts";
import {
  parseBestProductPriceText,
  parseMaxBudgetAmount,
  plausibleProductPrice,
} from "./priceParsing.ts";
import { sanitizeProsAndCons } from "./productCopySanitizer.ts";
import {
  evaluateSpecConstraint,
  extractProductSpecs,
} from "./specExtraction.ts";
import {
  selectedSmartFeatureLabel,
  selectedSmartFeatureSearchText,
} from "./smartFeatureSelection.ts";
import {
  buildDirectPositiveProductFactText,
  buildNegativeProductFactText,
  buildPositiveProductFactText,
  buildProductFactText,
  hasSemanticNegativeContext,
  isConcreteSemanticAttribute,
  matchSemanticFeatureEvidence,
  semanticAliasesFor,
  semanticCanonicalValue,
  violatesSemanticDealbreaker,
} from "./semanticMatching.ts";

export type ProductRequirements = {
  category?: string;
  budget?: string;
  priorities?: string;
  avoid?: string;
  selectedFeatures?: SelectedSmartFeature[];
  extractedRequirements?: StructuredRequirements;
};

export type RequirementValidationResult = {
  isMatch: boolean;
  matchedRequirements: string[];
  missingRequirements: string[];
  unknownRequirements: string[];
  softUnknownRequirements: string[];
  requirementComparisons: RequirementComparison[];
  disqualifiedReason: string | null;
};

type ProductLike = Pick<
  ProductRecommendation,
  | "best_for"
  | "category"
  | "citations"
  | "common_complaints"
  | "cons"
  | "estimated_price_range"
  | "evidenceBucket"
  | "name"
  | "not_for"
  | "price_value_verdict"
  | "product_image_url"
  | "product_page_url"
  | "recommendation_type"
  | "pros"
  | "why_recommended"
  | "metadata"
>;

type FilterableRecommendationResult = Omit<
  RecommendationResult,
  "exactMatches" | "nearMatches"
> & {
  exactMatches?: ProductRecommendation[];
  nearMatches?: ProductRecommendation[];
};

type NumericConstraint = {
  dimension: "width" | "depth" | "height" | "length";
  kind: "max" | "min";
  label: string;
  unit: "in" | "ft";
  value: number;
};

type TextConstraint = {
  label: string;
  value: string;
};

type ParsedSelectedFeature = {
  label: string;
  name: string;
  value: string;
};

type SelectedFeatureGroup = {
  label: string;
  name: string;
  values: string[];
};

const NO_EXACT_MATCHES_MESSAGE =
  "No exact matches found for these requirements. Try removing one requirement or increasing the budget.";
const GENERIC_PRODUCT_WORDS = new Set([
  "bed",
  "chair",
  "chaise",
  "compact",
  "convertible",
  "couch",
  "leather",
  "lounge",
  "loveseat",
  "modern",
  "sectional",
  "sleeper",
  "sofa",
  "the",
]);
const BROAD_RETAILER_DOMAINS = [
  "amazon.com",
  "aliexpress.com",
  "costco.com",
  "ebay.com",
  "target.com",
  "temu.com",
  "walmart.com",
];

const categorySynonyms: Record<string, string[]> = {
  couch: ["couch", "sofa", "loveseat", "sectional", "settee"],
  oven: ["oven", "range", "stove"],
  sofa: ["sofa", "couch", "loveseat", "sectional", "settee"],
};

const comparableFeatureValues: Record<string, string[]> = {
  color: [
    "beige",
    "black",
    "blue",
    "brown",
    "charcoal",
    "cream",
    "gray",
    "grey",
    "green",
    "ivory",
    "navy",
    "red",
    "stainless steel",
    "tan",
    "taupe",
    "white",
  ],
  material: [
    "solid wood",
    "hardwood",
    "engineered wood",
    "fabric",
    "leather",
    "linen",
    "mdf",
    "metal",
    "microfiber",
    "particleboard",
    "performance fabric",
    "plastic",
    "polyester",
    "upholstered",
    "upholstery",
    "velvet",
    "wood",
  ],
  size: [
    "california king",
    "compact",
    "full",
    "full xl",
    "king",
    "large",
    "loveseat",
    "queen",
    "small",
    "split king",
    "twin",
    "twin xl",
  ],
};

const requiredFeatureAliases: Record<string, string[]> = {
  allergies: ["allergies", "allergy", "allergy-friendly", "allergen", "allergens"],
  allergy: ["allergy", "allergies", "allergy-friendly", "allergen", "allergens"],
  "allergy-friendly": ["allergy-friendly", "allergy", "allergies", "allergen", "allergens"],
  "battery included": [
    "battery included",
    "batteries included",
    "includes battery",
    "includes batteries",
    "with battery",
    "with batteries",
    "battery and charger",
    "batteries and charger",
    "battery kit",
  ],
  "box spring required": ["box spring required", "requires box spring"],
  "brushless motor": ["brushless motor", "brushless"],
  "charger included": [
    "charger included",
    "includes charger",
    "with charger",
    "battery and charger",
  ],
  "cordless": ["cordless", "battery powered"],
  "drawer": ["drawer", "drawers"],
  "drawers": ["drawers", "drawer"],
  "hardwood floors": ["hardwood floors", "hard floors", "wood floors"],
  hepa: ["hepa", "true hepa", "h13 hepa", "hepa filter", "hepa filtration"],
  "hepa filter": ["hepa filter", "hepa filtration", "true hepa", "h13 hepa", "hepa"],
  "hdmi 2.1": ["hdmi 2.1", "hdmi2.1", "hdmi 2 1"],
  "ice maker": [
    "ice maker",
    "icemaker",
    "ice-maker",
    "with ice",
    "w ice",
    "ice in",
    "ice included",
  ],
  "no box spring": [
    "no box spring",
    "no box spring required",
    "box spring not required",
    "no box spring needed",
    "box spring not needed",
    "no foundation required",
    "slat support",
  ],
  "left-facing": ["left-facing", "left facing", "left hand facing", "left arm facing", "laf"],
  "left facing": ["left-facing", "left facing", "left hand facing", "left arm facing", "laf"],
  "pet-friendly": ["pet-friendly", "pet friendly", "pet-friendly fabric", "performance fabric"],
  "pet friendly": ["pet-friendly", "pet friendly", "pet-friendly fabric", "performance fabric"],
  "pet hair": ["pet hair", "pets", "pet"],
  "solid wood": ["solid wood", "solid-wood", "hardwood", "real wood"],
  "storage drawers": ["storage drawers", "drawers", "storage drawer"],
  "third rack": ["third rack", "3rd rack"],
  "120hz": ["120hz", "120 hz", "120-hz", "native 120", "120hz refresh"],
  "vented": ["vented", "external venting", "exhaust vent"],
  "window kit": ["window kit", "window installation kit"],
};

const avoidSynonyms: Record<string, string[]> = {
  "bad reviews": ["bad reviews", "poor reviews", "negative reviews", "low ratings"],
  "bad battery life": [
    "bad battery life",
    "poor battery life",
    "weak battery",
    "short battery life",
  ],
  "hard to assemble": [
    "hard to assemble",
    "difficult to assemble",
    "hard to put together",
    "difficult to put together",
    "complicated assembly",
  ],
  "hard to clean": [
    "hard to clean",
    "difficult to clean",
    "hard to maintain",
    "difficult to maintain",
  ],
  loud: ["loud", "noisy", "noise"],
  noisy: ["noisy", "loud", "noise"],
  "upholstered headboard": [
    "upholstered headboard",
    "upholstery headboard",
    "upholstered bed frame",
    "upholstered bed",
    "upholstered platform bed",
    "fabric headboard",
    "padded headboard",
  ],
};

type ProductTypeConflictRule = {
  allowedEvidence?: RegExp;
  conflictingEvidence: RegExp;
  requestedCategory: RegExp;
};

const productTypeConflictRules: ProductTypeConflictRule[] = [
  {
    allowedEvidence: /\b(?:sectional|sofa|couch|loveseat)\b/,
    conflictingEvidence: /\b(?:ottoman|bench|coffee table|side table|mattress|bed frame)\b/,
    requestedCategory: /\b(?:sectional|sofa|couch|loveseat)\b/,
  },
  {
    allowedEvidence:
      /\b(?:office chair|task chair|desk chair|ergonomic chair|computer chair|executive chair|mesh chair|work chair)\b/,
    conflictingEvidence:
      /\b(?:accent chair|dining chair|lounge chair|pillow|cushion|chair mat|floor mat|seat cover)\b/,
    requestedCategory: /\b(?:office chair|task chair|desk chair|computer chair)\b/,
  },
  {
    allowedEvidence: /\b(?:bed frame|platform bed|storage bed)\b/,
    conflictingEvidence: /\b(?:mattress|nightstand|dresser|headboard only)\b/,
    requestedCategory: /\bbed frame\b/,
  },
  {
    allowedEvidence:
      /\bmattress\b(?!\s+(?:base|foundation|frame|pad|platform|protector|support|topper)\b)/,
    conflictingEvidence:
      /\b(?:bed|bed frame|platform bed|storage bed|upholstered bed|headboard|foundation|box spring|bunkie board)\b/,
    requestedCategory: /\bmattress\b/,
  },
  {
    allowedEvidence: /\b(?:pressure washer|power washer|high pressure washer|psi|gpm|spray gun|spray wand|foam cannon|foam lance|soap cannon)\b/,
    conflictingEvidence: /\b(?:washer dryer|washer and dryer|electric dryer|front load washer|top load washer|laundry center|laundry tower|washing machine|dryer set|laundry)\b/,
    requestedCategory: /\bpressure washer\b/,
  },
  {
    conflictingEvidence: /\b(?:monitor|display|speaker|subwoofer|soundbar|amplifier|receiver|projector|camera|headphones|earbuds)\b/,
    requestedCategory: /\b(?:tv stand|media console|media unit|entertainment center|bookcase|bookshelf|shelving unit|storage cabinet)\b/,
  },
  {
    allowedEvidence: /\b(?:speaker|subwoofer|soundbar|amplifier|receiver|audio)\b/,
    conflictingEvidence: /\b(?:tv stand|media console|sofa|couch|chair|table|dresser|bed frame)\b/,
    requestedCategory: /\b(?:speaker|subwoofer|soundbar|amplifier|receiver)\b/,
  },
];

const requiredCategoryEvidenceRules: Array<{
  evidence: RegExp;
  requestedCategory: RegExp;
}> = [
  {
    evidence: /\b(?:sectional|modular sofa|l[\s-]?shaped sofa|sofa with chaise|chaise sofa)\b/,
    requestedCategory: /\bsectional\b/,
  },
];

const concreteAvoidPhrases = new Set([
  "fabric headboard",
  "padded headboard",
  "upholstered bed",
  "upholstered bed frame",
  "upholstered headboard",
  "upholstered platform bed",
  "upholstery headboard",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/(\d)\s*[-]?\s*(?:feet|foot|ft\.?)\b/g, "$1 ft")
    .replace(/(\d)\s*[-]?\s*(?:inches|inch|in\.?)\b/g, "$1 in")
    .replace(/[^a-z0-9$."'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textMentionsTerm(text: string, term: string) {
  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeText(term);

  if (!normalizedTerm) {
    return false;
  }

  const pattern = escapeRegExp(normalizedTerm).replace(/\s+/g, "\\s+");

  return new RegExp(`(^|\\W)${pattern}(\\W|$)`, "i").test(normalizedText);
}

function productNameAliases(name: string) {
  const normalizedName = normalizeText(name);
  const words = normalizedName.split(" ").filter(Boolean);
  const aliases = new Set<string>([normalizedName]);
  const firstMeaningfulWord = words.find(
    (word) => word.length >= 4 && !GENERIC_PRODUCT_WORDS.has(word),
  );

  if (firstMeaningfulWord) {
    aliases.add(firstMeaningfulWord);
  }

  if (words.length >= 2) {
    aliases.add(words.slice(0, 2).join(" "));
  }

  return Array.from(aliases).filter((alias) => alias.length >= 4);
}

export function getUnexpectedProductMentions(
  text: string,
  displayedProductNames: string[],
  knownProductNames: string[],
) {
  const allowedAliases = new Set(
    displayedProductNames.flatMap((name) => productNameAliases(name)),
  );

  return knownProductNames.filter((name) => {
    const aliases = productNameAliases(name);
    const isDisplayed = aliases.some((alias) => allowedAliases.has(alias));

    if (isDisplayed) {
      return false;
    }

    return aliases.some((alias) => textMentionsTerm(text, alias));
  });
}

function summarizeDisplayedProduct(product: ProductRecommendation) {
  return `${product.recommendation_type}: ${product.name}`;
}

export function buildAdviceFromDisplayedResults(
  recommendations: ProductRecommendation[],
) {
  if (recommendations.length === 0) {
    return NO_EXACT_MATCHES_MESSAGE;
  }

  const productList = recommendations.map(summarizeDisplayedProduct).join("; ");
  const exactMatchSentence =
    recommendations.length < 5
      ? `Only ${recommendations.length} exact ${
          recommendations.length === 1 ? "match was" : "matches were"
        } found for your requirements.`
      : "These are the exact matches found for your requirements.";

  if (recommendations.length === 1) {
    return `${exactMatchSentence} The validated option is ${productList}. Review its citations, current price, warranty, availability, and return policy before buying.`;
  }

  return `${exactMatchSentence} Compare only these displayed options: ${productList}. Choose based on the recommendation type, current price, citations, warranty, availability, and return policy.`;
}

function removeRejectedProductReferences(
  items: string[],
  displayedProductNames: string[],
  knownProductNames: string[],
) {
  return items.filter(
    (item) =>
      getUnexpectedProductMentions(
        item,
        displayedProductNames,
        knownProductNames,
      ).length === 0,
  );
}

export function ensureFinalAdviceUsesDisplayedProducts<T extends RecommendationResult>(
  result: T,
  knownProductNames: string[],
): T {
  const displayedProductNames = result.recommendations.map(
    (recommendation) => recommendation.name,
  );
  const unexpectedMentions = getUnexpectedProductMentions(
    result.final_buying_advice,
    displayedProductNames,
    knownProductNames,
  );
  const advice =
    unexpectedMentions.length > 0 || result.recommendations.length < 5
      ? buildAdviceFromDisplayedResults(result.recommendations)
      : result.final_buying_advice;

  return {
    ...result,
    final_buying_advice: advice,
    what_to_avoid: removeRejectedProductReferences(
      result.what_to_avoid,
      displayedProductNames,
      knownProductNames,
    ),
  };
}

function termPattern(term: string) {
  return escapeRegExp(normalizeText(term)).replace(/\s+/g, "\\s+");
}

function containsTerm(text: string, term: string) {
  const normalizedTerm = normalizeText(term);

  if (!normalizedTerm) {
    return false;
  }

  return new RegExp(`(^|\\W)${termPattern(normalizedTerm)}(\\W|$)`, "i").test(
    text,
  );
}

function normalizedFeatureTerm(value: string) {
  return normalizeText(value).replace(/^(?:a|an|the)\s+/, "");
}

function aliasesForRequiredFeature(value: string) {
  const normalizedValue = normalizedFeatureTerm(value);
  const aliases = new Set<string>([
    value,
    normalizedValue,
    semanticCanonicalValue(value),
    ...semanticAliasesFor(value),
  ]);
  const isNoBoxSpringRequirement =
    /\bno box spring\b|\bbox spring not required\b|\bbox spring not needed\b|\bno foundation required\b/.test(
      normalizedValue,
    );

  for (const [key, keyAliases] of Object.entries(requiredFeatureAliases)) {
    const normalizedKey = normalizedFeatureTerm(key);

    if (isNoBoxSpringRequirement && normalizedKey === "box spring required") {
      continue;
    }

    if (
      normalizedValue === normalizedKey ||
      normalizedValue.includes(normalizedKey) ||
      normalizedKey.includes(normalizedValue)
    ) {
      keyAliases.forEach((alias) => aliases.add(alias));
    }
  }

  return Array.from(aliases).filter(Boolean);
}

// Tokens that carry little requirement meaning on their own ("Brushless
// motor" is proven by "brushless"; "Battery included" by "battery" in a
// positive context). Used by the token-level matching fallback below.
const WEAK_FEATURE_TOKENS = new Set([
  "and",
  "built",
  "capability",
  "capable",
  "design",
  "edition",
  "equipped",
  "feature",
  "featured",
  "features",
  "function",
  "include",
  "included",
  "includes",
  "including",
  "mode",
  "motor",
  "option",
  "options",
  "series",
  "source",
  "support",
  "supported",
  "supports",
  "system",
  "tech",
  "technology",
  "type",
  "with",
]);

const NEGATION_BEFORE_STEMS = [
  "exclud",
  "lack",
  "lacking",
  "miss",
  "missing",
  "no",
  "not",
  "without",
];

function stemFeatureToken(token: string) {
  return token.replace(/ies$/, "y").replace(/(?:ed|ing|es|s)$/, "");
}

function strongFeatureTokens(value: string) {
  return Array.from(
    new Set(
      normalizedFeatureTerm(value)
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !WEAK_FEATURE_TOKENS.has(token))
        .map(stemFeatureToken)
        .filter((token) => token.length >= 3),
    ),
  );
}

function stemmedTextTokens(text: string) {
  return normalizeText(text).split(/\s+/).map(stemFeatureToken);
}

function matchesAllStrongTokens(text: string, value: string) {
  const strongTokens = strongFeatureTokens(value);

  if (strongTokens.length === 0) {
    return false;
  }

  const textTokens = new Set(stemmedTextTokens(text));

  return strongTokens.every((token) => textTokens.has(token));
}

function negativePhraseFollows(after: string[]) {
  for (let index = 0; index < after.length; index += 1) {
    const token = after[index];
    const nextToken = after[index + 1] || "";

    if (token === "unavailable" || token === "absent" || token.startsWith("exclud")) {
      return true;
    }

    if (token === "sold" && nextToken.startsWith("separat")) {
      return true;
    }

    if (token === "not" && (nextToken.startsWith("includ") || nextToken === "available")) {
      return true;
    }
  }

  return false;
}

function strongTokenHasNegativeContext(text: string, value: string) {
  const strongTokens = strongFeatureTokens(value);

  if (strongTokens.length === 0) {
    return false;
  }

  // Negation words that are part of the requirement itself ("no box spring
  // required") must not count as negative context around it.
  const valueTokens = new Set(stemmedTextTokens(value));
  const beforeNegations = NEGATION_BEFORE_STEMS.filter(
    (negation) => !valueTokens.has(negation),
  );
  const textTokens = stemmedTextTokens(text);

  return strongTokens.some((token) =>
    textTokens.some((textToken, index) => {
      if (textToken !== token) {
        return false;
      }

      const before = textTokens.slice(Math.max(0, index - 3), index);

      if (before.some((nearby) => beforeNegations.includes(nearby))) {
        return true;
      }

      return negativePhraseFollows(textTokens.slice(index + 1, index + 6));
    }),
  );
}

function containsRequiredFeature(text: string, value: string) {
  const semanticMatch = matchSemanticFeatureEvidence(text, value);

  if (semanticMatch.status === "pass") {
    return true;
  }

  if (semanticMatch.status === "fail") {
    return false;
  }

  return (
    aliasesForRequiredFeature(value).some((alias) => containsTerm(text, alias)) ||
    matchesAllStrongTokens(text, value)
  );
}

// Shared with the evidence-rescue step so candidate/organic evidence is
// matched with the same rules used by requirement validation.
export function featureEvidenceSupports(text: string, value: string) {
  const normalized = normalizeText(text);

  return (
    containsRequiredFeature(normalized, value) &&
    !hasNegativeContextForRequiredFeature(normalized, value)
  );
}

function oppositeRequiredFeatureAliases(value: string) {
  const normalizedValue = normalizedFeatureTerm(value);

  if (/left[\s-]?facing|left hand facing|left arm facing|\blaf\b/.test(normalizedValue)) {
    return ["right-facing", "right facing", "right hand facing", "right arm facing", "raf"];
  }

  if (/right[\s-]?facing|right hand facing|right arm facing|\braf\b/.test(normalizedValue)) {
    return ["left-facing", "left facing", "left hand facing", "left arm facing", "laf"];
  }

  return [];
}

function conflictingRequiredFeatureValue(text: string, value: string) {
  return oppositeRequiredFeatureAliases(value).find((alias) =>
    containsTerm(text, alias),
  );
}

function hasNegativeContextForRequiredFeature(text: string, value: string) {
  return (
    hasSemanticNegativeContext(text, value) ||
    aliasesForRequiredFeature(value).some((alias) =>
      hasNegativeContextForTerm(text, alias),
    ) || strongTokenHasNegativeContext(text, value)
  );
}

function productText(product: ProductLike) {
  return normalizeText(buildProductFactText(product));
}

function productNameLooksGeneric(name: string) {
  const genericPatterns = [
    /\bfor sale\b/i,
    /\bsearch results?\b/i,
    /\bresults for\b/i,
    /^\s*compare\s+(?:at|prices?|stores?)\b/i,
    /\bcompare\s+at\s+\d+\+?\s+stores\b/i,
    /\bprice comparison\b/i,
    /\bshop\b/i,
    /\bshopping\b/i,
    /\bcategory\b/i,
    /\bcollection\b/i,
    /\bbuy online\b/i,
    /^\s*how\s+to\b/i,
    /\b(?:buying guide|measurement guide|measuring guide|size guide)\b/i,
    /\b(?:buying advice|shopping advice|purchase advice)\b/i,
    /\b(?:what to consider|how to choose|which .+ should|so many models)\b/i,
    /\b(?:anyone|has anyone)\s+(?:purchased|tried|used|recommend)\b/i,
    /\b(?:customer reviews?|reviews?|questions?)\s+for\b/i,
    /\breviews?\s*(?:&|and|-|\/)\s*guides?\b/i,
    /\breviews?\s*$/i,
    /\bcomplaints?\s+(?:about|for|with|on)\b/i,
    /\b(?:support article|help library|error code list|troubleshooting|recall notice)\b/i,
    /\b(?:deals?|sales?)\s+20\d{2}\b/i,
    /\b20\d{2}\s+(?:deals?|sales?)\b/i,
    /\b(?:best|top)\s+.+\s+(?:deals?|sales?)\b/i,
    /^(?:ranking|ranked)\s+(?:the\s+)?(?:top|best)\s+\d+\b/i,
    /^(?:the\s+)?(?:top|best)\s+\d+\b/i,
    /^\s*cut\s+in\s+half\b/i,
    /\breview\b\s*(?:\||-|$)/i,
    /\b(?:official images|release info|newsroom|built for|colorways?\s+\+\s+release dates|complete guide|franchise history|shuffles?\s+its\s+lineup)\b/i,
    /\b\w+\s+out,\s+\w+.+\s+in\?\s*$/i,
    /\b(?:rule\s+no\.?|court dimensions?|backboard dimensions?|dimensions?\s*(?:&|and)\s*drawings?|equipment\s*-\s*nba official)\b/i,
    /\bguides?\s*\(20\d{2}\)\b/i,
    /\byours for\b/i,
    /\bi'?ve\s+ever\b/i,
    /^\s*(?:the\s+)?[a-z0-9][^.!?]{5,120}\s+(?:is|are)\s+one\s+of\b/i,
    /^\s*(?:boost|get|level up|make|save|score|snag|turn|up your|upgrade)\b.{0,120}\bwith\s+(?:the|a|an)\b/i,
    /\brecommendations?\?/i,
    /\bpros and cons\b/i,
    /^\s*the\s+best\b/i,
    /^\s*(?:top rated|best rated|highest rated|popular)\b/i,
    /\bloved by our editors\b/i,
    /\b(?:shoes|sneakers|boots|sandals|shirts|pants|jackets|chairs|desks|tables|vacuums|appliances|tools|grills|mattresses|sofas|couches)\s+(?:for|from)\s+(?:men|women|kids|top brands|speed|running|basketball|walking)\b/i,
    /^\s*(?:basketball|running|walking|training|tennis|hiking)\s+(?:shoes|sneakers)\s*(?:\||-|for|from)\b/i,
    /\b(?:desks|refrigerators|microwaves|microwave ovens|countertop microwave ovens|mini fridges|sectional sleeper sofas|sofas|couches|vacuums|gloves)\s*[-|]\s*(?:wayfair|aj madison|the home depot|amazon|walmart|target|lowe'?s|best buy)\b/i,
    /^\s*\$?\d+(?:\.\d+)?\s*(?:to|-)\s*\$?\d+(?:\.\d+)?\b/i,
  ];

  if (genericPatterns.some((pattern) => pattern.test(name))) {
    return true;
  }

  return name.includes(" / ") && !/\b(?:model|adult|youth|inch|in\.|series|pro)\b/i.test(name);
}

function productUrlLooksGeneric(url: string | undefined) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = normalizeText(parsed.pathname);
    const hasSearchParam = ["k", "q", "query", "search"].some((key) =>
      parsed.searchParams.has(key),
    );
    const nonProductHosts = [
      "reddit.com",
      "quora.com",
      "youtube.com",
      "youtu.be",
      "cnet.com",
      "consumerreports.org",
      "forum",
      "forums",
      "forbes.com",
      "goodhousekeeping.com",
      "home-barista.com",
      "laptopmag.com",
      "mashable.com",
      "nytimes.com",
      "pcmag.com",
      "pinterest.com",
      "price.com",
      "popularmechanics.com",
      "runrepeat.com",
      "rtings.com",
      "sneakerfiles.com",
      "techradar.com",
      "tomsguide.com",
      "wirecutter.com",
      "windowscentral.com",
      "about.nike.com",
      "news.nike.com",
      "wwd.com",
      "klarna.com",
    ];

    if (
      nonProductHosts.some(
        (value) =>
          host === value || host.endsWith(`.${value}`) || host.includes(value),
      )
    ) {
      return true;
    }

    if (
      host.endsWith("amazon.com") &&
      !/\/(?:dp|gp\/product)\//i.test(parsed.pathname)
    ) {
      return true;
    }

    if (host === "nike.com" && !/\/t\//i.test(parsed.pathname)) {
      return true;
    }

    if (
      host.endsWith("dickssportinggoods.com") &&
      /\/(?:a|c|f|s)\//i.test(parsed.pathname)
    ) {
      return true;
    }

    if (
      host.endsWith("footlocker.com") &&
      /\/(?:buy|category|search|collection)\//i.test(parsed.pathname)
    ) {
      return true;
    }

    if (
      hasSearchParam &&
      /\b(?:s|search|results|sale|shop|browse|category|collection)\b/i.test(path)
    ) {
      return true;
    }

    if (
      /\b(?:best|top)\b.{0,80}\b(?:deals?|sales?|coupons?)\b/i.test(path) ||
      /\b(?:deals?|sales?|coupons?)\b.{0,40}\b20\d{2}\b/i.test(path)
    ) {
      return true;
    }

    return /\b(?:advice|article|articles|blog|blogs|comments|community|communities|compare|comparison|conversation|conversations|discussion|forum|forums|guide|guides|help|question|questions|q-a|reviews?|search|results|category|categories|collection|collections|browse|catalog|shop|support|thread|threads|topic|topics|troubleshooting|viewtopic)\b/i.test(path);
  } catch {
    return false;
  }
}

function isSpecificProductRecommendation(product: ProductRecommendation) {
  return (
    !productNameLooksGeneric(product.name) &&
    !productUrlLooksGeneric(product.product_page_url)
  );
}

function productNegativeText(product: ProductLike) {
  return normalizeText(buildNegativeProductFactText(product));
}

function productDirectPositiveText(product: ProductLike) {
  return normalizeText(buildDirectPositiveProductFactText(product));
}

function productPositiveText(product: ProductLike) {
  return normalizeText(buildPositiveProductFactText(product));
}

function productEvidenceTextWithoutAssignedCategory(product: ProductLike) {
  const metadata = product.metadata;

  return normalizeText(
    [
      product.name,
      ...product.pros,
      metadata?.title?.value || "",
      metadata?.brand?.value || "",
      metadata?.modelNumber?.value || "",
      metadata?.sku?.value || "",
    ].join(" "),
  );
}

function productIdentityTextWithoutAssignedCategory(product: ProductLike) {
  const metadata = product.metadata;

  return normalizeText(
    [
      product.name,
      metadata?.title?.value || "",
      metadata?.brand?.value || "",
      metadata?.modelNumber?.value || "",
      metadata?.sku?.value || "",
    ].join(" "),
  );
}

const actualMattressIdentityPattern =
  /\bmattress\b(?!\s+(?:base|foundation|frame|pad|platform|protector|support|topper)\b)/;
const mattressFurnitureIdentityPattern =
  /\b(?:bed|bed frame|platform bed|storage bed|upholstered bed|headboard|foundation|box spring|bunkie board)\b/;

function hasMattressFurnitureConflict(product: ProductLike, category: string) {
  const requestedCategory = normalizeText(category);

  if (!/\bmattress\b/.test(requestedCategory)) {
    return false;
  }

  const identityText = productIdentityTextWithoutAssignedCategory(product);

  return (
    mattressFurnitureIdentityPattern.test(identityText) &&
    !actualMattressIdentityPattern.test(identityText)
  );
}

function hasConflictingProductType(product: ProductLike, category: string) {
  const requestedCategory = normalizeText(category);
  const evidenceText = productEvidenceTextWithoutAssignedCategory(product);

  if (hasMattressFurnitureConflict(product, requestedCategory)) {
    return true;
  }

  // Shared form-factor model: a candidate that names a component/variant of the
  // requested appliance (cooktop for an oven, ice-maker for a refrigerator)
  // without being the appliance itself is the wrong product. Data-driven and
  // cross-category — replaces the former per-category refrigerator/oven blocks.
  if (isComponentSubstitution(evidenceText, requestedCategory)) {
    return true;
  }

  if (productTypeConflictRules.some((rule) => {
    if (!rule.requestedCategory.test(requestedCategory)) {
      return false;
    }

    if (!rule.conflictingEvidence.test(evidenceText)) {
      return false;
    }

    return rule.allowedEvidence ? !rule.allowedEvidence.test(evidenceText) : true;
  })) {
    return true;
  }

  if (requiredCategoryEvidenceRules.some(
    (rule) =>
      rule.requestedCategory.test(requestedCategory) &&
      !rule.evidence.test(evidenceText),
  )) {
    return true;
  }

  return false;
}

function splitUserList(value: string | undefined) {
  return (value || "")
    .split(/[,;]|\band\b/gi)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSelectedFeature(value: string): ParsedSelectedFeature {
  const [featureName, ...rest] = value.split(":");
  const cleanFeatureName = featureName.trim() || "Feature";
  const selectedValue = rest.join(":").trim();

  if (selectedValue) {
    return {
      label: `${cleanFeatureName}: ${selectedValue}`,
      name: cleanFeatureName,
      value: selectedValue,
    };
  }

  return {
    label: value.trim(),
    name: "Feature",
    value: value.trim(),
  };
}

function selectedFeatureToParsedFeature(
  value: string | SelectedSmartFeature,
): ParsedSelectedFeature {
  if (typeof value === "string") {
    return parseSelectedFeature(value);
  }

  const searchText = selectedSmartFeatureSearchText(value);
  const cleanValue = searchText
    .replace(new RegExp(`^${escapeRegExp(value.name)}\\s+`, "i"), "")
    .trim();

  return {
    label: selectedSmartFeatureLabel(value),
    name: value.name,
    value: cleanValue || String(value.value),
  };
}

function groupSelectedFeatures(
  values: Array<string | SelectedSmartFeature> | undefined,
) {
  const groups = new Map<string, SelectedFeatureGroup>();

  for (const value of values || []) {
    const feature = selectedFeatureToParsedFeature(value);
    const key =
      feature.name === "Feature"
        ? normalizeText(feature.value)
        : normalizeText(feature.name);
    const displayName = feature.name === "Feature" ? feature.value : feature.name;
    const existing = groups.get(key);

    if (existing) {
      if (!existing.values.some((item) => normalizeText(item) === normalizeText(feature.value))) {
        existing.values.push(feature.value);
      }

      existing.label = `${existing.name}: ${existing.values.join(" or ")}`;
      continue;
    }

    groups.set(key, {
      label: feature.name === "Feature" ? feature.value : feature.label,
      name: displayName,
      values: [feature.value],
    });
  }

  return Array.from(groups.values());
}

function hasNegativeContextForTerm(text: string, term: string) {
  const negativeSearchText = text.replace(
    /\bno\s+(?:\w+\s+){0,4}(?:required|needed)\b/gi,
    (match) => match.replace(/\bno\s+/i, ""),
  );
  const pattern = termPattern(term);
  const verificationUncertaintyBefore = new RegExp(
    `\\b(?:not|cannot|can't|could\\s+not|did\\s+not|does\\s+not)\\b(?:\\W+\\w+){0,3}\\W+(?:verify|verified|confirm|confirmed|prove|proven)\\b(?:\\W+\\w+){0,4}\\W+${pattern}\\b`,
    "i",
  );
  const verificationUncertaintyAfter = new RegExp(
    `\\b${pattern}\\b(?:\\W+\\w+){0,4}\\W+\\b(?:not\\s+verified|not\\s+confirmed|not\\s+proven|unverified|unknown|unclear)\\b`,
    "i",
  );
  const negativeBefore = new RegExp(
    `\\b(?:not|no|without|lacks?|lacking|missing|unavailable|absent)\\b(?:\\W+\\w+){0,4}\\W+${pattern}\\b`,
    "i",
  );
  const unavailableColor = new RegExp(
    `\\b(?:not|never)\\s+available\\s+in\\s+${pattern}\\b|\\bdoesn'?t\\s+come\\s+in\\s+${pattern}\\b`,
    "i",
  );
  const negativeAfter = new RegExp(
    `\\b${pattern}\\b(?:\\W+\\w+){0,3}\\W+\\b(?:unavailable|missing|absent|not\\s+available|sold\\s+separately|not\\s+included|excluded)\\b`,
    "i",
  );

  if (
    verificationUncertaintyBefore.test(text) ||
    verificationUncertaintyAfter.test(text)
  ) {
    return false;
  }

  return (
    negativeBefore.test(negativeSearchText) ||
    unavailableColor.test(negativeSearchText) ||
    negativeAfter.test(negativeSearchText)
  );
}

function parseMaxBudget(value: string | undefined) {
  return parseMaxBudgetAmount(value);
}

// Returns the best (lowest) available price for budget comparison.
// Uses the minimum offer price when structured offer data is present.
// Falls back to the minimum extracted price from estimated_price_range so that
// a product listed at "$449–$599" is treated as available from $449, not $599.
function getProductBestAvailablePrice(product: ProductLike) {
  const offerPrices =
    product.metadata?.offers
      ?.map((offer) => offer.price.value)
      .filter((amount): amount is number => amount !== null && Number.isFinite(amount)) ||
    [];

  return plausibleProductPrice(
    offerPrices,
    parseBestProductPriceText(product.estimated_price_range),
    {
      category: product.category,
      productName: product.name,
    },
  );
}

function formatDollars(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function budgetLimitForProduct(
  budgetLimit: number,
) {
  return budgetLimit;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatRequirementLabel(label: string) {
  const maxDimension = label.match(/^(?:Under|Width:\s*under)\s+(\d+(?:\.\d+)?)\s+inches$/i);

  if (maxDimension?.[1]) {
    return `Width: under ${formatNumber(Number(maxDimension[1]))} inches`;
  }

  const minDimension = label.match(/^(?:At least|Width:\s*at least)\s+(\d+(?:\.\d+)?)\s+inches$/i);

  if (minDimension?.[1]) {
    return `Width: at least ${formatNumber(Number(minDimension[1]))} inches`;
  }

  return label;
}

function addRequirementComparison(
  comparisons: RequirementComparison[],
  required: string,
  productHas: string,
  status: RequirementComparison["status"],
) {
  comparisons.push({
    required: formatRequirementLabel(required),
    productHas,
    status,
  });
}

function extractDimensionConstraints(value: string | undefined) {
  const text = normalizeText(value || "");
  const constraints: NumericConstraint[] = [];
  const dimensionWords = "(width|wide|depth|deep|height|high|tall|length|long)";
  const maxWords =
    "(?:under|less than|below|no bigger than|no larger than|no deeper than|no taller than|at most|max|maximum)";
  const minWords = "(?:at least|min|minimum)";
  const patterns: Array<{
    defaultDimension: NumericConstraint["dimension"];
    kind: NumericConstraint["kind"];
    pattern: RegExp;
    plainLabel?: boolean;
    unit: NumericConstraint["unit"];
  }> = [
    {
      defaultDimension: "width",
      kind: "max",
      pattern: new RegExp(
        `\\b${maxWords}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|")\\s*(?:${dimensionWords})?\\b`,
        "gi",
      ),
      unit: "in",
    },
    {
      defaultDimension: "width",
      kind: "min",
      pattern: new RegExp(
        `\\b${minWords}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|")\\s*(?:${dimensionWords})?\\b`,
        "gi",
      ),
      unit: "in",
    },
    {
      defaultDimension: "width",
      kind: "max",
      pattern: new RegExp(
        `\\b${dimensionWords}\\s*(?:${maxWords})?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|")\\b`,
        "gi",
      ),
      unit: "in",
    },
    {
      defaultDimension: "length",
      kind: "max",
      pattern: new RegExp(
        `\\b${maxWords}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:ft|feet|foot)\\s*(?:length|long)?\\b`,
        "gi",
      ),
      unit: "ft",
    },
    {
      defaultDimension: "length",
      kind: "min",
      pattern: new RegExp(
        `\\b${minWords}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:ft|feet|foot)\\s*(?:length|long)?\\b`,
        "gi",
      ),
      unit: "ft",
    },
    {
      defaultDimension: "length",
      kind: "min",
      pattern: new RegExp(
        `\\b(?:length|long)\\s*(?:${minWords})?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:ft|feet|foot)\\b`,
        "gi",
      ),
      plainLabel: true,
      unit: "ft",
    },
    {
      defaultDimension: "length",
      kind: "min",
      pattern: /\b(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\b/gi,
      plainLabel: true,
      unit: "ft",
    },
  ];

  for (const item of patterns) {
    for (const match of text.matchAll(item.pattern)) {
      if (
        item.unit === "ft" &&
        /\b(?:sq|square|cu|cubic)\s*$/i.test(text.slice(Math.max(0, (match.index || 0) - 12), match.index || 0))
      ) {
        continue;
      }

      const amountMatch = Array.from(match).find((part, index) =>
        index > 0 && /^\d+(?:\.\d+)?$/.test(part || ""),
      );

      if (!amountMatch) {
        continue;
      }

      const dimensionText =
        item.pattern.source.startsWith("\\b(width") ||
        item.pattern.source.startsWith("\\b(width|")
          ? match[1]
          : match[2];
      const normalizedDimension = normalizeText(dimensionText || "");
      const dimension =
        normalizedDimension.includes("depth") || normalizedDimension.includes("deep")
          ? "depth"
          : normalizedDimension.includes("height") ||
              normalizedDimension.includes("high") ||
              normalizedDimension.includes("tall")
            ? "height"
            : normalizedDimension.includes("length") ||
                normalizedDimension.includes("long")
              ? "length"
              : "width";
      const finalDimension = normalizedDimension ? dimension : item.defaultDimension;
      const dimensionLabel =
        finalDimension === "depth"
          ? "Depth"
          : finalDimension === "height"
            ? "Height"
            : finalDimension === "length"
              ? "Length"
              : "Width";
      const value = Number(amountMatch);
      const unitLabel = item.unit === "ft" ? "ft" : "inches";
      const label = item.plainLabel && finalDimension === "length"
        ? `${dimensionLabel}: ${formatNumber(value)} ${unitLabel}`
        : item.kind === "max"
          ? `${dimensionLabel}: under ${formatNumber(value)} ${unitLabel}`
          : `${dimensionLabel}: at least ${formatNumber(value)} ${unitLabel}`;

      constraints.push({
        dimension: finalDimension,
        kind: item.kind,
        label,
        unit: item.unit,
        value,
      });
    }
  }

  return constraints;
}

function structuredDimensionConstraints(
  requirements: StructuredRequirements | undefined,
): NumericConstraint[] {
  return (requirements?.sizeConstraints || []).map((constraint) => ({
    dimension:
      constraint.dimension === "depth" ||
      constraint.dimension === "height" ||
      constraint.dimension === "length"
        ? constraint.dimension
        : ("width" as const),
    kind: constraint.operator,
    label: constraint.label,
    unit: constraint.unit,
    value: constraint.value,
  }));
}

function dedupeNumericConstraints(constraints: NumericConstraint[]) {
  const seen = new Set<string>();

  return constraints.filter((constraint) => {
    const key = `${constraint.kind}|${constraint.value}|${constraint.label}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function extractHardTextConstraints(value: string | undefined) {
  const text = value || "";
  const constraints: TextConstraint[] = [];
  const pattern = /\b(?:has to be|must be|needs to be|only)\s+([^,.]+)/gi;

  for (const match of text.matchAll(pattern)) {
    const rawValue = (match[1] || "").trim();

    if (!rawValue || /\d/.test(rawValue)) {
      continue;
    }

    constraints.push({
      label: rawValue,
      value: rawValue,
    });
  }

  return constraints;
}

function extractProductDimensions(
  product: ProductLike,
  dimension: NumericConstraint["dimension"],
  unit: NumericConstraint["unit"] = "in",
) {
  const metadataDimension =
    dimension === "length" ? undefined : product.metadata?.dimensions?.[dimension]?.value;

  if (
    metadataDimension !== null &&
    metadataDimension !== undefined &&
    Number.isFinite(metadataDimension)
  ) {
    const metadataUnit = product.metadata?.dimensions?.unit || "in";
    const value =
      unit === "ft" && metadataUnit === "in"
        ? metadataDimension / 12
        : unit === "in" && metadataUnit === "cm"
          ? metadataDimension / 2.54
          : unit === "ft" && metadataUnit === "cm"
            ? metadataDimension / 30.48
            : metadataDimension;

    return [value];
  }

  const text = productText(product);
  const unitPattern =
    unit === "ft" ? "(?:ft|feet|foot|')" : '(?:inches|inch|in\\.?)';

  if (dimension === "length") {
    return Array.from(
      text.matchAll(new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(?:${unitPattern})\\b`, "gi")),
    )
      .filter((match) =>
        !/\b(?:sq|square|cu|cubic)\s*$/i.test(
          text.slice(Math.max(0, (match.index || 0) - 12), match.index || 0),
        ),
      )
      .map((match) => (match[1] ? Number(match[1]) : null))
      .filter((value): value is number => value !== null && Number.isFinite(value));
  }

  const dimensionWords =
    dimension === "depth"
      ? "(?:depth|deep|d)"
      : dimension === "height"
        ? "(?:height|high|tall|h)"
        : "(?:width|wide|w)";
  const dimensionPattern =
    dimension === "width"
      ? `(?:\\b${dimensionWords}\\s*:?)?\\s*\\b(\\d+(?:\\.\\d+)?)\\s*-?\\s*(?:${unitPattern}|")\\s*(?:${dimensionWords})?\\b`
      : `(?:\\b${dimensionWords}\\s*:?\\s*(\\d+(?:\\.\\d+)?)\\s*-?\\s*(?:${unitPattern}|")|\\b(\\d+(?:\\.\\d+)?)\\s*-?\\s*(?:${unitPattern}|")\\s*${dimensionWords}\\b)`;

  return Array.from(
    text.matchAll(
      new RegExp(dimensionPattern, "gi"),
    ),
  )
    .map((match) => {
      const amount = Array.from(match).find((part, index) =>
        index > 0 && /^\d+(?:\.\d+)?$/.test(part || ""),
      );

      return amount ? Number(amount) : null;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));
}

function getProductDimensionValue(
  product: ProductLike,
  dimension: NumericConstraint["dimension"] = "width",
  unit: NumericConstraint["unit"] = "in",
) {
  const dimensions = extractProductDimensions(product, dimension, unit);
  const label =
    dimension === "depth"
      ? "Depth"
      : dimension === "height"
        ? "Height"
        : dimension === "length"
          ? "Length"
          : "Width";
  const unitLabel = unit === "ft" ? "ft" : "inches";

  if (dimensions.length === 0) {
    return `${label}: not verified`;
  }

  return `${label}: ${formatNumber(Math.max(...dimensions))} ${unitLabel}`;
}

function getKnownFeatureValues(featureName: string) {
  const normalizedName = normalizeText(featureName);

  for (const [key, values] of Object.entries(comparableFeatureValues)) {
    if (normalizedName.includes(key)) {
      return values;
    }
  }

  return [];
}

function extractAllSupportedFeatureValues(
  product: ProductLike,
  featureName: string,
  evidenceText = productPositiveText(product),
) {
  const knownValues = getKnownFeatureValues(featureName);
  const metadataValues =
    normalizeText(featureName).includes("color") && product.metadata?.colors?.value
      ? product.metadata.colors.value
      : [];
  const fullText = productText(product);

  return Array.from(new Set([...metadataValues, ...knownValues])).filter((value) => {
    const normalizedValue = normalizeText(value);

    if (!normalizedValue) {
      return false;
    }

    return (
      containsTerm(evidenceText, value) &&
      !hasNegativeContextForTerm(fullText, value)
    );
  });
}

function matchingSupportedFeatureValue(
  values: string[],
  requiredValues: string[],
) {
  return requiredValues.find((requiredValue) =>
    values.some(
      (value) => normalizeText(value) === normalizeText(requiredValue),
    ),
  );
}

function getProductFeatureValueForGroup(
  product: ProductLike,
  group: SelectedFeatureGroup,
) {
  const featureName = group.name === "Feature" ? "Feature" : group.name;
  const positiveText = productPositiveText(product);
  const semanticEvidence = group.values
    .map((value) => matchSemanticFeatureEvidence(positiveText, value))
    .find((result) => result.status === "pass");

  if (semanticEvidence) {
    return `${featureName}: ${semanticEvidence.evidence}`;
  }

  const supportedValues = extractAllSupportedFeatureValues(product, group.name);

  if (supportedValues.length > 0) {
    return `${featureName}: ${supportedValues.slice(0, 3).join(", ")}`;
  }

  if (normalizeText(featureName).includes("size")) {
    return getProductDimensionValue(product).replace(/^Width:/, `${featureName}:`);
  }

  return `${featureName}: not verified`;
}

function categoryTerms(category: string) {
  const normalizedCategory = normalizeText(category);

  if (categorySynonyms[normalizedCategory]) {
    return [categorySynonyms[normalizedCategory]];
  }

  for (const [key, synonyms] of Object.entries(categorySynonyms)) {
    if (normalizedCategory.includes(key)) {
      return [synonyms];
    }
  }

  return normalizedCategory
    .split(/\s+/)
    .filter((term) => term.length > 2 && !["out", "for", "with"].includes(term))
    .map((term) => [term, ...(categorySynonyms[term] || [])]);
}

function checkCategory(product: ProductLike, category: string) {
  if (hasConflictingProductType(product, category)) {
    return false;
  }

  const groups = categoryTerms(category);

  if (groups.length === 0) {
    return true;
  }

  const text = productText(product);
  const matches = groups.filter((group) =>
    group.some((term) => containsTerm(text, term)),
  );
  const requiredMatches = Math.min(2, groups.length);

  return matches.length >= requiredMatches;
}

function getAvoidTerms(value: string | undefined) {
  return splitUserList(value).map((term) => {
    const normalized = normalizeText(term);
    const alternatives = new Set<string>([
      term,
      normalized,
      semanticCanonicalValue(term),
      ...semanticAliasesFor(term),
    ]);

    for (const [key, synonyms] of Object.entries(avoidSynonyms)) {
      if (normalized.includes(key) || synonyms.some((item) => normalized.includes(item))) {
        synonyms.forEach((item) => alternatives.add(item));
      }
    }

    return {
      label: term,
      alternatives: Array.from(alternatives).filter(Boolean),
    };
  });
}

function isConcreteProductAttributeTerm(value: string) {
  const normalized = normalizeText(value);

  return (
    isConcreteSemanticAttribute(value) ||
    concreteAvoidPhrases.has(normalized) ||
    Object.values(comparableFeatureValues).some((terms) =>
      terms.some((term) => normalizeText(term) === normalized),
    )
  );
}

function containsConcreteAvoidEvidence(text: string, term: string) {
  if (containsTerm(text, term)) {
    return true;
  }

  const normalizedTerm = normalizeText(term);

  if (
    ![
      "upholstered headboard",
      "upholstery headboard",
      "upholstered bed frame",
      "upholstered bed",
      "upholstered platform bed",
      "fabric headboard",
      "padded headboard",
    ].includes(normalizedTerm)
  ) {
    return false;
  }

  const normalizedText = normalizeText(text);
  const softMaterialWords = "(?:upholstered|upholstery|fabric|padded)";
  const bedWords = "(?:headboard|bed\\s+frame|platform\\s+bed|bed)";
  const negatedUpholstery = new RegExp(
    "\\b(?:not|non|no|without)\\s+(?:an?\\s+)?(?:upholstered|upholstery|padded)\\b",
    "i",
  );

  if (negatedUpholstery.test(normalizedText)) {
    return false;
  }

  const materialBeforeBed = new RegExp(
    `\\b${softMaterialWords}\\b(?:\\s+\\w+){0,6}\\s+\\b${bedWords}\\b`,
    "i",
  );
  const bedBeforeMaterial = new RegExp(
    `\\b${bedWords}\\b(?:\\s+\\w+){0,6}\\s+\\b${softMaterialWords}\\b`,
    "i",
  );
  const hasBedContext = /\b(?:bed\s+frame|headboard|platform\s+bed|queen\s+bed|king\s+bed|full\s+bed|twin\s+bed)\b/i.test(
    normalizedText,
  );
  const hasUpholsteryLanguage = /\b(?:upholstered|upholstery|padded)\b/i.test(
    normalizedText,
  );

  return (
    materialBeforeBed.test(normalizedText) ||
    bedBeforeMaterial.test(normalizedText) ||
    (hasBedContext && hasUpholsteryLanguage)
  );
}

function structuredRequiredFeatureLabels(
  requirements: StructuredRequirements | undefined,
) {
  const labels = (requirements?.requiredConstraints || [])
    .filter((constraint) => constraint.type !== "budget" && constraint.type !== "brand")
    .map((constraint) => {
      if (constraint.label.includes(":")) {
        return constraint.label;
      }

      const prefix =
        constraint.type === "color"
          ? "Color"
          : constraint.type === "material"
            ? "Material"
            : constraint.type === "brand"
              ? "Brand"
              : constraint.type === "size"
                ? "Size"
                : "Feature";

      return `${prefix}: ${constraint.value}`;
    });

  return Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean)));
}

function structuredAvoidTerms(requirements: StructuredRequirements | undefined) {
  return (requirements?.avoidConstraints || [])
    .map((constraint) => constraint.value || constraint.label.replace(/^Avoid:\s*/i, ""))
    .filter(Boolean);
}

function allSelectedFeatureLabels(requirements: ProductRequirements) {
  const selectedFeatures = (requirements.selectedFeatures || []).filter((feature) => {
    if (typeof feature === "string") {
      return true;
    }

    const normalizedName = normalizeText(feature.name);

    return !(
      (feature.operator === "lte" ||
        feature.operator === "gte" ||
        feature.operator === "between" ||
        feature.operator === "equals") &&
      (normalizedName.includes("width") ||
        normalizedName.includes("depth") ||
        normalizedName.includes("height") ||
        normalizedName.includes("length") ||
        normalizedName.includes("size"))
    );
  });

  return Array.from(
    new Set([
      ...selectedFeatures,
      ...structuredRequiredFeatureLabels(requirements.extractedRequirements),
    ]),
  );
}

function allAvoidLabels(requirements: ProductRequirements) {
  return Array.from(
    new Set([
      ...splitUserList(requirements.avoid),
      ...structuredAvoidTerms(requirements.extractedRequirements),
    ]),
  ).join(", ");
}

function isBrandOnlyHardTextConstraint(value: string) {
  const brands = detectKnownBrands(value);

  if (brands.length === 0) {
    return false;
  }

  let remaining = normalizeText(value).replace(
    /\b(?:must|have|has|be|brand|brands|only|just|exclusively|required|require|requires|need|needs|want|wants|from|by)\b/g,
    " ",
  );
  const aliases = brands
    .flatMap((brand) => brandAliasesFor(brand))
    .map(normalizeText)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  for (const alias of aliases) {
    const pattern = new RegExp(
      `(^|\\s)${escapeRegExp(alias).replace(/\s+/g, "\\s+")}(?=\\s|$)`,
      "g",
    );

    remaining = remaining.replace(pattern, " ");
  }

  return remaining.replace(/\s+/g, " ").trim().length === 0;
}

function maxBudgetFromRequirements(requirements: ProductRequirements) {
  const structuredBudget = requirements.extractedRequirements?.budgetRules.find(
    (rule) => rule.operator === "max" && rule.amount !== null,
  );

  return structuredBudget?.amount ?? parseMaxBudget(requirements.budget);
}

function firstFailure(missingRequirements: string[]) {
  return missingRequirements[0]
    ? `Misses required filter: ${formatRequirementLabel(missingRequirements[0])}`
    : null;
}

// Separate label for requirements where we have no data yet (unknown ≠ failed).
function firstUnknown(unknownRequirements: string[]) {
  return unknownRequirements[0]
    ? `Needs verification: ${formatRequirementLabel(unknownRequirements[0])}`
    : null;
}

function normalizeProductKey(value: string) {
  return normalizeText(value)
    .replace(/\b(?:the|and|with|for|sofa|couch|chair|sleeper|bed)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getProductDedupeKey(product: ProductRecommendation) {
  const urlKey = product.product_page_url
    ? product.product_page_url
        .toLowerCase()
        .replace(/[?#].*$/, "")
        .replace(/\/$/, "")
    : "";
  const nameKey = normalizeProductKey(product.name);
  const categoryKey = normalizeProductKey(product.category);

  return urlKey ? `${nameKey}|${urlKey}` : `${nameKey}|${categoryKey}`;
}

function dedupeProducts(products: ProductRecommendation[]) {
  const seen = new Set<string>();
  const deduped: ProductRecommendation[] = [];

  for (const product of products) {
    const key = getProductDedupeKey(product);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(product);
  }

  return deduped;
}

function removeRawCandidatePool<T extends object>(result: T) {
  const safeResult = { ...result } as T & {
    candidate_products?: unknown;
  };

  delete safeResult.candidate_products;

  return safeResult;
}

function consensusWeight(sourceConsensus: string) {
  if (sourceConsensus === "Strong") {
    return 4;
  }

  if (sourceConsensus === "Mixed") {
    return 3;
  }

  if (sourceConsensus === "Niche") {
    return 2;
  }

  return 1;
}

function getUrlHost(value: string | undefined) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isBroadRetailerHost(host: string) {
  return BROAD_RETAILER_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

function productSourceQualityScore(product: ProductRecommendation) {
  const productHost = getUrlHost(product.product_page_url);
  const citationHosts = product.citations
    .map((citation) => getUrlHost(citation.url))
    .filter(Boolean);
  const independentCitationCount = citationHosts.filter(
    (host) => !isBroadRetailerHost(host),
  ).length;
  const broadCitationCount = citationHosts.filter(isBroadRetailerHost).length;
  let score = 0;

  if (productHost && !isBroadRetailerHost(productHost)) {
    score += 6;
  }

  if (independentCitationCount > 0) {
    score += Math.min(12, independentCitationCount * 4);
  }

  if (productHost && isBroadRetailerHost(productHost)) {
    score -= independentCitationCount > 0 ? 4 : 12;
  }

  if (broadCitationCount > 0 && independentCitationCount === 0) {
    score -= 4;
  }

  return score;
}

function rankProducts(first: ProductRecommendation, second: ProductRecommendation) {
  const firstMissing =
    (first.requirementCheck?.failed.length || 0) +
    (first.requirementCheck?.unknown.length || 0);
  const secondMissing =
    (second.requirementCheck?.failed.length || 0) +
    (second.requirementCheck?.unknown.length || 0);

  if (firstMissing !== secondMissing) {
    return firstMissing - secondMissing;
  }

  const sourceQualityDifference =
    productSourceQualityScore(second) - productSourceQualityScore(first);

  if (sourceQualityDifference !== 0) {
    return sourceQualityDifference;
  }

  const confidenceDifference = second.confidence_score - first.confidence_score;

  if (confidenceDifference !== 0) {
    return confidenceDifference;
  }

  return (
    consensusWeight(second.source_consensus) -
    consensusWeight(first.source_consensus)
  );
}

function hasDisqualifyingRequirementFailure(product: ProductRecommendation) {
  const failed = product.requirementCheck?.failed || product.missingRequirements || [];

  return failed.some((requirement) => /^(?:Category|Avoid):/i.test(requirement));
}

function requiredBrandConstraints(requirements: StructuredRequirements | undefined) {
  const constraints = [
    ...(requirements?.brandConstraints || []),
    ...(requirements?.requiredConstraints || []).filter(
      (constraint) => constraint.type === "brand",
    ),
  ];
  const seen = new Set<string>();

  return constraints.filter((constraint) => {
    const key = canonicalBrand(constraint.value).toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function productBrandEvidenceText(product: ProductLike) {
  return [
    product.name,
    product.category,
    product.product_page_url,
    product.metadata?.brand?.value || "",
    product.metadata?.title?.value || "",
    product.metadata?.canonicalUrl?.value || "",
    ...product.citations.map(
      (citation) =>
        `${citation.title} ${citation.url} ${citation.what_it_supports}`,
    ),
    ...product.pros,
  ].join(" ");
}

function productKnownBrandLabel(product: ProductLike) {
  const metadataBrand = product.metadata?.brand?.value;

  if (metadataBrand) {
    return canonicalBrand(metadataBrand);
  }

  const brands = detectKnownBrands(productBrandEvidenceText(product));

  return brands.length > 0 ? brands.join(", ") : "not verified";
}

function hasMatchedBudgetComparison(validation: RequirementValidationResult) {
  return validation.requirementComparisons.some(
    (comparison) =>
      /\bbudget\b/i.test(comparison.required) &&
      comparison.status === "matched" &&
      !/\bnot verified\b/i.test(comparison.productHas),
  );
}

function hasFailedBudgetComparison(validation: RequirementValidationResult) {
  return validation.requirementComparisons.some(
    (comparison) =>
      /\bbudget\b/i.test(comparison.required) && comparison.status === "failed",
  );
}

const staleOverBudgetCopyPattern =
  /\b(?:above|over|exceeds?|exceeding|outside|not an? in-budget|not in budget|not within (?:the )?(?:stated )?budget|price does not meet|pricing is inconsistent|found on sale under budget|shop(?:ping)? for a sale|current official pricing is above|current official price is above)\b/i;

const staleInBudgetCopyPattern =
  /\b(?:in-budget|under-budget|under (?:the )?(?:stated )?budget|within (?:the )?(?:stated )?budget|fits? (?:the )?(?:stated )?budget|meets? (?:the )?(?:stated )?budget|stays? under|current price is under|clearly under|priced under|near (?:the )?budget cap|without leaving the budget)\b/i;

function removeStaleOverBudgetClauses(value: string) {
  return value
    .replace(
      /\s*(?:,|;)?\s*(?:though|although|but)\s+[^.]*\b(?:above|over|exceeds?|outside)[^.]*\./gi,
      ".",
    )
    .replace(
      /\b(?:current official pricing|current official price|current price|official price|pricing)[^.]*\b(?:above|over|exceeds?|outside)[^.]*\.\s*/gi,
      "",
    )
    .replace(/\bGood if found on sale under budget;?\s*/gi, "")
    .replace(
      /\botherwise the value is weaker because pricing is inconsistent in the evidence\.?/gi,
      "",
    )
    .replace(/\s+([.,;])/g, "$1")
    .replace(/\bsolid fallback\b/gi, "solid option")
    .replace(/\bfallback for buyers\b/gi, "option for buyers")
    .replace(/\s+/g, " ")
    .trim();
}

function removeStaleInBudgetClauses(value: string) {
  return value
    .replace(
      /\s*(?:,|;)?\s*(?:though|although|but)\s+[^.]*\b(?:in-budget|under-budget|under (?:the )?(?:stated )?budget|within (?:the )?(?:stated )?budget|near (?:the )?budget cap)[^.]*\./gi,
      ".",
    )
    .replace(
      /\b(?:current price|price|pricing|offer)[^.]*\b(?:under|within|fits?|meets?|near)[^.]*\bbudget[^.]*\.\s*/gi,
      "",
    )
    .replace(/\s+([.,;])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function removeStaleBudgetSentences(
  value: string,
  fallback: string,
  stalePattern: RegExp,
  clauseCleaner: (value: string) => string,
) {
  const withoutClauses = clauseCleaner(value);
  const sentences = withoutClauses
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !stalePattern.test(sentence));
  const cleaned = sentences.join(" ").trim();

  return cleaned || fallback;
}

function removeStaleBudgetItems(
  items: string[],
  stalePattern: RegExp,
  clauseCleaner: (value: string) => string,
) {
  return items
    .map(clauseCleaner)
    .filter((item) => item.length > 0 && !stalePattern.test(item));
}

export function reconcileBudgetCopyForValidation<T extends ProductRecommendation>(
  product: T,
  validation: RequirementValidationResult,
): T {
  const matchedBudget = hasMatchedBudgetComparison(validation);
  const failedBudget = hasFailedBudgetComparison(validation);

  if (!matchedBudget && !failedBudget) {
    return product;
  }

  const stalePattern = failedBudget
    ? staleInBudgetCopyPattern
    : staleOverBudgetCopyPattern;
  const clauseCleaner = failedBudget
    ? removeStaleInBudgetClauses
    : removeStaleOverBudgetClauses;
  const fallback = failedBudget
    ? "Verified pricing is above the stated budget; consider only if the budget is flexible."
    : "Verified pricing is within the stated budget; verify current availability before buying.";

  return sanitizeProsAndCons({
    ...product,
    common_complaints: removeStaleBudgetItems(
      product.common_complaints,
      stalePattern,
      clauseCleaner,
    ),
    cons: removeStaleBudgetItems(product.cons, stalePattern, clauseCleaner),
    not_for: removeStaleBudgetItems(product.not_for, stalePattern, clauseCleaner),
    price_value_verdict: removeStaleBudgetSentences(
      product.price_value_verdict,
      fallback,
      stalePattern,
      clauseCleaner,
    ),
    why_recommended: removeStaleBudgetSentences(
      product.why_recommended,
      failedBudget
        ? "Verified pricing is above the stated budget; compare only if the budget is flexible."
        : "Verified pricing is within the stated budget; compare the cited features, availability, warranty, and return policy before buying.",
      stalePattern,
      clauseCleaner,
    ),
  });
}

export function hasFirmRequirementFilters(
  requirements: Pick<
    ProductRequirements,
    "avoid" | "budget" | "extractedRequirements" | "priorities" | "selectedFeatures"
  >,
) {
  const structuredRequirements = requirements.extractedRequirements;

  return Boolean(
    requirements.budget?.trim() ||
      requirements.avoid?.trim() ||
      requirements.selectedFeatures?.length ||
      extractDimensionConstraints(requirements.priorities).length ||
      extractHardTextConstraints(requirements.priorities).filter(
        (constraint) => !isBrandOnlyHardTextConstraint(constraint.value),
      ).length ||
      structuredRequirements?.requiredConstraints.length ||
      structuredRequirements?.avoidConstraints.length ||
      structuredRequirements?.sizeConstraints.length ||
      structuredRequirements?.budgetRules.some((rule) => rule.operator === "max"),
  );
}

// Phase 1 promote gate. Spec constraints only influence exact/near
// classification when explicitly enabled, so default behavior is unchanged
// until the flag is flipped after a before/after comparison.
function specValidationEnabled() {
  return process.env.REVIEW_RADAR_SPEC_VALIDATION === "on";
}

export function validateProductAgainstRequirements(
  product: ProductLike,
  requirements: ProductRequirements,
): RequirementValidationResult {
  const matchedRequirements: string[] = [];
  const missingRequirements: string[] = [];
  const unknownRequirements: string[] = [];
  const softUnknownRequirements: string[] = [];
  const requirementComparisons: RequirementComparison[] = [];
  const text = productText(product);
  const negativeText = productNegativeText(product);

  const requestedCategory = requirements.category?.trim();

  if (requestedCategory && checkCategory(product, requestedCategory)) {
    matchedRequirements.push(`Category: ${requestedCategory}`);
  } else if (requestedCategory) {
    const label = `Category: ${requestedCategory}`;

    missingRequirements.push(label);
    addRequirementComparison(
      requirementComparisons,
      label,
      `Category: ${product.category || "not verified"}`,
      "failed",
    );
  }

  const budgetLimit = maxBudgetFromRequirements(requirements);

  if (budgetLimit !== null) {
    const effectiveBudgetLimit = budgetLimitForProduct(
      budgetLimit,
    );
    const productBestPrice = getProductBestAvailablePrice(product);
    const label = `Budget: ${formatDollars(budgetLimit)} or less`;

    if (productBestPrice === null) {
      unknownRequirements.push(label);
      addRequirementComparison(
        requirementComparisons,
        label,
        "Price: not verified",
        "unknown",
      );
    } else if (productBestPrice <= effectiveBudgetLimit) {
      matchedRequirements.push(label);
      // Record a "matched" comparison so the UI can show what price evidence was used.
      addRequirementComparison(
        requirementComparisons,
        label,
        `Price: ${formatDollars(productBestPrice)}`,
        "matched",
      );
    } else {
      missingRequirements.push(label);
      addRequirementComparison(
        requirementComparisons,
        label,
        `Price: ${formatDollars(productBestPrice)}`,
        "failed",
      );
    }
  }

  const brandConstraints = requiredBrandConstraints(
    requirements.extractedRequirements,
  );

  if (brandConstraints.length > 0) {
    const brandEvidenceText = productBrandEvidenceText(product);
    const requiredBrands = brandConstraints.map((constraint) =>
      canonicalBrand(constraint.value),
    );
    const label = `Brand: ${requiredBrands.join(" or ")}`;
    const matchingBrand = requiredBrands.find((brand) =>
      brandEvidenceMatches(brandEvidenceText, brand),
    );

    if (matchingBrand) {
      matchedRequirements.push(`Brand: ${matchingBrand}`);
    } else {
      const productHas = `Brand: ${productKnownBrandLabel(product)}`;

      if (/not verified/i.test(productHas)) {
        unknownRequirements.push(label);
        addRequirementComparison(
          requirementComparisons,
          label,
          productHas,
          "unknown",
        );
      } else {
        missingRequirements.push(label);
        addRequirementComparison(
          requirementComparisons,
          label,
          productHas,
          "failed",
        );
      }
    }
  }

  for (const featureGroup of groupSelectedFeatures(allSelectedFeatureLabels(requirements))) {
    const featureEvidenceText = productPositiveText(product);
    const directSupportedValues = extractAllSupportedFeatureValues(
      product,
      featureGroup.name,
      productDirectPositiveText(product),
    );
    const directMatchingValue = matchingSupportedFeatureValue(
      directSupportedValues,
      featureGroup.values,
    );
    const hasKnownFeatureValueSet = getKnownFeatureValues(featureGroup.name).length > 0;

    if (directMatchingValue) {
      matchedRequirements.push(featureGroup.label);
      continue;
    }

    if (hasKnownFeatureValueSet && directSupportedValues.length > 0) {
      missingRequirements.push(featureGroup.label);
      addRequirementComparison(
        requirementComparisons,
        featureGroup.label,
        `${featureGroup.name}: ${directSupportedValues.slice(0, 3).join(", ")}`,
        "failed",
      );
      continue;
    }

    const matchingValue = featureGroup.values.find(
      (value) =>
        containsRequiredFeature(featureEvidenceText, value) &&
        !hasNegativeContextForRequiredFeature(text, value) &&
        !hasNegativeContextForRequiredFeature(negativeText, value),
    );

    if (matchingValue) {
      matchedRequirements.push(featureGroup.label);
      continue;
    }

    const productHas = getProductFeatureValueForGroup(product, featureGroup);
    const hasKnownAlternative = !productHas.endsWith(": not verified");
    const conflictingValue = featureGroup.values
      .map((value) => conflictingRequiredFeatureValue(featureEvidenceText, value))
      .find((value): value is string => Boolean(value));
    const hasNegativeEvidence = featureGroup.values.some((value) =>
      hasNegativeContextForRequiredFeature(text, value),
    );

    if (conflictingValue || hasKnownAlternative || hasNegativeEvidence) {
      missingRequirements.push(featureGroup.label);
      addRequirementComparison(
        requirementComparisons,
        featureGroup.label,
        conflictingValue ? `${featureGroup.name}: ${conflictingValue}` : productHas,
        "failed",
      );
    } else {
      unknownRequirements.push(featureGroup.label);
      addRequirementComparison(
        requirementComparisons,
        featureGroup.label,
        productHas,
        "unknown",
      );
    }
  }

  const dimensionConstraints = dedupeNumericConstraints([
    ...extractDimensionConstraints(requirements.priorities),
    ...structuredDimensionConstraints(requirements.extractedRequirements),
  ]);

  for (const constraint of dimensionConstraints) {
    const dimensions = extractProductDimensions(
      product,
      constraint.dimension,
      constraint.unit,
    );

    if (dimensions.length === 0) {
      unknownRequirements.push(constraint.label);
      addRequirementComparison(
        requirementComparisons,
        constraint.label,
        getProductDimensionValue(product, constraint.dimension, constraint.unit),
        "unknown",
      );
      continue;
    }

    const productMaximumDimension = Math.max(...dimensions);
    if (
      (constraint.kind === "max" && productMaximumDimension <= constraint.value) ||
      (constraint.kind === "min" && productMaximumDimension >= constraint.value)
    ) {
      matchedRequirements.push(constraint.label);
    } else {
      missingRequirements.push(constraint.label);
      addRequirementComparison(
        requirementComparisons,
        constraint.label,
        getProductDimensionValue(product, constraint.dimension, constraint.unit),
        "failed",
      );
    }
  }

  const specConstraints = requirements.extractedRequirements?.specConstraints || [];

  if (specValidationEnabled() && specConstraints.length > 0) {
    const productSpecs = extractProductSpecs(product);

    for (const constraint of specConstraints) {
      const status = evaluateSpecConstraint(constraint, productSpecs);
      const observed = productSpecs[constraint.spec];
      const productHas = observed ? observed.raw : "not verified";

      if (status === "pass") {
        matchedRequirements.push(constraint.label);
        addRequirementComparison(
          requirementComparisons,
          constraint.label,
          productHas,
          "matched",
        );
        continue;
      }

      // Soft specs are informational only and never gate exact-match
      // eligibility. Only specs the user made an explicit hard requirement
      // can fail (reject) or be unknown (demote). A verified fail is treated
      // as a hard failure; an unknown only reduces standing, never the same
      // as a verified fail.
      if (constraint.strictness !== "hard") {
        // Non-gating: lowers confidence via missingDataPenalty, never eliminates.
        softUnknownRequirements.push(constraint.label);
        addRequirementComparison(
          requirementComparisons,
          constraint.label,
          productHas,
          status === "fail" ? "failed" : "unknown",
        );
        continue;
      }

      if (status === "fail") {
        missingRequirements.push(constraint.label);
        addRequirementComparison(
          requirementComparisons,
          constraint.label,
          productHas,
          "failed",
        );
      } else {
        unknownRequirements.push(constraint.label);
        addRequirementComparison(
          requirementComparisons,
          constraint.label,
          productHas,
          "unknown",
        );
      }
    }
  }

  for (const constraint of extractHardTextConstraints(requirements.priorities)) {
    if (isBrandOnlyHardTextConstraint(constraint.value)) {
      continue;
    }

    if (
      containsRequiredFeature(text, constraint.value) &&
      !hasNegativeContextForRequiredFeature(text, constraint.value)
    ) {
      matchedRequirements.push(constraint.label);
    } else if (hasNegativeContextForRequiredFeature(text, constraint.value)) {
      missingRequirements.push(constraint.label);
      addRequirementComparison(
        requirementComparisons,
        constraint.label,
        "Feature: not verified",
        "failed",
      );
    } else {
      unknownRequirements.push(constraint.label);
      addRequirementComparison(
        requirementComparisons,
        constraint.label,
        "Feature: not verified",
        "unknown",
      );
    }
  }

  for (const avoidTerm of getAvoidTerms(allAvoidLabels(requirements))) {
    const concreteAvoid = avoidTerm.alternatives.some(
      isConcreteProductAttributeTerm,
    );
    const upholsteryAvoid = avoidTerm.alternatives.some((term) =>
      concreteAvoidPhrases.has(normalizeText(term)),
    );
    const avoidEvidenceText = concreteAvoid ? productPositiveText(product) : negativeText;
    const violatesAvoid = avoidTerm.alternatives.some((term) =>
      concreteAvoid
        ? violatesSemanticDealbreaker(avoidEvidenceText, term) ||
          (upholsteryAvoid && containsConcreteAvoidEvidence(avoidEvidenceText, term))
        : containsTerm(avoidEvidenceText, term) &&
          !hasNegativeContextForTerm(avoidEvidenceText, term),
    );

    if (violatesAvoid) {
      const label = `Avoid: ${avoidTerm.label}`;

      missingRequirements.push(label);
      addRequirementComparison(
        requirementComparisons,
        label,
        `Common issue: ${avoidTerm.label}`,
        "failed",
      );
    } else {
      matchedRequirements.push(`Avoid: ${avoidTerm.label}`);
    }
  }

  const disqualifiedReason =
    firstFailure(missingRequirements) || firstUnknown(unknownRequirements);

  return {
    isMatch: missingRequirements.length === 0 && unknownRequirements.length === 0,
    matchedRequirements,
    missingRequirements,
    unknownRequirements,
    softUnknownRequirements,
    requirementComparisons,
    disqualifiedReason,
  };
}

export function filterResultByRequirements<T extends FilterableRecommendationResult>(
  result: T,
  requirements: RecommendationApiRequest,
): RecommendationResult {
  const safeResult = removeRawCandidatePool(result);
  const dedupedRecommendations = dedupeProducts(result.recommendations).filter(
    isSpecificProductRecommendation,
  );
  const checkedRecommendations = dedupedRecommendations.map((recommendation) => {
    const validation = validateProductAgainstRequirements(recommendation, {
      avoid: requirements.avoid,
      budget: requirements.budget,
      category: baseProductCategoryFromQuery(requirements.query),
      extractedRequirements: requirements.extractedRequirements,
      priorities: requirements.priorities,
      selectedFeatures: requirements.selectedFeatures,
    });
    const cleanedRecommendation = reconcileBudgetCopyForValidation(
      recommendation,
      validation,
    );
    const sanitizedRecommendation = sanitizeProsAndCons(cleanedRecommendation);

    return {
      ...sanitizedRecommendation,
      requirementCheck: {
        exactMatch: validation.isMatch,
        failed: validation.missingRequirements,
        passed: validation.matchedRequirements,
        unknown: validation.unknownRequirements,
        softUnknown: validation.softUnknownRequirements,
      },
      matchedRequirements: validation.matchedRequirements,
      missingRequirements: [
        ...validation.missingRequirements,
        ...validation.unknownRequirements,
      ],
      unknownRequirements: validation.unknownRequirements,
      requirementComparisons: validation.requirementComparisons,
      disqualifiedReason: validation.disqualifiedReason,
      near_match_reason: validation.disqualifiedReason || undefined,
    };
  });
  const exactMatches = checkedRecommendations
    .filter(
      (recommendation) =>
        recommendation.requirementCheck?.exactMatch === true &&
        recommendation.requirementCheck.failed.length === 0 &&
        recommendation.requirementCheck.unknown.length === 0,
    )
    .sort(rankProducts)
    .slice(0, 12);
  const nearMatches = checkedRecommendations
    .filter(
      (recommendation) =>
        recommendation.requirementCheck?.exactMatch !== true &&
        !hasDisqualifyingRequirementFailure(recommendation),
    )
    .sort(rankProducts)
    .slice(0, 8);
  const knownProductNames = checkedRecommendations.map(
    (recommendation) => recommendation.name,
  );

  if (exactMatches.length === 0) {
    return ensureFinalAdviceUsesDisplayedProducts(
      {
        ...safeResult,
        exactMatches,
        premiumAboveBudget: [],
        nearMatches,
        recommendations: exactMatches,
        search_summary: NO_EXACT_MATCHES_MESSAGE,
        final_buying_advice:
          "No exact match met every requirement. Review the closest alternatives below and decide which requirement you are willing to relax.",
        what_to_avoid: [],
      },
      knownProductNames,
    );
  }

  return ensureFinalAdviceUsesDisplayedProducts(
    {
      ...safeResult,
      exactMatches,
      premiumAboveBudget: [],
      nearMatches,
      recommendations: exactMatches,
      search_summary:
        exactMatches.length < 7
          ? `Showing ${exactMatches.length} exact matches. Your requirements are restrictive, so closest alternatives are shown separately.`
          : result.search_summary,
    },
    knownProductNames,
  );
}

export function revalidateResultCandidates(
  result: RecommendationResult,
  requirements: RecommendationApiRequest,
): RecommendationResult {
  const candidates = dedupeProducts([
    ...result.recommendations,
    ...result.exactMatches,
    ...result.nearMatches,
  ]);

  return filterResultByRequirements(
    {
      ...result,
      recommendations: candidates,
    },
    requirements,
  );
}

export function buildNoExactMatchesResult(
  result: FilterableRecommendationResult,
): RecommendationResult {
  const safeResult = removeRawCandidatePool(result);

  return {
    ...safeResult,
    exactMatches: [],
    premiumAboveBudget: [],
    nearMatches: result.nearMatches || [],
    recommendations: [],
    search_summary: NO_EXACT_MATCHES_MESSAGE,
    what_to_avoid: [],
    final_buying_advice:
      "No exact match met every requirement. Review the closest alternatives below and decide which requirement you are willing to relax.",
  };
}

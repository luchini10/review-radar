import {
  searchSerperOrganicEvidence,
  searchSerperVideoEvidence,
  type SerperEvidenceSource,
} from "./search/serper.ts";
import type {
  EvidenceConfidence,
  ProductEvidenceBucket,
  ProductEvidenceItem,
  ProductOwnerOpinion,
  ProductRecommendation,
  RecommendationResult,
  RepeatedComplaintEvidence,
} from "@/types/review-radar";
import {
  isBudgetComplianceCopy,
  sanitizeProductCons,
  sanitizeProductPros,
} from "./productCopySanitizer.ts";
import {
  classifyRubricFactImportance,
  rubricImportanceRank,
} from "./rubricFactImportance.ts";
import { mapWithConcurrency } from "./recommendationPerformance.ts";
import { throwIfRequestCancelled } from "./requestCancellation.ts";

const MAX_EVIDENCE_QUERIES_PER_PRODUCT = 3;
const MAX_EVIDENCE_CALLS_TOTAL = 16;
const MAX_EVIDENCE_RESULTS_PER_QUERY = 6;
const MAX_TRUST_LADDER_QUERIES_PER_PRODUCT = 5;
const MAX_TRUST_LADDER_CALLS_TOTAL = 32;
const MAX_REDDIT_OPINION_QUERIES_PER_PRODUCT = 2;
const MAX_RUBRIC_QUERY_TERMS = 3;

type EvidenceSearchState = {
  callsUsed: number;
};

type ReviewEvidenceMode = "standard" | "trust_ladder";

type ProductEvidenceEnrichmentOptions = {
  concurrency?: number;
  fullTrustLadderProductCount?: number;
  maxProducts?: number;
  mode?: ReviewEvidenceMode;
  signal?: AbortSignal;
};

type ComplaintPattern = {
  label: string;
  terms: string[];
  severity: RepeatedComplaintEvidence["severity"];
  appliesTo?: EvidenceCategory[];
};

type EvidenceCategory =
  | "appliance"
  | "electronics"
  | "furniture"
  | "vacuum"
  | "general";

type EvidencePattern = {
  claim: string;
  terms: string[];
  appliesTo?: EvidenceCategory[];
};

const genericFillerPatterns = [
  /^features can add complexity/i,
  /^limited evidence$/i,
  /^listed price\b/i,
  /^price\b/i,
  /^matches required filter\b/i,
  /^matches (?:the )?(?:user|search|query|request)\b/i,
  /^fits (?:the )?(?:user|request|criteria)\b/i,
  /^meets (?:the )?(?:selected|criteria|user)\b/i,
  /^within (?:the )?budget\b/i,
  /^under (?:the )?budget\b/i,
  /^fits (?:the )?(?:stated )?budget\b/i,
  /^good match\b/i,
  /^aligned with/i,
  /^satisfies/i,
  /^mixed reviews$/i,
  /^may not be best for everyone/i,
  /^potential durability concerns$/i,
  /^unknown mattress comfort from available evidence$/i,
  /^limited evidence on long-term reliability$/i,
];

const positivePatterns: EvidencePattern[] = [
  {
    claim: "Easy assembly.",
    terms: ["easy assembly", "easy to assemble", "simple assembly"],
  },
  {
    claim: "Compact footprint for smaller spaces.",
    terms: ["compact", "small space", "space saving", "small apartment"],
  },
  {
    claim: "Comfortable seating or sleeping surface.",
    terms: ["comfortable", "comfort", "cushion"],
    appliesTo: ["furniture"],
  },
  {
    claim: "Useful USB or charging features.",
    terms: ["usb", "charging", "power outlet"],
  },
  {
    claim: "Good suction performance.",
    terms: ["suction", "powerful", "deep clean"],
    appliesTo: ["vacuum"],
  },
  {
    claim: "Good battery life.",
    terms: ["battery life", "runtime", "long battery"],
  },
  {
    claim: "Strong color performance.",
    terms: ["color accuracy", "accurate color", "wide gamut"],
  },
];

const negativePatterns: EvidencePattern[] = [
  {
    claim: "Cushions may feel too firm.",
    terms: ["firm cushion", "too firm", "firm seat", "firm mattress"],
    appliesTo: ["furniture"],
  },
  {
    claim: "Assembly can be difficult.",
    terms: ["hard to assemble", "difficult assembly", "assembly problem"],
  },
  {
    claim: "Durability or breakage issues have been reported.",
    terms: ["broke", "broken", "durability", "poor quality", "stopped working"],
  },
  {
    claim: "USB or electronic features may be unreliable.",
    terms: ["usb problem", "usb port", "charging problem", "not working"],
  },
  {
    claim: "Backlight bleed has been reported.",
    terms: ["backlight bleed", "ips glow"],
    appliesTo: ["electronics"],
  },
  {
    claim: "Clogging may be an issue.",
    terms: ["clog", "clogging"],
    appliesTo: ["vacuum"],
  },
  {
    claim: "Battery life may be shorter than expected.",
    terms: ["short battery", "poor battery", "battery life complaint"],
    appliesTo: ["electronics", "vacuum"],
  },
  {
    claim: "Can be noisy.",
    terms: ["noisy", "loud", "noise complaint"],
  },
];

const ownerPraisePatterns: EvidencePattern[] = [
  {
    claim: "Owners repeatedly recommend it.",
    terms: ["recommend", "recommended", "worth it", "would buy again", "love mine"],
  },
  {
    claim: "Owners report good long-term reliability.",
    terms: ["reliable", "held up", "still going", "long term", "years later"],
  },
  {
    claim: "Owners say it performs well in real use.",
    terms: ["works great", "performance", "does a great job", "very happy"],
  },
  {
    claim: "Owners consider it a good value.",
    terms: ["good value", "worth the money", "worth it", "for the price"],
  },
];

const ownerConcernPatterns: EvidencePattern[] = [
  {
    claim: "Owners mention durability or breakage concerns.",
    terms: ["broke", "broken", "stopped working", "failed", "durability", "poor quality"],
  },
  {
    claim: "Owners mention warranty or support frustrations.",
    terms: ["warranty", "customer service", "support", "return", "refund"],
  },
  {
    claim: "Owners say it may be overpriced.",
    terms: ["overpriced", "not worth", "too expensive", "regret"],
  },
  {
    claim: "Owners suggest buying a different option.",
    terms: ["avoid", "would not buy", "better off", "go with", "instead"],
  },
];

const complaintPatterns: ComplaintPattern[] = [
  {
    label: "Firm cushions or mattress comfort complaints",
    severity: "medium",
    terms: ["firm cushion", "too firm", "firm seat", "firm mattress", "uncomfortable"],
    appliesTo: ["furniture"],
  },
  {
    label: "Difficult assembly complaints",
    severity: "medium",
    terms: ["hard to assemble", "difficult assembly", "assembly problem", "assembly complaints"],
  },
  {
    label: "Durability or breakage complaints",
    severity: "high",
    terms: ["broke", "broken", "durability complaint", "poor quality", "stopped working"],
  },
  {
    label: "USB or charging reliability complaints",
    severity: "medium",
    terms: ["usb problem", "usb port broke", "charging problem", "not working"],
  },
  {
    label: "Backlight bleed complaints",
    severity: "medium",
    terms: ["backlight bleed", "ips glow"],
    appliesTo: ["electronics"],
  },
  {
    label: "Short battery life complaints",
    severity: "high",
    terms: ["short battery", "poor battery life", "battery life complaints"],
    appliesTo: ["electronics", "vacuum"],
  },
  {
    label: "Clogging complaints",
    severity: "medium",
    terms: ["clog", "clogging"],
    appliesTo: ["vacuum"],
  },
  {
    label: "Noise complaints",
    severity: "medium",
    terms: ["noisy", "loud", "noise complaints"],
  },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.$"-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const clean = value.replace(/\s+/g, " ").trim();
    const key = normalizeText(clean);

    if (!clean || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(clean);
  }

  return output;
}

function productCategoryText(product: ProductRecommendation) {
  return normalizeText(`${product.name} ${product.category}`);
}

function productContextText(product: ProductRecommendation) {
  return normalizeText(
    [
      product.name,
      product.category,
      product.why_recommended,
      product.best_for,
      product.price_value_verdict,
      ...product.citations.map((citation) => citation.what_it_supports),
    ].join(" "),
  );
}

function evidenceCategories(product: ProductRecommendation): Set<EvidenceCategory> {
  const text = productCategoryText(product);
  const categories = new Set<EvidenceCategory>();

  if (/\b(?:sleeper|sofa|couch|loveseat|sectional|mattress|futon|chair)\b/.test(text)) {
    categories.add("furniture");
  }

  if (/\b(?:monitor|laptop|tv|television|headphones?|keyboard|mouse|speaker|tablet|phone)\b/.test(text)) {
    categories.add("electronics");
  }

  if (/\b(?:vacuum|carpet cleaner|spot cleaner|floor cleaner)\b/.test(text)) {
    categories.add("vacuum");
  }

  if (/\b(?:oven|range|stove|cooktop|refrigerator|fridge|dishwasher|microwave|washer|dryer|freezer)\b/.test(text)) {
    categories.add("appliance");
  }

  if (categories.size === 0) {
    categories.add("general");
  }

  return categories;
}

function appliesToProduct(
  product: ProductRecommendation,
  appliesTo?: EvidenceCategory[],
) {
  if (!appliesTo || appliesTo.length === 0) {
    return true;
  }

  const categories = evidenceCategories(product);

  return appliesTo.some((category) => categories.has(category));
}

function isCategoryContaminated(product: ProductRecommendation, item: string) {
  const categories = evidenceCategories(product);
  const text = normalizeText(item);

  if (
    !categories.has("furniture") &&
    /\b(?:sleeper|sofa bed|pull out couch|couch|sofa|loveseat|mattress|cushion(?:s|ing)?|overnight sleep)\b/.test(
      text,
    )
  ) {
    return true;
  }

  if (!categories.has("electronics") && /\b(?:backlight bleed|ips glow)\b/.test(text)) {
    return true;
  }

  if (!categories.has("vacuum") && /\b(?:clogging|pet hair suction|carpet suction)\b/.test(text)) {
    return true;
  }

  return false;
}

function productSearchName(product: ProductRecommendation) {
  return product.name
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s+\|\s+.*$/, "")
    .trim();
}

function categoryTerms(product: ProductRecommendation) {
  const text = normalizeText(`${product.name} ${product.category}`);

  if (text.includes("monitor")) {
    return [
      "backlight bleed",
      "color accuracy",
      "USB-C problems",
      "warranty complaints",
    ];
  }

  if (text.includes("vacuum")) {
    return [
      "battery life complaints",
      "suction reviews",
      "pet hair reviews",
      "clogging problems",
    ];
  }

  if (
    text.includes("sleeper") ||
    text.includes("sofa") ||
    text.includes("couch") ||
    text.includes("loveseat")
  ) {
    return [
      "mattress comfort",
      "sleeper sofa complaints",
      "assembly reviews",
      "cushion firmness",
      "durability reviews",
    ];
  }

  return ["durability", "comfort", "assembly", "long term review"];
}

export function buildProductEvidenceQueries(product: ProductRecommendation) {
  const name = productSearchName(product);
  const baseQueries = [
    `${name} reviews`,
    `${name} complaints`,
    `${name} problems`,
    `${name} customer reviews`,
    `${name} reddit`,
    `${name} YouTube review`,
    `${name} durability`,
    `${name} comfort`,
    `${name} assembly`,
    `${name} long term review`,
  ];
  const categoryQueries = categoryTerms(product).map((term) => `${name} ${term}`);

  return uniqueStrings([
    ...baseQueries,
    ...buildRubricEvidenceQueries(product),
    ...categoryQueries,
  ]);
}

function rubricSearchTerms(product: ProductRecommendation) {
  const rubric = product.buyingRubric;

  if (!rubric) {
    return {
      facts: [],
      negative: [],
      positive: [],
      reviews: [],
    };
  }

  return {
    facts: uniqueStrings(rubric.mustVerifyFacts).slice(0, MAX_RUBRIC_QUERY_TERMS),
    negative: uniqueStrings(rubric.redFlags).slice(0, MAX_RUBRIC_QUERY_TERMS),
    positive: uniqueStrings(rubric.qualitySignals).slice(0, MAX_RUBRIC_QUERY_TERMS),
    reviews: uniqueStrings(rubric.reviewSignals).slice(0, MAX_RUBRIC_QUERY_TERMS),
  };
}

export function buildRubricEvidenceQueries(product: ProductRecommendation) {
  const name = productSearchName(product);
  const terms = rubricSearchTerms(product);

  return uniqueStrings([
    ...terms.facts.map((term) => `${name} ${term} specifications`),
    ...terms.positive.map((term) => `${name} ${term} reviews`),
    ...terms.reviews.map((term) => `${name} ${term} owner reviews`),
    ...terms.negative.map((term) => `${name} ${term} complaints`),
  ]);
}

export function buildReviewEvidenceLadderQueries(product: ProductRecommendation) {
  const name = productSearchName(product);
  const category = normalizeText(product.category);
  const categoryContext =
    category && !normalizeText(name).includes(category) ? product.category : "";
  const base = [name, categoryContext].filter(Boolean).join(" ");
  const rubricQueries = buildRubricEvidenceQueries(product);

  return uniqueStrings([
    `${name} exact product review`,
    ...rubricQueries.slice(0, 3),
    `${name} customer reviews owner reviews`,
    `${name} hands on review tested`,
    `${name} reddit forum owners`,
    `${name} YouTube review long term`,
    `${name} complaints problems`,
    `${name} broken stopped working warranty issues`,
    `${base} long term durability reviews`,
    ...categoryTerms(product).map((term) => `${name} ${term}`),
  ]);
}

export function buildNegativeEvidenceRetryQueries(product: ProductRecommendation) {
  const name = productSearchName(product);
  const rubricNegativeQueries = rubricSearchTerms(product).negative.map(
    (term) => `${name} ${term} complaints`,
  );

  return uniqueStrings([
    ...rubricNegativeQueries,
    `${name} complaints problems`,
    `${name} broken stopped working`,
    `${name} warranty customer service issues`,
    `${name} negative reviews`,
    `${name} reddit problems`,
    ...categoryTerms(product).map((term) => `${name} ${term} complaints`),
  ]);
}

export function buildRedditOwnerOpinionQueries(product: ProductRecommendation) {
  const name = productSearchName(product);
  const rubricReviewQueries = rubricSearchTerms(product).reviews.map(
    (term) => `site:reddit.com ${name} ${term}`,
  );

  return uniqueStrings([
    ...rubricReviewQueries,
    `site:reddit.com ${name} review owners`,
    `site:reddit.com ${name} problems worth it`,
    `site:reddit.com ${name} long term owner opinion`,
    `site:reddit.com ${name} alternative recommendation`,
  ]);
}

function sourceKey(source: SerperEvidenceSource) {
  try {
    const parsed = new URL(source.url);
    parsed.search = "";
    parsed.hash = "";
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`;
  } catch {
    return normalizeText(`${source.title} ${source.url}`);
  }
}

function dedupeSources(sources: SerperEvidenceSource[]) {
  const seen = new Set<string>();
  const deduped: SerperEvidenceSource[] = [];

  for (const source of sources) {
    const key = sourceKey(source);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(source);
  }

  return deduped;
}

async function collectEvidenceSources(
  product: ProductRecommendation,
  state: EvidenceSearchState,
  mode: ReviewEvidenceMode = "standard",
  signal?: AbortSignal,
) {
  const allQueries =
    mode === "trust_ladder"
      ? buildReviewEvidenceLadderQueries(product)
      : buildProductEvidenceQueries(product);
  const videoQuery = allQueries.find((query) => /youtube|video/i.test(query));
  const maxQueries =
    mode === "trust_ladder"
      ? MAX_TRUST_LADDER_QUERIES_PER_PRODUCT
      : MAX_EVIDENCE_QUERIES_PER_PRODUCT;
  const maxCalls =
    mode === "trust_ladder"
      ? MAX_TRUST_LADDER_CALLS_TOTAL
      : MAX_EVIDENCE_CALLS_TOTAL;
  const organicQueries = allQueries
    .filter((query) => query !== videoQuery)
    .slice(0, maxQueries - (videoQuery ? 1 : 0));
  const queries = videoQuery
    ? uniqueStrings([...organicQueries, videoQuery])
    : organicQueries;
  const sources: SerperEvidenceSource[] = [];

  for (const query of queries) {
    throwIfRequestCancelled(signal);
    if (state.callsUsed >= maxCalls) {
      break;
    }

    state.callsUsed += 1;
    const searchEvidence = /youtube|video/i.test(query)
      ? searchSerperVideoEvidence
      : searchSerperOrganicEvidence;

    sources.push(
      ...(await searchEvidence(
        query,
        MAX_EVIDENCE_RESULTS_PER_QUERY,
        {
          origin: "review_evidence",
          phase: "review_evidence_enrichment",
          purpose: "evidence",
          originalQuery: query,
          sourceDetail: product.name,
        },
        { signal },
      )),
    );
  }

  return dedupeSources(sources);
}

async function collectAdditionalEvidenceSources(
  queries: string[],
  state: EvidenceSearchState,
  mode: ReviewEvidenceMode,
  signal?: AbortSignal,
) {
  const maxCalls =
    mode === "trust_ladder"
      ? MAX_TRUST_LADDER_CALLS_TOTAL
      : MAX_EVIDENCE_CALLS_TOTAL;
  const sources: SerperEvidenceSource[] = [];

  for (const query of queries) {
    throwIfRequestCancelled(signal);
    if (state.callsUsed >= maxCalls) {
      break;
    }

    state.callsUsed += 1;
    const searchEvidence = /youtube|video/i.test(query)
      ? searchSerperVideoEvidence
      : searchSerperOrganicEvidence;

    sources.push(
      ...(await searchEvidence(
        query,
        MAX_EVIDENCE_RESULTS_PER_QUERY,
        {
          origin: "review_evidence",
          phase: "review_evidence_enrichment",
          purpose: "evidence",
          originalQuery: query,
          sourceDetail: "additional_evidence",
        },
        { signal },
      )),
    );
  }

  return dedupeSources(sources);
}

async function collectRedditOwnerOpinionSources(
  product: ProductRecommendation,
  state: EvidenceSearchState,
  mode: ReviewEvidenceMode,
  signal?: AbortSignal,
) {
  if (mode !== "trust_ladder") {
    return [];
  }

  return collectAdditionalEvidenceSources(
    buildRedditOwnerOpinionQueries(product).slice(
      0,
      MAX_REDDIT_OPINION_QUERIES_PER_PRODUCT,
    ),
    state,
    mode,
    signal,
  );
}

function containsAny(text: string, terms: string[]) {
  const normalized = normalizeText(text);

  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function meaningfulRubricTokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter(
      (token) =>
        token.length > 3 &&
        !/^(with|that|from|good|best|high|low|clear|page|product|explicit|mentions|without|details|verified|current|selling|price|listed|available|important|quality|review|reviews|owner|owners)$/.test(
          token,
        ),
    );
}

function rubricItemMatches(text: string, item: string) {
  const normalizedItem = normalizeText(item);

  if (!normalizedItem) {
    return false;
  }

  if (text.includes(normalizedItem)) {
    return true;
  }

  const tokens = meaningfulRubricTokens(item);
  const matchedTokens = tokens.filter((token) => text.includes(token));

  if (tokens.length === 0) {
    return false;
  }

  if (tokens.length <= 2) {
    return matchedTokens.length === tokens.length;
  }

  return (
    matchedTokens.length >= Math.min(3, Math.ceil(tokens.length * 0.45)) &&
    matchedTokens.length / tokens.length >= 0.4
  );
}

function rubricRedFlagNeedsNegativeContext(item: string) {
  return /\b(?:not|no|without|missing|unclear|ambiguous|unverified|conflict|conflicting|complaint|complaints|poor|issue|issues|problem|problems|fail|failure)\b/i.test(
    item,
  );
}

function sourceHasNegativeContext(text: string) {
  return /\b(?:not|no|without|missing|unclear|ambiguous|unverified|unknown|conflict|conflicting|complaint|complaints|poor|issue|issues|problem|problems|fail|failure|loud|noisy|leak|broken|stopped)\b/i.test(
    text,
  );
}

function rubricEvidenceTitle(value: string) {
  return value
    .replace(/\b(?:product page explicitly states|current selling price is|if listed|if relevant)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/, "");
}

function addRubricEvidence(
  product: ProductRecommendation,
  source: SerperEvidenceSource,
  bucket: ProductEvidenceBucket,
) {
  const rubric = product.buyingRubric;

  if (!rubric) {
    return;
  }

  const text = normalizeText(`${source.title} ${source.snippet}`);

  for (const signal of [
    ...rubric.qualitySignals,
    ...rubric.reviewSignals,
    ...rubric.mustVerifyFacts,
  ]) {
    if (!rubricItemMatches(text, signal)) {
      continue;
    }

    addEvidenceItem(bucket.positiveEvidence, {
      claim: rubricEvidenceTitle(signal),
      confidence: "Medium",
      sourceTitle: source.title,
      sourceUrl: source.url,
      snippet: source.snippet,
    });
  }

  for (const redFlag of rubric.redFlags) {
    if (!rubricItemMatches(text, redFlag)) {
      continue;
    }

    if (rubricRedFlagNeedsNegativeContext(redFlag) && !sourceHasNegativeContext(text)) {
      continue;
    }

    addEvidenceItem(bucket.negativeEvidence, {
      claim: rubricEvidenceTitle(redFlag),
      confidence: "Medium",
      sourceTitle: source.title,
      sourceUrl: source.url,
      snippet: source.snippet,
    });
  }
}

function firstCitation(product: ProductRecommendation) {
  return product.citations[0];
}

function productPageSource(product: ProductRecommendation) {
  const citation = firstCitation(product);

  return {
    sourceTitle: citation?.title || product.name,
    sourceUrl: citation?.url || product.product_page_url,
    snippet:
      citation?.what_it_supports ||
      "Product listing or cited source supports this detail.",
  };
}

function addEvidenceItem(
  items: ProductEvidenceItem[],
  item: ProductEvidenceItem,
) {
  if (
    !item.claim ||
    items.some((existing) => normalizeText(existing.claim) === normalizeText(item.claim))
  ) {
    return;
  }

  items.push(item);
}

function supportText(product: ProductRecommendation) {
  return [
    product.why_recommended,
    product.best_for,
    product.price_value_verdict,
    ...product.citations.map((citation) => citation.what_it_supports),
  ].join(" ");
}

function addConfirmedFeaturePros(
  product: ProductRecommendation,
  bucket: ProductEvidenceBucket,
) {
  const source = productPageSource(product);
  const text = supportText(product);
  const normalized = normalizeText(text);
  const width = text.match(/\b(\d+(?:\.\d+)?)[-\s]*(?:inches|inch|in\.?|")/i)?.[1];
  const featureClaims: Array<{
    claim: string;
    pattern: RegExp;
    appliesTo?: EvidenceCategory[];
  }> = [
    {
      claim: width ? `Compact ${width}-inch width.` : "",
      pattern: /\b(?:compact|small space|space saving|narrow|width|wide)\b/i,
    },
    {
      claim: "Includes USB ports.",
      pattern: /\busb\b/i,
    },
    {
      claim: "Includes cup holders.",
      pattern: /\bcup holders?\b/i,
    },
    {
      claim: "Adjustable shelves improve storage flexibility.",
      pattern: /\badjustable shel(?:f|ves)\b/i,
    },
    {
      claim: "Fingerprint-resistant finish is easier to keep clean.",
      pattern: /\bfingerprint[-\s]?resistant\b/i,
    },
    {
      claim: "Quiet operation.",
      pattern: /\bquiet (?:operation|performance)|runs quietly\b/i,
    },
    {
      claim: "Easy assembly.",
      pattern: /\beasy assembly|easy to assemble|simple assembly\b/i,
    },
    {
      claim: "Durable build quality.",
      pattern: /\bdurable|build quality|sturdy|well built\b/i,
    },
    {
      claim: "Comfortable cushioning.",
      pattern: /\bcomfortable cushions?|comfortable seating|holds their shape\b/i,
    },
    {
      claim: "Strong battery life.",
      pattern: /\blong battery|battery lasts|battery life\b/i,
    },
    {
      claim: "Good temperature consistency.",
      pattern: /\btemperature consistency|consistent temperature|holds temperature\b/i,
    },
    {
      claim: "Strong suction performance.",
      pattern: /\bstrong suction|good suction|powerful suction\b/i,
      appliesTo: ["vacuum"],
    },
  ];

  for (const item of featureClaims) {
    if ("appliesTo" in item && !appliesToProduct(product, item.appliesTo)) {
      continue;
    }

    if (!item.claim || !item.pattern.test(text) || !normalized) {
      continue;
    }

    addEvidenceItem(bucket.positiveEvidence, {
      claim: item.claim,
      confidence: source.sourceUrl ? "Medium" : "Low",
      ...source,
    });
  }
}

function addConfirmedSpecEvidence(
  product: ProductRecommendation,
  bucket: ProductEvidenceBucket,
) {
  addConfirmedFeaturePros(product, bucket);
}

function classifySourceEvidence(
  product: ProductRecommendation,
  source: SerperEvidenceSource,
  bucket: ProductEvidenceBucket,
) {
  const text = `${source.title} ${source.snippet}`;

  for (const pattern of positivePatterns) {
    if (!appliesToProduct(product, pattern.appliesTo)) {
      continue;
    }

    if (containsAny(text, pattern.terms)) {
      addEvidenceItem(bucket.positiveEvidence, {
        claim: pattern.claim,
        sourceTitle: source.title,
        sourceUrl: source.url,
        snippet: source.snippet,
        confidence: "Medium",
      });
    }
  }

  for (const pattern of negativePatterns) {
    if (!appliesToProduct(product, pattern.appliesTo)) {
      continue;
    }

    if (containsAny(text, pattern.terms)) {
      addEvidenceItem(bucket.negativeEvidence, {
        claim: pattern.claim,
        sourceTitle: source.title,
        sourceUrl: source.url,
        snippet: source.snippet,
        confidence: "Medium",
      });
    }
  }
}

function sourceSummarizesManyReviews(source: SerperEvidenceSource) {
  return /customers|reviewers|owners|many reviews|common complaint|reviews mention/i.test(
    `${source.title} ${source.snippet}`,
  );
}

function sourceLooksLikeReviewEvidence(source: SerperEvidenceSource) {
  return /\b(?:review|reviews|reviewers|customers|owners|tested|hands[-\s]?on|reddit|forum|youtube)\b/i.test(
    `${source.title} ${source.snippet} ${source.url}`,
  );
}

function reviewEvidenceIsThin(
  bucket: ProductEvidenceBucket,
  sources: SerperEvidenceSource[],
) {
  const reviewSourceCount = new Set(
    sources.filter(sourceLooksLikeReviewEvidence).map(sourceKey),
  ).size;

  return (
    reviewSourceCount < 3 ||
    (bucket.negativeEvidence.length === 0 &&
      bucket.repeatedComplaints.length === 0)
  );
}

function collectRepeatedComplaints(
  product: ProductRecommendation,
  sources: SerperEvidenceSource[],
): RepeatedComplaintEvidence[] {
  return complaintPatterns.flatMap((pattern) => {
    if (!appliesToProduct(product, pattern.appliesTo)) {
      return [];
    }

    const matchingSources = sources.filter((source) =>
      containsAny(`${source.title} ${source.snippet}`, pattern.terms),
    );
    const sourceCount = new Set(matchingSources.map(sourceKey)).size;
    const hasReviewSummary = matchingSources.some(sourceSummarizesManyReviews);

    if (sourceCount < 2 && !hasReviewSummary) {
      return [];
    }

    return [
      {
        complaint: pattern.label,
        sourceCount,
        evidenceSnippets: matchingSources
          .map((source) => source.snippet || source.title)
          .filter(Boolean)
          .slice(0, 4),
        severity: pattern.severity,
      },
    ];
  });
}

function isRedditSource(source: SerperEvidenceSource) {
  return /(^|\.)reddit\.com$/i.test(sourceHost(source));
}

function sourceHost(source: SerperEvidenceSource) {
  try {
    return new URL(source.url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function matchingOpinionClaims(
  sources: SerperEvidenceSource[],
  patterns: EvidencePattern[],
) {
  return patterns.flatMap((pattern) => {
    const matches = sources.filter((source) =>
      containsAny(`${source.title} ${source.snippet}`, pattern.terms),
    );
    const sourceCount = new Set(matches.map(sourceKey)).size;

    if (sourceCount === 0) {
      return [];
    }

    return [
      {
        claim: pattern.claim,
        sourceCount,
      },
    ];
  });
}

function summarizeOwnerOpinion(
  sources: SerperEvidenceSource[],
): ProductOwnerOpinion | undefined {
  const redditSources = dedupeSources(sources.filter(isRedditSource));
  const sourceCount = redditSources.length;

  if (sourceCount === 0) {
    return undefined;
  }

  const praises = matchingOpinionClaims(redditSources, ownerPraisePatterns)
    .sort((first, second) => second.sourceCount - first.sourceCount)
    .map((item) => item.claim);
  const concerns = matchingOpinionClaims(redditSources, ownerConcernPatterns)
    .sort((first, second) => second.sourceCount - first.sourceCount)
    .map((item) => item.claim);
  const redditThreadCount = new Set(redditSources.map(sourceKey)).size;
  const sentiment: ProductOwnerOpinion["sentiment"] =
    redditThreadCount < 2 && praises.length === 0 && concerns.length === 0
      ? "limited"
      : concerns.length > 0 && praises.length > 0
        ? "mixed"
        : concerns.length > 0
          ? "negative"
          : praises.length > 0
            ? "positive"
            : "limited";
  const summary =
    sentiment === "positive"
      ? "Reddit owner discussions are mostly positive in the snippets found."
      : sentiment === "negative"
        ? "Reddit owner discussions surface more concerns than praise in the snippets found."
        : sentiment === "mixed"
          ? "Reddit owner discussions are mixed, with both praise and concerns."
          : "Only limited Reddit owner discussion was found.";

  return {
    concerns: uniqueStrings(concerns).slice(0, 3),
    praises: uniqueStrings(praises).slice(0, 3),
    redditThreadCount,
    sentiment,
    sourceCount,
    sourceUrls: redditSources.map((source) => source.url).slice(0, 4),
    summary,
  };
}

function addImportantUnknowns(
  product: ProductRecommendation,
  bucket: ProductEvidenceBucket,
  sources: SerperEvidenceSource[],
) {
  const text = productContextText(product);
  const maybeSleeper =
    text.includes("sleeper") || text.includes("sofa bed") || text.includes("pull out");
  const maybeElectronics =
    text.includes("usb") || text.includes("monitor") || text.includes("battery");

  if (sources.length < 2) {
    bucket.unknowns.push({
      topic: "Independent review depth",
      reason:
        "Only limited independent review snippets were found, so long-term owner patterns are not well proven.",
    });
  }

  if (maybeSleeper && !/mattress comfort|overnight|sleep comfort/.test(text)) {
    bucket.unknowns.push({
      topic: "Sleeper comfort",
      reason:
        "Sources mention sleeper functionality but do not clearly verify overnight mattress comfort.",
    });
  }

  if (maybeElectronics && !/durability|long term|reliability/.test(text)) {
    bucket.unknowns.push({
      topic: "Feature durability",
      reason:
        "Convenience features are listed, but long-term durability evidence was not found in the review snippets.",
    });
  }

  addRubricUnknowns(product, bucket, sources);
}

function rubricVerificationText(
  product: ProductRecommendation,
  sources: SerperEvidenceSource[],
) {
  return normalizeText(
    [
      productContextText(product),
      product.metadata?.title?.value,
      product.metadata?.brand?.value,
      product.metadata?.modelNumber?.value,
      product.metadata?.gtin?.value,
      product.metadata?.canonicalUrl?.value,
      product.metadata?.colors?.value?.join(" "),
      product.metadata?.dimensions?.width?.value,
      product.metadata?.dimensions?.height?.value,
      product.metadata?.dimensions?.depth?.value,
      ...(product.metadata?.offers || []).flatMap((offer) => [
        offer.price.value,
        offer.retailer,
        offer.availability.value,
      ]),
      ...sources.flatMap((source) => [source.title, source.snippet]),
      ...bucketEvidenceText(bucketFromProduct(product)),
    ]
      .filter((value) => value !== undefined && value !== null)
      .join(" "),
  );
}

function bucketEvidenceText(bucket: ProductEvidenceBucket | undefined) {
  if (!bucket) {
    return [];
  }

  return [
    ...bucket.positiveEvidence.flatMap((item) => [item.claim, item.snippet]),
    ...bucket.negativeEvidence.flatMap((item) => [item.claim, item.snippet]),
  ];
}

function bucketFromProduct(product: ProductRecommendation) {
  return product.evidenceBucket;
}

function addRubricUnknowns(
  product: ProductRecommendation,
  bucket: ProductEvidenceBucket,
  sources: SerperEvidenceSource[],
) {
  const rubric = product.buyingRubric;

  if (!rubric?.mustVerifyFacts.length) {
    return;
  }

  const verificationText = rubricVerificationText(product, sources);
  const alreadyKnown = [
    ...bucket.positiveEvidence.flatMap((item) => [item.claim, item.snippet]),
    ...bucket.negativeEvidence.flatMap((item) => [item.claim, item.snippet]),
  ]
    .map(normalizeText)
    .join(" ");
  const combined = `${verificationText} ${alreadyKnown}`;
  const missingFacts = uniqueStrings(rubric.mustVerifyFacts)
    .filter((fact) => !rubricFactIsOptional(fact))
    .filter((fact) => !rubricFactSatisfiedByKnownData(product, fact, combined))
    .filter((fact) => !rubricItemMatches(combined, fact))
    .map((fact) => ({
      fact,
      importance: classifyRubricFactImportance(fact),
    }))
    .sort((a, b) => {
      const rank =
        rubricImportanceRank(b.importance.importance) -
        rubricImportanceRank(a.importance.importance);

      return rank || b.importance.weight - a.importance.weight;
    })
    .slice(0, 4);

  for (const { fact, importance } of missingFacts) {
    bucket.unknowns.push({
      importance: importance.importance,
      topic: `Rubric fact: ${rubricEvidenceTitle(fact)}`,
      reason: `${importance.reason} The evidence gathered for this product did not clearly verify it.`,
    });
  }
}

function rubricFactIsOptional(fact: string) {
  return /\bif\s+(?:shown|listed|available|relevant|important|included|applicable)\b|\bif any\b/i.test(
    fact,
  );
}

function hasVerifiedOffer(product: ProductRecommendation) {
  return (product.metadata?.offers || []).some(
    (offer) =>
      offer.price.value !== null &&
      Number.isFinite(offer.price.value) &&
      offer.price.value > 0,
  );
}

function hasKnownDimensions(product: ProductRecommendation, text: string) {
  const dimensions = product.metadata?.dimensions;

  return Boolean(
    dimensions?.width?.value ||
      dimensions?.height?.value ||
      dimensions?.depth?.value ||
      /\b(?:width|height|depth|dimension|clearance|fit)\b.{0,80}\b\d+(?:\.\d+)?\s*(?:in|inch|inches|")\b/i.test(
        text,
      ),
  );
}

function rubricFactSatisfiedByKnownData(
  product: ProductRecommendation,
  fact: string,
  normalizedEvidenceText: string,
) {
  const normalizedFact = normalizeText(fact);
  const originalText = [
    product.name,
    product.category,
    product.why_recommended,
    product.best_for,
    product.price_value_verdict,
    ...product.citations.map((citation) => citation.what_it_supports),
  ].join(" ");

  if (/\b(?:price|budget|at or below|under)\b/.test(normalizedFact)) {
    return hasVerifiedOffer(product) || /\$\s*\d/.test(product.estimated_price_range);
  }

  if (/\b(?:stainless|finish|color)\b/.test(normalizedFact)) {
    return /\b(?:stainless steel|fingerprint resistant stainless|monochromatic stainless)\b/i.test(
      originalText,
    ) || /\b(?:stainless steel|fingerprint resistant stainless|monochromatic stainless)\b/i.test(
      normalizedEvidenceText,
    );
  }

  if (/\b(?:type|configuration|french door|side by side|top freezer|bottom freezer|counter depth|standard depth)\b/.test(normalizedFact)) {
    return /\b(?:french door|side[-\s]?by[-\s]?side|top[-\s]?freezer|bottom[-\s]?freezer|counter[-\s]?depth|standard[-\s]?depth|freezerless|mini fridge|compact)\b/i.test(
      originalText,
    );
  }

  if (/\b(?:dimension|width|height|depth|clearance|installation|fit)\b/.test(normalizedFact)) {
    return hasKnownDimensions(product, originalText);
  }

  if (/\b(?:capacity|cubic|cu ft|freezer split|refrigerator freezer split)\b/.test(normalizedFact)) {
    return /\b\d+(?:\.\d+)?\s*(?:cu\.?\s*ft|cubic feet?)\b/i.test(originalText);
  }

  if (/\b(?:model|model number|gtin)\b/.test(normalizedFact)) {
    return Boolean(
      product.metadata?.modelNumber?.value ||
        product.metadata?.gtin?.value ||
        /\b[A-Z]{2,}\d{2,}[A-Z0-9-]*\b/.test(originalText),
    );
  }

  if (/\b(?:availability|in stock|delivery|sold by|retailer|brand)\b/.test(normalizedFact)) {
    return Boolean(
      product.metadata?.offers?.some((offer) => offer.availability.value) ||
        product.product_page_url ||
        product.citations.length > 0,
    );
  }

  return rubricItemMatches(normalizedEvidenceText, fact);
}

function confidenceRank(confidence: EvidenceConfidence) {
  if (confidence === "High") {
    return 3;
  }

  if (confidence === "Medium") {
    return 2;
  }

  return 1;
}

function rankEvidence(first: ProductEvidenceItem, second: ProductEvidenceItem) {
  return confidenceRank(second.confidence) - confidenceRank(first.confidence);
}

function usefulOriginalItems(product: ProductRecommendation, items: string[]) {
  return items.filter(
    (item) =>
      item.trim() &&
      !isCategoryContaminated(product, item) &&
      !isBudgetComplianceCopy(item) &&
      !genericFillerPatterns.some((pattern) => pattern.test(item.trim())),
  );
}

function usefulProductAdvantages(product: ProductRecommendation, items: string[]) {
  return usefulOriginalItems(product, items).filter((item) => {
    const clean = item.trim();

    return (
      clean.length > 0 &&
      !/^(?:fuel type|surface type|power source|cleaning type|category):/i.test(clean)
    );
  });
}

function buildPros(product: ProductRecommendation, bucket: ProductEvidenceBucket) {
  const evidencePros = bucket.positiveEvidence
    .sort(rankEvidence)
    .map((item) => item.claim);
  const originalPros = usefulProductAdvantages(product, product.pros).slice(0, 2);
  const merged = uniqueStrings(
    usefulProductAdvantages(product, [...evidencePros, ...originalPros]),
  );

  if (merged.length > 0) {
    return sanitizeProductPros(merged).slice(0, 5);
  }

  return [];
}

function buildCons(product: ProductRecommendation, bucket: ProductEvidenceBucket) {
  const evidenceCons = bucket.negativeEvidence
    .sort(rankEvidence)
    .map((item) => item.claim);
  const originalCons = usefulOriginalItems(product, product.cons).slice(0, 1);
  const merged = uniqueStrings(
    usefulOriginalItems(product, [...evidenceCons, ...originalCons]),
  );

  return sanitizeProductCons(merged).slice(0, 4);
}

function buildComplaints(bucket: ProductEvidenceBucket) {
  const complaints = bucket.repeatedComplaints
    .sort((first, second) => {
      if (second.sourceCount !== first.sourceCount) {
        return second.sourceCount - first.sourceCount;
      }

      const severityRank = { high: 3, medium: 2, low: 1 };
      return severityRank[second.severity] - severityRank[first.severity];
    })
    .map((item) => `${item.complaint} (${item.sourceCount} sources)`);

  return complaints.slice(0, 4);
}

function buildBucketFromSources(
  product: ProductRecommendation,
  sources: SerperEvidenceSource[],
): ProductEvidenceBucket {
  const bucket: ProductEvidenceBucket = {
    positiveEvidence: [],
    negativeEvidence: [],
    ownerOpinion: summarizeOwnerOpinion(sources),
    repeatedComplaints: collectRepeatedComplaints(product, sources),
    unknowns: [],
  };

  addConfirmedSpecEvidence(product, bucket);

  for (const source of sources) {
    classifySourceEvidence(product, source, bucket);
    addRubricEvidence(product, source, bucket);
  }

  addImportantUnknowns(product, bucket, sources);

  return bucket;
}

export function applyEvidenceBucketToProduct(
  product: ProductRecommendation,
  bucket: ProductEvidenceBucket,
): ProductRecommendation {
  return {
    ...product,
    evidenceBucket: bucket,
    pros: buildPros(product, bucket),
    cons: buildCons(product, bucket),
    common_complaints: buildComplaints(bucket),
  };
}

export async function enrichProductWithReviewEvidence(
  product: ProductRecommendation,
  state: EvidenceSearchState = { callsUsed: 0 },
  options: { mode?: ReviewEvidenceMode; signal?: AbortSignal } = {},
) {
  throwIfRequestCancelled(options.signal);
  const mode = options.mode || "standard";
  let sources = await collectEvidenceSources(
    product,
    state,
    mode,
    options.signal,
  );
  const redditSources = await collectRedditOwnerOpinionSources(
    product,
    state,
    mode,
    options.signal,
  );

  if (redditSources.length > 0) {
    sources = dedupeSources([...sources, ...redditSources]);
  }

  let bucket = buildBucketFromSources(product, sources);

  if (mode === "trust_ladder" && reviewEvidenceIsThin(bucket, sources)) {
    const retrySources = await collectAdditionalEvidenceSources(
      buildNegativeEvidenceRetryQueries(product),
      state,
      mode,
      options.signal,
    );

    if (retrySources.length > 0) {
      sources = dedupeSources([...sources, ...retrySources]);
      bucket = buildBucketFromSources(product, sources);
    }
  }

  return applyEvidenceBucketToProduct(product, bucket);
}

function displayedProducts(result: RecommendationResult) {
  return uniqueStrings([
    ...result.exactMatches.map((product) => product.name),
    ...(result.premiumAboveBudget || []).map((product) => product.name),
    ...result.nearMatches.map((product) => product.name),
  ]);
}

export async function enrichResultWithReviewEvidence(
  result: RecommendationResult,
  options: ProductEvidenceEnrichmentOptions = {},
) {
  throwIfRequestCancelled(options.signal);
  const state: EvidenceSearchState = { callsUsed: 0 };
  const productsToEnrich = new Map<string, ProductRecommendation>();
  const maxProducts = options.maxProducts ?? 10;

  for (const product of [
    ...result.exactMatches,
    ...(result.premiumAboveBudget || []),
    ...result.nearMatches,
  ]) {
    if (productsToEnrich.size >= maxProducts) {
      break;
    }

    productsToEnrich.set(product.name, product);
  }

  const products = Array.from(productsToEnrich.entries());
  const fullTrustLadderProductCount = options.fullTrustLadderProductCount ?? products.length;
  const enrichedProducts = await mapWithConcurrency(
    products,
    options.concurrency ?? 1,
    async ([name, product], index) => {
      throwIfRequestCancelled(options.signal);
      const weakEvidence =
        product.source_consensus === "Weak" ||
        product.confidence_score < 65 ||
        product.citations.length < 2;
      const mode =
        options.mode === "trust_ladder" &&
        (index < fullTrustLadderProductCount || weakEvidence)
          ? "trust_ladder"
          : "standard";

      return [
        name,
        await enrichProductWithReviewEvidence(product, state, {
          mode,
          signal: options.signal,
        }),
      ] as const;
    },
  );
  const enrichedByName = new Map<string, ProductRecommendation>(enrichedProducts);

  const enrich = (product: ProductRecommendation) =>
    enrichedByName.get(product.name) || product;
  const exactMatches = result.exactMatches.map(enrich);
  const premiumAboveBudget = (result.premiumAboveBudget || []).map(enrich);
  const nearMatches = result.nearMatches.map(enrich);
  const names = new Set(
    displayedProducts({
      ...result,
      exactMatches,
      premiumAboveBudget,
      nearMatches,
    }),
  );

  return {
    ...result,
    exactMatches,
    premiumAboveBudget,
    nearMatches,
    recommendations: exactMatches.filter((product) => names.has(product.name)),
  };
}

export const productEvidenceTestExports = {
  buildBucketFromSources,
  buildNegativeEvidenceRetryQueries,
  buildProductEvidenceQueries,
  buildRedditOwnerOpinionQueries,
  buildRubricEvidenceQueries,
  buildReviewEvidenceLadderQueries,
  collectRepeatedComplaints,
  reviewEvidenceIsThin,
};

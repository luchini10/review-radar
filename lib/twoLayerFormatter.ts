import {
  hashTwoLayerResearchText,
  TWO_LAYER_RESEARCH_VERSION,
  type TwoLayerResearch,
  validateTwoLayerResearchExtraction,
} from "./twoLayerRecommendation.ts";
import { normalizeTwoLayerSourceUrl } from "./twoLayerSourceUrl.ts";

export const TWO_LAYER_FORMATTER_VERSION =
  "oai-two-layer-deterministic-formatter-v1";

export type TwoLayerResponseSource = {
  url: string;
  title?: string | null;
  type?: string | null;
};

export type TwoLayerFormatterResult = {
  formatterVersion: typeof TWO_LAYER_FORMATTER_VERSION;
  formattedOutput: TwoLayerResearch;
  diagnostics: {
    recommendationCount: number;
    registeredSourceCount: number;
    ignoredTransactionalSectionCount: number;
  };
};

export type TwoLayerFormatterFailureReason =
  | "product_shape"
  | "source_registry"
  | "source_title"
  | "extraction_validation";

export type TwoLayerFormatterFailureCause =
  | "numbered_product_headings_missing"
  | "product_ranks_noncontiguous"
  | "required_why_section_missing"
  | "required_overall_section_missing"
  | "required_pros_section_missing"
  | "required_cons_section_missing"
  | "required_sources_section_missing"
  | "required_section_missing"
  | "why_section_empty"
  | "overall_section_empty"
  | "required_section_empty"
  | "product_identity_unparseable"
  | "product_block_incomplete"
  | "source_url_invalid"
  | "cited_source_unregistered"
  | "product_registered_source_missing"
  | "source_registration_lost"
  | "registered_source_title_missing"
  | "extraction_schema_invalid"
  | "extraction_hash_mismatch"
  | "extraction_source_integrity"
  | "extraction_order_integrity"
  | "extraction_text_integrity"
  | "extraction_unknown";

export class TwoLayerFormatterError extends Error {
  readonly reason: TwoLayerFormatterFailureReason;
  readonly failureCause: TwoLayerFormatterFailureCause;

  constructor(
    reason: TwoLayerFormatterFailureReason,
    failureCause: TwoLayerFormatterFailureCause,
    message: string,
  ) {
    super(message);
    this.name = "TwoLayerFormatterError";
    this.reason = reason;
    this.failureCause = failureCause;
  }
}

export function twoLayerFormatterFailureReason(error: unknown) {
  return error instanceof TwoLayerFormatterError ? error.reason : "unknown";
}

export function twoLayerFormatterFailureDiagnostic(error: unknown) {
  return error instanceof TwoLayerFormatterError
    ? { reason: error.reason, cause: error.failureCause }
    : { reason: "unknown" as const, cause: "unknown" as const };
}

type ProductBlock = {
  rank: number;
  headingStatus: "Best Match" | "Close Match";
  headingIdentity: string;
  text: string;
};

type ParsedSection = {
  heading: string;
  body: string;
};

const productHeadingPattern =
  /^#\s+#(\d+)\s+(Best Match|Close Match)\s+[—–-]\s+(.+?)\s*$/gim;
const markdownUrlPattern = /\]\((https?:\/\/[^)\s]+)\)/gi;

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function extractMarkdownUrls(value: string) {
  return unique(
    [...value.matchAll(markdownUrlPattern)].map((match) => match[1]),
  );
}

function productBlocks(answer: string): ProductBlock[] {
  const matches = [...answer.matchAll(productHeadingPattern)];
  if (matches.length === 0) {
    throw new TwoLayerFormatterError(
      "product_shape",
      "numbered_product_headings_missing",
      "Two-layer formatter found no numbered product headings",
    );
  }

  return matches.map((match, index) => {
    const rank = Number(match[1]);
    const bodyStart = (match.index || 0) + match[0].length;
    const nextProductStart = matches[index + 1]?.index ?? answer.length;
    const remaining = answer.slice(bodyStart, nextProductStart);
    const nextTopLevelSection = remaining.search(/^##\s+/m);
    const bodyEnd =
      nextTopLevelSection >= 0
        ? bodyStart + nextTopLevelSection
        : nextProductStart;
    return {
      rank,
      headingStatus: match[2] as "Best Match" | "Close Match",
      headingIdentity: match[3].trim(),
      text: answer.slice(bodyStart, bodyEnd),
    };
  });
}

function parseSections(blockText: string) {
  const headingPattern = /^###\s+(.+?)\s*$/gm;
  const matches = [...blockText.matchAll(headingPattern)];
  return matches.map((match, index) => {
    const bodyStart = (match.index || 0) + match[0].length;
    const bodyEnd = matches[index + 1]?.index ?? blockText.length;
    return {
      heading: match[1].trim(),
      body: blockText.slice(bodyStart, bodyEnd).trim(),
    } satisfies ParsedSection;
  });
}

function findSection(
  sections: readonly ParsedSection[],
  headingPrefix: string,
  required = true,
) {
  const section = sections.find((candidate) =>
    candidate.heading.toLowerCase().startsWith(headingPrefix.toLowerCase()),
  );
  if (!section && required) {
    throw new TwoLayerFormatterError(
      "product_shape",
      missingSectionFailureCause(headingPrefix),
      `Two-layer formatter missing section: ${headingPrefix}`,
    );
  }
  return section || null;
}

function missingSectionFailureCause(
  headingPrefix: string,
): TwoLayerFormatterFailureCause {
  const normalized = headingPrefix.toLowerCase();
  if (normalized.startsWith("why it ranks")) {
    return "required_why_section_missing";
  }
  if (normalized.startsWith("overall assessment")) {
    return "required_overall_section_missing";
  }
  if (normalized.startsWith("pros")) return "required_pros_section_missing";
  if (normalized.startsWith("cons")) return "required_cons_section_missing";
  if (normalized.startsWith("sources")) {
    return "required_sources_section_missing";
  }
  return "required_section_missing";
}

function emptySectionFailureCause(
  heading: string,
): TwoLayerFormatterFailureCause {
  const normalized = heading.toLowerCase();
  if (normalized.startsWith("why it ranks")) return "why_section_empty";
  if (normalized.startsWith("overall assessment")) {
    return "overall_section_empty";
  }
  return "required_section_empty";
}

function firstParagraph(section: ParsedSection) {
  const paragraph = section.body
    .split(/\r?\n\s*\r?\n/)
    .map((value) => value.trim())
    .find(Boolean);
  if (!paragraph) {
    throw new TwoLayerFormatterError(
      "product_shape",
      emptySectionFailureCause(section.heading),
      `Two-layer formatter found empty section: ${section.heading}`,
    );
  }
  return paragraph;
}

function bulletItems(section: ParsedSection | null) {
  if (!section) return [];
  return [...section.body.matchAll(/^\s*-\s+(.+?)\s*$/gm)].map((match) =>
    match[1].trim(),
  );
}

function sentences(value: string) {
  const matches = value.match(/[^.!?]+[.!?](?=\s|$)|[^.!?]+$/g) || [];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

function chooseAssessmentSentence(
  overall: string,
  pattern: RegExp,
  fallback: string,
) {
  return sentences(overall).find((sentence) => pattern.test(sentence)) || fallback;
}

function parseIdentity(value: string) {
  let productName = value.trim();
  let model: string | null = null;
  let variant: string | null = null;
  const modelMarker = productName.toLowerCase().lastIndexOf(" model ");

  if (modelMarker >= 0) {
    model = productName.slice(modelMarker + " model ".length).trim();
    const beforeModel = productName
      .slice(0, modelMarker)
      .replace(/[\s,]+$/, "")
      .trim();
    const commaIndex = beforeModel.lastIndexOf(",");
    if (commaIndex >= 0) {
      productName = beforeModel.slice(0, commaIndex).trim();
      variant = beforeModel.slice(commaIndex + 1).trim() || null;
    } else {
      productName = beforeModel;
    }
  } else {
    const commaIndex = productName.lastIndexOf(",");
    if (commaIndex >= 0) {
      variant = productName.slice(commaIndex + 1).trim() || null;
      productName = productName.slice(0, commaIndex).trim();
    }
  }

  const brand = productName.split(/\s+/)[0]?.trim() || "";
  if (!brand || !productName) {
    throw new TwoLayerFormatterError(
      "product_shape",
      "product_identity_unparseable",
      "Two-layer formatter could not parse product identity",
    );
  }
  return { brand, product_name: productName, model, variant };
}

function slug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);
}

function recommendationKey(
  identity: ReturnType<typeof parseIdentity>,
  rank: number,
) {
  return `${slug([identity.product_name, identity.model].filter(Boolean).join(" "))}-${rank}`;
}

function statusFromBlock(block: ProductBlock) {
  const statusLine = block.text.match(
    /^\*\*Recommendation status:\*\*\s*\*\*(.+?)\*\*\s*$/im,
  )?.[1];
  if (/\bClose Match\b/i.test(statusLine || "")) return "Close Match" as const;
  if (/\bBest Match\b/i.test(statusLine || "")) return "Best Match" as const;
  return block.headingStatus;
}

function normalizeRegisteredSourceUrl(value: string) {
  try {
    return normalizeTwoLayerSourceUrl(value);
  } catch {
    throw new TwoLayerFormatterError(
      "source_registry",
      "source_url_invalid",
      "Two-layer formatter found an invalid registered source URL",
    );
  }
}

export function formatTwoLayerMasterPromptAnswer(input: {
  rawResearchText: string;
  responseSources: readonly TwoLayerResponseSource[];
}): TwoLayerFormatterResult {
  const blocks = productBlocks(input.rawResearchText);
  const ranks = blocks.map((block) => block.rank);
  if (ranks.some((rank, index) => rank !== index + 1)) {
    throw new TwoLayerFormatterError(
      "product_shape",
      "product_ranks_noncontiguous",
      "Two-layer formatter requires contiguous product ranks",
    );
  }

  const registry = new Map<string, TwoLayerResponseSource>();
  for (const source of input.responseSources) {
    if (!source.url) continue;
    const normalized = normalizeRegisteredSourceUrl(source.url);
    if (!registry.has(normalized)) registry.set(normalized, source);
  }

  const citedUrls = unique(
    blocks.flatMap((block) =>
      parseSections(block.text)
        .filter(
          (section) =>
            !section.heading.toLowerCase().startsWith("current price"),
        )
        .flatMap((section) => extractMarkdownUrls(section.body)),
    ),
  ).map(normalizeRegisteredSourceUrl);
  const canonicalCitedUrls = unique(citedUrls);
  const missingUrls = canonicalCitedUrls.filter(
    (url) => !registry.has(url),
  );
  if (missingUrls.length > 0) {
    throw new TwoLayerFormatterError(
      "source_registry",
      "cited_source_unregistered",
      "Two-layer formatter source absent from response registry",
    );
  }

  const urlToId = new Map(
    canonicalCitedUrls.map((url, index) => [url, `s${index + 1}`]),
  );
  const sourceIdsForText = (value: string, fallback: readonly string[] = []) => {
    const ids = extractMarkdownUrls(value)
      .map((url) => urlToId.get(normalizeRegisteredSourceUrl(url)))
      .filter((id): id is string => Boolean(id));
    return unique(ids.length > 0 ? ids : fallback);
  };

  const recommendations = blocks.map((block) => {
    const sections = parseSections(block.text);
    const whySection = findSection(sections, "Why it ranks");
    const overallSection = findSection(sections, "Overall assessment");
    const prosSection = findSection(sections, "Pros");
    const consSection = findSection(sections, "Cons");
    const sourceSection = findSection(sections, "Sources");
    const specificationsSection = findSection(
      sections,
      "Key specifications",
      false,
    );
    const performanceSection = findSection(
      sections,
      "Performance and quality signals",
      false,
    );
    const ownerSection = findSection(
      sections,
      "Owner-review analysis",
      false,
    );

    if (!whySection || !overallSection || !prosSection || !consSection || !sourceSection) {
      throw new TwoLayerFormatterError(
        "product_shape",
        "product_block_incomplete",
        `Two-layer formatter found incomplete product block #${block.rank}`,
      );
    }

    const blockSourceIds = sourceIdsForText(sourceSection.body);
    if (blockSourceIds.length === 0) {
      throw new TwoLayerFormatterError(
        "source_registry",
        "product_registered_source_missing",
        `Two-layer formatter product #${block.rank} has no registered source`,
      );
    }
    const why = firstParagraph(whySection);
    const overall = firstParagraph(overallSection);
    const overallSourceIds = sourceIdsForText(overall, blockSourceIds);
    const identity = parseIdentity(block.headingIdentity);
    const sourcedItems = (
      section: ParsedSection | null,
      claimType:
        | "specification"
        | "professional_performance"
        | "owner_feedback",
    ) => {
      return bulletItems(section).map((text) => ({
        claim_type: claimType,
        text,
        source_ids: sourceIdsForText(text),
        evidence_scope: "unresolved" as const,
      }));
    };

    return {
      key: recommendationKey(identity, block.rank),
      rank: block.rank,
      recommendation_status: statusFromBlock(block),
      identity: {
        ...identity,
        source_ids: blockSourceIds,
      },
      assessment: {
        why,
        best_for: chooseAssessmentSentence(
          overall,
          /\b(?:best|ideal|strong option)\s+for\b/i,
          overall,
        ),
        main_tradeoff: chooseAssessmentSentence(
          overall,
          /\b(?:tradeoff|drawback|limitation|however|but)\b/i,
          overall,
        ),
        source_ids: unique([
          ...sourceIdsForText(why, blockSourceIds),
          ...overallSourceIds,
        ]),
      },
      pros: bulletItems(prosSection).map((text) => ({
        text,
        source_ids: sourceIdsForText(text, blockSourceIds),
      })),
      cons: bulletItems(consSection).map((text) => ({
        text,
        source_ids: sourceIdsForText(text, blockSourceIds),
      })),
      claims: [
        ...sourcedItems(specificationsSection, "specification"),
        ...sourcedItems(performanceSection, "professional_performance"),
        ...sourcedItems(ownerSection, "owner_feedback"),
      ],
    };
  });

  const formattedOutput = {
    version: TWO_LAYER_RESEARCH_VERSION,
    research_text_sha256: hashTwoLayerResearchText(input.rawResearchText),
    sources: canonicalCitedUrls.map((url) => {
      const registered = registry.get(url);
      if (!registered) {
        throw new TwoLayerFormatterError(
          "source_registry",
          "source_registration_lost",
          "Two-layer formatter lost source registration",
        );
      }
      const title = registered.title?.trim();
      if (!title) {
        throw new TwoLayerFormatterError(
          "source_title",
          "registered_source_title_missing",
          "Two-layer formatter source title absent from response registry",
        );
      }
      return {
        id: urlToId.get(url) || "",
        title,
        url,
        role: "other" as const,
      };
    }),
    recommendations,
  };

  let accepted: TwoLayerResearch;
  try {
    accepted = validateTwoLayerResearchExtraction({
      rawResearchText: input.rawResearchText,
      responseSourceUrls: input.responseSources.map((source) => source.url),
      formattedOutput,
    });
  } catch (error) {
    if (error instanceof TwoLayerFormatterError) throw error;
    throw new TwoLayerFormatterError(
      "extraction_validation",
      extractionFailureCause(error),
      "Two-layer formatter extraction validation failed",
    );
  }

  return {
    formatterVersion: TWO_LAYER_FORMATTER_VERSION,
    formattedOutput: accepted,
    diagnostics: {
      recommendationCount: accepted.recommendations.length,
      registeredSourceCount: accepted.sources.length,
      ignoredTransactionalSectionCount: blocks.filter((block) =>
        parseSections(block.text).some((section) =>
          section.heading.toLowerCase().startsWith("current price"),
        ),
      ).length,
    },
  };
}

function extractionFailureCause(
  error: unknown,
): TwoLayerFormatterFailureCause {
  if (error instanceof Error && error.name === "ZodError") {
    return "extraction_schema_invalid";
  }
  const message = error instanceof Error ? error.message : "";
  if (message.includes("research_text_hash_mismatch")) {
    return "extraction_hash_mismatch";
  }
  if (
    /duplicate_source_(?:id|url)|source_url_not_in_response_registry|unknown_source_id/.test(
      message,
    )
  ) {
    return "extraction_source_integrity";
  }
  if (
    /duplicate_recommendation_key|rank_order_mismatch|recommendation_order_not_preserved/.test(
      message,
    )
  ) {
    return "extraction_order_integrity";
  }
  if (message.includes("formatter_added_text")) {
    return "extraction_text_integrity";
  }
  return "extraction_unknown";
}

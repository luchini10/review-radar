import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";

import {
  directTerraAssetTargetIsCoherent,
  type DirectTerraAssetCandidate,
  type DirectTerraAssetTarget,
  verifyDirectTerraAssetCandidates,
} from "./directTerraAssetVerifier.ts";
import {
  canonicalizeDirectTerraCitationUrl,
  type DirectTerraSource,
} from "./directTerraResponse.ts";

export const DIRECT_TERRA_CITATION_WEBSITE_RESOLVER_VERSION =
  "direct-terra-citation-website-resolver-v1";

const MAX_TARGETS = 5;
const MAX_REPORT_CHARACTERS = 160_000;
const MAX_ACTIVE_CITATIONS = 500;
const MAX_RESPONSE_SOURCES = 500;
const MAX_SECTION_CITATIONS = 20;

type MarkdownNode = {
  type?: unknown;
  depth?: unknown;
  value?: unknown;
  url?: unknown;
  identifier?: unknown;
  children?: unknown;
};

export type DirectTerraCitationWebsite = {
  targetKey: string;
  rank: number;
  productName: string;
  productUrl: string | null;
  productUrlStatus: "accepted_identity_safe" | "unavailable";
};

export type DirectTerraCitationWebsiteResolution = {
  resolverVersion: typeof DIRECT_TERRA_CITATION_WEBSITE_RESOLVER_VERSION;
  items: DirectTerraCitationWebsite[];
};

type RankedSection = {
  depth: number;
  heading: string;
  urls: string[];
};

function asNode(value: unknown): MarkdownNode | null {
  return typeof value === "object" && value !== null
    ? (value as MarkdownNode)
    : null;
}

function childrenOf(node: MarkdownNode) {
  return Array.isArray(node.children) ? node.children : [];
}

function renderedText(value: unknown): string {
  const node = asNode(value);
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  return childrenOf(node).map(renderedText).join("");
}

function rankedHeading(value: string) {
  const match = value.trim().match(/^#?\s*(\d+)\s+Best Match\b/i);
  if (!match) return null;
  const rank = Number(match[1]);
  return Number.isSafeInteger(rank) && rank > 0 ? rank : null;
}

function collectDefinitions(
  value: unknown,
  definitions: Map<string, string>,
) {
  const node = asNode(value);
  if (!node) return;
  if (
    node.type === "definition" &&
    typeof node.identifier === "string" &&
    typeof node.url === "string"
  ) {
    const identifier = node.identifier.toLowerCase();
    // CommonMark resolves duplicate reference labels to their first
    // definition. Keep resolver ownership identical to the rendered link.
    if (!definitions.has(identifier)) definitions.set(identifier, node.url);
  }
  for (const child of childrenOf(node)) collectDefinitions(child, definitions);
}

function collectLinks(
  value: unknown,
  definitions: Map<string, string>,
  urls: string[],
) {
  const node = asNode(value);
  if (!node) return;
  if (
    node.type === "code" ||
    node.type === "inlineCode" ||
    node.type === "image" ||
    node.type === "imageReference"
  ) {
    return;
  }
  if (node.type === "link" && typeof node.url === "string") {
    urls.push(node.url);
  } else if (
    node.type === "linkReference" &&
    typeof node.identifier === "string"
  ) {
    const url = definitions.get(node.identifier.toLowerCase());
    if (url) urls.push(url);
  }
  for (const child of childrenOf(node)) {
    collectLinks(child, definitions, urls);
  }
}

function rankedSections(reportMarkdown: string) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(reportMarkdown);
  const root = asNode(tree);
  const definitions = new Map<string, string>();
  collectDefinitions(tree, definitions);

  const sections = new Map<number, RankedSection>();
  const duplicateRanks = new Set<number>();
  let currentRank: number | null = null;
  let currentDepth = 0;

  for (const value of root ? childrenOf(root) : []) {
    const node = asNode(value);
    if (!node) continue;

    if (node.type === "heading") {
      const heading = renderedText(node).replace(/\s+/g, " ").trim();
      const rank = rankedHeading(heading);
      const depth =
        typeof node.depth === "number" && Number.isInteger(node.depth)
          ? node.depth
          : 6;

      if (rank !== null) {
        if (sections.has(rank)) duplicateRanks.add(rank);
        else sections.set(rank, { depth, heading, urls: [] });
        currentRank = rank;
        currentDepth = depth;
        continue;
      }

      if (currentRank !== null && depth <= currentDepth) {
        currentRank = null;
        currentDepth = 0;
      }
    }

    if (currentRank === null || duplicateRanks.has(currentRank)) continue;
    const section = sections.get(currentRank);
    if (!section || section.urls.length >= MAX_SECTION_CITATIONS) continue;

    const urls: string[] = [];
    collectLinks(node, definitions, urls);
    for (const url of urls) {
      if (section.urls.length >= MAX_SECTION_CITATIONS) break;
      if (!section.urls.includes(url)) section.urls.push(url);
    }
  }

  for (const rank of duplicateRanks) sections.delete(rank);
  return sections;
}

function isDocumentUrl(value: string) {
  try {
    return /\.(?:csv|docx?|odp|ods|odt|pdf|pptx?|rtf|xlsx?)(?:$|[?#])/i.test(
      new URL(value).pathname,
    );
  } catch {
    return true;
  }
}

function assertInput(input: {
  targets: DirectTerraAssetTarget[];
  reportMarkdown: string;
  activeCitationUrls: string[];
  responseSources: DirectTerraSource[];
}) {
  if (
    typeof input.reportMarkdown !== "string" ||
    input.reportMarkdown.length === 0 ||
    input.reportMarkdown.length > MAX_REPORT_CHARACTERS
  ) {
    throw new Error("Invalid Direct-Terra report Markdown");
  }
  if (
    !Array.isArray(input.targets) ||
    input.targets.length === 0 ||
    input.targets.length > MAX_TARGETS
  ) {
    throw new Error("Invalid Direct-Terra website target count");
  }
  if (
    !Array.isArray(input.activeCitationUrls) ||
    input.activeCitationUrls.length > MAX_ACTIVE_CITATIONS ||
    !Array.isArray(input.responseSources) ||
    input.responseSources.length > MAX_RESPONSE_SOURCES
  ) {
    throw new Error("Invalid Direct-Terra citation evidence count");
  }

  const ranks = new Set<number>();
  const keys = new Set<string>();
  for (const target of input.targets) {
    if (!directTerraAssetTargetIsCoherent(target)) {
      throw new Error("Incoherent target for Direct-Terra website resolution");
    }
    if (ranks.has(target.rank)) {
      throw new Error("Duplicate target rank");
    }
    if (keys.has(target.key)) {
      throw new Error("Duplicate target key");
    }
    ranks.add(target.rank);
    keys.add(target.key);
  }
}

function unavailable(target: DirectTerraAssetTarget): DirectTerraCitationWebsite {
  return {
    targetKey: target.key,
    rank: target.rank,
    productName: target.productName,
    productUrl: null,
    productUrlStatus: "unavailable",
  };
}

export function resolveDirectTerraCitationWebsites(input: {
  targets: DirectTerraAssetTarget[];
  reportMarkdown: string;
  activeCitationUrls: string[];
  responseSources: DirectTerraSource[];
}): DirectTerraCitationWebsiteResolution {
  assertInput(input);

  const activeUrls = new Set(
    input.activeCitationUrls
      .map(canonicalizeDirectTerraCitationUrl)
      .filter((url): url is string => Boolean(url)),
  );
  const sourceTitles = new Map<string, string>();
  for (const source of input.responseSources) {
    if (typeof source?.url !== "string" || typeof source.title !== "string") {
      continue;
    }
    const canonical = canonicalizeDirectTerraCitationUrl(source.url);
    const title = source.title.replace(/\s+/g, " ").trim().slice(0, 300);
    if (canonical && title && !sourceTitles.has(canonical)) {
      sourceTitles.set(canonical, title);
    }
  }

  const sections = rankedSections(input.reportMarkdown);
  const targets = [...input.targets].sort((a, b) => a.rank - b.rank);
  const items = targets.map((target): DirectTerraCitationWebsite => {
    const section = sections.get(target.rank);
    if (!section) return unavailable(target);

    const headingIdentity = verifyDirectTerraAssetCandidates({
      target,
      candidates: [{ title: section.heading }],
    });
    if (!headingIdentity.decisions[0]?.identityAccepted) {
      return unavailable(target);
    }

    const candidates: DirectTerraAssetCandidate[] = [];
    for (const url of section.urls) {
      const canonical = canonicalizeDirectTerraCitationUrl(url);
      if (
        !canonical ||
        !activeUrls.has(canonical) ||
        isDocumentUrl(url)
      ) {
        continue;
      }
      const title = sourceTitles.get(canonical);
      if (!title) continue;
      candidates.push({ title, productUrl: url });
    }

    const verification = verifyDirectTerraAssetCandidates({ target, candidates });
    return {
      targetKey: target.key,
      rank: target.rank,
      productName: target.productName,
      productUrl: verification.productUrl,
      productUrlStatus: verification.productUrlStatus,
    };
  });

  return {
    resolverVersion: DIRECT_TERRA_CITATION_WEBSITE_RESOLVER_VERSION,
    items,
  };
}

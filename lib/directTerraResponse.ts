import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";

import {
  calculateDirectTerraPriceEstimates,
  type DirectTerraPriceEstimate,
} from "./directTerraPriceEstimate.ts";
import {
  directTerraAssetTargetIsCoherent,
  extractDirectTerraHeadingIdentity,
  type DirectTerraAssetTarget,
} from "./directTerraAssetVerifier.ts";
import {
  extractDirectTerraPicks,
  headingSlug,
} from "./directTerraReportOutline.ts";

export type DirectTerraSource = {
  url: string;
  title?: string;
};

type ParsedDirectTerraResponse =
  | {
      ok: true;
      reportMarkdown: string;
      citationUrls: string[];
      sourceHosts: string[];
      disabledCitationCount: number;
      priceEstimates: DirectTerraPriceEstimate[];
      assetTargets: DirectTerraAssetTarget[];
      responseSources: DirectTerraSource[];
      rejectedPriceObservationCount: number;
    }
  | {
      ok: false;
      reason: string;
      citationCount?: number;
      unregisteredCitationCount?: number;
    };

const MAX_REPORT_CHARACTERS = 160_000;
const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "msclkid",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sourceFromValue(value: unknown): DirectTerraSource | null {
  if (!isRecord(value) || typeof value.url !== "string") return null;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  return title ? { url: value.url, title } : { url: value.url };
}

function annotationSource(value: unknown): DirectTerraSource | null {
  if (!isRecord(value) || value.type !== "url_citation") return null;
  return (
    sourceFromValue(value) ?? sourceFromValue(value.url_citation)
  );
}

export function canonicalizeDirectTerraCitationUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

function distinctSources(sources: DirectTerraSource[]) {
  const indexes = new Map<string, number>();
  const distinct: DirectTerraSource[] = [];

  for (const source of sources) {
    const canonical = canonicalizeDirectTerraCitationUrl(source.url);
    if (!canonical) continue;

    const index = indexes.get(canonical);
    if (index === undefined) {
      indexes.set(canonical, distinct.length);
      distinct.push(source);
      continue;
    }

    // Preserve the first response-owned record, but do not let a titleless
    // action source hide a later response-owned citation title. Once a title
    // exists, conflicting later metadata cannot replace it.
    if (!distinct[index].title && source.title) {
      distinct[index] = { ...distinct[index], title: source.title };
    }
  }

  return distinct;
}

export function extractDirectTerraResponseSources(
  response: unknown,
): DirectTerraSource[] {
  if (!isRecord(response) || !Array.isArray(response.output)) return [];
  const sources: DirectTerraSource[] = [];

  for (const item of response.output) {
    if (!isRecord(item)) continue;
    if (item.type === "web_search_call" && isRecord(item.action)) {
      const actionSources = item.action.sources;
      if (Array.isArray(actionSources)) {
        for (const value of actionSources) {
          const source = sourceFromValue(value);
          if (source) sources.push(source);
        }
      }
    }
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const content of item.content) {
        if (!isRecord(content) || !Array.isArray(content.annotations)) continue;
        for (const annotation of content.annotations) {
          const source = annotationSource(annotation);
          if (source) sources.push(source);
        }
      }
    }
  }

  return distinctSources(sources);
}

function outputText(response: Record<string, unknown>) {
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return null;
  const chunks: string[] = [];
  for (const item of response.output) {
    if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }
    for (const content of item.content) {
      if (
        isRecord(content) &&
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        chunks.push(content.text);
      }
    }
  }
  return chunks.length > 0 ? chunks.join("") : null;
}

function exactReportWrapper(text: string) {
  try {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value)) return null;
    if (
      JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(["price_observations", "report_markdown"])
    ) {
      return null;
    }
    if (
      typeof value.report_markdown !== "string" ||
      value.report_markdown.trim().length === 0 ||
      value.report_markdown.length > MAX_REPORT_CHARACTERS
    ) {
      return null;
    }
    if (!Array.isArray(value.price_observations)) return null;
    return {
      reportMarkdown: value.report_markdown,
      priceObservations: value.price_observations,
    };
  } catch {
    return null;
  }
}

export function extractDirectTerraAssetTargets({
  reportMarkdown,
  priceObservations,
}: {
  reportMarkdown: string;
  priceObservations: unknown;
}): DirectTerraAssetTarget[] {
  const structuredIdentities = new Map<
    number,
    { brand: string; model: string }
  >();

  const boundedPriceObservations =
    Array.isArray(priceObservations) && priceObservations.length <= 5
      ? priceObservations
      : [];
  for (const value of boundedPriceObservations) {
    if (
      !isRecord(value) ||
      JSON.stringify(Object.keys(value).sort()) !==
        JSON.stringify(["rank", "brand", "model", "observations"].sort()) ||
      !Number.isInteger(value.rank) ||
      (value.rank as number) < 1 ||
      (value.rank as number) > 5 ||
      structuredIdentities.has(value.rank as number) ||
      typeof value.brand !== "string" ||
      value.brand.trim().length === 0 ||
      value.brand.length > 120 ||
      typeof value.model !== "string" ||
      value.model.trim().length === 0 ||
      value.model.length > 200 ||
      !Array.isArray(value.observations) ||
      value.observations.length > 4
    ) {
      continue;
    }

    structuredIdentities.set(value.rank as number, {
      brand: value.brand.trim(),
      model: value.model.trim(),
    });
  }

  const targets: DirectTerraAssetTarget[] = [];
  for (const pick of extractDirectTerraPicks(reportMarkdown)) {
    if (pick.rank < 1 || pick.rank > 5 || pick.name.length > 300) continue;
    // The ranked heading is Terra's AUTHORITATIVE recommendation identity and is
    // enough to decorate a card. The structured price-observation identity is
    // only a fallback for descriptive headings that expose no strong model
    // token. When both exist the heading wins outright: Terra routinely names
    // one product two compatible ways (SKU in the heading, marketing name in
    // the price observation — "Q352020" vs "Roomba 105"), and a byte-level
    // disagreement must not discard an otherwise exact ranked pick. Linking to
    // a wrong product is still prevented downstream, where every retailer/
    // manufacturer page must match this heading identity before it is shown.
    const headingIdentity = extractDirectTerraHeadingIdentity(pick.name);
    const structuredIdentity = structuredIdentities.get(pick.rank);
    const identity = headingIdentity ?? structuredIdentity;
    if (!identity) continue;

    const rank = pick.rank;
    const { brand, model } = identity;
    const identitySlug = headingSlug(`${brand}-${model}`);
    if (!identitySlug) continue;

    const target: DirectTerraAssetTarget = {
      key: `rank-${rank}-${identitySlug}`,
      rank,
      productName: pick.name,
      brand,
      model,
      // The completed background job intentionally retains no shopper text.
      // Terra's exact ranked product name is the narrowest available type
      // context and keeps resolution tied to the recommendation itself.
      category: pick.name,
    };
    if (!directTerraAssetTargetIsCoherent(target)) continue;
    targets.push(target);
  }

  return targets.sort((left, right) => left.rank - right.rank);
}

function childNodes(value: unknown): unknown[] {
  return isRecord(value) && Array.isArray(value.children) ? value.children : [];
}

function markdownLinks(report: string) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(report);
  const definitions = new Map<string, string>();
  let hasImages = false;
  const urls: string[] = [];

  function collectDefinitions(node: unknown) {
    if (isRecord(node) && node.type === "definition") {
      if (typeof node.identifier === "string" && typeof node.url === "string") {
        // CommonMark renders the first definition for a duplicate reference
        // label. Citation ownership must resolve the same visible URL.
        if (!definitions.has(node.identifier)) {
          definitions.set(node.identifier, node.url);
        }
      }
    }
    for (const child of childNodes(node)) collectDefinitions(child);
  }

  function collectRenderedLinks(node: unknown) {
    if (!isRecord(node)) return;
    if (node.type === "image" || node.type === "imageReference") {
      hasImages = true;
    } else if (node.type === "link" && typeof node.url === "string") {
      urls.push(node.url);
    } else if (
      node.type === "linkReference" &&
      typeof node.identifier === "string"
    ) {
      const url = definitions.get(node.identifier);
      if (url) urls.push(url);
    }
    for (const child of childNodes(node)) collectRenderedLinks(child);
  }

  collectDefinitions(tree);
  collectRenderedLinks(tree);
  return {
    hasImages,
    urls: [
      ...new Set(
        urls.filter(
          (url) => canonicalizeDirectTerraCitationUrl(url) !== null,
        ),
      ),
    ],
  };
}

export function parseDirectTerraCompletedResponse(
  response: unknown,
): ParsedDirectTerraResponse {
  if (!isRecord(response) || response.status !== "completed") {
    return { ok: false, reason: "response_not_completed" };
  }
  const text = outputText(response);
  const wrapper = text ? exactReportWrapper(text) : null;
  if (!wrapper) return { ok: false, reason: "invalid_report_wrapper" };
  const { reportMarkdown, priceObservations } = wrapper;

  const markdown = markdownLinks(reportMarkdown);
  if (markdown.hasImages) {
    return { ok: false, reason: "report_images_not_allowed" };
  }
  const citationUrls = markdown.urls;
  if (citationUrls.length === 0) {
    return { ok: false, reason: "missing_citations", citationCount: 0 };
  }

  const sources = extractDirectTerraResponseSources(response);
  const registered = new Set(
    sources
      .map((source) => canonicalizeDirectTerraCitationUrl(source.url))
      .filter((url): url is string => Boolean(url)),
  );
  const registeredCitationUrls = citationUrls.filter((url) => {
    const canonical = canonicalizeDirectTerraCitationUrl(url);
    return Boolean(canonical && registered.has(canonical));
  });
  const disabledCitationCount =
    citationUrls.length - registeredCitationUrls.length;

  const sourceHosts = [
    ...new Set(
      registeredCitationUrls.map((url) =>
        new URL(url).hostname.toLowerCase().replace(/^www\./, ""),
      ),
    ),
  ];
  const priceResult = calculateDirectTerraPriceEstimates({
    reportMarkdown,
    priceObservations,
    responseSourceUrls: sources.map((source) => source.url),
  });
  const assetTargets = extractDirectTerraAssetTargets({
    reportMarkdown,
    priceObservations,
  });
  return {
    ok: true,
    reportMarkdown,
    citationUrls: registeredCitationUrls,
    sourceHosts,
    disabledCitationCount,
    priceEstimates: priceResult.estimates,
    assetTargets,
    responseSources: sources,
    rejectedPriceObservationCount: priceResult.rejectedObservationCount,
  };
}

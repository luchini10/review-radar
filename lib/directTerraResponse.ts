import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";

type DirectTerraSource = {
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

function canonicalUrl(value: string) {
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
  const seen = new Set<string>();
  return sources.filter((source) => {
    const canonical = canonicalUrl(source.url);
    if (!canonical || seen.has(canonical)) return false;
    seen.add(canonical);
    return true;
  });
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
    if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(["report_markdown"])) {
      return null;
    }
    if (
      typeof value.report_markdown !== "string" ||
      value.report_markdown.trim().length === 0 ||
      value.report_markdown.length > MAX_REPORT_CHARACTERS
    ) {
      return null;
    }
    return value.report_markdown;
  } catch {
    return null;
  }
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
        definitions.set(node.identifier, node.url);
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
    urls: [...new Set(urls.filter((url) => canonicalUrl(url) !== null))],
  };
}

export function parseDirectTerraCompletedResponse(
  response: unknown,
): ParsedDirectTerraResponse {
  if (!isRecord(response) || response.status !== "completed") {
    return { ok: false, reason: "response_not_completed" };
  }
  const text = outputText(response);
  const reportMarkdown = text ? exactReportWrapper(text) : null;
  if (!reportMarkdown) return { ok: false, reason: "invalid_report_wrapper" };

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
      .map((source) => canonicalUrl(source.url))
      .filter((url): url is string => Boolean(url)),
  );
  const registeredCitationUrls = citationUrls.filter((url) => {
    const canonical = canonicalUrl(url);
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
  return {
    ok: true,
    reportMarkdown,
    citationUrls: registeredCitationUrls,
    sourceHosts,
    disabledCitationCount,
  };
}

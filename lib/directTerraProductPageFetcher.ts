// T8B product-page fetcher: one bounded GET of an ALREADY identity-verified
// manufacturer/retailer product page, harvesting that page's own product photo
// (og:image / twitter:image / JSON-LD Product image) and its rel=canonical
// clean URL. One trusted page supplies both assets, so the displayed photo and
// link share a single verified identity instead of coming from separate
// sources. Fail-closed everywhere: any miss returns null and the caller keeps
// its existing (thumbnail / raw-URL) behavior.
//
// Boundary rules:
// - only URLs that passed the full asset-verifier gate may be fetched;
// - one GET per page, no retries, no fallbacks, tight time and size caps;
// - redirects may not leave the page's registrable domain;
// - an image is accepted only when hosted on the page's own registrable
//   domain or that retailer's known first-party image CDN, and it still has
//   to pass the shared RR-061 image identity guard;
// - a canonical URL is accepted only on the same registrable domain and only
//   when the page title proves the same product identity.

import { validateProductImageCandidate } from "./productImageResolver.ts";
import { productPageMatchesIdentity } from "./productPageUrl.ts";
import { registrableDomain } from "./directTerraLinkPreference.ts";

export const DIRECT_TERRA_PAGE_FETCHER_VERSION =
  "direct-terra-product-page-fetcher-v1";
export const MAX_DIRECT_TERRA_PAGE_FETCHES = 5;
export const DIRECT_TERRA_PAGE_TIMEOUT_MS = 8_000;
export const DIRECT_TERRA_PAGE_MAX_BYTES = 1_500_000;
const MAX_JSON_LD_BLOCKS = 5;
const MAX_JSON_LD_BLOCK_CHARS = 200_000;
const MAX_IMAGE_CANDIDATES = 6;

export type DirectTerraFetchedPage = {
  finalUrl: string;
  html: string;
};

export type DirectTerraProductPageTransport = (
  url: string,
) => Promise<DirectTerraFetchedPage | null>;

export type DirectTerraPageImageCandidate = {
  url: string;
  source: "page_image" | "json_ld";
};

export type DirectTerraExtractedPageAssets = {
  title: string;
  canonicalUrl: string | null;
  imageCandidates: DirectTerraPageImageCandidate[];
  productNames: string[];
};

// First-party image CDNs for major retailers whose product photos live off
// the page's own registrable domain. Site-level policy, never per-product.
const RETAILER_IMAGE_CDNS = new Map<string, readonly string[]>([
  ["amazon.com", ["media-amazon.com", "ssl-images-amazon.com"]],
  ["homedepot.com", ["thdstatic.com"]],
  ["walmart.com", ["walmartimages.com"]],
  ["bestbuy.com", ["bbystatic.com"]],
  ["target.com", ["scene7.com"]],
  ["wayfair.com", ["wfcdn.com"]],
  ["costco.com", ["costco-static.com"]],
]);

// Hosts that bot-wall plain HTML fetches (confirmed empirically); requesting
// them wastes the bounded page budget on a guaranteed miss, so those links
// keep their exact-identity thumbnail tier rather than a page-hosted photo.
const FETCH_SKIP_HOSTS = new Set(["amazon.com", "homedepot.com"]);

export function shouldSkipDirectTerraPageFetch(url: string) {
  try {
    return FETCH_SKIP_HOSTS.has(registrableDomain(new URL(url).hostname));
  } catch {
    return true;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function httpUrl(value: string, baseUrl: string) {
  try {
    const parsed = new URL(value, baseUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function createDirectTerraProductPageTransport({
  fetchImpl = fetch,
  timeoutMs = DIRECT_TERRA_PAGE_TIMEOUT_MS,
  maxBytes = DIRECT_TERRA_PAGE_MAX_BYTES,
}: {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
} = {}): DirectTerraProductPageTransport {
  return async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const requestedRegistrable = registrableDomain(new URL(url).hostname);
      const response = await fetchImpl(url, {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "accept-language": "en-US,en;q=0.9",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        },
        redirect: "follow",
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("text/html")) return null;
      const finalUrl = response.url || url;
      // A redirect may not leave the verified page's registrable domain —
      // otherwise the harvested image/canonical would belong to a page the
      // identity gate never saw.
      if (registrableDomain(new URL(finalUrl).hostname) !== requestedRegistrable) {
        return null;
      }

      let html = "";
      const body = response.body;
      if (body && typeof body.getReader === "function") {
        const reader = body.getReader();
        const decoder = new TextDecoder("utf-8", { fatal: false });
        let received = 0;
        while (received < maxBytes) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value?.byteLength ?? 0;
          html += decoder.decode(value, { stream: true });
        }
        // Oversized pages are truncated, not rejected: the metadata we need
        // lives in <head>, which arrives first.
        try {
          await reader.cancel();
        } catch {
          // Already finished.
        }
      } else {
        html = (await response.text()).slice(0, maxBytes);
      }
      return { finalUrl, html };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  };
}

function tagAttributes(tag: string) {
  const attributes = new Map<string, string>();
  const attributePattern = /([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attributePattern.exec(tag))) {
    attributes.set(match[1].toLowerCase(), (match[2] ?? match[3] ?? "").trim());
  }
  return attributes;
}

function jsonLdProductData(
  node: unknown,
  collectedImages: string[],
  collectedNames: string[],
) {
  if (Array.isArray(node)) {
    for (const item of node) {
      jsonLdProductData(item, collectedImages, collectedNames);
    }
    return;
  }
  if (!isRecord(node)) return;
  if (Array.isArray(node["@graph"])) {
    jsonLdProductData(node["@graph"], collectedImages, collectedNames);
  }
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  const isProduct = types.some(
    (value) => typeof value === "string" && value.toLowerCase() === "product",
  );
  if (!isProduct) return;
  if (
    typeof node.name === "string" &&
    node.name.trim() &&
    collectedNames.length < MAX_JSON_LD_BLOCKS
  ) {
    collectedNames.push(
      node.name.replace(/\s+/g, " ").trim().slice(0, 300),
    );
  }
  const image = node.image;
  const imageEntries = Array.isArray(image) ? image : [image];
  for (const entry of imageEntries) {
    if (typeof entry === "string") collectedImages.push(entry);
    else if (isRecord(entry) && typeof entry.url === "string") {
      collectedImages.push(entry.url);
    }
  }
}

export function extractDirectTerraPageAssets(
  html: string,
  pageUrl: string,
): DirectTerraExtractedPageAssets {
  const imageCandidates: DirectTerraPageImageCandidate[] = [];
  const productNames: string[] = [];
  const seenImageUrls = new Set<string>();
  const addImage = (
    value: string | null | undefined,
    source: DirectTerraPageImageCandidate["source"],
  ) => {
    if (!value || imageCandidates.length >= MAX_IMAGE_CANDIDATES) return;
    const resolved = httpUrl(value, pageUrl);
    if (!resolved || seenImageUrls.has(resolved)) return;
    seenImageUrls.add(resolved);
    imageCandidates.push({ url: resolved, source });
  };

  let title = "";
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
  }

  let canonicalUrl: string | null = null;
  const tagPattern = /<(?:meta|link)\b[^>]*>/gi;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagPattern.exec(html))) {
    const attributes = tagAttributes(tagMatch[0]);
    const property = (
      attributes.get("property") ||
      attributes.get("name") ||
      ""
    ).toLowerCase();
    const rel = (attributes.get("rel") || "").toLowerCase();
    if (
      property === "og:image" ||
      property === "og:image:secure_url" ||
      property === "twitter:image" ||
      property === "twitter:image:src"
    ) {
      addImage(attributes.get("content"), "page_image");
    }
    if (!canonicalUrl && rel.split(/\s+/).includes("canonical")) {
      canonicalUrl = httpUrl(attributes.get("href") || "", pageUrl);
    }
  }

  const jsonLdPattern =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let blockMatch: RegExpExecArray | null;
  let blocks = 0;
  while ((blockMatch = jsonLdPattern.exec(html)) && blocks < MAX_JSON_LD_BLOCKS) {
    blocks += 1;
    const raw = blockMatch[1].trim();
    if (!raw || raw.length > MAX_JSON_LD_BLOCK_CHARS) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const urls: string[] = [];
      const names: string[] = [];
      jsonLdProductData(parsed, urls, names);
      for (const value of urls) addImage(value, "json_ld");
      for (const name of names) {
        if (!productNames.includes(name) && productNames.length < MAX_JSON_LD_BLOCKS) {
          productNames.push(name);
        }
      }
    } catch {
      // Malformed JSON-LD is ignored; page metadata stays best-effort.
    }
  }

  return { title, canonicalUrl, imageCandidates, productNames };
}

function imageHostAllowed(imageUrl: string, pageUrl: string) {
  try {
    const pageRegistrable = registrableDomain(new URL(pageUrl).hostname);
    const imageRegistrable = registrableDomain(new URL(imageUrl).hostname);
    if (imageRegistrable === pageRegistrable) return true;
    const cdns = RETAILER_IMAGE_CDNS.get(pageRegistrable) || [];
    return cdns.includes(imageRegistrable);
  } catch {
    return false;
  }
}

export function verifyDirectTerraPageAssets(input: {
  target: {
    brand: string;
    model: string;
    category: string;
    productName: string;
  };
  pageUrl: string;
  page: DirectTerraExtractedPageAssets;
}): { imageUrl: string | null; canonicalUrl: string | null } {
  const { target, pageUrl, page } = input;

  let imageUrl: string | null = null;
  for (const candidate of page.imageCandidates) {
    if (!imageHostAllowed(candidate.url, pageUrl)) continue;
    const verified = validateProductImageCandidate(
      {
        evidenceText:
          [page.title, ...(page.productNames ?? [])]
            .filter(Boolean)
            .join(" ") ||
          target.productName,
        source: candidate.source,
        url: candidate.url,
      },
      {
        brand: target.brand,
        category: target.category,
        modelNumber: target.model,
        pageUrl,
        productName: target.productName,
      },
    );
    if (verified.accepted) {
      imageUrl = verified.url;
      break;
    }
  }

  let canonicalUrl: string | null = null;
  if (page.canonicalUrl) {
    try {
      const sameRegistrable =
        registrableDomain(new URL(page.canonicalUrl).hostname) ===
        registrableDomain(new URL(pageUrl).hostname);
      if (
        sameRegistrable &&
        page.title &&
        productPageMatchesIdentity({
          brand: target.brand,
          model: target.model,
          pageTitle: page.title,
          pageUrl: page.canonicalUrl,
          productName: target.productName,
        })
      ) {
        canonicalUrl = page.canonicalUrl;
      }
    } catch {
      canonicalUrl = null;
    }
  }

  return { imageUrl, canonicalUrl };
}

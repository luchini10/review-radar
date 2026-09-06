import { readBoundedJsonBody } from "./boundedJsonRequest.ts";
import { isProductImage } from "./productImage.ts";
import { throwIfRequestCancelled } from "./requestCancellation.ts";
import type { ProductImage, SelectionProductRecommendation } from "../types/review-radar.ts";

export const IMAGE_LOOKUP_TIMEOUT_MS = 6000;
export const IMAGE_LOOKUP_LIMIT = 5;
const RESULT_LIMIT = 10;
const ACCESSORIES = new Set("replacement compatible accessory accessories bundle combo kit case cover charger battery filter carafe lid mount stand attachment adapter spare repair sleeve protector strap cable bag refill".split(" "));
const VARIANTS = new Set("pro max plus mini ultra lite se xl xs ii iii iv gen generation mk mark deluxe elite signature select touch premium classic essential".split(" "));
const GENERIC = new Set("the and with for a an by new product coffee maker brewer machine wireless headphones monitor vacuum cleaner chair electric cordless inch cup cups".split(" "));
const UNITS = /^(?:cup|cups|inch|in|cm|mm|oz|ml|qt|w|watts|v|volt|hz|gb|tb)$/;

function tokens(value: string): string[] {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’']/g, "").match(/[a-z0-9]+(?:[-.][a-z0-9]+)*/g)?.map((token) => token.replace(/[-.]/g, "")) ?? [];
}

function matchedTitleTokens(expected: string[], actual: string[]): Set<number> | undefined {
  const matched = new Set<number>();
  for (let index = 0; index < expected.length;) {
    let consumed = 0;
    for (let count = 1; count <= 3 && index + count <= expected.length && !consumed; count++) {
      const value = expected.slice(index, index + count).join("");
      for (let start = 0; start < actual.length && !consumed; start++) {
        for (let length = 1; length <= 3 && start + length <= actual.length; length++) {
          // Only model codes may join words: WH-1000XM5 and WH 1000XM5 are equivalent.
          if ((count > 1 || length > 1) && !(/[a-z]/.test(value) && /\d/.test(value))) continue;
          if (actual.slice(start, start + length).join("") !== value) continue;
          for (let offset = 0; offset < length; offset++) matched.add(start + offset);
          consumed = count;
          break;
        }
      }
    }
    if (!consumed) return;
    index += consumed;
  }
  return matched;
}

export function matchesRecommendedModel(name: string, title: string): boolean {
  if (!title.trim() || title.length > 400) return false;
  const expected = tokens(name);
  const actual = tokens(title);
  const identity = expected.filter((token) => !GENERIC.has(token));
  // A broad type such as "coffee maker" is not enough to bind a picture.
  if (identity.length < 2) return false;
  const matched = matchedTitleTokens(expected, actual);
  if (!matched) return false;
  if (actual.some((token) => (ACCESSORIES.has(token) || VARIANTS.has(token)) && !expected.includes(token))) return false;
  if (/\b(?:pack|set)\s+of\s+\d|\b\d+\s*[- ]?pack\b|\s\+\s/i.test(title) && !/\b(?:pack|set)\b|\s\+\s/i.test(name)) return false;
  // Do not accept a multi-model listing or an additional model/size identifier.
  if (actual.some((token, index) => !matched.has(index) && /\d/.test(token) &&
    !UNITS.test(token.replace(/^\d+/, "")) &&
    !(/^\d+$/.test(token) && UNITS.test(actual[index + 1] ?? "")))) return false;
  return true;
}

function samePage(a: string, b: string) {
  try {
    const left = new URL(a), right = new URL(b);
    // Query strings can identify variants, so retain them except tracking keys.
    for (const url of [left, right]) {
      url.hash = "";
      for (const key of [...url.searchParams.keys()]) if (/^(utm_|srsltid$|gclid$)/.test(key)) url.searchParams.delete(key);
      url.searchParams.sort();
    }
    return left.href === right.href;
  } catch { return false; }
}

export function selectProductImage(product: SelectionProductRecommendation, payload: unknown): ProductImage | undefined {
  if (!payload || typeof payload !== "object" || !("shopping" in payload) || !Array.isArray(payload.shopping)) return;
  const matches: ProductImage[] = [];
  for (const row of payload.shopping.slice(0, RESULT_LIMIT)) {
    if (!row || typeof row !== "object" || typeof row.title !== "string" || !matchesRecommendedModel(product.name, row.title)) continue;
    const image = { url: row.imageUrl, sourceUrl: row.link, sourceTitle: row.title,
      ...(typeof row.productId === "string" && /^\d{1,40}$/.test(row.productId) ? { productId: row.productId } : {}) };
    if (isProductImage(image)) matches.push(image);
  }
  return matches.find((image) => samePage(product.productPageUrl, image.sourceUrl)) ?? matches[0];
}

export async function enrichProductImages({ products, apiKey, signal, fetchImpl = fetch, timeoutMs = IMAGE_LOOKUP_TIMEOUT_MS }: {
  products: SelectionProductRecommendation[];
  apiKey?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}) {
  throwIfRequestCancelled(signal);
  const debug = { imageLookups: 0, imageMatches: 0, imageNoMatches: 0, imageErrors: 0, imageConfigMissing: !apiKey };
  // All data belongs to this request only: no cache, database, file or global map.
  if (!apiKey) return { recommendations: products, debug };
  const recommendations = await Promise.all(products.map(async (product, index) => {
    if (index >= IMAGE_LOOKUP_LIMIT) return product;
    const controller = new AbortController();
    const operationSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    const timer = setTimeout(() => controller.abort(), Math.max(1, Math.min(timeoutMs, IMAGE_LOOKUP_TIMEOUT_MS)));
    let onAbort: (() => void) | undefined;
    try {
      throwIfRequestCancelled(signal);
      debug.imageLookups++;
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => reject(new Error("Image lookup interrupted"));
        operationSignal.addEventListener("abort", onAbort, { once: true });
      });
      const lookup = async () => {
        const response = await fetchImpl("https://google.serper.dev/shopping", {
          method: "POST", headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
          body: JSON.stringify({ q: product.name, gl: "us", hl: "en", num: RESULT_LIMIT }),
          cache: "no-store", redirect: "error", signal: operationSignal,
        });
        if (!response.ok) { await response.body?.cancel(); throw new Error("Image lookup failed"); }
        const body = await readBoundedJsonBody(response, { maxBytes: 128 * 1024 });
        if (!body.ok || !body.value || typeof body.value !== "object" || !("shopping" in body.value) || !Array.isArray(body.value.shopping)) throw new Error("Invalid image response");
        return selectProductImage(product, body.value);
      };
      const image = await Promise.race([lookup(), aborted]);
      throwIfRequestCancelled(signal);
      if (!image) { debug.imageNoMatches++; return product; }
      debug.imageMatches++;
      return { ...product, image };
    } catch {
      throwIfRequestCancelled(signal);
      debug.imageErrors++;
      return product;
    } finally {
      clearTimeout(timer);
      if (onAbort) operationSignal.removeEventListener("abort", onAbort);
      controller.abort(); // Release unread or rejected provider bodies as well.
    }
  }));
  throwIfRequestCancelled(signal);
  return { recommendations, debug };
}

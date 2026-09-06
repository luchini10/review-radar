import type { ProductImage } from "../types/review-radar.ts";

export function isShoppingImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      /^encrypted-tbn[0-3]\.gstatic\.com$/.test(url.hostname) &&
      url.pathname === "/shopping" && Boolean(url.searchParams.get("q"));
  } catch { return false; }
}

export function isProductImage(value: unknown): value is ProductImage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const image = value as Record<string, unknown>;
  if (!isShoppingImageUrl(image.url) || typeof image.sourceTitle !== "string" ||
      !image.sourceTitle.trim() || image.sourceTitle.length > 400 ||
      typeof image.sourceUrl !== "string" || image.sourceUrl.length > 2048 ||
      (image.productId !== undefined && (typeof image.productId !== "string" || !/^\d{1,40}$/.test(image.productId)))) return false;
  try {
    const url = new URL(image.sourceUrl);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(url.hostname) &&
      !/\.(?:local|localhost|internal|test|invalid)$/.test(url.hostname);
  } catch { return false; }
}

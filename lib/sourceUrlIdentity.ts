// Source-derived URL identity is deliberately path-only. Hostnames can look
// like brands, and query strings frequently echo the search that found a page;
// neither is trustworthy product identity. Decoding and replacing separators
// exposes model/type tokens from real product slugs without inventing them.
export function sourceUrlPathIdentitySegments(
  value: string | null | undefined,
) {
  if (!value) {
    return [];
  }

  try {
    const pathname = decodeURIComponent(new URL(value).pathname);
    return pathname
      .split("/")
      .map((segment) => {
        const normalized = segment
          .replace(/[^a-z0-9]+/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
        return normalized.replace(
          /\b(\d{1,3})\s+(\d)\s+(?=(?:display|in(?:ch)?|inches|laptop|notebook|screen)\b)/gi,
          "$1.$2 ",
        );
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function sourceUrlPathIdentityText(value: string | null | undefined) {
  return sourceUrlPathIdentitySegments(value).join(" ");
}

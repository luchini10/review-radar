function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_")) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

function collectUrlsFromValue(value: unknown, urls: Set<string>) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectUrlsFromValue(item, urls);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "url" && typeof child === "string" && child.startsWith("http")) {
      urls.add(normalizeUrl(child));
      continue;
    }

    collectUrlsFromValue(child, urls);
  }
}

export function collectVerifiedSourceUrls(response: unknown) {
  const urls = new Set<string>();

  if (!isRecord(response)) {
    return urls;
  }

  for (const outputItem of asArray(response.output)) {
    if (!isRecord(outputItem)) {
      continue;
    }

    if (outputItem.type === "web_search_call") {
      collectUrlsFromValue(outputItem.action, urls);
      continue;
    }

    if (outputItem.type === "message") {
      for (const contentItem of asArray(outputItem.content)) {
        if (!isRecord(contentItem)) {
          continue;
        }

        for (const annotation of asArray(contentItem.annotations)) {
          if (
            isRecord(annotation) &&
            annotation.type === "url_citation" &&
            typeof annotation.url === "string"
          ) {
            urls.add(normalizeUrl(annotation.url));
          }
        }
      }
    }
  }

  return urls;
}

export function citationUrlIsVerified(url: string, verifiedUrls: Set<string>) {
  return verifiedUrls.has(normalizeUrl(url));
}

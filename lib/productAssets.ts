type ProductAssetRecommendation = {
  name: string;
  product_page_url: string;
  product_image_url: string;
  citations?: {
    url: string;
  }[];
};

type ProductAssetResult = {
  recommendations: ProductAssetRecommendation[];
};

const PRODUCT_ASSET_TIMEOUT_MS = 5000;
const LIKELY_PRODUCT_PATH_PARTS = [
  "/dp/",
  "/gp/product/",
  "/ip/",
  "/item/",
  "/p/",
  "/pd/",
  "/product",
  "/products",
  "/shop/",
  "/site/",
  "/sku",
  "/catalog/product",
  "/buy/",
];
const EDITORIAL_PATH_PARTS = [
  "/article",
  "/best-",
  "/blog",
  "/deal",
  "/guide",
  "/news",
  "/product-reviews",
  "/review",
  "/reviews",
  "/roundup",
];

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of Array.from(parsed.searchParams.keys())) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.startsWith("utm_") ||
        lowerKey === "tag" ||
        lowerKey === "ascsubtag" ||
        lowerKey === "linkcode" ||
        lowerKey === "camp" ||
        lowerKey === "creative" ||
        lowerKey === "creativeasin"
      ) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getProductWords(productName: string) {
  return productName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
}

function productNameHasUrlMatch(productName: string, url: string) {
  try {
    const parsed = new URL(url);
    const searchableUrl = decodeURIComponent(
      `${parsed.hostname} ${parsed.pathname}`,
    ).toLowerCase();
    const words = getProductWords(productName);

    if (words.length === 0) {
      return false;
    }

    const matches = words.filter((word) => searchableUrl.includes(word));
    return matches.length >= Math.min(2, words.length);
  } catch {
    return false;
  }
}

function looksLikeEditorialUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    return EDITORIAL_PATH_PARTS.some((part) => path.includes(part));
  } catch {
    return true;
  }
}

function looksLikeProductPageUrl(url: string, productName: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    if (looksLikeEditorialUrl(url)) {
      return false;
    }

    return (
      LIKELY_PRODUCT_PATH_PARTS.some((part) => path.includes(part)) ||
      parsed.searchParams.has("sku") ||
      parsed.searchParams.has("model") ||
      productNameHasUrlMatch(productName, url)
    );
  } catch {
    return false;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function getMetaContent(html: string, property: string) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escapedProperty}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${escapedProperty}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapedProperty}["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapedProperty}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return "";
}

function resolveUrl(value: string, baseUrl: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function productNameHasPageMatch(productName: string, html: string) {
  const words = getProductWords(productName);

  if (words.length === 0) {
    return false;
  }

  const searchableHtml = html.toLowerCase();
  const matches = words.filter((word) => searchableHtml.includes(word));

  return matches.length >= Math.min(2, words.length);
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PRODUCT_ASSET_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "ReviewRadar/0.1 product research metadata fetcher",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return "";
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return "";
    }

    return await response.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function getImageFromCitationPages(product: ProductAssetRecommendation) {
  const citationUrls = product.citations?.map((citation) => citation.url) || [];

  for (const citationUrl of citationUrls.slice(0, 3)) {
    const normalizedCitationUrl = normalizeUrl(citationUrl);

    if (!normalizedCitationUrl || !isHttpUrl(normalizedCitationUrl)) {
      continue;
    }

    const html = await fetchText(normalizedCitationUrl);

    if (!html || !productNameHasPageMatch(product.name, html)) {
      continue;
    }

    const metadataImage =
      getMetaContent(html, "og:image") ||
      getMetaContent(html, "twitter:image") ||
      getMetaContent(html, "twitter:image:src");
    const resolvedMetadataImage = resolveUrl(
      metadataImage,
      normalizedCitationUrl,
    );

    if (resolvedMetadataImage && isHttpUrl(resolvedMetadataImage)) {
      return normalizeUrl(resolvedMetadataImage);
    }
  }

  return "";
}

async function getProductPageFromCitationPages(product: ProductAssetRecommendation) {
  const citationUrls = product.citations?.map((citation) => citation.url) || [];

  for (const citationUrl of citationUrls.slice(0, 3)) {
    const normalizedCitationUrl = normalizeUrl(citationUrl);

    if (!normalizedCitationUrl || !isHttpUrl(normalizedCitationUrl)) {
      continue;
    }

    const html = await fetchText(normalizedCitationUrl);

    if (!html || !productNameHasPageMatch(product.name, html)) {
      continue;
    }

    const anchorPattern =
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = anchorPattern.exec(html)) !== null) {
      const href = resolveUrl(decodeHtml(match[1]), normalizedCitationUrl);
      const anchorText = stripHtml(match[2]);

      if (!href || !isHttpUrl(href) || looksLikeEditorialUrl(href)) {
        continue;
      }

      const hrefHostDiffersFromCitation =
        normalizeHostname(href) !== normalizeHostname(normalizedCitationUrl);
      const hrefLooksLikeProduct = looksLikeProductPageUrl(href, product.name);
      const anchorNamesProduct = productNameHasPageMatch(
        product.name,
        anchorText,
      );

      if (
        hrefLooksLikeProduct ||
        (hrefHostDiffersFromCitation && anchorNamesProduct)
      ) {
        return normalizeUrl(href);
      }
    }
  }

  return "";
}

async function getVerifiedProductAssets(product: ProductAssetRecommendation) {
  const citationProductPageUrl = product.product_page_url
    ? ""
    : await getProductPageFromCitationPages(product);
  const productPageUrl =
    normalizeUrl(product.product_page_url) || citationProductPageUrl;
  const modelImage = normalizeUrl(product.product_image_url);
  const citationImageUrl = await getImageFromCitationPages(product);
  const fallbackImageUrl =
    modelImage && isHttpUrl(modelImage)
      ? modelImage
      : citationImageUrl && isHttpUrl(citationImageUrl)
        ? citationImageUrl
        : "";

  if (!productPageUrl || !isHttpUrl(productPageUrl)) {
    return {
      product_page_url: "",
      product_image_url: fallbackImageUrl,
    };
  }

  const html = await fetchText(productPageUrl);
  const likelyProductPage = looksLikeProductPageUrl(
    productPageUrl,
    product.name,
  );

  if (looksLikeEditorialUrl(productPageUrl)) {
    return {
      product_page_url: "",
      product_image_url: fallbackImageUrl,
    };
  }

  const pageMatchesProduct = html
    ? productNameHasPageMatch(product.name, html)
    : false;

  if (html && !pageMatchesProduct && !likelyProductPage) {
    return {
      product_page_url: "",
      product_image_url: fallbackImageUrl,
    };
  }

  if (!html && !likelyProductPage) {
    return {
      product_page_url: "",
      product_image_url: fallbackImageUrl,
    };
  }

  const metadataImage = html
    ? getMetaContent(html, "og:image") ||
      getMetaContent(html, "twitter:image") ||
      getMetaContent(html, "twitter:image:src")
    : "";
  const resolvedMetadataImage = resolveUrl(metadataImage, productPageUrl);
  const productImageUrl =
    resolvedMetadataImage && isHttpUrl(resolvedMetadataImage)
      ? normalizeUrl(resolvedMetadataImage)
      : fallbackImageUrl;

  return {
    product_page_url: productPageUrl,
    product_image_url: productImageUrl,
  };
}

export async function enrichProductAssets<T extends ProductAssetResult>(
  result: T,
): Promise<T> {
  const recommendations = await Promise.all(
    result.recommendations.map(async (recommendation) => {
      const assets = await getVerifiedProductAssets(recommendation);

      return {
        ...recommendation,
        ...assets,
      };
    }),
  );

  return {
    ...result,
    recommendations,
  };
}

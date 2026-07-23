import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDirectTerraProductPageTransport,
  extractDirectTerraPageAssets,
  verifyDirectTerraPageAssets,
} from "../lib/directTerraProductPageFetcher.ts";

const target = {
  brand: "RIDGID",
  model: "HD1600",
  category: "shop vac",
  productName: "RIDGID HD1600 16-Gallon 6.5 Peak HP NXT Wet/Dry Vac",
};
const pageUrl = "https://www.homedepot.com/p/RIDGID-HD1600-Vac/304795082";

function htmlResponse(body, { url = pageUrl, contentType = "text/html; charset=utf-8", status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: new Headers({ "content-type": contentType }),
    body: null,
    text: async () => body,
  };
}

describe("direct Terra product-page transport (T8B)", () => {
  it("fetches an html page and reports the final url", async () => {
    const transport = createDirectTerraProductPageTransport({
      fetchImpl: async () => htmlResponse("<html><title>x</title></html>"),
    });
    const page = await transport(pageUrl);
    assert.ok(page);
    assert.equal(page.finalUrl, pageUrl);
    assert.match(page.html, /<title>x<\/title>/);
  });

  it("rejects non-html, error statuses, and cross-domain redirects", async () => {
    const nonHtml = createDirectTerraProductPageTransport({
      fetchImpl: async () =>
        htmlResponse("{}", { contentType: "application/json" }),
    });
    assert.equal(await nonHtml(pageUrl), null);

    const failed = createDirectTerraProductPageTransport({
      fetchImpl: async () => htmlResponse("x", { status: 404 }),
    });
    assert.equal(await failed(pageUrl), null);

    // A redirect that leaves the verified registrable domain is refused: the
    // harvested assets would belong to a page the identity gate never saw.
    const crossDomain = createDirectTerraProductPageTransport({
      fetchImpl: async () =>
        htmlResponse("<html></html>", { url: "https://evil.example.com/landing" }),
    });
    assert.equal(await crossDomain(pageUrl), null);

    const thrown = createDirectTerraProductPageTransport({
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });
    assert.equal(await thrown(pageUrl), null);
  });
});

describe("direct Terra page asset extraction (T8B)", () => {
  it("extracts og/twitter images, canonical, title, and JSON-LD product images", () => {
    const html = `
      <html><head>
        <title>RIDGID HD1600 16 Gallon NXT Wet/Dry Vac - The Home Depot</title>
        <link href="https://www.homedepot.com/p/RIDGID-HD1600-Vac/304795082" rel="canonical">
        <meta content="https://images.thdstatic.com/productImages/hd1600-main.jpg" property="og:image">
        <meta name="twitter:image" content="/productImages/hd1600-alt.jpg">
        <script type="application/ld+json">
          {"@context":"https://schema.org","@graph":[{"@type":"Product","image":["https://images.thdstatic.com/productImages/hd1600-jsonld.jpg"]}]}
        </script>
      </head><body></body></html>`;
    const extracted = extractDirectTerraPageAssets(html, pageUrl);
    assert.match(extracted.title, /RIDGID HD1600/);
    assert.equal(
      extracted.canonicalUrl,
      "https://www.homedepot.com/p/RIDGID-HD1600-Vac/304795082",
    );
    const urls = extracted.imageCandidates.map((candidate) => candidate.url);
    assert.ok(urls.includes("https://images.thdstatic.com/productImages/hd1600-main.jpg"));
    // Relative URLs resolve against the page.
    assert.ok(urls.includes("https://www.homedepot.com/productImages/hd1600-alt.jpg"));
    assert.ok(urls.includes("https://images.thdstatic.com/productImages/hd1600-jsonld.jpg"));
    assert.equal(
      extracted.imageCandidates.find((candidate) =>
        candidate.url.endsWith("hd1600-jsonld.jpg"),
      )?.source,
      "json_ld",
    );
  });

  it("handles reversed attribute order and ignores malformed JSON-LD", () => {
    const html = `
      <meta property="og:image" content="https://images.thdstatic.com/a.jpg">
      <script type="application/ld+json">{not json]</script>`;
    const extracted = extractDirectTerraPageAssets(html, pageUrl);
    assert.equal(extracted.imageCandidates.length, 1);
    assert.equal(extracted.canonicalUrl, null);
  });

  it("drops non-http image and canonical values", () => {
    const html = `
      <meta property="og:image" content="javascript:alert(1)">
      <link rel="canonical" href="ftp://x.example.com/a">`;
    const extracted = extractDirectTerraPageAssets(html, pageUrl);
    assert.equal(extracted.imageCandidates.length, 0);
    assert.equal(extracted.canonicalUrl, null);
  });
});

describe("direct Terra page asset verification (T8B)", () => {
  const baseExtracted = {
    title: "RIDGID HD1600 16 Gallon NXT Wet/Dry Vac - The Home Depot",
    canonicalUrl: "https://www.homedepot.com/p/RIDGID-HD1600-Vac/304795082",
    imageCandidates: [
      {
        url: "https://images.thdstatic.com/productImages/ridgid-hd1600-front.jpg",
        source: "page_image",
      },
    ],
  };

  it("accepts a first-party CDN image and a same-domain identity-proven canonical", () => {
    const verified = verifyDirectTerraPageAssets({
      target,
      pageUrl,
      page: baseExtracted,
    });
    assert.equal(
      verified.imageUrl,
      "https://images.thdstatic.com/productImages/ridgid-hd1600-front.jpg",
    );
    assert.equal(
      verified.canonicalUrl,
      "https://www.homedepot.com/p/RIDGID-HD1600-Vac/304795082",
    );
  });

  it("rejects images hosted off the page's domain and its known CDNs", () => {
    const verified = verifyDirectTerraPageAssets({
      target,
      pageUrl,
      page: {
        ...baseExtracted,
        imageCandidates: [
          { url: "https://cdn.random-tracker.example.com/hd1600.jpg", source: "page_image" },
        ],
      },
    });
    assert.equal(verified.imageUrl, null);
  });

  it("rejects an image whose filename claims a conflicting sibling model", () => {
    const verified = verifyDirectTerraPageAssets({
      target,
      pageUrl,
      page: {
        ...baseExtracted,
        imageCandidates: [
          {
            // RR-061 class: explicit foreign model in the filename must veto.
            url: "https://images.thdstatic.com/productImages/ridgid-hd1200-front.jpg",
            source: "page_image",
          },
        ],
      },
    });
    assert.equal(verified.imageUrl, null);
  });

  it("rejects a cross-domain canonical and a canonical without title identity", () => {
    const crossDomain = verifyDirectTerraPageAssets({
      target,
      pageUrl,
      page: {
        ...baseExtracted,
        canonicalUrl: "https://outlet.example.com/p/304795082",
      },
    });
    assert.equal(crossDomain.canonicalUrl, null);

    // A canonical whose own slug carries the exact identity stays acceptable
    // even when the fetched title is a bot-wall page — the URL is evidence.
    const slugIdentity = verifyDirectTerraPageAssets({
      target,
      pageUrl,
      page: { ...baseExtracted, title: "Access Denied" },
    });
    assert.equal(
      slugIdentity.canonicalUrl,
      "https://www.homedepot.com/p/RIDGID-HD1600-Vac/304795082",
    );

    // A bare-id canonical with no title identity has no evidence at all.
    const noIdentity = verifyDirectTerraPageAssets({
      target,
      pageUrl,
      page: {
        ...baseExtracted,
        title: "Access Denied",
        canonicalUrl: "https://www.homedepot.com/p/304795082",
      },
    });
    assert.equal(noIdentity.canonicalUrl, null);
  });
});

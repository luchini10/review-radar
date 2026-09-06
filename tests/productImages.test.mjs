import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isProductImage, isShoppingImageUrl } from "../lib/productImage.ts";
import { enrichProductImages, matchesRecommendedModel, selectProductImage } from "../lib/productImages.ts";
import { RequestCancelledError } from "../lib/requestCancellation.ts";

const product = { name: "Sony WH-1000XM5", productPageUrl: "https://electronics.sony.com/wh1000xm5" };
const thumbnail = (id = "one") => `https://encrypted-tbn0.gstatic.com/shopping?q=tbn:${id}`;
const listing = (overrides = {}) => ({ title: product.name, link: product.productPageUrl, imageUrl: thumbnail(), productId: "12345", ...overrides });

describe("product image identity", () => {
  it("accepts complete brand/model identity across case, accents and model punctuation", () => {
    for (const [name, title] of [
      ["Sony WH-1000XM5", "Sony WH 1000XM5 Wireless Headphones Silver"],
      ["Sony WH 1000XM5", "Sony WH-1000XM5 Wireless Headphones"],
      ["Technivorm Moccamaster KBGV Select", "Technivorm Moccamaster KBGV Select 10-Cup Coffee Maker"],
      ["Breville Precision Brewer", "Breville Precision Brewer 12 Cup Coffee Maker"],
      ["Herman Miller Aeron", "Herman Miller Aeron Office Chair"],
      ["Beyerdynamic DT 1990 Pro", "beyerdynamic DT1990 Pro headphones"],
      ["Café Specialty Drip", "Cafe Specialty Drip Coffee Maker"],
    ]) assert.equal(matchesRecommendedModel(name, title), true, `${name} -> ${title}`);
  });

  it("rejects sibling models, accessories, bundles, vague identities and conflicting variants", () => {
    for (const [name, title] of [
      [product.name, "Sony WH-1000XM4"],
      [product.name, "Sony WH-1000XM5 WH-1000XM4"],
      [product.name, "Replacement case compatible with Sony WH-1000XM5"],
      [product.name, "Sony WH-1000XM5 bundle"],
      [product.name, "Sony WH-1000XM5 + wireless earbuds"],
      [product.name, "Sony WH-1000XM5 2-pack"],
      ["Apple AirPods Pro", "Apple AirPods Pro 2"],
      ["Apple AirPods Pro 2", "Apple AirPods Pro 3"],
      ["Apple AirPods Pro 2", "Apple AirPods Pro 2 / 3"],
      ["Breville Precision Brewer", "Breville Precision Brewer Pro"],
      ["Breville Precision Brewer", "Breville Precision Brewer replacement carafe"],
      ["coffee maker", "Popular coffee maker"],
      ["Brand Coffee Maker", "Brand Coffee Maker"],
      [product.name, "Other Brand WH-1000XM5"],
    ]) assert.equal(matchesRecommendedModel(name, title), false, `${name} -> ${title}`);
  });

  it("binds the picture, title, URL and ID to one matched Shopping row", () => {
    const rows = [listing({ title: "Sony WH-1000XM4", imageUrl: thumbnail("wrong") }), listing()];
    assert.deepEqual(selectProductImage(product, { shopping: rows }), {
      url: thumbnail(), sourceUrl: product.productPageUrl, sourceTitle: product.name, productId: "12345",
    });
    assert.equal(selectProductImage(product, { images: rows }), undefined);
    assert.equal(selectProductImage(product, { shopping: [rows[0]] }), undefined);
  });

  it("prefers the recommended product page while retaining variant query identity", () => {
    const reference = { ...product, productPageUrl: `${product.productPageUrl}?variant=black` };
    const rows = [listing({ link: `${product.productPageUrl}?variant=white`, imageUrl: thumbnail("white") }),
      listing({ link: `${reference.productPageUrl}&utm_source=search`, imageUrl: thumbnail("black") })];
    assert.equal(selectProductImage(reference, { shopping: rows }).url, thumbnail("black"));
  });

  it("does not repair invalid images by borrowing a URL from another listing", () => {
    assert.equal(selectProductImage(product, { shopping: [listing({ imageUrl: undefined }), listing({ title: "Sony WH-1000XM4" })] }), undefined);
    assert.equal(selectProductImage(product, { shopping: [listing({ link: undefined })] }), undefined);
  });

  it("rejects unexpected, private, credentialed and malformed image destinations", () => {
    for (const url of [
      "https://example.com/photo.jpg", "http://encrypted-tbn0.gstatic.com/shopping?q=tbn:x",
      "https://encrypted-tbn0.gstatic.com.evil.com/shopping?q=tbn:x",
      "https://user:secret@encrypted-tbn0.gstatic.com/shopping?q=tbn:x",
      "https://encrypted-tbn0.gstatic.com:8443/shopping?q=tbn:x",
      "https://encrypted-tbn0.gstatic.com/other?q=tbn:x", "https://encrypted-tbn0.gstatic.com/shopping",
      "http://127.0.0.1/photo", "data:image/svg+xml,<svg/>", "javascript:alert(1)", "x".repeat(2049), null,
    ]) assert.equal(isShoppingImageUrl(url), false, String(url).slice(0, 80));
    assert.equal(isShoppingImageUrl(thumbnail()), true);
    const valid = { url: thumbnail(), sourceUrl: product.productPageUrl, sourceTitle: product.name };
    for (const sourceUrl of ["http://127.0.0.1/x", "https://192.168.0.1/x", "https://host.internal/x", "https://user:secret@example.com/x"]) {
      assert.equal(isProductImage({ ...valid, sourceUrl }), false);
    }
    assert.equal(isProductImage({ ...valid, productId: {} }), false);
  });

  it("inspects at most ten bounded Shopping listings", () => {
    const wrong = listing({ title: "Sony WH-1000XM4" });
    assert.equal(selectProductImage(product, { shopping: [...Array(10).fill(wrong), listing()] }), undefined);
    assert.equal(selectProductImage(product, { shopping: [null, {}, listing({ title: "x".repeat(401) })] }), undefined);
  });
});

describe("stateless optional image lookup", () => {
  it("starts up to five lookups in parallel, preserves order and sends only product names", async () => {
    const products = Array.from({ length: 6 }, (_, i) => ({ name: `Example Model X${i}`, productPageUrl: `https://example.com/x${i}` }));
    const calls = [], releases = [];
    const pending = enrichProductImages({ products, apiKey: "test-only-key", fetchImpl: async (url, init) => {
      calls.push({ url, init });
      const index = calls.length - 1;
      await new Promise(resolve => releases.push(resolve));
      return Response.json({ shopping: [listing({ title: products[index].name, link: products[index].productPageUrl })] });
    } });
    assert.equal(calls.length, 5, "all five started without waiting for a previous lookup");
    releases.reverse().forEach(resolve => resolve());
    const { recommendations, debug } = await pending;
    assert.deepEqual(recommendations.map(({ name, productPageUrl }) => ({ name, productPageUrl })), products);
    assert.equal(recommendations.filter(p => p.image).length, 5);
    assert.equal(debug.imageLookups, 5); assert.equal(debug.imageMatches, 5);
    for (const [index, { url, init }] of calls.entries()) {
      assert.equal(url, "https://google.serper.dev/shopping");
      assert.equal(init.method, "POST"); assert.equal(init.cache, "no-store"); assert.equal(init.redirect, "error");
      assert.equal(init.headers["X-API-KEY"], "test-only-key");
      assert.deepEqual(JSON.parse(init.body), { q: products[index].name, gl: "us", hl: "en", num: 10 });
    }
    assert.equal(JSON.stringify({ recommendations, debug }).includes("test-only-key"), false);
  });

  it("always looks up again and uses the new result instead of saving successful matches", async () => {
    let calls = 0;
    const options = { products: [product], apiKey: "test-only-key", fetchImpl: async () => {
      calls++; return Response.json({ shopping: [listing({ imageUrl: thumbnail(String(calls)) })] });
    } };
    const first = await enrichProductImages(options), second = await enrichProductImages(options);
    assert.equal(calls, 2);
    assert.equal(first.recommendations[0].image.url, thumbnail("1"));
    assert.equal(second.recommendations[0].image.url, thumbnail("2"));
    assert.equal(product.image, undefined, "the original research result is not mutated");
  });

  it("leaves missing-key and empty searches intact without a provider call", async () => {
    const fetchImpl = async () => { throw new Error("Unexpected lookup"); };
    const noKey = await enrichProductImages({ products: [product], fetchImpl });
    assert.deepEqual(noKey.recommendations, [product]); assert.equal(noKey.debug.imageConfigMissing, true);
    const empty = await enrichProductImages({ products: [], apiKey: "test-only-key", fetchImpl });
    assert.equal(empty.debug.imageLookups, 0);
  });

  it("keeps products on no match, HTTP failure, malformed/oversized payload and network failure", async () => {
    for (const fetchImpl of [
      async () => Response.json({ shopping: [] }),
      async () => Response.json({ shopping: [listing({ title: "Sony WH-1000XM4" })] }),
      async () => new Response("secret error", { status: 429 }),
      async () => new Response("not JSON"),
      async () => Response.json({ wrong: [] }),
      async () => Response.json({ shopping: [], padding: "x".repeat(128 * 1024) }),
      async () => new Response("", { headers: { "content-length": "200000" } }),
      async () => { throw new Error("secret error"); },
    ]) {
      const result = await enrichProductImages({ products: [product], apiKey: "test-only-key", fetchImpl });
      assert.deepEqual(result.recommendations, [product]);
      assert.equal(result.debug.imageNoMatches + result.debug.imageErrors, 1);
      assert.equal(JSON.stringify(result).includes("secret"), false);
    }
  });

  it("aborts a hung lookup at its deadline without losing products", async () => {
    let operationSignal;
    const started = performance.now();
    const result = await enrichProductImages({ products: [product], apiKey: "test-only-key", timeoutMs: 20, fetchImpl: async (_, init) => {
      operationSignal = init.signal; return new Promise(() => {});
    } });
    assert.deepEqual(result.recommendations, [product]); assert.equal(result.debug.imageErrors, 1);
    assert.equal(operationSignal.aborted, true); assert.ok(performance.now() - started < 1000);
  });

  it("propagates user cancellation and aborts every active lookup", async () => {
    const controller = new AbortController(), signals = [];
    const pending = enrichProductImages({ products: [product, product], apiKey: "test-only-key", signal: controller.signal,
      fetchImpl: async (_, init) => { signals.push(init.signal); return new Promise(() => {}); } });
    assert.equal(signals.length, 2);
    controller.abort();
    await assert.rejects(pending, RequestCancelledError);
    assert.ok(signals.every(signal => signal.aborted));
    await assert.rejects(() => enrichProductImages({ products: [product], signal: controller.signal }), RequestCancelledError);
  });
});

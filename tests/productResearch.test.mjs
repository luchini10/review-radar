import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addOutputText } from "openai/lib/ResponsesParser";
import { researchProducts, ProductResearchError, PRODUCT_RESEARCH_MODEL, PRODUCT_RESEARCH_MAX_TOOL_CALLS } from "../lib/productResearch.ts";

const input = { query: "coffee maker", budget: "$500", priorities: "easy to clean", avoid: "pods" };
const product = (id) => ({ name: `Example Model ${id}`, productPageUrl: `https://shop.example.com/products/${id}` });
const search = (urls, overrides = {}) => ({ type: "web_search_call", status: "completed", action: { type: "search", sources: urls.map((url) => ({ type: "url", url })) }, ...overrides });
const message = (text, overrides = {}) => ({ id: "msg_test", type: "message", role: "assistant", status: "completed", phase: "final_answer", content: [{ type: "output_text", text, annotations: [] }], ...overrides });
function response(products = [product("A")], overrides = {}) {
  const text = JSON.stringify({ recommendations: products });
  return { status: "completed", output: [search(products.map((item) => item.productPageUrl)), message(text)], output_text: text, usage: { input_tokens: 100, output_tokens: 40, total_tokens: 140 }, ...overrides };
}
function clientWith(result, calls = []) {
  return { responses: { async create(options, requestOptions) { calls.push({ options, requestOptions }); return result; } } };
}
const failsWith = (reason) => (error) => error instanceof ProductResearchError && error.reason === reason;

describe("single-call product research", () => {
  it("uses one bounded research call and returns only names and source links in model order", async () => {
    const calls = [];
    const products = ["Z", "A", "R", "B", "C"].map(product);
    const selectedFeatures = [{ id: "capacity", name: "Capacity", type: "number", operator: "gte", value: 8, required: true, source: "smart_features" }];
    const out = await researchProducts({ input: { ...input, selectedFeatures }, client: clientWith(response(products), calls) });
    assert.deepEqual(out.result, { recommendations: products });
    assert.equal(calls.length, 1);
    const { options, requestOptions } = calls[0];
    assert.equal(options.model, PRODUCT_RESEARCH_MODEL);
    assert.deepEqual(options.reasoning, { effort: "medium" });
    assert.equal(options.store, false);
    assert.equal(options.tool_choice, "required");
    assert.equal(options.max_tool_calls, PRODUCT_RESEARCH_MAX_TOOL_CALLS);
    assert.equal(options.max_output_tokens, 8_000);
    assert.deepEqual(options.include, ["web_search_call.action.sources"]);
    assert.deepEqual(options.tools, [{ type: "web_search", search_context_size: "medium" }]);
    assert.equal(requestOptions.maxRetries, 0);
    assert.equal(requestOptions.timeout, 75_000);
    const request = JSON.parse(options.input[1].content);
    assert.equal(request.query, input.query);
    assert.equal(request.budget, "$500");
    assert.equal(request.avoid, "pods");
    assert.deepEqual(request.selectedFeatures, selectedFeatures);
    assert.equal("extractedRequirements" in request, false);
    assert.match(options.input[0].content, /top five best products/);
    assert.match(options.input[0].content, /independent hands-on test performance, reliability and long-term owner feedback/);
    assert.match(options.input[0].content, /search placement, sponsored listings and syndicated review counts do not establish popularity/);
    assert.deepEqual(Object.keys(options.text.format.schema.properties.recommendations.items.properties), ["name", "productPageUrl"]);
    assert.equal(out.debug.openAiCalls, 1);
    assert.equal(out.debug.totalTokens, 140);
  });

  it("uses the same ranking backend even when retired mode settings remain in the environment", async () => {
    const previous = process.env.OPENAI_RESEARCH_VARIANT;
    try {
      for (const variant of ["baseline", "adaptive", "verified", "obsolete-mode"]) {
        process.env.OPENAI_RESEARCH_VARIANT = variant;
        const calls = [];
        const out = await researchProducts({ input, client: clientWith(response(), calls) });
        assert.deepEqual(out.result.recommendations, [product("A")]);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].options.max_tool_calls, PRODUCT_RESEARCH_MAX_TOOL_CALLS);
        assert.equal(calls[0].options.input[0].role, "system");
        assert.deepEqual(Object.keys(calls[0].options.text.format.schema.properties.recommendations.items.properties), ["name", "productPageUrl"]);
        assert.equal("variant" in out.debug, false);
      }
    } finally {
      if (previous === undefined) delete process.env.OPENAI_RESEARCH_VARIANT;
      else process.env.OPENAI_RESEARCH_VARIANT = previous;
    }
  });

  it("returns fewer or zero products when completed research supplies less evidence", async () => {
    for (const products of [[], [product("A"), product("B")]]) {
      const out = await researchProducts({ input, client: clientWith(response(products)) });
      assert.deepEqual(out.result.recommendations, products);
    }
    const withoutUsage = await researchProducts({ input, client: clientWith(response([], { usage: undefined })) });
    assert.equal(withoutUsage.debug.inputTokens, null);
    assert.equal(withoutUsage.debug.outputTokens, null);
    assert.equal(withoutUsage.debug.totalTokens, null);
  });

  it("filters unobserved links and duplicates without reordering surviving products", async () => {
    const products = [product("Z"), product("missing"), product("A"), product("Z")];
    const out = await researchProducts({ input, client: clientWith(response(products, { output: [search([product("Z").productPageUrl, product("A").productPageUrl]), message(JSON.stringify({ recommendations: products }))] })) });
    assert.deepEqual(out.result.recommendations, [product("Z"), product("A")]);
    assert.equal(out.debug.rejectedProducts, 2);
  });

  it("accepts observed open-page links and native URL citation metadata without making merchant requests", async () => {
    const products = [product("opened"), product("cited")];
    const out = await researchProducts({ input, client: clientWith(response(products, {
      output_text: undefined,
      output: [search([]),
        { type: "web_search_call", status: "completed", action: { type: "open_page", url: products[0].productPageUrl } },
        message(JSON.stringify({ recommendations: products }), { content: [{ type: "output_text", text: JSON.stringify({ recommendations: products }), annotations: [{ type: "url_citation", url: products[1].productPageUrl }] }] }),
      ],
    })) });
    assert.deepEqual(out.result.recommendations, products);
    assert.equal(out.debug.hostedSearchCalls, 2);
  });

  it("never returns credentials, IP literals, local hosts or unsafe schemes even if observed", async () => {
    for (const url of ["javascript:alert(1)", "http://shop.example.com/a", "https://user:password@shop.example.com/a", "https://localhost/a", "https://localhost./a", "https://server.internal/a", "https://printer/a", "https://127.0.0.1/a", "https://2130706433/a", "https://[::1]/a", "https://[::ffff:127.0.0.1]/a", "https://shop.example.com:8443/a"]) {
      await assert.rejects(researchProducts({ input, client: clientWith(response([{ name: "Example", productPageUrl: url }])) }), failsWith("invalid_output"), url);
    }
  });

  it("requires actual completed web search and ignores unfinished source metadata", async () => {
    for (const output of [[], [search([product("A").productPageUrl], { status: "in_progress" })], [{ type: "web_search_call", status: "completed", action: { type: "open_page", url: product("A").productPageUrl } }]]) {
      await assert.rejects(researchProducts({ input, client: clientWith(response(undefined, { output })) }), failsWith("missing_web_search"));
    }
    await assert.rejects(researchProducts({ input, client: clientWith(response(undefined, { output: [search([]), search([product("A").productPageUrl], { status: "failed" }), message(JSON.stringify({ recommendations: [product("A")] }))] })) }), failsWith("invalid_output"));
  });

  it("rejects malformed, refused, incomplete and oversized output instead of inventing empty results", async () => {
    const invalid = [
      response(undefined, { status: "incomplete" }),
      response(undefined, { output: [search([]), message("not JSON")] }),
      response(Array.from({ length: 6 }, (_, id) => product(String(id)))),
      response([{ ...product("A"), price: 200 }]),
      response([{ name: "", productPageUrl: product("A").productPageUrl }]),
      response(undefined, { output: [search([]), message("", { content: [{ type: "refusal", refusal: "Cannot comply" }] })] }),
      response(undefined, { output: [...Array.from({ length: 7 }, () => search([product("A").productPageUrl])), message(JSON.stringify({ recommendations: [product("A")] }))] }),
    ];
    for (const value of invalid) await assert.rejects(researchProducts({ input, client: clientWith(value) }), failsWith("invalid_output"));
  });

  it("parses the completed final answer when the installed SDK aggregates commentary into output_text", async () => {
    const products = [product("A"), product("B")];
    const value = response(products);
    value.output.unshift(message("I will compare independent reviews before choosing the five best products.\n", { phase: "commentary" }));
    addOutputText(value);
    assert.match(value.output_text, /^I will compare/);
    const out = await researchProducts({ input, client: clientWith(value) });
    assert.deepEqual(out.result.recommendations, products);
  });

  it("allows one final unphased legacy message without trusting aggregated helper text", async () => {
    const products = [product("A")];
    const out = await researchProducts({ input, client: clientWith(response(products, {
      output_text: "This aggregate is not the final response JSON.",
      output: [message("Researching current products.", { phase: "commentary" }), search([products[0].productPageUrl]), message(JSON.stringify({ recommendations: products }), { phase: undefined })],
    })) });
    assert.deepEqual(out.result.recommendations, products);
  });

  it("rejects ambiguous, incomplete or commentary-only messages instead of extracting a JSON substring", async () => {
    const text = JSON.stringify({ recommendations: [product("A")] });
    for (const messages of [
      [message(text), message(text)],
      [message(text, { status: "incomplete" })],
      [message(text, { phase: "commentary" })],
      [message(text, { phase: undefined }), message(text, { phase: undefined })],
      [message(text, { phase: undefined }), message("More research", { phase: "commentary" })],
      [message(`Here are the products: ${text}`)],
      [message(" ".repeat(32_001) + text)],
      [],
    ]) {
      const value = response(undefined, { output: [search([product("A").productPageUrl]), ...messages] });
      await assert.rejects(researchProducts({ input, client: clientWith(value) }), failsWith("invalid_output"));
    }
  });

  it("does not retry or expose provider failure details", async () => {
    let calls = 0;
    await assert.rejects(researchProducts({ input, client: { responses: { async create() { calls++; throw new Error("private provider detail"); } } } }), (error) => failsWith("provider_error")(error) && !error.message.includes("private"));
    assert.equal(calls, 1);
  });

  it("uses an explicit server model override and rejects invalid configuration before dispatch", async () => {
    const calls = [];
    await researchProducts({ input, model: "gpt-5.5-2026-04-23", client: clientWith(response(), calls) });
    assert.equal(calls[0].options.model, "gpt-5.5-2026-04-23");
    for (const model of ["", "gpt-5.5\nextra", "https://untrusted.example.com/model"]) {
      await assert.rejects(researchProducts({ input, model, client: clientWith(response(), calls) }), failsWith("invalid_config"));
    }
    assert.equal(calls.length, 1);
  });

  it("honors cancellation before dispatch and during a provider call", async () => {
    const stopped = new AbortController(); stopped.abort();
    const calls = [];
    await assert.rejects(researchProducts({ input, signal: stopped.signal, client: clientWith(response(), calls) }), { name: "RequestCancelledError" });
    assert.equal(calls.length, 0);
    const controller = new AbortController();
    let requestSignal;
    const pending = researchProducts({ input, signal: controller.signal, client: { responses: { create(_options, requestOptions) { requestSignal = requestOptions.signal; return new Promise(() => {}); } } } });
    controller.abort();
    await assert.rejects(pending, { name: "RequestCancelledError" });
    assert.equal(requestSignal.aborted, true);
  });

  it("enforces its deadline even if an injected provider ignores cancellation", async () => {
    let calls = 0;
    let requestSignal;
    await assert.rejects(researchProducts({ input, timeoutMs: 10, client: { responses: { create(_options, requestOptions) { calls++; requestSignal = requestOptions.signal; return new Promise(() => {}); } } } }), failsWith("timeout"));
    assert.equal(calls, 1);
    assert.equal(requestSignal.aborted, true);
  });
});

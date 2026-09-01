import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { clearCacheForTests } from "../lib/cache.ts";
import {
  buildMarketScoutPlan,
  MARKET_SCOUT_CACHE_TTL_MS,
  MARKET_SCOUT_MODEL,
  marketScoutTestExports,
} from "../lib/marketScout.ts";

const input = {
  query: "robot vacuum",
  budget: "$300",
  priorities: "must be self-emptying",
};

const consumerReports =
  "https://www.consumerreports.org/appliances/vacuum-cleaners/example-model/m123/";
const rtings = "https://www.rtings.com/vacuum/reviews/example/model-pro";
const reviewed = "https://www.reviewed.com/vacuums/content/example-model-review";

function responseWith({
  actualUrls = [consumerReports],
  callCount = 1,
  outputTargets = [
    {
      aliases: ["Example Pro"],
      brand: "Example",
      model: "Model Pro",
      sourceUrls: actualUrls,
    },
  ],
  status = "completed",
  usage = { input_tokens: 120, output_tokens: 40, total_tokens: 160 },
} = {}) {
  return {
    output: Array.from({ length: callCount }, (_, index) => ({
      action: {
        sources:
          index === 0
            ? actualUrls.map((url) => ({ type: "url", url }))
            : [],
        type: "search",
      },
      status: "completed",
      type: "web_search_call",
    })),
    output_text: JSON.stringify({ targets: outputTargets }),
    status,
    usage,
  };
}

function clientReturning(response, calls = []) {
  return {
    responses: {
      async create(options, requestOptions) {
        calls.push({ options, requestOptions });
        return response;
      },
    },
  };
}

beforeEach(() => clearCacheForTests());

describe("market scout", () => {
  it("uses deterministic neutral discovery with no quality boost when no client exists", async () => {
    const result = await buildMarketScoutPlan({ client: null, input });

    assert.equal(result.telemetry.openAiCalls, 0);
    assert.equal(result.telemetry.usedFallback, true);
    assert.equal(result.telemetry.fallbackReason, "no_client");
    assert.deepEqual(result.plan.targets, []);
    assert.ok(result.plan.queries.length >= 1);
    assert.ok(result.plan.queries.every((query) => !/review|citation/i.test(query)));
  });

  it("makes one bounded GPT-5.4 Mini Structured Outputs call with source metadata", async () => {
    const calls = [];
    const result = await buildMarketScoutPlan({
      client: clientReturning(responseWith(), calls),
      input,
    });

    assert.equal(calls.length, 1);
    const options = calls[0].options;
    assert.equal(options.model, MARKET_SCOUT_MODEL);
    assert.equal(options.max_tool_calls, 2);
    assert.equal(options.store, false);
    assert.deepEqual(options.include, ["web_search_call.action.sources"]);
    assert.deepEqual(options.tools, [
      { type: "web_search", search_context_size: "medium" },
    ]);
    assert.equal(options.text.format.strict, true);
    assert.equal(options.text.format.type, "json_schema");
    assert.deepEqual(
      Object.keys(options.text.format.schema.properties.targets.items.properties),
      ["aliases", "brand", "model", "sourceUrls"],
    );
    const schemaText = JSON.stringify(options.text.format.schema);
    assert.doesNotMatch(schemaText, /price|explanation|reviewSummary|searchQueries/i);
    assert.equal(calls[0].requestOptions.timeout, 90_000);
    assert.equal(calls[0].requestOptions.maxRetries, 0);
    assert.equal(result.telemetry.openAiCalls, 1);
    assert.equal(result.telemetry.hostedSearchCalls, 1);
    assert.equal(result.telemetry.usedFallback, false);
    assert.deepEqual(
      {
        input: result.telemetry.inputTokens,
        output: result.telemetry.outputTokens,
        total: result.telemetry.totalTokens,
      },
      { input: 120, output: 40, total: 160 },
    );
  });

  it("keeps only exact URLs present in the actual web-search source set", async () => {
    const result = await buildMarketScoutPlan({
      client: clientReturning(
        responseWith({
          actualUrls: [consumerReports],
          outputTargets: [
            {
              aliases: [],
              brand: "Example",
              model: "Model Pro",
              sourceUrls: [consumerReports, rtings],
            },
          ],
        }),
      ),
      input,
    });

    assert.equal(result.telemetry.usedFallback, false);
    assert.deepEqual(result.plan.targets[0].sourceUrls, [
      "https://consumerreports.org/appliances/vacuum-cleaners/example-model/m123",
    ]);
    assert.equal(result.plan.targets[0].evidenceTier, "supported");
    assert.equal(result.telemetry.acceptedSourceUrls, 1);
    assert.equal(result.telemetry.rejectedSourceUrls, 1);
  });

  it("does not bind sources from incomplete web-search calls", async () => {
    const response = responseWith();
    response.output[0].status = "failed";
    const result = await buildMarketScoutPlan({
      client: clientReturning(response),
      input,
    });

    assert.equal(result.telemetry.usedFallback, true);
    assert.equal(result.telemetry.fallbackReason, "insufficient_evidence");
    assert.deepEqual(result.plan.targets, []);
  });

  it("assigns strong only for independent editorial domains including a comparative source", async () => {
    const result = await buildMarketScoutPlan({
      client: clientReturning(
        responseWith({ actualUrls: [rtings, reviewed] }),
      ),
      input,
    });

    assert.equal(result.plan.targets[0].evidenceTier, "strong");
    assert.equal(result.telemetry.evidenceTiers.strong, 1);
  });

  it("assigns supported for one comparative source or two independent editorials", () => {
    assert.equal(marketScoutTestExports.tierForSources([consumerReports]), "supported");
    assert.equal(
      marketScoutTestExports.tierForSources([
        "https://www.wired.com/article/product-profile/",
        "https://www.theverge.com/tech/123/product-profile",
      ]),
      "supported",
    );
  });

  it("assigns none to manufacturer, commerce, community, and insufficient evidence", () => {
    assert.equal(
      marketScoutTestExports.tierForSources([
        "https://www.amazon.com/dp/B000000000",
        "https://www.example.com/products/model-pro",
        "https://www.reddit.com/r/VacuumCleaners/comments/example",
      ]),
      "none",
    );
    assert.equal(
      marketScoutTestExports.tierForSources([
        "https://www.wired.com/article/product-profile/",
      ]),
      "none",
    );
  });

  it("does not cache invalid or insufficiently supported output", async () => {
    let calls = 0;
    const client = {
      responses: {
        async create() {
          calls += 1;
          return responseWith({
            actualUrls: ["https://www.amazon.com/dp/B000000000"],
          });
        },
      },
    };

    const first = await buildMarketScoutPlan({ client, input });
    const second = await buildMarketScoutPlan({ client, input });

    assert.equal(calls, 2);
    assert.equal(first.telemetry.fallbackReason, "insufficient_evidence");
    assert.equal(second.telemetry.fallbackReason, "insufficient_evidence");
    assert.deepEqual(first.plan.targets, []);
  });

  it("caches validated plans for 24 hours by normalized request, model, and prompt version", async () => {
    let calls = 0;
    const client = {
      responses: {
        async create() {
          calls += 1;
          return responseWith();
        },
      },
    };

    const first = await buildMarketScoutPlan({ client, input });
    const second = await buildMarketScoutPlan({
      client,
      input: {
        query: "  ROBOT   VACUUM ",
        budget: " $300 ",
        priorities: "must be self-emptying",
      },
    });
    await buildMarketScoutPlan({
      client,
      input,
      promptVersion: "different-prompt-version",
    });

    assert.equal(MARKET_SCOUT_CACHE_TTL_MS, 86_400_000);
    assert.equal(calls, 2);
    assert.equal(first.telemetry.cacheHit, false);
    assert.equal(first.telemetry.openAiCalls, 1);
    assert.equal(second.telemetry.cacheHit, true);
    assert.equal(second.telemetry.openAiCalls, 0);
    assert.equal(second.telemetry.hostedSearchCalls, 0);
  });

  it("propagates cancellation and aborts the shared provider request", async () => {
    const controller = new AbortController();
    let providerAborted = false;
    let markProviderStarted;
    const providerStarted = new Promise((resolve) => {
      markProviderStarted = resolve;
    });
    const promise = buildMarketScoutPlan({
      client: {
        responses: {
          async create(_options, requestOptions) {
            markProviderStarted();
            return new Promise((_resolve, reject) => {
              requestOptions.signal.addEventListener(
                "abort",
                () => {
                  providerAborted = true;
                  reject(new Error("provider aborted"));
                },
                { once: true },
              );
            });
          },
        },
      },
      input,
      signal: controller.signal,
    });

    await providerStarted;
    controller.abort("test cancellation");
    await assert.rejects(promise, { name: "RequestCancelledError" });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(providerAborted, true);
  });

  it("aborts a hung provider at the independent scout deadline", async () => {
    let providerAborted = false;
    const result = await buildMarketScoutPlan({
      client: {
        responses: {
          async create(_options, requestOptions) {
            return new Promise((_resolve, reject) => {
              requestOptions.signal.addEventListener(
                "abort",
                () => {
                  providerAborted = true;
                  reject(new Error("provider aborted"));
                },
                { once: true },
              );
            });
          },
        },
      },
      input,
      promptVersion: "hard-timeout",
      timeoutMs: 10,
    });

    assert.equal(providerAborted, true);
    assert.equal(result.telemetry.usedFallback, true);
    assert.equal(result.telemetry.fallbackReason, "timeout");
    assert.equal(result.telemetry.openAiCalls, 1);
    assert.deepEqual(result.plan.targets, []);
  });

  it("rejects a response that exceeds the hosted-search call ceiling", async () => {
    const result = await buildMarketScoutPlan({
      client: clientReturning(responseWith({ callCount: 4 })),
      input,
    });

    assert.equal(result.telemetry.usedFallback, true);
    assert.equal(result.telemetry.fallbackReason, "tool_call_ceiling");
    assert.equal(result.telemetry.hostedSearchCalls, 4);
    assert.deepEqual(result.plan.targets, []);
  });

  it("falls back safely on malformed output and classifies timeouts", async () => {
    const malformed = await buildMarketScoutPlan({
      client: clientReturning({ output: [], output_text: "not-json" }),
      input,
      promptVersion: "malformed",
    });
    const timedOut = await buildMarketScoutPlan({
      client: {
        responses: {
          async create() {
            const error = new Error("Request timed out");
            error.name = "APIConnectionTimeoutError";
            throw error;
          },
        },
      },
      input,
      promptVersion: "timeout",
    });

    assert.equal(malformed.telemetry.fallbackReason, "invalid_output");
    assert.equal(timedOut.telemetry.fallbackReason, "timeout");
    assert.deepEqual(malformed.plan.targets, []);
    assert.deepEqual(timedOut.plan.targets, []);
  });

  it("keeps the scout prompt bounded and free of card/report generation", () => {
    const prompt = marketScoutTestExports.systemPrompt;

    assert.match(prompt, /exact product models/i);
    assert.match(prompt, /at most two focused web searches/i);
    assert.match(prompt, /independent domains/i);
    assert.match(prompt, /comparative test or best-of source/i);
    assert.match(prompt, /current US retail availability/i);
    assert.match(prompt, /never transfer evidence/i);
    assert.doesNotMatch(prompt, /write (?:a )?report|pros and cons|card copy/i);
    assert.ok(prompt.length < 1_500);
  });
});

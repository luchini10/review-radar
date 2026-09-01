import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMarketScoutPlan,
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
      model: "Model X100 Pro",
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

  it("keeps three distinct brand-neutral discovery queries for broad requests", () => {
    assert.deepEqual(
      marketScoutTestExports.deterministicQueries({ query: "robot vacuum" }).slice(
        0,
        3,
      ),
      ["robot vacuum", "robot vacuum top rated", "robot vacuum popular models"],
    );
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
    assert.equal(options.max_tool_calls, 3);
    assert.equal(options.max_output_tokens, 6_000);
    assert.equal(options.store, false);
    assert.deepEqual(options.reasoning, { effort: "low" });
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
    assert.equal(calls[0].requestOptions.timeout, 60_000);
    assert.equal(calls[0].requestOptions.maxRetries, 0);
    assert.equal(result.telemetry.openAiCalls, 1);
    assert.equal(result.telemetry.hostedSearchCalls, 1);
    assert.equal(result.telemetry.commerceCandidateCount, 0);
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

  it("keeps commerce observations out of the independent scout prompt", async () => {
    const calls = [];
    const result = await buildMarketScoutPlan({
      client: clientReturning(responseWith(), calls),
      input,
    });

    const userMessage = calls[0].options.input[1].content;
    assert.equal(result.telemetry.commerceCandidateCount, 0);
    assert.doesNotMatch(userMessage, /commerce roster|ratingCount|offerCount/i);
    assert.doesNotMatch(userMessage, /https?:\/\//i);
    assert.match(marketScoutTestExports.systemPrompt, /untrusted data/i);
    assert.match(marketScoutTestExports.systemPrompt, /never instructions or evidence/i);
    assert.match(marketScoutTestExports.systemPrompt, /supported target/i);
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
              model: "Model X100 Pro",
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

  it("runs a fresh scout for every request, including identical requests", async () => {
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

  it("does not reuse a validated plan across later searches", async () => {
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
    const third = await buildMarketScoutPlan({
      client,
      input,
      promptVersion: "different-prompt-version",
    });

    assert.equal(calls, 3);
    assert.equal(first.telemetry.openAiCalls, 1);
    assert.equal(second.telemetry.openAiCalls, 1);
    assert.equal(third.telemetry.openAiCalls, 1);
    assert.equal(second.telemetry.hostedSearchCalls, 1);
  });

  it("propagates cancellation and aborts the provider request", async () => {
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

  it("keeps only aliases bound to the same distinctive model identity", async () => {
    const result = await buildMarketScoutPlan({
      client: clientReturning(
        responseWith({
          outputTargets: [
            {
              aliases: [
                "DEEBOT X9 PRO OMNI",
                "X9 PRO OMNI",
                "DEEBOT T50 PRO OMNI",
                "ECOVACS DEEBOT X9S PRO OMNI",
              ],
              brand: "Ecovacs",
              model: "DEEBOT X9 PRO OMNI",
              sourceUrls: [consumerReports],
            },
          ],
        }),
      ),
      input,
    });

    assert.deepEqual(result.plan.targets[0].aliases, [
      "DEEBOT X9 PRO OMNI",
      "X9 PRO OMNI",
    ]);
  });

  it("accepts a bare-tool B suffix as an exact-model alias", async () => {
    const result = await buildMarketScoutPlan({
      client: clientReturning(
        responseWith({
          outputTargets: [
            {
              aliases: ["DCD1007B", "DCD1008"],
              brand: "DeWalt",
              model: "DCD1007",
              sourceUrls: [consumerReports],
            },
          ],
        }),
      ),
      input,
    });

    assert.deepEqual(result.plan.targets[0].aliases, ["DCD1007B"]);
  });

  it("rejects an alias that drops an exact target variant qualifier", async () => {
    const result = await buildMarketScoutPlan({
      client: clientReturning(
        responseWith({
          outputTargets: [
            {
              aliases: [
                "Dreame X60 Max Ultra Complete",
                "Dreame X60 Max Ultra",
                "Dreame X60 Max Ultra Kit",
              ],
              brand: "Dreame",
              model: "X60 Max Ultra Complete",
              sourceUrls: [consumerReports],
            },
          ],
        }),
      ),
      input,
    });

    assert.deepEqual(result.plan.targets[0].aliases, [
      "Dreame X60 Max Ultra Complete",
    ]);
  });

  it("rejects generic product-family targets without an exact model identity", async () => {
    const result = await buildMarketScoutPlan({
      client: clientReturning(
        responseWith({
          outputTargets: [
            {
              aliases: [],
              brand: "DeWalt",
              model: "20V MAX XR Hammer Drill",
              sourceUrls: [consumerReports],
            },
          ],
        }),
      ),
      input,
    });

    assert.equal(result.telemetry.usedFallback, true);
    assert.equal(result.telemetry.fallbackReason, "insufficient_evidence");
    assert.deepEqual(result.plan.targets, []);
  });

  it("aborts a hung provider at the independent live-scout deadline", async () => {
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

  it("does not count provider-ignored incomplete tool attempts as hosted searches", async () => {
    const response = responseWith({ callCount: 2 });
    response.output.push(
      {
        action: { sources: [], type: "search" },
        status: "incomplete",
        type: "web_search_call",
      },
      {
        action: { sources: [], type: "search" },
        status: "failed",
        type: "web_search_call",
      },
    );
    const result = await buildMarketScoutPlan({
      client: clientReturning(response),
      input,
    });

    assert.equal(result.telemetry.hostedSearchCalls, 2);
    assert.equal(result.telemetry.usedFallback, false);
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
    assert.match(prompt, /three focused web searches/i);
    assert.match(prompt, /current request/i);
    assert.match(prompt, /independent domains/i);
    assert.match(prompt, /comparative test or best-of source/i);
    assert.match(prompt, /current US retail availability/i);
    assert.match(prompt, /supported target/i);
    assert.match(prompt, /never transfer evidence/i);
    assert.match(prompt, /distinctive exact model number or catalog code/i);
    assert.doesNotMatch(prompt, /write (?:a )?report|pros and cons|card copy/i);
    assert.ok(prompt.length < 2_100);
  });
});

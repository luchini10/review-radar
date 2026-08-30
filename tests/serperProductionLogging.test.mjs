import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clearCacheForTests } from "../lib/cache.ts";
import {
  createSearchObservabilityLedger,
  runWithSearchObservabilityLedger,
} from "../lib/searchObservabilityLedger.ts";
import {
  searchSerperDirectRetailer,
  searchSerperForProducts,
  searchSerperImageEvidence,
  searchSerperOrganic,
  searchSerperOrganicEvidence,
  searchSerperShoppingWithDiagnostics,
  searchSerperVideoEvidence,
} from "../lib/search/serper.ts";

const ERROR_CANARY = "private-error-canary-3f8d";
const URL_CANARY = "https://private.invalid/account/42";
const HEADER_CANARY = "Authorization=Bearer-not-real";
const KEY_CANARY = "sk-not-a-real-key";
const BODY_CANARY = "request-body-canary-a91c";
const WARNING_PREFIX = "[ReviewRadar Serper]";
const ALLOWED_EVENT_KEYS = new Set([
  "attemptNumber",
  "errorCategory",
  "event",
  "queryId",
  "requestStage",
  "searchType",
]);

function restoreEnvironmentValue(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

async function withMockedSerperEnvironment(
  {
    apiKey = "synthetic-serper-key",
    fetchImplementation,
    maxAttempts = null,
    nodeEnv = "production",
  },
  callback,
) {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const originalKey = process.env.SERPER_API_KEY;
  const originalMaxAttempts = process.env.REVIEW_RADAR_MAX_SERPER_ATTEMPTS;
  const originalNodeEnv = process.env.NODE_ENV;
  const warnings = [];

  clearCacheForTests();
  globalThis.fetch = fetchImplementation;
  console.warn = (...args) => warnings.push(args);
  process.env.NODE_ENV = nodeEnv;
  if (apiKey === null) delete process.env.SERPER_API_KEY;
  else process.env.SERPER_API_KEY = apiKey;
  if (maxAttempts === null) delete process.env.REVIEW_RADAR_MAX_SERPER_ATTEMPTS;
  else process.env.REVIEW_RADAR_MAX_SERPER_ATTEMPTS = maxAttempts;

  try {
    return await callback(warnings);
  } finally {
    clearCacheForTests();
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreEnvironmentValue("SERPER_API_KEY", originalKey);
    restoreEnvironmentValue(
      "REVIEW_RADAR_MAX_SERPER_ATTEMPTS",
      originalMaxAttempts,
    );
    restoreEnvironmentValue("NODE_ENV", originalNodeEnv);
  }
}

function assertWarningsContainNoCanaries(warnings, queryCanary) {
  const serialized = JSON.stringify(warnings);

  for (const canary of [
    queryCanary,
    ERROR_CANARY,
    URL_CANARY,
    HEADER_CANARY,
    KEY_CANARY,
    BODY_CANARY,
  ]) {
    assert.equal(serialized.includes(canary), false, `warning leaked ${canary}`);
  }
}

function warningEvents(warnings) {
  return warnings.map((args) => {
    assert.equal(args.length, 2);
    assert.equal(args[0], WARNING_PREFIX);
    assert.equal(typeof args[1], "object");
    assert.notEqual(args[1], null);

    for (const key of Object.keys(args[1])) {
      assert.equal(ALLOWED_EVENT_KEYS.has(key), true, `unexpected warning key ${key}`);
    }

    return args[1];
  });
}

function leakingTransportError() {
  return new TypeError(
    [ERROR_CANARY, URL_CANARY, HEADER_CANARY, KEY_CANARY, BODY_CANARY].join(" "),
  );
}

function loggingTestLedger() {
  return createSearchObservabilityLedger({
    commitHash: "logging-test-commit",
    flags: {},
    helperModel: "logging-test-helper",
    finalModel: "logging-test-final",
    serperCacheEmptyAtStart: true,
  });
}

const wrapperCases = [
  {
    id: "shopping",
    event: "shopping_search_skipped",
    searchType: "shopping",
    expectedFetchCalls: 4,
    run: async (query) =>
      (await searchSerperShoppingWithDiagnostics(query, "vacuum")).candidates,
  },
  {
    id: "organic",
    event: "organic_search_skipped",
    searchType: "organic",
    expectedFetchCalls: 2,
    run: (query) => searchSerperOrganic(query, "vacuum"),
  },
  {
    id: "direct-retailer",
    event: "direct_retailer_search_skipped",
    searchType: "direct_retailer",
    expectedFetchCalls: 2,
    run: (query) => searchSerperDirectRetailer("home_depot", query, "vacuum"),
  },
  {
    id: "evidence",
    event: "evidence_search_skipped",
    searchType: "evidence",
    expectedFetchCalls: 2,
    run: (query) => searchSerperOrganicEvidence(query),
  },
  {
    id: "image",
    event: "image_evidence_search_skipped",
    searchType: "images",
    expectedFetchCalls: 4,
    run: (query) => searchSerperImageEvidence(query),
  },
  {
    id: "video",
    event: "video_evidence_search_skipped",
    searchType: "videos",
    expectedFetchCalls: 4,
    run: (query) => searchSerperVideoEvidence(query),
  },
];

describe("production-safe Serper diagnostics", () => {
  for (const testCase of wrapperCases) {
    it(`redacts ${testCase.id} query and error detail while retaining a fixed event`, async () => {
      const queryCanary = `private-shopper-query-${testCase.id}-7c2e`;
      let fetchCalls = 0;

      await withMockedSerperEnvironment(
        {
          fetchImplementation: async () => {
            fetchCalls += 1;
            throw leakingTransportError();
          },
        },
        async (warnings) => {
          assert.deepEqual(await testCase.run(queryCanary), []);
          assert.equal(fetchCalls, testCase.expectedFetchCalls);
          assertWarningsContainNoCanaries(warnings, queryCanary);

          const events = warningEvents(warnings);
          assert.deepEqual(
            events.find((event) => event.event === testCase.event),
            {
              event: testCase.event,
              searchType: testCase.searchType,
              errorCategory: "transport_error",
            },
          );
        },
      );
    });
  }

  it("retains bounded retry and vertical-fallback state without free-form detail", async () => {
    const queryCanary = "private-shopper-query-retry-fallback-1e4a";
    let fetchCalls = 0;

    await withMockedSerperEnvironment(
      {
        fetchImplementation: async () => {
          fetchCalls += 1;
          throw leakingTransportError();
        },
      },
      async (warnings) => {
        const result = await runWithSearchObservabilityLedger(
          loggingTestLedger(),
          () => searchSerperShoppingWithDiagnostics(queryCanary, "vacuum"),
        );

        assert.deepEqual(result.candidates, []);
        assert.equal(fetchCalls, 4);
        assertWarningsContainNoCanaries(warnings, queryCanary);
        assert.deepEqual(warningEvents(warnings), [
          {
            event: "request_retry",
            searchType: "shopping",
            errorCategory: "transport_error",
            queryId: "q-0001",
            attemptNumber: 1,
            requestStage: "primary",
          },
          {
            event: "vertical_fallback",
            searchType: "shopping",
            errorCategory: "transport_error",
            queryId: "q-0001",
            attemptNumber: 2,
            requestStage: "primary",
          },
          {
            event: "request_retry",
            searchType: "shopping",
            errorCategory: "transport_error",
            queryId: "q-0001",
            attemptNumber: 3,
            requestStage: "fallback",
          },
          {
            event: "shopping_search_skipped",
            searchType: "shopping",
            errorCategory: "transport_error",
          },
        ]);
      },
    );
  });

  it("classifies bounded response, provider, timeout, and unknown failures without changing retries", async () => {
    const cases = [
      {
        id: "client",
        category: "http_client_error",
        expectedFetchCalls: 1,
        fetchImplementation: async () =>
          new Response(JSON.stringify({}), {
            status: 403,
            headers: { "content-type": "application/json" },
          }),
      },
      {
        id: "server",
        category: "http_server_error",
        expectedFetchCalls: 2,
        fetchImplementation: async () =>
          new Response(JSON.stringify({}), {
            status: 503,
            headers: { "content-type": "application/json" },
          }),
      },
      {
        id: "other-http",
        category: "http_other_error",
        expectedFetchCalls: 2,
        fetchImplementation: async () =>
          new Response(JSON.stringify({}), {
            status: 302,
            headers: { "content-type": "application/json" },
          }),
      },
      {
        id: "provider",
        category: "provider_error",
        expectedFetchCalls: 2,
        fetchImplementation: async () =>
          new Response(JSON.stringify({ error: ERROR_CANARY }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      },
      {
        id: "timeout",
        category: "request_timeout",
        expectedFetchCalls: 2,
        fetchImplementation: async () => {
          throw new DOMException(ERROR_CANARY, "AbortError");
        },
      },
      {
        id: "unknown",
        category: "unknown_error",
        expectedFetchCalls: 2,
        fetchImplementation: async () => {
          throw { detail: ERROR_CANARY };
        },
      },
    ];

    for (const testCase of cases) {
      const queryCanary = `private-shopper-query-category-${testCase.id}-8a1d`;
      let fetchCalls = 0;

      await withMockedSerperEnvironment(
        {
          fetchImplementation: async (...args) => {
            fetchCalls += 1;
            return testCase.fetchImplementation(...args);
          },
        },
        async (warnings) => {
          assert.deepEqual(await searchSerperOrganic(queryCanary, "vacuum"), []);
          assert.equal(fetchCalls, testCase.expectedFetchCalls);
          assertWarningsContainNoCanaries(warnings, queryCanary);

          const events = warningEvents(warnings);
          assert.equal(events.at(-1).event, "organic_search_skipped");
          assert.equal(events.at(-1).errorCategory, testCase.category);
          assert.equal(
            events.every((event) => event.errorCategory === testCase.category),
            true,
          );
        },
      );
    }
  });

  it("reports the request-scoped attempt ceiling without leaking or dispatching again", async () => {
    const queryCanary = "private-shopper-query-attempt-ceiling-d7b2";
    let fetchCalls = 0;

    await withMockedSerperEnvironment(
      {
        maxAttempts: "1",
        fetchImplementation: async () => {
          fetchCalls += 1;
          throw leakingTransportError();
        },
      },
      async (warnings) => {
        const result = await runWithSearchObservabilityLedger(
          loggingTestLedger(),
          () => searchSerperOrganic(queryCanary, "vacuum"),
        );

        assert.deepEqual(result, []);
        assert.equal(fetchCalls, 1);
        assertWarningsContainNoCanaries(warnings, queryCanary);
        assert.deepEqual(warningEvents(warnings), [
          {
            event: "request_retry",
            searchType: "organic",
            errorCategory: "transport_error",
            queryId: "q-0001",
            attemptNumber: 1,
            requestStage: "primary",
          },
          {
            event: "organic_search_skipped",
            searchType: "organic",
            errorCategory: "attempt_ceiling",
          },
        ]);
      },
    );
  });

  it("uses a fixed configuration event when the optional API key is missing", async () => {
    await withMockedSerperEnvironment(
      {
        apiKey: null,
        fetchImplementation: async () => {
          throw new Error("fetch must not run without a Serper API key");
        },
      },
      async (warnings) => {
        const result = await searchSerperForProducts(
          ["private-shopper-query-missing-key-54b0"],
          "vacuum",
        );

        assert.equal(result.stats.skippedReason, "missing_api_key");
        assert.deepEqual(warningEvents(warnings), [
          {
            event: "discovery_skipped",
            searchType: "discovery",
            errorCategory: "configuration_error",
          },
        ]);
      },
    );
  });

  it("retains the existing test-mode warning suppression", async () => {
    let fetchCalls = 0;

    await withMockedSerperEnvironment(
      {
        nodeEnv: "test",
        fetchImplementation: async () => {
          fetchCalls += 1;
          throw leakingTransportError();
        },
      },
      async (warnings) => {
        assert.deepEqual(
          await searchSerperOrganic("test-mode-query-canary", "vacuum"),
          [],
        );
        assert.equal(fetchCalls, 2);
        assert.deepEqual(warnings, []);
      },
    );
  });
});

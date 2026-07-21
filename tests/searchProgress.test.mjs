import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  createSearchProgressId,
  isValidSearchProgressId,
  milestoneForStage,
  SEARCH_PROGRESS_ID_HEADER,
  SEARCH_PROGRESS_MILESTONES,
} from "../lib/searchProgress.ts";
import {
  beginSearchProgress,
  completeSearchProgress,
  createSearchProgressGetHandler,
  getSearchProgress,
  reportSearchProgressMilestone,
  reportSearchProgressStage,
  searchProgressIdFromRequest,
  searchProgressTestExports,
} from "../lib/searchProgressStore.ts";
import { createRecommendationPostHandler } from "../app/api/recommendations/route.ts";

const { limits, resetSearchProgressStore, setSearchProgressClock, trackedSearchCount } =
  searchProgressTestExports;

const validId = "test-progress-0001";

beforeEach(() => {
  resetSearchProgressStore();
});

describe("search progress contract", () => {
  it("maps pipeline stages onto ordered user-facing milestones", () => {
    assert.equal(milestoneForStage("read_request_body"), "understand_request");
    assert.equal(milestoneForStage("openai_discovery_strategy"), "plan_strategy");
    assert.equal(milestoneForStage("serper_discovery"), "search_market");
    assert.equal(milestoneForStage("serper_follow_up_discovery"), "expand_coverage");
    assert.equal(milestoneForStage("openai_final_research"), "deep_research");
    assert.equal(milestoneForStage("filter_to_verified_citations"), "verify_sources");
    assert.equal(milestoneForStage("product_asset_enrichment"), "verify_facts");
    assert.equal(milestoneForStage("score_and_select_results"), "rank_results");
  });

  it("stays silent for unknown stages instead of guessing", () => {
    assert.equal(milestoneForStage("brand_new_internal_stage"), null);
    assert.equal(milestoneForStage(""), null);
  });

  it("only maps stages onto declared milestones", () => {
    const declared = new Set(SEARCH_PROGRESS_MILESTONES.map((m) => m.key));
    for (const stage of [
      "read_request_body",
      "serper_discovery",
      "openai_final_research",
      "score_and_select_results",
    ]) {
      const milestone = milestoneForStage(stage);
      assert.ok(milestone && declared.has(milestone));
    }
  });

  it("generates ids that pass its own validity rule", () => {
    for (let index = 0; index < 5; index += 1) {
      assert.ok(isValidSearchProgressId(createSearchProgressId()));
    }
    assert.ok(!isValidSearchProgressId("short"));
    assert.ok(!isValidSearchProgressId("bad id with spaces"));
    assert.ok(!isValidSearchProgressId("x".repeat(65)));
    assert.ok(!isValidSearchProgressId("../../../etc/passwd"));
  });
});

describe("search progress store", () => {
  it("records ordered milestones and collapses consecutive repeats", () => {
    beginSearchProgress(validId);
    reportSearchProgressStage(validId, "read_request_body");
    reportSearchProgressStage(validId, "extract_requirements");
    reportSearchProgressStage(validId, "detect_requirement_conflicts");
    reportSearchProgressStage(validId, "openai_discovery_strategy");
    reportSearchProgressStage(validId, "serper_discovery");

    const snapshot = getSearchProgress(validId);
    assert.ok(snapshot);
    assert.equal(snapshot.status, "running");
    assert.deepEqual(
      snapshot.events.map((event) => event.milestone),
      ["understand_request", "plan_strategy", "search_market"],
    );
    assert.deepEqual(
      snapshot.events.map((event) => event.sequence),
      [1, 2, 3],
    );
  });

  it("ignores reports for unknown ids and unknown stages", () => {
    reportSearchProgressStage(validId, "read_request_body");
    assert.equal(getSearchProgress(validId), null);

    beginSearchProgress(validId);
    reportSearchProgressStage(validId, "not_a_real_stage");
    const snapshot = getSearchProgress(validId);
    assert.ok(snapshot);
    assert.equal(snapshot.events.length, 0);
  });

  it("rejects invalid ids at begin and read", () => {
    beginSearchProgress("bad id");
    assert.equal(getSearchProgress("bad id"), null);
    assert.equal(trackedSearchCount(), 0);
  });

  it("reports milestones directly and keeps a monotonic roadmap idempotent", () => {
    beginSearchProgress(validId);
    // A prefix report is idempotent: re-reporting earlier milestones adds no
    // duplicates, so a background pipeline can safely report the whole prefix.
    reportSearchProgressMilestone(validId, "understand_request");
    reportSearchProgressMilestone(validId, "plan_strategy");
    reportSearchProgressMilestone(validId, "understand_request");
    reportSearchProgressMilestone(validId, "plan_strategy");
    reportSearchProgressMilestone(validId, "search_market");
    const snapshot = getSearchProgress(validId);
    assert.deepEqual(
      snapshot.events.map((event) => event.milestone),
      ["understand_request", "plan_strategy", "search_market"],
    );
  });

  it("ignores unknown milestone keys and unknown ids for direct reporting", () => {
    reportSearchProgressMilestone("dt-unknown-9999", "rank_results");
    assert.equal(getSearchProgress("dt-unknown-9999"), null);
    beginSearchProgress(validId);
    reportSearchProgressMilestone(validId, "not_a_real_milestone");
    assert.equal(getSearchProgress(validId).events.length, 0);
  });

  it("freezes the record after completion", () => {
    beginSearchProgress(validId);
    reportSearchProgressStage(validId, "read_request_body");
    completeSearchProgress(validId, "done");
    reportSearchProgressStage(validId, "serper_discovery");
    completeSearchProgress(validId, "error");

    const snapshot = getSearchProgress(validId);
    assert.ok(snapshot);
    assert.equal(snapshot.status, "done");
    assert.equal(snapshot.events.length, 1);
  });

  it("evicts records past the TTL", () => {
    let nowMs = 1_000_000;
    setSearchProgressClock(() => nowMs);
    beginSearchProgress(validId);
    assert.ok(getSearchProgress(validId));

    nowMs += limits.ttlMs + 1;
    assert.equal(getSearchProgress(validId), null);
    assert.equal(trackedSearchCount(), 0);
  });

  it("caps the number of tracked searches by evicting the oldest", () => {
    let nowMs = 1_000_000;
    setSearchProgressClock(() => nowMs);
    for (let index = 0; index < limits.maxTrackedSearches + 1; index += 1) {
      nowMs += 10;
      beginSearchProgress(`capacity-test-${String(index).padStart(4, "0")}`);
    }
    assert.equal(trackedSearchCount(), limits.maxTrackedSearches);
    assert.equal(getSearchProgress("capacity-test-0000"), null);
    assert.ok(getSearchProgress("capacity-test-0001"));
  });

  it("caps events per search", () => {
    beginSearchProgress(validId);
    const alternating = ["read_request_body", "serper_discovery"];
    for (let index = 0; index < limits.maxEventsPerSearch + 20; index += 1) {
      reportSearchProgressStage(validId, alternating[index % 2]);
    }
    const snapshot = getSearchProgress(validId);
    assert.ok(snapshot);
    assert.equal(snapshot.events.length, limits.maxEventsPerSearch);
  });

  it("returns snapshots that do not expose internal state", () => {
    beginSearchProgress(validId);
    reportSearchProgressStage(validId, "read_request_body");
    const snapshot = getSearchProgress(validId);
    assert.ok(snapshot);
    snapshot.events.push({ atMs: 0, milestone: "rank_results", sequence: 99 });
    const fresh = getSearchProgress(validId);
    assert.ok(fresh);
    assert.equal(fresh.events.length, 1);
  });
});

describe("search progress request helpers", () => {
  it("reads a valid progress id from the request header", () => {
    const request = new Request("http://localhost/api/recommendations", {
      headers: { [SEARCH_PROGRESS_ID_HEADER]: validId },
      method: "POST",
    });
    assert.equal(searchProgressIdFromRequest(request), validId);
  });

  it("rejects missing or malformed header values", () => {
    const missing = new Request("http://localhost/api/recommendations", {
      method: "POST",
    });
    assert.equal(searchProgressIdFromRequest(missing), null);

    const malformed = new Request("http://localhost/api/recommendations", {
      headers: { [SEARCH_PROGRESS_ID_HEADER]: "not valid!" },
      method: "POST",
    });
    assert.equal(searchProgressIdFromRequest(malformed), null);
  });
});

describe("search progress polling endpoint", () => {
  it("answers unknown for ids it has no record of", async () => {
    const handler = createSearchProgressGetHandler();
    const response = handler(
      new Request(`http://localhost/api/recommendations/progress?id=${validId}`),
    );
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = await response.json();
    assert.equal(body.status, "unknown");
    assert.deepEqual(body.events, []);
  });

  it("returns the live snapshot for a known id", async () => {
    beginSearchProgress(validId);
    reportSearchProgressStage(validId, "serper_discovery");

    const handler = createSearchProgressGetHandler();
    const response = handler(
      new Request(`http://localhost/api/recommendations/progress?id=${validId}`),
    );
    const body = await response.json();
    assert.equal(body.status, "running");
    assert.deepEqual(
      body.events.map((event) => event.milestone),
      ["search_market"],
    );
  });

  it("answers unknown for a missing id parameter", async () => {
    const handler = createSearchProgressGetHandler();
    const response = handler(
      new Request("http://localhost/api/recommendations/progress"),
    );
    const body = await response.json();
    assert.equal(body.status, "unknown");
  });
});

describe("recommendation route progress wiring", () => {
  it("begins, narrates, and completes progress across a request lifecycle", async () => {
    const savedApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const handler = createRecommendationPostHandler();
      const response = await handler(
        new Request("http://localhost/api/recommendations", {
          body: JSON.stringify({ query: "cordless vacuum" }),
          headers: {
            "Content-Type": "application/json",
            [SEARCH_PROGRESS_ID_HEADER]: validId,
          },
          method: "POST",
        }),
      );

      // Without an OpenAI key the route fails after reading the request,
      // which is exactly enough to prove begin → report → complete wiring
      // with zero network calls.
      assert.equal(response.status, 500);
      const snapshot = getSearchProgress(validId);
      assert.ok(snapshot);
      assert.equal(snapshot.status, "error");
      assert.deepEqual(
        snapshot.events.map((event) => event.milestone),
        ["understand_request"],
      );
    } finally {
      if (savedApiKey !== undefined) {
        process.env.OPENAI_API_KEY = savedApiKey;
      }
    }
  });

  it("changes nothing when the progress header is absent", async () => {
    const savedApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const handler = createRecommendationPostHandler();
      const response = await handler(
        new Request("http://localhost/api/recommendations", {
          body: JSON.stringify({ query: "cordless vacuum" }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );
      assert.equal(response.status, 500);
      assert.equal(trackedSearchCount(), 0);
    } finally {
      if (savedApiKey !== undefined) {
        process.env.OPENAI_API_KEY = savedApiKey;
      }
    }
  });
});

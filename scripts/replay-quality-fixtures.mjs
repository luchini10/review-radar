// Replay quality fixtures: load a saved debug payload (or synthetic fixture) and run
// deterministic analysis — stage funnel, citation strength, thin/weak winner detection,
// lost-leader tracking — with zero Serper/OpenAI calls.
//
// Usage:
//   node scripts/replay-quality-fixtures.mjs tests/fixtures/robot-vacuum-synthetic.json
//   node scripts/replay-quality-fixtures.mjs tests/fixtures/review-radar-live/robot-vacuum.json
//   node scripts/replay-quality-fixtures.mjs --all [tests/fixtures/review-radar-live]
//
// Save a live fixture with:
//   node scripts/save-debug-fixture.mjs "best robot vacuum"

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_FIXTURE_DIR = "tests/fixtures/review-radar-live";

// ── Citation helpers (mirrors citationStrengthDiagnostic.mjs) ─────────────────

function citTypeSummary(citations) {
  const types = (citations || []).map((c) => c.citation_type || "weak-uncorroborated");
  const counts = {
    "product-page-self": 0,
    "independent-editorial": 0,
    "retailer-marketplace": 0,
    "weak-uncorroborated": 0,
  };
  for (const t of types) counts[t] = (counts[t] || 0) + 1;
  const parts = [];
  if (counts["independent-editorial"]) parts.push(`${counts["independent-editorial"]} editorial`);
  if (counts["retailer-marketplace"]) parts.push(`${counts["retailer-marketplace"]} retailer`);
  if (counts["product-page-self"]) parts.push(`${counts["product-page-self"]} self`);
  if (counts["weak-uncorroborated"]) parts.push(`${counts["weak-uncorroborated"]} weak`);
  return parts.length ? parts.join(" + ") : "(none)";
}

function citStrength(citations) {
  const types = (citations || []).map((c) => c.citation_type || "weak-uncorroborated");
  if (types.some((t) => t === "independent-editorial")) return "INDEPENDENT";
  if (types.length > 0 && types.every((t) => t === "product-page-self")) return "SELF-ONLY";
  if (types.some((t) => t === "retailer-marketplace")) return "RETAILER";
  if (types.length === 0) return "NONE";
  return "WEAK";
}

function priceOk(product) {
  const text = product.estimated_price_range || "";
  return /\d/.test(text) && !/not verified|not found/i.test(text);
}

// ── Stage funnel helpers ──────────────────────────────────────────────────────

// Build a per-stage analysis: which names were dropped vs added at each stage.
// Starts from candidatePool (stages[0]) as the baseline.
function buildStageFunnelAnalysis(stageFunnel) {
  const stages = stageFunnel?.stages || [];
  if (stages.length === 0) return [];

  const result = [];
  let prevNames = new Set(stages[0]?.names || []);

  for (const s of stages) {
    const currNames = new Set([...(s.names || []), ...(s.near || [])]);
    const dropped = [...prevNames].filter((n) => !currNames.has(n));
    const added = [...currNames].filter((n) => !prevNames.has(n));

    result.push({
      stage: s.stage,
      count: currNames.size,
      names: [...currNames],
      dropped,
      added,
    });

    prevNames = currNames;
  }

  return result;
}

// Map every pool candidate to either "final" or "dropped-at-<stageName>" (the first
// stage at which it no longer appears).
function buildDropMap(stageFunnelAnalysis, poolCandidates) {
  const poolNames = (poolCandidates || []).map((c) => c.name);
  const dropMap = {};

  for (const name of poolNames) {
    let lastStageIdx = -1;
    for (let i = 0; i < stageFunnelAnalysis.length; i++) {
      if (stageFunnelAnalysis[i].names.includes(name)) {
        lastStageIdx = i;
      }
    }

    if (lastStageIdx < 0) {
      dropMap[name] = "never-appeared";
    } else if (lastStageIdx === stageFunnelAnalysis.length - 1) {
      dropMap[name] = "final";
    } else {
      const nextStage = stageFunnelAnalysis[lastStageIdx + 1];
      dropMap[name] = `dropped-at-${nextStage?.stage ?? "unknown"}`;
    }
  }

  return dropMap;
}

// ── Core analysis function (exported for tests) ───────────────────────────────

/**
 * Analyze a saved debug payload (live or synthetic) with zero API calls.
 * Returns a structured analysis object that tests and the CLI report use.
 */
export function analyzeFixture(payload) {
  const query = payload._query || "unknown";
  const goldLeaders = payload._goldLeaders || [];
  const isSynthetic = Boolean(payload._synthetic);

  const result = payload.result || {};
  const debug = payload.debug || {};
  const stageFunnel = debug.stageFunnel || null;
  const finalSelectionTrace = stageFunnel?.finalSelectionTrace || null;
  const sourceUpgradeTraces = stageFunnel?.sourceUpgradeTraces || null;

  const finalExact = result.exactMatches || [];
  const finalNear = result.nearMatches || [];
  const allFinal = [...finalExact, ...finalNear];
  const finalNames = new Set(allFinal.map((p) => p.name));

  // Stage funnel
  const stageFunnelAnalysis = stageFunnel ? buildStageFunnelAnalysis(stageFunnel) : [];
  const poolCandidatesRaw = stageFunnel?.poolCandidates || [];
  const dropMap = buildDropMap(stageFunnelAnalysis, poolCandidatesRaw);

  // Citation profile of final products
  const finalProducts = finalExact.map((p, i) => ({
    name: p.name,
    rank: i + 1,
    citStrength: citStrength(p.citations),
    citSummary: citTypeSummary(p.citations),
    priceVerified: priceOk(p),
    sourceConsensus: p.source_consensus || "(none)",
  }));

  const winner = finalProducts[0] ?? null;

  // thin winner: self-cited-only with verified price and non-weak consensus
  const thinWinner =
    winner !== null &&
    winner.citStrength === "SELF-ONLY" &&
    winner.priceVerified &&
    winner.sourceConsensus !== "Weak";

  // weak winner: truly uncorroborated — no verified price, zero citations, or weak + weak consensus
  const weakWinner =
    winner !== null &&
    (!winner.priceVerified ||
      winner.citStrength === "NONE" ||
      (winner.citStrength === "WEAK" && winner.sourceConsensus === "Weak"));

  // Candidates ranked below the winner that have stronger citation support
  const betterSupportedBelowWinner = thinWinner
    ? finalProducts.slice(1).filter((p) => p.citStrength === "INDEPENDENT")
    : [];

  // Gold leader coverage
  const lostLeaders = goldLeaders.filter((name) => !finalNames.has(name));
  const lostLeaderDropPoints = Object.fromEntries(
    lostLeaders.map((name) => [name, dropMap[name] ?? "not-in-pool"]),
  );

  return {
    query,
    isSynthetic,
    goldLeaders,
    stageFunnelAnalysis,
    poolCandidates: poolCandidatesRaw.length,
    finalProducts,
    citationAnalysis: {
      winner,
      thinWinner,
      weakWinner,
      betterSupportedBelowWinner,
    },
    lostLeaders,
    lostLeaderDropPoints,
    dropMap,
    sourceUpgradeTraces,
    finalSelectionTrace,
  };
}

// ── CLI report printer ────────────────────────────────────────────────────────

function printSourceUpgradeTraces(traces) {
  if (!traces) {
    console.log("\nSource-upgrade trace: not present (fixture pre-dates Phase 3E).");
    return;
  }
  if (!Array.isArray(traces) || traces.length === 0) {
    console.log("\nSource-upgrade trace: no candidates qualified for upgrade.");
    return;
  }
  console.log(`\nSource-Quality Upgrade (${traces.length} attempted):`);
  for (const t of traces) {
    const fields = t.attachedFields?.length > 0 ? t.attachedFields.join(", ") : "(none)";
    const status = t.evidenceAttached ? `✓ attached: ${fields}` : "✗ no match found";
    console.log(`  ${(t.name || "").slice(0, 50)}`);
    console.log(`    query: ${t.query}`);
    if (t.primaryQuery || t.fallbackQuery !== undefined || t.fallbackUsed !== undefined) {
      console.log(`    primary: ${t.primaryQuery || t.query}`);
      console.log(`    fallback: ${t.fallbackUsed ? t.fallbackQuery || "(missing)" : "not used"}`);
    }
    console.log(`    ${status}`);
    // Phase 3G diagnostic fields — gracefully absent in pre-3G fixtures
    if (t.candidatesReturned !== undefined) {
      const reason = t.noMatchReason ? ` (${t.noMatchReason})` : "";
      console.log(
        `    results: ${t.candidatesReturned} returned, ${t.candidatesEvaluated ?? 0} identity-matched${reason}`,
      );
      if (t.primaryCandidatesReturned !== undefined || t.fallbackCandidatesReturned !== undefined) {
        console.log(
          `    result split: primary=${t.primaryCandidatesReturned ?? "?"}, fallback=${t.fallbackCandidatesReturned ?? 0}`,
        );
      }
    }
    if (Array.isArray(t.candidateSample) && t.candidateSample.length > 0) {
      console.log(`    candidates:`);
      for (const s of t.candidateSample) {
        const matchTag = s.identityMatch ? "✓" : "✗";
        const priceStr = s.price != null ? ` $${s.price}` : " (no price)";
        const ratingStr = s.rating != null ? ` ★${s.rating}` : "";
        const reasonStr = s.rejectionReason ? ` [${s.rejectionReason}]` : " [attached]";
        console.log(
          `      ${matchTag} ${(s.name || "").slice(0, 55)}${priceStr}${ratingStr}${reasonStr}`,
        );
      }
    }
  }
}

function printFinalSelectionTrace(trace) {
  if (!trace) {
    console.log("\nFinal-selection trace: not present. This fixture was likely saved before trace instrumentation existed.");
    return;
  }

  if (!Array.isArray(trace) || trace.length === 0) {
    console.log("\nFinal-selection trace: empty.");
    return;
  }

  const selected = trace.filter((e) => e.selected);
  const notSelected = trace.filter((e) => !e.selected);

  console.log(`\nFinal-Selection Trace (${trace.length} candidates):`);

  // Selected products first
  console.log(`\n  Selected (${selected.length}):`);
  for (const e of selected.sort((a, b) => (a.finalRank ?? 99) - (b.finalRank ?? 99))) {
    const rankLabel = e.finalRank != null ? `#${e.finalRank}` : "near";
    const score = e.rankedMatchScore != null ? ` score=${e.rankedMatchScore}` : "";
    const tier = e.marketConfidenceTier ? ` tier=${e.marketConfidenceTier}` : "";
    const form = e.offFormFactorModifiers.length > 0 ? ` ⚑ form-factor: ${e.offFormFactorModifiers.join(",")}` : "";
    console.log(`    [${rankLabel}] ${(e.name || "").slice(0, 50)}${score}${tier}${form}`);
  }

  // Not-selected products by reason
  const byReason = {};
  for (const e of notSelected) {
    (byReason[e.decisionReason] = byReason[e.decisionReason] || []).push(e);
  }

  const reasonOrder = [
    "ranked_below_cutoff",
    "near_only_exact_full",
    "not_reliable_enough_for_exact",
    "duplicate_identity_collapsed",
    "variant_family_collapsed",
    "disqualified_category",
    "disqualified_avoid",
    "disqualified_other",
    "missing_trace_reason",
  ];

  for (const reason of reasonOrder) {
    const group = byReason[reason];
    if (!group || group.length === 0) continue;
    console.log(`\n  ${reason} (${group.length}):`);
    for (const e of group) {
      const stream = e.stream ? ` [${e.stream}]` : "";
      const score = e.rankedMatchScore != null ? ` score=${e.rankedMatchScore}` : "";
      const collBy = e.collapsedBy ? ` ← ${e.collapsedBy.slice(0, 30)}` : "";
      const form = e.offFormFactorModifiers.length > 0 ? ` ⚑ ${e.offFormFactorModifiers.join(",")}` : "";
      const req = e.failed.length > 0 ? ` failed=${e.failed.join(";")}` : "";
      const unk = e.unknown.length > 0 ? ` unknown=${e.unknown.join(";")}` : "";
      console.log(`    ${(e.name || "").slice(0, 50)}${stream}${score}${collBy}${form}${req}${unk}`);
    }
  }
}

function printReport(analysis) {
  const { query, isSynthetic, goldLeaders, stageFunnelAnalysis, finalProducts, citationAnalysis, lostLeaders, lostLeaderDropPoints } = analysis;

  const tag = isSynthetic ? " [SYNTHETIC]" : "";
  console.log(`\n${"=".repeat(70)}`);
  console.log(`FIXTURE REPLAY: "${query}"${tag}`);
  console.log("=".repeat(70));

  // Stage funnel
  if (stageFunnelAnalysis.length > 0) {
    console.log("\nStage Funnel:");
    for (const s of stageFunnelAnalysis) {
      const dropNote = s.dropped.length > 0 ? `  ← dropped ${s.dropped.length}: ${s.dropped.join(", ")}` : "";
      const addNote = s.added.length > 0 ? `  ← rescued ${s.added.length}: ${s.added.join(", ")}` : "";
      console.log(`  ${s.stage.padEnd(24)}: ${String(s.count).padStart(2)} candidates${dropNote}${addNote}`);
    }
  } else {
    console.log("\n(No stage funnel data — fixture missing debug.stageFunnel)");
  }

  // Final products
  if (finalProducts.length > 0) {
    console.log(`\nFinal Exact Matches (${finalProducts.length}):`);
    const W = [3, 38, 12, 36, 7];
    const header = [
      "#".padEnd(W[0]),
      "Product".padEnd(W[1]),
      "Strength".padEnd(W[2]),
      "Citations".padEnd(W[3]),
      "Price?".padEnd(W[4]),
    ].join(" ");
    console.log("  " + header);
    console.log("  " + "─".repeat(W.reduce((a, b) => a + b + 1, 0)));
    for (const p of finalProducts) {
      const row = [
        String(p.rank).padEnd(W[0]),
        (p.name || "").slice(0, W[1] - 1).padEnd(W[1]),
        p.citStrength.padEnd(W[2]),
        p.citSummary.slice(0, W[3] - 1).padEnd(W[3]),
        (p.priceVerified ? "yes" : "NO").padEnd(W[4]),
      ].join(" ");
      console.log("  " + row);
    }
  }

  // Winner analysis
  const { winner, thinWinner, weakWinner, betterSupportedBelowWinner } = citationAnalysis;
  if (winner) {
    console.log("\nWinner Analysis:");
    if (thinWinner) {
      console.log(`  ⚠  THIN WINNER: ${winner.name} is #1 with SELF-ONLY citation support.`);
      console.log(`     Verified price (${winner.priceVerified ? "yes" : "no"}), consensus (${winner.sourceConsensus}).`);
      if (betterSupportedBelowWinner.length > 0) {
        console.log(`  Better-supported candidates ranked below the thin winner:`);
        for (const p of betterSupportedBelowWinner) {
          console.log(`     → #${p.rank} ${p.name} — ${p.citStrength} (${p.citSummary})`);
        }
      } else {
        console.log(`  No independently-cited candidates in final 7 to compare.`);
      }
    } else if (weakWinner) {
      console.log(`  ⚠  WEAK WINNER: ${winner.name} is #1 with ${winner.citStrength} citation support. Needs investigation.`);
    } else {
      console.log(`  ✓  Winner (${winner.name}) has ${winner.citStrength} citation support. No thin-winner pattern.`);
    }
  }

  // Gold leader coverage
  if (goldLeaders.length > 0) {
    console.log("\nGold Leader Coverage:");
    for (const name of goldLeaders) {
      const inFinal = !lostLeaders.includes(name);
      if (inFinal) {
        const rank = (finalProducts.find((p) => p.name === name))?.rank ?? "?";
        console.log(`  ✓ ${name} — in final (rank ${rank})`);
      } else {
        const dp = lostLeaderDropPoints[name] ?? "unknown";
        console.log(`  ✗ ${name} — LOST: ${dp}`);
      }
    }
  }

  // Source-quality upgrade trace
  printSourceUpgradeTraces(analysis.sourceUpgradeTraces);

  // Final-selection trace
  printFinalSelectionTrace(analysis.finalSelectionTrace);
}

// ── CLI entry point ───────────────────────────────────────────────────────────

function runCLI(args) {
  const allFlag = args.includes("--all");

  if (allFlag || args.length === 0) {
    const dir = args.find((a) => !a.startsWith("--")) || DEFAULT_FIXTURE_DIR;
    if (!existsSync(dir)) {
      console.error(`Fixture directory not found: ${dir}`);
      console.error(`Run "node scripts/save-debug-fixture.mjs <query>" to save a live fixture.`);
      process.exit(1);
    }
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
      console.log(`No fixture files found in ${dir}.`);
      console.log(`Run "node scripts/save-debug-fixture.mjs <query>" to save a live fixture.`);
      return;
    }
    for (const file of files) {
      const payload = JSON.parse(readFileSync(join(dir, file), "utf8"));
      printReport(analyzeFixture(payload));
    }
    return;
  }

  const fixturePath = args[0];
  if (!fixturePath || fixturePath.startsWith("--")) {
    console.error("Usage: node scripts/replay-quality-fixtures.mjs <fixture-file>");
    console.error("       node scripts/replay-quality-fixtures.mjs --all [dir]");
    process.exit(1);
  }

  const absPath = resolve(fixturePath);
  if (!existsSync(absPath)) {
    console.error(`Fixture file not found: ${absPath}`);
    process.exit(1);
  }

  const payload = JSON.parse(readFileSync(absPath, "utf8"));
  printReport(analyzeFixture(payload));
}

// Guard: only run CLI when this script is the entry point, not when imported as a module.
const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(__filename);

if (isMain) {
  runCLI(process.argv.slice(2));
}

// FROZEN direct-Terra V2 evaluation contract (OAI-T7C).
//
// Purpose: grade whether the OpenAI-only direct-Terra report path is good
// enough at its CORE job — right products, right type, constraints respected,
// stable across identical runs — to justify becoming ReviewRadar's direction.
// The estimated-market-price feature (T7B) rides on this report; this eval
// tests the report itself, not just the price panel.
//
// DISCIPLINE (must not drift):
//   - This module GRADES; it must NEVER be imported by the request/prompt path.
//     No leader name, brand, or expected answer defined here or in the GOLD
//     benchmark may reach a Terra prompt. Cases sent to Terra are plain shopper
//     requests only (query/budget/priorities), exactly like a real user.
//   - The scorer is frozen BEFORE any live result is seen, so grading criteria
//     cannot be moved to flatter an observed score. It is validated against the
//     already-hand-audited T7B shop-vac fixture as ground truth.
//   - `coversLeader` is dependency-injected (from scripts/goldBenchmark.mjs) so
//     this library never imports the scripts/ benchmark and the frozen matcher
//     stays the single source of truth.

import { classifyProductTypeMatch } from "./productTypeMatch.ts";

export type DirectTerraEvalCaseKind = "broad" | "constrained";

export type DirectTerraEvalShopperRequest = {
  query: string;
  budget?: string;
  priorities?: string;
  avoid?: string;
};

export type DirectTerraEvalCase = {
  id: string;
  kind: DirectTerraEvalCaseKind;
  // The id of the frozen GOLD entry (leaders-v2026-07c) used to grade this
  // case. The request below is what Terra receives; the GOLD entry is only
  // ever consulted by the scorer.
  goldId: string;
  request: DirectTerraEvalShopperRequest;
  note: string;
};

// Four frozen cases, deliberately chosen to break the shop-vac / robot-vac
// overfit that dominated the R/V2 history: three categories neither pipeline
// was tuned on, plus one constrained robot-vacuum case that directly overlaps
// the legacy pipeline's historical North-Star for an apples-to-apples read.
// 1 broad + 3 constrained; budget in 3; feature constraints in 3; zero
// shop-vac (T7B/T6D already provide shop-vac reference data).
export const DIRECT_TERRA_EVAL_VERSION = "oai-t7c-terra-eval-v1";

export const DIRECT_TERRA_EVAL_CASES: DirectTerraEvalCase[] = [
  {
    id: "eval-broad-office-chair",
    kind: "broad",
    goldId: "broad-office-chair",
    request: { query: "office chair" },
    note: "Broad recall in a novel non-vacuum category with strong known leaders.",
  },
  {
    id: "eval-con-gas-grill-600-4burner",
    kind: "constrained",
    goldId: "con-gas-grill-600-4burner",
    request: { query: "gas grill", budget: "under $600", priorities: "4 burner, propane" },
    note: "Budget + two feature constraints in a novel category.",
  },
  {
    id: "eval-con-cordless-drill-150-brushless",
    kind: "constrained",
    goldId: "con-cordless-drill-150-brushless",
    request: { query: "cordless drill", budget: "under $150", priorities: "brushless" },
    note: "Budget + feature constraint in a power-tool category (novel).",
  },
  {
    id: "eval-con-robot-vac-300-selfempty",
    kind: "constrained",
    goldId: "con-robot-vac-300-selfempty",
    request: { query: "robot vacuum", budget: "under $300", priorities: "self-emptying" },
    note: "Overlaps the legacy pipeline's historical constrained North-Star; direct comparison.",
  },
];

// Minimal shapes for the GOLD data the scorer consumes. The real objects come
// from scripts/goldBenchmark.mjs (frozen leaders-v2026-07c).
export type GoldLeader = { brand: string; lines: string[] };
export type GoldConstraint =
  | { kind: "budget"; max: number }
  | { kind: "feature"; label: string; any: string[] };
export type GoldEntry = {
  id: string;
  type: "broad" | "constraint";
  category?: string;
  coreLeaders: GoldLeader[];
  acceptableAlternates?: GoldLeader[];
  wrongTypeTerms: string[];
  constraints?: GoldConstraint[];
};
export type CoversLeaderFn = (name: string, leader: GoldLeader) => boolean;

export type DirectTerraPriceEstimateLike = {
  rank: number;
  low: number;
  high: number;
  median: number;
};

export type RankedProduct = { rank: number; name: string; section: string };

// Same normalization the frozen matcher uses, so wrong-type substring checks
// line up with coversLeader tokenization.
function normalize(text: string) {
  return ` ${(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function wrongTypeAppearsInSecondaryClause(
  productName: string,
  wrongTypeTerm: string,
) {
  const hay = normalize(productName).trim();
  const needle = normalize(wrongTypeTerm).trim();
  const index = hay.indexOf(needle);
  if (index <= 0) return false;
  const prefix = hay.slice(0, index);
  return /\b(?:and|bundle|combo|includes?|including|plus|with)\b[^|]{0,100}$/.test(
    prefix,
  );
}

const RANKED_HEADING = /^#{2,4}\s+#?(\d+)\s+Best Match\b\s*[—\-:]*\s*(.*)$/i;
const DEPTH_TWO_HEADING = /^##\s/;

// Parse the report's ranked "## #N Best Match — Name" products. A product
// section runs from its heading to the next depth-2 (`##`) heading, so a
// product's own `###` sub-sections (specs, pros, sources) stay inside it.
export function parseRankedProducts(reportMarkdown: string): RankedProduct[] {
  const products: RankedProduct[] = [];
  let current: RankedProduct | null = null;
  const flush = () => {
    if (current) {
      current.section = current.section.trim();
      products.push(current);
      current = null;
    }
  };
  for (const line of (reportMarkdown || "").split(/\r?\n/)) {
    const rankedMatch = line.match(RANKED_HEADING);
    if (rankedMatch) {
      flush();
      const rank = Number(rankedMatch[1]);
      current = {
        rank: Number.isInteger(rank) ? rank : products.length + 1,
        name: rankedMatch[2].trim(),
        section: "",
      };
      continue;
    }
    if (DEPTH_TWO_HEADING.test(line)) {
      // A non-product depth-2 heading (Close matches, Comparison, ...) closes
      // the current product section.
      flush();
      continue;
    }
    if (current) current.section += `${line}\n`;
  }
  flush();
  return products.sort((a, b) => a.rank - b.rank);
}

export type DirectTerraRunScore = {
  rankedCount: number;
  rankedProducts: { rank: number; name: string; coversLeaderBrand: string | null }[];
  leaderRecall: { covered: string[]; missed: string[]; total: number; count: number };
  alternatesCovered: string[];
  wrongTypeHits: { rank: number; name: string; term: string }[];
  constraint: {
    budgetMax: number | null;
    budgetViolations: { rank: number; low: number }[];
    features: { label: string; coveredRanks: number[]; coverageRate: number }[];
  } | null;
  priceCoverage: { priced: number; total: number; rate: number };
  identityKeys: string[];
  leaderKeys: string[];
};

// A rough product-identity key for run-to-run churn: brand-ish first token plus
// the first model-number-bearing token, e.g. "ridgid hd1200". Falls back to the
// first two tokens when no model number is present. leaderKeys (below) are the
// primary, robust stability signal; this is a secondary churn proxy.
export function identityKey(name: string): string {
  const tokens = normalize(name).trim().split(" ").filter(Boolean);
  if (tokens.length === 0) return "";
  const brand = tokens[0];
  const modelToken = tokens.slice(1).find((t) => /\d/.test(t));
  if (modelToken) return `${brand} ${modelToken}`;
  return tokens.slice(0, 2).join(" ");
}

type DirectTerraRunScoreInput = {
  reportMarkdown: string;
  priceEstimates: DirectTerraPriceEstimateLike[];
  goldEntry: GoldEntry;
  coversLeader: CoversLeaderFn;
};

function scoreDirectTerraRunWithMode(
  input: DirectTerraRunScoreInput,
  contextualWrongType: boolean,
): DirectTerraRunScore {
  const { reportMarkdown, priceEstimates, goldEntry, coversLeader } = input;
  const ranked = parseRankedProducts(reportMarkdown);
  const alternates = goldEntry.acceptableAlternates ?? [];

  const rankedProducts = ranked.map((product) => {
    const leader = goldEntry.coreLeaders.find((candidate) =>
      coversLeader(product.name, candidate),
    );
    return {
      rank: product.rank,
      name: product.name,
      coversLeaderBrand: leader ? leader.brand : null,
    };
  });

  const covered = goldEntry.coreLeaders
    .filter((leader) => ranked.some((product) => coversLeader(product.name, leader)))
    .map((leader) => leader.brand);
  const missed = goldEntry.coreLeaders
    .filter((leader) => !ranked.some((product) => coversLeader(product.name, leader)))
    .map((leader) => leader.brand);
  const alternatesCovered = alternates
    .filter((leader) => ranked.some((product) => coversLeader(product.name, leader)))
    .map((leader) => leader.brand);

  const wrongTypeHits: DirectTerraRunScore["wrongTypeHits"] = [];
  for (const product of ranked) {
    const hay = normalize(product.name);
    const primaryTypeStillMatches =
      contextualWrongType && goldEntry.category
        ? classifyProductTypeMatch({
            evidenceText: product.name,
            identityText: product.name,
            requestedCategory: goldEntry.category,
          }).canBeExactMatch
        : false;
    for (const term of goldEntry.wrongTypeTerms) {
      if (
        hay.includes(normalize(term).trim()) &&
        !(
          primaryTypeStillMatches &&
          wrongTypeAppearsInSecondaryClause(product.name, term)
        )
      ) {
        wrongTypeHits.push({ rank: product.rank, name: product.name, term });
      }
    }
  }

  let constraint: DirectTerraRunScore["constraint"] = null;
  if (goldEntry.constraints && goldEntry.constraints.length > 0) {
    const budgetRule = goldEntry.constraints.find(
      (rule): rule is Extract<GoldConstraint, { kind: "budget" }> =>
        rule.kind === "budget",
    );
    const budgetMax = budgetRule ? budgetRule.max : null;
    const estimateByRank = new Map(priceEstimates.map((e) => [e.rank, e]));
    const budgetViolations =
      budgetMax === null
        ? []
        : priceEstimates
            .filter((estimate) => estimate.low > budgetMax)
            .map((estimate) => ({ rank: estimate.rank, low: estimate.low }));
    const features = goldEntry.constraints
      .filter(
        (rule): rule is Extract<GoldConstraint, { kind: "feature" }> =>
          rule.kind === "feature",
      )
      .map((rule) => {
        const coveredRanks = ranked
          .filter((product) => {
            const hay = normalize(product.section);
            return rule.any.some((token) => hay.includes(normalize(token).trim()));
          })
          .map((product) => product.rank);
        return {
          label: rule.label,
          coveredRanks,
          coverageRate: ranked.length > 0 ? coveredRanks.length / ranked.length : 0,
        };
      });
    void estimateByRank;
    constraint = { budgetMax, budgetViolations, features };
  }

  const priced = ranked.filter((product) =>
    priceEstimates.some((estimate) => estimate.rank === product.rank),
  ).length;

  return {
    rankedCount: ranked.length,
    rankedProducts,
    leaderRecall: {
      covered,
      missed,
      total: goldEntry.coreLeaders.length,
      count: covered.length,
    },
    alternatesCovered,
    wrongTypeHits,
    constraint,
    priceCoverage: {
      priced,
      total: ranked.length,
      rate: ranked.length > 0 ? priced / ranked.length : 0,
    },
    identityKeys: [...new Set(ranked.map((product) => identityKey(product.name)))].filter(
      Boolean,
    ),
    leaderKeys: [...new Set(covered)],
  };
}

// Historical leaders-v2026-07c scorer. This intentionally preserves the old
// lexical wrong-type behavior so recorded results remain reproducible.
export function scoreDirectTerraRun(
  input: DirectTerraRunScoreInput,
): DirectTerraRunScore {
  return scoreDirectTerraRunWithMode(input, false);
}

// Prospective corrected scorer. Wrong-type terms still identify candidates to
// inspect, but a term is not a failure when the shared product-type contract
// positively confirms that the named primary product remains the requested
// kind (for example, a gas grill with a charcoal tray or a drill combo).
export function scoreDirectTerraRunProspective(
  input: DirectTerraRunScoreInput,
): DirectTerraRunScore {
  return scoreDirectTerraRunWithMode(input, true);
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const value of setA) if (setB.has(value)) intersection += 1;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

function meanPairwiseJaccard(sets: string[][]): number | null {
  if (sets.length < 2) return null;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      total += jaccard(sets[i], sets[j]);
      pairs += 1;
    }
  }
  return pairs === 0 ? null : total / pairs;
}

export type DirectTerraCaseStability = {
  runs: number;
  recallCounts: number[];
  recallMean: number;
  leaderSetJaccard: number | null;
  identitySetJaccard: number | null;
  maxWrongTypeInAnyRun: number;
  maxBudgetViolationsInAnyRun: number;
  priceCoverageMean: number;
};

export function scoreDirectTerraCaseStability(
  runScores: DirectTerraRunScore[],
): DirectTerraCaseStability {
  const recallCounts = runScores.map((run) => run.leaderRecall.count);
  const recallMean =
    recallCounts.length > 0
      ? recallCounts.reduce((sum, value) => sum + value, 0) / recallCounts.length
      : 0;
  return {
    runs: runScores.length,
    recallCounts,
    recallMean,
    leaderSetJaccard: meanPairwiseJaccard(runScores.map((run) => run.leaderKeys)),
    identitySetJaccard: meanPairwiseJaccard(runScores.map((run) => run.identityKeys)),
    maxWrongTypeInAnyRun: Math.max(
      0,
      ...runScores.map((run) => run.wrongTypeHits.length),
    ),
    maxBudgetViolationsInAnyRun: Math.max(
      0,
      ...runScores.map((run) => (run.constraint?.budgetViolations.length ?? 0)),
    ),
    priceCoverageMean:
      runScores.length > 0
        ? runScores.reduce((sum, run) => sum + run.priceCoverage.rate, 0) /
          runScores.length
        : 0,
  };
}

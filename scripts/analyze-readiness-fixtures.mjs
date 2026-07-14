import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  GOLD,
  coversLeader,
  coversLeaderHistorical07b,
} from "./goldBenchmark.mjs";
import { areSameExactModelProduct } from "../lib/productIdentity.ts";
import { classifyProductEligibility } from "../lib/productEligibility.ts";
import { getProductPageLink } from "../lib/productPageUrl.ts";
import { classifyProductTypeMatch } from "../lib/productTypeMatch.ts";
import { stripLeadingSourceOrRetailerLabel } from "../lib/brandMatching.ts";
import { cheapPreFilterRawCandidates } from "../lib/search/serper.ts";

const leaderLabel = (leader) =>
  [leader.brand, ...(leader.lines || [])].filter(Boolean).join(" / ");
const increment = (map, key, amount = 1) =>
  map.set(key, (map.get(key) || 0) + amount);
const frequencyRows = (map) =>
  [...map.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((first, second) => second.count - first.count || first.reason.localeCompare(second.reason));

const C4_REQUESTS = {
  broad: { query: "shop vac" },
  constrained: {
    query: "robot vacuum",
    budget: "under $300",
    priorities: "self-emptying",
  },
};

const HISTORICAL_07B_CONSTRAINED_LEADERS = [
  { brand: "shark", lines: ["matrix", "ai"] },
  { brand: "eufy", lines: ["clean", "x8", "self"] },
  { brand: "roborock", lines: ["q5"] },
  { brand: "roomba", lines: ["i3", "i4"] },
];

function requestContract(request, c4Shape) {
  const knownShape = c4Shape && Object.hasOwn(C4_REQUESTS, c4Shape);
  const expected = knownShape
    ? C4_REQUESTS[c4Shape]
    : request?.budget
      ? C4_REQUESTS.constrained
      : C4_REQUESTS.broad;
  const keys = Object.keys(request || {}).sort();
  const expectedKeys = Object.keys(expected).sort();
  const valid =
    (!c4Shape || knownShape) &&
    JSON.stringify(keys) === JSON.stringify(expectedKeys) &&
    expectedKeys.every((key) => request?.[key] === expected[key]);

  return { valid, expected, actual: request };
}

function sourcePath(value) {
  if (!value) return "";
  if (value.startsWith("/")) return value;

  try {
    return new URL(value).pathname;
  } catch {
    return "";
  }
}

function sourceEvidenceText(name, urlsOrPaths) {
  const values = Array.isArray(urlsOrPaths) ? urlsOrPaths : [urlsOrPaths];
  return [name, ...values.map(sourcePath)].filter(Boolean).join(" ");
}

function normalizedWords(value) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function firstIdentityWord(value) {
  return (
    normalizedWords(stripLeadingSourceOrRetailerLabel(value || ""))
      .split(" ")
      .find(Boolean) || ""
  );
}

function sharedWordCount(first, second) {
  const firstWords = new Set(
    normalizedWords(first)
      .split(" ")
      .filter(
        (word) =>
          word.length > 2 && !["and", "for", "the", "with"].includes(word),
      ),
  );
  const secondWords = new Set(
    normalizedWords(second)
      .split(" ")
      .filter(
        (word) =>
          word.length > 2 && !["and", "for", "the", "with"].includes(word),
      ),
  );

  return [...firstWords].filter((word) => secondWords.has(word)).length;
}

function structuredShoppingIdentity(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const identifiers = url.searchParams.get("prds") || "";
    const match =
      identifiers.match(/(?:catalogid|productid|pid):([a-z0-9_-]+)/i) ||
      identifiers.match(/localannotatedofferid:([a-z0-9_-]+)/i);

    if (
      !(host === "google.com" || host.endsWith(".google.com")) ||
      url.pathname.toLowerCase() !== "/search" ||
      url.searchParams.get("ibp") !== "oshop" ||
      url.searchParams.get("udm") !== "28" ||
      !match
    ) {
      return null;
    }

    return {
      id: match[1],
      provider: "google_shopping",
    };
  } catch {
    return null;
  }
}

const complementHeadPattern =
  /\b(?:accessor(?:y|ies)|adapter|attachment|bag|battery|blade|brush|cable|case|charger|cover|filter|hose|liner|mount|nozzle|pad|part|protector|replacement|sleeve|stand)\b/i;
const includedComplementPattern =
  /\b(?:with|includes?|including|comes\s+with|plus)\b.{0,80}\b(?:accessor(?:y|ies)|adapter|attachment|bag|battery|blade|brush|cable|case|charger|cover|filter|hose|liner|mount|nozzle|pad|part|protector|sleeve|stand)\b/i;

function standaloneComplementRisk(name) {
  return (
    complementHeadPattern.test(name) && !includedComplementPattern.test(name)
  );
}

function identityLeadDecision(record, category) {
  const providerIdentity = structuredShoppingIdentity(
    record.normalizationRecovery?.originalUrl,
  );
  if (!providerIdentity) {
    return { qualified: false, reason: "no_structured_provider_identity" };
  }

  const eligibility = classifyProductEligibility({
    category,
    name: record.name,
    productName: record.name,
    sourceTitle: record.name,
    sourceType: "serper",
  });
  if (
    ["evidence_only", "listing_or_search", "non_product", "unknown"].includes(
      eligibility.status,
    )
  ) {
    return { qualified: false, reason: `identity_${eligibility.status}` };
  }

  const typeVerdict = classifyProductTypeMatch({
    allowedCheckText: record.name,
    evidenceText: sourceEvidenceText(
      record.name,
      record.sourceIdentityPaths || record.productUrl,
    ),
    identityText: record.name,
    requestedCategory: category,
  });
  if (!typeVerdict.canBeExactMatch) {
    return { qualified: false, reason: `identity_type_${typeVerdict.status}` };
  }

  if (standaloneComplementRisk(record.name)) {
    return {
      qualified: false,
      reason: "standalone_complement_risk",
      trustGateGap: typeVerdict.canBeExactMatch,
    };
  }

  return {
    providerIdentity,
    qualified: true,
    reason: null,
  };
}

function productForIdentity(name, category, url = "") {
  const productEligibility = classifyProductEligibility({
    category,
    name,
    productName: name,
    sourceTitle: name,
    sourceType: "serper",
    url,
  });

  return {
    name,
    category,
    product_page_url: url,
    productEligibility,
    metadata: {
      title: { value: name },
    },
  };
}

export function analyzeProductPageResolutionCandidate({
  category,
  leadName,
  pageTitle,
  pageUrl,
}) {
  const pageProduct = productForIdentity(pageTitle, category, pageUrl);
  const typeVerdict = classifyProductTypeMatch({
    allowedCheckText: pageTitle,
    evidenceText: sourceEvidenceText(pageTitle, pageUrl),
    identityText: pageTitle,
    requestedCategory: category,
  });
  const existingSelectorAccepted = Boolean(
    getProductPageLink({
      name: leadName,
      category,
      product_page_url: "",
      citations: [
        {
          title: pageTitle,
          url: pageUrl,
          what_it_supports: "Captured provider result.",
        },
      ],
    }),
  );
  const exactIdentity = areSameExactModelProduct(
    productForIdentity(leadName, category),
    pageProduct,
  );

  let rejectionReason = null;
  if (!pageProduct.productEligibility.canRenderAsProductCard) {
    rejectionReason = `page_${pageProduct.productEligibility.status}`;
  } else if (!typeVerdict.canBeExactMatch) {
    rejectionReason = `page_type_${typeVerdict.status}`;
  } else if (!existingSelectorAccepted) {
    rejectionReason = "product_page_selector_rejected";
  }

  return {
    existingSelectorAccepted,
    exactIdentity,
    pageEligibility: pageProduct.productEligibility.status,
    pageTypeStatus: typeVerdict.status,
    rejectionReason,
    strictResolutionAccepted: rejectionReason === null,
  };
}

function pageUrl(host, path) {
  if (!host || !path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith("/")) return null;

  const normalizedHost = host.toLowerCase().replace(/^www\./, "");
  if (!normalizedHost || normalizedHost.endsWith("google.com")) return null;
  return `https://${normalizedHost}${path}`;
}

function capturedPageObservations(attempts, productDiscoveryQueryIds) {
  const unique = new Map();

  for (const attempt of attempts) {
    for (const result of attempt.results || []) {
      for (const path of result.urlPaths || []) {
        const url = pageUrl(result.host, path);
        if (!url) continue;
        const key = `${normalizedWords(result.title)}|${url}`;
        if (unique.has(key)) continue;
        unique.set(key, {
          discovery: productDiscoveryQueryIds.has(attempt.queryId),
          price: result.price ?? null,
          title: result.title || "",
          url,
        });
      }
    }
  }

  return [...unique.values()];
}

function resolvedCandidateSurvivesPrefilter({
  category,
  leadName,
  page,
  request,
}) {
  const candidate = {
    id: `c5-${normalizedWords(leadName)}-${normalizedWords(page.url)}`,
    name: leadName,
    brand: null,
    category,
    productUrl: page.url,
    imageUrl: null,
    retailer: new URL(page.url).hostname,
    price: page.price,
    rating: null,
    reviewCount: null,
    availableColors: [],
    dimensions: {
      width: null,
      depth: null,
      height: null,
      unit: null,
    },
    keySpecs: [],
    evidenceSources: [
      {
        title: page.title,
        url: page.url,
        snippet: "",
        snippetProvenance: "source-derived",
      },
    ],
    requirementCheck: {
      exactMatch: false,
      passed: [],
      failed: [],
      unknown: [],
    },
  };

  return (
    cheapPreFilterRawCandidates([candidate], request, 1).candidates.length === 1
  );
}

function finalProductEvidenceText(product) {
  return [
    product.name,
    product.metadata?.title?.value,
    ...(product.pros || []),
    ...(product.cons || []),
    ...(product.citations || []).map((citation) => citation.title),
  ]
    .filter(Boolean)
    .join(" ");
}

function duplicateFinalPairs(products) {
  const duplicates = [];
  for (let first = 0; first < products.length; first += 1) {
    for (let second = first + 1; second < products.length; second += 1) {
      if (areSameExactModelProduct(products[first], products[second])) {
        duplicates.push([products[first].name, products[second].name]);
      }
    }
  }
  return duplicates;
}

function jaccard(first, second) {
  const a = new Set(first.map(normalizedWords));
  const b = new Set(second.map(normalizedWords));
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  return [...a].filter((value) => b.has(value)).length / union.size;
}

function pairwiseMean(runs, field) {
  const scores = [];
  for (let first = 0; first < runs.length; first += 1) {
    for (let second = first + 1; second < runs.length; second += 1) {
      scores.push(jaccard(runs[first][field], runs[second][field]));
    }
  }
  return scores.length
    ? scores.reduce((total, score) => total + score, 0) / scores.length
    : null;
}

function benchmarkForRequest(request) {
  return GOLD.find((item) =>
    request.budget
      ? item.id === "con-robot-vac-300-selfempty"
      : item.id === "broad-shop-vac",
  );
}

function historical07bBenchmark(benchmark) {
  return benchmark.id === "con-robot-vac-300-selfempty"
    ? { ...benchmark, coreLeaders: HISTORICAL_07B_CONSTRAINED_LEADERS }
    : benchmark;
}

function lossReasons(records) {
  const frequency = new Map();

  for (const record of records) {
    if (!record.firstLoss) continue;
    increment(
      frequency,
      `${record.firstLoss.stage}:${record.firstLoss.subreason}`,
    );
  }

  return frequencyRows(frequency);
}

function analyzeWithMatcher({
  benchmark,
  candidateRecords,
  finalProducts,
  matcher,
  productDiscoveryAttempts,
  productDiscoveryQueryIds,
  sourceEvidence = false,
}) {
  const rawResults = productDiscoveryAttempts.flatMap((attempt) =>
    attempt.results,
  );
  const discoveryRecords = candidateRecords.filter((candidate) =>
    candidate.queryIds.some((queryId) => productDiscoveryQueryIds.has(queryId)),
  );
  const normalizedRecords = discoveryRecords.filter(
    (candidate) => candidate.source === "serper" && candidate.normalized,
  );
  const dedupedRecords = normalizedRecords.filter(
    (candidate) =>
      !candidate.mergedIntoCandidateId && candidate.firstLoss?.stage !== "raw_dedupe",
  );
  const prefilterRecords = dedupedRecords.filter(
    (candidate) => candidate.prefilterAccepted === true,
  );
  const postMergeRecords = prefilterRecords.filter(
    (candidate) => candidate.firstLoss?.stage !== "candidate_merge",
  );
  const recoveryRecords = discoveryRecords.filter((candidate) =>
    ["would_recover", "recovered"].includes(
      candidate.normalizationRecovery?.outcome,
    ),
  );
  const recoveryObserved = discoveryRecords.some(
    (candidate) => candidate.normalizationRecovery,
  );
  const counterfactualObserved = discoveryRecords.some(
    (candidate) => candidate.normalizationCounterfactual,
  );
  const modeNormalizedRecords = (mode) =>
    discoveryRecords.flatMap((candidate) => {
      const counterfactual = candidate.normalizationCounterfactual;
      if (!counterfactual) {
        return candidate.source === "serper" && candidate.normalized
          ? [candidate]
          : [];
      }

      const outcome = mode === "flag_on"
        ? counterfactual.flagOn
        : counterfactual.flagOff;
      return outcome.normalizedCandidateId
        ? [{ ...candidate, productUrl: outcome.productUrl }]
        : [];
    });
  const flagOffNormalizedRecords = modeNormalizedRecords("flag_off");
  const flagOnNormalizedRecords = modeNormalizedRecords("flag_on");
  const recoveredRuntimeRecords = discoveryRecords.filter(
    (candidate) => candidate.normalizationRecovery?.outcome === "recovered",
  );
  const matchText = (name, urlOrPath, leader) =>
    matcher(
      sourceEvidence ? sourceEvidenceText(name, urlOrPath) : name,
      leader,
    );

  const leaders = benchmark.coreLeaders.map((leader) => {
    const rawTitleMatches = rawResults.filter((result) =>
      matcher(result.title, leader),
    );
    const rawMatches = rawResults.filter((result) =>
      matchText(result.title, result.urlPaths || [], leader),
    );
    const rawRecordMatches = discoveryRecords.filter(
      (candidate) =>
        candidate.source === "raw_serper_result" &&
        matchText(
          candidate.name,
          candidate.sourceIdentityPaths || candidate.productUrl,
          leader,
        ),
    );
    const normalizedMatches = normalizedRecords.filter((candidate) =>
      matchText(candidate.name, candidate.productUrl, leader),
    );
    const dedupedMatches = dedupedRecords.filter((candidate) =>
      matchText(candidate.name, candidate.productUrl, leader),
    );
    const prefilterMatches = prefilterRecords.filter((candidate) =>
      matchText(candidate.name, candidate.productUrl, leader),
    );
    const postMergeMatches = postMergeRecords.filter((candidate) =>
      matchText(candidate.name, candidate.productUrl, leader),
    );
    const displayedMatches = finalProducts
      .filter((product) =>
        matchText(product.name, product.product_page_url, leader),
      )
      .map((product) => product.name);
    const recoveryMatches = recoveryRecords.filter((candidate) =>
      matchText(candidate.name, candidate.productUrl, leader),
    );
    const flagOffNormalizedMatches = flagOffNormalizedRecords.filter(
      (candidate) => matchText(candidate.name, candidate.productUrl, leader),
    );
    const flagOnNormalizedMatches = flagOnNormalizedRecords.filter(
      (candidate) => matchText(candidate.name, candidate.productUrl, leader),
    );

    let terminalStage = "displayed";
    let terminalReasons = [];
    if (rawMatches.length === 0) {
      terminalStage = "absent_from_raw_digests";
    } else if (normalizedMatches.length === 0) {
      terminalStage = "lost_in_normalization";
      terminalReasons = lossReasons(rawRecordMatches);
    } else if (dedupedMatches.length === 0) {
      terminalStage = "lost_in_raw_dedupe";
      terminalReasons = lossReasons(normalizedMatches);
    } else if (prefilterMatches.length === 0) {
      terminalStage = "lost_in_cheap_prefilter";
      terminalReasons = lossReasons(dedupedMatches);
    } else if (postMergeMatches.length === 0) {
      terminalStage = "lost_in_ai_serper_merge";
      terminalReasons = lossReasons(prefilterMatches);
    } else if (displayedMatches.length === 0) {
      terminalStage = "lost_after_merge";
      terminalReasons = lossReasons(postMergeMatches);
    }

    return {
      leader: leaderLabel(leader),
      rawTitlePresence: rawTitleMatches.length > 0,
      rawPresence: rawMatches.length > 0,
      rawAppearanceCount: rawMatches.length,
      sourceEvidenceOnlyRawNames: rawMatches
        .filter((result) => !matcher(result.title, leader))
        .map((result) => result.title),
      normalizedPresence: normalizedMatches.length > 0,
      normalizedCandidateCount: normalizedMatches.length,
      rawDedupeSurvival: dedupedMatches.length > 0,
      prefilterSurvival: prefilterMatches.length > 0,
      preAiPoolPresence: prefilterMatches.length > 0,
      postMergePresence: postMergeMatches.length > 0,
      displayedPresence: displayedMatches.length > 0,
      displayedNames: displayedMatches,
      normalizationRecoveryOpportunity: recoveryMatches.length > 0,
      normalizationRecoveryNames: Array.from(
        new Set(recoveryMatches.map((candidate) => candidate.name)),
      ),
      flagOffNormalizedPresence: flagOffNormalizedMatches.length > 0,
      flagOnNormalizedPresence: flagOnNormalizedMatches.length > 0,
      terminalStage,
      terminalReasons,
    };
  });

  const recordedResultLossFrequency = new Map();
  for (const candidate of discoveryRecords) {
    if (!candidate.firstLoss) continue;
    const matchingLeaderCount = benchmark.coreLeaders.filter((leader) =>
      matchText(candidate.name, candidate.productUrl, leader),
    ).length;
    if (matchingLeaderCount === 0) continue;
    increment(
      recordedResultLossFrequency,
      `${candidate.firstLoss.stage}:${candidate.firstLoss.subreason}`,
      matchingLeaderCount,
    );
  }

  return {
    preAiPoolNames: prefilterRecords.map((candidate) => candidate.name),
    preAiPoolRecall: {
      covered: leaders.filter((leader) => leader.preAiPoolPresence).length,
      total: benchmark.coreLeaders.length,
    },
    finalRecall: {
      covered: leaders.filter((leader) => leader.displayedPresence).length,
      total: benchmark.coreLeaders.length,
    },
    normalizationRecovery: {
      observed: recoveryObserved,
      uniqueLeaderRunOpportunities: leaders.filter(
        (leader) => leader.normalizationRecoveryOpportunity,
      ).length,
      productNames: Array.from(
        new Set(
          leaders.flatMap((leader) => leader.normalizationRecoveryNames),
        ),
      ),
    },
    normalizationCounterfactual: {
      observed: counterfactualObserved,
      flagOffNormalizedRecall: {
        covered: leaders.filter((leader) => leader.flagOffNormalizedPresence)
          .length,
        total: benchmark.coreLeaders.length,
      },
      flagOnNormalizedRecall: {
        covered: leaders.filter((leader) => leader.flagOnNormalizedPresence)
          .length,
        total: benchmark.coreLeaders.length,
      },
      addedResults: discoveryRecords
        .filter((candidate) => candidate.normalizationCounterfactual?.delta === "added")
        .map((candidate) => candidate.name),
      removedForSafety: discoveryRecords
        .filter(
          (candidate) =>
            candidate.normalizationCounterfactual?.delta === "removed_for_safety",
        )
        .map((candidate) => candidate.name),
      parityViolations: discoveryRecords.filter(
        (candidate) =>
          candidate.normalizationCounterfactual?.runtimeMatchesSelected === false,
      ).length,
      recoveredSurvival: recoveredRuntimeRecords.map((candidate) => ({
        name: candidate.name,
        prefilterAccepted: candidate.prefilterAccepted,
        firstLoss: candidate.firstLoss,
        selected: candidate.selected,
        finalOutcome: candidate.finalOutcome,
      })),
    },
    leaders,
    recordedLeaderResultLossFrequency: frequencyRows(recordedResultLossFrequency),
  };
}

function analyzeIdentityResolution({
  attempts,
  benchmark,
  candidateRecords,
  currentLeaders,
  matcher,
  productDiscoveryQueryIds,
  request,
}) {
  const discoveryRecords = candidateRecords.filter(
    (candidate) =>
      candidate.source === "raw_serper_result" &&
      candidate.queryIds.some((queryId) =>
        productDiscoveryQueryIds.has(queryId),
      ),
  );
  const decisions = discoveryRecords.map((record) => ({
    decision: identityLeadDecision(record, benchmark.category),
    record,
  }));
  const uniqueLeads = (rows) => {
    const unique = new Map();
    for (const row of rows) {
      const providerId = row.decision.providerIdentity?.id || "none";
      const key = `${providerId}|${normalizedWords(row.record.name)}`;
      if (!unique.has(key)) unique.set(key, row);
    }
    return [...unique.values()];
  };
  const qualifiedLeads = uniqueLeads(
    decisions.filter((row) => row.decision.qualified),
  );
  const riskyLeads = uniqueLeads(
    decisions.filter(
      (row) =>
        !row.decision.qualified &&
        row.decision.reason === "standalone_complement_risk",
    ),
  );
  const trustGateGapNames = riskyLeads
    .filter((row) => row.decision.trustGateGap)
    .map((row) => row.record.name);
  const pages = capturedPageObservations(attempts, productDiscoveryQueryIds);
  const pagesByIdentityWord = new Map();
  for (const page of pages) {
    const word = firstIdentityWord(page.title);
    if (!word) continue;
    const bucket = pagesByIdentityWord.get(word) || [];
    bucket.push(page);
    pagesByIdentityWord.set(word, bucket);
  }

  const strictMatchesByLead = new Map();
  for (const lead of qualifiedLeads) {
    const matches = [];
    for (const page of pagesByIdentityWord.get(
      firstIdentityWord(lead.record.name),
    ) || []) {
      const result = analyzeProductPageResolutionCandidate({
        category: benchmark.category,
        leadName: lead.record.name,
        pageTitle: page.title,
        pageUrl: page.url,
      });
      if (
        result.strictResolutionAccepted &&
        resolvedCandidateSurvivesPrefilter({
          category: benchmark.category,
          leadName: lead.record.name,
          page,
          request,
        })
      ) {
        matches.push(page);
      }
    }
    strictMatchesByLead.set(lead, matches);
  }

  const selectorPotentialIdentityGapSamples = [];
  let selectorPotentialIdentityGapLeadCount = 0;
  for (const lead of qualifiedLeads) {
    const leadWord = firstIdentityWord(lead.record.name);
    const gap = pages.find((page) => {
      if (
        firstIdentityWord(page.title) === leadWord ||
        sharedWordCount(lead.record.name, page.title) < 3
      ) {
        return false;
      }
      const result = analyzeProductPageResolutionCandidate({
        category: benchmark.category,
        leadName: lead.record.name,
        pageTitle: page.title,
        pageUrl: page.url,
      });
      return (
        result.existingSelectorAccepted &&
        result.rejectionReason === "exact_identity_mismatch"
      );
    });
    if (!gap) continue;
    selectorPotentialIdentityGapLeadCount += 1;
    if (selectorPotentialIdentityGapSamples.length < 12) {
      selectorPotentialIdentityGapSamples.push({
        leadName: lead.record.name,
        pageTitle: gap.title,
        pageUrl: gap.url,
      });
    }
  }

  const leaders = benchmark.coreLeaders.map((leader) => {
    const current = currentLeaders.find(
      (row) => row.leader === leaderLabel(leader),
    );
    const leaderQualifiedLeads = qualifiedLeads.filter((row) =>
      matcher(row.record.name, leader),
    );
    const leaderRiskyLeads = riskyLeads.filter((row) =>
      matcher(row.record.name, leader),
    );
    const safePages = leaderQualifiedLeads.flatMap(
      (lead) => strictMatchesByLead.get(lead) || [],
    );
    const uniqueSafePages = Array.from(
      new Map(safePages.map((page) => [page.url, page])).values(),
    );
    const normalizedPoolPresence = current?.preAiPoolPresence === true;
    const qualifiedIdentityLeadPresence = leaderQualifiedLeads.length > 0;
    const capturedAnyStageResolutionPresence = uniqueSafePages.length > 0;
    const capturedDiscoveryResolutionPresence = uniqueSafePages.some(
      (page) => page.discovery,
    );

    return {
      leader: leaderLabel(leader),
      normalizedPoolPresence,
      qualifiedIdentityLeadPresence,
      qualifiedIdentityLeadNames: Array.from(
        new Set(leaderQualifiedLeads.map((row) => row.record.name)),
      ),
      riskyIdentityLeadPresence: leaderRiskyLeads.length > 0,
      riskyIdentityLeadNames: Array.from(
        new Set(leaderRiskyLeads.map((row) => row.record.name)),
      ),
      capturedDiscoveryResolutionPresence,
      capturedAnyStageResolutionPresence,
      capturedSafePageUrls: uniqueSafePages.map((page) => page.url),
      identityLeadUpperBoundPresence:
        normalizedPoolPresence || qualifiedIdentityLeadPresence,
      capturedMaterializedPresence:
        normalizedPoolPresence || capturedAnyStageResolutionPresence,
      requiresNewLookup:
        qualifiedIdentityLeadPresence && !capturedAnyStageResolutionPresence,
    };
  });
  const recall = (field) => ({
    covered: leaders.filter((leader) => leader[field]).length,
    total: benchmark.coreLeaders.length,
  });

  return {
    contract: {
      identityLead:
        "structured provider product ID plus specific source title and existing type gate; never renderable",
      safeResolution:
        "hardened positive product-page identity selector, requested type, product eligibility, and cheap-prefilter survival; exact-model equality remains diagnostic rather than mandatory for safely sparse page titles",
      limitation:
        "saved ledger digests omit full Serper result fields and did not run targeted resolution for discarded identities",
    },
    qualifiedIdentityLeadCount: qualifiedLeads.length,
    qualifiedProviderIdentityCount: new Set(
      qualifiedLeads.map((row) => row.decision.providerIdentity.id),
    ).size,
    riskyIdentityLeadNames: Array.from(
      new Set(riskyLeads.map((row) => row.record.name)),
    ),
    existingTypeGateComplementGapNames: Array.from(new Set(trustGateGapNames)),
    existingSelectorPotentialIdentityGapLeadCount:
      selectorPotentialIdentityGapLeadCount,
    existingSelectorPotentialIdentityGapSamples:
      selectorPotentialIdentityGapSamples,
    recall: {
      currentNormalizedPool: recall("normalizedPoolPresence"),
      identityLeadUpperBound: recall("identityLeadUpperBoundPresence"),
      capturedMaterialized: recall("capturedMaterializedPresence"),
    },
    leaders,
  };
}

export function analyzeReadinessFixture(fixture, path = "<memory>") {
  const request = fixture._request || { query: fixture._query };
  const benchmark = benchmarkForRequest(request);
  const ledger = fixture.debug?.stageFunnel?.searchLedger;

  if (!ledger || !benchmark) {
    throw new Error(`${path}: missing ledger or benchmark`);
  }

  const productDiscoveryQueryIds = new Set(
    ledger.planAssembly
      .filter((query) => query.purpose === "product_discovery")
      .map((query) => query.id),
  );
  const productDiscoveryAttempts = ledger.dispatch.attempts.filter((attempt) =>
    productDiscoveryQueryIds.has(attempt.queryId),
  );
  const finalProducts = [
    ...(fixture.result?.exactMatches || []),
    ...(fixture.result?.nearMatches || []),
  ];
  const exactProducts = fixture.result?.exactMatches || [];
  const analysisInput = {
    benchmark,
    candidateRecords: ledger.candidateLineage.candidates,
    finalProducts,
    productDiscoveryAttempts,
    productDiscoveryQueryIds,
  };
  const historical07b = analyzeWithMatcher({
    ...analysisInput,
    benchmark: historical07bBenchmark(benchmark),
    matcher: coversLeaderHistorical07b,
  });
  const current07c = analyzeWithMatcher({
    ...analysisInput,
    matcher: coversLeader,
    sourceEvidence: true,
  });
  const identityResolution = analyzeIdentityResolution({
    attempts: ledger.dispatch.attempts,
    benchmark,
    candidateRecords: ledger.candidateLineage.candidates,
    currentLeaders: current07c.leaders,
    matcher: coversLeader,
    productDiscoveryQueryIds,
    request,
  });
  const finalNames = finalProducts.map((product) => product.name);
  const aiDisplayed = ledger.candidateLineage.candidates
    .filter(
      (candidate) =>
        candidate.source === "final_openai_research" &&
        candidate.selected &&
        finalNames.some(
          (name) =>
            name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() ===
            candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
        ),
    )
    .map((candidate) => candidate.name);
  const malformedQueries = ledger.dispatch.attempts
    .map((attempt) => attempt.finalOutboundQuery)
    .filter((query) => /site:\*|\b([a-z0-9]+)\s+\1\b/i.test(query));
  const exactHardConstraintFailures = exactProducts
    .filter(
      (product) =>
        (product.requirementCheck?.failed || []).length > 0 ||
        (product.requirementCheck?.unknown || []).length > 0,
    )
    .map((product) => product.name);
  const wrongTypeFinalCards = finalProducts
    .filter((product) =>
      benchmark.wrongTypeTerms.some((term) =>
        normalizedWords(finalProductEvidenceText(product)).includes(
          normalizedWords(term),
        ),
      ),
    )
    .map((product) => product.name);
  const falseAccessoryCollapses = ledger.candidateLineage.candidates
    .filter((candidate) => candidate.identityCollapsedInto)
    .filter((candidate) =>
      !classifyProductTypeMatch({
        allowedCheckText: candidate.name,
        evidenceText: sourceEvidenceText(candidate.name, candidate.productUrl),
        identityText: candidate.name,
        requestedCategory: benchmark.category,
      }).canBeExactMatch,
    )
    .map((candidate) => ({
      name: candidate.name,
      collapsedInto: candidate.identityCollapsedInto,
    }));
  const contract = requestContract(request, fixture._c4Shape);
  const flags = ledger.header.flags || {};
  const attemptGuard = ledger.dispatch.attemptGuard;
  const validityReasons = fixture._c4Shape
    ? [
        ...(fixture._exclusionReasons || []),
        ...(fixture._sampleStatus === "usable" ? [] : ["fixture_not_marked_usable"]),
        ...(contract.valid ? [] : ["request_contract_mismatch"]),
        ...(ledger.header.serperCacheEmptyAtStart ? [] : ["warm_serper_cache"]),
        ...(ledger.header.commitHash ? [] : ["missing_commit_hash"]),
        ...(flags.REVIEW_RADAR_NORMALIZATION_RECOVERY === "on"
          ? []
          : ["normalization_recovery_not_on"]),
        ...(flags.REVIEW_RADAR_CONSTRAINT_ALLOCATION === "on"
          ? []
          : ["constraint_allocation_not_on"]),
        ...(["unset", "off"].includes(flags.REVIEW_RADAR_PINNED_PLANNING)
          ? []
          : ["pinned_planning_not_off"]),
        ...(flags.REVIEW_RADAR_MAX_SERPER_ATTEMPTS === "120"
          ? []
          : ["attempt_ceiling_not_120"]),
        ...(ledger.dispatch.reconciliation.balanced ? [] : ["ledger_unbalanced"]),
        ...(attemptGuard ? [] : ["missing_attempt_guard"]),
        ...(attemptGuard?.maxAttempts === 120 ? [] : ["attempt_guard_not_120"]),
        ...(attemptGuard?.reservedAttempts ===
        ledger.dispatch.reconciliation.physicalAttempts
          ? []
          : ["attempt_guard_reconciliation_mismatch"]),
        ...(attemptGuard?.tripped ? ["attempt_ceiling_tripped"] : []),
      ]
    : [];

  return {
    path,
    request,
    requestContract: contract,
    sampleValidity: {
      usable: validityReasons.length === 0,
      reasons: Array.from(new Set(validityReasons)),
    },
    reconciliation: ledger.dispatch.reconciliation,
    cacheCold: ledger.header.serperCacheEmptyAtStart,
    seedSearchesRun: fixture.debug.seedSearchesRun,
    historical07b,
    current07c,
    sensitivityDelta: {
      preAiPoolCovered:
        current07c.preAiPoolRecall.covered - historical07b.preAiPoolRecall.covered,
      finalCovered:
        current07c.finalRecall.covered - historical07b.finalRecall.covered,
    },
    identityResolution,
    aiDisplayed,
    exactHardConstraintFailures,
    wrongTypeFinalCards,
    duplicateFinalPairs: duplicateFinalPairs(finalProducts),
    falseAccessoryCollapses,
    malformedQueries,
    preAiPoolNames: current07c.preAiPoolNames,
    finalNames,
  };
}

export function aggregateReadinessAnalyses(analyses) {
  const usableAnalyses = analyses.filter(
    (analysis) => analysis.sampleValidity.usable,
  );
  const broad = usableAnalyses.filter((analysis) => !analysis.request.budget);
  const constrained = usableAnalyses.filter((analysis) => analysis.request.budget);
  const frequency = new Map();
  const terminalFrequency = new Map();

  for (const analysis of usableAnalyses) {
    for (const row of analysis.current07c.recordedLeaderResultLossFrequency) {
      increment(frequency, row.reason, row.count);
    }
    for (const leader of analysis.current07c.leaders) {
      increment(terminalFrequency, leader.terminalStage);
    }
  }

  const mean = (values) =>
    values.length === 0
      ? null
      : values.reduce((total, value) => total + value, 0) / values.length;
  const identityLeadUpperBoundMean = mean(
    broad.map(
      (analysis) =>
        analysis.identityResolution.recall.identityLeadUpperBound.covered,
    ),
  );
  const capturedMaterializedMean = mean(
    broad.map(
      (analysis) =>
        analysis.identityResolution.recall.capturedMaterialized.covered,
    ),
  );
  const existingSelectorPotentialIdentityGapLeadCount = broad.reduce(
    (total, analysis) =>
      total +
      analysis.identityResolution.existingSelectorPotentialIdentityGapLeadCount,
    0,
  );
  const existingTypeGateComplementGapCount = broad.reduce(
    (total, analysis) =>
      total +
      analysis.identityResolution.existingTypeGateComplementGapNames.length,
    0,
  );
  const c5Target = 5;
  const c5Verdict =
    existingSelectorPotentialIdentityGapLeadCount > 0
      ? "repair_product_page_identity_before_resolution_probe"
      : existingTypeGateComplementGapCount > 0
        ? "repair_identity_lead_type_gate_before_resolution_probe"
        : identityLeadUpperBoundMean === null ||
            identityLeadUpperBoundMean < c5Target
          ? "no_build_identity_ceiling_below_target"
          : capturedMaterializedMean === null ||
              capturedMaterializedMean < c5Target
            ? "needs_live_resolution_probe"
            : "eligible_for_default_off_implementation";

  return {
    contract: {
      preAiPool:
        "source=serper; product_discovery provenance; normalized; raw-dedupe survivor; cheap-prefilter accepted; candidate_merge still counts as pre-AI presence",
      caveat:
        "candidate_merge can be inflated by URL/name lineage mismatches; this can overstate pre-AI presence but cannot create a false miss",
      counterfactual:
        "flag-off versus flag-on normalization is computed on the same provider result; final recall is absolute flag-on evidence, not a reconstructed flag-off final",
    },
    invalidRequestContracts: analyses
      .filter((analysis) => !analysis.requestContract.valid)
      .map((analysis) => analysis.path),
    invalidSamples: analyses
      .filter((analysis) => !analysis.sampleValidity.usable)
      .map((analysis) => ({
        path: analysis.path,
        reasons: analysis.sampleValidity.reasons,
      })),
    sampleCounts: {
      dispatched: analyses.length,
      usable: usableAnalyses.length,
      broadUsable: broad.length,
      constrainedUsable: constrained.length,
    },
    broadHistorical07bMean: mean(
      broad.map((analysis) => analysis.historical07b.preAiPoolRecall.covered),
    ),
    broadCurrent07cMean: mean(
      broad.map((analysis) => analysis.current07c.preAiPoolRecall.covered),
    ),
    broadFlagOffNormalizedMean: mean(
      broad.map(
        (analysis) =>
          analysis.current07c.normalizationCounterfactual
            .flagOffNormalizedRecall.covered,
      ),
    ),
    broadFlagOnNormalizedMean: mean(
      broad.map(
        (analysis) =>
          analysis.current07c.normalizationCounterfactual
            .flagOnNormalizedRecall.covered,
      ),
    ),
    normalizationCounterfactual: {
      observedRuns: usableAnalyses.filter(
        (analysis) =>
          analysis.current07c.normalizationCounterfactual.observed,
      ).length,
      parityViolations: usableAnalyses.reduce(
        (total, analysis) =>
          total +
          analysis.current07c.normalizationCounterfactual.parityViolations,
        0,
      ),
    },
    safety: {
      wrongTypeFinalCards: usableAnalyses.flatMap(
        (analysis) => analysis.wrongTypeFinalCards,
      ),
      exactHardConstraintFailures: usableAnalyses.flatMap(
        (analysis) => analysis.exactHardConstraintFailures,
      ),
      duplicateFinalPairs: usableAnalyses.flatMap(
        (analysis) => analysis.duplicateFinalPairs,
      ),
      falseAccessoryCollapses: usableAnalyses.flatMap(
        (analysis) => analysis.falseAccessoryCollapses,
      ),
    },
    stability: {
      broadPoolPairwiseJaccard: pairwiseMean(broad, "preAiPoolNames"),
      broadFinalPairwiseJaccard: pairwiseMean(broad, "finalNames"),
      constrainedPoolPairwiseJaccard: pairwiseMean(
        constrained,
        "preAiPoolNames",
      ),
      constrainedFinalPairwiseJaccard: pairwiseMean(constrained, "finalNames"),
    },
    cost: {
      includesSpentExcludedRuns: true,
      physicalAttempts: analyses.reduce(
        (total, analysis) =>
          total + analysis.reconciliation.physicalAttempts,
        0,
      ),
      retries: analyses.reduce(
        (total, analysis) => total + analysis.reconciliation.retries,
        0,
      ),
      fallbacks: analyses.reduce(
        (total, analysis) => total + analysis.reconciliation.fallbacks,
        0,
      ),
    },
    normalizationRecovery: {
      observedRuns: usableAnalyses.filter(
        (analysis) => analysis.current07c.normalizationRecovery.observed,
      ).length,
      historical07bUniqueLeaderRunOpportunities: usableAnalyses.reduce(
        (total, analysis) =>
          total +
          analysis.historical07b.normalizationRecovery.uniqueLeaderRunOpportunities,
        0,
      ),
      current07cUniqueLeaderRunOpportunities: usableAnalyses.reduce(
        (total, analysis) =>
          total +
          analysis.current07c.normalizationRecovery
            .uniqueLeaderRunOpportunities,
        0,
      ),
    },
    canonicalProviderDiscovery: {
      metric: "identityResolution.recall.identityLeadUpperBound",
      contract:
        "structured provider product identity plus requested-type-safe lead title, with normalized survivors added only after the same type gate",
      supersedes:
        "current07c path-supplemented raw presence for provider-discovery recall decisions; current07c remains historical funnel evidence",
      broadMean: identityLeadUpperBoundMean,
    },
    c5Decision: {
      target: c5Target,
      identityLeadUpperBoundMean,
      capturedMaterializedMean,
      existingSelectorPotentialIdentityGapLeadCount,
      existingTypeGateComplementGapCount,
      verdict: c5Verdict,
    },
    recordedLeaderResultLossFrequency: frequencyRows(frequency),
    leaderRunTerminalFrequency: frequencyRows(terminalFrequency),
  };
}

function runCli(paths) {
  if (paths.length === 0) {
    console.error("Usage: node scripts/analyze-readiness-fixtures.mjs <fixture>...");
    process.exitCode = 1;
    return;
  }

  const analyses = paths.map((path) =>
    analyzeReadinessFixture(JSON.parse(readFileSync(path, "utf8")), path),
  );
  console.log(JSON.stringify({
    aggregate: aggregateReadinessAnalyses(analyses),
    runs: analyses,
  }, null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli(process.argv.slice(2));
}

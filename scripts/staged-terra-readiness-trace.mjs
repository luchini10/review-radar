export const STAGED_TERRA_REGISTERED_PRODUCT_TRACE_VERSION =
  "staged-terra-registered-product-trace-v1";

export const STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS = [
  "assetIdentity",
  "relationship",
  "productUrl",
  "hardRequirementFailed",
  "hardRequirementNotVerified",
  "noLossEligible",
];

const REGISTRY_VALUES = new Set(["must_consider", "illustrative"]);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function normalized(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function stagedTerraRegisteredProductMatchesIdentity(identity, product) {
  const brand = normalized(identity?.brand);
  const model = normalized(identity?.model);
  return Boolean(
    product?.brandAliases?.some((alias) => brand === normalized(alias)) &&
      product?.modelAliases?.some((alias) => model === normalized(alias)),
  );
}

export function stagedTerraRegisteredProducts(testCase) {
  const products = [
    ...(testCase?.mustConsiderProducts || []).map((product) => ({
      product,
      registry: "must_consider",
    })),
    ...(testCase?.illustrativeProducts || []).map((product) => ({
      product,
      registry: "illustrative",
    })),
  ];
  const ids = new Set();
  const aliasPairOwner = new Map();
  for (const entry of products) {
    requireCondition(
      REGISTRY_VALUES.has(entry.registry) &&
        typeof entry.product?.id === "string" &&
        entry.product.id.length > 0 &&
        !ids.has(entry.product.id),
      "staged_readiness_registered_product_registry_invalid",
    );
    ids.add(entry.product.id);
    const productPairs = new Set();
    for (const brandAlias of entry.product.brandAliases || []) {
      for (const modelAlias of entry.product.modelAliases || []) {
        const brand = normalized(brandAlias);
        const model = normalized(modelAlias);
        requireCondition(
          brand.length > 0 && model.length > 0,
          "staged_readiness_registered_product_registry_invalid",
        );
        productPairs.add(`${brand}\u0000${model}`);
      }
    }
    requireCondition(
      productPairs.size > 0,
      "staged_readiness_registered_product_registry_invalid",
    );
    for (const pair of productPairs) {
      requireCondition(
        !aliasPairOwner.has(pair),
        "staged_readiness_registered_product_registry_invalid",
      );
      aliasPairOwner.set(pair, entry.product.id);
    }
  }
  return products;
}

function blankFirstLoss() {
  return Object.fromEntries(
    STAGED_TERRA_REGISTERED_PRODUCT_FIRST_LOSS_KEYS.map((key) => [key, 0]),
  );
}

function diagnosticFirstLoss(diagnostic) {
  const projected = {
    asset_identity_unproven: "assetIdentity",
    complete_product_relationship_unproven: "relationship",
    identity_safe_product_url_unavailable: "productUrl",
    hard_requirement_failed: "hardRequirementFailed",
    hard_requirement_not_verified: "hardRequirementNotVerified",
    no_loss_eligible: "noLossEligible",
  }[diagnostic.firstLoss];
  requireCondition(
    Boolean(projected) &&
      (diagnostic.outcome === "eligible"
        ? projected === "noLossEligible"
        : diagnostic.outcome === "close_match"
          ? projected === "hardRequirementNotVerified"
          : diagnostic.outcome === "excluded" &&
            !["noLossEligible", "hardRequirementNotVerified"].includes(
              projected,
            )),
    "staged_readiness_registered_product_first_loss_invalid",
  );
  return projected;
}

function countMatches(candidates, product) {
  return candidates.filter((candidate) =>
    stagedTerraRegisteredProductMatchesIdentity(candidate, product),
  ).length;
}

function validateResearchSnapshot(snapshot) {
  requireCondition(
    snapshot &&
      Array.isArray(snapshot.validatedCandidates) &&
      snapshot.validatedCandidates.length <= 15 &&
      Array.isArray(snapshot.acceptedCandidates) &&
      snapshot.acceptedCandidates.length <= snapshot.validatedCandidates.length,
    "staged_readiness_registered_product_research_snapshot_invalid",
  );
  for (const candidate of [
    ...snapshot.validatedCandidates,
    ...snapshot.acceptedCandidates,
  ]) {
    requireCondition(
      candidate &&
        ["brand", "productName", "model", "productType"].every(
          (key) => typeof candidate[key] === "string" && candidate[key].length > 0,
        ),
      "staged_readiness_registered_product_candidate_invalid",
    );
  }
}

export function createStagedTerraRegisteredProductTraceCollector({ testCase }) {
  const registeredProducts = stagedTerraRegisteredProducts(testCase);
  let researchTrace = null;
  let verificationTrace = null;

  return {
    captureResearch(snapshot) {
      requireCondition(
        researchTrace === null,
        "staged_readiness_registered_product_research_duplicate",
      );
      validateResearchSnapshot(snapshot);
      researchTrace = registeredProducts.map(({ product, registry }) => ({
        id: product.id,
        registry,
        validatedResearchCandidates: countMatches(
          snapshot.validatedCandidates,
          product,
        ),
        acceptedResearchCandidates: countMatches(
          snapshot.acceptedCandidates,
          product,
        ),
      }));
    },

    captureVerification({ researchOutput, verifierResult }) {
      requireCondition(
        researchTrace !== null && verificationTrace === null,
        "staged_readiness_registered_product_verification_sequence_invalid",
      );
      const candidates = researchOutput?.candidates;
      const diagnostics = verifierResult?.diagnostics?.candidates;
      requireCondition(
        Array.isArray(candidates) &&
          candidates.length <= 15 &&
          Array.isArray(diagnostics) &&
          diagnostics.length === candidates.length,
        "staged_readiness_registered_product_verification_snapshot_invalid",
      );
      const diagnosticByCandidate = new Map();
      for (const diagnostic of diagnostics) {
        requireCondition(
          typeof diagnostic?.candidateId === "string" &&
            !diagnosticByCandidate.has(diagnostic.candidateId),
          "staged_readiness_registered_product_diagnostic_identity_invalid",
        );
        diagnosticByCandidate.set(diagnostic.candidateId, diagnostic);
      }
      verificationTrace = registeredProducts.map(({ product }) => {
        const counts = {
          eligible: 0,
          closeMatch: 0,
          excluded: 0,
          firstLoss: blankFirstLoss(),
        };
        for (const candidate of candidates) {
          if (!stagedTerraRegisteredProductMatchesIdentity(candidate, product)) {
            continue;
          }
          const diagnostic = diagnosticByCandidate.get(candidate.candidateId);
          requireCondition(
            Boolean(diagnostic),
            "staged_readiness_registered_product_diagnostic_missing",
          );
          if (diagnostic.outcome === "eligible") counts.eligible += 1;
          else if (diagnostic.outcome === "close_match") counts.closeMatch += 1;
          else if (diagnostic.outcome === "excluded") counts.excluded += 1;
          else {
            throw new Error(
              "staged_readiness_registered_product_verification_outcome_invalid",
            );
          }
          counts.firstLoss[diagnosticFirstLoss(diagnostic)] += 1;
        }
        return counts;
      });
    },

    snapshot() {
      if (researchTrace === null) return null;
      return {
        schemaVersion: STAGED_TERRA_REGISTERED_PRODUCT_TRACE_VERSION,
        products: researchTrace.map((research, index) => ({
          ...research,
          verification:
            verificationTrace === null
              ? null
              : structuredClone(verificationTrace[index]),
        })),
      };
    },
  };
}

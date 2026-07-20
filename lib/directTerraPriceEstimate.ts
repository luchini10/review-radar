import { normalizeTwoLayerSourceUrl } from "./twoLayerSourceUrl.ts";

export type DirectTerraPriceEstimate = {
  rank: number;
  brand: string;
  model: string;
  currency: "USD";
  low: number;
  high: number;
  median: number;
  sourceCount: number;
};

type PriceEstimateResult = {
  estimates: DirectTerraPriceEstimate[];
  rejectedObservationCount: number;
};

type AcceptedObservation = {
  amount: number;
  host: string;
};

const MAX_PRICE_AMOUNT = 10_000_000;
const MAX_PRICE_SPREAD_RATIO = 3;
const MAX_PRODUCT_GROUPS = 5;
const MAX_OBSERVATIONS_PER_PRODUCT = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: string[]) {
  return (
    JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...expected].sort())
  );
}

function canonicalUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    return normalizeTwoLayerSourceUrl(value);
  } catch {
    return null;
  }
}

function sourceHost(value: string) {
  return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
}

function identityText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function rankedHeadings(reportMarkdown: string) {
  const headings = new Map<number, string>();
  for (const line of reportMarkdown.split(/\r?\n/)) {
    const match = line.match(/^#{2,3}\s+#?(\d+)\s+Best Match\b(.*)$/i);
    if (!match) continue;
    const rank = Number(match[1]);
    if (Number.isInteger(rank) && rank >= 1 && rank <= 5) {
      headings.set(rank, identityText(match[2]));
    }
  }
  return headings;
}

function headingMatchesIdentity(
  heading: string | undefined,
  brand: string,
  model: string,
) {
  if (!heading) return false;
  const normalizedBrand = identityText(brand);
  const normalizedModel = identityText(model);
  if (!normalizedBrand || !normalizedModel) return false;
  const paddedHeading = ` ${heading} `;
  return (
    paddedHeading.includes(` ${normalizedBrand} `) &&
    paddedHeading.includes(` ${normalizedModel} `)
  );
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function median(values: number[]) {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 1
    ? values[middle]
    : roundCurrency((values[middle - 1] + values[middle]) / 2);
}

function acceptedObservation(
  value: unknown,
  registeredSources: ReadonlySet<string>,
): AcceptedObservation | null {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "seller",
      "price_amount",
      "currency",
      "condition",
      "offer_type",
      "source_url",
    ]) ||
    typeof value.seller !== "string" ||
    value.seller.trim().length === 0 ||
    value.seller.length > 200 ||
    typeof value.price_amount !== "number" ||
    !Number.isFinite(value.price_amount) ||
    value.price_amount <= 0 ||
    value.price_amount > MAX_PRICE_AMOUNT ||
    value.currency !== "USD" ||
    value.condition !== "new" ||
    value.offer_type !== "standalone_product"
  ) {
    return null;
  }
  const url = canonicalUrl(value.source_url);
  if (!url || !registeredSources.has(url)) return null;
  return { amount: roundCurrency(value.price_amount), host: sourceHost(url) };
}

export function calculateDirectTerraPriceEstimates({
  reportMarkdown,
  priceObservations,
  responseSourceUrls,
}: {
  reportMarkdown: string;
  priceObservations: unknown;
  responseSourceUrls: readonly string[];
}): PriceEstimateResult {
  const registeredSources = new Set(
    responseSourceUrls
      .map(canonicalUrl)
      .filter((url): url is string => Boolean(url)),
  );
  const headings = rankedHeadings(reportMarkdown);
  const estimates: DirectTerraPriceEstimate[] = [];
  let rejectedObservationCount = 0;
  const seenRanks = new Set<number>();

  if (!Array.isArray(priceObservations)) {
    return { estimates, rejectedObservationCount: 0 };
  }
  if (priceObservations.length > MAX_PRODUCT_GROUPS) {
    return {
      estimates,
      rejectedObservationCount: priceObservations.reduce(
        (count, value) =>
          count +
          (isRecord(value) && Array.isArray(value.observations)
            ? value.observations.length
            : 1),
        0,
      ),
    };
  }

  for (const product of priceObservations) {
    const observationCount =
      isRecord(product) && Array.isArray(product.observations)
        ? product.observations.length
        : 1;
    if (
      !isRecord(product) ||
      !exactKeys(product, ["rank", "brand", "model", "observations"]) ||
      !Number.isInteger(product.rank) ||
      (product.rank as number) < 1 ||
      (product.rank as number) > 5 ||
      seenRanks.has(product.rank as number) ||
      typeof product.brand !== "string" ||
      product.brand.trim().length === 0 ||
      product.brand.length > 120 ||
      typeof product.model !== "string" ||
      product.model.trim().length === 0 ||
      product.model.length > 200 ||
      !Array.isArray(product.observations) ||
      product.observations.length > MAX_OBSERVATIONS_PER_PRODUCT ||
      !headingMatchesIdentity(
        headings.get(product.rank as number),
        product.brand,
        product.model,
      )
    ) {
      rejectedObservationCount += observationCount;
      continue;
    }

    const rank = product.rank as number;
    seenRanks.add(rank);
    const byHost = new Map<string, AcceptedObservation>();
    for (const rawObservation of product.observations) {
      const observation = acceptedObservation(rawObservation, registeredSources);
      if (!observation || byHost.has(observation.host)) {
        rejectedObservationCount += 1;
        continue;
      }
      byHost.set(observation.host, observation);
    }
    const accepted = [...byHost.values()];
    if (accepted.length < 2) continue;
    const amounts = accepted.map(({ amount }) => amount).sort((a, b) => a - b);
    if (amounts[amounts.length - 1] / amounts[0] > MAX_PRICE_SPREAD_RATIO) {
      rejectedObservationCount += amounts.length;
      continue;
    }
    estimates.push({
      rank,
      brand: product.brand.trim(),
      model: product.model.trim(),
      currency: "USD",
      low: amounts[0],
      high: amounts[amounts.length - 1],
      median: median(amounts),
      sourceCount: amounts.length,
    });
  }

  return {
    estimates: estimates.sort((a, b) => a.rank - b.rank),
    rejectedObservationCount,
  };
}

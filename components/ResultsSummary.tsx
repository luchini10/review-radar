import type { ProductRecommendation, RecommendationResult } from "@/types/review-radar";
import {
  ClipboardCheck,
  SearchCheck,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  dealbreakerStrengths,
  filterResultByDealbreakerStrength,
  type DealbreakerStrength,
} from "@/lib/dealbreakerVisibility";
import { classifyNearMatch } from "@/lib/nearMatchClassification";
import { ProductCard } from "./ProductCard";
import { SearchProgressPanel } from "./SearchProgressPanel";
import { VerdictCard } from "./VerdictCard";

type ResultsSummaryProps = {
  dealbreakerStrength: DealbreakerStrength;
  hasSearched: boolean;
  isLoading: boolean;
  onDealbreakerStrengthChange: (strength: DealbreakerStrength) => void;
  progressId?: string | null;
  result: RecommendationResult | null;
};

const dealbreakerStrengthCopy: Record<
  DealbreakerStrength,
  {
    description: string;
    label: string;
  }
> = {
  balanced: {
    description:
      "Shows the ranked exact matches plus close options that only need verification when fewer than 7 exact matches are available.",
    label: "Balanced",
  },
  flexible: {
    description:
      "Shows the ranked exact matches plus every close option when fewer than 7 exact matches are available.",
    label: "Flexible",
  },
  strict: {
    description: "Shows exact matches only.",
    label: "Strict",
  },
};

function getSortedBestMatches(products: ProductRecommendation[]) {
  return [...products].sort((first, second) => {
    const rankDelta = (first.rank || 999) - (second.rank || 999);

    if (rankDelta !== 0) {
      return rankDelta;
    }

    return (second.matchScore || 0) - (first.matchScore || 0);
  });
}

function DetailList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-slate-500">None listed.</p>;
  }

  return (
    <ul className="grid gap-2 text-sm leading-6 text-slate-600">
      {items.map((item) => (
        <li className="flex gap-2" key={item}>
          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function getCommonMissedRequirements(result: RecommendationResult) {
  const counts = new Map<string, number>();

  for (const product of result.nearMatches) {
    for (const comparison of product.requirementComparisons || []) {
      if (comparison.status === "matched" || comparison.status === "not_applicable") {
        continue;
      }

      counts.set(comparison.required, (counts.get(comparison.required) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((first, second) => second[1] - first[1])
    .map(([requirement]) => requirement)
    .slice(0, 3);
}

function getNearMatchGroup(product: ProductRecommendation) {
  const classification = classifyNearMatch(product);

  return {
    description: `These options look relevant, but ${classification.description}.`,
    title:
      classification.label === "Close Match"
        ? "Close Matches"
        : classification.label,
  };
}

function groupNearMatches(products: ProductRecommendation[]) {
  const groups = new Map<
    string,
    {
      description: string;
      products: ProductRecommendation[];
      title: string;
    }
  >();

  for (const product of products) {
    const group = getNearMatchGroup(product);
    const existing = groups.get(group.title);

    if (existing) {
      existing.products.push(product);
      continue;
    }

    groups.set(group.title, {
      ...group,
      products: [product],
    });
  }

  return Array.from(groups.values());
}

function SearchCoverageSummary({ result }: { result: RecommendationResult }) {
  if (!result.searchCoverage) {
    return null;
  }

  const coverage = result.searchCoverage;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-signal text-ink">
        <SearchCheck aria-hidden="true" className="h-4.5 w-4.5" />
      </span>
      <div className="text-sm leading-6 text-slate-600">
        <p className="font-semibold text-slate-950">Search coverage</p>
        <p className="mt-0.5">
          Checked {coverage.executedQueryCount} source{" "}
          {coverage.executedQueryCount === 1 ? "search" : "searches"} and
          evaluated {coverage.rawCandidateCount} product candidates. Grouped them
          into {coverage.canonicalProductCount} products, then found{" "}
          {coverage.exactMatchCount} exact and {coverage.nearMatchCount} near{" "}
          {coverage.nearMatchCount === 1 ? "match" : "matches"}.
        </p>
        {coverage.generatedQueryCount > coverage.executedQueryCount ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            ReviewRadar also prepared backup searches and only uses more when
            extra coverage is needed.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function hiddenCountText(count: number, strength: DealbreakerStrength) {
  const label = dealbreakerStrengthCopy[strength].label;

  return `${count} ${count === 1 ? "product is" : "products are"} hidden by ${label} mode.`;
}

function DealbreakerStrengthControl({
  hiddenCount,
  onChange,
  strength,
}: {
  hiddenCount: number;
  onChange: (strength: DealbreakerStrength) => void;
  strength: DealbreakerStrength;
}) {
  const selectedIndex = dealbreakerStrengths.indexOf(strength);

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <SlidersHorizontal aria-hidden="true" className="h-4.5 w-4.5" />
          </span>
          <div>
            <label
              className="text-sm font-semibold text-slate-950"
              htmlFor="dealbreaker-strength"
            >
              Dealbreaker strength
            </label>
            <p className="mt-0.5 text-sm leading-6 text-slate-600">
              {dealbreakerStrengthCopy[strength].description}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              This only changes what is visible here. It does not rerun or change
              the search.
            </p>
          </div>
        </div>
        {hiddenCount > 0 ? (
          <Badge
            className="w-fit rounded-md border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600"
            variant="outline"
          >
            {hiddenCountText(hiddenCount, strength)}
          </Badge>
        ) : null}
      </div>
      <div className="mt-4">
        <input
          aria-label="Dealbreaker strength"
          className="h-2 w-full accent-slate-950"
          id="dealbreaker-strength"
          max={dealbreakerStrengths.length - 1}
          min={0}
          onChange={(event) =>
            onChange(
              dealbreakerStrengths[Number(event.currentTarget.value)] ||
                "balanced",
            )
          }
          step={1}
          type="range"
          value={selectedIndex}
        />
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-500">
          {dealbreakerStrengths.map((item) => (
            <span
              className={[
                item === "balanced" ? "text-center" : "",
                item === "flexible" ? "text-right" : "",
                item === strength ? "text-slate-950" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={item}
            >
              {dealbreakerStrengthCopy[item].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeletonCards() {
  return (
    <div className="mt-5 grid gap-4" data-testid="results-loading-skeletons">
      {[0, 1, 2].map((item) => (
        <Card
          className="overflow-hidden rounded-[2rem] border-ink/10 bg-paper py-0 shadow-[0_16px_45px_rgba(12,27,22,0.06)]"
          key={item}
        >
          <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[250px_minmax(0,1fr)]">
            <Skeleton className="aspect-[4/3] h-auto w-full rounded-xl" />
            <div className="grid content-start gap-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-6 w-32 rounded-md" />
              </div>
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ResultsSummary({
  dealbreakerStrength,
  hasSearched,
  isLoading,
  onDealbreakerStrengthChange,
  progressId = null,
  result,
}: ResultsSummaryProps) {
  const visibleSections = result
    ? filterResultByDealbreakerStrength(result, dealbreakerStrength)
    : null;
  const exactMatches = visibleSections
    ? getSortedBestMatches(visibleSections.exactMatches)
    : [];
  const nearMatches = visibleSections?.nearMatches || [];
  const nearMatchGroups = groupNearMatches(nearMatches);
  const commonMissedRequirements = result
    ? getCommonMissedRequirements({ ...result, nearMatches })
    : [];

  return (
    <div aria-busy={isLoading}>
      <div className="flex items-end justify-between gap-4 rounded-[2rem] bg-ink px-6 py-7 text-white shadow-[0_22px_60px_rgba(12,27,22,0.16)] sm:px-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-signal">
            Your decision brief
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Top Best Matches
          </h2>
        </div>
        <Badge
          className="hidden rounded-full border-white/12 bg-white/10 px-3 py-1 text-sm font-medium text-signal sm:inline-flex"
          variant="outline"
        >
          Evidence backed
        </Badge>
      </div>

      <SearchProgressPanel
        active={isLoading}
        key={progressId ?? "no-progress"}
        progressId={progressId}
      />

      {isLoading ? <LoadingSkeletonCards /> : null}

      {!isLoading && hasSearched && result ? (
        <div className="mt-6 grid gap-5">
          <SearchCoverageSummary result={result} />
          <DealbreakerStrengthControl
            hiddenCount={visibleSections?.hiddenCounts.total || 0}
            onChange={onDealbreakerStrengthChange}
            strength={dealbreakerStrength}
          />

          {exactMatches.length > 0 ? (
            <div className="grid gap-5">
              <div className="flex items-start gap-3 rounded-2xl border border-forest/12 bg-[#edf3e7] p-4">
                <ClipboardCheck
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-forest"
                />
                <p className="text-sm font-medium leading-6 text-ink/75">
                  {exactMatches.length >= 5
                    ? `Showing the top ${exactMatches.length} Best Matches that met every verified hard requirement.`
                    : `Showing ${exactMatches.length} exact ${
                        exactMatches.length === 1 ? "match" : "matches"
                      } that met every verified hard requirement. Close matches only appear separately because fewer than 7 exact matches were available.`}
                </p>
              </div>

              {exactMatches.map((recommendation) => (
                <ProductCard
                  key={`${recommendation.rankLabel || "best-match"}-${recommendation.name}`}
                  product={recommendation}
                />
              ))}
            </div>
          ) : (
            <Alert className="rounded-xl border-amber-200 bg-amber-50 text-amber-900">
              <TriangleAlert
                aria-hidden="true"
                className="h-5 w-5 text-amber-600"
              />
              <AlertTitle>No exact matches found</AlertTitle>
              <AlertDescription className="leading-6 text-amber-900">
                <p>
                  No exact matches found for these requirements. Try removing
                  one requirement or increasing the budget.
                </p>
                {commonMissedRequirements.length > 0 ? (
                  <div className="mt-3">
                    <p className="font-semibold">Most restrictive filters:</p>
                    <DetailList items={commonMissedRequirements} />
                  </div>
                ) : null}
              </AlertDescription>
            </Alert>
          )}

          {nearMatches.length > 0 ? (
            <section className="grid gap-5 rounded-[2rem] border border-ink/10 bg-mist/45 p-4 sm:p-6">
              <div>
                <Badge
                  className="rounded-md border-slate-300 bg-white text-slate-800"
                  variant="outline"
                >
                  Near Matches
                </Badge>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {exactMatches.length === 0
                    ? "No exact matches found. These useful alternatives are grouped by what still needs checking."
                    : "Useful alternatives are grouped below because they do something well, but miss or cannot verify at least one required detail."}
                </p>
              </div>
              {nearMatchGroups.map((group) => (
                <section className="grid gap-4" key={group.title}>
                  <div className="border-l-2 border-slate-300 pl-3">
                    <h3 className="text-sm font-semibold text-slate-950">
                      {group.title}
                    </h3>
                    <p className="mt-0.5 text-sm leading-6 text-slate-600">
                      {group.description}
                    </p>
                  </div>
                  <div className="grid gap-5">
                    {group.products.map((recommendation) => (
                      <ProductCard
                        key={`near-${recommendation.name}`}
                        displayMode="nearMatch"
                        product={recommendation}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </section>
          ) : null}

          {exactMatches.length > 0 && result.what_to_avoid.length > 0 ? (
            <div className="rounded-xl border border-red-100 bg-red-50/80 p-5 text-red-900">
              <div className="flex items-center gap-2">
                <TriangleAlert
                  aria-hidden="true"
                  className="h-5 w-5 text-red-600"
                />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                  What to avoid
                </p>
              </div>
              <div className="mt-3">
                <DetailList items={result.what_to_avoid} />
              </div>
            </div>
          ) : null}

          <VerdictCard
            title="Final buying advice"
            verdict={result.final_buying_advice}
          />
        </div>
      ) : null}

      {!isLoading && hasSearched && !result ? (
        <Alert className="mt-6 rounded-xl border-slate-200 bg-white text-slate-700">
          <ClipboardCheck
            aria-hidden="true"
            className="h-5 w-5 text-blue-700"
          />
          <AlertTitle>No recommendations are ready yet</AlertTitle>
          <AlertDescription className="text-slate-600">
            Enter a product category and run a research request.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

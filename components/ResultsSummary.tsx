import type { RecommendationResult } from "@/types/review-radar";
import { ClipboardCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { VerdictCard } from "./VerdictCard";

type ResultsSummaryProps = {
  hasSearched: boolean;
  isLoading: boolean;
  result: RecommendationResult | null;
};

const recommendationOrder = [
  "Best Overall",
  "Best Budget",
  "Best Value",
  "Best Premium",
  "Best Alternative",
  "Honorable Mention",
] as const;

function getRecommendationRank(recommendationType: string) {
  const index = recommendationOrder.findIndex((type) => type === recommendationType);
  return index === -1 ? recommendationOrder.length : index;
}

function getSortedRecommendations(result: RecommendationResult) {
  return [...result.recommendations].sort(
    (first, second) =>
      getRecommendationRank(first.recommendation_type) -
      getRecommendationRank(second.recommendation_type),
  );
}

function getPrimaryRecommendations(result: RecommendationResult) {
  return getSortedRecommendations(result).filter(
    (recommendation) =>
      recommendation.recommendation_type !== "Honorable Mention",
  );
}

function getHonorableMentions(result: RecommendationResult) {
  return getSortedRecommendations(result).filter(
    (recommendation) =>
      recommendation.recommendation_type === "Honorable Mention",
  );
}

function DetailList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-slate-500">None listed.</p>;
  }

  return (
    <ul className="grid gap-2 text-sm leading-6 text-slate-600">
      {items.map((item) => (
        <li className="flex gap-2" key={item}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ResultsSummary({
  hasSearched,
  isLoading,
  result,
}: ResultsSummaryProps) {
  const primaryRecommendations = result
    ? getPrimaryRecommendations(result)
    : [];
  const honorableMentions = result ? getHonorableMentions(result) : [];

  return (
    <aside
      aria-live="polite"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            Results
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Buying verdict
          </h2>
        </div>
        <span className="hidden rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 sm:inline-flex">
          Evidence backed
        </span>
      </div>

      {isLoading ? (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <LoaderCircle
            aria-hidden="true"
            className="mt-1 h-5 w-5 shrink-0 animate-spin text-blue-600"
          />
          <span>
            Researching current public sources. This can take a little while.
          </span>
        </div>
      ) : null}

      {!isLoading && hasSearched && result ? (
        <div className="mt-6 grid gap-5">
          {result.recommendations.length > 0 ? (
            <div className="grid gap-5">
              {primaryRecommendations.map((recommendation) => (
                <ProductCard
                  key={`${recommendation.recommendation_type}-${recommendation.name}`}
                  product={recommendation}
                />
              ))}

              {honorableMentions.length > 0 ? (
                <section className="grid gap-4 pt-2">
                  <p className="text-sm font-medium uppercase tracking-[0.14em] text-cyan-300">
                    Honorable mentions
                  </p>
                  <div className="grid gap-5">
                    {honorableMentions.map((recommendation) => (
                      <ProductCard
                        key={`${recommendation.recommendation_type}-${recommendation.name}`}
                        product={recommendation}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <TriangleAlert
                aria-hidden="true"
                className="mt-1 h-5 w-5 shrink-0 text-amber-600"
              />
              No product recommendations were returned because the evidence was
              limited or the result did not include validated citations.
            </div>
          )}

          {result.what_to_avoid.length > 0 ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-5">
              <div className="flex items-center gap-2">
                <TriangleAlert
                  aria-hidden="true"
                  className="h-5 w-5 text-red-600"
                />
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-red-700">
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
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          No recommendations yet. Enter a product category and run a research
          request.
        </div>
      ) : null}

      {!isLoading && !hasSearched ? (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <ClipboardCheck
            aria-hidden="true"
            className="mt-1 h-5 w-5 shrink-0 text-blue-600"
          />
          <span>Empty results. Enter a product category to prepare a search.</span>
        </div>
      ) : null}
    </aside>
  );
}

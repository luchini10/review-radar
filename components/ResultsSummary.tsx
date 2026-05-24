import type { RecommendationResult } from "@/types/review-radar";
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
    return <p className="text-sm leading-6 text-slate-400">None listed.</p>;
  }

  return (
    <ul className="grid gap-2 text-sm leading-6 text-slate-300">
      {items.map((item) => (
        <li className="flex gap-2" key={item}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
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
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">
        Results
      </p>

      {isLoading ? (
        <div className="mt-6 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
          Researching current public sources. This can take a little while.
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
            <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
              No product recommendations were returned because the evidence was
              limited or the result did not include validated citations.
            </div>
          )}

          {result.what_to_avoid.length > 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-cyan-300">
                What to avoid
              </p>
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
        <div className="mt-6 rounded-xl border border-slate-500/30 bg-slate-900 p-4 text-sm leading-6 text-slate-300">
          No recommendations yet. Enter a product category and run a research
          request.
        </div>
      ) : null}

      {!isLoading && !hasSearched ? (
        <div className="mt-6 rounded-xl border border-slate-500/30 bg-slate-900 p-4 text-sm leading-6 text-slate-300">
          Empty results. Enter a product category to prepare a search.
        </div>
      ) : null}
    </aside>
  );
}

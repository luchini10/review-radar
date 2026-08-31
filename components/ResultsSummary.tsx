import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { SelectionRecommendationResult } from "@/types/review-radar";

function LoadingCards() {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          className="overflow-hidden rounded-[1.75rem] border border-ink/10 bg-paper"
          key={index}
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none bg-ink/8" />
          <div className="grid gap-3 p-6">
            <Skeleton className="h-3 w-24 bg-ink/8" />
            <Skeleton className="h-7 w-full bg-ink/8" />
            <Skeleton className="h-5 w-32 bg-ink/8" />
            <Skeleton className="mt-3 h-12 w-full rounded-full bg-ink/8" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResultsSummary({
  hasSearched,
  isLoading,
  result,
}: {
  hasSearched: boolean;
  isLoading: boolean;
  result: SelectionRecommendationResult | null;
}) {
  if (!isLoading && !hasSearched) return null;

  return (
    <section aria-busy={isLoading} aria-live="polite">
      <div className="rounded-[2rem] bg-ink px-6 py-7 text-white shadow-[0_22px_60px_rgba(12,27,22,0.16)] sm:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-signal">
          Your shortlist
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
          Top product matches
        </h2>
      </div>

      {isLoading ? <LoadingCards /> : null}

      {!isLoading && result?.recommendations.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {result.recommendations.map((product) => (
            <ProductCard
              key={`${product.name}|${product.productPageUrl}`}
              product={product}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && hasSearched && result?.recommendations.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-ink/10 bg-paper p-6 text-center sm:p-8">
          <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
            No confident matches found
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink/65">
            Try broadening one requirement or increasing the budget. ReviewRadar
            will not fill the shortlist with products it cannot confidently match.
          </p>
        </div>
      ) : null}
    </section>
  );
}

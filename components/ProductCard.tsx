"use client";

import { useState } from "react";
import type { ProductRecommendation } from "@/types/review-radar";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SourceList } from "./SourceList";
import { VerdictCard } from "./VerdictCard";

type ProductCardProps = {
  product: ProductRecommendation;
};

const recommendationDescriptions: Record<string, string> = {
  "Best Overall": "The strongest all-around recommendation.",
  "Best Budget": "The cheapest option that is still worth buying.",
  "Best Value":
    "The best balance of price, quality, features, and reliability.",
  "Best Premium": "The higher-end option for people willing to spend more.",
  "Best Alternative":
    "A solid backup pick if the top choice is unavailable, too expensive, or not quite the right fit.",
  "Honorable Mention": "Worth considering, but not stronger than the main picks.",
};

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

function ProductImage({ name, src }: { name: string; src: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center p-5 text-center text-sm leading-6 text-slate-400">
        Product image unavailable
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={name}
      className="aspect-[4/3] h-full w-full object-contain p-4"
      onError={() => setFailed(true)}
      src={src}
    />
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const typeDescription =
    recommendationDescriptions[product.recommendation_type] ||
    "Evidence-backed recommendation.";

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
          <ProductImage name={product.name} src={product.product_image_url} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-cyan-300">
                {product.recommendation_type}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {typeDescription}
              </p>
              <h2 className="mt-3 break-words text-2xl font-semibold text-white">
                {product.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{product.category}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {product.why_recommended}
              </p>
              {product.product_page_url ? (
                <a
                  className="mt-4 inline-flex rounded-md border border-cyan-300/30 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200 hover:text-white"
                  href={product.product_page_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  View product page
                </a>
              ) : null}
            </div>
            <ConfidenceBadge score={product.confidence_score} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <VerdictCard
          title="Estimated price range"
          verdict={product.estimated_price_range}
        />
        <VerdictCard
          title="Source consensus"
          verdict={product.source_consensus}
        />
        <VerdictCard
          title="Price/value verdict"
          verdict={product.price_value_verdict}
        />
        <VerdictCard title="Best for" verdict={product.best_for} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="mb-3 text-sm font-medium text-slate-100">Pros</p>
          <DetailList items={product.pros} />
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="mb-3 text-sm font-medium text-slate-100">Cons</p>
          <DetailList items={product.cons} />
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="mb-3 text-sm font-medium text-slate-100">
            Common complaints
          </p>
          <DetailList items={product.common_complaints} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="mb-3 text-sm font-medium text-slate-100">Not for</p>
          <DetailList items={product.not_for} />
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-cyan-300">
            Citations
          </p>
          <div className="mt-3">
            <SourceList sources={product.citations} />
          </div>
        </div>
      </div>
    </article>
  );
}

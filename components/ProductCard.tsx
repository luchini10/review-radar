"use client";

import { useState } from "react";
import {
  BadgeCheck,
  CircleDollarSign,
  ExternalLink,
  Gem,
  ImageOff,
  RefreshCw,
  Scale,
  Trophy,
} from "lucide-react";
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

const recommendationIcons = {
  "Best Alternative": RefreshCw,
  "Best Budget": CircleDollarSign,
  "Best Overall": Trophy,
  "Best Premium": Gem,
  "Best Value": Scale,
  "Honorable Mention": BadgeCheck,
};

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

function ProductImage({ name, src }: { name: string; src: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center p-5 text-center text-sm leading-6 text-slate-500">
        <span className="grid justify-items-center gap-2">
          <ImageOff aria-hidden="true" className="h-6 w-6 text-slate-400" />
          Product image unavailable
        </span>
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
  const RecommendationIcon =
    recommendationIcons[product.recommendation_type] || BadgeCheck;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <ProductImage name={product.name} src={product.product_image_url} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                  <RecommendationIcon aria-hidden="true" className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">
                  {product.recommendation_type}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {typeDescription}
              </p>
              <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-950">
                {product.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{product.category}</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {product.why_recommended}
              </p>
              {product.product_page_url ? (
                <a
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
                  href={product.product_page_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  View product page
                </a>
              ) : null}
            </div>
            <ConfidenceBadge score={product.confidence_score} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
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

      <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 md:grid-cols-3">
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-950">Pros</p>
          <DetailList items={product.pros} />
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-950">Cons</p>
          <DetailList items={product.cons} />
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-950">
            Common complaints
          </p>
          <DetailList items={product.common_complaints} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 md:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-950">Not for</p>
          <DetailList items={product.not_for} />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">
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

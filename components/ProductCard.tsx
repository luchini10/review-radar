"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Check,
  ExternalLink,
  ImageOff,
  Minus,
  Star,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildProductRecommendationCardData,
  type ProductCardDisplayMode,
  type ProductCardTone,
  type ProductRecommendationCardData,
} from "@/lib/productCardViewModel";
import type { ReactNode } from "react";
import type { ProductRecommendation } from "@/types/review-radar";

export type { ProductCardDisplayMode };

type ProductCardProps = {
  displayMode?: ProductCardDisplayMode;
  product: ProductRecommendation;
};

type DetailMarker = "dot" | "pro" | "con";

function ProductImage({
  image,
}: {
  image: ProductRecommendationCardData["image"];
}) {
  const [failed, setFailed] = useState(false);

  if (!image.src || failed) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-mist/50 p-5 text-center text-sm leading-6 text-ink/65">
        <span className="grid justify-items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-paper shadow-sm ring-1 ring-ink/10">
            <ImageOff aria-hidden="true" className="h-5 w-5 text-slate-400" />
          </span>
          Product image unavailable
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={image.alt}
      className="aspect-[4/3] h-full w-full object-contain p-4"
      onError={() => setFailed(true)}
      src={image.src}
    />
  );
}

function detailIcon(marker: DetailMarker) {
  if (marker === "pro") {
    return (
      <Check
        aria-hidden="true"
        className="mt-1 h-4 w-4 shrink-0 text-emerald-600"
      />
    );
  }

  if (marker === "con") {
    return (
      <Minus
        aria-hidden="true"
        className="mt-1 h-4 w-4 shrink-0 text-rose-500"
      />
    );
  }

  return <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />;
}

function DetailList({
  items,
  marker = "dot",
}: {
  items: string[];
  marker?: DetailMarker;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="grid gap-2 text-sm leading-6 text-slate-600">
      {items.map((item) => (
        <li className="flex gap-2" key={item}>
          {detailIcon(marker)}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-ink/10 pt-6">
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function signalToneClass(tone: ProductCardTone) {
  if (tone === "positive") {
    return "border-emerald-100 bg-emerald-50/60 text-emerald-950";
  }

  if (tone === "warning") {
    return "border-amber-100 bg-amber-50/70 text-amber-950";
  }

  return "border-slate-200/80 bg-slate-50/70 text-slate-800";
}

function QuickDecisionSignals({
  signals,
}: {
  signals: ProductRecommendationCardData["quickSignals"];
}) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {signals.map((signal) => (
        <div
          className={[
            "rounded-2xl border p-3.5",
            signalToneClass(signal.tone),
          ].join(" ")}
          key={`${signal.label}-${signal.value}`}
        >
          <p className="text-xs font-semibold opacity-70">
            {signal.label}
          </p>
          <p className="mt-1 text-sm font-medium leading-6">{signal.value}</p>
        </div>
      ))}
    </div>
  );
}

function RecommendationReasons({
  reasons,
}: {
  reasons: ProductRecommendationCardData["recommendationReasons"];
}) {
  if (reasons.length === 0) {
    return null;
  }

  return (
    <Section title="Why we recommend it">
      <DetailList items={reasons} marker="pro" />
    </Section>
  );
}

function OwnerOpinionBlock({
  ownerOpinion,
}: {
  ownerOpinion: ProductRecommendationCardData["ownerOpinion"];
}) {
  if (!ownerOpinion) {
    return null;
  }

  return (
    <Section title="Owner opinion">
      <div
        className={[
          "rounded-xl border p-4",
          signalToneClass(ownerOpinion.tone),
        ].join(" ")}
      >
        <p className="text-sm font-semibold">
          Reddit signal: {ownerOpinion.label}
        </p>
        <p className="mt-2 text-sm leading-6">{ownerOpinion.summary}</p>
        {ownerOpinion.praises.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold opacity-70">
              Common praise
            </p>
            <DetailList items={ownerOpinion.praises} marker="pro" />
          </div>
        ) : null}
        {ownerOpinion.concerns.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold opacity-70">
              Common concerns
            </p>
            <DetailList items={ownerOpinion.concerns} marker="con" />
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function ProsConsGrid({
  complaints,
  cons,
  pros,
}: {
  complaints: string[];
  cons: string[];
  pros: string[];
}) {
  if (pros.length === 0 && cons.length === 0 && complaints.length === 0) {
    return null;
  }

  return (
    <Section title="Pros and cons">
      <div className="grid gap-5 md:grid-cols-2">
        {pros.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Pros
            </p>
            <DetailList items={pros} marker="pro" />
          </div>
        ) : null}
        {cons.length > 0 || complaints.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Cons
            </p>
            <DetailList items={[...cons, ...complaints]} marker="con" />
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function BuyerFitBlock({
  bestFor,
  notFor,
}: ProductRecommendationCardData["buyerFit"]) {
  if (bestFor.length === 0 && notFor.length === 0) {
    return null;
  }

  return (
    <Section title="Buyer fit">
      <div className="grid gap-5 md:grid-cols-2">
        {bestFor.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Best for
            </p>
            <DetailList items={bestFor} marker="pro" />
          </div>
        ) : null}
        {notFor.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Not for
            </p>
            <DetailList items={notFor} marker="con" />
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function KeySpecsGrid({
  specs,
}: {
  specs: ProductRecommendationCardData["specs"];
}) {
  const allSpecs = [...specs.universal, ...specs.categorySpecific];

  if (allSpecs.length === 0) {
    return null;
  }

  return (
    <Section title="Key specs">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {allSpecs.map((spec) => (
          <div
            className="rounded-2xl border border-ink/10 bg-mist/45 p-3.5"
            key={`${spec.label}-${spec.value}`}
          >
            <p className="text-xs font-semibold text-slate-500">
              {spec.label}
            </p>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-900">
              {spec.value}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function EvidenceQualityBlock({
  citations,
  evidence,
}: {
  citations: ProductRecommendationCardData["citations"];
  evidence: ProductRecommendationCardData["evidence"];
}) {
  return (
    <Section title="Evidence quality">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-ink/10 bg-mist/45 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="rounded-md border-slate-200 bg-white text-slate-800"
              variant="outline"
            >
              {evidence.quality}
            </Badge>
            <p className="text-sm font-semibold text-slate-950">
              {evidence.sourcesChecked > 0
                ? `${evidence.sourcesChecked} sources checked`
                : "Limited sources found"}
            </p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {evidence.explanation}
          </p>
          {evidence.warnings.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-slate-500">
                What to verify
              </p>
              <DetailList items={evidence.warnings} marker="con" />
            </div>
          ) : null}
        </div>
        <CitationList citations={citations} />
      </div>
    </Section>
  );
}

function CitationList({
  citations,
}: {
  citations: ProductRecommendationCardData["citations"];
}) {
  if (citations.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-ink/15 bg-mist/40 p-3 text-sm leading-6 text-ink/65">
        No citation links are available for this item.
      </p>
    );
  }

  return (
    <ul className="grid gap-2">
      {citations.map((citation) => (
        <li key={`${citation.title}-${citation.url}`}>
          <div className="rounded-2xl border border-ink/10 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className="rounded-md border-slate-200 bg-slate-50 text-slate-600"
                variant="outline"
              >
                {citation.label}
              </Badge>
              {citation.host ? (
                <span className="text-xs font-medium text-slate-400">
                  {citation.host}
                </span>
              ) : null}
            </div>
            <a
              className="mt-2 inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:decoration-slate-500"
              href={citation.url}
              rel="noreferrer noopener"
              target="_blank"
            >
              <span className="min-w-0 break-words">{citation.title}</span>
              <ExternalLink
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
              />
            </a>
            {citation.supports ? (
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Shows: {citation.supports}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function NearMatchNotice({
  nearMatch,
}: {
  nearMatch: ProductRecommendationCardData["nearMatch"];
}) {
  if (!nearMatch) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-6 text-amber-950">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className="rounded-md border-amber-200 bg-white text-amber-800"
          variant="outline"
        >
          {nearMatch.label}
        </Badge>
        <p className="font-semibold">{nearMatch.summary}</p>
      </div>
      {nearMatch.details.length > 0 ? (
        <div className="mt-3">
          <DetailList items={nearMatch.details} marker="con" />
        </div>
      ) : null}
    </div>
  );
}

function ProductCardHeader({
  card,
}: {
  card: ProductRecommendationCardData;
}) {
  const RecommendationIcon =
    card.badge.rank === 1 ? Trophy : BadgeCheck;

  return (
    <div className="grid gap-7 lg:grid-cols-[270px_minmax(0,1fr)]">
      <div className="self-start overflow-hidden rounded-2xl border border-ink/10 bg-mist/35">
        <ProductImage image={card.image} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={
              card.badge.tone === "blue"
                ? "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-signal text-ink"
                : "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mist text-ink/60"
            }
          >
            <RecommendationIcon aria-hidden="true" className="h-4.5 w-4.5" />
          </span>
          <Badge
            className={
              card.badge.tone === "blue"
                ? "h-auto rounded-full border-forest/15 bg-[#edf3e7] px-2.5 py-1 text-sm font-semibold text-forest"
                : "h-auto rounded-full border-ink/10 bg-mist px-2.5 py-1 text-sm font-semibold text-ink/65"
            }
            variant="outline"
          >
            {card.badge.label}
          </Badge>
          <span className="text-sm text-slate-500">
            {card.badge.description}
          </span>
        </div>
        <h2 className="mt-4 break-words font-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-4xl">
          {card.title}
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span>{card.category}</span>
          {card.rating ? (
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <Star
                aria-hidden="true"
                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
              />
              {card.rating.text}
            </span>
          ) : null}
        </div>
        {card.offer ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Best offer found
              </p>
              <p className="mt-1 font-display text-2xl font-semibold leading-7 text-ink">
                {card.offer.displayText}
              </p>
            </div>
            {card.offer.url ? (
              <a
                className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-forest"
                href={card.offer.url}
                rel="noreferrer noopener"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4 text-slate-500" />
                {card.offer.ctaLabel}
              </a>
            ) : null}
          </div>
        ) : null}
        <p className="mt-4 text-sm leading-6 text-slate-700">
          {card.summary}
        </p>
      </div>
    </div>
  );
}

export function ProductCard({
  displayMode = "recommendation",
  product,
}: ProductCardProps) {
  const card = buildProductRecommendationCardData(product, displayMode);
  const complaints = product.common_complaints
    .filter((item) => item.trim())
    .slice(0, 4);

  return (
    <Card className="overflow-hidden rounded-[2rem] border-ink/10 bg-paper py-0 shadow-[0_20px_60px_rgba(12,27,22,0.08)]">
      <CardContent className="grid gap-6 p-5 sm:p-8">
        <ProductCardHeader card={card} />
        <QuickDecisionSignals signals={card.quickSignals} />
        <NearMatchNotice nearMatch={card.nearMatch} />
        <RecommendationReasons reasons={card.recommendationReasons} />
        <OwnerOpinionBlock ownerOpinion={card.ownerOpinion} />
        <ProsConsGrid complaints={complaints} cons={card.cons} pros={card.pros} />
        <BuyerFitBlock {...card.buyerFit} />
        <KeySpecsGrid specs={card.specs} />
        <EvidenceQualityBlock citations={card.citations} evidence={card.evidence} />
      </CardContent>
    </Card>
  );
}

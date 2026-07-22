import {
  BadgeCheck,
  BookOpenCheck,
  Check,
  ExternalLink,
  ImageOff,
  Minus,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/BrandMark";
import type { TwoLayerDisplaySource } from "@/lib/twoLayerApiContract";
import type { TwoLayerProductCard } from "@/lib/twoLayerRecommendation";

type TwoLayerResultsProps = {
  cards: TwoLayerProductCard[];
  sources: TwoLayerDisplaySource[];
};

function TrustLegend() {
  const entries = [
    {
      icon: Sparkles,
      label: "AI research synthesis",
      description: "Terra selected, ranked, and explained the product.",
      className: "border-blue-200 bg-blue-50 text-blue-950",
    },
    {
      icon: BookOpenCheck,
      label: "Source-reported",
      description: "A cited source reports it, but ReviewRadar has not proven it.",
      className: "border-violet-200 bg-violet-50 text-violet-950",
    },
    {
      icon: ShieldCheck,
      label: "Independently verified",
      description: "ReviewRadar bound the field to the exact product and source.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    },
  ];

  return (
    <section aria-labelledby="trust-key" className="grid gap-5 rounded-[2rem] bg-ink p-6 text-white shadow-[0_22px_60px_rgba(12,27,22,0.16)] sm:p-8">
      <div className="max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-signal">
          Trust key
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-white" id="trust-key">
          What each label means
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/58">Trust is a property of each field—not a blanket score applied to the whole recommendation.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <div
              className={`rounded-2xl border p-4 shadow-none ${entry.className}`}
              key={entry.label}
            >
              <div className="flex items-center gap-2">
                <Icon aria-hidden="true" className="h-4 w-4" />
                <p className="text-sm font-semibold">{entry.label}</p>
              </div>
              <p className="mt-2 text-sm leading-6 opacity-75">
                {entry.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function IdentityStatus({ card }: { card: TwoLayerProductCard }) {
  if (card.identityVerification.state === "verified") {
    return (
      <Badge
        className="h-auto max-w-full gap-1.5 whitespace-normal rounded-md border-emerald-200 bg-emerald-50 px-2.5 py-1 text-left leading-4 text-emerald-800"
        variant="outline"
      >
        <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        Exact identity verified
      </Badge>
    );
  }

  return (
    <Badge
      className="h-auto max-w-full gap-1.5 whitespace-normal rounded-md border-amber-200 bg-amber-50 px-2.5 py-1 text-left leading-4 text-amber-900"
      variant="outline"
    >
      <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      Exact model or variant not verified
    </Badge>
  );
}

function ProductImageState({ card }: { card: TwoLayerProductCard }) {
  if (card.image.state === "verified" && card.image.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={`${card.identity.product_name} verified product image`}
        className="aspect-[4/3] h-full w-full object-contain p-5"
        src={card.image.url}
      />
    );
  }

  return (
    <div className="grid aspect-[4/3] place-items-center bg-[#edf0e9] p-6 text-center">
      <div className="grid justify-items-center gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-paper shadow-sm ring-1 ring-ink/10">
          <ImageOff aria-hidden="true" className="h-5 w-5 text-slate-400" />
        </span>
        <p className="text-sm font-semibold text-slate-600">
          Product image withheld
        </p>
        <p className="max-w-48 text-xs leading-5 text-slate-500">
          No exact-variant image has been independently verified.
        </p>
      </div>
    </div>
  );
}

function CommerceState({ card }: { card: TwoLayerProductCard }) {
  if (card.commerce.state === "verified") {
    const price = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: card.commerce.currency,
    }).format(card.commerce.priceAmount);
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-900">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                Independently verified offer
              </p>
            </div>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-950">
              {price}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {card.commerce.seller} · In stock when checked
            </p>
          </div>
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            href={card.commerce.productUrl}
            rel="noreferrer noopener"
            target="_blank"
          >
            View verified offer
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-amber-700 ring-1 ring-amber-200">
          <Tag aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold text-amber-950">Check current price</p>
          <p className="mt-1 text-sm leading-6 text-amber-900/75">
            ReviewRadar has not independently verified a current exact-product
            offer, so no price or purchase link is shown.
          </p>
        </div>
      </div>
    </div>
  );
}

function ResearchSynthesis({ card }: { card: TwoLayerProductCard }) {
  return (
    <section className="grid gap-4 border-t border-ink/10 pt-6">
      <div className="flex items-center gap-2 text-forest">
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        <h3 className="text-sm font-semibold">AI research synthesis</h3>
      </div>
      <p className="text-sm leading-7 text-slate-700">
        {card.assessment.why.value}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-forest/12 bg-[#edf3e7] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-forest">
            Best for
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {card.assessment.bestFor.value}
          </p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-mist/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Main tradeoff
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {card.assessment.mainTradeoff.value}
          </p>
        </div>
      </div>
    </section>
  );
}

function ProsAndCons({ card }: { card: TwoLayerProductCard }) {
  return (
    <section className="grid gap-4 border-t border-ink/10 pt-6">
      <h3 className="text-sm font-semibold text-slate-950">Pros and cons</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <ul className="grid content-start gap-2">
          {card.pros.map((item) => (
            <li className="flex gap-2 text-sm leading-6 text-slate-600" key={item.value}>
              <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
              {item.value}
            </li>
          ))}
        </ul>
        <ul className="grid content-start gap-2">
          {card.cons.map((item) => (
            <li className="flex gap-2 text-sm leading-6 text-slate-600" key={item.value}>
              <Minus aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-rose-500" />
              {item.value}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RequirementComparison({
  card,
  sources,
}: {
  card: TwoLayerProductCard;
  sources: Map<string, TwoLayerDisplaySource>;
}) {
  return (
    <section className="grid gap-3 border-t border-ink/10 pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles aria-hidden="true" className="h-4 w-4 text-blue-700" />
        <h3 className="text-sm font-semibold text-slate-950">
          Requirement comparison
        </h3>
        <Badge
          className="h-auto max-w-full whitespace-normal rounded-md border-blue-200 bg-blue-50 text-left leading-4 text-blue-800"
          variant="outline"
        >
          AI research synthesis
        </Badge>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Terra evaluated each requirement from the cited research. ReviewRadar
        has not independently verified these verdicts.
      </p>
      <div className="grid gap-3">
        {card.requirementChecks.map((check) => (
          <div
            className="rounded-2xl border border-ink/10 bg-mist/45 p-4"
            key={`${check.requirement}-${check.status}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {check.requirement}
              </p>
              <Badge
                className={
                  check.status === "Pass"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : check.status === "Fail"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                }
                variant="outline"
              >
                {check.status}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {check.explanation}
            </p>
            {check.sourceIds.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {check.sourceIds.map((id) => {
                  const source = sources.get(id);
                  if (!source) return null;
                  return source.url ? (
                    <a
                      className="inline-flex h-auto max-w-full items-center gap-1.5 whitespace-normal rounded-md border border-slate-200 bg-white px-2.5 py-1 text-left text-xs leading-4 text-slate-600 hover:border-slate-300 hover:text-slate-950"
                      href={source.url}
                      key={id}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {source.label}: {source.title}
                      <ExternalLink
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0"
                      />
                    </a>
                  ) : (
                    <Badge
                      className="h-auto max-w-full whitespace-normal rounded-md bg-white text-left leading-4 text-slate-600"
                      key={id}
                      variant="outline"
                    >
                      {source.label}: {source.title}
                    </Badge>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function SourceReportedFacts({
  card,
  sources,
}: {
  card: TwoLayerProductCard;
  sources: Map<string, TwoLayerDisplaySource>;
}) {
  if (card.claims.length === 0) return null;

  return (
    <section className="grid gap-3 border-t border-ink/10 pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <BookOpenCheck aria-hidden="true" className="h-4 w-4 text-violet-700" />
        <h3 className="text-sm font-semibold text-slate-950">Source-reported facts</h3>
        <Badge
          className="h-auto max-w-full whitespace-normal rounded-md border-violet-200 bg-violet-50 text-left leading-4 text-violet-800"
          variant="outline"
        >
          Not independently verified
        </Badge>
      </div>
      <div className="grid gap-3">
        {card.claims.map((claim) => (
          <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4" key={claim.value}>
            <p className="text-sm leading-6 text-slate-700">{claim.value}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                className="h-auto max-w-full whitespace-normal rounded-md bg-white text-left leading-4 text-slate-600"
                variant="outline"
              >
                Scope: {claim.evidenceScope.replaceAll("_", " ")}
              </Badge>
              {claim.sourceIds.map((id) => {
                const source = sources.get(id);
                if (!source) return null;
                return source.url ? (
                  <a
                    className="inline-flex h-auto max-w-full items-center gap-1.5 whitespace-normal rounded-md border border-slate-200 bg-white px-2.5 py-1 text-left text-xs leading-4 text-slate-600 hover:border-slate-300 hover:text-slate-950"
                    href={source.url}
                    key={id}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {source.label}: {source.title}
                    <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <Badge
                    className="h-auto max-w-full whitespace-normal rounded-md bg-white text-left leading-4 text-slate-600"
                    key={id}
                    variant="outline"
                  >
                    {source.label}: {source.title}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PreviewCard({
  card,
  sources,
}: {
  card: TwoLayerProductCard;
  sources: Map<string, TwoLayerDisplaySource>;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-[2rem] border border-ink/10 bg-paper shadow-[0_20px_60px_rgba(12,27,22,0.09)]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="min-w-0 border-b border-ink/10 bg-mist/35 lg:border-b-0 lg:border-r">
          <ProductImageState card={card} />
        </div>
        <div className="grid min-w-0 gap-6 p-5 sm:p-8">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  card.recommendationStatus === "Best Match"
                    ? "h-auto rounded-md border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-800"
                    : "h-auto rounded-md border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700"
                }
                variant="outline"
              >
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                #{card.rank} {card.recommendationStatus}
              </Badge>
              <IdentityStatus card={card} />
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-4xl">
              {card.identity.product_name}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {[card.identity.brand, card.identity.model, card.identity.variant]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </header>
          <CommerceState card={card} />
          <ResearchSynthesis card={card} />
          <RequirementComparison card={card} sources={sources} />
          <ProsAndCons card={card} />
          <SourceReportedFacts card={card} sources={sources} />
        </div>
      </div>
    </article>
  );
}

export function TwoLayerResults({
  cards,
  sources,
}: TwoLayerResultsProps) {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));

  return (
    <div className="grid min-w-0 gap-10">
      <TrustLegend />
      <section aria-labelledby="two-layer-results" className="grid min-w-0 gap-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forest">
            Research results
          </p>
          <h2
            className="mt-2 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-5xl"
            id="two-layer-results"
          >
            Ranked recommendations with visible trust states
          </h2>
        </div>
        {cards.map((card) => (
          <PreviewCard card={card} key={card.key} sources={sourcesById} />
        ))}
      </section>
    </div>
  );
}

export function TwoLayerResultPreview({
  cards,
  sources,
}: TwoLayerResultsProps) {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-5 py-8 sm:px-7 lg:py-12">
        <div className="flex items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <div>
            <p className="text-sm font-semibold tracking-[-0.02em]">ReviewRadar</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/65">Decision intelligence</p>
          </div>
        </div>
        <header className="relative grid gap-6 overflow-hidden rounded-[2rem] bg-ink p-6 text-white shadow-[0_26px_70px_rgba(12,27,22,0.2)] sm:p-9">
          <div aria-hidden="true" className="rr-radar absolute -right-24 -top-32 h-[430px] w-[430px] rounded-full opacity-65" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-white/15 bg-white/10 text-white" variant="outline">
              Development-only prototype
            </Badge>
            <Badge className="rounded-full border-signal/30 bg-signal text-ink" variant="outline">
              Controlled example data
            </Badge>
          </div>
          <div className="max-w-4xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-signal">ReviewRadar OAI-T3</p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl">
              Recommendations that show what is known—and what is not
            </h1>
            <p className="mt-5 text-base leading-7 text-white/58">
              This local preview makes the two-layer trust boundary visible. It
              calls no research or shopping provider and is not connected to the
              production recommendation route.
            </p>
          </div>
          <div className="relative flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-white/75">
            <SearchCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-6">
              Product recommendations remain useful even when a price, image, or
              exact variant cannot be independently verified. Uncertain fields
              are labeled or withheld instead of silently filled.
            </p>
          </div>
        </header>

        <TwoLayerResults cards={cards} sources={sources} />
      </div>
    </main>
  );
}

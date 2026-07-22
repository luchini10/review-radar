"use client";

import { useState } from "react";
import {
  ArrowDown,
  CheckCircle2,
  ExternalLink,
  ImageOff,
  Scale,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  isDirectTerraCitationAllowed,
  type DirectTerraCompletedResponse,
} from "@/lib/directTerraApiContract";
import {
  extractDirectTerraPicks,
  headingSlug,
  reactChildrenToText,
} from "@/lib/directTerraReportOutline";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}

function DirectTerraProductImage({
  imageUrl,
  productName,
}: {
  imageUrl: string | null;
  productName: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl bg-mist text-center text-slate-500">
        <div className="px-4">
          <ImageOff aria-hidden="true" className="mx-auto h-6 w-6" />
          <span className="mt-2 block text-xs font-medium">
            Product image unavailable
          </span>
        </div>
      </div>
    );
  }

  return (
    // Provider image URLs are runtime values and cannot use a fixed Next/Image
    // host allowlist. A failed remote image degrades to the neutral state above.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={`${productName} product image`}
      className="aspect-[4/3] w-full rounded-2xl bg-white object-contain p-3"
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      src={imageUrl}
    />
  );
}

export function DirectTerraReport({
  result,
}: {
  result: DirectTerraCompletedResponse;
}) {
  const disabledCitationCount = result.disabledCitationCount ?? 0;
  // "Your picks at a glance": the ranked shortlist parsed from Terra's own
  // report, surfaced ahead of the full research so shoppers see the answer
  // first. It reads Terra's ranking; it never reranks or rebuilds it.
  const picks = extractDirectTerraPicks(result.reportMarkdown);
  const priceByRank = new Map(
    result.priceEstimates.map((estimate) => [estimate.rank, estimate]),
  );
  const assetByRank = new Map(
    result.productAssets.map((asset) => [asset.rank, asset]),
  );

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-8 text-white shadow-[0_26px_70px_rgba(12,27,22,0.2)] sm:px-9 sm:py-10">
        <div aria-hidden="true" className="rr-radar absolute -right-28 -top-28 h-96 w-96 rounded-full opacity-60" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-signal">Your decision brief</p>
            <h2 className="mt-3 text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-5xl">Ranked research, with the uncertainty left in.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58 sm:text-base">Start with the shortlist, use the price ranges as orientation, then open the full report for reasoning and sources.</p>
          </div>
          <div className="grid gap-2 text-xs text-white/68 sm:grid-cols-3 lg:grid-cols-1">
            {[
              [Sparkles, "Terra-ranked"],
              [CheckCircle2, "Response-owned citations"],
              [Scale, "Estimates, never checkout claims"],
            ].map(([Icon, label]) => {
              const SignalIcon = Icon as typeof Sparkles;
              return (
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2" key={label as string}>
                  <SignalIcon aria-hidden="true" className="h-3.5 w-3.5 text-signal" />
                  {label as string}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div
        className="rounded-2xl border border-amber-300/70 bg-[#fff8df] px-5 py-4 text-amber-950 shadow-none"
        role="note"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Purchase details are unverified</p>
            <p className="mt-1 text-sm leading-6">
              Purchase claims inside Terra&apos;s report are AI-reported and
              remain unverified. ReviewRadar&apos;s separate market-price ranges
              use multiple web sources, but they are estimates rather than
              checkout quotes. Confirm price, seller, stock, and terms before
              buying.
            </p>
          </div>
        </div>
      </div>

      {disabledCitationCount > 0 ? (
        <div
          className="rounded-2xl border border-ink/10 bg-mist/65 px-5 py-4 text-ink/75"
          role="note"
        >
          <p className="text-sm font-semibold">Some source links are unavailable</p>
          <p className="mt-1 text-sm leading-6">
            ReviewRadar could not confirm {disabledCitationCount}{" "}
            {disabledCitationCount === 1 ? "source link" : "source links"}{" "}
            against this research response. The report is preserved, but those
            links are disabled and the nearby claims should be treated as AI
            synthesis.
          </p>
        </div>
      ) : null}

      {picks.length > 0 ? (
        <section
          aria-label="Your picks at a glance"
          className="rounded-[1.75rem] border border-ink/10 bg-paper px-5 py-6 shadow-[0_18px_50px_rgba(12,27,22,0.07)] sm:px-7"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forest">
            Your picks at a glance
          </p>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {picks.map((pick) => {
              const estimate = priceByRank.get(pick.rank);
              const rankedAsset = assetByRank.get(pick.rank);
              const asset =
                rankedAsset?.productName === pick.name ? rankedAsset : undefined;
              return (
                <li
                  className="flex min-w-0 flex-col rounded-3xl border border-ink/10 bg-white p-3 shadow-sm"
                  key={pick.rank}
                >
                  <DirectTerraProductImage
                    imageUrl={asset?.imageUrl ?? null}
                    productName={pick.name}
                  />
                  <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink text-xs font-semibold text-signal">
                        {pick.rank}
                      </span>
                      <span className="min-w-0 text-sm font-semibold leading-5 text-ink">
                        {pick.name}
                      </span>
                    </div>
                    {estimate ? (
                      <span className="mt-3 text-sm font-semibold text-forest">
                        {USD.format(estimate.low)}
                        {estimate.high === estimate.low
                          ? ""
                          : `–${USD.format(estimate.high)}`}
                      </span>
                    ) : (
                      <span className="mt-3 text-xs text-slate-500">
                        Price estimate unavailable
                      </span>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <a
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-forest/30 hover:text-forest"
                        href={`#${pick.anchorId}`}
                      >
                        Full research
                        <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                      </a>
                      {asset?.productUrl ? (
                        <a
                          className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink"
                          href={asset.productUrl}
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          Product website
                          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Images and websites are attached only after an exact product-identity
            check. Prices remain estimated market ranges, not checkout quotes;
            confirm the product, seller, stock, and price before buying.
          </p>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-forest/14 bg-[#eaf1e8] px-5 py-6 text-ink shadow-none sm:px-7">
        <div>
          <p className="text-sm font-semibold text-forest">
            Estimated market prices
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            ReviewRadar calculates each range from at least two distinct source
            hosts returned by this Terra research. The ranges do not verify a
            seller, checkout price, stock, shipping, tax, or discount eligibility.
          </p>
        </div>

        {result.priceEstimates.length > 0 ? (
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {result.priceEstimates.map((estimate) => (
              <li
                className="rounded-2xl border border-forest/10 bg-paper px-4 py-4"
                key={estimate.rank}
              >
                <p className="text-sm font-semibold text-slate-950">
                  #{estimate.rank} {estimate.brand} {estimate.model}
                </p>
                <p className="mt-2 font-display text-xl font-semibold text-forest">
                  {USD.format(estimate.low)}
                  {estimate.high === estimate.low
                    ? ""
                    : ` - ${USD.format(estimate.high)}`}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Median {USD.format(estimate.median)} across{" "}
                  {estimate.sourceCount} distinct source hosts
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-700">
            Price unavailable: no recommendation had two safe, distinct
            source observations for the exact new standalone product.
          </p>
        )}

        {result.rejectedPriceObservationCount > 0 ? (
          <p className="mt-3 text-xs leading-5 text-slate-600">
            ReviewRadar excluded {result.rejectedPriceObservationCount}{" "}
            {result.rejectedPriceObservationCount === 1
              ? "price observation"
              : "price observations"}{" "}
            that failed its source, identity, condition, or duplication checks.
          </p>
        ) : null}
      </section>

      <article className="rounded-[2rem] border border-ink/10 bg-paper px-5 py-8 shadow-[0_22px_65px_rgba(12,27,22,0.08)] sm:px-10 sm:py-11">
        <div className="mb-8 border-b border-ink/10 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-forest">
            Terra research report
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            ReviewRadar displays Terra&apos;s selected products, ranking,
            explanations, and citations without reranking or rebuilding them.
          </p>
        </div>

        <div className="max-w-none text-[15px] leading-7 text-ink/72">
          <ReactMarkdown
            disallowedElements={["img"]}
            remarkPlugins={[remarkGfm]}
            skipHtml
            urlTransform={safeExternalUrl}
            components={{
              a: ({ children, href }) =>
                isDirectTerraCitationAllowed(result.citationUrls, href) ? (
                  <a
                    className="inline-flex items-center gap-1 font-semibold text-forest underline decoration-forest/30 underline-offset-3 hover:text-ink"
                    href={href}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {children}
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="inline text-slate-700">
                    {children}{" "}
                    <span className="text-xs font-medium text-amber-800">
                      (Source link unavailable)
                    </span>
                  </span>
                ),
              blockquote: ({ children }) => (
                <blockquote className="my-5 border-l-4 border-slate-300 bg-slate-50 px-4 py-2 text-slate-600">
                  {children}
                </blockquote>
              ),
              h1: ({ children }) => (
                <h2 className="mb-5 mt-1 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
                  {children}
                </h2>
              ),
              h2: ({ children }) => {
                const id = headingSlug(reactChildrenToText(children));
                return (
                  <h3
                    className="mb-3 mt-10 scroll-mt-24 border-t border-ink/10 pt-8 font-display text-2xl font-semibold tracking-[-0.03em] text-ink first:mt-0 first:border-0 first:pt-0 sm:text-3xl"
                    id={id || undefined}
                  >
                    {children}
                  </h3>
                );
              },
              h3: ({ children }) => (
                <h4 className="mb-2 mt-6 text-lg font-semibold text-slate-950">
                  {children}
                </h4>
              ),
              li: ({ children }) => <li className="my-1 pl-1">{children}</li>,
              ol: ({ children }) => (
                <ol className="my-4 list-decimal space-y-1 pl-6">{children}</ol>
              ),
              p: ({ children }) => <p className="my-3">{children}</p>,
              table: ({ children }) => (
                <div className="my-6 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-left text-sm">
                    {children}
                  </table>
                </div>
              ),
              td: ({ children }) => (
                <td className="border-t border-slate-200 px-3 py-2 align-top">
                  {children}
                </td>
              ),
              th: ({ children }) => (
                <th className="bg-slate-50 px-3 py-2 font-semibold text-slate-950">
                  {children}
                </th>
              ),
              ul: ({ children }) => (
                <ul className="my-4 list-disc space-y-1 pl-6">{children}</ul>
              ),
            }}
          >
            {result.reportMarkdown}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}

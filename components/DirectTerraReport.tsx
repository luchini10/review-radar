import { ExternalLink, ShieldAlert } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  isDirectTerraCitationAllowed,
  type DirectTerraCompletedResponse,
} from "@/lib/directTerraApiContract";

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

export function DirectTerraReport({
  result,
}: {
  result: DirectTerraCompletedResponse;
}) {
  const disabledCitationCount = result.disabledCitationCount ?? 0;

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm"
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
          className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-slate-800"
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

      <section className="rounded-2xl border border-blue-200 bg-blue-50/70 px-5 py-5 text-slate-900 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-blue-950">
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
                className="rounded-xl border border-blue-100 bg-white px-4 py-3"
                key={estimate.rank}
              >
                <p className="text-sm font-semibold text-slate-950">
                  #{estimate.rank} {estimate.brand} {estimate.model}
                </p>
                <p className="mt-1 text-base font-semibold text-blue-800">
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

      <article className="rounded-3xl border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-9 sm:py-9">
        <div className="mb-7 border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            Terra research report
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            ReviewRadar displays Terra&apos;s selected products, ranking,
            explanations, and citations without reranking or rebuilding them.
          </p>
        </div>

        <div className="max-w-none text-[15px] leading-7 text-slate-700">
          <ReactMarkdown
            disallowedElements={["img"]}
            remarkPlugins={[remarkGfm]}
            skipHtml
            urlTransform={safeExternalUrl}
            components={{
              a: ({ children, href }) =>
                isDirectTerraCitationAllowed(result.citationUrls, href) ? (
                  <a
                    className="inline-flex items-center gap-1 font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
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
                <h1 className="mb-5 mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-3 mt-9 border-t border-slate-200 pt-7 font-display text-2xl font-semibold tracking-tight text-slate-950 first:mt-0 first:border-0 first:pt-0">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-6 text-lg font-semibold text-slate-950">
                  {children}
                </h3>
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

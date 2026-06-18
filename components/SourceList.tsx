import { ExternalLink } from "lucide-react";
import type { Citation } from "@/types/review-radar";

type SourceListProps = {
  sources: Citation[];
};

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 text-sm leading-6 text-slate-500">
        No citation links are available for this item.
      </p>
    );
  }

  return (
    <ul className="grid gap-2">
      {sources.map((source) => {
        const host = hostnameOf(source.url);

        return (
          <li key={`${source.title}-${source.url}`}>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 transition-colors hover:border-slate-300">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <a
                  className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:decoration-slate-500"
                  href={source.url}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  <span className="min-w-0 break-words">{source.title}</span>
                  <ExternalLink
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  />
                </a>
                {host ? (
                  <span className="shrink-0 text-xs font-medium text-slate-400">
                    {host}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Supports: {source.what_it_supports}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

import type { Citation } from "@/types/review-radar";

type SourceListProps = {
  sources: Citation[];
};

export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <p className="text-sm leading-6 text-slate-500">
        No citation links are available for this item.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {sources.map((source) => (
        <li className="grid gap-1" key={`${source.title}-${source.url}`}>
          <a
            className="inline-flex text-sm font-semibold text-blue-700 underline decoration-blue-200 underline-offset-4 transition hover:text-blue-900"
            href={source.url}
            rel="noreferrer"
            target="_blank"
          >
            {source.title}
          </a>
          <p className="text-xs leading-5 text-slate-500">
            Supports: {source.what_it_supports}
          </p>
        </li>
      ))}
    </ul>
  );
}

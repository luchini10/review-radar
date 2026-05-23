import type { FormEvent } from "react";
import type { SearchRequest } from "@/types/review-radar";

type SearchFormProps = {
  error: string;
  isLoading: boolean;
  onChange: (field: keyof SearchRequest, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: SearchRequest;
};

export function SearchForm({
  error,
  isLoading,
  onChange,
  onSubmit,
  value,
}: SearchFormProps) {
  return (
    <form
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20"
      onSubmit={onSubmit}
    >
      <div className="grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">
            Product category
          </span>
          <input
            className="min-h-12 rounded-xl border border-white/10 bg-slate-900 px-4 text-base text-white outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
            name="category"
            onChange={(event) => onChange("category", event.target.value)}
            placeholder="Vacuum, headphones, air fryer"
            type="text"
            value={value.category}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">Budget</span>
          <input
            className="min-h-12 rounded-xl border border-white/10 bg-slate-900 px-4 text-base text-white outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
            name="budget"
            onChange={(event) => onChange("budget", event.target.value)}
            placeholder="Under $300, best value, no limit"
            type="text"
            value={value.budget}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">Use case</span>
          <input
            className="min-h-12 rounded-xl border border-white/10 bg-slate-900 px-4 text-base text-white outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
            name="useCase"
            onChange={(event) => onChange("useCase", event.target.value)}
            placeholder="Pet hair, small apartment, daily commuting"
            type="text"
            value={value.useCase}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-200">
            Deal-breaker
          </span>
          <input
            className="min-h-12 rounded-xl border border-white/10 bg-slate-900 px-4 text-base text-white outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
            name="dealBreaker"
            onChange={(event) => onChange("dealBreaker", event.target.value)}
            placeholder="Too loud, weak battery, hard to clean"
            type="text"
            value={value.dealBreaker}
          />
        </label>

        {error ? (
          <div
            className="rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-100"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <button
          className="min-h-12 rounded-xl bg-cyan-300 px-5 text-base font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Preparing search..." : "Find Recommendations"}
        </button>
      </div>
    </form>
  );
}

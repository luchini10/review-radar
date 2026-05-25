import type { FormEvent } from "react";
import {
  DollarSign,
  Search,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import SmartFeatures from "@/components/SmartFeatures";
import type { SearchRequest } from "@/types/review-radar";

type SearchFormProps = {
  error: string;
  isLoading: boolean;
  onChange: <K extends keyof SearchRequest>(
    field: K,
    value: SearchRequest[K],
  ) => void;
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
  const inputClass =
    "min-h-14 rounded-lg border border-slate-200 bg-white px-4 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  return (
    <form
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/10"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="grid gap-2">
          <label className="grid gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Search aria-hidden="true" className="h-4 w-4 text-blue-600" />
              Product category
            </span>
            <input
              className={inputClass}
              name="category"
              onChange={(event) => onChange("category", event.target.value)}
              placeholder="Example: cordless vacuum"
              type="text"
              value={value.category}
            />
          </label>
          <SmartFeatures
            productCategory={value.category}
            selectedFeatures={value.selectedFeatures}
            onChange={(features) => onChange("selectedFeatures", features)}
          />
        </div>

        <label className="grid gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <DollarSign aria-hidden="true" className="h-4 w-4 text-blue-600" />
            Budget
          </span>
          <input
            className={inputClass}
            name="budget"
            onChange={(event) => onChange("budget", event.target.value)}
            placeholder="Example: under $500"
            type="text"
            value={value.budget}
          />
        </label>

        <label className="grid gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Target aria-hidden="true" className="h-4 w-4 text-blue-600" />
            Use case
          </span>
          <input
            className={inputClass}
            name="useCase"
            onChange={(event) => onChange("useCase", event.target.value)}
            placeholder="Pet hair, hardwood floors"
            type="text"
            value={value.useCase}
          />
        </label>

        <label className="grid gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <TriangleAlert
              aria-hidden="true"
              className="h-4 w-4 text-blue-600"
            />
            Deal breakers
          </span>
          <input
            className={inputClass}
            name="dealBreaker"
            onChange={(event) => onChange("dealBreaker", event.target.value)}
            placeholder="Bad battery life, loud"
            type="text"
            value={value.dealBreaker}
          />
        </label>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex justify-center">
        <button
          className="inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          disabled={isLoading}
          type="submit"
        >
          <Sparkles aria-hidden="true" className="h-5 w-5" />
          {isLoading ? "Preparing search..." : "Find Recommendations"}
        </button>
      </div>
    </form>
  );
}

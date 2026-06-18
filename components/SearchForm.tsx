import type { FormEvent } from "react";
import {
  Check,
  LoaderCircle,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import SmartFeatures from "@/components/SmartFeatures";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBudgetInput } from "@/lib/budgetInputFormatting";
import { extractStructuredRequirements } from "@/lib/requirementExtraction";
import type { SearchRequest } from "@/types/review-radar";

type SearchFormProps = {
  error: string;
  fieldErrors?: {
    category?: string;
  };
  isLoading: boolean;
  onCancelSearch: () => void;
  onChange: <K extends keyof SearchRequest>(
    field: K,
    value: SearchRequest[K],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: SearchRequest;
};

function FieldHint({ children }: { children: string }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
      {children}
    </span>
  );
}

export function SearchForm({
  error,
  fieldErrors,
  isLoading,
  onCancelSearch,
  onChange,
  onSubmit,
  value,
}: SearchFormProps) {
  const fieldClass =
    "min-h-12 rounded-xl border-slate-200 bg-white px-4 text-base text-slate-950 shadow-xs placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-4 focus-visible:ring-slate-900/5 md:text-base";
  const labelClass =
    "flex items-baseline justify-between gap-3 text-sm font-semibold text-slate-900";
  const parsedRequirements = extractStructuredRequirements({
    budget: value.budget || undefined,
    priorities: value.priorities || undefined,
    query: value.category || "product",
    selectedFeatures:
      value.selectedFeatures.length > 0 ? value.selectedFeatures : undefined,
  });
  const previewItems = parsedRequirements.summary.slice(0, 5);
  const categoryError = fieldErrors?.category ?? "";

  return (
    <Card className="overflow-visible rounded-2xl border-slate-200/80 bg-white py-0 shadow-xl shadow-slate-900/[0.06]">
      <CardContent className="p-5 sm:p-6">
        <form aria-label="Product research" onSubmit={onSubmit}>
          <div className="grid items-start gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="grid min-w-0 content-start gap-2">
              <Label className={labelClass} htmlFor="category">
                <span className="inline-flex items-center gap-2">
                  <Search
                    aria-hidden="true"
                    className="h-4 w-4 text-slate-400"
                  />
                  Product category
                </span>
                <FieldHint>Required</FieldHint>
              </Label>
              <Input
                aria-describedby={
                  categoryError ? "category-error" : "category-helper"
                }
                aria-invalid={categoryError ? true : undefined}
                className={
                  categoryError
                    ? `${fieldClass} border-red-300 focus-visible:border-red-400 focus-visible:ring-red-600/10`
                    : fieldClass
                }
                id="category"
                name="category"
                onChange={(event) => onChange("category", event.target.value)}
                placeholder="Example: cordless vacuum, office chair, 65-inch TV"
                type="text"
                value={value.category}
              />
              {categoryError ? (
                <p
                  className="text-sm font-medium text-red-600"
                  id="category-error"
                  role="alert"
                >
                  {categoryError}
                </p>
              ) : (
                <p className="text-xs leading-5 text-slate-500" id="category-helper">
                  The product you want researched. Be as specific as you like.
                </p>
              )}
              <SmartFeatures
                budget={value.budget}
                importantDetails={value.priorities}
                productCategory={value.category}
                selectedFeatures={value.selectedFeatures}
                onChange={(features) => onChange("selectedFeatures", features)}
              />
            </div>

            <div className="grid min-w-0 content-start gap-2">
              <Label className={labelClass} htmlFor="budget">
                <span>Budget</span>
                <FieldHint>Optional</FieldHint>
              </Label>
              <Input
                aria-describedby="budget-helper"
                className={fieldClass}
                id="budget"
                name="budget"
                onChange={(event) =>
                  onChange("budget", formatBudgetInput(event.target.value))
                }
                placeholder={'Example: under $500, or "$500 to $700"'}
                type="text"
                value={value.budget}
              />
              <p className="text-xs leading-5 text-slate-500" id="budget-helper">
                Firm limits are enforced. Over-budget upgrades are labeled
                separately, never mixed in.
              </p>
            </div>

            <div className="grid min-w-0 content-start gap-2 lg:col-span-2">
              <Label className={labelClass} htmlFor="priorities">
                <span>Important Details</span>
                <FieldHint>Optional</FieldHint>
              </Label>
              <Textarea
                aria-describedby="important-details-helper"
                className={`${fieldClass} min-h-20 resize-none py-3`}
                id="priorities"
                name="priorities"
                onChange={(event) => onChange("priorities", event.target.value)}
                placeholder="Example: must be under 64 inches wide, comfortable for guests, easy to assemble, no velvet"
                value={value.priorities}
              />
              <p
                className="text-xs leading-5 text-slate-500"
                id="important-details-helper"
              >
                Anything else that matters: size limits, must-have features,
                comfort needs, or things you do not want. Hard requirements are
                treated as firm filters.
              </p>
            </div>
          </div>

          {previewItems.length > 0 ? (
            <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                What ReviewRadar will match
              </p>
              <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {previewItems.map((item) => (
                  <li
                    className="flex items-start gap-2 text-sm leading-5 text-slate-700"
                    key={item}
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <Alert
              className="mt-5 rounded-xl border-red-200 bg-red-50 text-red-700"
              variant="destructive"
            >
              <TriangleAlert aria-hidden="true" className="h-4 w-4" />
              <AlertDescription className="font-medium text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-6 flex flex-col items-stretch gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 sm:max-w-xs">
              <p className="text-xs leading-5 text-slate-500">
                Research usually takes one to three minutes. Every pick is cited,
                and unverified details are flagged.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {isLoading ? (
                <Button
                  className="min-h-12 gap-2 rounded-xl border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                  onClick={onCancelSearch}
                  type="button"
                  variant="outline"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                  Cancel search
                </Button>
              ) : null}
              <Button
                className="min-h-12 gap-2 rounded-xl bg-slate-950 px-7 text-base font-semibold text-white shadow-lg shadow-slate-950/20 transition-colors hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin"
                  />
                ) : (
                  <Search aria-hidden="true" className="h-5 w-5" />
                )}
                {isLoading ? "Preparing search..." : "Find Recommendations"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

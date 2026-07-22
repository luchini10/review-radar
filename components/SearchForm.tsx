import type { FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
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
    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/65">
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
    "min-h-14 rounded-2xl border-ink/12 bg-[#fbfcf7] px-4 text-base text-ink shadow-none transition-all placeholder:text-ink/60 hover:border-ink/20 focus-visible:border-forest/45 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-forest/8 md:text-base";
  const labelClass =
    "flex items-baseline justify-between gap-3 text-[13px] font-semibold text-ink";
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
    <Card className="overflow-visible rounded-[2rem] border-ink/10 bg-paper py-0 shadow-[0_24px_75px_rgba(12,27,22,0.11)]">
      <CardContent className="p-5 sm:p-7 lg:p-8">
        <form aria-label="Product research" onSubmit={onSubmit}>
          <div className="mb-7 flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forest">Research brief</p>
              <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-[-0.035em] sm:text-3xl">Tell us what a great choice looks like.</h2>
            </div>
            <p className="max-w-sm text-xs leading-5 text-ink/65">Specific details help ReviewRadar separate a popular product from the right product.</p>
          </div>

          <div className="grid items-start gap-x-5 gap-y-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
            <div className="grid min-w-0 content-start gap-2">
              <Label className={labelClass} htmlFor="category">
                <span className="inline-flex items-center gap-2">
                  <Search
                    aria-hidden="true"
                    className="h-4 w-4 text-forest/55"
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
                <p className="text-xs leading-5 text-ink/65" id="category-helper">
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
              <p className="text-xs leading-5 text-ink/65" id="budget-helper">
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
                className={`${fieldClass} min-h-24 resize-none py-3.5`}
                id="priorities"
                name="priorities"
                onChange={(event) => onChange("priorities", event.target.value)}
                placeholder="Example: must be under 64 inches wide, comfortable for guests, easy to assemble, no velvet"
                value={value.priorities}
              />
              <p
                className="text-xs leading-5 text-ink/65"
                id="important-details-helper"
              >
                Anything else that matters: size limits, must-have features,
                comfort needs, or things you do not want. Hard requirements are
                treated as firm filters.
              </p>
            </div>
          </div>

          {previewItems.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-forest/12 bg-[#eef3e5] px-4 py-4 sm:px-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-forest/70">
                What ReviewRadar will match
              </p>
              <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {previewItems.map((item) => (
                  <li
                    className="flex items-start gap-2 text-sm leading-5 text-ink/70"
                    key={item}
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest"
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

          <div className="mt-7 flex flex-col items-stretch gap-5 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 sm:max-w-sm">
              <Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-forest/60" />
              <p className="text-xs leading-5 text-ink/65">
                Deep research usually takes one to three minutes. Keep this tab
                open; we will show the work as it progresses.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {isLoading ? (
                <Button
                  className="min-h-12 gap-2 rounded-full border-ink/15 bg-white px-5 text-sm font-semibold text-ink/70 shadow-none hover:border-ink/30 hover:bg-mist hover:text-ink"
                  onClick={onCancelSearch}
                  type="button"
                  variant="outline"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                  Cancel search
                </Button>
              ) : null}
              <Button
                className="group min-h-12 gap-2 rounded-full bg-ink px-7 text-base font-semibold text-white shadow-[0_12px_28px_rgba(12,27,22,0.2)] transition-all hover:-translate-y-0.5 hover:bg-forest hover:shadow-[0_16px_32px_rgba(12,27,22,0.24)] disabled:cursor-wait disabled:bg-ink/20 disabled:text-ink/45 disabled:shadow-none"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin"
                  />
                ) : (
                  <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
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

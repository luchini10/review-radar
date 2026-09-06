"use client";

import { useLayoutEffect, useMemo, useRef, type FormEvent } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { formatBudgetInput } from "@/lib/budgetInputFormatting";
import { extractStructuredRequirements } from "@/lib/requirementExtraction";
import type { SearchRequest } from "@/types/review-radar";

type SearchFormProps = {
  isLoading?: boolean;
  fieldErrors?: { category?: string };
  onChange: <K extends keyof SearchRequest>(field: K, value: SearchRequest[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: SearchRequest;
};

export function SearchForm({ isLoading = false, fieldErrors, onChange, onSubmit, value }: SearchFormProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const requirements = useMemo(() => extractStructuredRequirements({
    query: value.category || "product", budget: value.budget || undefined,
    priorities: value.priorities || undefined,
    selectedFeatures: value.selectedFeatures.length ? value.selectedFeatures : undefined,
  }), [value]);

  useLayoutEffect(() => {
    if (!textarea.current) return;
    textarea.current.style.height = "auto";
    textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 320)}px`;
  }, [value.priorities]);

  return (
    <form className="search-form" aria-label="Product search" noValidate onSubmit={onSubmit}>
      <div className="field category-field">
        <div className="field-label"><label htmlFor="category">Product category</label><span>Required</span></div>
        <input className="field-input category-input" id="category" name="category" type="text" autoComplete="off" required
          aria-invalid={fieldErrors?.category ? true : undefined}
          aria-describedby={fieldErrors?.category ? "category-error" : "category-helper"}
          placeholder="What are you looking for?" value={value.category}
          onChange={(event) => onChange("category", event.target.value)} />
        {fieldErrors?.category ? <p className="field-error" id="category-error" role="alert">{fieldErrors.category}</p>
          : <p className="field-hint" id="category-helper">A product type, like noise-cancelling headphones or an office chair.</p>}
      </div>
      <div className="optional-fields">
        <div className="field">
          <div className="field-label"><label htmlFor="budget">Budget</label><span>Optional</span></div>
          <input className="field-input" id="budget" name="budget" type="text" placeholder="e.g. under $300" value={value.budget}
            aria-describedby="budget-helper" onChange={(event) => onChange("budget", formatBudgetInput(event.target.value))} />
          <p className="field-hint" id="budget-helper">Prices in USD. Firm limits exclude over-budget or unverified prices.</p>
        </div>
        <div className="field">
          <div className="field-label"><label htmlFor="priorities">Important Details</label><span>Optional</span></div>
          <textarea ref={textarea} className="field-input details-input" id="priorities" name="priorities" rows={2}
            placeholder="Must-haves, size limits, or anything to avoid." value={value.priorities}
            aria-describedby="details-helper" onChange={(event) => onChange("priorities", event.target.value)} />
          <p className="field-hint" id="details-helper">Be as specific as you like. Hard requirements are treated as firm filters.</p>
        </div>
      </div>
      {requirements.summary.length ? (
        <details className="requirements-disclosure disclosure">
          <summary>Review requirements ({requirements.summary.length})<ChevronDown aria-hidden="true" size={16} /></summary>
          <div className="disclosure-content">
            <p className="field-hint">Here’s how we’ve interpreted your brief. Edit the fields above to make changes.</p>
            <ul className="requirements-list">{requirements.summary.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
          </div>
        </details>
      ) : null}
      <div className="form-actions">
        <p>You can refine your search any time.</p>
        <button className="primary-button" type="submit" disabled={isLoading}>Find products<ArrowRight aria-hidden="true" size={18} /></button>
      </div>
    </form>
  );
}

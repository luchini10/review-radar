"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { ResultsSummary } from "@/components/ResultsSummary";
import { SearchForm } from "@/components/SearchForm";
import {
  getSearchValidationError,
  USER_ERROR_MESSAGES,
} from "@/lib/errorMessages";
import {
  RecommendationClientError,
  runRecommendationRequest,
} from "@/lib/recommendationClient";
import {
  buildRecommendationApiPayload,
  cleanSearchFormInput,
} from "@/lib/searchRequestPayload";
import { smartFeatureCategoryKey } from "@/lib/smartFeatureSelection";
import type {
  SearchRequest,
  SelectionRecommendationResult,
} from "@/types/review-radar";

const initialForm: SearchRequest = {
  category: "",
  budget: "",
  priorities: "",
  selectedFeatures: [],
};

const FRONTEND_SEARCH_TIMEOUT_MS = 90_000;

type SearchFieldErrors = {
  category?: string;
};

const approach = [
  {
    icon: Search,
    title: "Find strong candidates",
    description: "Search mainstream products that fit the request.",
  },
  {
    icon: SlidersHorizontal,
    title: "Enforce what matters",
    description: "Reject wrong types, accessories, duplicates, and hard misses.",
  },
  {
    icon: CheckCircle2,
    title: "Show the shortlist",
    description: "Open the real product page for the details and purchase.",
  },
];

export default function Home() {
  const [form, setForm] = useState<SearchRequest>(initialForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SearchFieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [result, setResult] =
    useState<SelectionRecommendationResult | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const cancelRequested = useRef(false);

  useEffect(() => {
    if (isLoading) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isLoading]);

  function updateField<K extends keyof SearchRequest>(
    field: K,
    value: SearchRequest[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "category" &&
      smartFeatureCategoryKey(String(current.category)) !==
        smartFeatureCategoryKey(String(value))
        ? { selectedFeatures: [] }
        : {}),
    }));
    if (field === "category") setFieldErrors({});
    if (error) setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedFields = new FormData(event.currentTarget);
    const cleanedForm = cleanSearchFormInput({
      ...form,
      budget: String(submittedFields.get("budget") ?? ""),
      category: String(submittedFields.get("category") ?? ""),
      priorities: String(submittedFields.get("priorities") ?? ""),
    }) as SearchRequest;
    const validationError = getSearchValidationError(cleanedForm.category);

    if (validationError) {
      setFieldErrors({ category: validationError });
      setError("");
      setHasSearched(false);
      setResult(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      FRONTEND_SEARCH_TIMEOUT_MS,
    );
    activeRequest.current = controller;
    cancelRequested.current = false;
    setForm(cleanedForm);
    setFieldErrors({});
    setError("");
    setHasSearched(false);
    setResult(null);
    setIsLoading(true);

    try {
      const nextResult = await runRecommendationRequest({
        payload: buildRecommendationApiPayload(cleanedForm),
        signal: controller.signal,
      });
      if (activeRequest.current !== controller) return;
      setResult(nextResult);
      setHasSearched(true);
    } catch (requestError) {
      if (activeRequest.current !== controller) return;
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError" &&
        cancelRequested.current
      ) {
        setError("");
        setHasSearched(false);
        setResult(null);
        return;
      }

      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? USER_ERROR_MESSAGES.slowResponse
          : requestError instanceof RecommendationClientError
            ? requestError.message
            : USER_ERROR_MESSAGES.networkError,
      );
      setHasSearched(false);
      setResult(null);
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        cancelRequested.current = false;
        setIsLoading(false);
      }
    }
  }

  function handleCancelSearch() {
    cancelRequested.current = true;
    activeRequest.current?.abort();
    activeRequest.current = null;
    setIsLoading(false);
    setHasSearched(false);
    setError("");
    setResult(null);
  }

  const showResults = isLoading || hasSearched;

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
        href="#main"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-ink/10 bg-canvas/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between px-5 sm:px-7">
          <a className="group flex items-center gap-3" href="#main">
            <BrandMark className="h-10 w-10 transition-transform duration-300 group-hover:-rotate-6" />
            <span>
              <span className="block text-[17px] font-semibold leading-5 tracking-[-0.03em]">
                ReviewRadar
              </span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/65 sm:block">
                Product matching
              </span>
            </span>
          </a>
          <a
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-forest"
            href="#search"
          >
            Start a search
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="relative" id="main" tabIndex={-1}>
        <div
          aria-hidden="true"
          className="rr-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-48 top-20 -z-10 h-[520px] w-[520px] rounded-full bg-signal/25 blur-[110px]"
        />

        <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 sm:px-7">
          <section className="grid gap-10 pb-12 pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:items-center lg:gap-14 lg:pb-16 lg:pt-24">
            <div className="rr-rise max-w-[760px]">
              <p className="inline-flex items-center gap-2 rounded-full border border-ink/12 bg-paper/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-forest shadow-sm">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Fast, constraint-aware product matching
              </p>
              <h1 className="mt-7 text-balance font-display text-[clamp(3.2rem,6.8vw,6.65rem)] font-semibold leading-[0.94] tracking-[-0.06em]">
                Find the right product.{" "}
                <em className="font-normal text-forest">Skip the report.</em>
              </h1>
              <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-ink/65 sm:text-xl sm:leading-8">
                Tell ReviewRadar what matters. It finds strong products, rejects
                the wrong fits, and gives you a simple ranked shortlist linked to
                real product pages.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {approach.map(({ description, icon: Icon, title }) => (
                  <div
                    className="rounded-2xl border border-ink/10 bg-paper/72 p-4"
                    key={title}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5 text-forest" />
                    <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-ink/60">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rr-rise" id="search" style={{ animationDelay: "100ms" }}>
              <SearchForm
                error={error}
                fieldErrors={fieldErrors}
                isLoading={isLoading}
                onCancelSearch={handleCancelSearch}
                onChange={updateField}
                onSubmit={handleSubmit}
                value={form}
              />
            </div>
          </section>

          {showResults ? (
            <div className="scroll-mt-28 pt-4" ref={resultsRef}>
              <ResultsSummary
                hasSearched={hasSearched}
                isLoading={isLoading}
                result={result}
              />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  FileSearch,
  Radar,
  ShieldCheck,
  Target,
} from "lucide-react";
import { ResultsSummary } from "@/components/ResultsSummary";
import { SearchForm } from "@/components/SearchForm";
import { DirectTerraReport } from "@/components/DirectTerraReport";
import { TwoLayerResults } from "@/components/TwoLayerResultPreview";
import {
  getSearchValidationError,
  USER_ERROR_MESSAGES,
} from "@/lib/errorMessages";
import {
  buildRecommendationApiPayload,
  cleanSearchFormInput,
} from "@/lib/searchRequestPayload";
import {
  cancelTwoLayerRecommendationJob,
  RecommendationClientError,
  runRecommendationRequest,
} from "@/lib/recommendationClient";
import {
  cancelDirectTerraRecommendationJob,
  DirectTerraClientError,
  runDirectTerraRecommendationRequest,
} from "@/lib/directTerraClient";
import { createSearchProgressId } from "@/lib/searchProgress";
import { smartFeatureCategoryKey } from "@/lib/smartFeatureSelection";
import type { DealbreakerStrength } from "@/lib/dealbreakerVisibility";
import type { TwoLayerCompletedResponse } from "@/lib/twoLayerApiContract";
import type { DirectTerraCompletedResponse } from "@/lib/directTerraApiContract";
import type {
  RecommendationResult,
  SearchRequest,
} from "@/types/review-radar";

const initialForm: SearchRequest = {
  category: "",
  budget: "",
  priorities: "",
  selectedFeatures: [],
};

const FRONTEND_RESEARCH_TIMEOUT_MS = 180000;
const DIRECT_TERRA_ENABLED =
  process.env.NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA === "true";

type SearchFieldErrors = {
  category?: string;
};

const trustPoints = [
  {
    description: "Analyzes reviews, prices, features, and tradeoffs",
    icon: FileSearch,
  },
  {
    description: "Ranks the closest matches by fit, quality, and evidence",
    icon: Target,
  },
  {
    description: "Cites sources and flags unverified details",
    icon: ShieldCheck,
  },
];

const thinkingSteps = [
  {
    description:
      "Share the product, your budget, and the details that actually matter to you.",
    title: "Tell it what you need",
  },
  {
    description:
      "It checks reviews, owner discussions, expert tests, videos, and product pages.",
    title: "It researches trusted sources",
  },
  {
    description:
      "It returns ranked picks with tradeoffs, citations, and what to avoid.",
    title: "It gives a clear verdict",
  },
];

const pickPreviews = [
  {
    description: "The closest exact match after hard requirements are checked.",
    icon: BadgeCheck,
    title: "#1 Best Match",
  },
  {
    description: "The next strongest exact match, ranked by product fit.",
    icon: Target,
    title: "#2 Best Match",
  },
  {
    description: "More exact matches if the search has enough strong products.",
    icon: ShieldCheck,
    title: "#3-#7 Best Match",
  },
  {
    description:
      "Separate close options only when fewer exact matches are available.",
    icon: FileSearch,
    title: "Close Matches",
  },
];

export default function Home() {
  const [form, setForm] = useState<SearchRequest>(initialForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SearchFieldErrors>({});
  const [dealbreakerStrength, setDealbreakerStrength] =
    useState<DealbreakerStrength>("balanced");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [twoLayerResult, setTwoLayerResult] =
    useState<TwoLayerCompletedResponse | null>(null);
  const [directTerraResult, setDirectTerraResult] =
    useState<DirectTerraCompletedResponse | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const activeRequest = useRef<{
    controller: AbortController;
    id: number;
    jobToken: string | null;
    pipeline: "current" | "direct_terra";
  } | null>(null);
  const requestId = useRef(0);
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
    if (field === "category" && fieldErrors.category) {
      setFieldErrors((current) => ({
        ...current,
        category: undefined,
      }));
    }
    if (error) {
      setError("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedForm = cleanSearchFormInput(form) as SearchRequest;
    const validationError = getSearchValidationError(cleanedForm.category);

    if (validationError) {
      setFieldErrors({ category: validationError });
      setError("");
      setHasSearched(false);
      setResult(null);
      setTwoLayerResult(null);
      setDirectTerraResult(null);
      setIsLoading(false);
      return;
    }

    setForm(cleanedForm);
    setFieldErrors({});
    setError("");
    setDealbreakerStrength("balanced");
    setHasSearched(false);
    setResult(null);
    setTwoLayerResult(null);
    setDirectTerraResult(null);
    setIsLoading(true);
    const searchProgressId = createSearchProgressId();
    setProgressId(searchProgressId);
    requestId.current += 1;
    cancelRequested.current = false;

    const controller = new AbortController();
    const currentRequestId = requestId.current;
    activeRequest.current = {
      controller,
      id: currentRequestId,
      jobToken: null,
      pipeline: DIRECT_TERRA_ENABLED ? "direct_terra" : "current",
    };
    let timeout = window.setTimeout(() => {
      controller.abort();
    }, FRONTEND_RESEARCH_TIMEOUT_MS);

    try {
      const payload = buildRecommendationApiPayload(cleanedForm, {
        includeExtractedRequirements: !DIRECT_TERRA_ENABLED,
      });
      const onPending = (pending: {
        jobToken: string;
        expiresAtMs: number;
      }) => {
        if (
          currentRequestId !== requestId.current ||
          activeRequest.current?.id !== currentRequestId
        ) {
          return;
        }
        activeRequest.current.jobToken = pending.jobToken;
        window.clearTimeout(timeout);
        timeout = window.setTimeout(
          () => controller.abort(),
          Math.max(1_000, pending.expiresAtMs - Date.now() + 1_000),
        );
      };

      if (DIRECT_TERRA_ENABLED) {
        const directOutcome = await runDirectTerraRecommendationRequest({
          payload,
          signal: controller.signal,
          onPending,
        });

        if (currentRequestId !== requestId.current) return;
        setResult(null);
        setTwoLayerResult(null);
        setDirectTerraResult(directOutcome);
        setHasSearched(true);
        return;
      }

      const outcome = await runRecommendationRequest({
        payload,
        progressId: searchProgressId,
        signal: controller.signal,
        onTwoLayerPending: onPending,
      });

      if (currentRequestId !== requestId.current) {
        return;
      }

      if (outcome.pipeline === "legacy") {
        setResult(outcome.result);
        setTwoLayerResult(null);
        setDirectTerraResult(null);
      } else {
        setResult(null);
        setTwoLayerResult(outcome);
        setDirectTerraResult(null);
      }
      setHasSearched(true);
    } catch (requestError) {
      if (currentRequestId !== requestId.current) {
        return;
      }

      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError" &&
        cancelRequested.current
      ) {
        setError("");
        setHasSearched(false);
        setResult(null);
        setTwoLayerResult(null);
        setDirectTerraResult(null);
        return;
      }

      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? USER_ERROR_MESSAGES.slowResponse
          : requestError instanceof RecommendationClientError
            ? requestError.message
          : requestError instanceof DirectTerraClientError
            ? requestError.message
            : USER_ERROR_MESSAGES.networkError,
      );
      setHasSearched(false);
      setResult(null);
      setTwoLayerResult(null);
      setDirectTerraResult(null);
    } finally {
      window.clearTimeout(timeout);
      if (currentRequestId === requestId.current) {
        activeRequest.current = null;
        cancelRequested.current = false;
        setIsLoading(false);
      }
    }
  }

  function handleCancelSearch() {
    cancelRequested.current = true;
    const request = activeRequest.current;
    request?.controller.abort();
    if (request?.jobToken) {
      if (request.pipeline === "direct_terra") {
        void cancelDirectTerraRecommendationJob({ jobToken: request.jobToken });
      } else {
        void cancelTwoLayerRecommendationJob({ jobToken: request.jobToken });
      }
    }
    setIsLoading(false);
    setHasSearched(false);
    setFieldErrors({});
    setError("");
    setResult(null);
    setTwoLayerResult(null);
    setDirectTerraResult(null);
  }

  const showResults =
    isLoading ||
    (hasSearched &&
      (result !== null || twoLayerResult !== null || directTerraResult !== null));
  const showMarketing = !showResults;

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        href="#main"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f7f8fa]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <a className="flex items-center gap-2.5" href="#main">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white">
              <Radar aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-950">
              ReviewRadar
            </span>
          </a>
          <nav
            aria-label="Main"
            className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex"
          >
            <a className="transition-colors hover:text-slate-950" href="#how-it-works">
              How it works
            </a>
            <a className="transition-colors hover:text-slate-950" href="#top-picks">
              What you get
            </a>
            <a className="transition-colors hover:text-slate-950" href="#results">
              Results
            </a>
          </nav>
        </div>
      </header>

      <main className="relative" id="main">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(65%_55%_at_50%_0%,rgba(37,99,235,0.08),transparent)]"
        />

        <div className="mx-auto w-full max-w-6xl px-5 pb-16">
          <section className="mx-auto max-w-3xl pt-14 text-center sm:pt-20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
              Evidence-first product research
            </p>
            <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.12] tracking-tight text-slate-950 sm:text-6xl">
              Find the products people{" "}
              <em className="text-blue-700">actually recommend.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg">
              ReviewRadar reads real-world reviews, expert tests, forums, and
              product pages for you — then returns ranked, cited picks instead
              of another wall of search results.
            </p>
            <ul className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
              {trustPoints.map((point) => {
                const Icon = point.icon;

                return (
                  <li
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"
                    key={point.description}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 text-blue-700" />
                    {point.description}
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-label="Search" className="mx-auto mt-9 w-full max-w-5xl">
            <SearchForm
              error={error}
              fieldErrors={fieldErrors}
              isLoading={isLoading}
              onCancelSearch={handleCancelSearch}
              onChange={updateField}
              onSubmit={handleSubmit}
              value={form}
            />
          </section>

          {showResults ? (
            <section
              className="mx-auto mt-12 w-full max-w-5xl scroll-mt-24"
              id="results"
              ref={resultsRef}
            >
              {!isLoading && directTerraResult ? (
                <DirectTerraReport result={directTerraResult} />
              ) : !isLoading && twoLayerResult ? (
                <TwoLayerResults
                  cards={twoLayerResult.cards}
                  sources={twoLayerResult.sources}
                />
              ) : (
                <ResultsSummary
                  dealbreakerStrength={dealbreakerStrength}
                  hasSearched={hasSearched}
                  isLoading={isLoading}
                  onDealbreakerStrengthChange={setDealbreakerStrength}
                  progressId={progressId}
                  result={result}
                />
              )}
            </section>
          ) : null}

          {showMarketing ? (
            <>
              <section
                className="mx-auto mt-16 w-full max-w-5xl scroll-mt-24"
                id="how-it-works"
              >
                <h2 className="text-center font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  How it works
                </h2>
                <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-200/60 shadow-sm md:grid-cols-3">
                  {thinkingSteps.map((step, index) => (
                    <div className="bg-white p-6" key={step.title}>
                      <span className="font-display text-3xl font-semibold text-slate-300">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="mt-3 text-sm font-semibold text-slate-950">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section
                className="mx-auto mt-14 w-full max-w-5xl scroll-mt-24"
                id="top-picks"
              >
                <h2 className="text-center font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Top picks you will get
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-slate-600">
                  Every search aims to show up to seven exact Best Matches,
                  each explained and cited. Close matches appear only when
                  fewer exact matches are available.
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {pickPreviews.map((preview) => {
                    const Icon = preview.icon;

                    return (
                      <div
                        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                        key={preview.title}
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                          <Icon aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <h3 className="mt-3.5 text-sm font-semibold text-slate-950">
                          {preview.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-5 text-slate-600">
                          {preview.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-950 text-white">
              <Radar aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950">ReviewRadar</p>
              <p className="text-xs text-slate-500">
                Built to reduce review overload.
              </p>
            </div>
          </div>
          <p className="max-w-md text-xs leading-5 text-slate-500">
            ReviewRadar compares product recommendations across public sources
            and cites where each claim came from. Always verify price,
            availability, warranty, and return policy before buying.
          </p>
        </div>
      </footer>
    </div>
  );
}

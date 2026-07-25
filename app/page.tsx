"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  FileSearch,
  Fingerprint,
  Layers3,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ResultsSummary } from "@/components/ResultsSummary";
import { SearchForm } from "@/components/SearchForm";
import { DirectTerraReport } from "@/components/DirectTerraReport";
import { TwoLayerResults } from "@/components/TwoLayerResultPreview";
import { StagedTerraResults } from "@/components/StagedTerraResults";
import {
  getSearchValidationError,
  USER_ERROR_MESSAGES,
} from "@/lib/errorMessages";
import {
  buildRecommendationApiPayload,
  cleanSearchFormInput,
} from "@/lib/searchRequestPayload";
import {
  cancelRecommendationJob,
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
import type { StagedTerraCompletedResponse } from "@/lib/stagedTerraApiContract";
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
const STAGED_TERRA_ENABLED =
  !DIRECT_TERRA_ENABLED &&
  process.env.NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA === "true";

type SearchFieldErrors = {
  category?: string;
};

const trustPoints = [
  {
    description: "Cross-checks the sources shoppers actually use",
    icon: FileSearch,
  },
  {
    description: "Keeps your non-negotiables non-negotiable",
    icon: Target,
  },
  {
    description: "Shows what is known, uncertain, and worth checking",
    icon: ShieldCheck,
  },
];

const thinkingSteps = [
  {
    description:
      "Set the product, price range, and the details you refuse to compromise on.",
    title: "Frame the decision",
  },
  {
    description:
      "ReviewRadar maps expert tests, owner experience, product pages, and the evidence behind each claim.",
    title: "Let the radar work",
  },
  {
    description:
      "Get a ranked briefing that leads with fit, tradeoffs, confidence, and the sources that support it.",
    title: "Choose with clarity",
  },
];

const pickPreviews = [
  {
    description: "A clear first choice tied directly to your research brief.",
    icon: BadgeCheck,
    title: "The answer first",
  },
  {
    description: "Why each pick fits, where it falls short, and who should skip it.",
    icon: Layers3,
    title: "Tradeoffs in context",
  },
  {
    description: "Claims stay connected to evidence instead of floating as AI copy.",
    icon: ShieldCheck,
    title: "Visible trust states",
  },
  {
    description:
      "Unknowns, weak signals, and near misses stay visible so confidence is earned.",
    icon: Fingerprint,
    title: "Honest uncertainty",
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
  const [twoLayerResult, setTwoLayerResult] = useState<
    TwoLayerCompletedResponse | StagedTerraCompletedResponse | null
  >(null);
  const [directTerraResult, setDirectTerraResult] =
    useState<DirectTerraCompletedResponse | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const activeRequest = useRef<{
    controller: AbortController;
    id: number;
    jobToken: string | null;
    pipeline: "current" | "direct_terra" | "staged_terra";
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
      pipeline: DIRECT_TERRA_ENABLED
        ? "direct_terra"
        : STAGED_TERRA_ENABLED
          ? "staged_terra"
          : "current",
    };
    let timeout = window.setTimeout(() => {
      controller.abort();
    }, FRONTEND_RESEARCH_TIMEOUT_MS);

    try {
      const payload = buildRecommendationApiPayload(cleanedForm, {
        includeExtractedRequirements:
          !DIRECT_TERRA_ENABLED && !STAGED_TERRA_ENABLED,
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
          progressId: searchProgressId,
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
        onStagedTerraPending: onPending,
        stagedTerra: STAGED_TERRA_ENABLED,
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
      } else if (request.pipeline !== "staged_terra") {
        void cancelRecommendationJob({
          jobToken: request.jobToken,
        });
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
              <span className="block text-[17px] font-semibold leading-5 tracking-[-0.03em]">ReviewRadar</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/65 sm:block">Decision intelligence</span>
            </span>
          </a>
          <nav
            aria-label="Main"
            className="hidden items-center gap-8 text-[13px] font-semibold text-ink/64 md:flex"
          >
            {showMarketing ? (
              <>
                <a className="transition-colors hover:text-ink" href="#how-it-works">
                  How it works
                </a>
                <a className="transition-colors hover:text-ink" href="#top-picks">
                  The decision brief
                </a>
              </>
            ) : null}
            <a className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-forest" href="#research">
              {showMarketing ? "Start research" : "Start new research"}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </nav>
        </div>
      </header>

      <main className="relative" id="main" tabIndex={-1}>
        <div
          aria-hidden="true"
          className="rr-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-20 -z-10 h-[520px] w-[520px] rounded-full bg-signal/25 blur-[110px]" />

        <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 sm:px-7">
          <section className={`grid gap-10 pb-12 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:items-center lg:gap-14 lg:pb-16 lg:pt-24 ${showMarketing ? "" : "lg:grid-cols-1 lg:pb-8 lg:pt-14"}`}>
            <div className="rr-rise max-w-[760px]">
              <p className="inline-flex items-center gap-2 rounded-full border border-ink/12 bg-paper/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-forest shadow-sm">
                <span className="rr-pulse h-2 w-2 rounded-full bg-forest" />
                Evidence-first product research
              </p>
              <h1 className={`mt-7 text-balance font-display font-semibold leading-[0.94] tracking-[-0.06em] ${showMarketing ? "text-[clamp(3.2rem,6.8vw,6.65rem)]" : "text-5xl sm:text-6xl"}`}>
                Find the products people{" "}
                <em className="font-normal text-forest">actually recommend.</em>
              </h1>
              <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-ink/65 sm:text-xl sm:leading-8">
                Go from a messy buying question to a ranked, cited decision brief.
                ReviewRadar does the review trawling, constraint checking, and
                tradeoff mapping so you can choose with confidence.
              </p>
              <ul className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {trustPoints.map((point) => {
                const Icon = point.icon;

                return (
                  <li
                    className="flex items-start gap-2.5 text-[13px] font-medium leading-5 text-ink/64"
                    key={point.description}
                  >
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-signal">
                      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    {point.description}
                  </li>
                );
              })}
              </ul>
            </div>

            {showMarketing ? (
              <div className="rr-rise relative mx-auto hidden w-full max-w-[540px] sm:block lg:justify-self-end" style={{ animationDelay: "120ms" }}>
                <div className="absolute -inset-4 -z-10 rounded-[2.6rem] border border-ink/5 bg-white/35 shadow-[0_30px_100px_rgba(12,27,22,0.12)]" />
                <div className="relative min-h-[490px] overflow-hidden rounded-[2rem] bg-ink p-6 text-white shadow-[0_32px_80px_rgba(12,27,22,0.25)] sm:p-8">
                  <div aria-hidden="true" className="rr-radar absolute -right-24 -top-20 h-[360px] w-[360px] rounded-full opacity-80" />
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <BrandMark className="h-9 w-9" inverted />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">Live research view</p>
                        <p className="text-sm font-semibold">Decision signal</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-signal">Source-bound</span>
                  </div>
                  <div className="relative mt-16 max-w-md">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.19em] text-signal">Your brief</p>
                    <p className="mt-3 font-display text-3xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-4xl">The right product, for the way you will actually use it.</p>
                    <p className="mt-4 text-sm leading-6 text-white/58">Constraints stay firm. Tradeoffs stay visible. Every useful claim keeps a path back to its source.</p>
                  </div>
                  <div className="relative mt-10 grid gap-2.5">
                    {[
                      [ScanSearch, "Reviews and expert tests", "Cross-checked"],
                      [FileCheck2, "Your hard requirements", "Mapped"],
                      [Sparkles, "Decision-ready shortlist", "Ranked"],
                    ].map(([Icon, label, state]) => {
                      const SignalIcon = Icon as typeof ScanSearch;
                      return (
                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3.5 backdrop-blur transition-colors hover:bg-white/[0.09]" key={label as string}>
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-signal text-ink"><SignalIcon aria-hidden="true" className="h-[18px] w-[18px]" /></span>
                          <span className="min-w-0 flex-1 text-sm font-medium text-white/78">{label as string}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-signal">{state as string}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section aria-label="Search" className="mx-auto w-full max-w-[1120px] scroll-mt-28" id="research">
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
              className="mx-auto mt-14 w-full max-w-[1180px] scroll-mt-28 rr-rise"
              id="results"
              ref={resultsRef}
            >
              <p className="sr-only" role="status">
                {isLoading ? "Research in progress." : "Research results ready."}
              </p>
              {!isLoading && directTerraResult ? (
                <DirectTerraReport result={directTerraResult} />
              ) : !isLoading && twoLayerResult?.pipeline === "staged_terra" ? (
                <StagedTerraResults result={twoLayerResult} />
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
                className="mx-auto mt-24 w-full max-w-[1120px] scroll-mt-28 sm:mt-32"
                id="how-it-works"
              >
                <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
                  <div className="lg:sticky lg:top-28 lg:self-start">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-forest">A better research loop</p>
                    <h2 className="mt-3 text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">Less tab chaos. More decision clarity.</h2>
                    <p className="mt-5 max-w-md text-sm leading-7 text-ink/60 sm:text-base">ReviewRadar is designed around the buying decision—not the chat. It asks for the signal that matters, does the long-form research, then brings the conclusion forward.</p>
                  </div>
                  <ol className="overflow-hidden rounded-[2rem] border border-ink/10 bg-paper shadow-[0_24px_70px_rgba(12,27,22,0.08)]">
                    {thinkingSteps.map((step, index) => (
                      <li className="group grid gap-5 border-b border-ink/10 p-6 last:border-0 sm:grid-cols-[86px_minmax(0,1fr)] sm:p-8" key={step.title}>
                        <span className="font-display text-5xl font-semibold leading-none text-ink/50 transition-colors group-hover:text-forest">{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <h3 className="text-lg font-semibold tracking-[-0.02em]">{step.title}</h3>
                          <p className="mt-2 max-w-xl text-sm leading-7 text-ink/60">{step.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              <section
                className="mx-auto mt-24 w-full max-w-[1120px] scroll-mt-28 sm:mt-32"
                id="top-picks"
              >
                <div className="rounded-[2.2rem] bg-ink px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
                  <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-signal">The decision brief</p>
                      <h2 className="mt-3 text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-5xl">Complex research, shaped into a clear call.</h2>
                    </div>
                    <p className="max-w-xl text-sm leading-7 text-white/56 sm:text-base">You get the shortest useful version first, with the full reasoning and source trail close at hand. Exact matches lead; close options stay clearly separated.</p>
                  </div>
                  <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {pickPreviews.map((preview) => {
                    const Icon = preview.icon;

                    return (
                      <article
                        className="group min-h-52 rounded-2xl border border-white/10 bg-white/[0.055] p-5 transition-all hover:-translate-y-1 hover:border-signal/35 hover:bg-white/[0.08]"
                        key={preview.title}
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-signal text-ink">
                          <Icon aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <h3 className="mt-8 text-base font-semibold">
                          {preview.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-white/52">
                          {preview.description}
                        </p>
                      </article>
                    );
                  })}
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-ink/10 bg-paper">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-5 py-10 sm:px-7 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em]">ReviewRadar</p>
              <p className="mt-0.5 text-xs text-ink/65">Clarity before checkout.</p>
            </div>
          </div>
          <div className="grid max-w-2xl gap-3 text-xs leading-5 text-ink/65 sm:grid-cols-2 sm:gap-8">
            <p>Evidence is surfaced, uncertainty is labeled, and unsupported confidence is never the product.</p>
            <p>Always confirm current price, availability, warranty, and return policy before purchasing.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

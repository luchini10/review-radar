"use client";

import { FormEvent, useState } from "react";
import {
  BadgeCheck,
  Ban,
  ListChecks,
  MessageCircle,
  Radar,
  Scale,
  Search,
  ShieldCheck,
  Target,
} from "lucide-react";
import { ResultsSummary } from "@/components/ResultsSummary";
import { SearchForm } from "@/components/SearchForm";
import {
  getSearchValidationError,
  USER_ERROR_MESSAGES,
} from "@/lib/errorMessages";
import type {
  RecommendationApiResponse,
  RecommendationResult,
  SearchRequest,
} from "@/types/review-radar";

const initialForm: SearchRequest = {
  category: "",
  budget: "",
  useCase: "",
  dealBreaker: "",
};

const FRONTEND_RESEARCH_TIMEOUT_MS = 90000;

const quickSearches = [
  {
    label: "Cordless vacuum for pet hair",
    value: {
      budget: "",
      category: "cordless vacuum",
      dealBreaker: "weak suction, poor battery life",
      useCase: "pet hair",
    },
  },
  {
    label: "27 inch 4K monitor under $250",
    value: {
      budget: "under $250",
      category: "27 inch 4K monitor",
      dealBreaker: "bad color accuracy, poor warranty",
      useCase: "home office",
    },
  },
  {
    label: "Air purifier for dog hair",
    value: {
      budget: "",
      category: "air purifier",
      dealBreaker: "loud fan, expensive filters",
      useCase: "dog hair and odors",
    },
  },
  {
    label: "Coffee maker under $200",
    value: {
      budget: "under $200",
      category: "coffee maker",
      dealBreaker: "hard to clean, weak coffee",
      useCase: "daily home coffee",
    },
  },
  {
    label: "Office chair for back pain",
    value: {
      budget: "",
      category: "office chair",
      dealBreaker: "poor lumbar support, bad return policy",
      useCase: "back pain and long workdays",
    },
  },
] satisfies {
  label: string;
  value: SearchRequest;
}[];

const checkItems = [
  {
    description: "Find recurring issues before you buy.",
    icon: MessageCircle,
    title: "Checks common complaints",
  },
  {
    description: "Weighs reviews, tests, forums, and expert opinions.",
    icon: Scale,
    title: "Compares source consensus",
  },
  {
    description: "Shows how confident each pick should feel.",
    icon: ShieldCheck,
    title: "Scores confidence",
  },
  {
    description: "Highlights deal breakers so you can skip weak picks.",
    icon: Ban,
    title: "Shows what to avoid",
  },
];

const thinkingSteps = [
  {
    description: "Share your goals, budget, and must-haves.",
    title: "Tell it what you need",
  },
  {
    description: "It checks reviews, forums, tests, videos, and sources.",
    title: "It researches trusted sources",
  },
  {
    description: "It returns ranked picks, confidence, and what to avoid.",
    title: "It gives a clear verdict",
  },
];

const pickPreviews = [
  {
    description: "The strongest all-around recommendation.",
    icon: BadgeCheck,
    title: "Best Overall",
  },
  {
    description: "The cheapest option that is still worth buying.",
    icon: Target,
    title: "Best Budget",
  },
  {
    description: "The best balance of price, quality, and reliability.",
    icon: Scale,
    title: "Best Value",
  },
  {
    description: "The higher-end option for people willing to spend more.",
    icon: ShieldCheck,
    title: "Best Premium",
  },
  {
    description: "A backup pick if the top choice is unavailable.",
    icon: ListChecks,
    title: "Best Alternative",
  },
];

export default function Home() {
  const [form, setForm] = useState<SearchRequest>(initialForm);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);

  function updateField(field: keyof SearchRequest, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) {
      setError("");
    }
  }

  function applyQuickSearch(value: SearchRequest) {
    setForm(value);
    setError("");
    setResult(null);
    setHasSearched(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = getSearchValidationError(form.category);

    if (validationError) {
      setError(validationError);
      setHasSearched(false);
      setResult(null);
      setIsLoading(false);
      return;
    }

    setError("");
    setHasSearched(false);
    setResult(null);
    setIsLoading(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
    }, FRONTEND_RESEARCH_TIMEOUT_MS);

    try {
      const response = await fetch("/api/recommendations", {
        body: JSON.stringify({
          query: form.category,
          budget: form.budget || undefined,
          useCase: form.useCase || undefined,
          dealBreakers: form.dealBreaker || undefined,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      });

      const data = (await response.json()) as RecommendationApiResponse;

      if (!response.ok || "error" in data) {
        setError(
          "error" in data
            ? data.error
            : "Something went wrong while researching recommendations.",
        );
        setHasSearched(false);
        return;
      }

      setResult(data.result);
      setHasSearched(true);
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? USER_ERROR_MESSAGES.slowResponse
          : USER_ERROR_MESSAGES.networkError,
      );
      setHasSearched(false);
    } finally {
      window.clearTimeout(timeout);
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-0 h-[430px] overflow-hidden">
        <div className="absolute -left-32 top-12 h-80 w-80 rounded-full border border-blue-100" />
        <div className="absolute -left-20 top-20 h-56 w-56 rounded-full border border-blue-100" />
        <div className="absolute -right-32 top-12 h-80 w-80 rounded-full border border-blue-100" />
        <div className="absolute -right-20 top-20 h-56 w-56 rounded-full border border-blue-100" />
      </div>

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-blue-200 bg-blue-50 text-blue-600">
              <Radar aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="flex items-center gap-3">
              <p className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                ReviewRadar
              </p>
              <span className="hidden rounded-full border border-blue-200 bg-white px-3 py-1 text-sm font-medium text-blue-600 sm:inline-flex">
                AI product research
              </span>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
            <a className="transition hover:text-blue-600" href="#how-it-works">
              How it works
            </a>
            <a className="transition hover:text-blue-600" href="#checks">
              What it checks
            </a>
            <a className="transition hover:text-blue-600" href="#results">
              Results
            </a>
          </nav>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-12 pt-8">
        <section className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            ReviewRadar
          </p>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-6xl">
            Find the products people{" "}
            <span className="text-blue-600">actually recommend.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Compare real-world reviews, expert testing, forums, videos, and
            common complaints before you decide what to buy.
          </p>
        </section>

        <section className="mx-auto mt-8 w-full max-w-6xl">
          <SearchForm
            error={error}
            isLoading={isLoading}
            onChange={updateField}
            onSubmit={handleSubmit}
            value={form}
          />
        </section>

        <section
          aria-label="Quick search examples"
          className="mx-auto mt-4 flex w-full max-w-6xl flex-wrap justify-center gap-2"
        >
          {quickSearches.map((quickSearch) => (
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-blue-200 bg-white px-4 text-sm font-medium text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              key={quickSearch.label}
              onClick={() => applyQuickSearch(quickSearch.value)}
              type="button"
            >
              <Search aria-hidden="true" className="h-4 w-4" />
              {quickSearch.label}
            </button>
          ))}
        </section>

        <section
          className="mx-auto mt-6 grid w-full max-w-6xl gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4"
          id="checks"
        >
          {checkItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                className="flex items-start gap-3 border-slate-200 px-1 md:border-r md:last:border-r-0"
                key={item.title}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        <section
          className="mx-auto mt-8 grid w-full max-w-5xl gap-4 text-center md:grid-cols-3"
          id="how-it-works"
        >
          {thinkingSteps.map((step, index) => (
            <div className="grid justify-items-center gap-3" key={step.title}>
              <span className="grid h-12 w-12 place-items-center rounded-full border border-blue-200 bg-white text-lg font-semibold text-blue-600 shadow-sm">
                {index + 1}
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  {step.title}
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section className="mx-auto mt-8 w-full max-w-6xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-950">
            Top picks you will get
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {pickPreviews.map((preview) => {
              const Icon = preview.icon;

              return (
                <div
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  key={preview.title}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-slate-950">
                    {preview.title}
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-slate-600">
                    {preview.description}
                  </p>
                  <div className="mt-4 grid gap-2">
                    <span className="h-2 rounded-full bg-slate-100" />
                    <span className="h-2 rounded-full bg-slate-100" />
                    <span className="h-2 w-3/4 rounded-full bg-slate-100" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto mt-10 w-full max-w-6xl" id="results">
          <ResultsSummary
            hasSearched={hasSearched}
            isLoading={isLoading}
            result={result}
          />
        </section>

        <p className="mx-auto mt-8 max-w-4xl text-center text-sm leading-6 text-slate-500">
          ReviewRadar compares product recommendations across public sources.
          Always verify price, availability, warranty, and return policy before
          buying.
        </p>
      </div>
    </main>
  );
}

"use client";

import { FormEvent, useState } from "react";
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

const FRONTEND_RESEARCH_TIMEOUT_MS = 45000;

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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">
              ReviewRadar
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              ReviewRadar
            </h1>
          </div>
          <p className="max-w-md text-base leading-7 text-slate-300">
            Find the products people actually recommend.
          </p>
        </header>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
          <SearchForm
            error={error}
            isLoading={isLoading}
            onChange={updateField}
            onSubmit={handleSubmit}
            value={form}
          />
          <ResultsSummary
            hasSearched={hasSearched}
            isLoading={isLoading}
            result={result}
          />
        </section>
      </div>
    </main>
  );
}

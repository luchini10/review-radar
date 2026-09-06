"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DiscoveryHero } from "@/components/DiscoveryHero";
import { ResultsSummary } from "@/components/ResultsSummary";
import { SearchForm } from "@/components/SearchForm";
import { getSearchValidationError, USER_ERROR_MESSAGES } from "@/lib/errorMessages";
import { RecommendationClientError, runRecommendationRequest } from "@/lib/recommendationClient";
import { buildRecommendationApiPayload, cleanSearchFormInput } from "@/lib/searchRequestPayload";
import type { SearchRequest, SelectionRecommendationResult } from "@/types/review-radar";

const initialForm: SearchRequest = { category: "", budget: "", priorities: "", selectedFeatures: [] };
const FRONTEND_SEARCH_TIMEOUT_MS = 90_000;

export default function Home() {
  const [form, setForm] = useState<SearchRequest>(initialForm);
  const [submittedBrief, setSubmittedBrief] = useState<SearchRequest | null>(null);
  const [view, setView] = useState<"form" | "results">("form");
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SelectionRecommendationResult | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const focusTarget = useRef<string | null>(null);
  const howItWorks = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!focusTarget.current) return;
    const targetId = focusTarget.current;
    const target = document.getElementById(targetId);
    focusTarget.current = null;
    target?.focus({ preventScroll: true });
    (targetId === "results-heading" ? document.getElementById("results-panel") : target)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }, [view, isLoading, result, error, categoryError]);

  useEffect(() => () => {
    activeRequest.current?.abort();
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  function updateField<K extends keyof SearchRequest>(field: K, value: SearchRequest[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    if (field === "category") setCategoryError("");
  }

  async function search(brief: SearchRequest) {
    // Keep a single request in flight, including rapid keyboard submissions.
    if (activeRequest.current) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FRONTEND_SEARCH_TIMEOUT_MS);
    timeoutRef.current = timeout;
    activeRequest.current = controller;
    setSubmittedBrief(brief);
    setForm(brief);
    setCategoryError("");
    setError("");
    setResult(null);
    setIsLoading(true);
    setView("results");
    setAnnouncement("Search started. Researching product recommendations.");
    focusTarget.current = "results-heading";

    try {
      const nextResult = await runRecommendationRequest({ payload: buildRecommendationApiPayload(brief), signal: controller.signal });
      if (activeRequest.current !== controller) return;
      setResult(nextResult);
      setAnnouncement(nextResult.recommendations.length
        ? `${nextResult.recommendations.length} product ${nextResult.recommendations.length === 1 ? "match" : "matches"} found.`
        : "Search complete. No recommendations found.");
    } catch (requestError) {
      if (activeRequest.current !== controller) return;
      setError(requestError instanceof DOMException && requestError.name === "AbortError"
        ? USER_ERROR_MESSAGES.slowResponse
        : requestError instanceof RecommendationClientError ? requestError.message : USER_ERROR_MESSAGES.networkError);
      setAnnouncement("Search interrupted. Your search details have been kept.");
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        timeoutRef.current = null;
        setIsLoading(false);
        // Do not steal focus from someone reading the brief while the request ran.
        if (document.activeElement?.id === "results-heading" || document.activeElement?.id === "cancel-search") {
          focusTarget.current = "results-heading";
        }
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const brief = cleanSearchFormInput({ ...form,
      category: String(fields.get("category") ?? form.category),
      budget: String(fields.get("budget") ?? form.budget),
      priorities: String(fields.get("priorities") ?? form.priorities),
    }) as SearchRequest;
    const validationError = getSearchValidationError(brief.category);
    if (validationError) {
      setCategoryError(validationError);
      document.getElementById("category")?.focus();
      return;
    }
    void search(brief);
  }

  function cancelSearch() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setIsLoading(false);
    setError("");
    setView("form");
    setSubmittedBrief(null);
    setAnnouncement("Search cancelled. Your search details have been kept.");
    focusTarget.current = "category";
  }

  function editSearch() {
    setView("form");
    const category = document.getElementById("category");
    category?.focus({ preventScroll: true });
    category?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }

  function newSearch() {
    setForm(initialForm);
    setSubmittedBrief(null);
    setResult(null);
    setError("");
    setCategoryError("");
    setView("form");
    setAnnouncement("New search. Enter a product category.");
    focusTarget.current = "category";
  }

  return (
    <div className="app-shell landing-view">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="header-content">
          <a className="brand" href="#main" aria-label="ReviewRadar">
            <span>Review<span className="brand-blue">Radar</span></span><span className="brand-radar" aria-hidden="true" />
          </a>
          <a className="text-action" href="#how-it-works" onClick={() => {
            if (howItWorks.current) howItWorks.current.open = true;
          }}>How it works</a>
        </div>
      </header>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      <main id="main" tabIndex={-1} className="main-content">

          <div className="search-workspace view-enter">
            <DiscoveryHero>
              {result && view === "form" ? <button className="text-action back-action" onClick={() => {
                setView("results"); focusTarget.current = "results-heading";
              }}><ArrowLeft aria-hidden="true" size={16} />Back to results</button> : null}
            <SearchForm fieldErrors={{ category: categoryError }} onChange={updateField} onSubmit={handleSubmit} value={form} isLoading={isLoading} />
            </DiscoveryHero>
          </div>
        {submittedBrief ? (
          <section id="results-panel" className="results-panel" aria-label="Search results">
          <ResultsSummary brief={submittedBrief} error={error} isLoading={isLoading} onCancel={cancelSearch}
            onEdit={editSearch} onNewSearch={newSearch} onRetry={() => void search(submittedBrief)} result={result} />
          </section>
        ) : null}
      </main>
      <footer className="site-footer" id="how-it-works">
        <details className="how-disclosure" ref={howItWorks}>
          <summary>How ReviewRadar finds your shortlist <ArrowRight aria-hidden="true" size={16} /></summary>
          <div className="how-content">
            <div><h2>Start with what matters.</h2><p>Choose a product, then add a budget or requirements.</p></div>
            <div><h2>Get a focused shortlist.</h2><p>We research quality, performance and popularity, guided by your budget and preferences.</p></div>
            <div><h2>Take a closer look.</h2><p>Open the product page for full specifications, availability and the latest price before you buy.</p></div>
          </div>
        </details>
      </footer>
    </div>
  );
}

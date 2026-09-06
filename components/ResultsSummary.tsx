"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, LoaderCircle, Search } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { selectedSmartFeatureLabel, selectedSmartFeatureKey } from "@/lib/smartFeatureSelection";
import type { SearchRequest, SelectionRecommendationResult } from "@/types/review-radar";

function SearchProgress({ onCancel }: { onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const interval = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, []);
  return (
    <div className="search-progress">
      <div className="progress-heading"><LoaderCircle className="activity-indicator" aria-hidden="true" size={24} />
        <h2 id="results-heading" tabIndex={-1}>{elapsed >= 30 ? "Still finding your matches" : "Finding your matches"}</h2>
      </div>
      <p>{elapsed >= 30 ? "This is taking a little longer. You can keep waiting or cancel to adjust your search." : "Researching quality, performance and popularity for your request."}</p>
      <div className="progress-actions"><span className="elapsed-time" aria-label={`${elapsed} seconds elapsed`}>{elapsed}s elapsed</span>
        <button id="cancel-search" className="text-action" type="button" onClick={onCancel}>Cancel search</button></div>
    </div>
  );
}

function LoadingCards() {
  return <div className="product-grid loading-grid" aria-hidden="true">{[0, 1, 2, 3, 4].map((index) =>
    <div className="loading-card" key={index}><div className="loading-lines"><span /><span /><span /></div></div>,
  )}</div>;
}

export function ResultsSummary({ brief, error, isLoading, onCancel, onEdit, onNewSearch, onRetry, result }: {
  brief: SearchRequest;
  error: string;
  isLoading: boolean;
  onCancel: () => void;
  onEdit: () => void;
  onNewSearch: () => void;
  onRetry: () => void;
  result: SelectionRecommendationResult | null;
}) {
  const count = result?.recommendations.length ?? 0;
  return (
    <div className="results-workspace view-enter">
      <div className="results-topline"><h2>Your shortlist.</h2>
        {!isLoading ? <button className="text-action" type="button" onClick={onNewSearch}>New search</button> : null}</div>
      <section className="search-brief" aria-label="Your search">
        <div className="brief-main"><div><p className="brief-label">Your search</p><p className="brief-category">{brief.category}</p>
          {brief.budget ? <p className="brief-budget">Budget: <span>{brief.budget}</span></p> : null}</div>
          {!isLoading ? <button className="secondary-button" type="button" onClick={onEdit}>Edit search</button> : null}</div>
        <details className="brief-disclosure disclosure"><summary>Search details<ChevronDown aria-hidden="true" size={16} /></summary>
          <div className="disclosure-content brief-details">
            {brief.priorities ? <div><h2>Important Details</h2><p>{brief.priorities}</p></div> : null}
            {brief.selectedFeatures.length ? <div><h2>Selected features</h2><ul className="requirements-list">{brief.selectedFeatures.map((feature) =>
              <li key={selectedSmartFeatureKey(feature)}>{selectedSmartFeatureLabel(feature)}</li>,
            )}</ul></div> : null}
            {!brief.priorities && !brief.selectedFeatures.length ? <p>No additional requirements. You can add details by editing your search.</p> : null}
          </div>
        </details>
      </section>
      <section className="results-content" aria-label="Product matches" aria-busy={isLoading}>
        {isLoading ? <><SearchProgress onCancel={onCancel} /><LoadingCards /></> : error ? (
          <div className="outcome-state error-state view-enter">
            <div role="alert"><h2 id="results-heading" tabIndex={-1}>Search interrupted</h2><p>{error}</p></div>
            <p className="outcome-hint">Your search details are ready to try again.</p>
            <button className="primary-button" type="button" onClick={onRetry}>Try again</button>
          </div>
        ) : count ? (
          <div className="view-enter">
            <div className="matches-heading"><h2 id="results-heading" tabIndex={-1}>Top product matches</h2><p>{count} {count === 1 ? "product" : "products"}, ranked for your search</p></div>
            <div className="product-grid">{result!.recommendations.map((product) =>
              <ProductCard key={`${product.name}|${product.productPageUrl}`} product={product} />,
            )}</div>
            <p className="results-note">Prices may change. Check the product page for full details and availability.</p>
          </div>
        ) : (
          <div className="outcome-state view-enter"><Search className="empty-icon" aria-hidden="true" size={30} />
            <h2 id="results-heading" tabIndex={-1}>No recommendations found</h2>
            <p>Try a more specific product category or adjust your preferences.</p>
            <p className="outcome-hint">Your requirements stay in place until you change them.</p>
            <button className="primary-button" type="button" onClick={onEdit}><ArrowLeft aria-hidden="true" size={16} />Adjust requirements</button>
          </div>
        )}
      </section>
    </div>
  );
}

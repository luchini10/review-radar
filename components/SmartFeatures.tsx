"use client";

import { useState } from "react";
import { LoaderCircle, SlidersHorizontal, Sparkles, X } from "lucide-react";
import type {
  SmartFeature,
  SmartFeatureResponse,
} from "@/types/smart-features";

type SmartFeaturesProps = {
  productCategory: string;
  selectedFeatures: string[];
  onChange: (features: string[]) => void;
};

export default function SmartFeatures({
  productCategory,
  selectedFeatures,
  onChange,
}: SmartFeaturesProps) {
  const [features, setFeatures] = useState<SmartFeature[]>([]);
  const [cachedFeatures, setCachedFeatures] = useState<
    Record<string, SmartFeature[]>
  >({});
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const cleanCategory = productCategory.trim();
  const canGenerate = cleanCategory.length > 0;

  async function generateFeatures() {
    if (!canGenerate) {
      return;
    }

    setIsOpen(true);
    setMessage("");

    const cacheKey = cleanCategory.toLowerCase();

    if (cachedFeatures[cacheKey]) {
      setFeatures(cachedFeatures[cacheKey]);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/features", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productCategory: cleanCategory,
        }),
      });

      const data = (await res.json()) as SmartFeatureResponse | { error?: string };

      if (!res.ok) {
        throw new Error("error" in data ? data.error : "Failed to generate features.");
      }

      const returnedFeatures =
        "features" in data && Array.isArray(data.features) ? data.features : [];

      setFeatures(returnedFeatures);
      setCachedFeatures((current) => ({
        ...current,
        [cacheKey]: returnedFeatures,
      }));

      if ("warning" in data && data.warning) {
        setMessage(data.warning);
      }
    } catch {
      setFeatures([]);
      setMessage("Feature suggestions could not load. Try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleFeature(featureName: string) {
    if (selectedFeatures.includes(featureName)) {
      onChange(selectedFeatures.filter((item) => item !== featureName));
      return;
    }

    onChange([...selectedFeatures, featureName]);
  }

  function removeFeature(featureName: string) {
    onChange(selectedFeatures.filter((item) => item !== featureName));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={generateFeatures}
        disabled={!canGenerate || isLoading}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
        )}
        {isLoading
          ? "Finding features..."
          : canGenerate
            ? "Smart Features"
            : "Enter a product first"}
      </button>

      {selectedFeatures.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedFeatures.map((feature) => (
            <button
              key={feature}
              type="button"
              onClick={() => removeFeature(feature)}
              className="inline-flex min-h-8 items-center gap-1 rounded-full bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              {feature}
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      ) : null}

      {isOpen ? (
        <div className="absolute left-0 top-12 z-30 w-[min(540px,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-4 shadow-xl shadow-blue-950/15">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Sparkles aria-hidden="true" className="h-4 w-4 text-blue-600" />
                Choose features that matter
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Suggestions based on {cleanCategory}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close Smart Features"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          {message ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {message}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin text-blue-600"
              />
              Generating product-specific features...
            </div>
          ) : features.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {features.map((feature) => {
                const active = selectedFeatures.includes(feature.name);

                return (
                  <button
                    key={feature.name}
                    type="button"
                    onClick={() => toggleFeature(feature.name)}
                    title={`${feature.description} Examples: ${feature.examples.join(", ")}`}
                    className={
                      active
                        ? "rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                        : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    }
                  >
                    {feature.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              No feature suggestions yet. Try a more specific product category.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  SelectedSmartFeature,
  SmartFeature,
} from "@/types/smart-features";
import { getFallbackSmartFeatures } from "@/lib/smartFeatureSuggestions";
import {
  createSelectedSmartFeature,
  smartFeatureCategoryKey,
  selectedSmartFeatureKey,
  selectedSmartFeatureLabel,
} from "@/lib/smartFeatureSelection";

type SmartFeaturesProps = {
  productCategory: string;
  selectedFeatures: SelectedSmartFeature[];
  onChange: (features: SelectedSmartFeature[]) => void;
};

export default function SmartFeatures({
  productCategory,
  selectedFeatures,
  onChange,
}: SmartFeaturesProps) {
  const [features, setFeatures] = useState<SmartFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [activeFeatureName, setActiveFeatureName] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [featuresCategoryKey, setFeaturesCategoryKey] = useState("");

  const cleanCategory = productCategory.trim();
  const categoryKey = smartFeatureCategoryKey(cleanCategory);
  const canGenerate = cleanCategory.length > 0;
  const displayedFeatures = featuresCategoryKey === categoryKey ? features : [];
  const activeFeature =
    displayedFeatures.find((feature) => feature.name === activeFeatureName) ??
    displayedFeatures[0];

  function getSelectedValues(featureName: string) {
    return selectedFeatures
      .filter((item) => item.name === featureName)
      .map((item) => selectedSmartFeatureLabel(item));
  }

  function generateFeatures() {
    if (!canGenerate) {
      return;
    }

    setIsOpen(true);
    setMessage("");

    const returnedFeatures =
      getFallbackSmartFeatures(cleanCategory)?.features ?? [];
    setFeatures(returnedFeatures);
    setFeaturesCategoryKey(categoryKey);
    setActiveFeatureName(returnedFeatures[0]?.name ?? "");
    if (returnedFeatures.length === 0) {
      setMessage(
        "No preset suggestions for this category. Add requirements in Important Details.",
      );
    }
  }

  function toggleFeatureValue(feature: SmartFeature, value: string) {
    const selected = createSelectedSmartFeature(feature, value);
    const selectedKey = selectedSmartFeatureKey(selected);

    if (
      selectedFeatures.some((item) => selectedSmartFeatureKey(item) === selectedKey)
    ) {
      onChange(
        selectedFeatures.filter(
          (item) => selectedSmartFeatureKey(item) !== selectedKey,
        ),
      );
      return;
    }

    onChange([...selectedFeatures, selected]);
  }

  function addCustomValue(feature: SmartFeature) {
    const value = (customValues[feature.name] ?? "").trim();

    if (!value) {
      return;
    }

    const selected = createSelectedSmartFeature(feature, value);
    const selectedKey = selectedSmartFeatureKey(selected);

    if (
      !selectedFeatures.some((item) => selectedSmartFeatureKey(item) === selectedKey)
    ) {
      onChange([...selectedFeatures, selected]);
    }

    setCustomValues((current) => ({
      ...current,
      [feature.name]: "",
    }));
  }

  function removeFeature(feature: SelectedSmartFeature) {
    const removeKey = selectedSmartFeatureKey(feature);

    onChange(
      selectedFeatures.filter((item) => selectedSmartFeatureKey(item) !== removeKey),
    );
  }

  return (
    <div className="relative min-w-0">
      <Button
        type="button"
        onClick={generateFeatures}
        disabled={!canGenerate}
        className="min-h-10 gap-2 rounded-full border-forest/18 bg-[#eef3e5] px-4 text-sm font-semibold text-forest shadow-none hover:border-forest/30 hover:bg-signal/35 disabled:cursor-not-allowed disabled:opacity-45"
        variant="outline"
      >
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
        {canGenerate ? "Smart Features" : "Enter a product first"}
      </Button>

      {selectedFeatures.length > 0 ? (
        <div className="mt-3 min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500">
              Required filters. These narrow Exact Matches.
            </p>
            <Button
              className="h-auto px-0 py-0 text-xs font-semibold text-forest hover:bg-transparent hover:text-ink"
              onClick={() => onChange([])}
              type="button"
              variant="ghost"
            >
              Clear all
            </Button>
          </div>
          <div
            className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1"
            aria-label="Selected smart features"
          >
            {selectedFeatures.map((feature) => {
              const label = selectedSmartFeatureLabel(feature);

              return (
                <Button
                  key={selectedSmartFeatureKey(feature)}
                  type="button"
                  onClick={() => removeFeature(feature)}
                  className="min-h-8 max-w-[260px] shrink-0 gap-1 rounded-full bg-forest px-3 text-xs font-semibold text-white shadow-none hover:bg-ink"
                  title={`Remove required filter ${label}`}
                >
                  <span className="truncate">{label}</span>
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <Card className="absolute left-0 top-12 z-50 max-h-[52vh] w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-3xl border-ink/10 bg-paper py-0 shadow-[0_28px_80px_rgba(12,27,22,0.2)]">
          <CardContent className="max-h-[45vh] overflow-y-auto p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Sparkles aria-hidden="true" className="h-4 w-4 text-forest" />
                Choose features that matter
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Suggestions based on {cleanCategory}
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close Smart Features"
              size="icon"
              variant="ghost"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
            </div>

          {message ? (
            <Alert className="mb-3 border-amber-200 bg-amber-50 text-amber-800">
              <AlertDescription className="text-xs leading-5 text-amber-800">
                {message}
              </AlertDescription>
            </Alert>
          ) : null}

          {displayedFeatures.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <div className="grid gap-2">
                {displayedFeatures.map((feature) => {
                  const active = feature.name === activeFeatureName;
                  const selectedCount = getSelectedValues(feature.name).length;

                  return (
                    <Button
                      key={feature.name}
                      type="button"
                      onClick={() => setActiveFeatureName(feature.name)}
                      title={feature.description}
                      className={
                        active
                          ? "min-h-11 justify-between gap-3 border-slate-300 bg-slate-100 px-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100"
                          : "min-h-11 justify-between gap-3 border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      }
                      variant="outline"
                    >
                      <span>{feature.name}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        {selectedCount > 0 ? selectedCount : null}
                        <ChevronRight aria-hidden="true" className="h-4 w-4" />
                      </span>
                    </Button>
                  );
                })}
              </div>

              {activeFeature ? (
                <Card className="border-slate-200 bg-slate-50 py-0 shadow-none">
                  <CardContent className="p-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-950">
                      Pick {activeFeature.name.toLowerCase()}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {activeFeature.description}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(activeFeature.possibleValues?.length
                      ? activeFeature.possibleValues
                      : activeFeature.examples
                    ).map((example) => {
                      const selected = createSelectedSmartFeature(
                        activeFeature,
                        example,
                      );
                      const active = selectedFeatures.some(
                        (item) =>
                          selectedSmartFeatureKey(item) ===
                          selectedSmartFeatureKey(selected),
                      );

                      return (
                        <Button
                          key={example}
                          type="button"
                          onClick={() =>
                            toggleFeatureValue(activeFeature, example)
                          }
                          className={
                            active
                              ? "h-auto rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-700"
                              : "h-auto rounded-full border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                          }
                          variant={active ? "default" : "outline"}
                        >
                          {example}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Input
                      aria-label={`Custom ${activeFeature.name}`}
                      className="min-h-10 min-w-0 flex-1 border-slate-200 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-slate-900/5"
                      onChange={(event) =>
                        setCustomValues((current) => ({
                          ...current,
                          [activeFeature.name]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomValue(activeFeature);
                        }
                      }}
                      placeholder={`Add custom ${activeFeature.name.toLowerCase()}`}
                      type="text"
                      value={customValues[activeFeature.name] ?? ""}
                    />
                    <Button
                      className="min-h-10 gap-2 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                      onClick={() => addCustomValue(activeFeature)}
                      type="button"
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : (
            <Card className="border-slate-200 bg-slate-50 py-0 shadow-none">
              <CardContent className="p-4 text-sm text-slate-500">
                No feature suggestions yet. Try a more specific product category.
              </CardContent>
            </Card>
          )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

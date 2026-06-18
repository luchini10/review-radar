// Data-only registry mapping a product category to the performance specs that
// matter for it. This is intentionally config, not control flow: category names
// live here as `match` keywords, and `selectCategoryProfile` is a generic loop —
// adding a category is a new entry, never a new branch. `keySpecs` must use ids
// from SPEC_DICTIONARY. The `default` profile (empty keySpecs) means uncategorized
// queries get no category boost and behave exactly as before.

export type CategoryProfile = {
  key: string;
  match: string[];
  keySpecs: string[];
};

export const CATEGORY_PROFILES: CategoryProfile[] = [
  {
    key: "pressure_washer",
    match: ["pressure washer", "power washer"],
    keySpecs: ["psi", "gpm", "weightLb"],
  },
  {
    key: "leaf_blower",
    match: ["leaf blower", "blower"],
    keySpecs: ["cfm", "mph", "runtimeMin", "batteryIncluded", "weightLb", "noiseDb"],
  },
  {
    key: "cordless_vacuum",
    match: ["vacuum"],
    keySpecs: ["suctionAirwatts", "runtimeMin", "capacityL", "weightLb"],
  },
  {
    key: "power_tool",
    match: ["drill", "impact driver", "impact wrench"],
    keySpecs: ["batteryIncluded", "weightLb"],
  },
  {
    key: "grill",
    match: ["gas grill", "grill", "bbq", "barbecue", "barbeque"],
    keySpecs: ["btu", "cookingAreaSqIn", "burners", "weightLb"],
  },
];

export const DEFAULT_CATEGORY_PROFILE: CategoryProfile = {
  key: "default",
  match: [],
  keySpecs: [],
};

export function selectCategoryProfile(category: string): CategoryProfile {
  const normalized = (category || "").toLowerCase();

  for (const profile of CATEGORY_PROFILES) {
    if (profile.match.some((keyword) => normalized.includes(keyword))) {
      return profile;
    }
  }

  return DEFAULT_CATEGORY_PROFILE;
}

import { baseProductCategoryFromQuery } from "../productCategory.ts";

export type CategoryGroup =
  | "appliances"
  | "automotive"
  | "baby"
  | "beauty"
  | "clothing"
  | "electronics"
  | "furniture"
  | "general"
  | "home_improvement"
  | "outdoor"
  | "pet"
  | "shoes"
  | "tools";

const categoryTerms: Record<CategoryGroup, string[]> = {
  appliances: [
    "vacuum",
    "washer",
    "dryer",
    "refrigerator",
    "fridge",
    "microwave",
    "dishwasher",
    "air fryer",
    "oven",
    "range",
  ],
  automotive: [
    "car",
    "truck",
    "auto",
    "tire",
    "battery",
    "jump starter",
    "dash cam",
  ],
  baby: [
    "stroller",
    "crib",
    "car seat",
    "diaper",
    "baby monitor",
    "high chair",
  ],
  beauty: [
    "makeup",
    "skincare",
    "hair dryer",
    "curling iron",
    "shaver",
    "serum",
  ],
  clothing: ["shirt", "jacket", "pants", "jeans", "dress", "hoodie", "coat"],
  electronics: [
    "monitor",
    "laptop",
    "tv",
    "television",
    "headphones",
    "keyboard",
    "mouse",
    "speaker",
    "tablet",
  ],
  furniture: [
    "couch",
    "sofa",
    "sleeper sofa",
    "pull out couch",
    "loveseat",
    "sectional",
    "chair",
    "desk",
    "dresser",
    "mattress",
  ],
  general: [],
  home_improvement: [
    "paint",
    "flooring",
    "faucet",
    "toilet",
    "vanity",
    "lighting",
    "ceiling fan",
  ],
  outdoor: [
    "baseball glove",
    "baseball mitt",
    "bike",
    "cooler",
    "fishing rod",
    "generator",
    "golf club",
    "grill",
    "lawn mower",
    "patio",
    "sporting goods",
    "tent",
    "backpack",
  ],
  pet: ["dog food", "cat food", "dog bed", "crate", "leash", "litter", "pet"],
  shoes: [
    "shoes",
    "sneakers",
    "footwear",
    "basketball shoes",
    "running shoes",
    "walking shoes",
    "boots",
    "sandals",
  ],
  tools: [
    "drill",
    "saw",
    "socket set",
    "impact wrench",
    "sander",
    "tool",
    "wrench",
    "driver",
  ],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectCategoryGroup(category: string): CategoryGroup {
  const normalized = normalize(baseProductCategoryFromQuery(category));

  for (const [group, terms] of Object.entries(categoryTerms) as Array<
    [CategoryGroup, string[]]
  >) {
    if (
      group !== "general" &&
      terms.some((term) => normalized.includes(normalize(term)))
    ) {
      return group;
    }
  }

  return "general";
}

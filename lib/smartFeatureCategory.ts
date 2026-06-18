export function normalizeSmartFeatureCategory(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.$"-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const categoryAliases: Record<string, string> = {
  "4k monitor": "monitor",
  "air conditioner": "air conditioner",
  "air purifier": "air purifier",
  "baseball glove": "baseball glove",
  "bed frame": "bed frame",
  blender: "blender",
  bookcase: "bookcase",
  bookshelf: "bookcase",
  camera: "camera",
  "car seat": "car seat",
  "carpet cleaner": "carpet cleaner",
  "cat tree": "cat tree",
  chair: "chair",
  "coffee maker": "coffee maker",
  couch: "couch",
  cookware: "cookware",
  "cookware set": "cookware set",
  crib: "crib",
  dehumidifier: "dehumidifier",
  desk: "desk",
  dishwasher: "dishwasher",
  "dog bed": "dog bed",
  "dog crate": "dog crate",
  dresser: "dresser",
  drill: "drill",
  dryer: "dryer",
  "espresso machine": "espresso machine",
  freezer: "freezer",
  fridge: "refrigerator",
  generator: "generator",
  grill: "grill",
  headphones: "headphones",
  "impact driver": "impact driver",
  keyboard: "keyboard",
  "knife set": "knife set",
  ladder: "ladder",
  laptop: "laptop",
  loveseat: "couch",
  "lawn mower": "lawn mower",
  "leaf blower": "leaf blower",
  mattress: "mattress",
  microwave: "microwave",
  "mini fridge": "mini fridge",
  monitor: "monitor",
  mouse: "mouse",
  nightstand: "nightstand",
  "office chair": "office chair",
  oven: "oven",
  "patio chair": "patio chair",
  "patio table": "patio table",
  printer: "printer",
  projector: "projector",
  "pull out couch": "sleeper sofa",
  "pull out sofa": "sleeper sofa",
  "pullout couch": "sleeper sofa",
  "pullout sofa": "sleeper sofa",
  recliner: "recliner",
  refrigerator: "refrigerator",
  router: "router",
  saw: "saw",
  sectional: "sectional",
  shelves: "shelves",
  "shelving unit": "shelves",
  "shoe rack": "shoe rack",
  "shop vac": "shop vac",
  "sleeper couch": "sleeper sofa",
  "sleeper loveseat": "sleeper sofa",
  "sleeper sofa": "sleeper sofa",
  "snow blower": "snow blower",
  sofa: "couch",
  "sofa bed": "sleeper sofa",
  soundbar: "soundbar",
  speaker: "speaker",
  stroller: "stroller",
  tablet: "tablet",
  tent: "tent",
  "toaster oven": "toaster oven",
  "tool chest": "tool chest",
  tv: "tv",
  television: "tv",
  "tv stand": "tv stand",
  vacuum: "vacuum",
  "vanity chair": "vanity chair",
  washer: "washer",
  "washing machine": "washer",
  "water filter": "water filter",
  "wine fridge": "wine fridge",
  "wine refrigerator": "wine fridge",
};

const sortedAliases = Object.entries(categoryAliases).sort(
  ([left], [right]) => right.length - left.length,
);

export function smartFeatureCategoryKey(category: string) {
  const normalized = normalizeSmartFeatureCategory(category);

  for (const [alias, key] of sortedAliases) {
    if (normalized === alias || normalized.includes(alias)) {
      return key;
    }
  }

  return normalized;
}

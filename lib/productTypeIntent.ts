export type ProductTypeIntentStatus =
  | "exact"
  | "substitute"
  | "complement"
  | "irrelevant"
  | "needs_verification"
  | "unknown";

export type ProductTypeIntentVerdict = {
  requestedType: string | null;
  status: ProductTypeIntentStatus;
  canBeExactMatch: boolean;
  reason: string;
};

type ProductTypeRule = {
  allowed: RegExp;
  blocked: RegExp;
  complements?: RegExp;
  id: string;
  requested: RegExp;
};

const PRODUCT_TYPE_RULES: ProductTypeRule[] = [
  {
    id: "toaster_oven",
    requested:
      /\b(?:toaster oven|countertop oven|countertop convection oven|air fryer toaster oven)\b/i,
    allowed:
      /\b(?:toaster oven|countertop oven|countertop convection oven|air fryer toaster oven|air fryer oven|smart oven)\b/i,
    blocked:
      /\b(?:wall oven|built[-\s]?in oven|single oven|double oven|conventional oven|gas range|electric range|dual fuel range|freestanding range|slide[-\s]?in range|stove|cooktop)\b/i,
    complements: /\b(?:toaster oven pan|crumb tray|rack|basket|liner|cover|accessory)\b/i,
  },
  {
    id: "microwave",
    requested: /\b(?:microwave|microwave oven|countertop microwave)\b/i,
    allowed:
      /\b(?:microwave|microwave oven|countertop microwave|over[-\s]?the[-\s]?range microwave|otr microwave)\b/i,
    blocked:
      /\b(?:wall oven|built[-\s]?in oven|single oven|double oven|toaster oven|gas range|electric range|freestanding range|stove|cooktop)\b/i,
    complements: /\b(?:microwave plate|turntable|trim kit|mounting kit|filter|cover)\b/i,
  },
  {
    id: "range",
    requested: /\b(?:gas range|electric range|dual fuel range|freestanding range|slide[-\s]?in range|stove)\b/i,
    allowed:
      /\b(?:gas range|electric range|dual fuel range|freestanding range|slide[-\s]?in range|range|stove|oven range)\b/i,
    blocked:
      /\b(?:toaster oven|countertop oven|microwave|microwave oven|wall oven|built[-\s]?in oven|cooktop only|gas cooktop|electric cooktop)\b/i,
    complements: /\b(?:range hood|backsplash|knob|burner grate|trim kit)\b/i,
  },
  {
    id: "office_chair",
    requested: /\b(?:office chair|task chair|desk chair|computer chair|ergonomic chair)\b/i,
    allowed:
      /\b(?:office chair|task chair|desk chair|computer chair|ergonomic chair|executive chair|mesh chair|work chair)\b/i,
    blocked:
      /\b(?:gaming chair|racing chair|accent chair|dining chair|lounge chair|recliner|pillow|cushion|chair mat|floor mat|seat cover)\b/i,
    complements: /\b(?:chair mat|lumbar pillow|seat cushion|arm pad|caster wheel)\b/i,
  },
  {
    id: "tv_stand",
    requested:
      /\b(?:tv stand|television stand|media console|media unit|entertainment center)\b/i,
    allowed:
      /\b(?:tv stand|television stand|media console|media unit|entertainment center|av cabinet)\b/i,
    blocked:
      /\b(?:soundbar|speaker|subwoofer|amplifier|receiver|projector|monitor|display|camera|headphones|earbuds)\b/i,
    complements: /\b(?:mounting bracket|wall mount|cable|remote|soundbar mount)\b/i,
  },
  {
    id: "mattress",
    requested: /\bmattress\b/i,
    allowed:
      /\bmattress\b(?!\s+(?:base|foundation|frame|pad|platform|protector|support|topper)\b)/i,
    blocked:
      /\b(?:bed frame|platform bed|storage bed|upholstered bed|headboard|foundation|box spring|bunkie board)\b/i,
    complements: /\b(?:mattress topper|mattress protector|mattress pad|sheet set|foundation|box spring)\b/i,
  },
  {
    id: "bed_frame",
    requested: /\b(?:bed frame|platform bed|storage bed)\b/i,
    allowed: /\b(?:bed frame|platform bed|storage bed|upholstered bed)\b/i,
    blocked:
      /\b(?:mattress|nightstand|dresser|box spring|mattress topper|mattress protector)\b/i,
    complements: /\b(?:headboard only|slats|bed rail|underbed drawer)\b/i,
  },
  {
    id: "pressure_washer",
    requested: /\b(?:pressure washer|power washer)\b/i,
    allowed:
      /\b(?:pressure washer|power washer|high pressure washer|psi|gpm|spray gun|spray wand|foam cannon|foam lance|soap cannon)\b/i,
    blocked:
      /\b(?:washer dryer|washer and dryer|front load washer|top load washer|washing machine|electric dryer|gas dryer|laundry center|laundry tower)\b/i,
    complements: /\b(?:hose|nozzle|surface cleaner|extension wand|pump protector)\b/i,
  },
  {
    id: "robot_vacuum",
    requested: /\b(?:robot\s+(?:vac|vacuum)|robotic\s+vacuum)\b/i,
    // "robot mop" covers combo robot vacuum-and-mop units; "robot cleaner" covers
    // some branded naming conventions that omit "vacuum"
    allowed:
      /\b(?:robot\s+(?:vac|vacuum|cleaner|mop)|robotic\s+(?:vac|vacuum))\b/i,
    // Block confirmed non-robot vacuum subtypes. "wet dry" (without requiring "vac"
    // after it) also catches truncated product names like "Wet/Dry ..." from Serper.
    blocked:
      /\b(?:stick\s+(?:vac|vacuum)|canister\s+(?:vac|vacuum)|hand(?:held)?\s+(?:vac|vacuum)|upright\s+(?:vac|vacuum)|wet\s+dry|shop\s+vac)\b/i,
    complements:
      /\b(?:replacement\s+(?:filter|brush|mop\s+pad|side\s+brush)|dustbin|boundary\s+strip|virtual\s+wall)\b/i,
  },
];

const ACCESSORY_CONTEXT =
  /\b(?:accessory|replacement|universal|plate|tray|cover|filter|mount|bracket|liner|trim kit|mounting kit|parts?)\b/i;

function normalize(value: string | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function productTypeIntentForQuery(query: string | undefined) {
  const text = normalize(query);

  if (!text) {
    return null;
  }

  return PRODUCT_TYPE_RULES.find((rule) => rule.requested.test(text)) || null;
}

export function classifyProductTypeIntent(input: {
  candidateText: string | undefined;
  // Optional richer text used only for the allowed check. When provided,
  // `candidateText` is still used for blocked/complement checks. This lets callers
  // include the recommendation narrative (why_recommended) for confirming the
  // right type without risking that query-echoing language in that field falsely
  // satisfies a substitute/component guard (e.g. "ice maker found during
  // refrigerator search" must not satisfy the refrigerator satisfiedBy guard).
  allowedCheckText?: string | undefined;
  requestedText: string | undefined;
}): ProductTypeIntentVerdict {
  const rule = productTypeIntentForQuery(input.requestedText);
  const candidateText = normalize(input.candidateText);
  const allowedCheckText = input.allowedCheckText
    ? normalize(input.allowedCheckText)
    : candidateText;

  if (!rule) {
    return {
      canBeExactMatch: true,
      reason: "No specific product-type intent rule matched the request.",
      requestedType: null,
      status: "unknown",
    };
  }

  if (!candidateText) {
    return {
      canBeExactMatch: false,
      reason: `Product type ${rule.id} could not be verified from candidate evidence.`,
      requestedType: rule.id,
      status: "needs_verification",
    };
  }

  const isAllowed = rule.allowed.test(allowedCheckText);
  const isBlocked = rule.blocked.test(candidateText);
  const isComplement = rule.complements?.test(candidateText) || false;

  if (isComplement && (!isAllowed || ACCESSORY_CONTEXT.test(candidateText))) {
    return {
      canBeExactMatch: false,
      reason: `Candidate looks like an accessory or complement for ${rule.id}, not the product itself.`,
      requestedType: rule.id,
      status: "complement",
    };
  }

  if (isBlocked && !isAllowed) {
    return {
      canBeExactMatch: false,
      reason: `Candidate is a different product type than requested ${rule.id}.`,
      requestedType: rule.id,
      status: "irrelevant",
    };
  }

  if (isAllowed) {
    return {
      canBeExactMatch: true,
      reason: `Candidate matches requested product type ${rule.id}.`,
      requestedType: rule.id,
      status: "exact",
    };
  }

  return {
    canBeExactMatch: false,
    reason: `Candidate does not prove requested product type ${rule.id}.`,
    requestedType: rule.id,
    status: "needs_verification",
  };
}

export const productTypeIntentTestExports = {
  PRODUCT_TYPE_RULES,
  normalize,
};

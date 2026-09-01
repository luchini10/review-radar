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
  conflictingIdentity?: RegExp;
  exclusiveBlocked?: RegExp;
  exclusiveComplements?: RegExp;
  id: string;
  requested: RegExp;
};

const HOUSEHOLD_FLOOR_CLEANER_PATTERN =
  /\b(?:crosswave|hydrovac|floor\s+one|floormate|wet\s+dry\s+(?:vacuum\s+)?mop|vacuum\s+mop|mop\s+vacuum|hard\s+floor\s+(?:cleaner|washer)|floor\s+(?:cleaner|washer|scrubber)|multi\s+surface\s+(?:wet\s+dry\s+)?(?:floor\s+)?(?:cleaner|washer|vacuum)|carpet\s+cleaner|spot\s+cleaner|upholstery\s+cleaner|portable\s+carpet(?:\s+and\s+upholstery)?\s+(?:cleaner|washer))\b/i;

const SHOP_VAC_PATTERN =
  /\b(?:shop\s+(?:vac|vacuum)|shopvac|wet\s+dry\s+(?:(?:shop|utility)\s+)?(?:vac|vacuum)|wetdry\s+(?:vac|vacuum)|utility\s+(?:wet\s+dry\s+)?(?:vac|vacuum)|(?:garage|jobsite|workshop|contractor|drum)\s+(?:vac|vacuum))s?\b/i;

const SHOP_VAC_CONTEXT_PATTERN =
  /\b(?:\d+(?:\.\d+)?\s*(?:gal|gallon)s?\b.{0,80}\b(?:peak\s+)?(?:hp|horsepower)|(?:peak\s+)?(?:hp|horsepower)\b.{0,80}\b\d+(?:\.\d+)?\s*(?:gal|gallon)s?|(?:garage|workshop|jobsite|contractor|debris|sawdust)\b.{0,80}\b(?:vac|vacuum|cleanup)|(?:vac|vacuum)\b.{0,80}\b(?:garage|workshop|jobsite|contractor|debris|sawdust))\b/i;

const SHOP_VAC_COMPLEMENT_PATTERN =
  /\b(?:replacement\s+(?:filter|hose|bag|nozzle)|vac(?:uum)?\s+(?:filter|hose|bag|nozzle|attachment)|cartridge\s+filter|blower\s+nozzle(?:\s+vacuum)?(?:\s+attachment)?|dust\s+bag|filter\s+bag|(?:utility\s+)?nozzle(?:\s+attachment)?|accessory\s+kit)\b/i;
const STANDALONE_SHOP_VAC_COMPLEMENT_PATTERN =
  /\b(?:wet\s+dry\s+(?:shop\s+)?vac(?:uum)?|shop\s+vac(?:uum)?|vacuum)\s+(?:replacement\s+)?(?:hose|filter\s+bags?|bags?|(?:utility\s+)?nozzles?(?:\s+attachments?)?|accessory\s+kit)\b|^(?:[a-z0-9-]+\s+){0,3}(?:utility\s+)?nozzles?(?:\s+attachments?)?$/i;

const LEAF_BLOWER_PATTERN =
  /\b(?:(?:leaf|yard|lawn|garden)\s+(?:vac(?:uum)?\s+)?blower|blower\s+(?:vacuum|mulcher))s?\b/i;
const FULL_SIZE_LEAF_BLOWER_CONTEXT_PATTERN =
  /(?:\b(?:[3-9]\d{2}|1\d{3})\s*cfm\b.{0,80}\bblower\b|\bblower\b.{0,80}\b(?:[3-9]\d{2}|1\d{3})\s*cfm\b)/i;
const NON_LEAF_BLOWER_PATTERN =
  /\b(?:(?:compact\s+)?(?:workshop|jobsite|shop|dust)\s+(?:air\s+)?blower|air\s+duster|inflator)\b/i;
const LEAF_BLOWER_COMPLEMENT_PATTERN =
  /\b(?:replacement\s+)?(?:blower\s+)?(?:nozzle|tube|attachment|shoulder\s+strap|collection\s+bag)\b/i;

const ROBOT_VACUUM_FULL_PRODUCT_PATTERN =
  /\b(?:robot\s+(?:vac|vacuum|cleaner|mop)|robotic\s+(?:vac|vacuum))\b/i;
const ROBOT_VACUUM_DOCK_COMPLEMENT_PATTERN =
  /\b(?:replacement\s+)?(?:dock(?:ing)?(?:\s+station)?|charging\s+station|clean\s+base(?:\s+station)?|base\s+station|dust\s+disposal\s+base(?:\s+station)?|(?:self\s+empty(?:ing)?|auto\s+empty(?:ing)?)\s+(?:[a-z0-9]+\s+){0,3}(?:(?:clean\s+)?base(?:\s+station)?|dock(?:ing)?(?:\s+station)?|station))\b/i;
const ROBOT_VACUUM_EXISTING_COMPLEMENT_PATTERN =
  /\b(?:replacement\s+(?:filter|brush|mop\s+pad|side\s+brush)|dustbin|boundary\s+strip|virtual\s+wall)\b/i;
const ROBOT_VACUUM_COMPLEMENT_PATTERN = new RegExp(
  `${ROBOT_VACUUM_EXISTING_COMPLEMENT_PATTERN.source}|${ROBOT_VACUUM_DOCK_COMPLEMENT_PATTERN.source}`,
  "i",
);
const STANDALONE_ROBOT_VACUUM_DOCK_PATTERN = new RegExp(
  `(?:${ROBOT_VACUUM_DOCK_COMPLEMENT_PATTERN.source}\\s+(?:for|compatible\\s+with|works\\s+with)\\b)|(?:^(?!.*${ROBOT_VACUUM_FULL_PRODUCT_PATTERN.source}).*${ROBOT_VACUUM_DOCK_COMPLEMENT_PATTERN.source})`,
  "i",
);

const NEVER_REQUESTED_PRODUCT_TYPE = /\b\B/;
const HOUSEHOLD_VACUUM_PATTERN =
  /\b(?:stick\s+(?:vac|vacuum)|canister\s+(?:vac|vacuum)|hand(?:held)?\s+(?:vac|vacuum)|upright\s+(?:vac|vacuum))\b/i;

const PRODUCT_TYPE_RULES: ProductTypeRule[] = [
  {
    // Identity-only class used by the cross-rule conflict check below. Keeping
    // it out of request matching preserves existing "refrigerator with ice
    // maker" and feature-query behavior while still recognizing a standalone
    // enriched ice-maker title as positive non-requested product-type evidence.
    id: "ice_maker",
    requested: NEVER_REQUESTED_PRODUCT_TYPE,
    allowed: /\b(?:ice maker|ice machine)\b/i,
    blocked: NEVER_REQUESTED_PRODUCT_TYPE,
    conflictingIdentity: /\b(?:ice maker|ice machine)\b/i,
  },
  {
    id: "household_floor_cleaner",
    requested: HOUSEHOLD_FLOOR_CLEANER_PATTERN,
    allowed: HOUSEHOLD_FLOOR_CLEANER_PATTERN,
    blocked: SHOP_VAC_PATTERN,
    complements:
      /\b(?:cleaning\s+solution|cleaning\s+formula|replacement\s+(?:brush|brushroll|filter|pad)|brush\s+roll|mop\s+pad)\b/i,
  },
  {
    id: "leaf_blower",
    requested: LEAF_BLOWER_PATTERN,
    allowed: new RegExp(
      `${LEAF_BLOWER_PATTERN.source}|${FULL_SIZE_LEAF_BLOWER_CONTEXT_PATTERN.source}`,
      "i",
    ),
    blocked: NON_LEAF_BLOWER_PATTERN,
    exclusiveBlocked: NON_LEAF_BLOWER_PATTERN,
    complements: LEAF_BLOWER_COMPLEMENT_PATTERN,
    exclusiveComplements: LEAF_BLOWER_COMPLEMENT_PATTERN,
  },
  {
    id: "shop_vac",
    requested: SHOP_VAC_PATTERN,
    allowed: new RegExp(
      `${SHOP_VAC_PATTERN.source}|${SHOP_VAC_CONTEXT_PATTERN.source}`,
      "i",
    ),
    blocked: new RegExp(
      `${HOUSEHOLD_FLOOR_CLEANER_PATTERN.source}|${HOUSEHOLD_VACUUM_PATTERN.source}`,
      "i",
    ),
    exclusiveBlocked: new RegExp(
      `${HOUSEHOLD_FLOOR_CLEANER_PATTERN.source}|${HOUSEHOLD_VACUUM_PATTERN.source}`,
      "i",
    ),
    complements: SHOP_VAC_COMPLEMENT_PATTERN,
    exclusiveComplements: STANDALONE_SHOP_VAC_COMPLEMENT_PATTERN,
  },
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
      /\b(?:pressure washer|power washer|high pressure washer)\b/i,
    blocked:
      /\b(?:washer dryer|washer and dryer|front load washer|top load washer|washing machine|electric dryer|gas dryer|laundry center|laundry tower|dishwasher|dish washer)\b/i,
    complements:
      /\b(?:hose|nozzle|surface cleaner|extension wand|pump protector|spray gun|spray wand|foam cannon|foam lance|soap cannon|detergent|cleaning solution|cleaner concentrate)\b|(?:\d+(?:\.\d+)?\s*(?:fl\s*)?oz\b.{0,80}\bpressure wash)\b/i,
    exclusiveComplements:
      /\b(?:pressure washer|power washer)\s+(?:hose|nozzle|surface cleaner|extension wand|spray gun|spray wand|foam cannon|foam lance|soap cannon|detergent|soap|cleaning solution|cleaner concentrate)\b|\b(?:hose|nozzle|surface cleaner|extension wand|spray gun|spray wand|foam cannon|foam lance|soap cannon|detergent|soap|cleaning solution|cleaner concentrate)\s+(?:for|compatible with)\s+(?:a\s+)?(?:pressure washer|power washer)\b|(?:\d+(?:\.\d+)?\s*(?:fl\s*)?oz\b.{0,80}\bpressure wash)\b/i,
  },
  {
    id: "cordless_drill",
    requested:
      /\b(?:cordless\s+)?(?:power\s+)?drill(?:\s*\/\s*driver|\s+driver)?\b/i,
    allowed:
      /\b(?:cordless\s+)?(?:power\s+)?drill(?:\s*\/\s*driver|\s+driver)?\b/i,
    blocked:
      /\b(?:(?:\d+|multi)[-\s]?tool|power\s+tool)\s+combo\s+kit\b/i,
    exclusiveBlocked:
      /\b(?:(?:\d+|multi)[-\s]?tool|power\s+tool)\s+combo\s+kit\b/i,
    complements:
      /\b(?:drill\s+bits?|replacement\s+batter(?:y|ies)|battery\s+charger|drill\s+case)\b/i,
  },
  {
    id: "portable_generator",
    requested:
      /\b(?:portable generator|inverter generator|dual fuel generator|tri fuel generator)\b/i,
    allowed:
      /\b(?:portable|inverter|gas(?:oline)?|propane|dual[-\s]?fuel|tri[-\s]?fuel)\s+(?:powered\s+)?generator\b|\bgenerator set\b|\bdual[-\s]?fuel inverter\b/i,
    blocked:
      /\b(?:portable\s+)?power station\b|\b(?:solar|battery|standby|whole[-\s]?home)\s+generator\b/i,
    complements:
      /\b(?:generator cover|transfer switch|wheel kit|parallel kit|power cord|inlet box)\b/i,
    exclusiveComplements:
      /\b(?:generator|inverter generator)\s+(?:cover|transfer switch|wheel kit|parallel kit|power cord|inlet box)\b/i,
  },
  {
    id: "basketball_hoop",
    requested:
      /\b(?:basketball hoop|basketball goal|basketball system)\b/i,
    allowed:
      /\b(?:basketball hoop|basketball goal|basketball system|hoop)\b/i,
    blocked:
      /\b(?:wall art|canvas art|canvas print|poster|art print|wall decal|hula hoop|embroidery hoop)\b/i,
    complements:
      /\b(?:wall art|canvas art|canvas print|poster|art print|wall decal|replacement net|replacement rim|replacement backboard|mounting bracket|anchor kit)\b/i,
    exclusiveComplements:
      /\b(?:wall art|canvas art|canvas print|poster|art print|wall decal|basketball hoop\s+(?:net|rim|backboard|mount|anchor kit))\b/i,
  },
  {
    id: "dash_cam",
    requested:
      /\b(?:dash cam|dashboard camera|dashboard cam|driving recorder)\b/i,
    allowed:
      /\b(?:dash cam|dashboard camera|dashboard cam|car dvr|driving recorder)\b/i,
    blocked:
      /\b(?:backup camera|back-up camera|reversing camera|rear[-\s]?view camera|security camera|action camera)\b/i,
    complements:
      /\b(?:dash cam mount|hardwire kit|power cable|replacement cable|memory card)\b/i,
    exclusiveComplements:
      /\b(?:dash cam|dashboard camera)\s+(?:mount|hardwire kit|power cable|replacement cable|memory card)\b/i,
  },
  {
    id: "robot_vacuum",
    requested: /\b(?:robot\s+(?:vac|vacuum)|robotic\s+vacuum)\b/i,
    // "robot mop" covers combo robot vacuum-and-mop units; "robot cleaner" covers
    // some branded naming conventions that omit "vacuum"
    allowed: ROBOT_VACUUM_FULL_PRODUCT_PATTERN,
    // Block confirmed non-robot vacuum subtypes. "wet dry" (without requiring "vac"
    // after it) also catches truncated product names like "Wet/Dry ..." from Serper.
    blocked:
      /\b(?:stick\s+(?:vac|vacuum)|canister\s+(?:vac|vacuum)|hand(?:held)?\s+(?:vac|vacuum)|upright\s+(?:vac|vacuum)|wet\s+dry|shop\s+vac|washer dryer|washer and dryer|washing machine|front load washer|top load washer|laundry center|laundry tower)\b/i,
    complements: ROBOT_VACUUM_COMPLEMENT_PATTERN,
    exclusiveComplements: STANDALONE_ROBOT_VACUUM_DOCK_PATTERN,
  },
];

const ACCESSORY_CONTEXT =
  /\b(?:accessory|attachment|replacement|universal|plate|tray|cover|filter|mount|bracket|liner|trim kit|mounting kit|parts?)\b/i;
const INCLUDED_COMPLEMENT_CONTEXT =
  /\b(?:with|includes?|including|comes\s+with|supplied\s+with|bundled\s+with)\b.{0,80}\b(?:accessor(?:y|ies)|attachments?|filters?|hoses?|nozzles?|bags?|docks?|stations?)\b/i;

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
  // Product identity (normally title/name) excludes incidental source snippets.
  // Explicit complement shapes here may override allowed words found only in
  // broader evidence.
  candidateIdentityText?: string | undefined;
  // Optional richer text used only for the allowed check. When provided,
  // `candidateText` is still used for blocked/complement checks. This lets callers
  // include bounded candidate evidence for confirming the right type without
  // risking that query-echoing language in that field falsely
  // satisfies a substitute/component guard (e.g. "ice maker found during
  // refrigerator search" must not satisfy the refrigerator satisfiedBy guard).
  allowedCheckText?: string | undefined;
  requestedText: string | undefined;
}): ProductTypeIntentVerdict {
  const rule = productTypeIntentForQuery(input.requestedText);
  const candidateText = normalize(input.candidateText);
  const candidateIdentityText = normalize(
    input.candidateIdentityText ?? input.candidateText,
  );
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
  const isExclusiveBlocked =
    rule.exclusiveBlocked?.test(candidateIdentityText) || false;
  const isComplement = rule.complements?.test(candidateText) || false;
  const isExclusiveComplement =
    rule.exclusiveComplements?.test(candidateIdentityText) || false;
  const isIncludedComplement = INCLUDED_COMPLEMENT_CONTEXT.test(candidateText);

  if (isExclusiveBlocked) {
    return {
      canBeExactMatch: false,
      reason: `Candidate is a different product type than requested ${rule.id}.`,
      requestedType: rule.id,
      status: "irrelevant",
    };
  }

  if (
    isComplement &&
    (!isAllowed ||
      isExclusiveComplement ||
      (ACCESSORY_CONTEXT.test(candidateText) && !isIncludedComplement))
  ) {
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

  const conflictingRegisteredType = PRODUCT_TYPE_RULES.find(
    (candidateRule) =>
      candidateRule.id !== rule.id &&
      (candidateRule.conflictingIdentity || candidateRule.requested).test(
        candidateIdentityText,
      ),
  );

  if (conflictingRegisteredType) {
    return {
      canBeExactMatch: false,
      reason: `Candidate explicitly identifies product type ${conflictingRegisteredType.id}, not requested ${rule.id}.`,
      requestedType: rule.id,
      status: "irrelevant",
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

import type { ProductRecommendation } from "@/types/review-radar";

const budgetCompliancePatterns = [
  /\bofficial price shown\b/i,
  /\bofficial price\b[^.]*\b(?:budget|price range|under|within|staying|fits?|meets?)\b/i,
  /\b(?:current|listed|shown|verified|sale|offer|retailer|product page)\s+price\b[^.]*\b(?:budget|price range|under|within|staying|fits?|meets?)\b/i,
  /\bstay(?:s|ed|ing)?\s+(?:comfortably\s+)?within\b[^.]*\bbudget\b/i,
  /\bwithin\s+(?:the\s+)?(?:main\s+|stated\s+)?budget\b/i,
  /\bunder\s+(?:the\s+)?(?:main\s+|stated\s+)?budget\b/i,
  /\b(?:fits?|meets?)\s+(?:the\s+)?(?:main\s+|stated\s+)?budget\b/i,
  /\b(?:fits?|meets?)\s+(?:the\s+)?(?:stated\s+|main\s+)?price range\b/i,
  /\bstays?\s+under\b[^.]*\bbudget\b/i,
  /\bstaying\s+under\b/i,
  /\bin[-\s]?budget\b/i,
  /\bsub[-\s]?\$?\d[\d,]*(?:\.\d+)?\b[^.]*\b(?:price|budget)\b/i,
  /\bpriced\s+(?:at|under|within)\b[^.]*\bbudget\b/i,
];

const purePriceStatusPatterns = [
  /^\$?\d[\d,]*(?:\.\d+)?\s+(?:at|from|on)\s+[\w.-]+\.?$/i,
  /^price(?:d)?\s*[:\-]/i,
  /^budget\s*[:\-]/i,
  /^estimated price/i,
  /^best offer/i,
];

const valueJudgmentPatterns = [
  /\bvalue for money\b/i,
  /\bstrong value\b/i,
  /\bgood value\b/i,
  /\bprice[-\s]?to[-\s]?performance\b/i,
  /\bfor the money\b/i,
  /\bworth (?:the )?(?:price|cost)\b/i,
  /\bcompared with\b[^.]*\bprice\b/i,
];

const qualityEvidencePatterns = [
  /\breview/i,
  /\bowner/i,
  /\bexpert/i,
  /\btested/i,
  /\bevidence/i,
  /\bsources?\b/i,
  /\bperformance\b/i,
  /\bdurab/i,
  /\bbuild quality\b/i,
  /\bwarranty\b/i,
  /\breliab/i,
];

function isValueJudgmentWithEvidence(text: string) {
  return (
    valueJudgmentPatterns.some((pattern) => pattern.test(text)) &&
    qualityEvidencePatterns.some((pattern) => pattern.test(text))
  );
}

function cleanSentence(value: string) {
  const clean = value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "")
    .split(/\s+/)
    .map((word) => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(" ");

  if (!clean) {
    return "";
  }

  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)}.`;
}

function shopperFacingPositiveCopy(text: string) {
  const clean = text.trim();
  const rescueMatch = clean.match(
    /^search evidence confirms:\s*(.+?)(?:\s+\([^)]+\))?\.?$/i,
  );

  if (rescueMatch?.[1]) {
    return cleanSentence(rescueMatch[1]);
  }

  const evidenceMatch = clean.match(
    /^(?:review snippets|review evidence|reviews?) mention(?:s|ed)?\s+(.+?)\.?$/i,
  );

  if (!evidenceMatch?.[1]) {
    return clean;
  }

  return cleanSentence(evidenceMatch[1]);
}

function shopperFacingNegativeCopy(text: string) {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  if (/^some review snippets mention noise\.?$/i.test(clean)) {
    return "Can be noisy.";
  }

  if (/^some review snippets mention difficult assembly\.?$/i.test(clean)) {
    return "Assembly can be difficult.";
  }

  if (/^some review snippets mention short battery life\.?$/i.test(clean)) {
    return "Battery life may be shorter than expected.";
  }

  if (/^some review snippets mention clogging\.?$/i.test(clean)) {
    return "Clogging may be an issue.";
  }

  if (/^some review snippets mention usb or electronics problems\.?$/i.test(clean)) {
    return "USB or electronic features may be unreliable.";
  }

  if (/^some review snippets mention backlight bleed\.?$/i.test(clean)) {
    return "Backlight bleed has been reported.";
  }

  if (/^some review snippets mention durability or breakage issues\.?$/i.test(clean)) {
    return "Durability or breakage issues have been reported.";
  }

  if (/^some review snippets mention firm cushions\.?$/i.test(clean)) {
    return "Cushions may feel too firm.";
  }

  const evidenceMatch = clean.match(
    /^(?:some\s+)?(?:review snippets|review evidence|reviews?) mention(?:s|ed)?\s+(.+?)\.?$/i,
  );

  if (evidenceMatch?.[1]) {
    const detail = evidenceMatch[1].replace(/^some\s+/i, "");

    return lower.includes("complaint") || lower.includes("problem")
      ? cleanSentence(detail)
      : `${cleanSentence(detail).replace(/\.$/, "")} has been reported.`;
  }

  return clean;
}

export function isBudgetComplianceCopy(text: string) {
  const clean = text.trim();

  if (!clean) {
    return false;
  }

  if (isValueJudgmentWithEvidence(clean)) {
    return false;
  }

  return (
    purePriceStatusPatterns.some((pattern) => pattern.test(clean)) ||
    budgetCompliancePatterns.some((pattern) => pattern.test(clean))
  );
}

export function sanitizeProductPros(items: string[]) {
  return items
    .filter((item) => !isBudgetComplianceCopy(item))
    .map(shopperFacingPositiveCopy)
    .filter(Boolean);
}

export function sanitizeProductCons(items: string[]) {
  return items
    .filter((item) => !isBudgetComplianceCopy(item))
    .map(shopperFacingNegativeCopy)
    .filter(Boolean);
}

export function sanitizeProsAndCons<T extends ProductRecommendation>(product: T): T {
  return {
    ...product,
    cons: sanitizeProductCons(product.cons),
    pros: sanitizeProductPros(product.pros),
  };
}

import type { RecommendationApiRequest } from "@/types/review-radar";

export const researchSystemPrompt = `
You are ReviewRadar, a skeptical product research analyst.

Your job is to help a buyer decide what to buy by synthesizing current public evidence.
You are not an affiliate blog, brand marketer, or generic shopping chatbot.

Rules:
- Use web search before answering.
- Recommend products only when supported by current public sources.
- Never invent product names, citations, URLs, prices, complaints, or consensus.
- Use citation links only for sources actually found through web search.
- Product page links must be exact official manufacturer pages or exact retailer product pages found through web search.
- Product image URLs must be direct image URLs from the exact product page, official brand page, retailer page, or source metadata. Leave the field empty if not available.
- Product page links and product images are useful enrichments, not evidence requirements. Do not omit an otherwise cited recommendation just because the exact product page or image URL is unavailable.
- Do not put recommendations, product lists, markdown, citations, or source excerpts in search_summary.
- If evidence is thin, conflicting, outdated, or not directly relevant, include the recommendation only when it has at least one relevant citation, then lower confidence and explain the limitation.
- Only omit a recommendation slot when no relevant public source supports a product for that slot.
- Never use the same product name in more than one recommendation slot.
- Do not rank by star rating alone.
- Penalize affiliate-only recommendations.
- Penalize products with repeated reliability, durability, warranty, comfort, safety, or support complaints.
- Preserve meaningful disagreement between sources.
- Keep the result practical, concise, and buyer-focused.
- Return only the requested structured JSON shape.

Source weighting, from strongest to weakest:
1. Long-term owner reviews and repeated real-user discussion patterns.
2. Reddit/forum consensus when available, especially repeated ownership reports rather than one-off comments.
3. YouTube reviews with clear hands-on testing, measurements, teardown, or long-term use.
4. Expert review sites with transparent testing methods.
5. Retailer reviews, but treat them carefully because fake, incentivized, or early-impression reviews may exist.
6. Manufacturer pages only for specs, compatibility, warranty terms, dimensions, materials, and official claims. Do not use manufacturer pages for trust ranking.

Confidence scoring:
- 90-100 = strong agreement across multiple reliable source types.
- 75-89 = good support, but with some limitations, tradeoffs, or source gaps.
- 60-74 = mixed support, limited evidence, or meaningful disagreement.
- Below 60 = weak confidence, niche fit, sparse evidence, or notable unresolved complaints.

Source consensus labels:
- Strong = multiple reliable source types broadly agree.
- Mixed = sources disagree or praise is paired with recurring complaints.
- Weak = few reliable sources, shallow evidence, or mostly retailer/affiliate support.
- Niche = good fit for a specific use case but not a broad recommendation.
`.trim();

export function buildResearchPrompt(input: RecommendationApiRequest) {
  const selectedFeaturesText =
    input.selectedFeatures && input.selectedFeatures.length > 0
      ? input.selectedFeatures.join(", ")
      : "None selected";

  return `
Research this buying decision:

Product category: ${input.query}
Budget: ${input.budget || "Not specified"}
Use case: ${input.useCase || "Not specified"}
Deal breakers: ${input.dealBreakers || "Not specified"}
Selected product features: ${selectedFeaturesText}

Return JSON using exactly this shape:
{
  "search_summary": string,
  "assumptions": string[],
  "recommendations": [
    {
      "recommendation_type": "Best Overall" | "Best Budget" | "Best Value" | "Best Premium" | "Best Alternative" | "Honorable Mention",
      "name": string,
      "category": string,
      "product_page_url": string,
      "product_image_url": string,
      "why_recommended": string,
      "pros": string[],
      "cons": string[],
      "common_complaints": string[],
      "estimated_price_range": string,
      "confidence_score": number,
      "source_consensus": "Strong" | "Mixed" | "Weak" | "Niche",
      "price_value_verdict": string,
      "best_for": string,
      "not_for": string[],
      "citations": [
        {
          "title": string,
          "url": string,
          "what_it_supports": string
        }
      ]
    }
  ],
  "what_to_avoid": string[],
  "final_buying_advice": string
}

Return recommendations using only these recommendation_type values when supported:
- Best Overall: the strongest all-around recommendation.
- Best Budget: the cheapest option that is still worth buying.
- Best Value: the best balance of price, quality, features, and reliability.
- Best Premium: the higher-end option for people willing to spend more.
- Best Alternative: a solid backup pick if the top choice is unavailable, too expensive, or not quite the right fit.
- Honorable Mention: a few extra products worth considering, but not stronger than the main five picks.

For common product categories, search enough sources to return one product for each primary recommendation type when reliable evidence exists:
- Best Overall
- Best Budget
- Best Value
- Best Premium
- Best Alternative

Then return 1-3 Honorable Mention picks if there are genuinely useful extras.
The result is incomplete if a common category returns only one or two primary picks. Use separate search passes for each primary slot, then compare the evidence.
For common categories, return all five primary recommendation types when each pick has at least one relevant citation. It is okay for Budget, Value, Premium, or Alternative picks to have Mixed, Weak, or Niche consensus if that accurately reflects the source quality.
Only omit a primary recommendation type when no relevant public source supports a distinct product for that slot after searching for that slot directly.
Each recommendation must be a distinct product. Best Budget and Best Value cannot be the same product. If one product fits both slots, choose the slot it fits best and find another cited product for the other slot, or omit that slot if no distinct cited product exists.
Do not use "Avoid" or "Best for User Need" as recommendation_type values.

The user selected these important product features:
${selectedFeaturesText}

Prioritize products that match these selected features when ranking:
- Best Overall
- Best Budget
- Best Value
- Best Premium
- Best Alternative

Do not force a product to match every feature if that would produce worse recommendations. Use the selected features as strong ranking preferences.

Search strategy:
1. Search for broad best-overall consensus in the category.
2. Search for budget picks within or below the user's budget when a budget is provided.
3. Search for value picks where reviewers or owners mention price, reliability, and performance together.
4. Search for premium picks that justify a higher price with better performance, durability, warranty, or features.
5. Search for backup or alternative picks that are credible when the top choice is unavailable or not a fit.
6. Search for recurring complaints and products/patterns to avoid.
7. For each primary pick, search the exact product name with "official", "manufacturer", "retailer", or "buy" to find the exact product page and image metadata when available.

Every recommendation must include citations that support the reasoning.
Every citation url must be a complete non-empty http or https URL.
If a citation does not directly support the recommendation, do not use it.
If evidence is limited, say so in search_summary, assumptions, source_consensus, confidence_score, and final_buying_advice.
Use what_to_avoid for product patterns, specs, brands, or models the buyer should avoid based on cited evidence or clearly stated uncertainty.
Keep search_summary to one short plain-English sentence. Do not put product lists, markdown, citations, or recommendation details in search_summary.
Do not format any field with markdown headings, bullet syntax, or numbered lists. Return plain strings and arrays only.

For each recommendation:
- why_recommended must explain why the product earned that exact recommendation_type.
- If a product fits more than one slot, assign it to the strongest single slot and choose a distinct product for the other slots when evidence supports one.
- Before returning JSON, verify that every recommendations[].name appears only once. Duplicate product names make the result invalid.
- Do not skip Best Premium just because Best Overall is also expensive; choose the next strongest higher-end option when evidence supports one.
- product_page_url must be the exact product webpage, not a review article or homepage. Search for it directly. Use an empty string only if you cannot verify an exact product page.
- Do not use review-site category pages, buying-guide pages, search result pages, or homepages as product_page_url.
- product_image_url must be a direct image URL for that product from the product page, retailer page, manufacturer page, or cited source metadata. Use an empty string only if you cannot verify one.
- pros should capture common praise from reliable sources.
- common_complaints should capture repeated complaints, not isolated noise.
- price_value_verdict should explain whether the price makes sense for the evidence-backed strengths and weaknesses.
- best_for should describe who should buy it.
- not_for should describe who should avoid it.
- citations[].what_it_supports must state the specific claim supported by that URL.
- confidence_score must follow the confidence scoring bands above.
- source_consensus must match the evidence quality, not the marketing tone.

When sources conflict:
- Do not hide the conflict.
- Use "Mixed" source_consensus when disagreement materially affects the buying decision.
- Lower confidence when praise depends mostly on affiliate lists, launch coverage, retailer star ratings, or manufacturer claims.
- Lower confidence for repeated reliability complaints even when overall reviews are positive.
`.trim();
}

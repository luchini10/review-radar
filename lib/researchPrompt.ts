import type {
  RawProductCandidate,
  RecommendationApiRequest,
} from "@/types/review-radar";
import { discoveryContextForPrompt } from "./discoveryStrategy.ts";
import { constraintsToText, extractStructuredRequirements } from "./requirementExtraction.ts";
import { selectedSmartFeatureLabel } from "./smartFeatureSelection.ts";

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
- For each product_page_url, prefer the official manufacturer product page as the primary product URL. Only use third-party retailer URLs when an official product page is unavailable or cannot be confidently identified. Do not invent official URLs.
- Product image URLs must be direct image URLs from the exact product page, official brand page, retailer page, or source metadata. Leave the field empty if not available.
- Product page links and product images are useful enrichments, not evidence requirements. Do not omit an otherwise cited recommendation just because the exact product page or image URL is unavailable.
- Treat Amazon, Walmart, Target, Costco, and other broad marketplace or big-box listings as price, availability, image, and spec evidence only. Do not treat their search placement, star ratings, or marketplace visibility as proof that a product is one of the best.
- Prefer products with support from specialist retailers, official brand/manufacturer pages, expert testing, long-term owner discussions, forums, or review evidence. Big-box or private-label products should not outrank stronger matches unless independent evidence supports quality and fit.
- Do not put recommendations, product lists, markdown, citations, or source excerpts in search_summary.
- If evidence is thin, conflicting, outdated, or not directly relevant, include the recommendation only when it has at least one relevant citation, then lower confidence and explain the limitation.
- Only include candidates when at least one relevant public source supports the product.
- Never use the same product name more than once in the candidate pool.
- Treat user-selected Smart Features as mandatory requirements, not preferences.
- Treat hard numeric limits, including budget and size limits, as mandatory requirements.
- Never recommend a product that violates a mandatory requirement.
- It is better to return fewer products than inaccurate products.
- Never list a product as recommended if one of its cons, complaints, or not-for notes directly contradicts a selected Smart Feature or hard requirement.
- Final buying advice may only reference products by name when they appear in the final recommendations array.
- Do not reference rejected products, near-matches, or research-only candidates by name in final buying advice.
- Never describe a product as "best on the market", "top-rated", "highest quality", "most reliable", or a similar superlative unless a cited source directly supports that exact claim. Prefer wording like "strongest option based on available evidence."
- Prefer products corroborated by multiple independent sources over products supported by a single listing.
- Treat an unknown or unverified price as a significant weakness whenever in-budget alternatives with verified prices exist.
- Do not include a weakly supported product ahead of a better-evidenced product that also fits the requirements.
- Do not rank by star rating alone.
- Penalize affiliate-only recommendations.
- Penalize products with repeated reliability, durability, warranty, comfort, safety, or support complaints.
- Preserve meaningful disagreement between sources.
- Keep the result practical, concise, and buyer-focused.
- Return only the requested structured JSON shape.
- Only generate pros, cons, and common complaints from evidence found in web sources, product specs, or provided server-side candidate evidence. Do not invent product-specific claims.
- Pros must be real product advantages, features, or positive owner/expert feedback. Never list "matches your search", "fits your criteria", "within your budget", "meets selected features", "good match for your request", "aligned with user preferences", "satisfies important details", or similar requirement-matching language as a pro.
- If evidence is missing, say what important buying detail is unknown instead of guessing.
- Common complaints require repeated evidence. Do not list a complaint as common from a single weak mention.

Source weighting, from strongest to weakest:
1. Long-term owner reviews and repeated real-user discussion patterns.
2. Reddit/forum consensus when available, especially repeated ownership reports rather than one-off comments.
3. YouTube reviews with clear hands-on testing, measurements, teardown, or long-term use.
4. Expert review sites with transparent testing methods.
5. Specialist retailers or category-focused retailers, especially when their product pages include detailed specs and review depth.
6. Broad retailer or marketplace reviews from Amazon, Walmart, Target, Costco, and similar sites. Treat these carefully because fake, incentivized, search-rank, or early-impression reviews may exist.
7. Manufacturer pages only for specs, compatibility, warranty terms, dimensions, materials, and official claims. Do not use manufacturer pages for trust ranking.

Confidence scoring:
- 90-100 = strong agreement across multiple reliable source types.
- 75-89 = good support, but with some limitations, tradeoffs, or source gaps.
- 60-74 = mixed support, limited evidence, or meaningful disagreement.
- Below 60 = weak confidence, niche fit, sparse evidence, or notable unresolved complaints.

Source consensus labels:
- Strong = multiple reliable source types broadly agree.
- Mixed = sources disagree or praise is paired with recurring complaints.
- Weak = few reliable sources, shallow evidence, or mostly retailer/affiliate support.
- Niche = good fit for a specific buyer need but not a broad recommendation.
`.trim();

function formatBudgetAmount(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export type ResearchPromptMarketCoverage = {
  candidateCount: number;
  pricedCandidateCount: number;
  rescueQueriesRun: number;
  retailerHostCount: number;
};

export function buildResearchPrompt(
  input: RecommendationApiRequest,
  generatedQueries: string[] = [],
  discoveredCandidates: RawProductCandidate[] = [],
  marketCoverage?: ResearchPromptMarketCoverage,
) {
  const selectedFeaturesText =
    input.selectedFeatures && input.selectedFeatures.length > 0
      ? input.selectedFeatures.map(selectedSmartFeatureLabel).join(", ")
      : "None selected";
  const queryList =
    generatedQueries.length > 0
      ? generatedQueries.map((query, index) => `${index + 1}. ${query}`).join("\n")
      : "No generated queries were provided.";
  const candidateList =
    discoveredCandidates.length > 0
      ? discoveredCandidates
          .slice(0, 40)
          .map((candidate, index) => {
            const sourceHosts = Array.from(
              new Set(
                candidate.evidenceSources
                  .map((source) => {
                    try {
                      return new URL(source.url).hostname.replace(/^www\./, "");
                    } catch {
                      return "";
                    }
                  })
                  .filter(Boolean),
              ),
            )
              .slice(0, 3)
              .join(", ");
            const specs = [
              candidate.retailer ? `retailer: ${candidate.retailer}` : "",
              candidate.price !== null ? `price: $${candidate.price}` : "",
              candidate.availableColors.length > 0
                ? `colors: ${candidate.availableColors.join(", ")}`
                : "",
              candidate.dimensions.width !== null
                ? `width: ${candidate.dimensions.width} in`
                : "",
              candidate.dimensions.depth !== null
                ? `depth: ${candidate.dimensions.depth} in`
                : "",
              candidate.dimensions.height !== null
                ? `height: ${candidate.dimensions.height} in`
                : "",
              sourceHosts ? `sources: ${sourceHosts}` : "",
              candidate.productUrl ? `url: ${candidate.productUrl}` : "",
            ]
              .filter(Boolean)
              .join("; ");

            return `${index + 1}. ${candidate.name}${specs ? ` (${specs})` : ""}`;
          })
          .join("\n")
      : "No server-side Serper candidates were available.";
  const extractedRequirements =
    input.extractedRequirements || extractStructuredRequirements(input);
  const premiumBudget =
    extractedRequirements.budgetRules[0]?.premiumCap ?? null;
  const structuredRequirementsText = constraintsToText(extractedRequirements);
  const discoveryContext = discoveryContextForPrompt(
    input.discoveryStrategy,
    input.discoveryGapCheck,
  );

  return `
Research this buying decision:

Product category: ${input.query}
Budget: ${input.budget || "Not specified"}
Close-match discovery budget range: ${premiumBudget === null ? "Not specified" : formatBudgetAmount(premiumBudget)}
What matters most: ${input.priorities || "Not specified"}
Avoid: ${input.avoid || "Not specified"}
Selected product features: ${selectedFeaturesText}

Structured requirements extracted by the app before search:
${structuredRequirementsText}

Use this generated multi-query search plan before choosing final products:
${queryList}

Server-side Serper product candidates found before AI synthesis:
${candidateList}

${discoveryContext ? `${discoveryContext}\n\n` : ""}
${
    marketCoverage
      ? `Server-side market coverage before AI research: ${marketCoverage.candidateCount} relevant candidates from ${marketCoverage.retailerHostCount} retailer hosts, ${marketCoverage.pricedCandidateCount} with verified prices${
          marketCoverage.rescueQueriesRun > 0
            ? ` (after ${marketCoverage.rescueQueriesRun} extra coverage searches)`
            : ""
        }.${
          marketCoverage.candidateCount < 10 || marketCoverage.retailerHostCount < 3
            ? " Coverage is limited: search especially broadly for additional well-known brands and models, and keep confidence conservative when evidence stays thin."
            : ""
        }

`
      : ""
  }Treat these Serper candidates as discovery hints, not final recommendations. Verify any claims with web search and citations before using them in candidate_products. Broad retailer and marketplace candidates are useful for product pages, prices, images, and specs, but they should not dominate the candidate pool unless independent evidence supports product quality.

Return JSON using exactly this shape:
{
  "search_summary": string,
  "assumptions": string[],
  "generated_queries": string[],
  "raw_candidate_count": number,
  "candidate_products": [
    {
      "recommendation_type": "Best Match" | "Close Match",
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

candidate_products is the raw candidate pool. It should contain up to 25-50 distinct products when public evidence allows.
generated_queries must return the generated search queries used for discovery. It may include up to 18 staged query candidates.
raw_candidate_count should be the count of candidate_products before app-side filtering.

Return candidate_products as a broad pool, not as final ranked recommendations.
- Use "Best Match" when the available evidence appears to satisfy every hard user requirement.
- Use "Close Match" when the product looks relevant but a hard requirement is missing, unverified, or likely failed.
- The app will re-check requirements and assign final #1-#7 Best Match ranks after your response.

For common product categories, search enough sources to return a deep candidate pool of credible products when reliable evidence exists.
The candidate pool is incomplete if a common category returns only one or two products. Use the generated queries and separate search passes to discover a broad candidate set, then let app-side filtering decide exact and close matches.
For common categories, include all credible candidates with at least one relevant citation, even if some may later become near matches.
When the user gives a realistic budget and a required brand for a broad common category, first search for mainstream brand models with verified prices inside that budget. Do not fill the pool mostly with premium, racing, flagship, collector, or unknown-price products when affordable mainstream options are available.
Do not weaken user requirements just to make the candidate pool look fuller. The app will filter exact matches after candidate collection.
Each candidate must be a distinct product. Do not use "Avoid", budget/value/premium award labels, or "Best for User Need" as recommendation_type values.

The user selected these important product features:
${selectedFeaturesText}

These selected product features are mandatory requirements. Only recommend products that clearly match them or are clearly available with those options:
- Best Match

If the user selected multiple values for the same feature, treat those values as acceptable alternatives. For example, "Color: Black" and "Color: Beige" means the product may be black OR beige; it does not need to be both.
Do not mark products as Best Match when they do not match these selected features. If fewer products match, return fewer Best Match candidates and include relevant Close Match candidates separately.
If the user selected a color, material, size, feature, or option, the recommendation must clearly support that availability in the product evidence.
The selected feature must not appear as a con, limitation, complaint, or not-for reason.
Collect a broad candidate pool first. Some generated queries should be broad enough to discover candidates, and strict filtering happens after candidates are collected.

Search strategy:
1. Run searches across the generated query list.
2. Search broadly for category synonyms and alternate names.
3. Search retailer-style and product-page style phrases to find exact product pages.
4. Search size, color, material, feature, and budget phrases when relevant.
5. Search for a broad set of credible mainstream, well-reviewed, budget-appropriate, and higher-quality candidates without forcing category award labels.
6. Treat What matters most as positive priorities the buyer cares about, and Avoid as negative preferences or product traits to steer away from.
7. Search for recurring complaints and products/patterns to avoid.
8. For each promising candidate, search the exact product name with "official", "manufacturer", "retailer", or "buy" to find the exact product page and image metadata when available.

Every recommendation must include citations that support the reasoning.
Every citation url must be a complete non-empty http or https URL.
If a citation does not directly support the recommendation, do not use it.
Budget is a firm filter for Best Match candidates. If the user says under a price, do not mark products above that price as Best Match.
If an above-budget product is otherwise relevant, mark it Close Match and clearly explain the budget miss in price_value_verdict or why_recommended.
Product credibility matters. When multiple products satisfy the hard requirements, prefer products with stronger market evidence: higher verified review count, solid average rating, repeated source coverage, major retailer presence, official or exact product pages, editorial or hands-on review coverage, complete specs, verified price, and product image evidence.
Do not place an obscure, low-review, one-source product above a credible mainstream product that also satisfies the hard requirements. If only low-review or lesser-known products match, include them cautiously and lower confidence/source_consensus instead of overstating certainty.
Treat review volume and source support as credibility evidence, not as product pros. Use them in why_recommended, source_consensus, confidence_score, price_value_verdict, and citations.
Pros and cons must be product-quality based only.
- Pros must describe actual positive product qualities, features, performance, usability, build quality, compatibility, durability, convenience, or review-backed strengths.
- Cons must describe actual negatives, drawbacks, missing features, complaints, quality issues, poor fit, or review-backed weaknesses.
- Do not put budget compliance, price limits, "within budget", "under budget", "fits the price range", "stays within the main budget", "official price shown", "listed price", or "price is under" in pros or cons.
- Put price and budget discussion in estimated_price_range or price_value_verdict instead.
- A value-for-money pro is allowed only if it is a product-quality judgment backed by reviews or evidence, such as strong performance for the money or durable build for the price.
Hard numeric limits in What matters most are firm filters. Phrases like "has to be", "must be", "needs to be", "under", "less than", "no bigger than", "at least", "minimum", "maximum", and "only" indicate mandatory requirements.
If a mandatory size, color, material, or option is requested, include clear evidence in the product fields that the product matches it.
If no exact products match all mandatory requirements, include the closest cited candidates in candidate_products so the app can show them as near matches.
Only reference products by name in final_buying_advice when they are included in candidate_products[].name and clearly satisfy the user's hard requirements.
The app will rewrite final_buying_advice after exact-match filtering if needed.
Do not mention products that were rejected, disqualified, near-matches, or considered only during research in final_buying_advice.
If evidence is limited, say so in search_summary, assumptions, source_consensus, confidence_score, and final_buying_advice.
Use what_to_avoid for product patterns, specs, brands, or models the buyer should avoid based on cited evidence or clearly stated uncertainty.
Keep search_summary to one short plain-English sentence. Do not put product lists, markdown, citations, or recommendation details in search_summary.
Do not format any field with markdown headings, bullet syntax, or numbered lists. Return plain strings and arrays only.

For each recommendation:
- why_recommended must explain why the product belongs in the candidate pool and what evidence supports it.
- Do not assign final rank numbers. The app assigns final #1-#7 Best Match ranks after deterministic validation and scoring.
- Before returning JSON, verify that every recommendations[].name appears only once. Duplicate product names make the result invalid.
- Include credible higher-quality or higher-priced candidates when they are relevant, but do not label them as exact matches if they violate the user's hard budget.
- product_page_url must be the exact official manufacturer product webpage when available. If no official product page can be confidently verified, use an exact reputable retailer product page. Use an empty string only if you cannot verify an exact product page.
- Do not invent official product URLs. If the official brand page cannot be confidently identified, use the best verified retailer product page instead.
- Do not use review-site category pages, buying-guide pages, search result pages, or homepages as product_page_url.
- product_image_url must be a direct image URL for that product from the product page, retailer page, manufacturer page, or cited source metadata. Use an empty string only if you cannot verify one.
- pros should capture common praise from reliable sources.
- pros must come from confirmed specs, repeated positive review signals, expert review positives, retailer review patterns, or factual product-page claims.
- pros must not say the product matches the search, criteria, budget, selected features, or user request. Requirement matching determines whether the product is included; it is not a product advantage.
- If there is not enough evidence for real product advantages, use a cautious phrase such as "Limited review evidence available" instead of inventing a benefit.
- cons should include verified downsides, meaningful tradeoffs, important missing information, single-source negative evidence, or weak evidence quality.
- common_complaints must capture repeated complaints, not isolated noise. If repeated complaint evidence is not available, return an empty common_complaints array for that product.
- Avoid generic filler such as "features can add complexity", "may not be best for everyone", "mixed reviews", or "potential durability concerns" unless the sentence explains the exact evidence gap or tradeoff.
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

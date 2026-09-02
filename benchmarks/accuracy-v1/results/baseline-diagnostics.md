# Accuracy Benchmark V1 Per-search Diagnostics

Generated: 2026-09-02T03:20:24.572Z

Loss counts are for frozen grade-2/3 reference products. Product issues are source-bound manual adjudications. `n/a` NDCG means no scored reference denominator.

| Case | Type | Returned | Discovered leaders | Final leaders | NDCG@3 | Earliest losses | Product issues |
|---|---|---:|---:|---:|---:|---|---|
| broad-robot-vacuum | broad | 5 | 2/3 | 1/3 | 72.3% | candidate_truncation_or_ranking:1, never_discovered:1 | #2 bad_image, #5 family_duplicate |
| broad-drip-coffee-maker | broad | 3 | 2/3 | 0/3 | 49.0% | candidate_truncation_or_ranking:2, never_discovered:1 | #1 wrong_configuration, #1 bad_page |
| broad-pressure-washer | broad | 3 | 2/3 | 0/3 | 40.5% | candidate_truncation_or_ranking:2, never_discovered:1 | none |
| broad-gaming-monitor | broad | 2 | 0/3 | 0/3 | 44.6% | never_discovered:3 | none |
| broad-laptop | broad | 4 | 2/3 | 0/3 | 71.5% | page_or_commerce_verification:1, never_discovered:1, candidate_truncation_or_ranking:1 | #2 wrong_configuration, #2 bad_page |
| broad-cordless-drill | broad | 2 | 1/3 | 1/3 | 61.6% | never_discovered:2 | #1 wrong_configuration, #1 bad_page |
| broad-cordless-leaf-blower | broad | 4 | 0/3 | 0/3 | 63.8% | never_discovered:3 | #1 wrong_configuration, #1 bad_page |
| broad-air-purifier | broad | 2 | 2/3 | 1/3 | 32.1% | never_discovered:1, page_or_commerce_verification:1 | #1 wrong_product_type, #1 hard_fail:product_type:air_purifier, #1 bad_page |
| broad-office-chair | broad | 1 | 2/3 | 0/3 | 17.0% | final_selection_crowd_out:1, never_discovered:1, candidate_truncation_or_ranking:1 | none |
| broad-treadmill | broad | 4 | 2/3 | 0/3 | 63.8% | never_discovered:1, candidate_truncation_or_ranking:2 | #4 bad_price |
| broad-wireless-earbuds | broad | 3 | 3/3 | 0/3 | 72.3% | final_selection_crowd_out:1, candidate_deduplication:1, page_or_commerce_verification:1 | none |
| broad-gas-grill | broad | 2 | 1/3 | 0/3 | 44.6% | never_discovered:2, candidate_truncation_or_ranking:1 | none |
| budget-robot-vacuum-800 | broad_budget | 5 | 2/3 | 0/3 | 59.5% | candidate_truncation_or_ranking:2, never_discovered:1 | #2 family_duplicate, #5 bad_image |
| budget-coffee-maker-250 | broad_budget | 5 | 2/3 | 0/3 | 53.1% | prefilter_rejection:1, never_discovered:1, candidate_truncation_or_ranking:1 | #5 family_duplicate |
| budget-65-inch-tv-1000 | broad_budget | 1 | 0/3 | 0/3 | 33.9% | never_discovered:3 | none |
| budget-laptop-1000 | broad_budget | 3 | 2/3 | 1/3 | 78.5% | never_discovered:1, final_selection_crowd_out:1 | none |
| budget-office-chair-500 | broad_budget | 1 | 2/3 | 0/3 | 38.0% | final_selection_crowd_out:2, never_discovered:1 | #1 bad_image |
| budget-air-purifier-300 | broad_budget | 3 | 1/3 | 1/3 | 53.1% | never_discovered:2 | none |
| budget-cordless-mower-700 | broad_budget | 1 | 0/3 | 0/3 | 38.0% | never_discovered:3 | none |
| budget-blender-300 | broad_budget | 1 | 1/3 | 0/3 | 33.9% | never_discovered:2, candidate_truncation_or_ranking:1 | none |
| spec-monitor-27-qhd-144 | hard_spec | 2 | 3/3 | 1/3 | 69.0% | final_selection_crowd_out:1, prefilter_rejection:1 | none |
| spec-leaf-blower-600-cfm | hard_spec | 0 | 0/3 | 0/3 | 0.0% | never_discovered:3 | none |
| spec-laptop-32gb-1tb | hard_spec | 1 | 0/2 | 0/2 | 26.6% | never_discovered:2 | #1 wrong_configuration, #1 bad_page |
| spec-drill-brushless-kit | hard_spec | 4 | 1/3 | 0/3 | 44.6% | candidate_deduplication:1, never_discovered:2 | #3 hard_fail:feature:brushless, #4 hard_fail:feature:brushless |
| spec-treadmill-300lb | hard_spec | 0 | 2/3 | 0/3 | 0.0% | candidate_truncation_or_ranking:1, final_selection_crowd_out:1, never_discovered:1 | none |
| spec-power-station-1500wh | hard_spec | 0 | 0/3 | 0/3 | 0.0% | never_discovered:3 | none |
| spec-dehumidifier-50-pint-pump | hard_spec | 2 | 0/3 | 0/3 | 50.0% | never_discovered:3 | none |
| spec-shop-vac-12-gallon | hard_spec | 4 | 0/3 | 0/3 | 38.0% | never_discovered:3 | #2 hard_fail:numeric_spec:at_least_12_gallons, #3 hard_fail:numeric_spec:at_least_12_gallons, #4 hard_fail:numeric_spec:at_least_12_gallons |
| brand-dewalt-drill-kit | brand | 1 | 1/2 | 0/2 | 23.5% | never_discovered:1, candidate_truncation_or_ranking:1 | none |
| brand-non-apple-anc-earbuds | brand_alternative | 2 | 3/3 | 0/3 | 72.3% | final_selection_crowd_out:1, candidate_truncation_or_ranking:1, page_or_commerce_verification:1 | none |
| brand-weber-napoleon-grill | brand | 1 | 2/3 | 0/3 | 33.9% | candidate_truncation_or_ranking:1, prefilter_rejection:1, never_discovered:1 | none |
| brand-roborock-alternative | brand_alternative | 3 | 2/3 | 0/3 | 73.5% | candidate_truncation_or_ranking:2, never_discovered:1 | none |
| size-counter-depth-fridge-36 | size_dimension | 0 | 1/3 | 0/3 | 0.0% | never_discovered:2, prefilter_rejection:1 | none |
| size-compact-treadmill-70 | size_dimension | 0 | 2/3 | 0/3 | 0.0% | final_selection_crowd_out:1, never_discovered:1, candidate_truncation_or_ranking:1 | none |
| size-dishwasher-24 | size_dimension | 0 | 1/3 | 0/3 | 0.0% | prefilter_rejection:1, never_discovered:2 | none |
| size-tv-55-width-49 | size_dimension | 1 | 0/3 | 0/3 | 33.9% | never_discovered:3 | none |
| exclude-drip-no-pods | exclusion | 5 | 3/3 | 0/3 | 68.7% | candidate_truncation_or_ranking:2, page_or_commerce_verification:1 | #4 family_duplicate |
| exclude-leaf-no-jobsite | exclusion | 2 | 1/3 | 0/3 | 27.7% | never_discovered:2, page_or_commerce_verification:1 | none |
| exclude-shop-vac-no-accessories | exclusion | 4 | 1/3 | 0/3 | 52.5% | candidate_truncation_or_ranking:1, never_discovered:2 | none |
| exclude-upright-no-stick | exclusion | 3 | 2/3 | 0/3 | 61.6% | page_or_commerce_verification:2, never_discovered:1 | none |
| multi-robot-self-empty-600 | multiple_constraints | 1 | 3/3 | 0/3 | 46.9% | candidate_truncation_or_ranking:2, merchant_or_market_filter:1 | none |
| multi-electric-pressure-2300 | multiple_constraints | 1 | 0/3 | 0/3 | 38.0% | never_discovered:3 | none |
| multi-espresso-grinder-1000 | multiple_constraints | 1 | 1/3 | 0/3 | 33.9% | prefilter_rejection:1, never_discovered:2 | none |
| multi-drill-no-combo | multiple_constraints | 0 | 1/3 | 0/3 | 0.0% | candidate_deduplication:1, never_discovered:2 | none |
| multi-dehumidifier-basement-pump | multiple_constraints | 5 | 0/3 | 0/3 | 81.0% | never_discovered:3 | #5 hard_fail:feature:built_in_pump |
| niche-left-vertical-mouse | niche | 2 | 0/3 | 0/3 | 38.0% | never_discovered:3 | #2 hard_fail:feature:left_handed |
| niche-induction-1800w | niche | 0 | 1/3 | 0/3 | 0.0% | merchant_or_market_filter:1, never_discovered:2 | none |
| niche-inverter-generator | niche | 2 | 2/3 | 1/3 | 24.0% | final_selection_crowd_out:1, never_discovered:1 | #1 hard_fail:numeric_spec:at_least_2000_running_watts |


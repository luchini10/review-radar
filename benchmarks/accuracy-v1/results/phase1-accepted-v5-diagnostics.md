# Accuracy Benchmark V1 Per-search Diagnostics

Generated: 2026-09-02T08:58:49.366Z

Loss counts are for frozen grade-2/3 reference products. Product issues are source-bound manual adjudications. `n/a` NDCG means no scored reference denominator.

| Case | Type | Returned | Discovered leaders | Final leaders | NDCG@3 | Earliest losses | Product issues |
|---|---|---:|---:|---:|---:|---|---|
| broad-robot-vacuum | broad | 5 | 3/3 | 1/3 | 70.1% | candidate_truncation_or_ranking:2 | none |
| broad-drip-coffee-maker | broad | 4 | 3/3 | 1/3 | 33.3% | candidate_truncation_or_ranking:2 | #2 family_duplicate, #2 bad_page |
| broad-pressure-washer | broad | 1 | 2/3 | 0/3 | 19.0% | candidate_truncation_or_ranking:2, never_discovered:1 | none |
| broad-gaming-monitor | broad | 1 | 0/3 | 0/3 | 17.0% | never_discovered:3 | none |
| broad-laptop | broad | 2 | 3/3 | 0/3 | 24.0% | candidate_truncation_or_ranking:3 | #1 wrong_configuration, #1 bad_page |
| broad-cordless-drill | broad | 3 | 1/3 | 1/3 | 70.1% | never_discovered:2 | #1 wrong_configuration, #1 bad_page |
| broad-cordless-leaf-blower | broad | 3 | 0/3 | 0/3 | 36.2% | never_discovered:3 | none |
| broad-air-purifier | broad | 5 | 1/3 | 0/3 | 36.2% | never_discovered:2, page_or_commerce_verification:1 | none |
| broad-office-chair | broad | 2 | 3/3 | 0/3 | 83.0% | candidate_truncation_or_ranking:3 | none |
| broad-treadmill | broad | 2 | 3/3 | 0/3 | 27.7% | candidate_truncation_or_ranking:3 | none |
| broad-wireless-earbuds | broad | 1 | 3/3 | 0/3 | 17.0% | candidate_truncation_or_ranking:1, page_or_commerce_verification:1, prefilter_rejection:1 | none |
| broad-gas-grill | broad | 2 | 2/3 | 0/3 | 38.4% | candidate_truncation_or_ranking:2, never_discovered:1 | none |
| budget-robot-vacuum-800 | broad_budget | 5 | 3/3 | 1/3 | 43.0% | candidate_truncation_or_ranking:2 | #3 wrong_configuration, #3 bad_page |
| budget-coffee-maker-250 | broad_budget | 2 | 3/3 | 0/3 | 44.6% | candidate_truncation_or_ranking:3 | none |
| budget-65-inch-tv-1000 | broad_budget | 1 | 0/3 | 0/3 | 17.0% | never_discovered:3 | none |
| budget-laptop-1000 | broad_budget | 1 | 2/3 | 1/3 | 57.0% | never_discovered:1, final_selection_crowd_out:1 | none |
| budget-office-chair-500 | broad_budget | 1 | 2/3 | 0/3 | 19.0% | final_selection_crowd_out:2, never_discovered:1 | none |
| budget-air-purifier-300 | broad_budget | 1 | 2/3 | 0/3 | 17.0% | never_discovered:1, candidate_truncation_or_ranking:1, merchant_or_market_filter:1 | none |
| budget-cordless-mower-700 | broad_budget | 0 | 1/3 | 0/3 | 0.0% | prefilter_rejection:1, never_discovered:2 | none |
| budget-blender-300 | broad_budget | 1 | 2/3 | 0/3 | 17.0% | page_or_commerce_verification:1, candidate_truncation_or_ranking:1, never_discovered:1 | none |
| spec-monitor-27-qhd-144 | hard_spec | 1 | 2/3 | 1/3 | 38.0% | final_selection_crowd_out:1, never_discovered:1 | none |
| spec-leaf-blower-600-cfm | hard_spec | 1 | 1/3 | 0/3 | 33.9% | never_discovered:2, candidate_truncation_or_ranking:1 | none |
| spec-laptop-32gb-1tb | hard_spec | 0 | 0/2 | 0/2 | 0.0% | never_discovered:2 | none |
| spec-drill-brushless-kit | hard_spec | 2 | 1/3 | 0/3 | 44.6% | candidate_deduplication:1, never_discovered:2 | none |
| spec-treadmill-300lb | hard_spec | 2 | 3/3 | 0/3 | 31.0% | candidate_truncation_or_ranking:2, final_selection_crowd_out:1 | none |
| spec-power-station-1500wh | hard_spec | 0 | 3/3 | 0/3 | 0.0% | final_selection_crowd_out:1, candidate_truncation_or_ranking:2 | none |
| spec-dehumidifier-50-pint-pump | hard_spec | 2 | 0/3 | 0/3 | 43.0% | never_discovered:3 | none |
| spec-shop-vac-12-gallon | hard_spec | 1 | 2/3 | 0/3 | 38.0% | merchant_or_market_filter:1, candidate_truncation_or_ranking:1, never_discovered:1 | none |
| brand-dewalt-drill-kit | brand | 1 | 1/2 | 0/2 | 23.5% | never_discovered:1, candidate_truncation_or_ranking:1 | none |
| brand-non-apple-anc-earbuds | brand_alternative | 2 | 3/3 | 0/3 | 61.6% | candidate_truncation_or_ranking:2, page_or_commerce_verification:1 | none |
| brand-weber-napoleon-grill | brand | 1 | 1/3 | 0/3 | 17.0% | never_discovered:2, prefilter_rejection:1 | none |
| brand-roborock-alternative | brand_alternative | 5 | 1/3 | 1/3 | 73.5% | never_discovered:2 | none |
| size-counter-depth-fridge-36 | size_dimension | 0 | 1/3 | 0/3 | 0.0% | never_discovered:2, prefilter_rejection:1 | none |
| size-compact-treadmill-70 | size_dimension | 0 | 1/3 | 0/3 | 0.0% | never_discovered:2, prefilter_rejection:1 | none |
| size-dishwasher-24 | size_dimension | 1 | 0/3 | 0/3 | 17.0% | never_discovered:3 | none |
| size-tv-55-width-49 | size_dimension | 1 | 0/3 | 0/3 | 33.9% | never_discovered:3 | none |
| exclude-drip-no-pods | exclusion | 2 | 3/3 | 0/3 | 25.5% | candidate_truncation_or_ranking:2, page_or_commerce_verification:1 | none |
| exclude-leaf-no-jobsite | exclusion | 1 | 1/3 | 0/3 | 17.0% | never_discovered:2, candidate_truncation_or_ranking:1 | none |
| exclude-shop-vac-no-accessories | exclusion | 2 | 2/3 | 0/3 | 31.0% | candidate_truncation_or_ranking:2, never_discovered:1 | none |
| exclude-upright-no-stick | exclusion | 3 | 3/3 | 2/3 | 74.6% | page_or_commerce_verification:1 | none |
| multi-robot-self-empty-600 | multiple_constraints | 3 | 3/3 | 1/3 | 100.0% | final_selection_crowd_out:1, candidate_truncation_or_ranking:1 | none |
| multi-electric-pressure-2300 | multiple_constraints | 1 | 0/3 | 0/3 | 38.0% | never_discovered:3 | none |
| multi-espresso-grinder-1000 | multiple_constraints | 0 | 1/3 | 0/3 | 0.0% | never_discovered:2, final_selection_crowd_out:1 | none |
| multi-drill-no-combo | multiple_constraints | 0 | 0/3 | 0/3 | 0.0% | never_discovered:3 | none |
| multi-dehumidifier-basement-pump | multiple_constraints | 0 | 0/3 | 0/3 | 0.0% | never_discovered:3 | none |
| niche-left-vertical-mouse | niche | 0 | 1/3 | 0/3 | 0.0% | candidate_truncation_or_ranking:1, never_discovered:2 | none |
| niche-induction-1800w | niche | 2 | 2/3 | 0/3 | 31.0% | merchant_or_market_filter:1, never_discovered:1, candidate_truncation_or_ranking:1 | none |
| niche-inverter-generator | niche | 0 | 2/3 | 0/3 | 0.0% | final_selection_crowd_out:1, candidate_truncation_or_ranking:1, never_discovered:1 | none |


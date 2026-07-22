import {
  DIRECT_TERRA_API_VERSION,
  type DirectTerraCompletedResponse,
} from "./directTerraApiContract.ts";

export const DIRECT_TERRA_PREVIEW_PATH = "/oai-t8-preview";

export function isDirectTerraPreviewAvailable(nodeEnv: string | undefined) {
  return nodeEnv === "development";
}

const sourceOne = "https://example.com/controlled-source-one";
const sourceTwo = "https://example.com/controlled-source-two";

export const directTerraPreviewResult: DirectTerraCompletedResponse = {
  pipeline: "direct_terra",
  version: DIRECT_TERRA_API_VERSION,
  state: "completed",
  reportMarkdown: `# Controlled product research example

This development-only report demonstrates the real presentation contract with fictional product identities and controlled links.

## #1 Best Match - Example Atlas One

### Why it ranks first

Atlas One is the strongest fit in this controlled example because it satisfies the stated priorities while keeping its main compromise visible. The evidence describes a balanced option rather than a universally perfect one [Controlled expert source](${sourceOne}).

### Best for

- Buyers who value a clear balance of capability and simplicity.
- Shoppers who want the strongest all-around fit before considering specialist alternatives.

### Main tradeoff

The controlled owner evidence notes that it is less compact than the lighter alternative [Controlled owner source](${sourceTwo}).

## #2 Best Match - Example Meridian Two

### Why it ranks second

Meridian Two is the value-oriented option in this fictional slate. It preserves the core requirement set but gives up one premium convenience [Controlled expert source](${sourceOne}).

### Best for

- Buyers prioritizing value over the most polished feature set.

### Main tradeoff

Its setup is more involved than the top-ranked example.

## #3 Best Match - Example Field Three

### Why it ranks third

Field Three is the focused alternative for shoppers who value portability above maximum capacity [Controlled owner source](${sourceTwo}).

### Decision notes

| Signal | Controlled finding |
| --- | --- |
| Fit | Strong for portability |
| Evidence | Mixed source coverage |
| Verify before buying | Current price and availability |

## Final buying advice

Start with Atlas One when the overall balance matters most. Choose Meridian Two when value is the deciding factor, or Field Three when portability outweighs capacity.`,
  citationUrls: [sourceOne, sourceTwo],
  sourceHosts: ["example.com"],
  disabledCitationCount: 0,
  priceEstimates: [
    {
      rank: 1,
      brand: "Example",
      model: "Atlas One",
      currency: "USD",
      low: 280,
      high: 340,
      median: 310,
      sourceCount: 3,
    },
    {
      rank: 2,
      brand: "Example",
      model: "Meridian Two",
      currency: "USD",
      low: 210,
      high: 260,
      median: 235,
      sourceCount: 2,
    },
    {
      rank: 3,
      brand: "Example",
      model: "Field Three",
      currency: "USD",
      low: 180,
      high: 230,
      median: 205,
      sourceCount: 2,
    },
  ],
  rejectedPriceObservationCount: 2,
  transactionalStatus: "unverified",
};

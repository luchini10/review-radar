import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isDirectTerraCompletedResponse } from "../lib/directTerraApiContract.ts";
import {
  directTerraPreviewResult,
  isDirectTerraPreviewAvailable,
} from "../lib/directTerraPreviewData.ts";
import { extractDirectTerraPicks } from "../lib/directTerraReportOutline.ts";

describe("direct Terra development preview", () => {
  it("is available only in development", () => {
    assert.equal(isDirectTerraPreviewAvailable("development"), true);
    assert.equal(isDirectTerraPreviewAvailable("production"), false);
    assert.equal(isDirectTerraPreviewAvailable("test"), false);
    assert.equal(isDirectTerraPreviewAvailable(undefined), false);
  });

  it("uses the production response contract with controlled fictional data", () => {
    assert.equal(isDirectTerraCompletedResponse(directTerraPreviewResult), true);
    assert.equal(
      extractDirectTerraPicks(directTerraPreviewResult.reportMarkdown).length,
      3,
    );
    assert.match(directTerraPreviewResult.reportMarkdown, /development-only/i);
    assert.match(directTerraPreviewResult.reportMarkdown, /fictional/i);
    assert.deepEqual(directTerraPreviewResult.sourceHosts, ["example.com"]);
    assert.equal(directTerraPreviewResult.productAssets.length, 3);
    assert.equal(directTerraPreviewResult.productAssets[0].rank, 1);
  });
});

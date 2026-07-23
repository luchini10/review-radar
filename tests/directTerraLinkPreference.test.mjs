import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyDirectTerraLinkHost,
  cleanDirectTerraDisplayUrl,
  DIRECT_TERRA_LINK_SCORES,
  DIRECT_TERRA_ORGANIC_SKIP_SCORE,
  directTerraModelInUrlPath,
  directTerraRetailerDisplayLabel,
  isDirectTerraManufacturerHost,
  registrableDomain,
  scoreDirectTerraProductLink,
} from "../lib/directTerraLinkPreference.ts";

describe("direct Terra link preference (T8B)", () => {
  it("computes registrable domains including common multi-part suffixes", () => {
    assert.equal(registrableDomain("www.homedepot.com"), "homedepot.com");
    assert.equal(registrableDomain("mobileimages.lowes.com"), "lowes.com");
    assert.equal(registrableDomain("images.thdstatic.com"), "thdstatic.com");
    assert.equal(registrableDomain("shop.example.co.uk"), "example.co.uk");
    assert.equal(registrableDomain("ridgid.com"), "ridgid.com");
  });

  it("recognizes brand-owned manufacturer hosts without over-matching", () => {
    assert.equal(
      isDirectTerraManufacturerHost("https://www.ridgid.com/vacs/hd1600", "RIDGID"),
      true,
    );
    assert.equal(
      isDirectTerraManufacturerHost(
        "https://www.milwaukeetool.com/0910-20",
        "Milwaukee",
      ),
      true,
    );
    assert.equal(
      isDirectTerraManufacturerHost(
        "https://www.vacmaster.com/beast",
        "Vacmaster Professional",
      ),
      true,
    );
    // A retailer is not the brand's site, and short brands cannot prefix-match.
    assert.equal(
      isDirectTerraManufacturerHost("https://www.homedepot.com/p/1", "RIDGID"),
      false,
    );
    assert.equal(
      isDirectTerraManufacturerHost("https://www.hpe.com/anything", "HP"),
      false,
    );
  });

  it("classifies manufacturer, popular retailer, and other hosts", () => {
    assert.equal(
      classifyDirectTerraLinkHost("https://www.dewalt.com/product/dxv16p-qt", "DEWALT"),
      "manufacturer",
    );
    assert.equal(
      classifyDirectTerraLinkHost("https://www.lowes.com/pd/DEWALT/5013926563", "DEWALT"),
      "popular_retailer",
    );
    assert.equal(
      classifyDirectTerraLinkHost("https://web.mdstetson.com/item/17595", "CRAFTSMAN"),
      "other",
    );
  });

  it("detects the exact compact model in the URL path only", () => {
    assert.equal(
      directTerraModelInUrlPath(
        "https://www.lowes.com/pd/DEWALT-Stealthsonic-DXV16P-QT-Vac/5013926563",
        "DXV16P-QT",
      ),
      true,
    );
    assert.equal(
      directTerraModelInUrlPath("https://www.homedepot.com/p/304795082", "HD1600"),
      false,
    );
    assert.equal(
      // Query strings never establish path identity.
      directTerraModelInUrlPath("https://x.com/p/1?model=HD1600", "HD1600"),
      false,
    );
  });

  it("scores the preference ladder in strict order", () => {
    const target = { brand: "RIDGID", model: "HD1600" };
    const scores = [
      scoreDirectTerraProductLink("https://www.ridgid.com/vacs/hd1600-nxt", target),
      scoreDirectTerraProductLink("https://www.homedepot.com/p/RIDGID-HD1600-Vac/304795082", target),
      scoreDirectTerraProductLink("https://www.ridgid.com/wet-dry-vacs", target),
      scoreDirectTerraProductLink("https://www.homedepot.com/p/304795082", target),
      scoreDirectTerraProductLink("https://some-shop.example.com/hd1600", target),
      scoreDirectTerraProductLink("https://some-shop.example.com/item/9", target),
      scoreDirectTerraProductLink(null, target),
    ];
    assert.deepEqual(scores, [
      DIRECT_TERRA_LINK_SCORES.manufacturerWithModel,
      DIRECT_TERRA_LINK_SCORES.popularRetailerWithModel,
      DIRECT_TERRA_LINK_SCORES.manufacturer,
      DIRECT_TERRA_LINK_SCORES.popularRetailer,
      DIRECT_TERRA_LINK_SCORES.otherWithModel,
      DIRECT_TERRA_LINK_SCORES.other,
      DIRECT_TERRA_LINK_SCORES.unavailable,
    ]);
    assert.equal(
      [...scores].sort((left, right) => right - left).join(","),
      scores.join(","),
    );
    assert.equal(
      DIRECT_TERRA_ORGANIC_SKIP_SCORE,
      DIRECT_TERRA_LINK_SCORES.popularRetailerWithModel,
    );
  });

  it("strips the entire query and hash from manufacturer and retailer links", () => {
    assert.equal(
      cleanDirectTerraDisplayUrl(
        "https://www.homedepot.com/p/304795082?MERCH=REC-_-pip_alternatives-_-x#reviews",
        "RIDGID",
      ),
      "https://www.homedepot.com/p/304795082",
    );
    assert.equal(
      cleanDirectTerraDisplayUrl(
        "https://www.ridgid.com/vacs/hd1600?utm_source=x",
        "RIDGID",
      ),
      "https://www.ridgid.com/vacs/hd1600",
    );
  });

  it("keeps unknown-host URLs untouched because rare stores may need params", () => {
    const url = "https://smallstore.example.com/product?variant=42";
    assert.equal(cleanDirectTerraDisplayUrl(url, "RIDGID"), url);
  });

  it("labels popular retailers by name and other hosts by domain", () => {
    assert.equal(
      directTerraRetailerDisplayLabel("https://www.homedepot.com/p/304795082"),
      "Home Depot",
    );
    assert.equal(
      directTerraRetailerDisplayLabel("https://www.lowes.com/pd/x/5013926563"),
      "Lowe's",
    );
    assert.equal(
      directTerraRetailerDisplayLabel("https://www.ridgid.com/vacs/hd1600", "RIDGID"),
      "ridgid.com",
    );
    assert.equal(directTerraRetailerDisplayLabel("not a url"), null);
  });
});

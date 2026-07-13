import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GOLD, coversLeader } from "../scripts/goldBenchmark.mjs";

const shopVac = GOLD.find((g) => g.id === "broad-shop-vac");
const conRobot = GOLD.find((g) => g.id === "con-robot-vac-300-selfempty");

describe("leader snapshot matching contract (leaders-v2026-07b)", () => {
  it("requires every brand token", () => {
    // "self" alone can never establish eufy; "ai" alone can never establish
    // Shark. Brand-OR-line matching was the v2026-07 defect.
    const eufy = conRobot.coreLeaders.find((l) => l.brand === "eufy");
    const shark = conRobot.coreLeaders.find((l) => l.brand === "shark");

    assert.equal(
      coversLeader("Dustin Wi-Fi Connected Self-Emptying Robot Vacuum", eufy),
      false,
    );
    assert.equal(
      coversLeader("Airtok AI Robot Vacuum with Auto Empty", shark),
      false,
    );
  });

  it("requires a line token when the leader defines lines", () => {
    const roborock = conRobot.coreLeaders.find((l) => l.brand === "roborock");

    // The constrained line list is ["q5"]; a Q10 is NOT a frozen leader hit.
    assert.equal(
      coversLeader(
        "Roborock Q10 VFS+ 13.9 in. Robotic Vacuum and Mop with Smart Dock",
        roborock,
      ),
      false,
    );
    assert.equal(
      coversLeader("Roborock Q5 Max+ Robot Vacuum and Mop", roborock),
      true,
    );
  });

  it("requires complete line-token boundaries", () => {
    const shark = conRobot.coreLeaders.find((l) => l.brand === "shark");
    const roborock = conRobot.coreLeaders.find((l) => l.brand === "roborock");

    assert.equal(
      coversLeader("Shark Airtok Robot Vacuum", shark),
      false,
    );
    assert.equal(
      coversLeader("Roborock Q50 Robot Vacuum", roborock),
      false,
    );
  });

  it("preserves multiword brands and plus-bearing line tokens", () => {
    assert.equal(
      coversLeader(
        "Herman Miller Aeron Ergonomic Office Chair",
        { brand: "herman miller", lines: ["aeron"] },
      ),
      true,
    );
    assert.equal(
      coversLeader(
        "RYOBI ONE+ HP 18V Cordless Drill",
        { brand: "ryobi", lines: ["one+"] },
      ),
      true,
    );
  });

  it("counts brand-only leaders on the brand alone", () => {
    const dewalt = shopVac.coreLeaders.find((l) => l.brand === "dewalt");
    const shopVacBrand = shopVac.coreLeaders.find((l) => l.brand === "shop vac");

    assert.equal(
      coversLeader("DEWALT DXV12P 12 Gallon 5.5 HP Wet/Dry Vacuum", dewalt),
      true,
    );
    assert.equal(
      coversLeader("Shop-Vac 5 Gallon 4.5 Peak HP Wet/Dry Vacuum", shopVacBrand),
      true,
    );
  });

  it("uses Workshop as the seventh broad shop-vac leader", () => {
    assert.ok(shopVac.coreLeaders.some((leader) => leader.brand === "workshop"));
    assert.ok(
      shopVac.acceptableAlternates.some((leader) => leader.brand === "milwaukee"),
    );
  });

  it("documents the known undercount: unbranded line-token titles do not cover", () => {
    const ridgid = shopVac.coreLeaders.find((l) => l.brand === "ridgid");

    // Real capture (shop-vac.r4-after-run3): a RIDGID NXT titled without the
    // brand. The contract requires the brand, so this is a recorded
    // undercount, not a hit — the method doc carries this limitation.
    assert.equal(
      coversLeader("14 Gallon 6.0 Peak HP NXT Wet Dry Vac HD1400", ridgid),
      false,
    );
    assert.equal(
      coversLeader("RIDGID 12 Gallon 5.0 Peak HP NXT Wet/Dry Vac", ridgid),
      true,
    );
  });
});

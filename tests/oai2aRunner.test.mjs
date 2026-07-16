import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, it } from "node:test";

const execFileAsync = promisify(execFile);

describe("OAI-2A runner offline boundary", () => {
  it("preflights the isolated final corrected case without an API key or evidence write", async () => {
    const env = { ...process.env };
    delete env.OPENAI_API_KEY;
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ["--no-warnings", "scripts/run-oai-2a.mjs", "--primary-01-v3-smoke", "--preflight-only"],
      { cwd: process.cwd(), env },
    );
    assert.equal(stderr, "");
    const output = JSON.parse(stdout);
    assert.equal(output.status, "preflight_passed");
    assert.equal(output.runMode, "primary-01-v3-smoke");
    assert.deepEqual(output.ceilings, { createCalls: 1, webSearchCalls: 20 });
    assert.deepEqual(output.cases, [{ id: "primary-01", interpreter: false }]);
  });
});

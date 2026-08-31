import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  runStableDevelopmentServer,
  stableDevelopmentEnvironment,
  stableDevelopmentNextArguments,
} from "../scripts/run-stable-development.mjs";

describe("stable local development launcher", () => {
  it("forces every experimental search route off without dropping other environment values", () => {
    const original = {
      OPENAI_API_KEY: "not-printed-or-mutated",
      REVIEW_RADAR_DIRECT_TERRA: "on",
      NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA: "true",
      REVIEW_RADAR_STAGED_TERRA: "on",
      NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA: "true",
    };

    const environment = stableDevelopmentEnvironment(original);

    assert.equal(environment.OPENAI_API_KEY, original.OPENAI_API_KEY);
    assert.equal(environment.REVIEW_RADAR_DIRECT_TERRA, "off");
    assert.equal(environment.NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA, "false");
    assert.equal(environment.REVIEW_RADAR_STAGED_TERRA, "off");
    assert.equal(environment.NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA, "false");
    assert.equal(original.REVIEW_RADAR_DIRECT_TERRA, "on");
    assert.notEqual(environment, original);
  });

  it("preserves supported Next development arguments", () => {
    assert.deepEqual(stableDevelopmentNextArguments([]), ["dev"]);
    assert.deepEqual(stableDevelopmentNextArguments(["--webpack", "-p", "3100"]), [
      "dev",
      "--webpack",
      "-p",
      "3100",
    ]);
  });

  it("passes the stable environment directly to the Next child process", async () => {
    let invocation;
    const exitCode = await runStableDevelopmentServer({
      arguments_: ["-p", "3100"],
      environment: {
        REVIEW_RADAR_DIRECT_TERRA: "on",
        NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA: "true",
      },
      spawnProcess(command, arguments_, options) {
        invocation = { command, arguments_, options };
        const child = new EventEmitter();
        queueMicrotask(() => child.emit("exit", 0, null));
        return child;
      },
    });

    assert.equal(exitCode, 0);
    assert.equal(invocation.command, process.execPath);
    assert.equal(invocation.arguments_[1], "dev");
    assert.deepEqual(invocation.arguments_.slice(-2), ["-p", "3100"]);
    assert.equal(invocation.options.env.REVIEW_RADAR_DIRECT_TERRA, "off");
    assert.equal(
      invocation.options.env.NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA,
      "false",
    );
    assert.equal(invocation.options.stdio, "inherit");
    assert.equal(invocation.options.windowsHide, true);
  });

  it("makes stable mode the normal command and keeps experimentation explicit", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    assert.equal(
      packageJson.scripts.dev,
      "node --no-warnings scripts/run-stable-development.mjs",
    );
    assert.equal(packageJson.scripts["dev:experimental"], "next dev");
  });
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import path from "node:path";
import { describe, it } from "node:test";

import {
  STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_STAGES,
  STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_VERSION,
  StagedTerraReadinessLauncherTerminalError,
  buildStagedTerraReadinessLauncherTerminal,
  launchStagedTerraReadiness,
  serializeStagedTerraReadinessLauncherTerminal,
  writeStagedTerraReadinessLauncherTerminal,
} from "../scripts/launch-staged-terra-readiness.mjs";

const COMMIT = "a".repeat(40);
const TRUST_DIGEST = "b".repeat(64);
const TRUST_SURFACE = Object.freeze({
  ok: true,
  status: "authenticated",
  manifestSha256: TRUST_DIGEST,
  entries: [],
  failures: [],
});

function exitingChild(code = 0, signal = null) {
  const child = new EventEmitter();
  queueMicrotask(() => child.emit("exit", code, signal));
  return child;
}

function baseLaunchOptions(operationOverrides = {}) {
  const repoRoot = path.resolve("fixture-repo");
  const processExecPath = path.resolve("fixture-node", "node.exe");
  return {
    repoRoot,
    runnerArgs: ["--execute", `--approved-commit=${COMMIT}`],
    processExecPath,
    execArgv: ["--no-warnings"],
    hostEnvironment: { PATH: "C:\\trusted" },
    operations: {
      validateProcess: () => true,
      readRepositoryState: async () => ({
        branch: "main",
        commitSha: COMMIT,
        trackedChanges: [],
        trustSurface: TRUST_SURFACE,
      }),
      validateArguments: () => true,
      readCredentials: async () => ({
        openAiApiKey: "credential-canary-openai",
        serperApiKey: "credential-canary-serper-1234567890",
      }),
      reauthenticate: async () => ({
        trackedChanges: [],
        trustSurface: TRUST_SURFACE,
      }),
      buildInvocation: () => ({
        command: processExecPath,
        args: ["--no-warnings", path.join(repoRoot, "runner.mjs")],
        options: {
          cwd: repoRoot,
          env: {},
          shell: false,
          stdio: "inherit",
          windowsHide: true,
        },
      }),
      spawn: () => exitingChild(0),
      ...operationOverrides,
    },
  };
}

async function expectClosedStage(operationOverrides, expectedStage) {
  let captured;
  await assert.rejects(
    launchStagedTerraReadiness(baseLaunchOptions(operationOverrides)),
    (error) => {
      captured = error;
      return (
        error instanceof StagedTerraReadinessLauncherTerminalError &&
        error.stage === expectedStage
      );
    },
  );
  const serialized = serializeStagedTerraReadinessLauncherTerminal(captured);
  assert.equal(serialized.endsWith("\n"), true);
  assert.equal(serialized.includes("credential-canary"), false);
  assert.equal(serialized.includes("raw-error-canary"), false);
  assert.deepEqual(JSON.parse(serialized), {
    schemaVersion: STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_VERSION,
    status: "launcher_stopped",
    stage: expectedStage,
    retryAuthorized: false,
    replacementAuthorized: false,
    nextAttemptAuthorized: false,
  });
}

describe("PR-021 typed nonsecret readiness-launcher terminal", () => {
  it("freezes an exact version, stage registry, key set, and authority-negative result", () => {
    assert.equal(
      STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_VERSION,
      "staged-terra-readiness-launcher-terminal-v1",
    );
    assert.deepEqual(STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_STAGES, [
      "process_gate_rejected",
      "repository_or_trust_rejected",
      "approval_rejected",
      "credential_gate_rejected",
      "post_credential_reauthentication_rejected",
      "child_invocation_rejected",
      "child_spawn_failed",
      "child_signaled",
      "launcher_internal_failure",
    ]);
    const terminal = buildStagedTerraReadinessLauncherTerminal(
      new StagedTerraReadinessLauncherTerminalError("approval_rejected"),
    );
    assert.deepEqual(Object.keys(terminal), [
      "schemaVersion",
      "status",
      "stage",
      "retryAuthorized",
      "replacementAuthorized",
      "nextAttemptAuthorized",
    ]);
    assert.deepEqual(terminal, {
      schemaVersion: "staged-terra-readiness-launcher-terminal-v1",
      status: "launcher_stopped",
      stage: "approval_rejected",
      retryAuthorized: false,
      replacementAuthorized: false,
      nextAttemptAuthorized: false,
    });
    assert.deepEqual(buildStagedTerraReadinessLauncherTerminal(new Error("raw-error-canary")), {
      schemaVersion: "staged-terra-readiness-launcher-terminal-v1",
      status: "launcher_stopped",
      stage: "launcher_internal_failure",
      retryAuthorized: false,
      replacementAuthorized: false,
      nextAttemptAuthorized: false,
    });
  });

  it("rejects genuine-instance mutation and prototype spoofing without serializing canaries", () => {
    const genuine = new StagedTerraReadinessLauncherTerminalError(
      "approval_rejected",
    );
    assert.throws(
      () => {
        genuine.stage = "credential-canary-assignment";
      },
      TypeError,
    );
    assert.throws(
      () =>
        Object.defineProperty(genuine, "stage", {
          value: "credential-canary-define-property",
        }),
      TypeError,
    );
    assert.equal(genuine.stage, "approval_rejected");
    assert.equal(
      serializeStagedTerraReadinessLauncherTerminal(genuine).includes(
        "credential-canary",
      ),
      false,
    );

    const spoof = {
      stage: "credential-canary-prototype-spoof",
      rawError: "raw-error-canary-prototype-spoof",
    };
    Object.setPrototypeOf(
      spoof,
      StagedTerraReadinessLauncherTerminalError.prototype,
    );
    const spoofedTerminal = serializeStagedTerraReadinessLauncherTerminal(spoof);
    assert.equal(spoofedTerminal.includes("credential-canary"), false);
    assert.equal(spoofedTerminal.includes("raw-error-canary"), false);
    assert.equal(JSON.parse(spoofedTerminal).stage, "launcher_internal_failure");
  });

  it("maps every synchronous and asynchronous launcher boundary to one fixed stage", async () => {
    await expectClosedStage(
      { validateProcess: () => { throw new Error("raw-error-canary-process"); } },
      "process_gate_rejected",
    );
    await expectClosedStage(
      { readRepositoryState: async () => { throw new Error("raw-error-canary-repo"); } },
      "repository_or_trust_rejected",
    );
    await expectClosedStage(
      { validateArguments: () => { throw new Error("raw-error-canary-approval"); } },
      "approval_rejected",
    );
    await expectClosedStage(
      { readCredentials: async () => { throw new Error("credential-canary-raw-error-canary"); } },
      "credential_gate_rejected",
    );
    await expectClosedStage(
      { reauthenticate: async () => { throw new Error("raw-error-canary-reauth"); } },
      "post_credential_reauthentication_rejected",
    );
    let processChecks = 0;
    await expectClosedStage(
      {
        validateProcess: () => {
          processChecks += 1;
          if (processChecks === 2) throw new Error("raw-error-canary-second-process");
        },
      },
      "post_credential_reauthentication_rejected",
    );
    await expectClosedStage(
      { buildInvocation: () => { throw new Error("credential-canary-raw-error-canary-invocation"); } },
      "child_invocation_rejected",
    );
    await expectClosedStage(
      { spawn: () => { throw new Error("credential-canary-raw-error-canary-spawn"); } },
      "child_spawn_failed",
    );
    await expectClosedStage(
      {
        spawn: () => {
          const child = new EventEmitter();
          queueMicrotask(() => child.emit("error", new Error("raw-error-canary-event")));
          return child;
        },
      },
      "child_spawn_failed",
    );
    await expectClosedStage(
      { spawn: () => exitingChild(null, "SIGTERM") },
      "child_signaled",
    );
    await expectClosedStage(
      { spawn: () => exitingChild(null, null) },
      "child_signaled",
    );
  });

  it("does not let malformed successful-looking operation results escape their stage", async () => {
    await expectClosedStage(
      { readRepositoryState: async () => ({ branch: "main" }) },
      "repository_or_trust_rejected",
    );
    await expectClosedStage(
      { reauthenticate: async () => ({ trackedChanges: [], trustSurface: null }) },
      "post_credential_reauthentication_rejected",
    );
    await expectClosedStage(
      { buildInvocation: () => null },
      "child_invocation_rejected",
    );
  });

  it("preserves an integer child exit without inventing a launcher terminal", async () => {
    assert.equal(
      await launchStagedTerraReadiness(
        baseLaunchOptions({ spawn: () => exitingChild(7) }),
      ),
      7,
    );
  });

  it("writes exactly one canonical line and never serializes an error or credential canary", () => {
    const writes = [];
    const terminal = writeStagedTerraReadinessLauncherTerminal(
      Object.assign(new Error("raw-error-canary credential-canary"), {
        cause: new Error("nested-raw-error-canary"),
        credential: "credential-canary-secret",
      }),
      { write: (value) => writes.push(value) },
    );
    assert.equal(writes.length, 1);
    assert.equal(writes[0].includes("raw-error-canary"), false);
    assert.equal(writes[0].includes("credential-canary"), false);
    assert.deepEqual(JSON.parse(writes[0]), terminal);
    assert.equal(terminal.stage, "launcher_internal_failure");
  });

  it("emits exactly one typed CLI terminal before repository or credential access", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--no-warnings",
        "--trace-warnings",
        "scripts/launch-staged-terra-readiness.mjs",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { PATH: process.env.PATH },
        windowsHide: true,
      },
    );
    assert.equal(result.status, 1);
    assert.equal(result.signal, null);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr.trim().split(/\r?\n/).length, 1);
    assert.deepEqual(JSON.parse(result.stderr), {
      schemaVersion: "staged-terra-readiness-launcher-terminal-v1",
      status: "launcher_stopped",
      stage: "process_gate_rejected",
      retryAuthorized: false,
      replacementAuthorized: false,
      nextAttemptAuthorized: false,
    });
  });
});

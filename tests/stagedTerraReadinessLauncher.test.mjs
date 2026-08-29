import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  STAGED_TERRA_READINESS_OFFICIAL_OPENAI_BASE_URL,
  STAGED_TERRA_READINESS_APPROVAL_FIELDS,
  buildStagedTerraReadinessChildEnvironment,
  buildStagedTerraReadinessChildInvocation,
  readStagedTerraReadinessCredentials,
  validateStagedTerraReadinessLauncherArguments,
  validateStagedTerraReadinessLauncherProcess,
} from "../scripts/launch-staged-terra-readiness.mjs";

const COMMIT = "d".repeat(40);
const TRUST = "e".repeat(64);

function approvedArguments() {
  return [
    "--execute",
    ...STAGED_TERRA_READINESS_APPROVAL_FIELDS.map((field) => {
      if (field === "approved-commit") return `--${field}=${COMMIT}`;
      if (field === "approved-trust-surface-sha256") {
        return `--${field}=${TRUST}`;
      }
      return `--${field}=value`;
    }),
  ];
}

describe("PR-4B sanitized credential launcher", () => {
  it("passes only fixed host essentials, two credentials, and the official endpoint", () => {
    const childEnvironment = buildStagedTerraReadinessChildEnvironment({
      hostEnvironment: {
        PATH: "C:\\Program Files\\Git\\cmd",
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
        SystemRoot: "C:\\Windows",
        WINDIR: "C:\\Windows",
        COMSPEC: "C:\\Windows\\System32\\cmd.exe",
        OPENAI_API_KEY: "inherited-openai-must-not-pass",
        SERPER_API_KEY: "inherited-serper-must-not-pass",
        OPENAI_BASE_URL: "https://example.invalid/v1",
        NODE_OPTIONS: "--require=malicious.cjs",
        NODE_EXTRA_CA_CERTS: "malicious.pem",
        HTTPS_PROXY: "http://example.invalid:8080",
        RANDOM_SECRET: "must-not-pass",
      },
      credentials: {
        openAiApiKey: "file-openai-key",
        serperApiKey: "file-serper-key-1234567890",
      },
      platform: "win32",
    });

    assert.deepEqual(childEnvironment, {
      COMSPEC: "C:\\Windows\\System32\\cmd.exe",
      LANG: "C",
      LC_ALL: "C",
      OPENAI_API_KEY: "file-openai-key",
      OPENAI_BASE_URL: STAGED_TERRA_READINESS_OFFICIAL_OPENAI_BASE_URL,
      PATH: "C:\\Program Files\\Git\\cmd",
      PATHEXT: ".COM;.EXE;.BAT;.CMD",
      SERPER_API_KEY: "file-serper-key-1234567890",
      SystemRoot: "C:\\Windows",
      TZ: "UTC",
      WINDIR: "C:\\Windows",
    });
    assert.equal("NODE_OPTIONS" in childEnvironment, false);
    assert.equal("HTTPS_PROXY" in childEnvironment, false);
    assert.equal("RANDOM_SECRET" in childEnvironment, false);
  });

  it("rejects inherited Node loader/runtime controls before reading credentials", () => {
    assert.doesNotThrow(() =>
      validateStagedTerraReadinessLauncherProcess({
        execArgv: ["--no-warnings"],
        hostEnvironment: {},
      }),
    );

    for (const [key, value] of [
      ["NODE_DEBUG", "child_process"],
      ["node_debug_native", "http2"],
      ["NODE_OPTIONS", "--trace-warnings"],
      ["node_path", "C:\\untrusted"],
      ["NODE_EXTRA_CA_CERTS", "untrusted.pem"],
      ["OPENSSL_CONF", "untrusted.cnf"],
      ["NODE_TLS_REJECT_UNAUTHORIZED", "0"],
      ["NODE_USE_ENV_PROXY", "1"],
    ]) {
      assert.throws(
        () =>
          validateStagedTerraReadinessLauncherProcess({
            execArgv: ["--no-warnings"],
            hostEnvironment: { [key]: value },
          }),
        /launcher process is not closed/i,
      );
    }

    assert.throws(
      () =>
        validateStagedTerraReadinessLauncherProcess({
          execArgv: ["--no-warnings", "--env-file=.env.local"],
          hostEnvironment: {},
        }),
      /launcher process is not closed/i,
    );
  });

  it("reads a direct bounded env file but returns only the two credential values", async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "rr-pr4b-launcher-"));
    try {
      await writeFile(
        path.join(temporaryRoot, ".env.local"),
        [
          "OPENAI_API_KEY=file-openai-key",
          "SERPER_API_KEY=file-serper-key-1234567890",
          "OPENAI_BASE_URL=https://example.invalid/v1",
          "NODE_OPTIONS=--require=malicious.cjs",
          "HTTPS_PROXY=http://example.invalid:8080",
          "RANDOM_SECRET=must-not-pass",
          "",
        ].join("\n"),
        { encoding: "utf8", mode: 0o600 },
      );

      assert.deepEqual(
        await readStagedTerraReadinessCredentials({ repoRoot: temporaryRoot }),
        {
          openAiApiKey: "file-openai-key",
          serperApiKey: "file-serper-key-1234567890",
        },
      );
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("rejects a credential path swap before reading through the authenticated handle", async () => {
    const credentialPath = path.resolve("fixture-race", ".env.local");
    const stableMetadata = {
      ctimeNs: 4n,
      dev: 1n,
      ino: 2n,
      mtimeNs: 3n,
      size: 64n,
      isFile: () => true,
      isSymbolicLink: () => false,
    };
    const replacementMetadata = {
      ...stableMetadata,
      ino: 99n,
    };
    let pathChecks = 0;
    let readCalled = false;
    let closeCalled = false;
    const fileSystem = {
      lstat: async () => {
        pathChecks += 1;
        return pathChecks === 1 ? stableMetadata : replacementMetadata;
      },
      realpath: async () => credentialPath,
      open: async () => ({
        close: async () => {
          closeCalled = true;
        },
        readFile: async () => {
          readCalled = true;
          return "OPENAI_API_KEY=must-not-read";
        },
        stat: async () => replacementMetadata,
      }),
      readFile: async () => {
        throw new Error("path-based read must not be used");
      },
    };

    await assert.rejects(
      readStagedTerraReadinessCredentials({
        repoRoot: path.dirname(credentialPath),
        fileSystem,
      }),
      /credential file is unsafe/i,
    );
    assert.equal(readCalled, false);
    assert.equal(closeCalled, true);
  });

  it("binds the sanitized child to the exact Node binary, runner, and 27 arguments", () => {
    const runnerArgs = approvedArguments();
    assert.equal(runnerArgs.length, 27);
    assert.deepEqual(
      validateStagedTerraReadinessLauncherArguments({
        runnerArgs,
        commitSha: COMMIT,
        trustSurfaceSha256: TRUST,
      }),
      runnerArgs,
    );

    const fixtureRepoRoot = path.resolve("fixture-repo");
    const fixtureNode = path.resolve("fixture-node", "node.exe");
    const invocation = buildStagedTerraReadinessChildInvocation({
      repoRoot: fixtureRepoRoot,
      processExecPath: fixtureNode,
      runnerArgs,
      hostEnvironment: { PATH: "C:\\git\\cmd" },
      credentials: {
        openAiApiKey: "file-openai-key",
        serperApiKey: "file-serper-key-1234567890",
      },
      platform: "win32",
    });
    assert.equal(invocation.command, fixtureNode);
    assert.deepEqual(invocation.args, [
      "--no-warnings",
      path.join(fixtureRepoRoot, "scripts", "run-staged-terra-readiness.mjs"),
      ...runnerArgs,
    ]);
    assert.equal(invocation.options.cwd, fixtureRepoRoot);
    assert.equal(invocation.options.shell, false);
    assert.equal(invocation.options.stdio, "inherit");
    assert.equal(invocation.options.env.OPENAI_BASE_URL, "https://api.openai.com/v1");

    for (const mutation of [
      runnerArgs.slice(1),
      [...runnerArgs, "--extra=true"],
      runnerArgs.map((value) =>
        value.startsWith("--approved-commit=")
          ? `--approved-commit=${"f".repeat(40)}`
          : value,
      ),
      runnerArgs.map((value) =>
        value.startsWith("--approved-trust-surface-sha256=")
          ? `--approved-trust-surface-sha256=${"f".repeat(64)}`
          : value,
      ),
    ]) {
      assert.throws(
        () =>
          validateStagedTerraReadinessLauncherArguments({
            runnerArgs: mutation,
            commitSha: COMMIT,
            trustSurfaceSha256: TRUST,
          }),
        /launcher arguments are not closed/i,
      );
    }
  });
});

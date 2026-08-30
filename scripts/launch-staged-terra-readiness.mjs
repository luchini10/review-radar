// Credential-minimizing launcher for one independently approved readiness run.

import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

import { directTerraSerperApiKeyIsValid } from "../lib/directTerraSerperTransport.ts";
import {
  authenticateStagedTerraReadinessTrustSurface,
} from "./staged-terra-readiness-io.mjs";
import {
  STAGED_TERRA_READINESS_APPROVAL_FIELDS,
  STAGED_TERRA_READINESS_OFFICIAL_OPENAI_BASE_URL,
} from "./staged-terra-readiness-runner.mjs";

export {
  STAGED_TERRA_READINESS_APPROVAL_FIELDS,
  STAGED_TERRA_READINESS_OFFICIAL_OPENAI_BASE_URL,
};

export const STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_VERSION =
  "staged-terra-readiness-launcher-terminal-v1";
export const STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_STAGES = Object.freeze([
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
const STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_STAGE_SET = new Set(
  STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_STAGES,
);
const STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_STAGE_BY_ERROR = new WeakMap();

export class StagedTerraReadinessLauncherTerminalError extends Error {
  constructor(stage) {
    if (!STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_STAGE_SET.has(stage)) {
      throw new Error("The readiness launcher terminal stage is invalid.");
    }
    super("The readiness launcher stopped.");
    this.name = "StagedTerraReadinessLauncherTerminalError";
    STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_STAGE_BY_ERROR.set(this, stage);
    Object.defineProperty(this, "stage", {
      configurable: false,
      enumerable: true,
      value: stage,
      writable: false,
    });
  }
}

export function buildStagedTerraReadinessLauncherTerminal(error) {
  const candidate =
    error !== null && typeof error === "object"
      ? STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_STAGE_BY_ERROR.get(error)
      : undefined;
  const stage = STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_STAGE_SET.has(candidate)
    ? candidate
    : "launcher_internal_failure";
  return Object.freeze({
    schemaVersion: STAGED_TERRA_READINESS_LAUNCHER_TERMINAL_VERSION,
    status: "launcher_stopped",
    stage,
    retryAuthorized: false,
    replacementAuthorized: false,
    nextAttemptAuthorized: false,
  });
}

export function serializeStagedTerraReadinessLauncherTerminal(error) {
  return `${JSON.stringify(buildStagedTerraReadinessLauncherTerminal(error))}\n`;
}

export function writeStagedTerraReadinessLauncherTerminal(
  error,
  writable = process.stderr,
) {
  const terminal = buildStagedTerraReadinessLauncherTerminal(error);
  writable.write(`${JSON.stringify(terminal)}\n`);
  return terminal;
}

const CREDENTIAL_FILE_NAME = ".env.local";
const CREDENTIAL_FILE_BYTE_CEILING = 65_536;
const FORBIDDEN_LAUNCH_ENVIRONMENT_KEYS = Object.freeze([
  "NODE_DEBUG",
  "NODE_DEBUG_NATIVE",
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_EXTRA_CA_CERTS",
  "OPENSSL_CONF",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "NODE_USE_ENV_PROXY",
]);
const WINDOWS_HOST_ENVIRONMENT_KEYS = Object.freeze([
  "PATH",
  "PATHEXT",
  "SystemRoot",
  "WINDIR",
  "COMSPEC",
]);
const POSIX_HOST_ENVIRONMENT_KEYS = Object.freeze(["PATH"]);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizedPath(value) {
  const resolved = path.normalize(path.resolve(value));
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function samePath(left, right) {
  return normalizedPath(left) === normalizedPath(right);
}

function stableFileIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function directBoundedCredentialFile(metadata, realPath, credentialPath) {
  return (
    metadata.isFile() &&
    !metadata.isSymbolicLink() &&
    metadata.size > 0n &&
    metadata.size <= BigInt(CREDENTIAL_FILE_BYTE_CEILING) &&
    samePath(realPath, credentialPath)
  );
}

function environmentMatches(environment, expectedName) {
  return Object.keys(environment).filter(
    (name) => name.toUpperCase() === expectedName.toUpperCase(),
  );
}

function inheritedEnvironmentValue(environment, expectedName) {
  const matches = environmentMatches(environment, expectedName);
  requireCondition(
    matches.length <= 1,
    "The readiness launcher host environment is ambiguous.",
  );
  if (matches.length === 0) return null;
  const value = environment[matches[0]];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function gitOutput(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

function trackedChanges(repoRoot) {
  const output = gitOutput(repoRoot, [
    "status",
    "--porcelain",
    "--untracked-files=no",
  ]);
  return output ? output.split(/\r?\n/) : [];
}

export function validateStagedTerraReadinessLauncherProcess({
  execArgv,
  hostEnvironment,
}) {
  requireCondition(
    Array.isArray(execArgv) &&
      execArgv.length === 1 &&
      execArgv[0] === "--no-warnings",
    "The readiness launcher process is not closed.",
  );
  requireCondition(
    hostEnvironment !== null &&
      typeof hostEnvironment === "object" &&
      !Array.isArray(hostEnvironment),
    "The readiness launcher process is not closed.",
  );
  for (const key of FORBIDDEN_LAUNCH_ENVIRONMENT_KEYS) {
    requireCondition(
      environmentMatches(hostEnvironment, key).length === 0,
      "The readiness launcher process is not closed.",
    );
  }
  return true;
}

export function validateStagedTerraReadinessLauncherArguments({
  runnerArgs,
  commitSha,
  trustSurfaceSha256,
}) {
  const allowed = new Set([
    "execute",
    ...STAGED_TERRA_READINESS_APPROVAL_FIELDS,
  ]);
  requireCondition(
    Array.isArray(runnerArgs) && runnerArgs.length === allowed.size,
    "The readiness launcher arguments are not closed.",
  );
  const values = new Map();
  for (const argument of runnerArgs) {
    requireCondition(
      typeof argument === "string" && argument.startsWith("--"),
      "The readiness launcher arguments are not closed.",
    );
    const body = argument.slice(2);
    const separator = body.indexOf("=");
    const name = separator === -1 ? body : body.slice(0, separator);
    const value = separator === -1 ? null : body.slice(separator + 1);
    requireCondition(
      allowed.has(name) && !values.has(name),
      "The readiness launcher arguments are not closed.",
    );
    if (name === "execute") {
      requireCondition(
        value === null,
        "The readiness launcher arguments are not closed.",
      );
      values.set(name, "true");
    } else {
      requireCondition(
        value !== null && value.length > 0,
        "The readiness launcher arguments are not closed.",
      );
      values.set(name, value);
    }
  }
  requireCondition(
    values.size === allowed.size &&
      values.get("execute") === "true" &&
      values.get("approved-commit") === commitSha &&
      values.get("approved-trust-surface-sha256") === trustSurfaceSha256,
    "The readiness launcher arguments are not closed.",
  );
  return runnerArgs;
}

export async function readStagedTerraReadinessCredentials({
  repoRoot,
  fileSystem = fs,
  parse = parseEnv,
}) {
  const credentialPath = path.join(repoRoot, CREDENTIAL_FILE_NAME);
  let handle;
  let contents;
  try {
    const pathBefore = await fileSystem.lstat(credentialPath, { bigint: true });
    const realPathBefore = await fileSystem.realpath(credentialPath);
    requireCondition(
      directBoundedCredentialFile(
        pathBefore,
        realPathBefore,
        credentialPath,
      ),
      "The readiness credential file is unsafe.",
    );
    handle = await fileSystem.open(credentialPath, "r");
    const handleBefore = await handle.stat({ bigint: true });
    const pathAfterOpen = await fileSystem.lstat(credentialPath, {
      bigint: true,
    });
    const realPathAfterOpen = await fileSystem.realpath(credentialPath);
    requireCondition(
      directBoundedCredentialFile(
        pathAfterOpen,
        realPathAfterOpen,
        credentialPath,
      ) &&
        stableFileIdentity(pathBefore, handleBefore) &&
        stableFileIdentity(handleBefore, pathAfterOpen),
      "The readiness credential file is unsafe.",
    );
    contents = await handle.readFile({ encoding: "utf8" });
    const handleAfterRead = await handle.stat({ bigint: true });
    const pathAfterRead = await fileSystem.lstat(credentialPath, {
      bigint: true,
    });
    const realPathAfterRead = await fileSystem.realpath(credentialPath);
    requireCondition(
      directBoundedCredentialFile(
        pathAfterRead,
        realPathAfterRead,
        credentialPath,
      ) &&
        stableFileIdentity(handleBefore, handleAfterRead) &&
        stableFileIdentity(handleAfterRead, pathAfterRead) &&
        BigInt(Buffer.byteLength(contents, "utf8")) === handleAfterRead.size,
      "The readiness credential file is unsafe.",
    );
  } catch {
    throw new Error("The readiness credential file is unsafe.");
  } finally {
    if (handle) await handle.close().catch(() => {});
  }

  let parsed;
  try {
    parsed = parse(contents);
  } catch {
    throw new Error("The readiness credential file is unsafe.");
  }
  const openAiApiKey = parsed.OPENAI_API_KEY?.trim() ?? "";
  const serperApiKey = parsed.SERPER_API_KEY?.trim() ?? "";
  requireCondition(
    openAiApiKey.length > 0 && directTerraSerperApiKeyIsValid(serperApiKey),
    "The readiness credential file is not configured safely.",
  );
  return { openAiApiKey, serperApiKey };
}

export function buildStagedTerraReadinessChildEnvironment({
  hostEnvironment,
  credentials,
  platform = process.platform,
}) {
  requireCondition(
    credentials !== null &&
      typeof credentials === "object" &&
      typeof credentials.openAiApiKey === "string" &&
      credentials.openAiApiKey.length > 0 &&
      directTerraSerperApiKeyIsValid(credentials.serperApiKey),
    "The readiness child credentials are unsafe.",
  );
  const childEnvironment = {};
  const inheritedKeys =
    platform === "win32"
      ? WINDOWS_HOST_ENVIRONMENT_KEYS
      : POSIX_HOST_ENVIRONMENT_KEYS;
  for (const key of inheritedKeys) {
    const value = inheritedEnvironmentValue(hostEnvironment, key);
    if (value !== null) childEnvironment[key] = value;
  }
  requireCondition(
    typeof childEnvironment.PATH === "string" &&
      childEnvironment.PATH.length > 0,
    "The readiness child environment is missing PATH.",
  );
  Object.assign(childEnvironment, {
    LANG: "C",
    LC_ALL: "C",
    OPENAI_API_KEY: credentials.openAiApiKey,
    OPENAI_BASE_URL: STAGED_TERRA_READINESS_OFFICIAL_OPENAI_BASE_URL,
    SERPER_API_KEY: credentials.serperApiKey,
    TZ: "UTC",
  });
  return childEnvironment;
}

export function buildStagedTerraReadinessChildInvocation({
  repoRoot,
  processExecPath,
  runnerArgs,
  hostEnvironment,
  credentials,
  platform = process.platform,
}) {
  requireCondition(
    path.isAbsolute(repoRoot) && path.isAbsolute(processExecPath),
    "The readiness child invocation is unsafe.",
  );
  return {
    command: processExecPath,
    args: [
      "--no-warnings",
      path.join(repoRoot, "scripts", "run-staged-terra-readiness.mjs"),
      ...runnerArgs,
    ],
    options: {
      cwd: repoRoot,
      env: buildStagedTerraReadinessChildEnvironment({
        hostEnvironment,
        credentials,
        platform,
      }),
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    },
  };
}

async function readStagedTerraReadinessRepositoryState({ repoRoot }) {
  const commitSha = gitOutput(repoRoot, ["rev-parse", "HEAD"]);
  const branch = gitOutput(repoRoot, ["branch", "--show-current"]);
  const currentTrackedChanges = trackedChanges(repoRoot);
  const trustSurface = await authenticateStagedTerraReadinessTrustSurface({
    repoRoot,
    commitSha,
  });
  return {
    branch,
    commitSha,
    trackedChanges: currentTrackedChanges,
    trustSurface,
  };
}

async function reauthenticateStagedTerraReadinessRepository({
  repoRoot,
  commitSha,
}) {
  const trustSurface = await authenticateStagedTerraReadinessTrustSurface({
    repoRoot,
    commitSha,
  });
  return {
    trackedChanges: trackedChanges(repoRoot),
    trustSurface,
  };
}

const DEFAULT_LAUNCHER_OPERATIONS = Object.freeze({
  validateProcess: validateStagedTerraReadinessLauncherProcess,
  readRepositoryState: readStagedTerraReadinessRepositoryState,
  validateArguments: validateStagedTerraReadinessLauncherArguments,
  readCredentials: readStagedTerraReadinessCredentials,
  reauthenticate: reauthenticateStagedTerraReadinessRepository,
  buildInvocation: buildStagedTerraReadinessChildInvocation,
  spawn,
});
const LAUNCHER_OPERATION_KEYS = Object.freeze(
  Object.keys(DEFAULT_LAUNCHER_OPERATIONS),
);

function resolveLauncherOperations(overrides) {
  requireCondition(
    overrides !== null &&
      typeof overrides === "object" &&
      !Array.isArray(overrides) &&
      Object.keys(overrides).every((key) =>
        LAUNCHER_OPERATION_KEYS.includes(key),
      ),
    "The readiness launcher operations are invalid.",
  );
  const resolved = { ...DEFAULT_LAUNCHER_OPERATIONS, ...overrides };
  requireCondition(
    LAUNCHER_OPERATION_KEYS.every(
      (key) => typeof resolved[key] === "function",
    ),
    "The readiness launcher operations are invalid.",
  );
  return Object.freeze(resolved);
}

function launcherTerminalError(stage) {
  return new StagedTerraReadinessLauncherTerminalError(stage);
}

function spawnAndWait(spawnImplementation, invocation) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnImplementation(
        invocation.command,
        invocation.args,
        invocation.options,
      );
      requireCondition(
        child !== null &&
          typeof child === "object" &&
          typeof child.once === "function",
        "The readiness child process is invalid.",
      );
      child.once("error", () => {
        reject(launcherTerminalError("child_spawn_failed"));
      });
      child.once("exit", (code, signal) => {
        if (signal !== null || !Number.isInteger(code)) {
          reject(launcherTerminalError("child_signaled"));
          return;
        }
        resolve(code);
      });
    } catch {
      reject(launcherTerminalError("child_spawn_failed"));
    }
  });
}

export async function launchStagedTerraReadiness({
  repoRoot,
  runnerArgs,
  processExecPath = process.execPath,
  execArgv = process.execArgv,
  hostEnvironment = process.env,
  operations = {},
}) {
  let runtime;
  try {
    runtime = resolveLauncherOperations(operations);
  } catch {
    throw launcherTerminalError("launcher_internal_failure");
  }

  try {
    runtime.validateProcess({ execArgv, hostEnvironment });
  } catch {
    throw launcherTerminalError("process_gate_rejected");
  }

  let repositoryState;
  try {
    repositoryState = await runtime.readRepositoryState({ repoRoot });
    requireCondition(
      repositoryState !== null &&
        typeof repositoryState === "object" &&
        repositoryState.branch === "main" &&
        typeof repositoryState.commitSha === "string" &&
        Array.isArray(repositoryState.trackedChanges) &&
        repositoryState.trackedChanges.length === 0 &&
        repositoryState.trustSurface?.ok === true &&
        repositoryState.trustSurface.status === "authenticated" &&
        typeof repositoryState.trustSurface.manifestSha256 === "string" &&
        Array.isArray(repositoryState.trustSurface.failures) &&
        repositoryState.trustSurface.failures.length === 0,
      "The readiness launcher repository state is unsafe.",
    );
  } catch {
    throw launcherTerminalError("repository_or_trust_rejected");
  }

  try {
    runtime.validateArguments({
      runnerArgs,
      commitSha: repositoryState.commitSha,
      trustSurfaceSha256: repositoryState.trustSurface.manifestSha256,
    });
  } catch {
    throw launcherTerminalError("approval_rejected");
  }

  let credentials;
  try {
    credentials = await runtime.readCredentials({ repoRoot });
    requireCondition(
      credentials !== null &&
        typeof credentials === "object" &&
        typeof credentials.openAiApiKey === "string" &&
        credentials.openAiApiKey.length > 0 &&
        directTerraSerperApiKeyIsValid(credentials.serperApiKey),
      "The readiness launcher credentials are unsafe.",
    );
  } catch {
    throw launcherTerminalError("credential_gate_rejected");
  }

  let finalState;
  try {
    finalState = await runtime.reauthenticate({
      repoRoot,
      commitSha: repositoryState.commitSha,
    });
    requireCondition(
      finalState !== null &&
        typeof finalState === "object" &&
        finalState.trustSurface?.ok === true &&
        finalState.trustSurface.status === "authenticated" &&
        finalState.trustSurface.manifestSha256 ===
          repositoryState.trustSurface.manifestSha256 &&
        Array.isArray(finalState.trustSurface.failures) &&
        finalState.trustSurface.failures.length === 0 &&
        Array.isArray(finalState.trackedChanges) &&
        finalState.trackedChanges.length === 0,
      "The readiness launcher trust surface changed before execution.",
    );
    runtime.validateProcess({ execArgv, hostEnvironment });
  } catch {
    throw launcherTerminalError(
      "post_credential_reauthentication_rejected",
    );
  }

  let invocation;
  try {
    invocation = runtime.buildInvocation({
      repoRoot,
      processExecPath,
      runnerArgs,
      hostEnvironment,
      credentials,
    });
    requireCondition(
      invocation !== null &&
        typeof invocation === "object" &&
        typeof invocation.command === "string" &&
        path.isAbsolute(invocation.command) &&
        Array.isArray(invocation.args) &&
        invocation.options !== null &&
        typeof invocation.options === "object" &&
        invocation.options.shell === false,
      "The readiness child invocation is unsafe.",
    );
  } catch {
    throw launcherTerminalError("child_invocation_rejected");
  }

  // No await may appear between the final process gate above and this exact
  // child construction/spawn path.
  return spawnAndWait(runtime.spawn, invocation);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && samePath(process.argv[1], currentFile)) {
  const repoRoot = path.resolve(path.dirname(currentFile), "..");
  try {
    process.exitCode = await launchStagedTerraReadiness({
      repoRoot,
      runnerArgs: process.argv.slice(2),
    });
  } catch (error) {
    try {
      writeStagedTerraReadinessLauncherTerminal(error);
    } catch {
      // Never fall back to a raw error, stack, path, or credential-bearing value.
    }
    process.exitCode = 1;
  }
}

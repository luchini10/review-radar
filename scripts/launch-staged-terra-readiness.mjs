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

function spawnAndWait(spawnImplementation, invocation) {
  return new Promise((resolve, reject) => {
    const child = spawnImplementation(
      invocation.command,
      invocation.args,
      invocation.options,
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal !== null || !Number.isInteger(code)) {
        reject(new Error("The readiness child did not return an exit code."));
        return;
      }
      resolve(code);
    });
  });
}

export async function launchStagedTerraReadiness({
  repoRoot,
  runnerArgs,
  processExecPath = process.execPath,
  execArgv = process.execArgv,
  hostEnvironment = process.env,
  spawnImplementation = spawn,
}) {
  validateStagedTerraReadinessLauncherProcess({
    execArgv,
    hostEnvironment,
  });
  const commitSha = gitOutput(repoRoot, ["rev-parse", "HEAD"]);
  requireCondition(
    gitOutput(repoRoot, ["branch", "--show-current"]) === "main" &&
      trackedChanges(repoRoot).length === 0,
    "The readiness launcher repository state is unsafe.",
  );
  const trustSurface =
    await authenticateStagedTerraReadinessTrustSurface({
      repoRoot,
      commitSha,
    });
  requireCondition(
    trustSurface.ok === true &&
      trustSurface.status === "authenticated" &&
      trustSurface.failures.length === 0,
    "The readiness launcher trust surface is unauthenticated.",
  );
  validateStagedTerraReadinessLauncherArguments({
    runnerArgs,
    commitSha,
    trustSurfaceSha256: trustSurface.manifestSha256,
  });

  const credentials = await readStagedTerraReadinessCredentials({ repoRoot });
  const finalTrustSurface =
    await authenticateStagedTerraReadinessTrustSurface({
      repoRoot,
      commitSha,
    });
  requireCondition(
    finalTrustSurface.ok === true &&
      finalTrustSurface.manifestSha256 === trustSurface.manifestSha256 &&
      finalTrustSurface.failures.length === 0 &&
      trackedChanges(repoRoot).length === 0,
    "The readiness launcher trust surface changed before execution.",
  );
  validateStagedTerraReadinessLauncherProcess({
    execArgv,
    hostEnvironment,
  });
  const invocation = buildStagedTerraReadinessChildInvocation({
    repoRoot,
    processExecPath,
    runnerArgs,
    hostEnvironment,
    credentials,
  });
  return spawnAndWait(spawnImplementation, invocation);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && samePath(process.argv[1], currentFile)) {
  const repoRoot = path.resolve(path.dirname(currentFile), "..");
  await launchStagedTerraReadiness({
    repoRoot,
    runnerArgs: process.argv.slice(2),
  })
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      process.stderr.write(
        "Readiness launcher stopped before invoking the trusted runner.\n",
      );
      process.exitCode = 1;
    });
}

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const STABLE_SEARCH_MODE = Object.freeze({
  REVIEW_RADAR_DIRECT_TERRA: "off",
  NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA: "false",
  REVIEW_RADAR_STAGED_TERRA: "off",
  NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA: "false",
});

export function stableDevelopmentEnvironment(environment = process.env) {
  return {
    ...environment,
    ...STABLE_SEARCH_MODE,
  };
}

export function stableDevelopmentNextArguments(arguments_ = []) {
  return ["dev", ...arguments_];
}

export async function runStableDevelopmentServer({
  arguments_ = process.argv.slice(2),
  environment = process.env,
  spawnProcess = spawn,
} = {}) {
  const nextCli = require.resolve("next/dist/bin/next");
  const child = spawnProcess(
    process.execPath,
    [nextCli, ...stableDevelopmentNextArguments(arguments_)],
    {
      env: stableDevelopmentEnvironment(environment),
      stdio: "inherit",
      windowsHide: true,
    },
  );

  return await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(Number.isInteger(code) ? code : 1);
    });
  });
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;

if (invokedPath === import.meta.url) {
  try {
    process.exitCode = await runStableDevelopmentServer();
  } catch {
    process.stderr.write("ReviewRadar's stable development server could not start.\n");
    process.exitCode = 1;
  }
}

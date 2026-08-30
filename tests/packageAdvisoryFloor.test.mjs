import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";

const LOCKFILE_URL = process.env.RR_PACKAGE_LOCK_PATH
  ? pathToFileURL(resolve(process.env.RR_PACKAGE_LOCK_PATH))
  : new URL("../package-lock.json", import.meta.url);

const PROVEN_SAFE_FLOORS = new Map([
  ["@babel/core", "7.29.7"],
  ["@hono/node-server", "1.19.17"],
  ["body-parser", "2.3.0"],
  ["fast-uri", "3.1.6"],
  ["hono", "4.13.5"],
  ["ip-address", "10.7.0"],
  ["js-yaml", "4.3.2"],
  ["nanoid", "3.3.18"],
  ["next", "16.3.3"],
  ["postcss", "8.5.23"],
  ["sharp", "0.35.4"],
]);

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value);
  assert.ok(match, `unsupported locked version: ${value}`);
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4] || null,
  };
}

function compareVersions(left, right) {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);

  for (let index = 0; index < 3; index += 1) {
    if (leftVersion.core[index] !== rightVersion.core[index]) {
      return leftVersion.core[index] - rightVersion.core[index];
    }
  }

  if (leftVersion.prerelease && !rightVersion.prerelease) return -1;
  if (!leftVersion.prerelease && rightVersion.prerelease) return 1;
  return 0;
}

function packageNameFromLockPath(packagePath) {
  const boundary = packagePath.lastIndexOf("node_modules/");
  assert.notEqual(boundary, -1, `unsupported package path: ${packagePath}`);
  return packagePath.slice(boundary + "node_modules/".length);
}

function assertRegistryArtifact(packagePath, entry) {
  const packageName = packageNameFromLockPath(packagePath);
  const tarballName = packageName.slice(packageName.lastIndexOf("/") + 1);
  assert.equal(
    entry.resolved,
    `https://registry.npmjs.org/${packageName}/-/${tarballName}-${entry.version}.tgz`,
  );
  assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
}

function lockedEntries(packages, packageName) {
  return Object.entries(packages).filter(
    ([packagePath, entry]) =>
      packagePath &&
      entry?.version &&
      packageNameFromLockPath(packagePath) === packageName,
  );
}

describe("RR-109 dependency advisory floors", () => {
  it("does not let a prerelease satisfy the corresponding stable floor", () => {
    assert.ok(compareVersions("7.29.7-beta.1", "7.29.7") < 0);
  });

  it("keeps every affected lock entry at or above the proven clean floor", async () => {
    const lock = JSON.parse(await readFile(LOCKFILE_URL, "utf8"));
    const packages = lock.packages;
    assert.equal(lock.lockfileVersion, 3);
    assert.ok(packages && typeof packages === "object");

    for (const [packageName, safeFloor] of PROVEN_SAFE_FLOORS) {
      const entries = lockedEntries(packages, packageName);
      assert.ok(entries.length > 0, `missing affected package: ${packageName}`);

      for (const [packagePath, entry] of entries) {
        assert.ok(
          compareVersions(entry.version, safeFloor) >= 0,
          `${packagePath} locks ${entry.version} below proven clean floor ${safeFloor}`,
        );
        assertRegistryArtifact(packagePath, entry);
      }
    }
  });

  it("keeps every brace-expansion entry outside the affected ranges", async () => {
    const lock = JSON.parse(await readFile(LOCKFILE_URL, "utf8"));
    const entries = lockedEntries(lock.packages, "brace-expansion");
    assert.ok(entries.length > 0, "missing affected package: brace-expansion");

    for (const [packagePath, entry] of entries) {
      const [major] = parseVersion(entry.version).core;
      const isSafe =
        (major === 1 && compareVersions(entry.version, "1.1.18") >= 0) ||
        major === 2 ||
        (major >= 5 && compareVersions(entry.version, "5.0.9") >= 0) ||
        major > 5;
      assert.ok(isSafe, `${packagePath} locks affected version ${entry.version}`);
      assertRegistryArtifact(packagePath, entry);
    }
  });

  it("keeps the Next runtime and lint configuration aligned", async () => {
    const lock = JSON.parse(await readFile(LOCKFILE_URL, "utf8"));
    assert.equal(
      lock.packages["node_modules/next"].version,
      lock.packages["node_modules/eslint-config-next"].version,
    );
  });
});

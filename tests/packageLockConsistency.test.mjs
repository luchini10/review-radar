import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const LOCKFILE_URL = new URL("../package-lock.json", import.meta.url);
const RUNTIME_NAME = "@napi-rs/wasm-runtime";

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value);
  assert.ok(match, `unsupported locked version: ${value}`);
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4] || null,
  };
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function satisfiesSupportedRange(version, range) {
  const parsedVersion = parseVersion(version);
  const caretMatch = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);

  if (!caretMatch) {
    return version === range;
  }

  if (parsedVersion.prerelease) return false;

  const minimum = caretMatch.slice(1).map(Number);
  if (compareVersions(parsedVersion.core, minimum) < 0) return false;

  if (minimum[0] > 0) return parsedVersion.core[0] === minimum[0];
  if (minimum[1] > 0) {
    return parsedVersion.core[0] === 0 && parsedVersion.core[1] === minimum[1];
  }

  return (
    parsedVersion.core[0] === 0 &&
    parsedVersion.core[1] === 0 &&
    parsedVersion.core[2] === minimum[2]
  );
}

function dependencyResolutionCandidates(parentPath, dependencyName) {
  const candidates = [`${parentPath}/node_modules/${dependencyName}`];
  let ancestorPath = parentPath;

  while (true) {
    const nestedBoundary = ancestorPath.lastIndexOf("/node_modules/");
    if (nestedBoundary === -1) {
      candidates.push(`node_modules/${dependencyName}`);
      return candidates;
    }

    ancestorPath = ancestorPath.slice(0, nestedBoundary);
    candidates.push(`${ancestorPath}/node_modules/${dependencyName}`);
  }
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

function assertResolutionProvenance(packages, resolvedPath, resolvedEntry) {
  if (!resolvedEntry.inBundle) {
    assertRegistryArtifact(resolvedPath, resolvedEntry);
    return;
  }

  const nestedSuffix = `/node_modules/${RUNTIME_NAME}`;
  assert.ok(
    resolvedPath.endsWith(nestedSuffix),
    `unsupported bundled runtime path: ${resolvedPath}`,
  );
  const bundleOwnerPath = resolvedPath.slice(0, -nestedSuffix.length);
  const bundleOwner = packages[bundleOwnerPath];
  assert.ok(bundleOwner, `missing bundle owner: ${bundleOwnerPath}`);
  assert.ok(
    bundleOwner.bundleDependencies?.includes(RUNTIME_NAME),
    `${bundleOwnerPath} does not declare ${RUNTIME_NAME} as bundled`,
  );
  assertRegistryArtifact(bundleOwnerPath, bundleOwner);
}

describe("tracked optional runtime lock graph", () => {
  it("does not let a prerelease satisfy the corresponding stable caret floor", () => {
    assert.equal(satisfiesSupportedRange("1.1.4-beta.1", "^1.1.4"), false);
  });

  it("resolves every locked WASM runtime consumer to a compatible registry artifact", async () => {
    const lock = JSON.parse(await readFile(LOCKFILE_URL, "utf8"));
    const packages = lock.packages;
    assert.equal(lock.lockfileVersion, 3);
    assert.ok(packages && typeof packages === "object");

    const consumers = Object.entries(packages).filter(
      ([packagePath, entry]) =>
        packagePath && entry?.dependencies?.[RUNTIME_NAME],
    );
    assert.ok(consumers.length > 0, "expected at least one locked runtime consumer");

    for (const [consumerPath, consumer] of consumers) {
      const requiredRange = consumer.dependencies[RUNTIME_NAME];
      const resolvedPath = dependencyResolutionCandidates(
        consumerPath,
        RUNTIME_NAME,
      ).find((candidate) => packages[candidate]);

      assert.ok(
        resolvedPath,
        `${consumerPath} has no reachable ${RUNTIME_NAME} lock entry`,
      );

      const resolvedEntry = packages[resolvedPath];
      assert.ok(
        satisfiesSupportedRange(resolvedEntry.version, requiredRange),
        `${consumerPath} requires ${RUNTIME_NAME} ${requiredRange}, but ${resolvedPath} locks ${resolvedEntry.version}`,
      );
      assertResolutionProvenance(packages, resolvedPath, resolvedEntry);
    }
  });
});

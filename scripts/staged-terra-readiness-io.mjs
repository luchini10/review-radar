import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

export const STAGED_TERRA_READINESS_TRUST_SURFACE_ROOT_PATHS = Object.freeze([
  "scripts/launch-staged-terra-readiness.mjs",
  "scripts/run-staged-terra-readiness.mjs",
  "scripts/staged-terra-readiness-io.mjs",
]);
export const STAGED_TERRA_READINESS_TRUST_SURFACE_FIXED_PATHS = Object.freeze([
  "package.json",
  "package-lock.json",
  "tests/fixtures/staged-terra-readiness-matrix-v2.json",
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizedPath(value) {
  const resolved = path.normalize(path.resolve(value));
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function samePath(left, right) {
  return normalizedPath(left) === normalizedPath(right);
}

function gitOutput(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

function staticModuleReferences(sourceFile, importer) {
  const specifiers = new Set();
  const failures = [];
  const add = (node) => {
    if (node && ts.isStringLiteralLike(node)) {
      specifiers.add(node.text);
      return true;
    }
    return false;
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        if (!add(node.arguments[0])) {
          failures.push(`trust_surface_dynamic_import_nonliteral:${importer}`);
        }
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require"
      ) {
        if (node.arguments.length !== 1 || !add(node.arguments[0])) {
          failures.push(`trust_surface_require_nonliteral:${importer}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return {
    specifiers: [...specifiers],
    failures: [...new Set(failures)],
  };
}

function repoRelativePath(repoRoot, absolutePath) {
  const relation = path.relative(repoRoot, absolutePath);
  if (
    relation === "" ||
    relation.startsWith("..") ||
    path.isAbsolute(relation)
  ) {
    return null;
  }
  return relation.replaceAll("\\", "/");
}

async function resolveLocalImport(repoRoot, importer, specifier) {
  if (!specifier.startsWith(".")) return { path: null, failure: null };
  const base = path.resolve(repoRoot, path.dirname(importer), specifier);
  const candidates = path.extname(base)
    ? [base]
    : [
        base,
        ...[".ts", ".tsx", ".mts", ".cts", ".mjs", ".cjs", ".js", ".json"].map(
          (extension) => `${base}${extension}`,
        ),
        ...[".ts", ".tsx", ".mjs", ".cjs", ".js", ".json"].map(
          (extension) => path.join(base, `index${extension}`),
        ),
      ];
  for (const candidate of candidates) {
    const relativePath = repoRelativePath(repoRoot, candidate);
    if (!relativePath) {
      return {
        path: null,
        failure: `trust_surface_import_outside:${importer}:${specifier}`,
      };
    }
    try {
      const stat = await fs.lstat(candidate);
      if (stat.isFile() || stat.isSymbolicLink()) {
        return { path: relativePath, failure: null };
      }
    } catch (error) {
      if (!(error && typeof error === "object" && error.code === "ENOENT")) {
        return {
          path: null,
          failure: `trust_surface_import_inspection_failed:${importer}:${specifier}`,
        };
      }
    }
  }
  return {
    path: null,
    failure: `trust_surface_import_unresolved:${importer}:${specifier}`,
  };
}

export async function discoverStagedTerraReadinessImportClosure({
  repoRoot,
  rootPaths = STAGED_TERRA_READINESS_TRUST_SURFACE_ROOT_PATHS,
}) {
  const failures = [];
  const discovered = new Set();
  const queue = [...rootPaths];
  const codeExtensions = new Set([
    ".ts",
    ".tsx",
    ".mts",
    ".cts",
    ".mjs",
    ".cjs",
    ".js",
  ]);
  while (queue.length > 0) {
    const relativePath = queue.shift().replaceAll("\\", "/");
    if (discovered.has(relativePath)) continue;
    discovered.add(relativePath);
    const absolutePath = path.resolve(repoRoot, relativePath);
    if (repoRelativePath(repoRoot, absolutePath) !== relativePath) {
      failures.push(`trust_surface_path_outside:${relativePath}`);
      continue;
    }
    let stat;
    let source;
    try {
      stat = await fs.lstat(absolutePath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        failures.push(`trust_surface_file_indirect:${relativePath}`);
        continue;
      }
      if (!codeExtensions.has(path.extname(relativePath))) continue;
      source = await fs.readFile(absolutePath, "utf8");
    } catch {
      failures.push(`trust_surface_file_missing:${relativePath}`);
      continue;
    }
    const sourceFile = ts.createSourceFile(
      relativePath,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    if (sourceFile.parseDiagnostics.length > 0) {
      failures.push(`trust_surface_parse_failed:${relativePath}`);
      continue;
    }
    const references = staticModuleReferences(sourceFile, relativePath);
    failures.push(...references.failures);
    for (const specifier of references.specifiers) {
      const resolved = await resolveLocalImport(
        repoRoot,
        relativePath,
        specifier,
      );
      if (resolved.failure) failures.push(resolved.failure);
      if (resolved.path && !discovered.has(resolved.path)) {
        queue.push(resolved.path);
      }
    }
  }
  return {
    ok: failures.length === 0,
    paths: [...discovered].sort(),
    failures: [...new Set(failures)],
  };
}

export async function authenticateStagedTerraReadinessTrustSurface({
  repoRoot,
  commitSha,
  rootPaths = STAGED_TERRA_READINESS_TRUST_SURFACE_ROOT_PATHS,
  fixedPaths = STAGED_TERRA_READINESS_TRUST_SURFACE_FIXED_PATHS,
}) {
  const closure = await discoverStagedTerraReadinessImportClosure({
    repoRoot,
    rootPaths,
  });
  const failures = [...closure.failures];
  const entries = [];
  const declaredPaths = [...rootPaths, ...fixedPaths];
  if (new Set(declaredPaths).size !== declaredPaths.length) {
    failures.push("trust_surface_path_duplicate");
  }
  const uniquePaths = [...new Set([...declaredPaths, ...closure.paths])].sort();
  for (const relativePath of uniquePaths) {
    const normalizedRelative = relativePath.replaceAll("\\", "/");
    const absolutePath = path.resolve(repoRoot, relativePath);
    const relation = path.relative(repoRoot, absolutePath);
    if (
      relation === "" ||
      relation.startsWith("..") ||
      path.isAbsolute(relation)
    ) {
      failures.push(`trust_surface_path_outside:${normalizedRelative}`);
      continue;
    }
    let stat;
    let realPath;
    try {
      stat = await fs.lstat(absolutePath);
      realPath = await fs.realpath(absolutePath);
    } catch {
      failures.push(`trust_surface_file_missing:${normalizedRelative}`);
      continue;
    }
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      !samePath(realPath, absolutePath)
    ) {
      failures.push(`trust_surface_file_indirect:${normalizedRelative}`);
      continue;
    }
    let treeLine;
    let workingBlob;
    try {
      treeLine = gitOutput(repoRoot, [
        "ls-tree",
        commitSha,
        "--",
        normalizedRelative,
      ]);
      workingBlob = gitOutput(repoRoot, [
        "hash-object",
        `--path=${normalizedRelative}`,
        "--",
        normalizedRelative,
      ]);
    } catch {
      failures.push(`trust_surface_git_read_failed:${normalizedRelative}`);
      continue;
    }
    const match = treeLine.match(
      /^(100644) blob ([a-f0-9]{40}|[a-f0-9]{64})\t(.+)$/,
    );
    if (!match || match[3] !== normalizedRelative) {
      failures.push(`trust_surface_git_entry_invalid:${normalizedRelative}`);
      continue;
    }
    if (workingBlob !== match[2]) {
      failures.push(`trust_surface_working_blob_mismatch:${normalizedRelative}`);
      continue;
    }
    const bytes = await fs.readFile(absolutePath);
    entries.push({
      path: normalizedRelative,
      mode: match[1],
      gitBlob: match[2],
      sha256: sha256(bytes),
    });
  }
  const complete = failures.length === 0 && entries.length === uniquePaths.length;
  return {
    ok: complete,
    manifestSha256: complete
      ? sha256(Buffer.from(JSON.stringify(entries), "utf8"))
      : null,
    entries: complete ? entries : [],
    failures: [...new Set(failures)],
  };
}

async function inspectDirectory(absolutePath, label, failures) {
  let stat;
  let realPath;
  try {
    stat = await fs.lstat(absolutePath);
    realPath = await fs.realpath(absolutePath);
  } catch {
    failures.push(`output_parent_missing:${label}`);
    return;
  }
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    !samePath(realPath, absolutePath)
  ) {
    failures.push(`output_parent_indirect:${label}`);
  }
}

export async function inspectStagedTerraReadinessOutputBoundary({
  repoRoot,
  outputDirectory,
  expectedLeafState = "absent",
}) {
  const failures = [];
  const liveRoot = path.resolve(
    repoRoot,
    "tests",
    "fixtures",
    "review-radar-live",
  );
  if (!samePath(path.dirname(outputDirectory), liveRoot)) {
    failures.push("output_leaf_outside_fixed_root");
  }
  const parents = [
    [repoRoot, "repo"],
    [path.join(repoRoot, "tests"), "tests"],
    [path.join(repoRoot, "tests", "fixtures"), "fixtures"],
    [liveRoot, "live_root"],
  ];
  for (const [parent, label] of parents) {
    await inspectDirectory(parent, label, failures);
  }
  try {
    const stat = await fs.lstat(outputDirectory);
    const realPath = await fs.realpath(outputDirectory);
    if (expectedLeafState === "absent") {
      failures.push("output_leaf_exists");
    } else if (
      expectedLeafState !== "directory" ||
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      !samePath(realPath, outputDirectory)
    ) {
      failures.push("output_leaf_indirect");
    }
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      if (expectedLeafState !== "absent") failures.push("output_leaf_missing");
    } else {
      failures.push("output_leaf_inspection_failed");
    }
  }
  return {
    ok: failures.length === 0,
    expectedLeafState,
    failures: [...new Set(failures)],
  };
}

export async function readStagedTerraReadinessArtifactFile({
  repoRoot,
  outputDirectory,
}) {
  const failures = [];
  const boundary = await inspectStagedTerraReadinessOutputBoundary({
    repoRoot,
    outputDirectory,
    expectedLeafState: "directory",
  });
  if (!boundary.ok) {
    failures.push(
      ...boundary.failures.map((failure) => `prior_artifact_${failure}`),
    );
    return {
      ok: false,
      bytes: null,
      failures: [...new Set(failures)],
    };
  }
  const artifactFile = path.join(outputDirectory, "artifact.json");
  let handle;
  let bytes = null;
  try {
    const pathStat = await fs.lstat(artifactFile, { bigint: true });
    const realPath = await fs.realpath(artifactFile);
    if (
      !pathStat.isFile() ||
      pathStat.isSymbolicLink() ||
      !samePath(realPath, artifactFile)
    ) {
      failures.push("prior_artifact_file_indirect");
    } else {
      handle = await fs.open(artifactFile, "r");
      const before = await handle.stat({ bigint: true });
      if (
        !before.isFile() ||
        pathStat.dev !== before.dev ||
        pathStat.ino !== before.ino ||
        before.size < 1n ||
        before.size > 1_000_000n
      ) {
        failures.push("prior_artifact_file_size_invalid");
      } else {
        bytes = await handle.readFile();
        const after = await handle.stat({ bigint: true });
        const finalPathStat = await fs.lstat(artifactFile, { bigint: true });
        const finalRealPath = await fs.realpath(artifactFile);
        if (
          !after.isFile() ||
          before.dev !== after.dev ||
          before.ino !== after.ino ||
          before.size !== after.size ||
          before.mtimeNs !== after.mtimeNs ||
          before.ctimeNs !== after.ctimeNs ||
          after.dev !== finalPathStat.dev ||
          after.ino !== finalPathStat.ino ||
          !finalPathStat.isFile() ||
          finalPathStat.isSymbolicLink() ||
          bytes.length !== Number(after.size) ||
          !samePath(finalRealPath, artifactFile)
        ) {
          failures.push("prior_artifact_file_changed");
          bytes = null;
        }
      }
    }
  } catch {
    failures.push("prior_artifact_file_unavailable");
    bytes = null;
  } finally {
    await handle?.close();
  }
  if (failures.length > 0) bytes = null;
  return {
    ok: failures.length === 0 && Buffer.isBuffer(bytes),
    bytes,
    failures: [...new Set(failures)],
  };
}

export async function writeStagedTerraReadinessFileExclusive(file, bytes) {
  const temporary = `${file}.tmp`;
  const handle = await fs.open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.link(temporary, file);
  await fs.unlink(temporary);
}

export function createStagedTerraReadinessCheckpointWriter({
  outputDirectory,
  writeSnapshot = writeStagedTerraReadinessFileExclusive,
}) {
  let nextSequence = 0;
  let writeChain = Promise.resolve();
  const schedule = (bytes) => {
    const sequence = nextSequence;
    nextSequence += 1;
    const file = path.join(
      outputDirectory,
      `attempt-${String(sequence).padStart(6, "0")}.json`,
    );
    const snapshot = Buffer.from(bytes);
    writeChain = writeChain.then(async () => {
      await writeSnapshot(file, snapshot);
      return { sequence, file };
    });
    return writeChain;
  };
  return {
    schedule,
    drain: () => writeChain,
  };
}

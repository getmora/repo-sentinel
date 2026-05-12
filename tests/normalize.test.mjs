import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const normalizeScript = path.join(repoRoot, ".repo-sentinel/scripts/normalize.mjs");

test("normalizes expanded full-audit scanner outputs", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-normalize-"));
  const rawDir = path.join(workspace, ".repo-sentinel/reports/raw");
  fs.mkdirSync(rawDir, { recursive: true });

  fs.writeFileSync(
    path.join(rawDir, "run-manifest.json"),
    JSON.stringify({
      scanners: [
        { name: "zizmor", status: "ok", exitCode: 0 },
        { name: "osv-scanner", status: "ok", exitCode: 0 },
        { name: "scorecard", status: "ok", exitCode: 0 },
        { name: "shellcheck", status: "ok", exitCode: 0 },
        { name: "hadolint", status: "ok", exitCode: 0 },
        { name: "fallow", status: "ok", exitCode: 0 },
      ],
    }),
  );

  fs.writeFileSync(
    path.join(rawDir, "zizmor.json"),
    JSON.stringify([
      { determinations: { severity: "High", confidence: "Medium" } },
      { determinations: { severity: "Low", confidence: "High" } },
    ]),
  );
  fs.writeFileSync(
    path.join(rawDir, "osv-scanner.json"),
    JSON.stringify({
      results: [
        {
          packages: [
            {
              vulnerabilities: [
                { database_specific: { severity: "HIGH" } },
                { Severity: "LOW" },
              ],
            },
          ],
        },
      ],
    }),
  );
  fs.writeFileSync(
    path.join(rawDir, "scorecard.json"),
    JSON.stringify({ score: 7.5, checks: [{ score: 10 }, { score: 5 }] }),
  );
  fs.writeFileSync(
    path.join(rawDir, "shellcheck.json"),
    JSON.stringify({ comments: [{ level: "error" }, { level: "warning" }] }),
  );
  fs.writeFileSync(
    path.join(rawDir, "hadolint.json"),
    JSON.stringify([{ level: "error" }, { level: "info" }]),
  );
  fs.writeFileSync(
    path.join(rawDir, "fallow.json"),
    JSON.stringify({
      summary: { total: 7 },
      deadCode: { unusedFiles: [{ file: "src/old.ts" }], unusedExports: [{ name: "oldExport" }] },
      duplication: { cloneFamilies: 2, duplicatedLines: 40 },
      health: { aboveThreshold: 1 },
    }),
  );

  execFileSync("node", [normalizeScript], { cwd: workspace, stdio: "pipe" });

  const index = fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/normalized/index.md"), "utf8");
  const zizmorLine = index.split("\n").find((line) => line.startsWith("| zizmor |"));
  assert.match(zizmorLine, /findings: 2/);
  assert.match(zizmorLine, /high: 1/);
  assert.match(zizmorLine, /low: 1/);
  assert.doesNotMatch(zizmorLine, /medium: 1/);
  assert.match(index, /\| osv-scanner \| ok \| 0 .* vulnerabilities: 2/);
  assert.match(index, /\| scorecard \| ok \| 0 .* failing_checks: 1/);
  assert.match(index, /\| shellcheck \| ok \| 0 .* error: 1/);
  assert.match(index, /\| hadolint \| ok \| 0 .* info: 1/);
  assert.match(index, /\| fallow \| ok \| 0 .* total: 7/);
  assert.match(index, /\| fallow \| ok \| 0 .* unused_files: 1/);
  assert.match(index, /\| fallow \| ok \| 0 .* clone_families: 2/);
});

test("normalizes Fallow snake_case JSON output", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-normalize-"));
  const rawDir = path.join(workspace, ".repo-sentinel/reports/raw");
  fs.mkdirSync(rawDir, { recursive: true });

  fs.writeFileSync(
    path.join(rawDir, "run-manifest.json"),
    JSON.stringify({
      scanners: [{ name: "fallow", status: "ok", exitCode: 0 }],
    }),
  );
  fs.writeFileSync(
    path.join(rawDir, "fallow.json"),
    JSON.stringify({
      summary: {
        dead_code_issues: 3,
        complexity_findings: 2,
        max_cyclomatic: 28,
        duplication_clone_groups: 1,
      },
      dead_code: {
        total_issues: 3,
        unused_files: [{ path: "src/old.ts" }],
        unused_exports: [{ path: "src/a.ts", name: "old" }],
        unused_dependencies: [{ name: "left-pad" }],
        circular_dependencies: [{ cycle: ["a.ts", "b.ts"] }],
      },
      complexity: {
        findings: [{ path: "src/hard.ts" }, { path: "src/harder.ts" }],
      },
      duplication: {
        clone_groups: [{ instances: [] }],
        stats: { duplication_percentage: 4.2 },
      },
    }),
  );

  execFileSync("node", [normalizeScript], { cwd: workspace, stdio: "pipe" });

  const index = fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/normalized/index.md"), "utf8");
  const fallowLine = index.split("\n").find((line) => line.startsWith("| fallow |"));
  assert.match(fallowLine, /total: 3/);
  assert.match(fallowLine, /unused_files: 1/);
  assert.match(fallowLine, /unused_exports: 1/);
  assert.match(fallowLine, /unused_dependencies: 1/);
  assert.match(fallowLine, /circular_dependencies: 1/);
  assert.match(fallowLine, /complexity_findings: 2/);
  assert.match(fallowLine, /clone_groups: 1/);
  assert.match(fallowLine, /duplication_percentage: 4.2/);
});

test("normalizes nonzero zizmor findings as completed evidence", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-normalize-"));
  const rawDir = path.join(workspace, ".repo-sentinel/reports/raw");
  fs.mkdirSync(rawDir, { recursive: true });

  fs.writeFileSync(
    path.join(rawDir, "run-manifest.json"),
    JSON.stringify({
      scanners: [{ name: "zizmor", status: "completed_with_findings", exitCode: 42 }],
    }),
  );
  fs.writeFileSync(
    path.join(rawDir, "zizmor.json"),
    JSON.stringify([{ determinations: { severity: "High" } }]),
  );

  execFileSync("node", [normalizeScript], { cwd: workspace, stdio: "pipe" });

  const index = fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/normalized/index.md"), "utf8");
  assert.match(index, /\| zizmor \| completed_with_findings \| 42 .* findings: 1/);
  assert.match(index, /\| zizmor \| completed_with_findings \| 42 .* high: 1/);
});

test("normalizes previous scan snapshot links when available", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-normalize-"));
  const rawDir = path.join(workspace, ".repo-sentinel/reports/raw");
  const previousDir = path.join(workspace, ".repo-sentinel/reports/previous");
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(path.join(previousDir, "normalized"), { recursive: true });
  fs.mkdirSync(path.join(previousDir, "final"), { recursive: true });
  fs.mkdirSync(path.join(previousDir, "raw"), { recursive: true });

  fs.writeFileSync(path.join(rawDir, "run-manifest.json"), JSON.stringify({ scanners: [] }));
  fs.writeFileSync(path.join(previousDir, "normalized/index.md"), "# Previous index\n");
  fs.writeFileSync(path.join(previousDir, "final/audit-report.md"), "# Previous report\n");
  fs.writeFileSync(path.join(previousDir, "raw/run-manifest.json"), "{}\n");

  execFileSync("node", [normalizeScript], { cwd: workspace, stdio: "pipe" });

  const index = fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/normalized/index.md"), "utf8");
  assert.match(index, /## Previous Scan Context/);
  assert.match(index, /Previous normalized index/);
  assert.match(index, /Previous technical report/);
  assert.match(index, /Previous raw manifest/);
});

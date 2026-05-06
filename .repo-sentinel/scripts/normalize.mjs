#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const rawDir = ".repo-sentinel/reports/raw";
const normalizedDir = ".repo-sentinel/reports/normalized";
const indexPath = path.join(normalizedDir, "index.md");

const scannerOutputs = {
  semgrep: "semgrep.json",
  "trivy-fs": "trivy-fs.json",
  gitleaks: "gitleaks.json",
  syft: "syft.json",
  grype: "grype.json",
  checkov: "checkov.json",
  zizmor: "zizmor.json",
  "osv-scanner": "osv-scanner.json",
  scorecard: "scorecard.json",
  shellcheck: "shellcheck.json",
  hadolint: "hadolint.json",
  fallow: "fallow.json",
};

fs.mkdirSync(normalizedDir, { recursive: true });

function readJson(filePath) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    if (text.trim() === "") {
      return { ok: false, reason: "empty" };
    }
    return { ok: true, data: JSON.parse(text) };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { ok: false, reason: "missing" };
    }
    return { ok: false, reason: "invalid" };
  }
}

function addCount(counts, key) {
  const normalized = String(key || "unknown").toLowerCase();
  counts[normalized] = (counts[normalized] || 0) + 1;
}

function semgrepCounts(data) {
  const counts = {};
  const results = data?.results || [];
  counts.findings = results.length;
  for (const result of results) {
    addCount(counts, result?.extra?.severity);
  }
  return counts;
}

function trivyCounts(data) {
  const counts = { vulnerabilities: 0, misconfigurations: 0, secrets: 0 };
  for (const result of data?.Results || []) {
    for (const vuln of result?.Vulnerabilities || []) {
      counts.vulnerabilities += 1;
      addCount(counts, vuln?.Severity);
    }
    for (const misconfiguration of result?.Misconfigurations || []) {
      counts.misconfigurations += 1;
      addCount(counts, misconfiguration?.Severity);
    }
    for (const secret of result?.Secrets || []) {
      counts.secrets += 1;
      addCount(counts, secret?.Severity);
    }
  }
  return counts;
}

function gitleaksCounts(data) {
  const counts = {};
  if (Array.isArray(data)) {
    counts.findings = data.length;
  } else if (Array.isArray(data?.Findings)) {
    counts.findings = data.Findings.length;
  }
  return counts;
}

function syftCounts(data) {
  const counts = {};
  if (Array.isArray(data?.artifacts)) {
    counts.packages = data.artifacts.length;
  }
  return counts;
}

function grypeCounts(data) {
  const counts = {};
  for (const match of data?.matches || []) {
    addCount(counts, match?.vulnerability?.severity);
  }
  return counts;
}

function checkovCounts(data) {
  const counts = {};
  const summaries = Array.isArray(data) ? data : [data];
  for (const item of summaries) {
    const summary = item?.summary || {};
    for (const [key, value] of Object.entries(summary)) {
      if (typeof value === "number") {
        counts[key] = (counts[key] || 0) + value;
      }
    }
  }
  return counts;
}

function zizmorCounts(data) {
  const counts = { findings: 0 };
  const findings = Array.isArray(data) ? data : data?.findings || [];
  counts.findings = findings.length;
  for (const finding of findings) {
    addCount(counts, finding?.determinations?.severity);
  }
  return counts;
}

function osvScannerCounts(data) {
  const counts = { vulnerabilities: 0 };
  const results = data?.results || data?.Results || [];
  for (const result of results) {
    for (const pkg of result?.packages || result?.Packages || []) {
      const vulnerabilities = pkg?.vulnerabilities || pkg?.Vulnerabilities || [];
      counts.vulnerabilities += vulnerabilities.length;
      for (const vulnerability of vulnerabilities) {
        const severity = vulnerability?.database_specific?.severity || vulnerability?.severity?.[0]?.score || vulnerability?.Severity;
        if (severity) addCount(counts, severity);
      }
    }
  }
  return counts;
}

function scorecardCounts(data) {
  const counts = {};
  if (typeof data?.score === "number") counts.score = data.score;
  const checks = data?.checks || [];
  if (Array.isArray(checks)) {
    counts.checks = checks.length;
    counts.failing_checks = checks.filter((check) => typeof check?.score === "number" && check.score < 10).length;
  }
  return counts;
}

function shellcheckCounts(data) {
  const counts = { findings: 0 };
  const comments = data?.comments || [];
  counts.findings = comments.length;
  for (const comment of comments) {
    addCount(counts, comment?.level);
  }
  return counts;
}

function hadolintCounts(data) {
  const counts = { findings: 0 };
  const findings = Array.isArray(data) ? data : [];
  counts.findings = findings.length;
  for (const finding of findings) {
    addCount(counts, finding?.level);
  }
  return counts;
}

function arrayCount(value) {
  return Array.isArray(value) ? value.length : undefined;
}

function fallowCounts(data) {
  const counts = {};
  const summaryTotal = data?.summary?.total ?? data?.summary?.total_issues ?? data?.summary?.dead_code_issues;
  if (typeof summaryTotal === "number") counts.total = summaryTotal;
  if (typeof data?.summary?.dead_code_issues === "number") counts.dead_code_issues = data.summary.dead_code_issues;
  if (typeof data?.summary?.complexity_findings === "number") counts.complexity_findings = data.summary.complexity_findings;
  if (typeof data?.summary?.max_cyclomatic === "number") counts.max_cyclomatic = data.summary.max_cyclomatic;
  if (typeof data?.summary?.duplication_clone_groups === "number") counts.duplication_clone_groups = data.summary.duplication_clone_groups;

  const deadCode = data?.deadCode ?? data?.dead_code ?? data;
  const unusedFiles = arrayCount(deadCode?.unusedFiles ?? deadCode?.unused_files);
  if (typeof unusedFiles === "number") counts.unused_files = unusedFiles;
  const unusedExports = arrayCount(deadCode?.unusedExports ?? deadCode?.unused_exports);
  if (typeof unusedExports === "number") counts.unused_exports = unusedExports;
  const circularDependencies = arrayCount(deadCode?.circularDependencies ?? deadCode?.circular_dependencies);
  if (typeof circularDependencies === "number") counts.circular_dependencies = circularDependencies;
  const unusedDependencies = arrayCount(deadCode?.unusedDependencies ?? deadCode?.unused_dependencies);
  if (typeof unusedDependencies === "number") counts.unused_dependencies = unusedDependencies;

  const duplication = data?.duplication ?? data;
  if (typeof duplication?.cloneFamilies === "number") counts.clone_families = duplication.cloneFamilies;
  if (typeof duplication?.cloneGroups === "number") counts.clone_groups = duplication.cloneGroups;
  const cloneGroups = arrayCount(duplication?.clone_groups);
  if (typeof cloneGroups === "number") counts.clone_groups = cloneGroups;
  if (typeof duplication?.duplicatedLines === "number") counts.duplicated_lines = duplication.duplicatedLines;
  if (typeof duplication?.total_lines_duplicated === "number") counts.duplicated_lines = duplication.total_lines_duplicated;
  if (typeof duplication?.stats?.duplication_percentage === "number") counts.duplication_percentage = duplication.stats.duplication_percentage;

  const health = data?.health ?? data?.complexity ?? data;
  if (typeof health?.aboveThreshold === "number") counts.above_threshold = health.aboveThreshold;
  if (typeof health?.above_threshold === "number") counts.above_threshold = health.above_threshold;
  if (typeof health?.functionsAnalyzed === "number") counts.functions_analyzed = health.functionsAnalyzed;
  if (typeof health?.functions_analyzed === "number") counts.functions_analyzed = health.functions_analyzed;
  if (typeof health?.averageMaintainability === "number") counts.average_maintainability = health.averageMaintainability;
  if (typeof health?.average_maintainability === "number") counts.average_maintainability = health.average_maintainability;
  const complexityFindings = arrayCount(health?.findings);
  if (typeof complexityFindings === "number") counts.complexity_findings = complexityFindings;

  const issues = arrayCount(data?.issues);
  if (typeof issues === "number") counts.issues = issues;
  const findings = arrayCount(data?.findings);
  if (typeof findings === "number") counts.findings = findings;

  return counts;
}

function countsFor(name, data) {
  if (name === "semgrep") return semgrepCounts(data);
  if (name === "trivy-fs") return trivyCounts(data);
  if (name === "gitleaks") return gitleaksCounts(data);
  if (name === "syft") return syftCounts(data);
  if (name === "grype") return grypeCounts(data);
  if (name === "checkov") return checkovCounts(data);
  if (name === "zizmor") return zizmorCounts(data);
  if (name === "osv-scanner") return osvScannerCounts(data);
  if (name === "scorecard") return scorecardCounts(data);
  if (name === "shellcheck") return shellcheckCounts(data);
  if (name === "hadolint") return hadolintCounts(data);
  if (name === "fallow") return fallowCounts(data);
  return {};
}

function formatCounts(counts) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return "No count data found";
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

const manifestPath = path.join(rawDir, "run-manifest.json");
const manifestResult = readJson(manifestPath);
const manifestScanners = new Map();
if (manifestResult.ok && Array.isArray(manifestResult.data?.scanners)) {
  for (const scanner of manifestResult.data.scanners) {
    manifestScanners.set(scanner.name, scanner);
  }
}

const lines = [
  "# Repo Sentinel Normalized Scanner Index",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Scanner Status",
  "",
  "| Scanner | Status | Exit Code | Raw Output | Summary |",
  "| --- | --- | ---: | --- | --- |",
];

for (const [name, fileName] of Object.entries(scannerOutputs)) {
  const filePath = path.join(rawDir, fileName);
  const manifestEntry = manifestScanners.get(name);
  const result = readJson(filePath);
  let status = manifestEntry?.status || "not run";
  if (manifestEntry && status === "ok" && !result.ok) {
    status = result.reason;
  }
  const exitCode = manifestEntry?.exitCode ?? "";
  const rawLink = `../raw/${fileName}`;
  const summary = result.ok ? formatCounts(countsFor(name, result.data)) : `No usable JSON: ${result.reason}`;
  lines.push(`| ${name} | ${status} | ${exitCode} | [${fileName}](${rawLink}) | ${summary} |`);
}

lines.push(
  "",
  "## Manifest",
  "",
  manifestResult.ok
    ? `Manifest: [run-manifest.json](../raw/run-manifest.json)`
    : `Manifest unavailable: ${manifestResult.reason}`,
  "",
  "## Review Notes",
  "",
  "- Treat scanner output as evidence, not as a complete audit.",
  "- Confirm each high-impact finding against repository source before including it in the final report.",
  "- Mark missing, failed, empty, or invalid scanner output as a coverage gap."
);

fs.writeFileSync(indexPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${indexPath}`);

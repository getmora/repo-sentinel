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

function countsFor(name, data) {
  if (name === "semgrep") return semgrepCounts(data);
  if (name === "trivy-fs") return trivyCounts(data);
  if (name === "gitleaks") return gitleaksCounts(data);
  if (name === "syft") return syftCounts(data);
  if (name === "grype") return grypeCounts(data);
  if (name === "checkov") return checkovCounts(data);
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

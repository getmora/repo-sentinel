---
name: repo-sentinel
description: Use this skill when the user asks to audit a repository, review codebase risk, run a security review, assess launch readiness, perform a principal engineer review, or generate an engineering audit report.
---

# Repo Sentinel

Use this skill to perform a structured repository audit by combining local scanner outputs with Codex-led engineering review.

## Workflow

1. If `.repo-sentinel/scripts/audit.sh` is missing, bootstrap the repo-local bundle with `curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash -s -- --repo-only`.
2. Run `.repo-sentinel/scripts/setup.sh --check`.
3. Run `.repo-sentinel/scripts/audit.sh --quick` by default.
4. Run `.repo-sentinel/scripts/audit.sh --full` only when the user asks for a full audit.
5. Run `node .repo-sentinel/scripts/normalize.mjs`.
6. Read `.repo-sentinel/reports/normalized/index.md`.
7. For Gitleaks evidence, use the normalized index first. Inspect `.repo-sentinel/reports/raw/gitleaks.json` only for targeted confirmation of a specific redacted finding.
8. Perform the context pass before interpreting scanner findings, especially Fallow output.
9. Use parallel subagents for review slices when the current Codex environment supports subagents and the user request permits delegation.
10. Use `.repo-sentinel/prompts/review.md` to produce the main findings.
11. Use `.repo-sentinel/prompts/adversarial-review.md` to challenge the findings.
12. Use `.repo-sentinel/prompts/final-report.md` to produce the technical final report.
13. Write the technical final report to `.repo-sentinel/reports/final/audit-report.md`.
14. Use `.repo-sentinel/prompts/non-technical-report.md` to produce a plain-English report for non-technical readers.
15. Create `.repo_sentinal/` and write the plain-English report to `.repo_sentinal/audit-report.md` so the audit result is easy to view from the repository root.

## Invocation

After the skill is installed globally, users can invoke it by naming the skill in chat:

```text
$repo-sentinel run a quick audit
```

```text
$repo-sentinel run a full audit
```

If the current Codex client does not support slash commands for custom skills, use the `$repo-sentinel` form.

## Subagent Use

Use subagents when they can review independent evidence in parallel without modifying files. Keep orchestration, prioritization, final decisions, and final report writing in the main agent.

## Gitleaks Handling

Repo Sentinel scans the current working tree with Gitleaks by default, using redacted output and not scanning git history. If the user explicitly asks for git history secret scanning, run the audit with `REPO_SENTINEL_GITLEAKS_HISTORY=1`.

Do not load the full raw Gitleaks JSON into context when it is large. Use `.repo-sentinel/reports/normalized/index.md` for counts and scanner status, then inspect only the specific redacted raw entries needed to verify an evidence-backed finding.

## Context Pass

Before converting scanner output into findings, build a short repository context model:

- Identify the application type, runtime, framework, package manager, deployment target, and main entrypoints.
- Read `README`, package manifests, workspace config, routing files, framework config, build scripts, test scripts, deployment config, and public export surfaces where present.
- Note dynamic-loading patterns, framework conventions, generated files, codegen outputs, runtime-referenced files, public APIs, scheduled jobs, CLI entrypoints, and integration boundaries.
- Use this context to decide whether a scanner result is actionable, ambiguous, or a coverage gap.

For Fallow specifically, treat dead-code output as cleanup candidates, not deletion proof. Do not recommend deleting a file, export, dependency, route, or module unless the context pass supports that it is not used by framework conventions, dynamic imports, public API consumers, build tooling, tests, runtime configuration, or external integrations. If the context is incomplete, downgrade confidence or recommend verification instead of deletion.

Do not run Fallow fix commands or modify application source code during a Repo Sentinel audit.

If using subagents, give the context pass to the relevant subagents and require them to preserve the distinction between Fallow evidence and Codex inference.

## Subagent Slices

After reading `.repo-sentinel/reports/normalized/index.md`, launch bounded review subagents when available:

- Context and intent, architecture, maintainability, developer experience, and change risk.
- Correctness, data and state integrity, reliability, and testing.
- Security, privacy, compliance and governance, scanner evidence, and dependency or secret risk.
- Performance and scalability, operability, launch readiness, operational risk, and remediation planning.
- Team ownership and knowledge risk, risk synthesis and forecasting, and cross-domain emergent risk.

Give each subagent `.repo-sentinel/reports/normalized/index.md`, relevant raw scanner paths, and the repository files needed for its slice. Ask each subagent for evidence-backed findings only, with affected files and confidence. Do not ask subagents to write `.repo-sentinel/reports/final/audit-report.md` or modify application source code.

If subagents are unavailable, the repository is very small, or delegation would add more overhead than value, perform the same review locally and say that subagent delegation was skipped.

Use one adversarial-review subagent when available after the main draft findings exist. Ask it to challenge evidence, severity, duplicates, missing high-risk areas, and scanner interpretation. The main agent decides which challenges to accept before writing the final report.

## Review Rules

- Treat scanner output as evidence, not as a complete audit.
- Treat Fallow dead-code output as cleanup candidates, not deletion proof.
- Do not invent findings.
- Do not include generic advice unless it is tied to repository evidence.
- Clearly distinguish scanner evidence from Codex inference.
- Require context-pass confirmation before recommending deletion or dependency removal.
- If a scanner is missing or failed, include that as an audit coverage gap.
- Do not modify application source code during the audit.
- Do not run automatic fix commands during the audit.
- Do not let subagents modify repository files or write the technical or non-technical final reports.
- Prioritize by severity, confidence, blast radius, and fix difficulty.

## Outputs

- Raw scanner output: `.repo-sentinel/reports/raw/`
- Normalized scanner index: `.repo-sentinel/reports/normalized/index.md`
- Technical final report: `.repo-sentinel/reports/final/audit-report.md`
- Plain-English report: `.repo_sentinal/audit-report.md`

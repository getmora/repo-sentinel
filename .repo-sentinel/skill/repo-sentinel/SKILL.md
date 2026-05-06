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
7. Use parallel subagents for review slices when the current Codex environment supports subagents and the user request permits delegation.
8. Use `.repo-sentinel/prompts/review.md` to produce the main findings.
9. Use `.repo-sentinel/prompts/adversarial-review.md` to challenge the findings.
10. Use `.repo-sentinel/prompts/final-report.md` to produce the final report.
11. Write the final report to `.repo-sentinel/reports/final/audit-report.md`.
12. Also create `.repo_sentinal/` and write the same final report to `.repo_sentinal/audit-report.md` so the audit result is easy to view from the repository root.

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
- Do not invent findings.
- Do not include generic advice unless it is tied to repository evidence.
- Clearly distinguish scanner evidence from Codex inference.
- If a scanner is missing or failed, include that as an audit coverage gap.
- Do not modify application source code during the audit.
- Do not let subagents modify repository files or write the final report.
- Prioritize by severity, confidence, blast radius, and fix difficulty.

## Outputs

- Raw scanner output: `.repo-sentinel/reports/raw/`
- Normalized scanner index: `.repo-sentinel/reports/normalized/index.md`
- Internal final report: `.repo-sentinel/reports/final/audit-report.md`
- Human-facing audit report: `.repo_sentinal/audit-report.md`

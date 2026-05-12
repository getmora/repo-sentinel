# Repo Sentinel Final Report Prompt

Produce the technical repository audit report and write it to:

- `.repo-sentinel/reports/final/audit-report.md`

The plain-English report for non-technical readers is produced separately from `.repo-sentinel/prompts/non-technical-report.md`.

The technical report must include:

1. Executive summary
2. Overall risk rating
3. Top 10 findings
4. Changes since previous scan
5. Launch blockers
6. Security and privacy concerns
7. Compliance and governance concerns
8. Reliability, correctness, and data-integrity concerns
9. Operability, scalability, and performance concerns
10. Maintainability and developer-experience concerns
11. Team ownership and knowledge-risk concerns
12. Risk synthesis and forecasting
13. 7-day remediation plan
14. 30-day remediation plan
15. Verification plan
16. Guardrails to prevent recurrence

Keep the technical report evidence-backed. Separate scanner evidence from Codex inference. Omit speculative findings that cannot be tied to repository evidence.

When previous scan context exists, classify findings as new, persistent, potentially resolved, or unverified carry-forward. Use "Changes since previous scan" to summarize what changed without repeating unchanged prior analysis in full. If no previous scan context exists, say so.

For any Fallow-backed cleanup finding, state that Fallow output is cleanup-candidate evidence, not deletion proof. Include the context-pass evidence used, the remaining uncertainty, and the verification required before deleting code, exports, dependencies, routes, modules, generated artifacts, or configuration-referenced files.

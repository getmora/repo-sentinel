# Repo Sentinel Final Report Prompt

Produce the final repository audit report and write it to both:

- `.repo-sentinel/reports/final/audit-report.md`
- `.repo_sentinal/audit-report.md`

Create `.repo_sentinal/` if it does not exist.

The report must include:

1. Executive summary
2. Overall risk rating
3. Top 10 findings
4. Launch blockers
5. Security and privacy concerns
6. Compliance and governance concerns
7. Reliability, correctness, and data-integrity concerns
8. Operability, scalability, and performance concerns
9. Maintainability and developer-experience concerns
10. Team ownership and knowledge-risk concerns
11. Risk synthesis and forecasting
12. 7-day remediation plan
13. 30-day remediation plan
14. Verification plan
15. Guardrails to prevent recurrence

Keep the report evidence-backed. Separate scanner evidence from Codex inference. Omit speculative findings that cannot be tied to repository evidence.

For any Fallow-backed cleanup finding, state that Fallow output is cleanup-candidate evidence, not deletion proof. Include the context-pass evidence used, the remaining uncertainty, and the verification required before deleting code, exports, dependencies, routes, modules, generated artifacts, or configuration-referenced files.

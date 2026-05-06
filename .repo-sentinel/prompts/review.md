# Repo Sentinel Main Review Prompt

Use this prompt after scanner normalization has completed and after reading `.repo-sentinel/reports/normalized/index.md`.

Perform a Codex-led engineering review of the repository across these domains:

0. Context and intent
1. Architecture
2. Data and state integrity
3. Correctness
4. Security
5. Privacy
6. Compliance and governance
7. Testing
8. Reliability
9. Performance and scalability
10. Maintainability
11. Developer experience
12. Operability
13. Change risk
14. Launch readiness
15. Team ownership and knowledge risk
16. Risk synthesis and forecasting

Use evidence-first reasoning. Do not invent findings. Do not include generic advice unless it is tied to repository evidence. Clearly distinguish scanner evidence from Codex inference.

When using subagents, split the review into independent domain slices and require each subagent to return only evidence-backed findings for its slice. Merge the subagent outputs in the main agent, remove duplicates, and keep final prioritization in the main agent.

Prioritize findings by severity, confidence, blast radius, and fix difficulty.

Every domain must be represented in the review. If no major issue is found for a domain, include a short "no major issues found" note with the evidence checked.

Each finding must include:

- title
- severity: Critical / High / Medium / Low
- confidence: High / Medium / Low
- domain
- evidence
- affected files
- why it matters
- failure scenario
- recommended fix
- verification step

When evidence is weak, say so and either downgrade confidence or omit the finding.

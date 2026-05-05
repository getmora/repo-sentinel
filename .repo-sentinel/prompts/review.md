# Repo Sentinel Main Review Prompt

Use this prompt after scanner normalization has completed and after reading `.repo-sentinel/reports/normalized/index.md`.

Perform a Codex-led engineering review of the repository across these domains:

1. Architecture
2. Data and state integrity
3. Correctness
4. Security
5. Privacy
6. Testing
7. Reliability
8. Performance
9. Maintainability
10. Developer experience
11. Change risk
12. Launch readiness

Use evidence-first reasoning. Do not invent findings. Do not include generic advice unless it is tied to repository evidence. Clearly distinguish scanner evidence from Codex inference.

When using subagents, split the review into independent domain slices and require each subagent to return only evidence-backed findings for its slice. Merge the subagent outputs in the main agent, remove duplicates, and keep final prioritization in the main agent.

Prioritize findings by severity, confidence, blast radius, and fix difficulty.

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

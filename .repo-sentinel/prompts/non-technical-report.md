# Repo Sentinel Non-Technical Report Prompt

Produce a plain English audit report for non-technical readers and write it to:

- `.repo_sentinal/audit-report.md`

Create `.repo_sentinal/` if it does not exist.

Use the technical report at `.repo-sentinel/reports/final/audit-report.md`, the normalized scanner index, and the evidence-backed findings as inputs.

The report must be easy to scan and must avoid unexplained jargon. If a technical term is necessary, explain it in one short sentence.

The report must include:

1. Status at a glance
2. Overall risk rating in plain English
3. Launch recommendation
4. What changed since the previous scan
5. The most important actions to take next
6. Plain-English issue list
7. Security and privacy issues
8. Reliability and correctness issues
9. Maintainability and delivery-risk issues
10. What can wait
11. 7-day action plan
12. 30-day action plan
13. What to verify after fixes
14. Open questions and coverage gaps

For each issue, include:

- Priority: Must fix before launch / Fix soon / Monitor
- What is wrong
- Why it matters in business or user terms
- What could happen if it is ignored
- Who should look at it, using plain roles such as engineer, product owner, security reviewer, or operations owner
- The next concrete action
- Where to look, using affected files or system areas when known
- Evidence source, clearly marked as scanner evidence, Codex inference, or both
- Previous scan status: new, still present, possibly fixed, still needs checking, or no previous scan available

Rules:

- Use short paragraphs and small tables.
- Start with actions, not background.
- Do not include raw scanner dumps.
- Do not include exploit instructions, secret values, or sensitive data.
- Do not invent issues.
- Do not use generic advice unless it is tied to repository evidence.
- If previous scan context exists, do not repeat unchanged old analysis in full. Say what is new, still present, possibly fixed, or still needs checking.
- If there are no launch blockers, say that clearly.
- If scanners were missing, skipped, or failed, explain that as an audit coverage gap in plain English.
- If a finding is uncertain, say what must be checked before making a decision.
- For Fallow-backed cleanup findings, say these are cleanup candidates, not proof that code is safe to delete.

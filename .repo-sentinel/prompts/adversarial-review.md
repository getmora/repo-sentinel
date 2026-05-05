# Repo Sentinel Adversarial Review Prompt

Challenge the draft findings before the final report is written.

When subagents are available, use an independent adversarial-review subagent for this step. The subagent should not write files; it should return challenges, removals, downgrades, merges, and missing-risk notes for the main agent to adjudicate.

For each finding:

- Check whether the finding is supported by specific repository or scanner evidence.
- Remove weak findings.
- Downgrade exaggerated severity.
- Merge duplicate findings.
- Check whether scanner outputs were misread.
- Identify missing high-risk areas that should be reviewed before launch.

Preserve only findings that are evidence-backed, actionable, and relevant to the audited repository.

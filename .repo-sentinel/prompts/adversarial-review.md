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

For Fallow-backed findings:

- Challenge whether the context pass was sufficient.
- Treat dead-code results as cleanup candidates, not deletion proof.
- Remove or downgrade deletion recommendations that do not account for framework conventions, dynamic imports, public APIs, generated files, build/test tooling, runtime configuration, CLI entrypoints, scheduled jobs, or external integrations.
- Require verification steps before any recommended removal.

Preserve only findings that are evidence-backed, actionable, and relevant to the audited repository.

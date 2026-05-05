# Repo Sentinel

Repo Sentinel performs a structured repository audit by combining local scanner outputs with Codex-led engineering review.

## Tools

Core tools:

- `git`
- `node`
- `semgrep`
- `trivy`
- `gitleaks`

Optional full-audit tools:

- `syft`
- `grype`
- `checkov`
- `jq`

## Install Globally

Run this once to install or update the Codex skill globally.

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash
```

This installs the skill to `~/.codex/skills/repo-sentinel`. Restart Codex after installing or updating the skill.

## Update the Global Skill

Run the same global install command again.

## Install Into an Application Repo

Run this from the root of the application repository you want to audit.

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash -s -- --repo-only
```

This installs or updates the repo-local `.repo-sentinel` audit bundle. Existing generated reports are preserved under:

- `.repo-sentinel/reports/raw/`
- `.repo-sentinel/reports/normalized/`
- `.repo-sentinel/reports/final/`

## Install Options

Install the global skill and repo-local audit bundle together:

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash -s -- --all
```

Install only the repo-local audit bundle:

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash -s -- --repo-only
```

Skip the dependency check:

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash -s -- --repo-only --no-check
```

## Install the Codex Skill Globally

If you already cloned this repository and want to install the skill manually:

```sh
mkdir -p "$HOME/.codex/skills" \
&& rsync -a .repo-sentinel/skill/repo-sentinel/ "$HOME/.codex/skills/repo-sentinel/"
```

## Check Dependencies

```sh
bash .repo-sentinel/scripts/setup.sh --check
```

The check mode prints missing tools and install guidance. It exits successfully even when tools are missing.

To install missing tools on macOS with Homebrew:

```sh
bash .repo-sentinel/scripts/setup.sh --install
```

The setup script does not install anything unless `--install` is passed.

## Run a Quick Audit

```sh
bash .repo-sentinel/scripts/audit.sh --quick
node .repo-sentinel/scripts/normalize.mjs
```

Quick audits run available core scanners only.

## Run a Full Audit

```sh
bash .repo-sentinel/scripts/audit.sh --full
node .repo-sentinel/scripts/normalize.mjs
```

Full audits run available core scanners plus available optional full-audit scanners.

## Invoke the Codex Skill

After global installation, invoke the skill in Codex with:

```text
$repo-sentinel run a quick audit
```

For a full audit:

```text
$repo-sentinel run a full audit
```

The globally installed skill bootstraps the repo-local `.repo-sentinel` audit bundle if the current repository does not already have it.

If the current Codex client does not support slash commands for custom skills, use the `$repo-sentinel` form.

Use this instruction:

```text
Use the repo-sentinel skill to run a quick repository audit and write the final report to .repo-sentinel/reports/final/audit-report.md.
```

For a full audit:

```text
Use the repo-sentinel skill to run a full repository audit and write the final report to .repo-sentinel/reports/final/audit-report.md.
```

When supported by the active Codex environment, the skill uses parallel subagents for independent review slices and an adversarial review pass. The main agent keeps control of final prioritization and writes the report.

## Reports

- Raw scanner output: `.repo-sentinel/reports/raw/`
- Normalized scanner index: `.repo-sentinel/reports/normalized/index.md`
- Final audit report: `.repo-sentinel/reports/final/audit-report.md`

## Files Safe to Commit

Commit the Repo Sentinel scripts, prompts, skill, README, and `.gitignore` entries.

Do not commit generated report output from:

- `.repo-sentinel/reports/raw/`
- `.repo-sentinel/reports/normalized/`
- `.repo-sentinel/reports/final/`

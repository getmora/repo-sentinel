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

## Install Into an Application Repo

Run this from the root of the application repository you want to audit.

```sh
tmp="$(mktemp -d)" && git clone --depth 1 https://github.com/getmora/repo-sentinel "$tmp/repo-sentinel" && bash "$tmp/repo-sentinel/install.sh" && rm -rf "$tmp"
```

This installs or updates the global Codex skill and the repo-local `.repo-sentinel` audit bundle.

## Update an Existing Installation

Run the same command from the application repo root. It refreshes Repo Sentinel files while preserving generated reports under:

- `.repo-sentinel/reports/raw/`
- `.repo-sentinel/reports/normalized/`
- `.repo-sentinel/reports/final/`

## Install Options

Install only the Codex skill:

```sh
tmp="$(mktemp -d)" && git clone --depth 1 https://github.com/getmora/repo-sentinel "$tmp/repo-sentinel" && bash "$tmp/repo-sentinel/install.sh" --global-only && rm -rf "$tmp"
```

Install only the repo-local audit bundle:

```sh
tmp="$(mktemp -d)" && git clone --depth 1 https://github.com/getmora/repo-sentinel "$tmp/repo-sentinel" && bash "$tmp/repo-sentinel/install.sh" --repo-only && rm -rf "$tmp"
```

Skip the dependency check:

```sh
tmp="$(mktemp -d)" && git clone --depth 1 https://github.com/getmora/repo-sentinel "$tmp/repo-sentinel" && bash "$tmp/repo-sentinel/install.sh" --no-check && rm -rf "$tmp"
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

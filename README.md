# Repo Sentinel

Repo Sentinel is a reusable Codex Skill and script bundle for structured repository audits.

It combines local scanner outputs with Codex-led engineering review, including optional parallel review subagents when the active Codex environment supports them.

Quick audits use `semgrep`, `trivy`, and `gitleaks` when available. Full audits also use optional scanners for SBOMs, dependency vulnerabilities, infrastructure-as-code, GitHub Actions, repository security posture, shell scripts, Dockerfiles, and JavaScript/TypeScript codebase health when those tools and matching inputs are present.

## Scanner Coverage

Quick audits run available core scanners:

- `semgrep`
- `trivy`
- `gitleaks`

Full audits also run available optional scanners:

- `syft`
- `grype`
- `checkov`
- `zizmor`
- `osv-scanner`
- `scorecard`
- `shellcheck`
- `hadolint`
- `fallow`

Some full-audit scanners only run when matching inputs exist. `zizmor` runs for GitHub Actions inputs, `shellcheck` runs for shell scripts, `hadolint` runs for Dockerfiles, and `fallow` runs for JavaScript/TypeScript repos with `package.json`.

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

This installs or updates the repo-local `.repo-sentinel` audit bundle and creates `.repo_sentinal/` for the human-facing audit report. Existing generated reports are preserved under:

- `.repo-sentinel/reports/raw/`
- `.repo-sentinel/reports/normalized/`
- `.repo-sentinel/reports/final/`
- `.repo_sentinal/`

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

The setup check prints install guidance for missing tools. On macOS, most tools use Homebrew install commands; `fallow` uses `npm install -g fallow`.

Fallow can also be installed per JavaScript/TypeScript repo:

```sh
npm install --save-dev fallow
```

## Run an Audit

Quick audit:

```sh
bash .repo-sentinel/scripts/audit.sh --quick
node .repo-sentinel/scripts/normalize.mjs
```

Full audit:

```sh
bash .repo-sentinel/scripts/audit.sh --full
node .repo-sentinel/scripts/normalize.mjs
```

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

After an audit, the final report is available at `.repo_sentinal/audit-report.md`.

If the current Codex client does not support slash commands for custom skills, use the `$repo-sentinel` form.

```text
Use the repo-sentinel skill to run a quick repository audit and write the final report to .repo_sentinal/audit-report.md.
```

For a full audit:

```text
Use the repo-sentinel skill to run a full repository audit and write the final report to .repo_sentinal/audit-report.md.
```

## Reports

- Raw scanner output: `.repo-sentinel/reports/raw/`
- Normalized scanner index: `.repo-sentinel/reports/normalized/index.md`
- Internal final audit report: `.repo-sentinel/reports/final/audit-report.md`
- Human-facing audit report: `.repo_sentinal/audit-report.md`

## Audit Domains

Repo Sentinel reviews context and intent, architecture, data and state integrity, correctness, security, privacy, compliance and governance, testing, reliability, performance and scalability, maintainability, developer experience, operability, change risk, launch readiness, team ownership and knowledge risk, and risk synthesis and forecasting.

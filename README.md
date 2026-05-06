# Repo Sentinel

Repo Sentinel is a reusable Codex Skill and script bundle for structured repository audits.

It combines local scanner outputs with Codex-led engineering review, including optional parallel review subagents when the active Codex environment supports them.

Quick audits use `semgrep`, `trivy`, and `gitleaks` when available. Full audits also use optional scanners for SBOMs, dependency vulnerabilities, infrastructure-as-code, GitHub Actions, repository security posture, shell scripts, Dockerfiles, and JavaScript/TypeScript codebase health when those tools and matching inputs are present.

## Scanner Coverage

Quick audits run available core scanners:

- `semgrep`: checks source code for security, correctness, and risky coding patterns.
- `trivy`: checks the filesystem for vulnerable dependencies, misconfigurations, and exposed secrets.
- `gitleaks`: checks the current working tree for leaked tokens, keys, and credentials.

Gitleaks scans the current working tree by default with redacted output and does not scan git history unless explicitly enabled.

Full audits also run available optional scanners:

- `syft`: creates a software bill of materials, which is an inventory of packages in the repo.
- `grype`: checks dependencies for known vulnerabilities.
- `checkov`: checks infrastructure and configuration files for security issues.
- `zizmor`: checks GitHub Actions workflows for security risks.
- `osv-scanner`: checks open source dependencies against OSV vulnerability data.
- `scorecard`: checks repository supply-chain security posture.
- `shellcheck`: checks shell scripts for bugs and unsafe patterns.
- `hadolint`: checks Dockerfiles for container build and security issues.
- `fallow`: checks JavaScript and TypeScript projects for dead code and code health signals.

Some full-audit scanners only run when matching inputs exist. `zizmor` runs for GitHub Actions inputs, `shellcheck` runs for shell scripts, `hadolint` runs for Dockerfiles, and `fallow` runs for JavaScript/TypeScript repos with `package.json`.

## Install Globally

Run this once to install or update the Codex skill globally.

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash
```

This installs the skill to `~/.codex/skills/repo-sentinel`. Restart Codex after installing or updating the skill.

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

## Update the Global Skill

Run the same global install command again.

## Install Into an Application Repo

Run this from the root of the application repository you want to audit.

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash -s -- --all
```

This installs the global skill, installs or updates the repo-local `.repo-sentinel` audit bundle, creates `.repo_sentinal/` for the human-facing audit report, and opens the tool install wizard. Existing generated reports are preserved under:

- `.repo-sentinel/reports/raw/`
- `.repo-sentinel/reports/normalized/`
- `.repo-sentinel/reports/final/`
- `.repo_sentinal/`

Tool installation is wizard-driven. On macOS, selected tools can be installed with Homebrew for most tools and npm for `fallow`. On Linux, the setup script prints install guidance.

After install attempts, Repo Sentinel re-checks the scanner tools and reports any that are still missing.

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

The installer opens the tool install wizard by default after global, repo-local, and combined installs. Use `--no-check` to skip the wizard.

Install mode re-checks scanner availability after install attempts. The wizard reports tools that remain uninstalled without failing unless a selected tool could not be installed.

To choose missing tools interactively:

```sh
bash .repo-sentinel/scripts/setup.sh --wizard
```

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

Full audits run scanners in parallel batches with `REPO_SENTINEL_JOBS=3` by default. The manifest keeps the recommended evidence order: scoped checks first, source and dependency evidence next, then heavier filesystem, repository posture, and secret scanning.

To run scanners sequentially for debugging:

```sh
REPO_SENTINEL_JOBS=1 bash .repo-sentinel/scripts/audit.sh --full
node .repo-sentinel/scripts/normalize.mjs
```

To include git history in Gitleaks secret scanning:

```sh
REPO_SENTINEL_GITLEAKS_HISTORY=1 bash .repo-sentinel/scripts/audit.sh --full
node .repo-sentinel/scripts/normalize.mjs
```

## Reports

- Raw scanner output: `.repo-sentinel/reports/raw/`
- Normalized scanner index: `.repo-sentinel/reports/normalized/index.md`
- Internal final audit report: `.repo-sentinel/reports/final/audit-report.md`
- Human-facing audit report: `.repo_sentinal/audit-report.md`

## Audit Domains

Repo Sentinel reviews context and intent, architecture, data and state integrity, correctness, security, privacy, compliance and governance, testing, reliability, performance and scalability, maintainability, developer experience, operability, change risk, launch readiness, team ownership and knowledge risk, and risk synthesis and forecasting.

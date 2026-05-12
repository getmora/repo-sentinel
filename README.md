# Repo Sentinel

Repo Sentinel is a reusable Codex Skill with a globally installed audit runtime for structured repository audits.

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

The globally installed skill runs its own bundled scripts and prompts against the current repository. Application repos do not need a copied Repo Sentinel runtime.

## Report Outputs

Each audit produces two final reports:

- Plain-English report for non-technical readers: `.repo_sentinal/audit-report.md`
- Technical report for engineering follow-up: `.repo-sentinel/reports/final/audit-report.md`

Before a new audit writes fresh scanner output, Repo Sentinel snapshots the active previous run to:

- Latest previous run: `.repo-sentinel/reports/previous/`
- Older snapshots: `.repo-sentinel/reports/history/<snapshot-id>/`

The normalized index links this previous-run context so repeated audits can mark findings as new, persistent, potentially resolved, or still unverified instead of redoing unchanged analysis.

Start with the plain-English report if you want a scannable action list, launch recommendation, business impact, and owner-style next steps.

If the current Codex client does not support slash commands for custom skills, use the `$repo-sentinel` form.

```text
Use the repo-sentinel skill to run a quick repository audit and write the plain-English report to .repo_sentinal/audit-report.md.
```

For a full audit:

```text
Use the repo-sentinel skill to run a full repository audit and write the plain-English report to .repo_sentinal/audit-report.md.
```

## Update the Global Skill

Run the same global install command again.

## Install Into an Application Repo

Run this from the root of the application repository you want to audit.

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash -s -- --all
```

This installs or updates the global skill runtime, initializes local report folders, creates `.repo_sentinal/` for the plain-English audit report, and opens the tool install wizard. It does not copy scanner scripts or prompts into the application repo. Existing generated reports are preserved under:

- `.repo-sentinel/reports/raw/`
- `.repo-sentinel/reports/normalized/`
- `.repo-sentinel/reports/final/`
- `.repo-sentinel/reports/previous/`
- `.repo-sentinel/reports/history/`
- `.repo_sentinal/`

Tool installation is wizard-driven. On macOS, selected tools can be installed with Homebrew for most tools and npm for `fallow`. On Linux, the setup script prints install guidance.

After install attempts, Repo Sentinel re-checks the scanner tools and reports any that are still missing.

If a repository already has an older `.repo-sentinel` runtime bundle, `--all` removes the old local runtime files while preserving generated reports. The current audit logic comes from the globally installed skill runtime.

## Install Options

Install the global skill and initialize report folders in the current repo:

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash -s -- --all
```

Install the legacy repo-local runtime bundle:

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash -s -- --repo-only
```

Skip the dependency check:

```sh
curl -fsSL https://raw.githubusercontent.com/getmora/repo-sentinel/main/install.sh | bash -s -- --all --no-check
```

## Install the Codex Skill Globally

If you already cloned this repository and want to install the skill manually:

```sh
mkdir -p "$HOME/.codex/skills" \
&& mkdir -p "$HOME/.codex/skills/repo-sentinel" \
&& rsync -a .repo-sentinel/skill/repo-sentinel/ "$HOME/.codex/skills/repo-sentinel/" \
&& rsync -a .repo-sentinel/scripts .repo-sentinel/prompts .repo-sentinel/README.md .repo-sentinel/VERSION "$HOME/.codex/skills/repo-sentinel/"
```

## Check Dependencies

```sh
bash "$HOME/.codex/skills/repo-sentinel/scripts/setup.sh" --check
```

The setup check prints install guidance for missing tools. On macOS, most tools use Homebrew install commands; `fallow` uses `npm install -g fallow`.

The installer opens the tool install wizard by default after global, app-repo initialization, and legacy repo-local installs. Use `--no-check` to skip the wizard.

Install mode re-checks scanner availability after install attempts. The wizard reports tools that remain uninstalled without failing unless a selected tool could not be installed.

To choose missing tools interactively:

```sh
bash "$HOME/.codex/skills/repo-sentinel/scripts/setup.sh" --wizard
```

Fallow can also be installed per JavaScript/TypeScript repo:

```sh
npm install --save-dev fallow
```

## Run an Audit

Quick audit:

```sh
bash "$HOME/.codex/skills/repo-sentinel/scripts/audit.sh" --quick
node "$HOME/.codex/skills/repo-sentinel/scripts/normalize.mjs"
```

Full audit:

```sh
bash "$HOME/.codex/skills/repo-sentinel/scripts/audit.sh" --full
node "$HOME/.codex/skills/repo-sentinel/scripts/normalize.mjs"
```

Full audits run scanners in parallel batches with `REPO_SENTINEL_JOBS=3` by default. The manifest keeps the recommended evidence order: scoped checks first, source and dependency evidence next, then heavier filesystem, repository posture, and secret scanning.

To run scanners sequentially for debugging:

```sh
REPO_SENTINEL_JOBS=1 bash "$HOME/.codex/skills/repo-sentinel/scripts/audit.sh" --full
node "$HOME/.codex/skills/repo-sentinel/scripts/normalize.mjs"
```

To include git history in Gitleaks secret scanning:

```sh
REPO_SENTINEL_GITLEAKS_HISTORY=1 bash "$HOME/.codex/skills/repo-sentinel/scripts/audit.sh" --full
node "$HOME/.codex/skills/repo-sentinel/scripts/normalize.mjs"
```

## Reports

- Raw scanner output: `.repo-sentinel/reports/raw/`
- Normalized scanner index: `.repo-sentinel/reports/normalized/index.md`
- Previous scan snapshot: `.repo-sentinel/reports/previous/`
- Historical scan snapshots: `.repo-sentinel/reports/history/`
- Plain-English audit report: `.repo_sentinal/audit-report.md`
- Technical final audit report: `.repo-sentinel/reports/final/audit-report.md`

## Audit Domains

Repo Sentinel reviews context and intent, architecture, data and state integrity, correctness, security, privacy, compliance and governance, testing, reliability, performance and scalability, maintainability, developer experience, operability, change risk, launch readiness, team ownership and knowledge risk, and risk synthesis and forecasting.

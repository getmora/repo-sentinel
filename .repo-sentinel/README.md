# Repo Sentinel

Repo Sentinel performs a structured repository audit by combining local scanner outputs with Codex-led engineering review.

## Tools

Core tools:

- `git`: reads repository state and history.
- `node`: runs the normalizer that turns raw scanner output into a readable index.
- `semgrep`: checks source code for security, correctness, and risky coding patterns.
- `trivy`: checks the filesystem for vulnerable dependencies, misconfigurations, and exposed secrets.
- `gitleaks`: checks the current working tree for leaked tokens, keys, and credentials.

Gitleaks scans the current working tree by default with redacted output and does not scan git history unless explicitly enabled.

Optional full-audit tools:

- `syft`: creates a software bill of materials, which is an inventory of packages in the repo.
- `grype`: checks dependencies for known vulnerabilities.
- `checkov`: checks infrastructure and configuration files for security issues.
- `jq`: helps inspect JSON scanner output during manual review.
- `zizmor`: checks GitHub Actions workflows for security risks.
- `osv-scanner`: checks open source dependencies against OSV vulnerability data.
- `scorecard`: checks repository supply-chain security posture.
- `shellcheck`: checks shell scripts for bugs and unsafe patterns.
- `hadolint`: checks Dockerfiles for container build and security issues.
- `fallow`: checks JavaScript and TypeScript projects for dead code and code health signals.

Quick audits run available core scanners only. Full audits also run available optional scanners when the tool is installed and matching repository inputs exist.

Input-gated full-audit scanners:

- `zizmor` runs when GitHub Actions inputs exist.
- `shellcheck` runs when shell scripts or shell shebang files exist.
- `hadolint` runs when Dockerfiles exist.
- `fallow` runs when `package.json` exists and either `./node_modules/.bin/fallow` or global `fallow` is available.

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

The check mode prints missing tools and install guidance. It exits successfully even when tools are missing.

To install missing tools on macOS where supported:

```sh
bash .repo-sentinel/scripts/setup.sh --install
```

The installer opens the tool install wizard by default after global, repo-local, and combined installs. Use `--no-check` to skip the wizard.

Install mode re-checks scanner availability after install attempts. The wizard reports tools that remain uninstalled without failing unless a selected tool could not be installed.

To choose missing tools interactively:

```sh
bash .repo-sentinel/scripts/setup.sh --wizard
```

Most macOS installs use Homebrew. Fallow uses `npm install -g fallow`, or it can be installed in a JavaScript/TypeScript repo with:

```sh
npm install --save-dev fallow
```

The setup script does not install anything unless `--install` is passed.

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

Use this instruction:

```text
Use the repo-sentinel skill to run a quick repository audit and write the final report to .repo_sentinal/audit-report.md.
```

For a full audit:

```text
Use the repo-sentinel skill to run a full repository audit and write the final report to .repo_sentinal/audit-report.md.
```

When supported by the active Codex environment, the skill uses parallel subagents for independent review slices and an adversarial review pass. The main agent keeps control of final prioritization and writes the report.

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

Full audits run available core scanners plus available optional full-audit scanners: `syft`, `grype`, `checkov`, `zizmor`, `osv-scanner`, `scorecard`, `shellcheck`, `hadolint`, and `fallow`.

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

## Files Safe to Commit

Commit the Repo Sentinel scripts, prompts, skill, README, and `.gitignore` entries.

Do not commit generated report output from:

- `.repo-sentinel/reports/raw/`
- `.repo-sentinel/reports/normalized/`
- `.repo-sentinel/reports/final/`
- `.repo_sentinal/`

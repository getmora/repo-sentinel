# Repo Sentinel

Repo Sentinel is a reusable Codex Skill and script bundle for structured repository audits.

It combines local scanner outputs with Codex-led engineering review, including optional parallel review subagents when the active Codex environment supports them.

## Install Into an Application Repo

Run this from the root of the application repository you want to audit.

The repository is private, so `gh` must be authenticated with access to `getmora/repo-sentinel`.

```sh
TMP="$(mktemp -d)" \
&& gh repo clone getmora/repo-sentinel "$TMP/repo-sentinel" -- --depth 1 \
&& mkdir -p .repo-sentinel/reports/raw .repo-sentinel/reports/normalized .repo-sentinel/reports/final \
&& rsync -a --delete \
  --exclude 'reports/raw/***' \
  --exclude 'reports/normalized/***' \
  --exclude 'reports/final/***' \
  "$TMP/repo-sentinel/.repo-sentinel/" .repo-sentinel/ \
&& chmod +x .repo-sentinel/scripts/setup.sh .repo-sentinel/scripts/audit.sh .repo-sentinel/scripts/normalize.mjs \
&& touch .gitignore \
&& for line in ".repo-sentinel/reports/raw/" ".repo-sentinel/reports/normalized/" ".repo-sentinel/reports/final/"; do grep -qxF "$line" .gitignore || printf '%s\n' "$line" >> .gitignore; done \
&& rm -rf "$TMP" \
&& bash .repo-sentinel/scripts/setup.sh --check
```

## Update an Existing Installation

Run the same command from the application repo root. It refreshes Repo Sentinel files while preserving generated reports under:

- `.repo-sentinel/reports/raw/`
- `.repo-sentinel/reports/normalized/`
- `.repo-sentinel/reports/final/`

## Install the Codex Skill Globally

If you want Codex to discover the skill outside a repo-local install, run this after cloning or installing Repo Sentinel:

```sh
mkdir -p "$HOME/.codex/skills" \
&& rsync -a .repo-sentinel/skill/repo-sentinel/ "$HOME/.codex/skills/repo-sentinel/"
```

## Check Dependencies

```sh
bash .repo-sentinel/scripts/setup.sh --check
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

```text
Use the repo-sentinel skill to run a quick repository audit and write the final report to .repo-sentinel/reports/final/audit-report.md.
```

For a full audit:

```text
Use the repo-sentinel skill to run a full repository audit and write the final report to .repo-sentinel/reports/final/audit-report.md.
```

## Reports

- Raw scanner output: `.repo-sentinel/reports/raw/`
- Normalized scanner index: `.repo-sentinel/reports/normalized/index.md`
- Final audit report: `.repo-sentinel/reports/final/audit-report.md`

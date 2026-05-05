#!/usr/bin/env bash
set -u

REPO="getmora/repo-sentinel"
REPO_URL="https://github.com/$REPO.git"
REF="${REPO_SENTINEL_REF:-main}"
CODEX_SKILLS_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
SKILL_DEST="$CODEX_SKILLS_DIR/repo-sentinel"
MODE="all"
RUN_CHECK=1

usage() {
  cat <<'EOF'
Usage: install.sh [--all|--repo-only|--global-only] [--no-check]

Installs or updates Repo Sentinel.

  --all          Install the Codex skill and repo-local audit bundle. Default.
  --repo-only    Install only .repo-sentinel into the current repository.
  --global-only  Install only the Codex skill into ~/.codex/skills.
  --no-check     Skip dependency check after repo-local install.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --all) MODE="all" ;;
    --repo-only) MODE="repo-only" ;;
    --global-only) MODE="global-only" ;;
    --no-check) RUN_CHECK=0 ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
  shift
done

if ! command -v git >/dev/null 2>&1; then
  echo "Missing git. Install git and rerun this installer."
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "Missing rsync. Install rsync and rerun this installer."
  exit 1
fi

work_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

echo "Fetching $REPO..."
if ! git clone --depth 1 --branch "$REF" "$REPO_URL" "$work_dir/repo-sentinel" >/dev/null 2>&1; then
  echo "Could not clone $REPO at ref $REF."
  echo "Check that the repository is reachable and that git can access it."
  exit 1
fi

source_dir="$work_dir/repo-sentinel"

install_global_skill() {
  echo "Installing Codex skill to $SKILL_DEST..."
  mkdir -p "$CODEX_SKILLS_DIR"
  rm -rf "$SKILL_DEST"
  rsync -a "$source_dir/.repo-sentinel/skill/repo-sentinel/" "$SKILL_DEST/"
}

install_repo_bundle() {
  echo "Installing repo-local bundle to $(pwd)/.repo-sentinel..."
  mkdir -p .repo-sentinel
  rm -rf .repo-sentinel/scripts .repo-sentinel/prompts .repo-sentinel/skill .repo-sentinel/README.md
  rsync -a "$source_dir/.repo-sentinel/README.md" .repo-sentinel/
  rsync -a "$source_dir/.repo-sentinel/scripts" .repo-sentinel/
  rsync -a "$source_dir/.repo-sentinel/prompts" .repo-sentinel/
  rsync -a "$source_dir/.repo-sentinel/skill" .repo-sentinel/
  mkdir -p .repo-sentinel/reports/raw .repo-sentinel/reports/normalized .repo-sentinel/reports/final
  chmod +x .repo-sentinel/scripts/setup.sh .repo-sentinel/scripts/audit.sh .repo-sentinel/scripts/normalize.mjs

  touch .gitignore
  for line in ".repo-sentinel/reports/raw/" ".repo-sentinel/reports/normalized/" ".repo-sentinel/reports/final/"; do
    grep -qxF "$line" .gitignore || printf '%s\n' "$line" >> .gitignore
  done

  if [ "$RUN_CHECK" -eq 1 ]; then
    bash .repo-sentinel/scripts/setup.sh --check
  fi
}

case "$MODE" in
  all)
    install_global_skill
    install_repo_bundle
    ;;
  repo-only)
    install_repo_bundle
    ;;
  global-only)
    install_global_skill
    ;;
esac

echo "Repo Sentinel install complete."
echo "Restart Codex to pick up newly installed or updated skills."

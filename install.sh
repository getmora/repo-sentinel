#!/usr/bin/env bash
set -u

REPO="getmora/repo-sentinel"
REPO_URL="https://github.com/$REPO.git"
REF="${REPO_SENTINEL_REF:-main}"
CODEX_SKILLS_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
SKILL_DEST="$CODEX_SKILLS_DIR/repo-sentinel"
MODE="global-only"
RUN_CHECK=1

usage() {
  cat <<'EOF'
Usage: install.sh [--all|--repo-only|--global-only] [--install-tools] [--no-check]

Installs or updates Repo Sentinel.

  --global-only  Install only the Codex skill into ~/.codex/skills. Default.
  --all          Install the Codex skill and initialize report folders in this repository.
  --repo-only    Install the legacy repo-local runtime bundle into this repository.
  --install-tools Run the install wizard. This is now the default.
  --no-check     Skip the dependency wizard after install.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --all) MODE="all" ;;
    --repo-only) MODE="repo-only" ;;
    --global-only) MODE="global-only" ;;
    --install-tools) ;;
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

source_dir=""
script_path="${BASH_SOURCE[0]:-}"
if [ -n "$script_path" ] && [ -f "$script_path" ]; then
  script_dir="$(cd "$(dirname "$script_path")" && pwd)"
  if [ -d "$script_dir/.repo-sentinel" ]; then
    source_dir="$script_dir"
  fi
fi

if [ -z "$source_dir" ]; then
  echo "Fetching $REPO..."
  if ! git clone --depth 1 --branch "$REF" "$REPO_URL" "$work_dir/repo-sentinel" >/dev/null 2>&1; then
    echo "Could not clone $REPO at ref $REF."
    echo "Check that the repository is reachable and that git can access it."
    exit 1
  fi
  source_dir="$work_dir/repo-sentinel"
fi

install_global_skill() {
  echo "Installing Codex skill to $SKILL_DEST..."
  mkdir -p "$CODEX_SKILLS_DIR"
  rm -rf "$SKILL_DEST"
  mkdir -p "$SKILL_DEST"
  rsync -a "$source_dir/.repo-sentinel/skill/repo-sentinel/" "$SKILL_DEST/"
  rsync -a "$source_dir/.repo-sentinel/README.md" "$SKILL_DEST/"
  rsync -a "$source_dir/.repo-sentinel/VERSION" "$SKILL_DEST/"
  rsync -a "$source_dir/.repo-sentinel/scripts" "$SKILL_DEST/"
  rsync -a "$source_dir/.repo-sentinel/prompts" "$SKILL_DEST/"
  chmod +x "$SKILL_DEST/scripts/setup.sh" "$SKILL_DEST/scripts/audit.sh" "$SKILL_DEST/scripts/normalize.mjs"
}

ensure_repo_outputs() {
  echo "Initializing Repo Sentinel report folders in $(pwd)..."
  mkdir -p .repo-sentinel
  rm -rf .repo-sentinel/scripts .repo-sentinel/prompts .repo-sentinel/skill .repo-sentinel/README.md .repo-sentinel/VERSION
  mkdir -p .repo-sentinel/reports/raw .repo-sentinel/reports/normalized .repo-sentinel/reports/final .repo_sentinal

  touch .gitignore
  for line in ".repo-sentinel/reports/raw/" ".repo-sentinel/reports/normalized/" ".repo-sentinel/reports/final/" ".repo_sentinal/"; do
    grep -qxF "$line" .gitignore || printf '%s\n' "$line" >> .gitignore
  done
}

install_repo_bundle() {
  echo "Installing legacy repo-local runtime bundle to $(pwd)/.repo-sentinel..."
  mkdir -p .repo-sentinel
  rm -rf .repo-sentinel/scripts .repo-sentinel/prompts .repo-sentinel/skill .repo-sentinel/README.md .repo-sentinel/VERSION
  rsync -a "$source_dir/.repo-sentinel/README.md" .repo-sentinel/
  rsync -a "$source_dir/.repo-sentinel/VERSION" .repo-sentinel/
  rsync -a "$source_dir/.repo-sentinel/scripts" .repo-sentinel/
  rsync -a "$source_dir/.repo-sentinel/prompts" .repo-sentinel/
  rsync -a "$source_dir/.repo-sentinel/skill" .repo-sentinel/
  mkdir -p .repo-sentinel/reports/raw .repo-sentinel/reports/normalized .repo-sentinel/reports/final .repo_sentinal
  chmod +x .repo-sentinel/scripts/setup.sh .repo-sentinel/scripts/audit.sh .repo-sentinel/scripts/normalize.mjs

  touch .gitignore
  for line in ".repo-sentinel/reports/raw/" ".repo-sentinel/reports/normalized/" ".repo-sentinel/reports/final/" ".repo_sentinal/"; do
    grep -qxF "$line" .gitignore || printf '%s\n' "$line" >> .gitignore
  done

}

setup_script_path() {
  if [ "$MODE" = "repo-only" ] && [ -x ".repo-sentinel/scripts/setup.sh" ]; then
    printf '%s\n' ".repo-sentinel/scripts/setup.sh"
  elif [ -x "$SKILL_DEST/scripts/setup.sh" ]; then
    printf '%s\n' "$SKILL_DEST/scripts/setup.sh"
  elif [ -x ".repo-sentinel/scripts/setup.sh" ]; then
    printf '%s\n' ".repo-sentinel/scripts/setup.sh"
  else
    printf '%s\n' "$source_dir/.repo-sentinel/scripts/setup.sh"
  fi
}

run_dependency_wizard() {
  local setup_script
  setup_script="$(setup_script_path)"
  if [ -r /dev/tty ] && [ -t 1 ]; then
    bash "$setup_script" --wizard < /dev/tty
  else
    echo "No interactive terminal detected; running dependency check instead of install wizard."
    bash "$setup_script" --check
  fi
}

case "$MODE" in
  all)
    install_global_skill
    ensure_repo_outputs
    ;;
  repo-only)
    install_repo_bundle
    ;;
  global-only)
    install_global_skill
    ;;
esac

if [ "$RUN_CHECK" -eq 1 ]; then
  run_dependency_wizard
fi

echo "Repo Sentinel install complete."
echo "Restart Codex to pick up newly installed or updated skills."

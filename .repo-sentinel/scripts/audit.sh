#!/usr/bin/env bash
set -u

RAW_DIR=".repo-sentinel/reports/raw"
NORMALIZED_DIR=".repo-sentinel/reports/normalized"
FINAL_DIR=".repo-sentinel/reports/final"
USER_REPORT_DIR=".repo_sentinal"
MODE="${1:---quick}"
JOBS="${REPO_SENTINEL_JOBS:-3}"

usage() {
  cat <<'EOF'
Usage: audit.sh [--quick|--full]

  --quick  Run core scanners that are installed. This is the default.
  --full   Run core scanners and optional full-audit scanners that are installed.

Environment:
  REPO_SENTINEL_JOBS  Maximum scanner jobs to run at once. Default: 3.
EOF
}

case "$MODE" in
  --quick|--full) ;;
  -h|--help) usage; exit 0 ;;
  *) usage; exit 2 ;;
esac

mkdir -p "$RAW_DIR" "$NORMALIZED_DIR" "$FINAL_DIR" "$USER_REPORT_DIR"

manifest_tmp="$RAW_DIR/run-manifest.tmp"
manifest_entries_dir="$RAW_DIR/run-manifest.entries"
manifest="$RAW_DIR/run-manifest.json"
: > "$manifest_tmp"
rm -rf "$manifest_entries_dir"
mkdir -p "$manifest_entries_dir"
started_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

case "$JOBS" in
  ''|*[!0-9]*) JOBS=3 ;;
esac
if [ "$JOBS" -lt 1 ]; then
  JOBS=1
fi

json_escape() {
  printf '%s' "$1" | node -e 'let data=""; process.stdin.on("data", c => data += c); process.stdin.on("end", () => process.stdout.write(JSON.stringify(data)));'
}

record() {
  local name="$1"
  local status="$2"
  local exit_code="$3"
  local output="$4"
  local command_text="$5"
  local target="${REPO_SENTINEL_MANIFEST_ENTRY:-}"
  if [ -n "$target" ]; then
    printf '{"name": %s, "status": %s, "exitCode": %s, "output": %s, "command": %s}\n' \
      "$(json_escape "$name")" \
      "$(json_escape "$status")" \
      "$exit_code" \
      "$(json_escape "$output")" \
      "$(json_escape "$command_text")" > "$target"
    return 0
  fi

  local comma=""
  if [ -s "$manifest_tmp" ]; then
    comma=","
  fi
  {
    printf '%s\n' "$comma"
    printf '    {"name": %s, "status": %s, "exitCode": %s, "output": %s, "command": %s}' \
      "$(json_escape "$name")" \
      "$(json_escape "$status")" \
      "$exit_code" \
      "$(json_escape "$output")" \
      "$(json_escape "$command_text")"
  } >> "$manifest_tmp"
}

run_scanner() {
  local name="$1"
  local tool="$2"
  local output="$3"
  shift 3

  local command_text="$*"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Skipping $name: $tool is not installed."
    record "$name" "missing" 127 "$output" "$command_text"
    return 0
  fi

  echo "Running $name..."
  "$@"
  local exit_code=$?
  if [ "$exit_code" -eq 0 ]; then
    record "$name" "ok" "$exit_code" "$output" "$command_text"
  else
    echo "$name failed with exit code $exit_code. Continuing."
    record "$name" "failed" "$exit_code" "$output" "$command_text"
  fi
  return 0
}

zizmor_has_findings() {
  local output="$1"
  [ -s "$output" ] || return 1
  node - "$output" <<'NODE'
const fs = require("node:fs");
const output = process.argv[2];
try {
  const data = JSON.parse(fs.readFileSync(output, "utf8"));
  const findings = Array.isArray(data) ? data : data?.findings;
  process.exit(Array.isArray(findings) && findings.length > 0 ? 0 : 1);
} catch {
  process.exit(1);
}
NODE
}

zizmor_findings_exit_code() {
  case "$1" in
    11|12|13|14) return 0 ;;
    *) return 1 ;;
  esac
}

run_zizmor_scanner() {
  local output="$1"
  local command_text="zizmor --format=json-v1 . > '$output'"

  if ! command -v zizmor >/dev/null 2>&1; then
    echo "Skipping zizmor: zizmor is not installed."
    record "zizmor" "missing" 127 "$output" "$command_text"
    return 0
  fi

  echo "Running zizmor..."
  sh -c "$command_text"
  local exit_code=$?
  if [ "$exit_code" -eq 0 ]; then
    record "zizmor" "ok" "$exit_code" "$output" "$command_text"
  elif zizmor_findings_exit_code "$exit_code" && zizmor_has_findings "$output"; then
    echo "zizmor exited with code $exit_code after producing findings. Continuing."
    record "zizmor" "completed_with_findings" "$exit_code" "$output" "$command_text"
  else
    echo "zizmor failed with exit code $exit_code. Continuing."
    record "zizmor" "failed" "$exit_code" "$output" "$command_text"
  fi
  return 0
}

record_skipped() {
  local name="$1"
  local output="$2"
  local command_text="$3"
  local placeholder="$4"

  printf '%s\n' "$placeholder" > "$output"
  echo "Skipping $name: no matching input files found."
  record "$name" "skipped" 0 "$output" "$command_text"
}

has_github_actions_input() {
  [ -d ".github" ] || [ -f "action.yml" ] || [ -f "action.yaml" ]
}

has_shellcheck_input() {
  list_shellcheck_files | grep -q .
}

has_hadolint_input() {
  list_hadolint_files | grep -q .
}

has_fallow_input() {
  [ -f "package.json" ]
}

fallow_command() {
  if [ -x "./node_modules/.bin/fallow" ]; then
    printf '%s\n' "./node_modules/.bin/fallow"
    return 0
  fi
  if command -v fallow >/dev/null 2>&1; then
    command -v fallow
    return 0
  fi
  return 1
}

list_shellcheck_files() {
  find . \
    \( -path "./.git" -o -path "./.repo-sentinel/reports" -o -path "./.repo_sentinal" -o -path "./node_modules" \) -prune \
    -o -type f -print0 | while IFS= read -r -d '' file; do
      case "$file" in
        *.sh|*.bash|*.zsh|*.ksh)
          printf '%s\n' "$file"
          continue
          ;;
      esac
      IFS= read -r first_line < "$file" || first_line=""
      case "$first_line" in
        "#!"*"sh"*|"#!"*"bash"*|"#!"*"zsh"*|"#!"*"ksh"*) printf '%s\n' "$file" ;;
      esac
    done
}

list_hadolint_files() {
  find . \
    \( -path "./.git" -o -path "./.repo-sentinel/reports" -o -path "./.repo_sentinal" -o -path "./node_modules" \) -prune \
    -o -type f \( -name "Dockerfile" -o -name "Dockerfile.*" \) -print
}

run_shellcheck_scan() {
  local output="$1"
  local batch_dir
  local batch
  local exit_code=0
  batch_dir="$(mktemp -d "$RAW_DIR/shellcheck.XXXXXX")"
  batch=0

  while IFS= read -r file; do
    batch=$((batch + 1))
    shellcheck -f json "$file" > "$batch_dir/$batch.json" || exit_code=1
  done < <(list_shellcheck_files)

  node - "$output" "$batch_dir" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const output = process.argv[2];
const batchDir = process.argv[3];
const comments = [];
for (const fileName of fs.readdirSync(batchDir).filter((name) => name.endsWith(".json")).sort()) {
  const text = fs.readFileSync(path.join(batchDir, fileName), "utf8").trim();
  if (text === "") continue;
  const data = JSON.parse(text);
  if (Array.isArray(data.comments)) comments.push(...data.comments);
}
fs.writeFileSync(output, `${JSON.stringify({ comments }, null, 2)}\n`);
NODE
  local merge_exit=$?
  rm -rf "$batch_dir"
  if [ "$merge_exit" -ne 0 ]; then
    return "$merge_exit"
  fi
  return "$exit_code"
}

run_hadolint_scan() {
  local output="$1"
  local batch_dir
  local batch
  local exit_code=0
  batch_dir="$(mktemp -d "$RAW_DIR/hadolint.XXXXXX")"
  batch=0

  while IFS= read -r file; do
    batch=$((batch + 1))
    hadolint --format json "$file" > "$batch_dir/$batch.json" || exit_code=1
  done < <(list_hadolint_files)

  node - "$output" "$batch_dir" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const output = process.argv[2];
const batchDir = process.argv[3];
const findings = [];
for (const fileName of fs.readdirSync(batchDir).filter((name) => name.endsWith(".json")).sort()) {
  const text = fs.readFileSync(path.join(batchDir, fileName), "utf8").trim();
  if (text === "") continue;
  const data = JSON.parse(text);
  if (Array.isArray(data)) findings.push(...data);
}
fs.writeFileSync(output, `${JSON.stringify(findings, null, 2)}\n`);
NODE
  local merge_exit=$?
  rm -rf "$batch_dir"
  if [ "$merge_exit" -ne 0 ]; then
    return "$merge_exit"
  fi
  return "$exit_code"
}

run_fallow_scan() {
  local output="$1"
  local fallow_bin
  fallow_bin="$(fallow_command)" || return 127
  "$fallow_bin" --format json > "$output"
}

scanner_semgrep() {
  run_scanner "semgrep" "semgrep" "$RAW_DIR/semgrep.json" \
    semgrep scan --config auto --json --output "$RAW_DIR/semgrep.json"
}

scanner_trivy_fs() {
  run_scanner "trivy-fs" "trivy" "$RAW_DIR/trivy-fs.json" \
    trivy fs --format json --output "$RAW_DIR/trivy-fs.json" .
}

scanner_gitleaks() {
  if [ "${REPO_SENTINEL_GITLEAKS_HISTORY:-0}" = "1" ]; then
    run_scanner "gitleaks" "gitleaks" "$RAW_DIR/gitleaks.json" \
      gitleaks detect --source . --report-format json --report-path "$RAW_DIR/gitleaks.json" --redact --exit-code 0
  else
    run_scanner "gitleaks" "gitleaks" "$RAW_DIR/gitleaks.json" \
      gitleaks detect --source . --no-git --report-format json --report-path "$RAW_DIR/gitleaks.json" --redact --exit-code 0
  fi
}

scanner_syft() {
  run_scanner "syft" "syft" "$RAW_DIR/syft.json" \
    sh -c "syft . -o json > '$RAW_DIR/syft.json'"
}

scanner_grype() {
  run_scanner "grype" "grype" "$RAW_DIR/grype.json" \
    sh -c "grype . -o json > '$RAW_DIR/grype.json'"
}

scanner_checkov() {
  run_scanner "checkov" "checkov" "$RAW_DIR/checkov.json" \
    sh -c "checkov -d . -o json > '$RAW_DIR/checkov.json'"
}

scanner_zizmor() {
  if has_github_actions_input; then
    run_zizmor_scanner "$RAW_DIR/zizmor.json"
  else
    record_skipped "zizmor" "$RAW_DIR/zizmor.json" "zizmor --format=json-v1 . > '$RAW_DIR/zizmor.json'" "[]"
  fi
}

scanner_osv_scanner() {
  run_scanner "osv-scanner" "osv-scanner" "$RAW_DIR/osv-scanner.json" \
    sh -c "osv-scanner scan --format json . > '$RAW_DIR/osv-scanner.json'"
}

scanner_scorecard() {
  run_scanner "scorecard" "scorecard" "$RAW_DIR/scorecard.json" \
    scorecard --local=. --format=json --output "$RAW_DIR/scorecard.json"
}

scanner_shellcheck() {
  if has_shellcheck_input; then
    run_scanner "shellcheck" "shellcheck" "$RAW_DIR/shellcheck.json" \
      run_shellcheck_scan "$RAW_DIR/shellcheck.json"
  else
    record_skipped "shellcheck" "$RAW_DIR/shellcheck.json" "shellcheck -f json <shell-files>" '{"comments":[]}'
  fi
}

scanner_hadolint() {
  if has_hadolint_input; then
    run_scanner "hadolint" "hadolint" "$RAW_DIR/hadolint.json" \
      run_hadolint_scan "$RAW_DIR/hadolint.json"
  else
    record_skipped "hadolint" "$RAW_DIR/hadolint.json" "hadolint --format json <dockerfiles>" "[]"
  fi
}

scanner_fallow() {
  if has_fallow_input; then
    if fallow_command >/dev/null; then
      run_scanner "fallow" "node" "$RAW_DIR/fallow.json" \
        run_fallow_scan "$RAW_DIR/fallow.json"
    else
      echo "Skipping fallow: fallow is not installed."
      record "fallow" "missing" 127 "$RAW_DIR/fallow.json" "fallow --format json > '$RAW_DIR/fallow.json'"
    fi
  else
    record_skipped "fallow" "$RAW_DIR/fallow.json" "fallow --format json > '$RAW_DIR/fallow.json'" "{}"
  fi
}

running_pids=""
running_count=0
scanner_index=0

wait_for_scanner_jobs() {
  local pid
  for pid in $running_pids; do
    wait "$pid" || true
  done
  running_pids=""
  running_count=0
}

start_scanner_job() {
  local name="$1"
  local function_name="$2"
  local entry_file
  scanner_index=$((scanner_index + 1))
  entry_file="$(printf '%s/%03d-%s.json' "$manifest_entries_dir" "$scanner_index" "$name")"

  if [ "$JOBS" -eq 1 ]; then
    REPO_SENTINEL_MANIFEST_ENTRY="$entry_file" "$function_name"
    return 0
  fi

  (
    REPO_SENTINEL_MANIFEST_ENTRY="$entry_file"
    "$function_name"
  ) &
  running_pids="$running_pids $!"
  running_count=$((running_count + 1))
  if [ "$running_count" -ge "$JOBS" ]; then
    wait_for_scanner_jobs
  fi
}

run_scanner_group() {
  while [ "$#" -gt 0 ]; do
    start_scanner_job "$1" "$2"
    shift 2
  done
  wait_for_scanner_jobs
}

if [ "$MODE" = "--quick" ]; then
  run_scanner_group \
    "semgrep" "scanner_semgrep" \
    "trivy-fs" "scanner_trivy_fs" \
    "gitleaks" "scanner_gitleaks"
else
  run_scanner_group \
    "shellcheck" "scanner_shellcheck" \
    "hadolint" "scanner_hadolint" \
    "zizmor" "scanner_zizmor" \
    "checkov" "scanner_checkov"

  run_scanner_group \
    "semgrep" "scanner_semgrep" \
    "syft" "scanner_syft" \
    "osv-scanner" "scanner_osv_scanner" \
    "fallow" "scanner_fallow"

  run_scanner_group \
    "trivy-fs" "scanner_trivy_fs" \
    "grype" "scanner_grype" \
    "scorecard" "scanner_scorecard" \
    "gitleaks" "scanner_gitleaks"
fi

append_manifest_entries() {
  local entry_file
  local first=1
  for entry_file in "$manifest_entries_dir"/*.json; do
    [ -e "$entry_file" ] || continue
    [ -s "$entry_file" ] || continue
    if [ "$first" -eq 0 ]; then
      printf ',\n'
    fi
    printf '    '
    cat "$entry_file"
    first=0
  done
}

{
  printf '{\n'
  printf '  "mode": %s,\n' "$(json_escape "$MODE")"
  printf '  "startedAt": %s,\n' "$(json_escape "$started_at")"
  printf '  "scanners": [\n'
  append_manifest_entries
  printf '\n  ]\n'
  printf '}\n'
} > "$manifest"

rm -f "$manifest_tmp"
rm -rf "$manifest_entries_dir"
echo "Wrote $manifest"

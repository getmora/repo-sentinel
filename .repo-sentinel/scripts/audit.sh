#!/usr/bin/env bash
set -u

RAW_DIR=".repo-sentinel/reports/raw"
NORMALIZED_DIR=".repo-sentinel/reports/normalized"
FINAL_DIR=".repo-sentinel/reports/final"
MODE="${1:---quick}"

usage() {
  cat <<'EOF'
Usage: audit.sh [--quick|--full]

  --quick  Run core scanners that are installed. This is the default.
  --full   Run core scanners and optional full-audit scanners that are installed.
EOF
}

case "$MODE" in
  --quick|--full) ;;
  -h|--help) usage; exit 0 ;;
  *) usage; exit 2 ;;
esac

mkdir -p "$RAW_DIR" "$NORMALIZED_DIR" "$FINAL_DIR"

manifest_tmp="$RAW_DIR/run-manifest.tmp"
manifest="$RAW_DIR/run-manifest.json"
: > "$manifest_tmp"
started_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

json_escape() {
  printf '%s' "$1" | node -e 'let data=""; process.stdin.on("data", c => data += c); process.stdin.on("end", () => process.stdout.write(JSON.stringify(data)));'
}

record() {
  local name="$1"
  local status="$2"
  local exit_code="$3"
  local output="$4"
  local command_text="$5"
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

run_scanner "semgrep" "semgrep" "$RAW_DIR/semgrep.json" \
  semgrep scan --config auto --json --output "$RAW_DIR/semgrep.json"

run_scanner "trivy-fs" "trivy" "$RAW_DIR/trivy-fs.json" \
  trivy fs --format json --output "$RAW_DIR/trivy-fs.json" .

run_scanner "gitleaks" "gitleaks" "$RAW_DIR/gitleaks.json" \
  gitleaks detect --source . --report-format json --report-path "$RAW_DIR/gitleaks.json"

if [ "$MODE" = "--full" ]; then
  run_scanner "syft" "syft" "$RAW_DIR/syft.json" \
    sh -c "syft . -o json > '$RAW_DIR/syft.json'"

  run_scanner "grype" "grype" "$RAW_DIR/grype.json" \
    sh -c "grype . -o json > '$RAW_DIR/grype.json'"

  run_scanner "checkov" "checkov" "$RAW_DIR/checkov.json" \
    sh -c "checkov -d . -o json > '$RAW_DIR/checkov.json'"
fi

{
  printf '{\n'
  printf '  "mode": %s,\n' "$(json_escape "$MODE")"
  printf '  "startedAt": %s,\n' "$(json_escape "$started_at")"
  printf '  "scanners": [\n'
  cat "$manifest_tmp"
  printf '\n  ]\n'
  printf '}\n'
} > "$manifest"

rm -f "$manifest_tmp"
echo "Wrote $manifest"

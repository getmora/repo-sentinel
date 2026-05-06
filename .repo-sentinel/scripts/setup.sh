#!/usr/bin/env bash
set -u

CORE_TOOLS=(git node semgrep trivy gitleaks)
OPTIONAL_TOOLS=(syft grype checkov jq zizmor osv-scanner scorecard shellcheck hadolint fallow)

usage() {
  cat <<'EOF'
Usage: setup.sh --check | --install

  --check    Check required and optional tool availability.
  --install  Install missing tools where supported.
EOF
}

command_for() {
  case "$1" in
    git) echo "brew install git" ;;
    node) echo "brew install node" ;;
    semgrep) echo "brew install semgrep" ;;
    trivy) echo "brew install trivy" ;;
    gitleaks) echo "brew install gitleaks" ;;
    syft) echo "brew install syft" ;;
    grype) echo "brew install grype" ;;
    checkov) echo "brew install checkov" ;;
    jq) echo "brew install jq" ;;
    zizmor) echo "brew install zizmor" ;;
    osv-scanner) echo "brew install osv-scanner" ;;
    scorecard) echo "brew install scorecard" ;;
    shellcheck) echo "brew install shellcheck" ;;
    hadolint) echo "brew install hadolint" ;;
    fallow) echo "npm install -g fallow" ;;
    *) echo "brew install $1" ;;
  esac
}

linux_guidance() {
  case "$1" in
    git|node|jq) echo "Install with your system package manager, for example apt, dnf, yum, pacman, or zypper." ;;
    semgrep) echo "Install with pipx install semgrep, pip install semgrep, or your distribution package manager." ;;
    trivy) echo "Install from https://aquasecurity.github.io/trivy/latest/getting-started/installation/ or your distribution package manager." ;;
    gitleaks) echo "Install from https://github.com/gitleaks/gitleaks/releases or your distribution package manager." ;;
    syft) echo "Install from https://github.com/anchore/syft/releases or your distribution package manager." ;;
    grype) echo "Install from https://github.com/anchore/grype/releases or your distribution package manager." ;;
    checkov) echo "Install with pipx install checkov, pip install checkov, or your distribution package manager." ;;
    zizmor) echo "Install from https://docs.zizmor.sh/installation/ or your distribution package manager." ;;
    osv-scanner) echo "Install from https://google.github.io/osv-scanner/installation/ or your distribution package manager." ;;
    scorecard) echo "Install from https://github.com/ossf/scorecard/releases or your distribution package manager." ;;
    shellcheck) echo "Install from https://www.shellcheck.net/ or your distribution package manager." ;;
    hadolint) echo "Install from https://github.com/hadolint/hadolint/releases or your distribution package manager." ;;
    fallow) echo "Install with npm install -g fallow, or add it to a JS/TS repo with npm install --save-dev fallow." ;;
    *) echo "Install with your system package manager." ;;
  esac
}

install_macos_tool() {
  case "$1" in
    fallow)
      if ! command -v npm >/dev/null 2>&1; then
        echo "npm is not installed. Install Node.js/npm first, then rerun this script."
        return 1
      fi
      npm install -g fallow
      ;;
    *)
      brew install "$1"
      ;;
  esac
}

mode="${1:---check}"
case "$mode" in
  --check|--install) ;;
  -h|--help) usage; exit 0 ;;
  *) usage; exit 2 ;;
esac

os="$(uname -s 2>/dev/null || echo unknown)"
missing=()

check_group() {
  local label="$1"
  shift
  echo "$label tools:"
  for tool in "$@"; do
    if tool_available "$tool"; then
      printf '  [ok]      %s\n' "$tool"
    else
      printf '  [missing] %s\n' "$tool"
      missing+=("$tool")
    fi
  done
}

tool_available() {
  case "$1" in
    fallow)
      [ -x "./node_modules/.bin/fallow" ] || command -v fallow >/dev/null 2>&1
      ;;
    *)
      command -v "$1" >/dev/null 2>&1
      ;;
  esac
}

check_group "Core" "${CORE_TOOLS[@]}"
check_group "Optional" "${OPTIONAL_TOOLS[@]}"

if [ "${#missing[@]}" -gt 0 ]; then
  echo
  echo "Install guidance:"
  for tool in "${missing[@]}"; do
    if [ "$os" = "Darwin" ]; then
      printf '  %s: %s\n' "$tool" "$(command_for "$tool")"
    else
      printf '  %s: %s\n' "$tool" "$(linux_guidance "$tool")"
    fi
  done
fi

if [ "$mode" = "--install" ]; then
  if [ "${#missing[@]}" -eq 0 ]; then
    echo "All checked tools are installed."
    exit 0
  fi

  if [ "$os" = "Darwin" ]; then
    if ! command -v brew >/dev/null 2>&1; then
      echo "Homebrew is not installed. Install Homebrew first, then rerun this script."
      exit 1
    fi
    for tool in "${missing[@]}"; do
      install_macos_tool "$tool" || true
    done
  else
    echo "--install is only automated on macOS with Homebrew."
    echo "Use the install guidance above for this platform."
    exit 1
  fi
fi

exit 0

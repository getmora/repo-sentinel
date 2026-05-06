import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const auditScript = path.join(repoRoot, ".repo-sentinel/scripts/audit.sh");

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

function writeCoreScannerStubs(binDir) {
  writeExecutable(path.join(binDir, "semgrep"), `#!/usr/bin/env sh
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output" ]; then shift; printf '{"results":[]}\n' > "$1"; exit 0; fi
  shift
done
`);
  writeExecutable(path.join(binDir, "trivy"), `#!/usr/bin/env sh
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output" ]; then shift; printf '{"Results":[]}\n' > "$1"; exit 0; fi
  shift
done
`);
  writeExecutable(path.join(binDir, "gitleaks"), `#!/usr/bin/env sh
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--report-path" ]; then shift; printf '[]\n' > "$1"; exit 0; fi
  shift
done
`);
  for (const tool of ["syft", "grype", "checkov", "osv-scanner"]) {
    writeExecutable(path.join(binDir, tool), "#!/usr/bin/env sh\nprintf '{}\\n'\n");
  }
  writeExecutable(path.join(binDir, "scorecard"), `#!/usr/bin/env sh
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output" ]; then shift; printf '{"score":10,"checks":[]}\n' > "$1"; exit 0; fi
  shift
done
`);
}

function createAuditWorkspace() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-audit-"));
  const binDir = path.join(workspace, "fake-bin");
  fs.mkdirSync(binDir);
  fs.mkdirSync(path.join(workspace, ".repo-sentinel/scripts"), { recursive: true });
  fs.copyFileSync(auditScript, path.join(workspace, ".repo-sentinel/scripts/audit.sh"));
  writeCoreScannerStubs(binDir);
  return { workspace, binDir };
}

test("full audit runs ShellCheck against extensionless shebang scripts", () => {
  const { workspace, binDir } = createAuditWorkspace();
  fs.mkdirSync(path.join(workspace, "bin"));

  fs.writeFileSync(path.join(workspace, "bin/setup"), "#!/usr/bin/env bash\necho setup\n", { mode: 0o755 });
  const shellcheckArgsPath = path.join(workspace, "shellcheck-args.txt");

  writeExecutable(path.join(binDir, "shellcheck"), `#!/usr/bin/env sh
printf '%s\n' "$@" >> "$SHELLCHECK_ARGS_PATH"
printf '{"comments":[]}\n'
`);

  execFileSync("bash", [path.join(workspace, ".repo-sentinel/scripts/audit.sh"), "--full"], {
    cwd: workspace,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      SHELLCHECK_ARGS_PATH: shellcheckArgsPath,
    },
    stdio: "pipe",
  });

  const shellcheckArgs = fs.readFileSync(shellcheckArgsPath, "utf8");
  assert.match(shellcheckArgs, /bin\/setup/);
});

test("full audit writes one valid ShellCheck JSON document across batches", () => {
  const { workspace, binDir } = createAuditWorkspace();
  fs.writeFileSync(path.join(workspace, "one.sh"), "#!/usr/bin/env bash\necho one\n");
  fs.writeFileSync(path.join(workspace, "two.sh"), "#!/usr/bin/env bash\necho two\n");

  writeExecutable(path.join(binDir, "shellcheck"), `#!/usr/bin/env sh
last=""
for arg do last="$arg"; done
printf '{"comments":[{"file":"%s"}]}\n' "$last"
`);
  writeExecutable(path.join(binDir, "xargs"), `#!/usr/bin/env bash
if [ "$1" = "-0" ]; then shift; fi
cmd="$1"
shift
while IFS= read -r -d '' file; do
  "$cmd" "$@" "$file"
done
`);

  execFileSync("bash", [path.join(workspace, ".repo-sentinel/scripts/audit.sh"), "--full"], {
    cwd: workspace,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
    stdio: "pipe",
  });

  const shellcheckJson = JSON.parse(
    fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/raw/shellcheck.json"), "utf8"),
  );
  const shellcheckFiles = shellcheckJson.comments.map((comment) => comment.file);
  assert(shellcheckFiles.includes("./one.sh"));
  assert(shellcheckFiles.includes("./two.sh"));
});

test("full audit writes one valid Hadolint JSON array across batches", () => {
  const { workspace, binDir } = createAuditWorkspace();
  fs.mkdirSync(path.join(workspace, "docker"));
  fs.writeFileSync(path.join(workspace, "Dockerfile"), "FROM alpine\n");
  fs.writeFileSync(path.join(workspace, "docker/Dockerfile"), "FROM alpine\n");
  writeExecutable(path.join(binDir, "shellcheck"), "#!/usr/bin/env sh\nprintf '{\"comments\":[]}\\n'\n");
  writeExecutable(path.join(binDir, "hadolint"), `#!/usr/bin/env sh
last=""
for arg do last="$arg"; done
printf '[{"file":"%s"}]\n' "$last"
`);
  writeExecutable(path.join(binDir, "find"), `#!/usr/bin/env sh
for arg do
  if [ "$arg" = "hadolint" ]; then
    hadolint --format json ./Dockerfile
    hadolint --format json ./docker/Dockerfile
    exit 0
  fi
done
/usr/bin/find "$@"
`);

  execFileSync("bash", [path.join(workspace, ".repo-sentinel/scripts/audit.sh"), "--full"], {
    cwd: workspace,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
    stdio: "pipe",
  });

  const hadolintJson = JSON.parse(
    fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/raw/hadolint.json"), "utf8"),
  );
  assert.equal(hadolintJson.length, 2);
});

test("full audit runs local Fallow for JavaScript and TypeScript repos", () => {
  const { workspace, binDir } = createAuditWorkspace();
  const fallowBinDir = path.join(workspace, "node_modules/.bin");
  fs.mkdirSync(fallowBinDir, { recursive: true });
  fs.writeFileSync(path.join(workspace, "package.json"), JSON.stringify({ scripts: {} }));
  writeExecutable(path.join(binDir, "shellcheck"), "#!/usr/bin/env sh\nprintf '{\"comments\":[]}\\n'\n");
  writeExecutable(path.join(fallowBinDir, "fallow"), `#!/usr/bin/env sh
printf '{"summary":{"total":1}}\n'
`);

  execFileSync("bash", [path.join(workspace, ".repo-sentinel/scripts/audit.sh"), "--full"], {
    cwd: workspace,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
    stdio: "pipe",
  });

  const manifest = JSON.parse(
    fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/raw/run-manifest.json"), "utf8"),
  );
  const fallowEntry = manifest.scanners.find((scanner) => scanner.name === "fallow");
  assert.equal(fallowEntry.status, "ok");
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/raw/fallow.json"), "utf8")),
    { summary: { total: 1 } },
  );
});

test("quick audit scans current tree with redacted Gitleaks output by default", () => {
  const { workspace, binDir } = createAuditWorkspace();
  const gitleaksArgsPath = path.join(workspace, "gitleaks-args.txt");

  writeExecutable(path.join(binDir, "gitleaks"), `#!/usr/bin/env sh
printf '%s\n' "$@" > "$GITLEAKS_ARGS_PATH"
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--report-path" ]; then shift; printf '[]\n' > "$1"; exit 0; fi
  shift
done
`);

  execFileSync("bash", [path.join(workspace, ".repo-sentinel/scripts/audit.sh"), "--quick"], {
    cwd: workspace,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      GITLEAKS_ARGS_PATH: gitleaksArgsPath,
    },
    stdio: "pipe",
  });

  const gitleaksArgs = fs.readFileSync(gitleaksArgsPath, "utf8");
  assert.match(gitleaksArgs, /--no-git/);
  assert.match(gitleaksArgs, /--redact/);
  assert.match(gitleaksArgs, /--exit-code\n0/);
});

test("quick audit can opt into Gitleaks git history scanning", () => {
  const { workspace, binDir } = createAuditWorkspace();
  const gitleaksArgsPath = path.join(workspace, "gitleaks-history-args.txt");

  writeExecutable(path.join(binDir, "gitleaks"), `#!/usr/bin/env sh
printf '%s\n' "$@" > "$GITLEAKS_ARGS_PATH"
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--report-path" ]; then shift; printf '[]\n' > "$1"; exit 0; fi
  shift
done
`);

  execFileSync("bash", [path.join(workspace, ".repo-sentinel/scripts/audit.sh"), "--quick"], {
    cwd: workspace,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      GITLEAKS_ARGS_PATH: gitleaksArgsPath,
      REPO_SENTINEL_GITLEAKS_HISTORY: "1",
    },
    stdio: "pipe",
  });

  const gitleaksArgs = fs.readFileSync(gitleaksArgsPath, "utf8");
  assert.doesNotMatch(gitleaksArgs, /--no-git/);
  assert.match(gitleaksArgs, /--redact/);
  assert.match(gitleaksArgs, /--exit-code\n0/);
});

test("full audit records scanners in recommended evidence order", () => {
  const { workspace, binDir } = createAuditWorkspace();
  fs.mkdirSync(path.join(workspace, ".github/workflows"), { recursive: true });
  fs.mkdirSync(path.join(workspace, "node_modules/.bin"), { recursive: true });
  fs.writeFileSync(path.join(workspace, ".github/workflows/ci.yml"), "name: ci\n");
  fs.writeFileSync(path.join(workspace, "Dockerfile"), "FROM alpine\n");
  fs.writeFileSync(path.join(workspace, "script.sh"), "#!/usr/bin/env bash\necho script\n");
  fs.writeFileSync(path.join(workspace, "package.json"), JSON.stringify({ scripts: {} }));

  writeExecutable(path.join(binDir, "shellcheck"), "#!/usr/bin/env sh\nprintf '{\"comments\":[]}\\n'\n");
  writeExecutable(path.join(binDir, "hadolint"), "#!/usr/bin/env sh\nprintf '[]\\n'\n");
  writeExecutable(path.join(binDir, "zizmor"), "#!/usr/bin/env sh\nprintf '[]\\n'\n");
  writeExecutable(path.join(workspace, "node_modules/.bin/fallow"), "#!/usr/bin/env sh\nprintf '{}\\n'\n");

  execFileSync("bash", [path.join(workspace, ".repo-sentinel/scripts/audit.sh"), "--full"], {
    cwd: workspace,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
    stdio: "pipe",
  });

  const manifest = JSON.parse(
    fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/raw/run-manifest.json"), "utf8"),
  );
  assert.deepEqual(
    manifest.scanners.map((scanner) => scanner.name),
    [
      "shellcheck",
      "hadolint",
      "zizmor",
      "checkov",
      "semgrep",
      "syft",
      "osv-scanner",
      "fallow",
      "trivy-fs",
      "grype",
      "scorecard",
      "gitleaks",
    ],
  );
});

test("full audit treats nonzero zizmor with findings as usable evidence", () => {
  const { workspace, binDir } = createAuditWorkspace();
  fs.mkdirSync(path.join(workspace, ".github/workflows"), { recursive: true });
  fs.writeFileSync(path.join(workspace, ".github/workflows/ci.yml"), "name: ci\n");
  writeExecutable(path.join(binDir, "shellcheck"), "#!/usr/bin/env sh\nprintf '{\"comments\":[]}\\n'\n");
  writeExecutable(path.join(binDir, "zizmor"), `#!/usr/bin/env sh
printf '[{"determinations":{"severity":"High"}}]\n'
exit 14
`);

  execFileSync("bash", [path.join(workspace, ".repo-sentinel/scripts/audit.sh"), "--full"], {
    cwd: workspace,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
    stdio: "pipe",
  });

  const manifest = JSON.parse(
    fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/raw/run-manifest.json"), "utf8"),
  );
  const zizmorEntry = manifest.scanners.find((scanner) => scanner.name === "zizmor");
  assert.equal(zizmorEntry.status, "completed_with_findings");
  assert.equal(zizmorEntry.exitCode, 14);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/raw/zizmor.json"), "utf8")),
    [{ determinations: { severity: "High" } }],
  );
});

test("full audit treats zizmor error exits with partial findings as failed", () => {
  const { workspace, binDir } = createAuditWorkspace();
  fs.mkdirSync(path.join(workspace, ".github/workflows"), { recursive: true });
  fs.writeFileSync(path.join(workspace, ".github/workflows/ci.yml"), "name: ci\n");
  writeExecutable(path.join(binDir, "shellcheck"), "#!/usr/bin/env sh\nprintf '{\"comments\":[]}\\n'\n");
  writeExecutable(path.join(binDir, "zizmor"), `#!/usr/bin/env sh
printf '[{"determinations":{"severity":"High"}}]\n'
exit 1
`);

  execFileSync("bash", [path.join(workspace, ".repo-sentinel/scripts/audit.sh"), "--full"], {
    cwd: workspace,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
    stdio: "pipe",
  });

  const manifest = JSON.parse(
    fs.readFileSync(path.join(workspace, ".repo-sentinel/reports/raw/run-manifest.json"), "utf8"),
  );
  const zizmorEntry = manifest.scanners.find((scanner) => scanner.name === "zizmor");
  assert.equal(zizmorEntry.status, "failed");
  assert.equal(zizmorEntry.exitCode, 1);
});

test("full audit can run independent scanners in parallel", () => {
  const { workspace, binDir } = createAuditWorkspace();

  writeExecutable(path.join(binDir, "semgrep"), `#!/usr/bin/env sh
touch "$PARALLEL_MARKER_DIR/semgrep-start"
sleep 1
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output" ]; then shift; printf '{"results":[]}\n' > "$1"; touch "$PARALLEL_MARKER_DIR/semgrep-end"; exit 0; fi
  shift
done
`);
  writeExecutable(path.join(binDir, "syft"), `#!/usr/bin/env sh
if [ -f "$PARALLEL_MARKER_DIR/semgrep-start" ] && [ ! -f "$PARALLEL_MARKER_DIR/semgrep-end" ]; then
  touch "$PARALLEL_MARKER_DIR/overlap"
fi
printf '{}\n'
`);

  execFileSync("bash", [path.join(workspace, ".repo-sentinel/scripts/audit.sh"), "--full"], {
    cwd: workspace,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      PARALLEL_MARKER_DIR: workspace,
      REPO_SENTINEL_JOBS: "2",
    },
    stdio: "pipe",
  });

  assert.equal(fs.existsSync(path.join(workspace, "overlap")), true);
});

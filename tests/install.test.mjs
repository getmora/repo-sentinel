import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const installerScript = path.join(repoRoot, "install.sh");

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

function copyInstallerFixture(sourceDir) {
  fs.copyFileSync(installerScript, path.join(sourceDir, "install.sh"));
  fs.mkdirSync(path.join(sourceDir, ".repo-sentinel/scripts"), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, ".repo-sentinel/prompts"), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, ".repo-sentinel/skill/repo-sentinel"), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, ".repo-sentinel/README.md"), "# Repo Sentinel\n");
  fs.writeFileSync(path.join(sourceDir, ".repo-sentinel/prompts/review.md"), "# Review\n");
  fs.writeFileSync(path.join(sourceDir, ".repo-sentinel/skill/repo-sentinel/SKILL.md"), "# Skill\n");
  writeExecutable(path.join(sourceDir, ".repo-sentinel/scripts/audit.sh"), "#!/usr/bin/env sh\nexit 0\n");
  writeExecutable(path.join(sourceDir, ".repo-sentinel/scripts/normalize.mjs"), "#!/usr/bin/env node\n");
  writeExecutable(
    path.join(sourceDir, ".repo-sentinel/scripts/setup.sh"),
    "#!/usr/bin/env sh\nprintf '%s\\n' \"$1\" >> \"$REPO_SENTINEL_TEST_LOG\"\n",
  );
}

test("installer can install repo tools in the same run", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-install-"));
  const sourceDir = path.join(tempDir, "source");
  const targetDir = path.join(tempDir, "target");
  const binDir = path.join(tempDir, "bin");
  const logPath = path.join(tempDir, "setup.log");

  fs.mkdirSync(sourceDir);
  fs.mkdirSync(targetDir);
  fs.mkdirSync(binDir);
  copyInstallerFixture(sourceDir);

  writeExecutable(path.join(binDir, "git"), "#!/usr/bin/env sh\nexit 0\n");
  writeExecutable(
    path.join(binDir, "rsync"),
    `#!/usr/bin/env bash
set -e
if [ "$1" = "-a" ]; then shift; fi
src="$1"
dest="$2"
if [[ "$src" == */ ]]; then
  mkdir -p "$dest"
  cp -R "$src". "$dest"
else
  mkdir -p "$dest"
  cp -R "$src" "$dest"
fi
`,
  );

  execFileSync("bash", [path.join(sourceDir, "install.sh"), "--all", "--install-tools"], {
    cwd: targetDir,
    env: {
      ...process.env,
      CODEX_HOME: path.join(tempDir, "codex-home"),
      PATH: `${binDir}:${process.env.PATH}`,
      REPO_SENTINEL_TEST_LOG: logPath,
    },
    stdio: "pipe",
  });

  assert.equal(fs.readFileSync(logPath, "utf8"), "--install\n");
});

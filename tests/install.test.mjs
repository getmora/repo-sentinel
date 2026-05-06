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
  fs.writeFileSync(path.join(sourceDir, ".repo-sentinel/VERSION"), "test-version\n");
  fs.writeFileSync(path.join(sourceDir, ".repo-sentinel/prompts/review.md"), "# Review\n");
  fs.writeFileSync(path.join(sourceDir, ".repo-sentinel/skill/repo-sentinel/SKILL.md"), "# Skill\n");
  writeExecutable(path.join(sourceDir, ".repo-sentinel/scripts/audit.sh"), "#!/usr/bin/env sh\nexit 0\n");
  writeExecutable(path.join(sourceDir, ".repo-sentinel/scripts/normalize.mjs"), "#!/usr/bin/env node\n");
  writeExecutable(
    path.join(sourceDir, ".repo-sentinel/scripts/setup.sh"),
    "#!/usr/bin/env sh\nprintf '%s\\n' \"$1\" >> \"$REPO_SENTINEL_TEST_LOG\"\n",
  );
}

test("installer falls back to dependency check without an interactive terminal", () => {
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

  execFileSync("bash", [path.join(sourceDir, "install.sh"), "--all"], {
    cwd: targetDir,
    env: {
      ...process.env,
      CODEX_HOME: path.join(tempDir, "codex-home"),
      PATH: `${binDir}:${process.env.PATH}`,
      REPO_SENTINEL_TEST_LOG: logPath,
    },
    stdio: "pipe",
  });

  assert.equal(fs.readFileSync(logPath, "utf8"), "--check\n");
  assert.equal(fs.existsSync(path.join(targetDir, ".repo-sentinel/reports/raw")), true);
  assert.equal(fs.existsSync(path.join(targetDir, ".repo-sentinel/scripts/audit.sh")), false);
  assert.match(fs.readFileSync(path.join(targetDir, ".gitignore"), "utf8"), /\.repo-sentinel\/reports\/raw\//);
});

test("global installer falls back to dependency check without an interactive terminal", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-global-install-"));
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

  execFileSync("bash", [path.join(sourceDir, "install.sh")], {
    cwd: targetDir,
    env: {
      ...process.env,
      CODEX_HOME: path.join(tempDir, "codex-home"),
      PATH: `${binDir}:${process.env.PATH}`,
      REPO_SENTINEL_TEST_LOG: logPath,
    },
    stdio: "pipe",
  });

  assert.equal(fs.readFileSync(logPath, "utf8"), "--check\n");
  const skillDir = path.join(tempDir, "codex-home", "skills", "repo-sentinel");
  assert.equal(fs.readFileSync(path.join(skillDir, "VERSION"), "utf8"), "test-version\n");
  assert.equal(fs.existsSync(path.join(skillDir, "scripts/setup.sh")), true);
  assert.equal(fs.existsSync(path.join(skillDir, "scripts/audit.sh")), true);
  assert.equal(fs.existsSync(path.join(skillDir, "scripts/normalize.mjs")), true);
  assert.equal(fs.existsSync(path.join(skillDir, "prompts/review.md")), true);
});

test("repo-only installer checks dependencies with the repo-local setup script", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-repo-only-install-"));
  const sourceDir = path.join(tempDir, "source");
  const targetDir = path.join(tempDir, "target");
  const binDir = path.join(tempDir, "bin");
  const codexHome = path.join(tempDir, "codex-home");
  const globalSkillDir = path.join(codexHome, "skills", "repo-sentinel");
  const logPath = path.join(tempDir, "setup.log");

  fs.mkdirSync(sourceDir);
  fs.mkdirSync(targetDir);
  fs.mkdirSync(binDir);
  fs.mkdirSync(path.join(globalSkillDir, "scripts"), { recursive: true });
  copyInstallerFixture(sourceDir);

  writeExecutable(
    path.join(sourceDir, ".repo-sentinel/scripts/setup.sh"),
    "#!/usr/bin/env sh\nprintf 'local:%s\\n' \"$1\" >> \"$REPO_SENTINEL_TEST_LOG\"\n",
  );
  writeExecutable(
    path.join(globalSkillDir, "scripts/setup.sh"),
    "#!/usr/bin/env sh\nprintf 'global:%s\\n' \"$1\" >> \"$REPO_SENTINEL_TEST_LOG\"\n",
  );

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

  execFileSync("bash", [path.join(sourceDir, "install.sh"), "--repo-only"], {
    cwd: targetDir,
    env: {
      ...process.env,
      CODEX_HOME: codexHome,
      PATH: `${binDir}:${process.env.PATH}`,
      REPO_SENTINEL_TEST_LOG: logPath,
    },
    stdio: "pipe",
  });

  assert.equal(fs.readFileSync(logPath, "utf8"), "local:--check\n");
  assert.equal(fs.existsSync(path.join(targetDir, ".repo-sentinel/scripts/setup.sh")), true);
});

test("installer attaches the dependency wizard to the terminal when available", () => {
  const installer = fs.readFileSync(installerScript, "utf8");
  assert.match(installer, /<\s*\/dev\/tty/);
  assert.match(installer, /--wizard/);
});

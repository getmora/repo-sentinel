import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const setupScript = path.join(repoRoot, ".repo-sentinel/scripts/setup.sh");
const skillPath = path.join(repoRoot, ".repo-sentinel/skill/repo-sentinel/SKILL.md");

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

test("setup check treats repo-local Fallow as installed", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-setup-"));
  const localBin = path.join(workspace, "node_modules/.bin");
  fs.mkdirSync(localBin, { recursive: true });
  fs.writeFileSync(path.join(localBin, "fallow"), "#!/usr/bin/env sh\nexit 0\n", { mode: 0o755 });

  const output = execFileSync("bash", [setupScript, "--check"], {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, PATH: "/usr/bin:/bin" },
  });

  assert.match(output, /  \[ok\]      fallow/);
});

test("setup install reports tools that are still missing after install attempts", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-setup-install-"));
  const binDir = path.join(workspace, "bin");
  fs.mkdirSync(binDir);

  writeExecutable(path.join(binDir, "uname"), "#!/bin/sh\nprintf 'Darwin\\n'\n");
  writeExecutable(path.join(binDir, "brew"), "#!/bin/sh\nprintf 'brew install failed: %s\\n' \"$*\"\nexit 1\n");
  writeExecutable(path.join(binDir, "npm"), "#!/bin/sh\nprintf 'npm install failed: %s\\n' \"$*\"\nexit 1\n");

  const result = spawnSync("/bin/bash", [setupScript, "--install"], {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, PATH: binDir },
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Still missing after install attempts:/);
  assert.match(result.stdout, /  \[missing\] git/);
  assert.match(result.stdout, /  \[missing\] fallow/);
});

test("setup wizard installs only selected missing tools", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "repo-sentinel-setup-wizard-"));
  const binDir = path.join(workspace, "bin");
  const installLog = path.join(workspace, "install.log");
  fs.mkdirSync(binDir);

  writeExecutable(path.join(binDir, "uname"), "#!/bin/sh\nprintf 'Darwin\\n'\n");
  writeExecutable(
    path.join(binDir, "brew"),
    `#!/bin/sh
printf '%s\n' "$*" >> "$INSTALL_LOG"
if [ "$2" = "git" ]; then
  printf '#!/bin/sh\nexit 0\n' > "$FAKE_BIN/git"
  chmod +x "$FAKE_BIN/git"
fi
exit 0
`,
  );
  writeExecutable(path.join(binDir, "npm"), "#!/bin/sh\nprintf 'npm %s\\n' \"$*\" >> \"$INSTALL_LOG\"\nexit 0\n");

  const result = spawnSync("/bin/bash", [setupScript, "--wizard"], {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, PATH: binDir, FAKE_BIN: binDir, INSTALL_LOG: installLog },
    input: "y\nn\nn\nn\nn\nn\nn\nn\nn\nn\nn\nn\nn\nn\nn\n",
  });

  assert.equal(result.status, 0);
  assert.match(fs.readFileSync(installLog, "utf8"), /^install git$/m);
  assert.doesNotMatch(fs.readFileSync(installLog, "utf8"), /install node/);
  assert.match(result.stdout, /Tools still not installed:/);
  assert.match(result.stdout, /  \[missing\] node/);
});

test("skill does not bootstrap a repo-local runtime bundle", () => {
  const skill = fs.readFileSync(skillPath, "utf8");
  assert.match(skill, /<runtime_dir>\/scripts\/setup\.sh/);
  assert.doesNotMatch(skill, /--repo-only --install-tools/);
  assert.doesNotMatch(skill, /--repo-only/);
});

test("skill uses the globally installed runtime instead of a repo-local bundle", () => {
  const skill = fs.readFileSync(skillPath, "utf8");
  assert.match(skill, /directory containing this `SKILL\.md`/i);
  assert.match(skill, /scripts\/setup\.sh/);
  assert.match(skill, /scripts\/audit\.sh/);
  assert.match(skill, /prompts\/review\.md/);
  assert.doesNotMatch(skill, /--repo-only/);
  assert.doesNotMatch(skill, /stale repo-local bundle/i);
});

test("skill resolves legacy repo-local runtime bundles", () => {
  const skill = fs.readFileSync(skillPath, "utf8");
  assert.match(skill, /legacy repo-local/i);
  assert.match(skill, /\.\.\/\.\.\/scripts\/setup\.sh/);
  assert.match(skill, /\.\.\/\.\.\/prompts\/review\.md/);
});

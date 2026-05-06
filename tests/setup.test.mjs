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

test("skill bootstrap does not require scanner tool installation", () => {
  const skill = fs.readFileSync(skillPath, "utf8");
  assert.match(skill, /--repo-only`/);
  assert.doesNotMatch(skill, /--repo-only --install-tools/);
});

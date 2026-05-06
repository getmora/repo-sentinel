import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const setupScript = path.join(repoRoot, ".repo-sentinel/scripts/setup.sh");

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

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");

test("skill defines separate technical and non-technical audit reports", () => {
  const skill = fs.readFileSync(path.join(repoRoot, ".repo-sentinel/skill/repo-sentinel/SKILL.md"), "utf8");
  const finalPrompt = fs.readFileSync(path.join(repoRoot, ".repo-sentinel/prompts/final-report.md"), "utf8");
  const nonTechnicalPrompt = fs.readFileSync(
    path.join(repoRoot, ".repo-sentinel/prompts/non-technical-report.md"),
    "utf8",
  );

  assert.match(skill, /\.repo-sentinel\/prompts\/non-technical-report\.md/);
  assert.match(skill, /\.repo-sentinel\/reports\/final\/audit-report\.md/);
  assert.match(skill, /\.repo_sentinal\/audit-report\.md/);
  assert.match(finalPrompt, /technical/i);
  assert.match(nonTechnicalPrompt, /plain English/i);
  assert.match(nonTechnicalPrompt, /action/i);
  assert.doesNotMatch(finalPrompt, /write it to both/i);
});

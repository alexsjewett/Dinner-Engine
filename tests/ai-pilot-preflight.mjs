import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const src = await readFile("backend/src/aiPilot.ts", "utf8");
const guardrails = await readFile("backend/src/guardrails.ts", "utf8");
const worker = await readFile("backend/src/index.ts", "utf8");
const frontend = await readFile("src/services/aiPilotPreview.ts", "utf8");
assert.ok(!/fetch\s*\(/.test(src), "AI adapter must not initiate network calls");
assert.ok(!/api\.openai\.com|OPENAI_API_KEY/.test(worker), "live worker has no provider integration");
assert.ok(frontend.includes("AI_PILOT_READY_FOR_BILLING = false"));
const suffix = ".ai-pilot-test-" + process.pid + ".mjs";
const paths = ["backend/src/guardrails.ts", "backend/src/aiPilot.ts"];
try {
  for (const path of paths) {
    const text = path.endsWith("guardrails.ts") ? guardrails : src;
    const compiled = ts.transpileModule(text, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace('from "./guardrails"', 'from "./guardrails' + suffix + '"');
    await writeFile(path.replace(/\.ts$/, suffix), compiled, { flag: "wx" });
  }
  const mod = await import(pathToFileURL(process.cwd() + "/backend/src/aiPilot" + suffix).href);
  assert.equal(mod.PILOT_MODEL, "gpt-6-luna");
  assert.equal(mod.MONTHLY_HARD_LIMIT_MICRO_USD, 5_000_000);
  assert.ok(mod.reservationMicroUsd() > 0);
  assert.ok(mod.estimateUsageMicroUsd(8000, 700) <= mod.reservationMicroUsd());
  assert.equal(mod.estimateUsageMicroUsd(8001, 0), null);
  assert.equal(mod.estimateUsageMicroUsd(0, 701), null);
  assert.equal(mod.estimateUsageMicroUsd(-1, 0), null);
  const candidate = {
    version: 1, recipes: [{ id: "synthetic-1", title: "Fictional Lentils",
      ingredients: "lentils, water", directions: "PRIVATE_DIRECTIONS_NEVER_SEND" }],
    criteria: { have: ["lentils"], unavailable: [], timeLimitMinutes: 30 },
  };
  const prepared = mod.preparePilotRequest(candidate);
  assert.ok(prepared);
  assert.equal(prepared.model, "gpt-6-luna");
  assert.equal(prepared.max_output_tokens, 700);
  assert.ok(!prepared.input.includes("PRIVATE_DIRECTIONS_NEVER_SEND"));
  assert.equal(mod.preparePilotRequest({ ...candidate, extra: true }), null);
  assert.deepEqual(mod.validateAiResponse({ suggestions: [{
    recipeId: "synthetic-1", explanation: "Fits the available ingredients", cautions: ["Review dietary suitability"],
  }] }, ["synthetic-1"]), [{
    recipeId: "synthetic-1", explanation: "Fits the available ingredients", cautions: ["Review dietary suitability"],
  }]);
  assert.equal(mod.validateAiResponse({ suggestions: [{
    recipeId: "invented-id", explanation: "Made up", cautions: [],
  }] }, ["synthetic-1"]), null);
  assert.equal(mod.validateAiResponse({ suggestions: [{
    recipeId: "synthetic-1", explanation: "Good", cautions: [], extra: "injection",
  }] }, ["synthetic-1"]), null);
  assert.equal(mod.validateAiResponse({ suggestions: [{
    recipeId: "synthetic-1", explanation: "Good", cautions: [],
  }, { recipeId: "synthetic-1", explanation: "Again", cautions: [] }] }, ["synthetic-1"]), null);
  assert.equal(mod.validateAiResponse({ suggestions: [{
    recipeId: "synthetic-1", explanation: "Good", cautions: ["x".repeat(121)],
  }] }, ["synthetic-1"]), null);
  assert.equal(mod.canUseCandidateForAi({
    category: "straightforward", reviewReasons: [], softNotes: [],
  }), true);
  assert.equal(mod.canUseCandidateForAi({
    category: "review", reviewReasons: ["dietary review"], softNotes: [],
  }), false);
  assert.equal(mod.canUseCandidateForAi({
    category: "straightforward", reviewReasons: [], softNotes: ["uncertain ingredient"],
  }), false);
  assert.equal(mod.validateTrustedEligibility(["a"], ["a", "b"]), true);
  assert.equal(mod.validateTrustedEligibility(["a", "a"], ["a", "b"]), false);
  assert.equal(mod.validateTrustedEligibility(["a", "invented"], ["a", "b"]), false);
  assert.equal(mod.validateTrustedEligibility([], ["a"]), false);
  console.log("3B.1 staged adapter, privacy minimization, eligibility and output checks passed");
} finally {
  await Promise.all(paths.map(p => unlink(p.replace(/\.ts$/, suffix)).catch(() => {})));
}

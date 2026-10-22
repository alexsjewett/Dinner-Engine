import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const suffix = ".ai-orchestrator-mock-" + process.pid + ".mjs";
const paths = [
  "backend/src/guardrails.ts", "backend/src/aiPilot.ts",
  "backend/src/paprikaContract.ts", "backend/src/paprikaModelDraft.ts",
  "backend/src/paidBudget.ts", "backend/src/aiPilotOrchestrator.ts",
];
const worker = await readFile("backend/src/index.ts", "utf8");
assert.ok(!worker.includes('from "./aiPilotOrchestrator"'));
assert.ok(worker.includes("ai_pilot_disabled"));
const created = [];
try {
  for (const path of paths) {
    const original = await readFile(path, "utf8");
    const compiled = ts.transpileModule(original, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from "(\.\/[^"]+)"/g, (_, rel) =>
      'from "' + rel + suffix + '"');
    const output = path.replace(/\.ts$/, suffix);
    await writeFile(output, compiled, { flag: "wx" });
    created.push(output);
  }
  const imp = name => import(pathToFileURL(process.cwd() +
    "/backend/src/" + name + suffix).href);
  const { planPaprikaModelBatches } = await imp("paprikaModelDraft");
  const { exerciseStagedBatchPlan } = await imp("aiPilotOrchestrator");
  const { reserveRequest, settleRequest } = await imp("paidBudget");
  const recipe = i => ({
    id: "synthetic_" + i, paprikaUid: null, name: "Recipe " + i,
    ingredients: "beans, water", directions: "Stir gently ".repeat(110),
    description: "", notes: "", servings: "2",
    prepTime: "5 min", cookTime: "20 min", totalTime: "25 min",
    source: "", sourceUrl: "", categories: ["Dinner"],
  });
  const payload = {
    version: 2, scope: "full-paprika-library",
    consent: "explicit-per-request",
    recipes: Array.from({length: 8}, (_, i) => recipe(i)),
    criteria: {
      have: ["beans"], unavailable: [], timeLimitMinutes: 30,
      mustAvoidFoods: [], shouldAvoidFoods: [], preferAvoidFoods: [],
      dietaryNeeds: [],
    },
  };
  const plan = planPaprikaModelBatches(payload);
  assert.ok(plan && plan.length > 1);
  const clock = Date.parse("2026-10-22T13:00:00Z");
  function storage() {
    const values = new Map();
    return { values, kv: {
      get: key => values.get(key), put: (key, value) => values.set(key, value),
    }, transactionSync: fn => fn() };
  }
  function ledger(db) {
    return {
      reserve: async id => reserveRequest(db, clock, id),
      settle: async (id, actual) => settleRequest(db, id, actual),
    };
  }
  const responseFor = draft => ({
    status: "completed", usage: { input_tokens: 1100, output_tokens: 100 },
    output: [{ type: "message", content: [{
      type: "output_text",
      text: JSON.stringify({ suggestions: [{
        recipeId: draft.eligibleIds[0], explanation: "Simple ingredients", cautions: [],
      }] }),
    }] }],
  });
  const idFactory = () => {
    let i = 0;
    return () => "generated_server_request_" + String(++i).padStart(8, "0");
  };
  const firstDb = storage();
  let sent = 0;
  const done = await exerciseStagedBatchPlan(plan, ledger(firstDb),
    async draft => { sent++; return responseFor(draft); }, idFactory());
  assert.ok(done);
  assert.equal(sent, plan.length);
  assert.equal(done.requestCount, plan.length);
  assert.equal(done.groups.length, plan.length);
  assert.ok(done.groups.every(g => g.reply.suggestions.every(s => s.requiresManualReview)));
  assert.ok(done.totalEstimatedMicroUsd > 0);
  assert.ok(done.totalEstimatedMicroUsd <= 1_500 * plan.length);
  assert.equal(firstDb.values.get("paid:usd:2026-10"), done.totalEstimatedMicroUsd);
  assert.equal(firstDb.values.get("paid:h:2026-10-22T13"), plan.length);
  const secondDb = storage();
  let attempt = 0;
  const failed = await exerciseStagedBatchPlan(plan, ledger(secondDb),
    async draft => {
      attempt++;
      if (attempt === 2) throw Error("ambiguous network failure");
      return responseFor(draft);
    }, idFactory());
  assert.equal(failed, null);
  assert.equal(attempt, 2, "no retry after ambiguous provider failure");
  assert.equal(secondDb.values.get("paid:h:2026-10-22T13"), 2);
  assert.ok(secondDb.values.get("paid:usd:2026-10") > 1_500,
    "unknown second call retains its full reservation");
  let unexpectedlyCalled = false;
  const rejected = await exerciseStagedBatchPlan(plan, {
    reserve: async () => "limited", settle: async () => "invalid",
  }, async () => { unexpectedlyCalled = true; return {}; }, idFactory());
  assert.equal(rejected, null);
  assert.equal(unexpectedlyCalled, false);
  assert.equal(await exerciseStagedBatchPlan([
    { ...plan[0], batchNumber: 3 },
  ], ledger(storage()), async () => responseFor(plan[0].draft), idFactory()), null);
  console.log("Staged batch ledger orchestration, full failure fallback and idempotency mocks passed");
} finally {
  await Promise.all(created.map(p => unlink(p).catch(() => {})));
}

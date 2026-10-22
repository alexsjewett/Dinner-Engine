import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const suffix = ".paprika-model-test-" + process.pid + ".mjs";
const paths = [
  "backend/src/guardrails.ts", "backend/src/aiPilot.ts",
  "backend/src/paprikaContract.ts", "backend/src/paprikaModelDraft.ts",
];
const worker = await readFile("backend/src/index.ts", "utf8");
const draft = await readFile("backend/src/paprikaModelDraft.ts", "utf8");
assert.ok(!/fetch\s*\(|api\.openai\.com|OPENAI_API_KEY/.test(draft));
assert.ok(!worker.includes('from "./paprikaModelDraft"'));
assert.ok(worker.includes("ai_pilot_disabled"));
const created = [];
try {
  for (const path of paths) {
    const src = await readFile(path, "utf8");
    const compiled = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from "(\.\/[^"]+)"/g, (_, rel) =>
      'from "' + rel + suffix + '"');
    const output = path.replace(/\.ts$/, suffix);
    await writeFile(output, compiled, { flag: "wx" });
    created.push(output);
  }
  const mod = await import(pathToFileURL(
    process.cwd() + "/backend/src/paprikaModelDraft" + suffix).href);
  const recipe = (id, ingredients = "beans") => ({
    id, paprikaUid: null, name: "Fictional " + id, ingredients,
    directions: "Simmer. Untrusted recipe content.",
    description: "", notes: "FULL_NOTES_RETAINED", servings: "2",
    prepTime: "5 min", cookTime: "20 min", totalTime: "25 min",
    source: "", sourceUrl: "", categories: ["Dinner"],
  });
  const criteria = {
    have: ["beans"], unavailable: [], timeLimitMinutes: 30,
    mustAvoidFoods: ["peanuts"], shouldAvoidFoods: ["onions"],
    preferAvoidFoods: ["mushrooms"], dietaryNeeds: ["gluten-free"],
  };
  const payload = {
    version: 2, scope: "full-paprika-library",
    consent: "explicit-per-request",
    recipes: [recipe("good"), recipe("bad", "peanuts and noodles")],
    criteria,
  };
  const staged = mod.stagePaprikaModelRequest(payload);
  assert.ok(staged);
  assert.equal(staged.request.model, "gpt-6-luna");
  assert.equal(staged.request.store, false);
  assert.equal(staged.request.tool_choice, "none");
  assert.equal(staged.request.text.format.type, "json_schema");
  assert.equal(staged.request.text.format.strict, true);
  const schema = staged.request.text.format.schema;
  const suggested = schema.properties.suggestions;
  const itemSchema = suggested.items.properties;
  assert.equal(suggested.minItems, 1);
  assert.equal(suggested.maxItems, 1, "one eligible recipe means at most one returned");
  assert.equal(itemSchema.explanation.minLength, 1);
  assert.equal(itemSchema.explanation.maxLength, 240);
  assert.equal(itemSchema.cautions.maxItems, 3);
  assert.equal(itemSchema.cautions.items.minLength, 1);
  assert.equal(itemSchema.cautions.items.maxLength, 120);
  const nonblank = new RegExp(itemSchema.explanation.pattern);
  for (const text of ["Fits pantry", " one ", "Visible text"]) {
    assert.ok(nonblank.test(text));
  }
  for (const text of ["", "   ", "Line\nBreak", "bad\u0000control"]) {
    assert.ok(!nonblank.test(text), "schema must reject blank/control text");
  }
  assert.ok(staged.request.instructions.includes("between 1 and 1 distinct"));
  assert.ok(staged.request.instructions.includes("1-240"));
  assert.ok(staged.request.instructions.includes("0-3 cautions"));
  const twoEligible = mod.stagePaprikaModelRequest({ ...payload,
    criteria: { ...criteria, mustAvoidFoods: [] },
  });
  assert.ok(twoEligible);
  assert.equal(twoEligible.request.text.format.schema.properties.suggestions.maxItems, 2);
  assert.ok(staged.request.input.includes("FULL_NOTES_RETAINED"));
  assert.ok(staged.request.input.includes("peanuts and noodles"),
    "a full-library draft must not silently strip disqualified recipes");
  assert.deepEqual(staged.eligibleIds, ["good"]);
  assert.deepEqual(staged.excludedKnownConflictIds, ["bad"]);
  assert.ok(staged.request.text.format.schema.properties.suggestions.items
    .properties.recipeId.enum.includes("good"));
  assert.ok(!staged.request.text.format.schema.properties.suggestions.items
    .properties.recipeId.enum.includes("bad"));
  assert.equal(mod.stagePaprikaModelRequest({ ...payload, consent: false }), null);
  assert.equal(mod.stagePaprikaModelRequest({ ...payload,
    recipes: [recipe("all_bad", "peanuts")] }), null);
  assert.equal(mod.stagePaprikaModelRequest({ ...payload,
    recipes: [recipe("too_long", "a".repeat(8_000))] }), null);
  const multi = {
    ...payload,
    criteria: { ...criteria, mustAvoidFoods: [] },
    recipes: Array.from({ length: 8 }, (_, i) => ({
      ...recipe("batch_" + i), directions: "Simmer and stir ".repeat(75),
    })),
  };
  const plan = mod.planPaprikaModelBatches(multi);
  assert.ok(plan && plan.length > 1, "larger libraries need multiple bounded model calls");
  assert.ok(plan.every(batch => batch.totalBatches === plan.length));
  assert.ok(plan.every(batch => batch.draft.inputBytes <= mod.MAX_STAGED_INPUT_BYTES));
  assert.deepEqual(plan.flatMap(batch => batch.recipeIds), multi.recipes.map(r => r.id));
  const conflictFirst = mod.planPaprikaModelBatches({
    ...payload,
    recipes: [recipe("known_conflict", "peanuts"), recipe("eligible", "beans")],
  });
  assert.ok(conflictFirst && conflictFirst.length === 1);
  assert.deepEqual(conflictFirst[0].recipeIds, ["known_conflict", "eligible"]);
  assert.deepEqual(conflictFirst[0].draft.eligibleIds, ["eligible"]);
  assert.equal(mod.planPaprikaModelBatches({
    ...payload, recipes: [recipe("only_conflict", "peanuts")],
  }), null);

  assert.equal(mod.planPaprikaModelBatches({ ...payload,
    recipes: [recipe("too_long", "x".repeat(8_000))] }), null);

  const respond = suggestions => ({
    status: "completed", usage: { input_tokens: 1100, output_tokens: 200 },
    output: [{ type: "message", content: [
      { type: "output_text", text: JSON.stringify({ suggestions }) },
    ] }],
  });
  const suggestion = {
    recipeId: "good", explanation: "Fits the pantry", cautions: [],
  };
  const verified = mod.validatePaprikaModelReply(respond([suggestion]), staged.eligibleIds);
  assert.ok(verified);
  assert.equal(verified.suggestions[0].requiresManualReview, true);
  assert.ok(verified.suggestions[0].cautions.some(x => x.includes("check all ingredients")));
  assert.ok(verified.estimatedMicroUsd > 0 && verified.estimatedMicroUsd <= 1_500);
  assert.equal(mod.diagnosePaprikaModelReply(respond([suggestion]), staged.eligibleIds), null);
  const modelDiagnosisCases = [
    [ { ...respond([suggestion]), status: "incomplete" }, "model_status_invalid" ],
    [ { ...respond([suggestion]), usage: null }, "model_usage_invalid" ],
    [ { ...respond([suggestion]), output: [] }, "model_output_invalid" ],
    [ { ...respond([suggestion]), output: [
        { type: "message", content: [{ type: "output_text", text: "{not-json" }] },
      ] }, "model_output_json_invalid" ],
    [ respond([]), "model_suggestion_count_invalid" ],
    [ respond([{ ...suggestion, recipeId: "unapproved-id" }]), "model_recipe_id_invalid" ],
    [ respond([{ ...suggestion, explanation: " ".repeat(5) }]), "model_suggestion_text_invalid" ],
    [ respond([{ ...suggestion, explanation: "a".repeat(241) }]), "model_suggestion_text_invalid" ],
    [ respond([{ ...suggestion, cautions: ["x".repeat(121)] }]), "model_suggestion_text_invalid" ],
    [ respond([{ ...suggestion, extra: "not allowed" }]), "model_suggestions_invalid" ],
  ];
  for (const [bad, reason] of modelDiagnosisCases) {
    assert.equal(mod.validatePaprikaModelReply(bad, staged.eligibleIds), null,
      "diagnosis must never make rejected response valid");
    assert.equal(mod.diagnosePaprikaModelReply(bad, staged.eligibleIds), reason);
  }
  assert.equal(mod.diagnosePaprikaModelReply(respond([suggestion, suggestion]),
    ["good", "other"]), "model_recipe_id_invalid");
  assert.equal(mod.validatePaprikaModelReply(respond([
    { ...suggestion, recipeId: "bad" },
  ]), staged.eligibleIds), null);
  assert.equal(mod.validatePaprikaModelReply(respond([
    suggestion, suggestion,
  ]), staged.eligibleIds), null);
  assert.equal(mod.validatePaprikaModelReply({
    ...respond([suggestion]), status: "incomplete",
  }, staged.eligibleIds), null);
  assert.equal(mod.validatePaprikaModelReply({
    ...respond([suggestion]), usage: { input_tokens: 9000, output_tokens: 200 },
  }, staged.eligibleIds), null);
  assert.equal(mod.validatePaprikaModelReply({
    ...respond([suggestion]), usage: undefined,
  }, staged.eligibleIds), null);
  assert.equal(mod.validatePaprikaModelReply({
    ...respond([suggestion]), output: [{ type: "message", content: [
      { type: "output_text", text: "not json" },
    ] }],
  }, staged.eligibleIds), null);
  console.log("Offline Paprika Responses schema, strict output and review warnings passed");
} finally {
  await Promise.all(created.map(path => unlink(path).catch(() => {})));
}

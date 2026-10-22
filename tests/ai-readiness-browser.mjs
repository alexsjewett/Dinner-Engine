import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/** Real browser-side planning code; fictional records only. No network calls. */
const suffix = ".ai-readiness-test-" + process.pid + ".mjs";
const paths = [
  "backend/src/guardrails.ts",
  "backend/src/aiPilot.ts",
  "backend/src/paprikaContract.ts",
  "backend/src/paprikaModelDraft.ts",
  "src/services/aiPaprikaRequest.ts",
  "src/services/aiPaprikaReadiness.ts",
];
const made = [];
try {
  for (const path of paths) {
    const original = await readFile(path, "utf8");
    if (path.endsWith("aiPaprikaReadiness.ts")) {
      assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/.test(original),
        "local readiness cannot send or persist private recipe data");
    }
    const transpiled = ts.transpileModule(original, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from "(\.[^"]+)"/g, (_, rel) =>
      'from "' + rel + suffix + '"');
    const output = path.replace(/\.ts$/, suffix);
    await writeFile(output, transpiled, { flag: "wx" });
    made.push(output);
  }
  const load = path => import(pathToFileURL(process.cwd() + "/" +
    path.replace(/\.ts$/, suffix)).href);
  const { prepareLocalPaprikaRequest } = await load("src/services/aiPaprikaRequest.ts");
  const { assessLocalAiReadiness } = await load("src/services/aiPaprikaReadiness.ts");
  const recipe = (id, ingredients = "lentils, water, carrots", directions = "Simmer lentils.") => ({
    id, paprikaUid: id, name: "Fictional " + id,
    ingredients, directions, description: "Invented example",
    notes: "LOCAL_ONLY_NOTES_123", servings: "2", prepTime: "10 min",
    cookTime: "20 min", totalTime: "30 min", source: "Fictional",
    sourceUrl: "https://example.invalid", categories: ["Dinner"],
  });
  const criteria = {
    haveText: "lentils, carrots", unavailableText: "fish", time: 45,
    dinerMode: "selected", selectedProfileIds: ["private-profile-id"],
  };
  const diners = [{
    id: "private-profile-id", householdId: "private-household",
    name: "PRIVATE_DINER_NAME_123", dietaryNeeds: ["vegetarian"],
    foodRestrictions: [
      { food: "peanuts", level: "must" },
      { food: "mushrooms", level: "should" },
      { food: "onions", level: "prefer" },
    ],
  }];
  const all = [recipe("one"), recipe("two", "peanuts, water"),
    recipe("three", "carrots, rice")];
  let preflight = prepareLocalPaprikaRequest(all, criteria, diners, false);
  assert.equal(assessLocalAiReadiness(preflight).reason, "consent_required");
  preflight = prepareLocalPaprikaRequest(all, criteria, diners, true);
  assert.equal(preflight.ok, true);
  assert.deepEqual(preflight.payload.criteria.mustAvoidFoods, ["peanuts"]);
  assert.deepEqual(preflight.payload.criteria.shouldAvoidFoods, ["mushrooms"]);
  assert.deepEqual(preflight.payload.criteria.preferAvoidFoods, ["onions"]);
  assert.deepEqual(preflight.payload.criteria.dietaryNeeds, ["vegetarian"]);
  const summary = assessLocalAiReadiness(preflight);
  assert.equal(summary.ready, true);
  assert.equal(summary.recipeCount, 3);
  assert.equal(summary.batchRecipeCounts.reduce((a, b) => a + b, 0), 3,
    "every imported recipe must be represented in the plan");
  assert.equal(summary.knownConflictExcludedCount, 1);
  assert.equal(summary.eligibleRecipeCount, 2);
  assert.ok(summary.batchCount >= 1 && summary.batchCount <= summary.maxBatches);
  assert.ok(summary.largestBatchBytes <= summary.perBatchInputLimitBytes);
  assert.ok(!JSON.stringify(summary).includes("LOCAL_ONLY_NOTES_123"));
  assert.ok(!JSON.stringify(summary).includes("PRIVATE_DINER_NAME_123"));
  assert.ok(!JSON.stringify(summary).includes("private-profile-id"));
  assert.ok(!JSON.stringify(summary).includes("lentils"));
  assert.ok(!("payload" in summary) && !("recipes" in summary));
  let result = assessLocalAiReadiness(prepareLocalPaprikaRequest([], criteria, diners, true));
  assert.equal(result.reason, "empty_library");
  result = assessLocalAiReadiness(prepareLocalPaprikaRequest(
    Array.from({ length: 41 }, (_, i) => recipe("item" + i)), criteria, diners, true));
  assert.equal(result.reason, "too_many_recipes");
  result = assessLocalAiReadiness(prepareLocalPaprikaRequest(
    [recipe("too-big", "lentils", "x".repeat(12_000))], criteria, diners, true));
  assert.equal(result.reason, "batch_plan_unavailable",
    "an oversized recipe cannot be silently truncated or dropped");
  result = assessLocalAiReadiness(prepareLocalPaprikaRequest(
    [recipe("excluded", "peanuts")], criteria, diners, true));
  assert.equal(result.reason, "batch_plan_unavailable",
    "do not offer AI plan when every recipe is an obvious Must avoid conflict");
  const many = Array.from({ length: 18 }, (_, i) =>
    recipe("r" + i, "rice, carrots", "Simmer and stir ".repeat(25)));
  const fullPlan = assessLocalAiReadiness(
    prepareLocalPaprikaRequest(many, criteria, diners, true));
  assert.equal(fullPlan.ready, true);
  assert.ok(fullPlan.batchCount > 1, "should exercise segmented full-library plan");
  assert.equal(fullPlan.batchRecipeCounts.reduce((a, b) => a + b, 0), many.length);
  console.log("Browser-only AI readiness: consent, full library, privacy, restrictions and fail-closed batch bounds passed");
} finally {
  await Promise.all(made.map(path => unlink(path).catch(() => {})));
}

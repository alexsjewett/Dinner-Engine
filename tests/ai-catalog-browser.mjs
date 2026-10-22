import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const suffix = ".catalog-fixture-" + process.pid + ".mjs";
const paths = [
  "backend/src/guardrails.ts", "backend/src/aiPilot.ts",
  "backend/src/paprikaContract.ts", "backend/src/paprikaModelDraft.ts",
  "src/services/aiPaprikaRequest.ts", "src/services/aiPaprikaReadiness.ts",
  "src/services/aiPaprikaCatalogReadiness.ts",
];
const made = [];
try {
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    if (path.endsWith("aiPaprikaCatalogReadiness.ts")) {
      assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/.test(source));
    }
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from "(\.[^"]+)"/g, (_, rel) => 'from "' + rel + suffix + '"');
    const dest = path.replace(/\.ts$/, suffix);
    await writeFile(dest, output, { flag: "wx" });
    made.push(dest);
  }
  const module = await import(pathToFileURL(process.cwd() +
    "/src/services/aiPaprikaCatalogReadiness" + suffix).href);
  const recipe = (i, ingredient = "rice, carrots", directions = "Cook.") => ({
    id: "fictional-" + i, paprikaUid: String(i), name: "Dish " + i,
    ingredients: ingredient, directions, description: "", notes: "private_note",
    servings: "2", prepTime: "5 min", cookTime: "20 min",
    totalTime: "25 min", source: "", sourceUrl: "", categories: ["Dinner"],
  });
  const criteria = { haveText: "rice", unavailableText: "", time: 45,
    dinerMode: "all", selectedProfileIds: [] };
  const diners = [{ id: "private-id", name: "private-name", householdId: "household",
    dietaryNeeds: [], foodRestrictions: [{ food: "peanuts", level: "must" }] }];
  const check = (n, data) => {
    const result = module.assessLocalCatalogReadiness(data, criteria, diners, true);
    assert.equal(result.ready, true, JSON.stringify(result));
    assert.equal(result.recipeCount, n);
    assert.equal(result.windowRecipeCounts.reduce((a,b) => a+b, 0), n);
    assert.equal(result.batchRecipeCounts.reduce((a,b) => a+b, 0), n);
    assert.equal(result.eligibleRecipeCount + result.knownConflictExcludedCount, n);
    assert.equal(result.liveAiEnabled, false);
    assert.ok(result.windowRecipeCounts.every(x => x <= 40));
    assert.ok(!JSON.stringify(result).includes("private_note"));
    return result;
  };
  check(8, Array.from({ length: 8 }, (_, i) => recipe(i)));
  check(38, Array.from({ length: 38 }, (_, i) => recipe(i)));
  assert.ok(check(50, Array.from({ length: 50 }, (_, i) => recipe(i))).windowCount > 1);
  assert.ok(check(100, Array.from({ length: 100 }, (_, i) => recipe(i))).windowCount > 1);
  check(200, Array.from({ length: 200 }, (_, i) => recipe(i)));
  assert.equal(module.assessLocalCatalogReadiness(
    Array.from({ length: 201 }, (_, i) => recipe(i)), criteria, diners, true)
    .reason, "too_many_catalog_recipes");
  assert.equal(module.assessLocalCatalogReadiness(
    [recipe(1), recipe(1)], criteria, diners, true).reason, "duplicate_recipe_ids");
  assert.equal(module.assessLocalCatalogReadiness(
    [recipe(1, "rice", "x".repeat(13000))], criteria, diners, true)
    .reason, "window_plan_unavailable");
  assert.equal(check(3, [recipe(1), recipe(2, "peanuts"), recipe(3)])
    .knownConflictExcludedCount, 1);
  console.log("Large offline catalog preparation: complete 8–200 recipe fixtures passed");
} finally {
  await Promise.all(made.map(path => unlink(path).catch(() => {})));
}

import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Everything is fictional. No user cookbook, paid provider or network calls.
const path = "backend/src/recipeRelevance";
const suffix = ".kitchen-relevance-" + process.pid + ".mjs";
const output = path + suffix;
try {
  const src = await readFile(path + ".ts", "utf8");
  assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage/.test(src));
  await writeFile(output, ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText, { flag: "wx" });
  const { screenRecipeForSearch, reviewAiAdjustments, hasIngredientTerm } =
    await import(pathToFileURL(process.cwd() + "/" + output).href);

  const burger = { name: "Vegan Tofu Burger",
    ingredients: "1 pound firm tofu\\n2 tsp oregano\\nflour\\nsalt" };
  const unavailable = screenRecipeForSearch(burger, ["broccoli"], ["tofu"]);
  assert.equal(unavailable.eligible, false, "never recommend explicitly unavailable tofu");
  assert.deepEqual(unavailable.missing, ["tofu"]);
  assert.deepEqual(unavailable.onHand, [], "do not invent a broccoli match");
  assert.equal(screenRecipeForSearch(burger, ["broccoli"], []).eligible, false,
    "a pantry search should not rank completely unrelated ingredients");
  assert.equal(screenRecipeForSearch(burger, [], ["tofu"]).eligible, false,
    "the unavailable ingredient is a hard exclusion even without on-hand foods");
  assert.equal(screenRecipeForSearch(burger, [], []).eligible, true,
    "an open-to-shopping search may show recipes without pantry matches");
  assert.equal(hasIngredientTerm("tofu burger", "tofu"), true);
  assert.equal(hasIngredientTerm("eggplant", "egg"), false,
    "a food name should not accidentally match a shorter word");
  assert.equal(screenRecipeForSearch({
    name: "Tofu Burger", ingredients: "1 cup vegetables\\nherbs",
  }, ["vegetables"], ["tofu"]).eligible, false,
    "the star ingredient in the recipe title is also an exclusion");

  assert.deepEqual(reviewAiAdjustments([{
    ingredientFrom: "oregano", ingredientTo: "broccoli",
    why: "Use broccoli instead of oregano",
  }], burger, ["broccoli"], ["tofu"], []), [],
  "an herb cannot become a vegetable merely because AI suggests it");
  assert.deepEqual(reviewAiAdjustments([{
    ingredientFrom: "tofu", ingredientTo: "broccoli", why: "Try this!",
  }], burger, ["broccoli"], ["tofu"], []), [],
  "protein-for-vegetable replacements must be rejected");

  const soup = { name: "Creamy Broccoli Soup",
    ingredients: "2 cups broccoli\\nvegetable stock\\nsalt" };
  const reviewed = reviewAiAdjustments([{
    ingredientFrom: "broccoli", ingredientTo: "cauliflower",
    why: "Magic nutrition claim that should not be shown",
  }], soup, ["cauliflower"], [], []);
  assert.equal(reviewed.length, 1, "conservative within-role swaps may appear");
  assert.match(reviewed[0].why, /listed cauliflower as available/);
  assert.ok(!reviewed[0].why.includes("Magic"), "never display ungrounded AI rationale");
  assert.equal(reviewAiAdjustments([{
    ingredientFrom: "broccoli", ingredientTo: "cauliflower", why: "Works",
  }], soup, ["cauliflower"], [], ["cauliflower"]).length, 0,
  "a Must-avoid ingredient must not be proposed as a replacement");
  assert.equal(reviewAiAdjustments([{
    ingredientFrom: "broccoli", ingredientTo: "cauliflower", why: "Works",
  }], soup, ["broccoli"], [], []).length, 0,
  "never suggest shopping for an unlisted replacement");
  assert.equal(reviewAiAdjustments([{
    ingredientFrom: "unlisted", ingredientTo: "cauliflower", why: "Works",
  }], soup, ["cauliflower"], [], []).length, 0,
  "never swap a made-up original ingredient");

  const ui = await readFile("src/pages/FindDinner.tsx", "utf8");
  assert.ok(ui.includes("eligibleForSearch(recipe, submitted, dinersForRequest)") &&
    ui.includes("eligibleNow.length === 0") &&
    ui.includes("AI was not called"), "browser must avoid paid AI for irrelevant recipes");
  assert.ok(ui.includes("reviewAiAdjustments(item.adjustments, recipe"),
    "browser must screen stale Worker swap suggestions as well");
  const model = await readFile("backend/src/paprikaModelDraft.ts", "utf8");
  assert.ok(model.includes("screenRecipeForSearch(recipe, payload.criteria.have"),
    "Worker must exclude irrelevant and unavailable recipes before model ranking");
  const worker = await readFile("backend/src/realPaprika.ts", "utf8");
  assert.ok(worker.indexOf("no_eligible_recipes") < worker.indexOf("reserve-paid-batch"),
    "empty eligibility must fail before billable batch reservations");
  const html = await readFile("index.html", "utf8");
  const app = await readFile("src/App.tsx", "utf8");
  assert.ok(html.includes("<title>Kitchen Companion</title>") &&
    app.includes('brand-name">Kitchen Companion'), "brand displays consistently");
  console.log("Kitchen Companion relevance, unavailability, safe swaps and brand tests passed");
} finally {
  await unlink(output).catch(() => {});
}

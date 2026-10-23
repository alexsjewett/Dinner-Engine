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
  assert.equal(screenRecipeForSearch(burger, ["broccoli"], []).eligible, true,
    "an on-hand ingredient is a ranking signal, not an exclusion rule");
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
  assert.match(reviewed[0].why, /listed as available/);
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


  const curry = { name: "Chickpea curry",
    ingredients: "1 cup dairy milk\n1 can chickpeas\ncurry paste", directions: "Simmer the curry." };
  const curryScreen = screenRecipeForSearch(curry, ["coconut milk"], [], ["milk"], ["vegan"]);
  assert.equal(curryScreen.eligible, true, "conventional plant-milk curry swap");
  assert.equal(curryScreen.adjustments[0]?.ingredientTo, "coconut milk");
  assert.equal(screenRecipeForSearch(curry, [], [], ["milk"], ["vegan"]).eligible, true,
    "a replacement can require shopping; on-hand is not mandatory");
  assert.equal(screenRecipeForSearch(curry, [], [], ["dairy"]).eligible, true,
    "a dairy-wide restriction recognizes a milk line and its practical curry swap");
  assert.equal(screenRecipeForSearch({ name: "Tofu stir fry",
    ingredients: "tofu\nrice" }, [], [], ["soy"]).eligible, false,
    "soy restriction must recognize tofu, not only the word soy");
  assert.equal(screenRecipeForSearch({ name: "Cashew pasta",
    ingredients: "cashews\npasta" }, [], [], ["tree nuts"]).eligible, false,
    "broad nut restrictions must catch named nuts");
  assert.equal(screenRecipeForSearch({ name: "Pasta",
    ingredients: "wheat flour\nwater" }, [], [], ["gluten"]).eligible, false,
    "broad gluten restrictions must catch wheat flour");
  const beans = { name: "Burrito bowl",
    ingredients: "1 can black beans\nrice\nlime", directions: "Heat the beans." };
  const beansScreen = screenRecipeForSearch(beans, [], ["black beans"]);
  assert.equal(beansScreen.eligible, true);
  assert.equal(beansScreen.adjustments[0]?.ingredientTo, "pinto beans");
  assert.equal(screenRecipeForSearch({ name: "Olive Tapenade",
    ingredients: "2 cups olives" }, [], [], ["olives"]).eligible, false);
  assert.equal(screenRecipeForSearch({ name: "Green salad",
    ingredients: "spinach\nolives (optional)" }, [], ["olives"]).adjustments[0]?.method, "omit");
  assert.equal(screenRecipeForSearch({ name: "Tomato marinara",
    ingredients: "tomatoes\nsalt" }, [], [], ["tomatoes"]).eligible, false);
  const quiche = { name: "Spinach quiche",
    ingredients: "4 eggs\nspinach\nsalt", directions: "Bake a quiche." };
  const quicheScreen = screenRecipeForSearch(quiche, [], [], [], ["vegan"]);
  assert.equal(quicheScreen.eligible, true);
  assert.equal(quicheScreen.adaptationTier, 4);
  assert.ok(curryScreen.adaptationTier < quicheScreen.adaptationTier,
    "a complicated tofu quiche is below a simple milk swap");
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
  const liveFlow = worker.slice(worker.indexOf("export async function runRealPaprika("));
  assert.ok(liveFlow.indexOf("no_eligible_recipes") < liveFlow.indexOf('callLedger(ledger, "reserve-paid-batch"'),
    "empty eligibility must fail before billable batch reservations");
  const html = await readFile("index.html", "utf8");
  const app = await readFile("src/App.tsx", "utf8");
  assert.ok(html.includes("<title>Kitchen Companion</title>") &&
    app.includes('brand-name">Kitchen Companion'), "brand displays consistently");
  console.log("Kitchen Companion relevance, unavailability, safe swaps and brand tests passed");
} finally {
  await unlink(output).catch(() => {});
}

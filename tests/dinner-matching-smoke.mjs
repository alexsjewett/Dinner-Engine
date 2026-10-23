import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Run the actual TypeScript matcher and demo rules with invented fixture data.
// Temporary ES modules are cleaned up after the test. No real recipes or
// profiles are fetched, and no new test framework is needed.
const sourceFiles = [
  "src/types/profile.ts",
  "src/data/recipeFacts.ts",
  "src/services/dinnerMatcher.ts",
  "src/services/importedDinnerMatcher.ts",
  "src/services/dinnerSuggestions.ts",
];
const suffix = ".smoke-" + process.pid + ".mjs";
const written = [];
try {
  for (const path of sourceFiles) {
    const source = await readFile(path, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from "(\.{1,2}\/[^"]+)"/g, (_match, relative) =>
      'from "' + relative + suffix + '"');
    const dest = path.replace(/\.ts$/, suffix);
    await writeFile(dest, compiled, { flag: "wx" });
    written.push(dest);
  }

  const { evaluateImportedRecipe, parseDurationMinutes } = await import(
    pathToFileURL("src/services/importedDinnerMatcher" + suffix).href);
  const { recommendDinners } = await import(
    pathToFileURL("src/services/dinnerMatcher" + suffix).href);
  const { recommendAllDinners } = await import(
    pathToFileURL("src/services/dinnerSuggestions" + suffix).href);

  const userRecipe = {
    id: "paprika:fixture1",
    paprikaUid: "fixture1",
    name: "Fictional Egg Bowl",
    ingredients: "2 eggs\n1 cup coconut milk\n1 tsp garlic powder\n1 eggplant",
    directions: "Combine.\nCook until done.",
    description: "A made-up test dish.",
    notes: "", servings: "4", prepTime: "10 min", cookTime: "20 mins",
    totalTime: "", source: "Fixture", sourceUrl: "", categories: [],
  };
  const unknownRecipe = {
    ...userRecipe, id: "paprika:fixture2", name: "Unknown-time Soup",
    ingredients: "2 potatoes\nolive oil",
    prepTime: "", cookTime: "", totalTime: "unknown",
  };
  const sampleRecipe = {
    id: "lemon-garlic-pasta", householdId: "demo", source: "sample",
    title: "Lemon Garlic Pasta", description: "Test", estimatedMinutes: 25,
    servings: 2, tags: [], ingredients: [], instructions: [],
  };
  const criteria = {
    haveText: "eggs, coconut milk",
    unavailableText: "coconut milk",
    time: 30, dinerMode: "all", selectedProfileIds: [],
  };
  const person = {
    id: "fictional-person", householdId: "demo", name: "Sample Person",
    dietaryNeeds: ["vegan"], foodRestrictions: [
      { food: "egg", level: "must" },
      { food: "garlic", level: "prefer" },
    ],
  };

  assert.equal(parseDurationMinutes("1 hr 20 mins"), 80);
  assert.equal(parseDurationMinutes("45 minutes"), 45);
  assert.equal(parseDurationMinutes("1h"), 60);
  assert.equal(parseDurationMinutes("30"), null, "no guessed units");
  assert.equal(parseDurationMinutes("unknown"), null);
  assert.equal(parseDurationMinutes("2 days"), null);

  const matches = evaluateImportedRecipe(userRecipe, criteria, [person]);
  assert.equal(matches.category, "review", "imported recipes never get safety clearance");
  assert.equal(matches.source, "imported");
  assert.match(matches.timeLabel, /10 min prep/);
  assert.ok(matches.onHand.some((value) => value.includes("eggs")));
  assert.ok(!matches.onHand.some((value) => value.includes("coconut milk")));
  assert.ok(matches.unavailable.some((value) => value.includes("coconut milk")), "unavailable wins");
  assert.ok(matches.reviewReasons.some((value) => value.includes("Must avoid")));
  assert.ok(matches.reviewReasons.some((value) => value.includes("Vegan")));
  assert.ok(matches.softNotes.some((value) => value.includes("Prefer to avoid")));
  assert.equal(userRecipe.ingredients, "2 eggs\n1 cup coconut milk\n1 tsp garlic powder\n1 eggplant");
  assert.deepEqual(matches.notMarkedOnHand,
    ["1 tsp garlic powder", "1 eggplant"],
    "show all ingredients not confirmed by the pantry entry");
  const openPantry = evaluateImportedRecipe(
    userRecipe, { ...criteria, haveText: "", unavailableText: "" }, []);
  assert.equal(openPantry.notMarkedOnHand.length, 4,
    "a blank pantry does not imply there are no other ingredients needed");
  const longRecipe = {
    ...userRecipe,
    ingredients: Array.from({ length: 14 }, (_, i) => "ingredient " + i).join("\\n"),
  };
  const longMatch = evaluateImportedRecipe(longRecipe,
    { ...criteria, haveText: "", unavailableText: "" }, []);
  assert.equal(longMatch.notMarkedOnHand.length, 14,
    "keep all original recipe lines for expandable ingredient list");


  const eggplantOnly = evaluateImportedRecipe({
    ...userRecipe, ingredients: "1 eggplant",
  }, { ...criteria, unavailableText: "", haveText: "egg" }, [person]);
  assert.ok(!eggplantOnly.onHand.length, "egg does not match eggplant");
  assert.ok(!eggplantOnly.reviewReasons.some((value) => value.includes("(Must avoid)")),
    "word boundaries avoid invented egg ingredient matches");
  assert.ok(eggplantOnly.reviewReasons.some((value) => value.includes("classified")),
    "lack of positive matches must never imply safety");

  const unknown = evaluateImportedRecipe(unknownRecipe, criteria, []);
  assert.equal(unknown.category, "review");
  assert.match(unknown.timeLabel, /Time unverified/);
  assert.ok(unknown.reviewReasons.some((reason) => reason.includes("cannot be verified")));

  const sampleOnly = recommendDinners([sampleRecipe], criteria, [person], 10);
  const combinedDemo = recommendAllDinners([], [sampleRecipe], criteria, [person], 10);
  assert.deepEqual(combinedDemo.map((item) => item.recipe.id),
    sampleOnly.map((item) => item.recipe.id), "no imports preserves sample ordering");
  assert.ok(combinedDemo.every((item) => item.source === "sample"));

  const mixed = recommendAllDinners(
    [userRecipe, unknownRecipe], [sampleRecipe], criteria, [person], 10);
  assert.deepEqual(mixed.map((item) => item.source), ["imported", "imported", "sample"],
    "my recipes appear ahead of samples");
  assert.equal(mixed[0].category, "review");
  assert.equal(recommendAllDinners([userRecipe], [sampleRecipe], criteria, [], 1)[0].source, "imported");
  assert.ok(recommendAllDinners([userRecipe], [sampleRecipe], criteria, [], 10).length <= 10);
  console.log("Imported dinner matching and sample regression tests passed");
} finally {
  await Promise.all(written.map((path) => unlink(path).catch(() => {})));
}

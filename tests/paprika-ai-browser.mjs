import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const suffix = ".paprika-preview-test-" + process.pid + ".mjs";
const backendPath = "backend/src/paprikaContract" + suffix;
const frontendPath = "src/services/aiPaprikaRequest" + suffix;
const backendSrc = await readFile("backend/src/paprikaContract.ts", "utf8");
const frontendSrc = await readFile("src/services/aiPaprikaRequest.ts", "utf8");
const pageSrc = await readFile("src/pages/FindDinner.tsx", "utf8");
assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon|OPENAI_API_KEY/.test(frontendSrc),
  "the local preflight must not transmit data");
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(pageSrc),
  "the recommendation UI must have no direct browser network calls");
assert.ok(!pageSrc.includes("Check full-library AI plan locally — no upload"),
  "the retired preparation panel must be absent from the dinner experience");
assert.ok(pageSrc.includes('role="switch"') &&
  pageSrc.includes('Use AI assistance') &&
  pageSrc.includes("Find Dinner Ideas"), "AI is an option on the single search form");
assert.ok(pageSrc.includes("prepareLocalPaprikaRequest(localRecipes, submitted, dinersForRequest, true)"),
  "each opted-in search must pass complete-library validation");
assert.ok(pageSrc.includes("askAiWithSecurePopup(prepared, AI_WORKER_ORIGIN)"),
  "only an explicit submit can initiate an authenticated request");
assert.ok(pageSrc.includes("aiBusy") && pageSrc.includes("AI is thinking"),
  "the original page displays progress during the request");
assert.ok(pageSrc.includes("DinnerResultCard") && pageSrc.includes("aiById"),
  "AI and deterministic matches reuse ordinary recipe cards");
assert.ok(!pageSrc.includes("AiDinnerCompanion") &&
  !pageSrc.includes("Full-library preparation check"),
  "do not show the obsolete second AI search interface");
const cardSrc = await readFile("src/components/DinnerResultCard.tsx", "utf8");
const detailsSrc = await readFile("src/pages/RecipeDetails.tsx", "utf8");
assert.ok(cardSrc.includes("Ingredient change to try") &&
  cardSrc.includes("ai.adjustments"), "cards must show generated recipe changes");
assert.ok(detailsSrc.includes("Ingredient change to try") &&
  detailsSrc.includes("suggestion.adjustments"), "details must show identical changes");
const popupSrc = await readFile("src/services/aiPopupBridge.ts", "utf8");
try {
  const compile = text => ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  await writeFile(backendPath, compile(backendSrc), { flag: "wx" });
  const front = compile(frontendSrc).replace(
    'from "../../backend/src/paprikaContract"',
    'from "../../backend/src/paprikaContract' + suffix + '"',
  );
  await writeFile(frontendPath, front, { flag: "wx" });
  const mod = await import(pathToFileURL(process.cwd() + "/" + frontendPath).href);
  const recipe = id => ({
    id, paprikaUid: null, name: "Example " + id, ingredients: "lentils",
    directions: "Simmer carefully", description: "Demo", notes: "private_note",
    servings: "4", prepTime: "5 min", cookTime: "20 min", totalTime: "25 min",
    source: "Paprika", sourceUrl: "https://example.test", categories: ["Dinner"],
  });
  const criteria = {
    haveText: "lentils, lentils", unavailableText: "eggs", time: 30,
    dinerMode: "selected", selectedProfileIds: ["internal-identity"],
  };
  const diners = [{
    id: "never-transmit-id", householdId: "never-transmit-household",
    name: "never-transmit-name", dietaryNeeds: ["gluten-free"],
    foodRestrictions: [
      { food: "peanuts", level: "must" },
      { food: "onions", level: "should" },
      { food: "mushrooms", level: "prefer" },
    ],
  }];
  assert.equal(mod.prepareLocalPaprikaRequest([recipe("a")], criteria, diners, false).reason,
    "consent_required");
  const made = mod.prepareLocalPaprikaRequest([recipe("a")], criteria, diners, true);
  assert.equal(made.ok, true);
  const serialized = JSON.stringify(made.payload);
  assert.equal(made.count, 1);
  assert.ok(made.bytes > 0);
  assert.ok(serialized.includes("private_note"));
  assert.ok(serialized.includes("Simmer carefully"));
  assert.ok(!serialized.includes("never-transmit"));
  assert.ok(!serialized.includes("internal-identity"));
  assert.deepEqual(made.payload.criteria.mustAvoidFoods, ["peanuts"]);
  assert.deepEqual(made.payload.criteria.shouldAvoidFoods, ["onions"]);
  assert.deepEqual(made.payload.criteria.preferAvoidFoods, ["mushrooms"]);
  assert.deepEqual(made.payload.criteria.dietaryNeeds, ["gluten-free"]);
  assert.deepEqual(made.payload.criteria.have, ["lentils"]);
  assert.equal(mod.prepareLocalPaprikaRequest([], criteria, [], true).reason, "empty_library");
  assert.equal(mod.prepareLocalPaprikaRequest(
    Array.from({length:41}, (_, i) => recipe("r"+i)), criteria, [], true,
  ).reason, "too_many_recipes");
  assert.equal(mod.prepareLocalPaprikaRequest(
    Array.from({length:30}, (_, i) => ({
      ...recipe("r"+i), directions: "x".repeat(4_000),
    })), criteria, [], true,
  ).reason, "request_too_large");
  assert.equal(mod.prepareLocalPaprikaRequest([
    { ...recipe("a"), directions: "x".repeat(24_001) },
  ], criteria, [], true).reason, "invalid_recipe_or_constraints");
  console.log("Local Paprika full-library request/consent and privacy tests passed");
} finally {
  await Promise.all([unlink(backendPath).catch(() => {}),
    unlink(frontendPath).catch(() => {})]);
}

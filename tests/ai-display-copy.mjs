import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// UI-only test with fictional recipe and AI copy. No network or paid API.
const output = "src/services/.ai-display-copy-" + process.pid + ".mjs";
try {
  const src = await readFile("src/services/aiRecommendationDisplay.ts", "utf8");
  await writeFile(output, ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText, { flag: "wx" });
  const { cleanAiNote, usefulAiNotes, isGenericAiDisclaimer } = await import(
    pathToFileURL(process.cwd() + "/" + output).href);

  const unwanted = [
    "Review the original recipe and all ingredient labels before making it.",
    "Review labels and the original recipe for dietary suitability and cross-contact.",
    "Verify pasta and all labels for gluten and allergens; safety is not guaranteed.",
    "Imported Paprika recipe: check all ingredients, labels and cross-contact.",
    "Check the full original recipe for dietary suitability.",
  ];
  assert.deepEqual(usefulAiNotes(unwanted), [],
    "all boilerplate examples must disappear from AI recommendation text");
  assert.ok(unwanted.every(isGenericAiDisclaimer));
  assert.equal(cleanAiNote(
    "This dish uses the broccoli you have. Review all ingredient labels before cooking."),
    "This dish uses the broccoli you have.",
    "keep the cooking reason without its repetitive second sentence");
  assert.deepEqual(usefulAiNotes([
    "This uses your fresh broccoli.",
    "Soy sauce contains wheat in many brands; consider tamari if appropriate.",
    "Review the original recipe before serving.",
  ]), [
    "This uses your fresh broccoli.",
    "Soy sauce contains wheat in many brands; consider tamari if appropriate.",
  ], "meaningful ingredient-specific notes must remain visible");

  const card = await readFile("src/components/DinnerResultCard.tsx", "utf8");
  const detail = await readFile("src/pages/RecipeDetails.tsx", "utf8");
  const matcher = await readFile("src/services/importedDinnerMatcher.ts", "utf8");
  assert.ok(card.includes("Other ingredients needed") &&
    card.includes("notMarkedOnHand.slice(0, 8)") &&
    card.includes("notMarkedOnHand.slice(8)") &&
    card.includes("Not confirmed on hand"),
    "recipe card must display available and remaining ingredients with an explanation");
  assert.ok(card.includes("usefulAiNotes(ai.cautions)") &&
    detail.includes("usefulAiNotes(suggestion.cautions)"),
    "card and recipe details must both omit repetitive AI caveats");
  assert.ok(matcher.includes("notMarkedOnHand,") &&
    !matcher.includes("notMarkedOnHand: notMarkedOnHand.slice(0, 8)"),
    "matcher must not silently truncate ingredient lines");
  console.log("AI copy cleanup, useful notes, and other-ingredients card checks passed");
} finally {
  await unlink(output).catch(() => {});
}

import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import ts from "typescript";
import { gzipSync, strToU8, zipSync } from "fflate";

// Transpile the real parser using the TypeScript compiler already in this app.
// Its type-only local import is removed; the compiled file resolves installed
// fflate from the repository root. No new test dependency is necessary.
const source = await readFile("src/services/paprikaImport.ts", "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const testModule = join(process.cwd(), ".paprika-smoke-" + process.pid + ".mjs");
let parsePaprikaFile;
try {
  await writeFile(testModule, code, { flag: "wx" });
  ({ parsePaprikaFile } = await import(pathToFileURL(testModule).href));
} finally {
  await unlink(testModule).catch(() => {});
}

const sourceRecipe = {
  uid: "test-recipe-abc",
  name: "Fictional Orange Soup",
  ingredients: "1 orange\n2 cups water",
  directions: "Boil water.\nAdd orange.",
  total_time: "",
  prep_time: "unknown",
  servings: "2 bowls",
  notes: "A fictional test.",
  source: "Test fixture",
  categories: ["Demo"],
  photo: "this would be a base64 photo in a real export",
};
const archived = zipSync({
  "a.paprikarecipe": gzipSync(strToU8(JSON.stringify(sourceRecipe))),
  "duplicate.paprikarecipe": gzipSync(strToU8(JSON.stringify(sourceRecipe))),
  "readme.txt": strToU8("Not a recipe"),
});
const result = await parsePaprikaFile(new File([archived], "fictional.paprikarecipes"));
assert.equal(result.recipes.length, 1, "deduplicates repeated Paprika UIDs");
assert.equal(result.skipped, 1, "warns about duplicate members");
assert.equal(result.recipes[0].id, "paprika:test-recipe-abc");
assert.equal(result.recipes[0].ingredients, sourceRecipe.ingredients, "preserves original ingredient newlines");
assert.equal(result.recipes[0].directions, sourceRecipe.directions, "preserves original directions");
assert.equal(result.recipes[0].totalTime, "", "does not invent a time");
assert.equal(result.recipes[0].prepTime, "unknown");
assert.equal(result.recipes[0].servings, "2 bowls");
assert.equal(result.recipes[0].source, "Test fixture");
assert.ok(!Object.hasOwn(result.recipes[0], "photo"), "never saves photos");

await assert.rejects(
  parsePaprikaFile(new File([archived], "fictional.html")),
  /Paprika Recipe Format/,
);
await assert.rejects(
  parsePaprikaFile(new File([strToU8("not a zip")], "bad.paprikarecipes")),
  /could not be opened/,
);
console.log("Paprika synthetic ZIP/GZIP import smoke tests passed");

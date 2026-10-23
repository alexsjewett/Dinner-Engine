import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Tab-local session behavior; no network, AI call, or real recipe data.
const output = "src/services/.ai-search-session-test-" + process.pid + ".mjs";
const storage = new Map();
globalThis.sessionStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};
try {
  const source = await readFile("src/services/aiSearchSession.ts", "utf8");
  await writeFile(output, ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText, { flag: "wx" });
  const { readAiSearchSession, saveAiSearchSession, emptyAiSearch } = await import(
    pathToFileURL(process.cwd() + "/" + output).href);
  const criteria = {
    haveText: "broccoli", unavailableText: "eggs", time: 30,
    dinerMode: "all", selectedProfileIds: [],
  };
  const idea = {
    recipeId: "recipe-1", explanation: "Use your broccoli.", cautions: [],
    adjustments: [{ ingredientFrom: "milk", ingredientTo: "oat milk",
      why: "A simple dairy-free swap", method: "substitute" }],
    requiresManualReview: true,
  };
  assert.deepEqual(readAiSearchSession(criteria), emptyAiSearch(),
    "first visit starts with an empty AI search");
  saveAiSearchSession({
    enabled: true, searched: true, suggestions: [idea], failure: "",
  }, criteria);
  assert.deepEqual(readAiSearchSession(criteria).suggestions, [idea],
    "reopening dinner results restores the AI ideas and recipe changes");
  assert.equal(readAiSearchSession(criteria).enabled, true,
    "the AI toggle remains selected when navigating back");
  assert.deepEqual(readAiSearchSession({ ...criteria, time: 45 }),
    emptyAiSearch(true), "different search criteria cannot reuse old ideas");
  assert.deepEqual(readAiSearchSession(null), emptyAiSearch(true),
    "empty searches never display a previous AI result");
  saveAiSearchSession({
    enabled: true, searched: true, suggestions: null,
    failure: "The provider was unavailable. No automatic retry.",
  }, criteria);
  assert.match(readAiSearchSession(criteria).failure, /No automatic retry/,
    "a previous AI failure is restored without making another request");
  const key = [...storage.keys()][0];
  storage.set(key, JSON.stringify({
    enabled: true, searched: true, failure: "",
    suggestions: [{ ...idea, adjustments: [{ ingredientFrom: "egg",
      ingredientTo: "unvalidated", why: "test", method: "not-a-method" }] }],
    submittedKey: JSON.stringify(criteria),
  }));
  assert.deepEqual(readAiSearchSession(criteria), emptyAiSearch(),
    "malformed stored substitutions never reach recipe cards");
  storage.set(key, "{broken json");
  assert.deepEqual(readAiSearchSession(criteria), emptyAiSearch(),
    "corrupt browser storage is ignored");
  const page = await readFile("src/pages/FindDinner.tsx", "utf8");
  assert.ok(page.includes("readAiSearchSession(search.submitted)") &&
    page.includes("saveAiSearchSession(aiState, search.submitted)") &&
    page.includes("setAiState(previous => ({ ...previous, suggestions: safe"),
    "successful AI results must survive the recipe detail route");
  console.log("AI dinner session restoration and stale-result protection passed");
} finally {
  delete globalThis.sessionStorage;
  await unlink(output).catch(() => {});
}

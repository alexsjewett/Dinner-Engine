import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = await readFile("backend/src/paprikaContract.ts", "utf8");
const worker = await readFile("backend/src/index.ts", "utf8");
assert.ok(!/fetch\s*\(|OPENAI_API_KEY|api\.openai\.com/.test(source),
  "Paprika contract cannot call a provider");
assert.ok(worker.includes('return reply(503, { error: "ai_pilot_disabled" })'),
  "production recommend endpoint must remain disabled");
const suffix = ".paprika-contract-test-" + process.pid + ".mjs";
const path = "backend/src/paprikaContract" + suffix;
try {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  await writeFile(path, compiled, { flag: "wx" });
  const mod = await import(pathToFileURL(process.cwd() + "/" + path).href);
  const recipe = id => ({
    id, paprikaUid: null, name: "Pasta " + id,
    ingredients: "tomatoes\npasta", directions: "Boil pasta",
    description: "", notes: "", servings: "2",
    prepTime: "10 min", cookTime: "10 min", totalTime: "20 min",
    source: "", sourceUrl: "", categories: ["Dinner"],
  });
  const criteria = {
    have: ["pasta"], unavailable: [], timeLimitMinutes: 30,
    mustAvoidFoods: [], dietaryNeeds: [],
  };
  const payload = {
    version: 2, scope: "full-paprika-library",
    consent: "explicit-per-request", recipes: [recipe("first")], criteria,
  };
  assert.equal(mod.validateFullPaprikaPayload(payload), true);
  assert.equal(mod.validateFullPaprikaPayload({ ...payload, extra: "unwanted" }), false);
  assert.equal(mod.validateFullPaprikaPayload({ ...payload, consent: false }), false);
  assert.equal(mod.validateFullPaprikaPayload({ ...payload, recipes: [] }), false);
  assert.equal(mod.validateFullPaprikaPayload({ ...payload,
    recipes: [recipe("dup"), recipe("dup")] }), false);
  assert.equal(mod.validateFullPaprikaPayload({ ...payload,
    recipes: Array.from({ length: 41 }, (_, i) => recipe("r" + i)) }), false);
  assert.equal(mod.validateFullPaprikaPayload({ ...payload,
    recipes: [{ ...recipe("first"), profiles: [{ name: "Do not include" }] }] }), false);
  assert.equal(mod.validateFullPaprikaPayload({ ...payload,
    criteria: { ...criteria, householdProfiles: ["private"] } }), false);
  assert.equal(mod.validateFullPaprikaPayload({ ...payload,
    criteria: { ...criteria, timeLimitMinutes: 500 } }), false);
  assert.equal(mod.validateFullPaprikaPayload({ ...payload,
    recipes: [{ ...recipe("first"), directions: "a".repeat(24_001) }] }), false);
  const many = Array.from({length: 30}, (_, i) => ({
    ...recipe("r" + i), directions: "a".repeat(4_000),
  }));
  assert.ok(new TextEncoder().encode(JSON.stringify({ ...payload,
    recipes: many })).length > mod.MAX_PAPRIKA_BODY_BYTES);
  assert.equal(mod.validateFullPaprikaPayload({ ...payload, recipes: many }), false);
  const request = (body, headers = {}) => new Request("https://example.test/a", {
    method: "POST", headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  assert.deepEqual(await mod.checkFullPaprikaBody(request(payload)), { ok: true });
  assert.deepEqual(await mod.checkFullPaprikaBody(request(payload, {
    "content-type": "text/plain" })), {
    ok: false, status: 415, error: "unsupported_media_type",
  });
  assert.deepEqual(await mod.checkFullPaprikaBody(request("{ invalid")), {
    ok: false, status: 400, error: "invalid_request",
  });
  assert.deepEqual(await mod.checkFullPaprikaBody(request("x".repeat(98_305))), {
    ok: false, status: 413, error: "payload_too_large",
  });
  assert.deepEqual(await mod.checkFullPaprikaBody(request(payload, {
    "content-length": "999999" })), {
    ok: false, status: 413, error: "payload_too_large",
  });
  assert.deepEqual(await mod.checkFullPaprikaBody(request(payload, {
    "content-length": "invalid" })), {
    ok: false, status: 400, error: "invalid_request",
  });
  console.log("Full Paprika library v2 limits, privacy boundaries, and streaming checks passed");
} finally {
  await unlink(path).catch(() => {});
}

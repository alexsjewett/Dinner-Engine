import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";
const suffix = ".ai-bridge-mock-" + process.pid + ".mjs";
const files = [
  "guardrails", "paidBudget", "paprikaContract", "aiPilot",
  "paprikaModelDraft", "recipeRelevance", "aiPilotOrchestrator", "openAiTransport",
  "pilotSynthetic", "realPaprika", "bridgePage", "usageLedger", "index",
];
const made = [];
let worker, UsageLedger;
try {
  for (const filename of files) {
    const path = "backend/src/" + filename + ".ts";
    const original = (await readFile(path, "utf8")).replace(
      'import { DurableObject } from "cloudflare:workers";',
      "class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }");
    const js = ts.transpileModule(original, { compilerOptions: {
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
    } }).outputText.replace(/from "(\.\/[^"]+)"/g, (_, rel) =>
      'from "' + rel + suffix + '"');
    const output = "backend/src/" + filename + suffix;
    await writeFile(output, js, { flag: "wx" });
    made.push(output);
  }
  worker = (await import(pathToFileURL(process.cwd() + "/backend/src/index" + suffix).href)).default;
  UsageLedger = (await import(pathToFileURL(process.cwd() + "/backend/src/usageLedger" + suffix).href)).UsageLedger;
} finally { await Promise.all(made.map(path => unlink(path).catch(() => {}))); }

const origin = "https://worker.example.test";
const owner = { access: { getIdentity: async () => ({ email: "owner@example.test" }) } };
const wrong = { access: { getIdentity: async () => ({ email: "wrong@example.test" }) } };
const base = { ALLOWED_EMAIL: "owner@example.test" };
let r = await worker.fetch(new Request(origin + "/api/ai/bridge/status"), base, owner);
assert.deepEqual(await r.json(), { service: "find-dinner-ai", enabled: false });
assert.equal((await worker.fetch(new Request(origin + "/api/ai/bridge"), base, wrong)).status, 403);
r = await worker.fetch(new Request(origin + "/api/ai/bridge"), base, owner);
assert.equal(r.status, 200);
const bridgeHtml = await r.text();
assert.ok(bridgeHtml.includes("secure AI connection"));
assert.ok(bridgeHtml.includes('id="heading"'));
assert.ok(bridgeHtml.includes('id="loader"'));
assert.ok(bridgeHtml.includes('aria-live="polite"'));
assert.ok(bridgeHtml.includes("prefers-reduced-motion"));
assert.ok(bridgeHtml.includes("this window will close automatically"));
r = await worker.fetch(new Request(origin + "/api/ai/bridge/client.js"), base, owner);
const bridgeJs = await r.text();
assert.ok(bridgeJs.includes("window.opener.postMessage"));
assert.ok(bridgeJs.includes("Finding your dinner ideas"));
assert.ok(bridgeJs.includes("This may take a moment"));
assert.ok(bridgeJs.includes("your AI suggestions are waiting".replace("your", "Your")));
assert.ok(bridgeJs.includes("checkOnly"));
assert.ok(bridgeJs.includes("window.close()"));
assert.ok(bridgeJs.includes("window.opener.focus()"));
assert.ok(bridgeJs.includes("real-paprika-opt-in"));
const payload = {
  version: 2, scope: "full-paprika-library", consent: "explicit-per-request",
  recipes: Array.from({length: 8}, (_, i) => ({
    id: "invented-" + i, paprikaUid: null, name: "Fake Recipe " + i,
    ingredients: "lentils carrots", directions: "Simmer",
    description: "", notes: "private_recipe_notes", servings: "2",
    prepTime: "5 min", cookTime: "25 min", totalTime: "30 min",
    source: "", sourceUrl: "", categories: [],
  })),
  criteria: { have: ["lentils"], unavailable: [], timeLimitMinutes: 45,
    mustAvoidFoods: [], shouldAvoidFoods: [], preferAvoidFoods: [], dietaryNeeds: [] },
};
const request = (headers = {}) => new Request(origin + "/api/ai/recommend", {
  method: "POST", headers: {
    "Content-Type": "application/json", Origin: origin,
    "X-Find-Dinner-Intent": "real-paprika-opt-in", ...headers,
  }, body: JSON.stringify(payload),
});
let req = request();
r = await worker.fetch(req, base, owner);
assert.equal(r.status, 503);
assert.equal(req.bodyUsed, false);
const map = new Map();
const ledger = new UsageLedger({ storage: {
  kv: { get: k => map.get(k), put: (k,v) => map.set(k,v) },
  transactionSync: fn => fn(),
} }, {});
const env = { ...base, AI_REAL_MODE: "enabled",
  OPENAI_API_KEY: "fake-unit-test-only-provider-key-1234567890123",
  USAGE_LEDGER: { getByName() { return { fetch: request => ledger.fetch(request) }; } },
};
req = request({ Origin: "https://untrusted.example" });
r = await worker.fetch(req, env, owner);
assert.equal(r.status, 403);
assert.equal(req.bodyUsed, false);
req = request();
r = await worker.fetch(req, env, wrong);
assert.equal(r.status, 403);
assert.equal(req.bodyUsed, false);
const previousFetch = globalThis.fetch;
let calls = 0;
try {
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(init.body);
    assert.equal(body.store, false);
    assert.deepEqual(body.reasoning, { effort: "none" });
    assert.equal(body.max_output_tokens, 700);
    const valid = body.text.format.schema.properties.suggestions.items.properties.recipeId.enum;
    return Response.json({ status: "completed",
      usage: { input_tokens: 377, output_tokens: 75 },
      output: [{ type: "message", content: [{ type: "output_text",
        text: JSON.stringify({ suggestions: [{
          recipeId: valid[0], explanation: "Fits the pantry", cautions: [],
          adjustments: [{ ingredientFrom: "lentils", ingredientTo: "beans",
            why: "A pantry alternative" }],
        }] }),
      }] }],
    });
  };
  r = await worker.fetch(request(), env, owner);
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.ok, true);
  assert.ok(data.suggestions.every(s => payload.recipes.some(x => x.id === s.recipeId)));
  assert.ok(data.suggestions.every(s => s.requiresManualReview));
  assert.ok(data.suggestions.every(s => (s.adjustments ?? []).length === 0),
    "do not forward the model's unapproved lentil-to-bean replacement");
  assert.ok(!JSON.stringify(data).includes("private_recipe_notes"));
  assert.ok(calls >= 1 && calls <= 10);
  assert.equal(map.get("paid:h:" + new Date().toISOString().slice(0,13)), calls);
  const priorCalls = calls;

  const mixed = { ...payload,
    recipes: payload.recipes.map((recipe, i) => ({
      ...recipe,
      ingredients: i === 0 ? "broccoli and rice" : "tofu oregano",
      directions: "Stir the mixture. ".repeat(58),
    })),
    criteria: { ...payload.criteria, have: ["broccoli"],
      unavailable: ["tofu"] },
  };
  const sparseRequest = new Request(origin + "/api/ai/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin,
      "X-Find-Dinner-Intent": "real-paprika-opt-in" },
    body: JSON.stringify(mixed),
  });
  r = await worker.fetch(sparseRequest, env, owner);
  assert.equal(r.status, 200,
    "one eligible broccoli recipe among excluded tofu recipes must be routable");
  const sparseReply = await r.json();
  assert.equal(sparseReply.ok, true);
  assert.equal(sparseReply.suggestions.length, 1,
    "anchor repetition cannot produce duplicate displayed recipes");
  assert.equal(sparseReply.suggestions[0].recipeId, "invented-0");
  assert.ok(calls > priorCalls);
  assert.equal(map.get("paid:h:" + new Date().toISOString().slice(0,13)), calls);
  // No billable call occurs if the hourly quota cannot cover this entire plan.
  const hourKey = "paid:h:" + new Date().toISOString().slice(0, 13);
  map.set(hourKey, 50);
  const beforeBlocked = calls;
  r = await worker.fetch(request(), env, owner);
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { error: "budget_hourly_limit_reached" });
  assert.equal(calls, beforeBlocked, "budget rejection must not reach OpenAI");
  assert.equal(map.get(hourKey), 50, "rejected batch must not mutate the limit");
  const beforeDisabled = calls;
  r = await worker.fetch(request(), { ...env, AI_REAL_MODE: "off" }, owner);
  assert.equal(r.status, 503);
  assert.equal(calls, beforeDisabled);
} finally { globalThis.fetch = previousFetch; }
console.log("Secure popup bridge, authentication, default-off real AI and mocked paid path passed");

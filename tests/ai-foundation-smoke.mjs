import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/**
 * Test real TypeScript Worker and Durable Object code with invented fixtures.
 * Cloudflare runtime's DurableObject base is replaced by a tiny inert Node
 * shim; this test cannot call a model or consume an account secret.
 */
const suffix = ".guardrail-smoke-" + process.pid + ".mjs";
const paths = [
  "backend/src/guardrails.ts",
  "backend/src/paidBudget.ts",
  "backend/src/paprikaContract.ts",
  "backend/src/aiPilot.ts",
  "backend/src/paprikaModelDraft.ts",
  "backend/src/aiPilotOrchestrator.ts",
  "backend/src/openAiTransport.ts",
  "backend/src/pilotSynthetic.ts",
  "backend/src/usageLedger.ts",
  "backend/src/index.ts",
];
const created = [];
let worker;
let UsageLedger;
let reserveTest;
let MAX_BODY_BYTES;
try {
  for (const path of paths) {
    const original = await readFile(path, "utf8");
    const source = original.replace(
      'import { DurableObject } from "cloudflare:workers";',
      "class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }",
    );
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from "(\.\/[^"]+)"/g, (_, relative) =>
      'from "' + relative + suffix + '"');
    const dest = path.replace(/\.ts$/, suffix);
    await writeFile(dest, compiled, { flag: "wx" });
    created.push(dest);
  }
  ({ default: worker } = await import(pathToFileURL(process.cwd() + "/backend/src/index" + suffix).href));
  ({ UsageLedger, reserveTest } = await import(pathToFileURL(process.cwd() + "/backend/src/usageLedger" + suffix).href));
  ({ MAX_BODY_BYTES } = await import(pathToFileURL(process.cwd() + "/backend/src/guardrails" + suffix).href));
} finally {
  await Promise.all(created.map((path) => unlink(path).catch(() => {})));
}

const config = JSON.parse(await readFile("backend/wrangler.json", "utf8"));
assert.equal(config.name, "dinner-engine-ai");
assert.equal(config.preview_urls, false);
assert.equal(config.main, "src/index.ts");
assert.deepEqual(config.durable_objects.bindings,
  [{ name: "USAGE_LEDGER", class_name: "UsageLedger" }]);
assert.deepEqual(config.exports.UsageLedger,
  { type: "durable-object", storage: "sqlite" });
assert.equal(config.vars?.AI_GUARDRAIL_MODE, undefined,
  "test mode must never auto-enable through public config");

const ownerEnv = { ALLOWED_EMAIL: "owner@example.test" };
const owner = { access: { getIdentity: async () => ({ email: "Owner@Example.Test" }) } };
const stranger = { access: { getIdentity: async () => ({ email: "other@example.test" }) } };
const health = "https://example.invalid/api/ai/health";
const recommend = "https://example.invalid/api/ai/recommend";
const guardrails = "https://example.invalid/api/ai/guardrails";
const good = {
  version: 1,
  recipes: [{
    id: "paprika:fake-1", title: "Fictional Carrot Pasta",
    ingredients: "2 carrots\n200 g pasta",
    directions: "Cook pasta. Mix with carrots.",
    minutes: 25,
  }],
  criteria: {
    have: ["carrots"], unavailable: ["cheese"], timeLimitMinutes: 30,
    dietaryNeeds: ["vegetarian"], avoidFoods: ["peanuts"],
  },
};
const post = (url, payload = good, contentType = "application/json") =>
  new Request(url, { method: "POST", headers: {
    "Content-Type": contentType,
    "Cf-Access-Jwt-Assertion": "forged-header-has-no-access",
    "Origin": "https://alexsjewett.github.io",
  }, body: JSON.stringify(payload) });

// Fake durable SQLite-backed KV with synchronous transactions (same API).
function storage() {
  const values = new Map();
  return {
    values,
    kv: {
      get: (key) => values.get(key),
      put: (key, val) => values.set(key, val),
    },
    transactionSync: (fn) => fn(),
  };
}
const persisted = storage();
const durable = new UsageLedger({ storage: persisted }, {});
const stub = {
  getByName(key) {
    assert.equal(key, "pilot-owner-v1");
    return { fetch: (request) => durable.fetch(request) };
  },
};
const testEnv = { ...ownerEnv, AI_GUARDRAIL_MODE: "test", USAGE_LEDGER: stub };

for (const [label, env, ctx] of [
  ["missing context", ownerEnv, undefined],
  ["missing email secret", {}, owner],
  ["different signed-in identity", ownerEnv, stranger],
  ["forged request header", ownerEnv, undefined],
  ["identity lookup threw", ownerEnv, { access: {
    getIdentity: async () => { throw Error("Unavailable"); },
  } }],
]) {
  for (const url of [health, guardrails, recommend]) {
    const req = url === health ? new Request(url) : post(url);
    const result = await worker.fetch(req, env, ctx);
    assert.equal(result.status, 403, label);
    assert.deepEqual(await result.json(), { error: "access_denied" });
    assert.equal(req.bodyUsed, false, "auth must reject before reading body");
    assert.equal(result.headers.get("Access-Control-Allow-Origin"), null);
  }
}

const status = await worker.fetch(new Request(health), ownerEnv, owner);
assert.equal(status.status, 200);
assert.deepEqual(await status.json(), {
  service: "find-dinner-ai", enabled: false, guardrails: "configured",
});
assert.equal(status.headers.get("Cache-Control"), "no-store");

let req = post(recommend);
let response = await worker.fetch(req, testEnv, owner);
assert.equal(response.status, 503);
assert.deepEqual(await response.json(), { error: "ai_pilot_disabled" });
assert.equal(req.bodyUsed, false, "real provider endpoint NEVER reads body");

req = post(guardrails);
response = await worker.fetch(req, ownerEnv, owner);
assert.equal(response.status, 503);
assert.deepEqual(await response.json(), { error: "guardrails_disabled" });
assert.equal(req.bodyUsed, false, "off switch prevents reading body");
response = await worker.fetch(post(guardrails), { ...ownerEnv, AI_GUARDRAIL_MODE: "true" }, owner);
assert.equal(response.status, 503, "only exact test mode can open nonbillable validation");
response = await worker.fetch(post(guardrails),
  { ...ownerEnv, AI_GUARDRAIL_MODE: "test" }, owner);
assert.equal(response.status, 503, "missing Durable Object binding must fail closed");

// 3B.2: fictional paid test stays disabled without exact runtime conditions.
const testPage = "https://example.invalid/api/ai/test";
const synthetic = "https://example.invalid/api/ai/test/synthetic";
const fictionalPost = (opts = {}) => new Request(synthetic, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Origin": "https://example.invalid",
    "X-Find-Dinner-Intent": "synthetic-test",
    ...(opts.headers ?? {}),
  },
  body: opts.body ?? JSON.stringify({ confirmed: true }),
});
const testHtml = await worker.fetch(new Request(testPage), ownerEnv, owner);
assert.equal(testHtml.status, 200);
const html = await testHtml.text();
assert.ok(html.includes("fictional lentil") || html.includes("invented lentil"));
assert.ok(html.includes("disabled"));
assert.ok(!html.includes("OPENAI_API_KEY"));
assert.equal((await worker.fetch(
  new Request("https://example.invalid/api/ai/test/client.js"), ownerEnv, owner
)).status, 200);
req = fictionalPost();
response = await worker.fetch(req, testEnv, owner);
assert.equal(response.status, 503);
assert.equal(req.bodyUsed, false, "synthetic test kill switch blocks before body read");
const testPilotEnv = {
  ...ownerEnv, AI_PILOT_MODE: "synthetic",
  OPENAI_API_KEY: "synthetic-api-key-for-offline-test-123456789",
  USAGE_LEDGER: {
    getByName(name) {
      assert.equal(name, "pilot-owner-v1");
      const ledger = new UsageLedger({ storage: storage() }, {});
      return { fetch: request => ledger.fetch(request) };
    },
  },
};
req = fictionalPost();
response = await worker.fetch(req, testPilotEnv, stranger);
assert.equal(response.status, 403);
assert.equal(req.bodyUsed, false, "wrong identity blocks paid calls");
for (const headers of [
  { Origin: "https://attacker.invalid" },
  { "X-Find-Dinner-Intent": "wrong" },
  { "Sec-Fetch-Site": "cross-site" },
]) {
  req = fictionalPost({ headers });
  response = await worker.fetch(req, testPilotEnv, owner);
  assert.equal(response.status, 403);
  assert.equal(req.bodyUsed, false, "cross-site or missing intent blocks before body read");
}
for (const body of ['{"confirmed":false}', '{"confirmed":true,"extra":1}',
  "not json", "x".repeat(140)]) {
  response = await worker.fetch(fictionalPost({ body }), testPilotEnv, owner);
  assert.equal(response.status, 400, "malformed synthetic confirmation rejected");
}
const originalFetch = globalThis.fetch;
let providerCalls = 0;
try {
  globalThis.fetch = async (url, init) => {
    providerCalls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(init.headers.Authorization,
      "Bearer " + testPilotEnv.OPENAI_API_KEY);
    assert.equal(JSON.parse(init.body).store, false);
    return Response.json({
      status: "completed",
      usage: { input_tokens: 1000, output_tokens: 100 },
      output: [{ type: "message", content: [{ type: "output_text",
        text: JSON.stringify({ suggestions: [{
          recipeId: "fictional-lentil-skillet",
          explanation: "Synthetic demonstration only",
          cautions: [],
        }] }),
      }] }],
    });
  };
  response = await worker.fetch(fictionalPost(), testPilotEnv, owner);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.ok, true);
  assert.equal(result.testOnly, true);
  assert.equal(result.requiresManualReview, true);
  assert.equal(result.recipeId, "fictional-lentil-skillet");
  assert.equal(providerCalls, 1);
  req = post(recommend);
  response = await worker.fetch(req, testPilotEnv, owner);
  assert.equal(response.status, 503);
  assert.equal(req.bodyUsed, false, "real Paprika endpoint stays disabled");
  assert.equal(providerCalls, 1);
} finally {
  globalThis.fetch = originalFetch;
}

const badInputs = [
  [{ ...good, version: 2 }, 400],
  [{ ...good, dangerous: "model override" }, 400],
  [{ ...good, recipes: [] }, 400],
  [{ ...good, recipes: [...good.recipes, ...good.recipes] }, 400],
  [{ ...good, recipes: Array.from({ length: 6 }, (_, i) => ({ ...good.recipes[0], id: String(i) })) }, 400],
  [{ ...good, recipes: [{ ...good.recipes[0], title: "" }] }, 400],
  [{ ...good, recipes: [{ ...good.recipes[0], ingredients: "a".repeat(2001) }] }, 400],
  [{ ...good, recipes: [{ ...good.recipes[0], minutes: "30" }] }, 400],
  [{ ...good, criteria: { ...good.criteria, timeLimitMinutes: 100 } }, 400],
  [{ ...good, criteria: { ...good.criteria, model: "user-selected" } }, 400],
  [{ ...good, criteria: { ...good.criteria, have: Array(21).fill("carrots") } }, 400],
];
for (const [payload, expected] of badInputs) {
  const result = await worker.fetch(post(guardrails, payload), testEnv, owner);
  assert.equal(result.status, expected);
  assert.equal((await result.json()).error, "invalid_request");
}
response = await worker.fetch(post(guardrails, good, "text/plain"), testEnv, owner);
assert.equal(response.status, 415);
response = await worker.fetch(new Request(guardrails, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: "{not valid json",
}), testEnv, owner);
assert.equal(response.status, 400);
response = await worker.fetch(new Request(guardrails, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify(good) + " ".repeat(MAX_BODY_BYTES + 1),
}), testEnv, owner);
assert.equal(response.status, 413, "oversize body must be rejected");
assert.equal(persisted.values.size, 0, "invalid payloads never reserve a quota");

response = await worker.fetch(post(guardrails), testEnv, owner);
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), {
  accepted: true, testOnly: true, providerConnected: false,
});
assert.equal(persisted.values.size, 4, "only anonymous counters stored (hour/day/month/cent)");
assert.ok(!JSON.stringify([...persisted.values]).includes("carrots"),
  "recipe content is never stored in ledger");

const calls = await Promise.all(Array.from({ length: 25 }, () =>
  worker.fetch(post(guardrails), testEnv, owner)));
assert.equal(calls.filter((r) => r.status === 200).length, 9,
  "hourly allowance must remain atomic under concurrent test requests");
assert.equal(calls.filter((r) => r.status === 429).length, 16);
assert.equal((await calls.find((r) => r.status === 429).json()).error, "limit_reached");

// Test persistence across class construction, monthly rollovers and simulated
// reservation costs without ever calling a provider or storing a person.
const durable2 = new UsageLedger({ storage: persisted }, {});
assert.equal((await durable2.fetch(new Request("https://internal/reserve-test", {
  method: "POST",
}))).status, 429, "ledger state must survive instance recreation");
assert.equal((await durable2.fetch(new Request("https://internal/no"))).status, 404);

const paidStorage = storage();
const paidLedger = new UsageLedger({ storage: paidStorage }, {});
const paidUrl = "https://internal/reserve-paid-preflight";
for (let i = 0; i < 10; i++) {
  assert.equal((await paidLedger.fetch(new Request(paidUrl, { method: "POST" }))).status, 200);
}
assert.equal((await paidLedger.fetch(new Request(paidUrl, { method: "POST" }))).status, 429);
assert.equal(paidStorage.values.get("paid:usd:" + new Date().toISOString().slice(0, 7)), 15000);
assert.equal((await new UsageLedger({ storage: paidStorage }, {}).fetch(
  new Request(paidUrl, { method: "POST" }))).status, 429);
assert.equal((await paidLedger.fetch(new Request(paidUrl))).status, 404);
const lifecycleStorage = storage();
const lifecycle = new UsageLedger({ storage: lifecycleStorage }, {});
const internalPost = (path, payload) => new Request("https://internal/" + path, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const requestId = "server_only_request_00001";
assert.equal((await lifecycle.fetch(internalPost("reserve-paid-id", { requestId }))).status, 200);
assert.equal((await lifecycle.fetch(internalPost("reserve-paid-id", { requestId }))).status, 409);
assert.equal((await lifecycle.fetch(internalPost("settle-paid-id",
  { requestId, actualMicroUsd: 400 }))).status, 200);
assert.equal((await lifecycle.fetch(internalPost("settle-paid-id",
  { requestId, actualMicroUsd: 400 }))).status, 409);
assert.equal(lifecycleStorage.values.get("paid:usd:" +
  new Date().toISOString().slice(0, 7)), 400);
assert.equal((await lifecycle.fetch(internalPost("settle-paid-id",
  { requestId: "missing_request_00001", actualMicroUsd: 10 }))).status, 409);
assert.equal((await lifecycle.fetch(internalPost("reserve-paid-id",
  { requestId: "bad" }))).status, 400);
const longTerm = storage();
const base = Date.parse("2026-10-01T00:00:00Z");
for (let i = 0; i < 100; i++) {
  assert.deepEqual(reserveTest(longTerm, base + i * 3_600_000), { allowed: true });
}
assert.deepEqual(reserveTest(longTerm, base + 100 * 3_600_000),
  { allowed: false, reason: "limit_reached" }, "monthly money/volume cap");
assert.equal(longTerm.values.get("c:2026-10"), 1000);
assert.deepEqual(reserveTest(longTerm, Date.parse("2026-11-01T00:00:00Z")),
  { allowed: true }, "new month starts fresh");
longTerm.values.set("m:2026-11", "bad");
assert.throws(() => reserveTest(longTerm, Date.parse("2026-11-01T01:00:00Z")),
  /Corrupt usage counter/, "corrupt quota must fail closed");

const brokenStub = { getByName: () => ({ fetch: async () => { throw Error("offline"); } }) };
response = await worker.fetch(post(guardrails),
  { ...testEnv, USAGE_LEDGER: brokenStub }, owner);
assert.equal(response.status, 503);
assert.equal((await response.json()).error, "guardrails_unavailable");
assert.equal((await worker.fetch(new Request("https://example.invalid/other"), testEnv, owner)).status, 404);
console.log("3A.2 nonbillable request validation, kill switch and durable quota tests passed");

import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Exercise the actual Cloudflare Worker without deploying or using any accounts.
const source = await readFile("backend/src/index.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const location = ".ai-foundation-smoke-" + process.pid + ".mjs";
let worker;
try {
  await writeFile(location, compiled, { flag: "wx" });
  ({ default: worker } = await import(pathToFileURL(process.cwd() + "/" + location).href));
} finally {
  await unlink(location).catch(() => {});
}

const config = JSON.parse(await readFile("backend/wrangler.json", "utf8"));
assert.equal(config.name, "dinner-engine-ai");
assert.equal(config.main, "src/index.ts");
assert.equal(config.preview_urls, false);
assert.ok(config.compatibility_date);

const allowed = { ALLOWED_EMAIL: "owner@example.test" };
const trusted = { access: { getIdentity: async () => ({ email: "owner@example.test" }) } };
const caseInsensitive = { access: { getIdentity: async () => ({ email: "Owner@Example.Test" }) } };
const denied = { access: { getIdentity: async () => ({ email: "stranger@example.test" }) } };
const noEmail = { access: { getIdentity: async () => ({ name: "Synthetic Tester" }) } };
const nullIdentity = { access: { getIdentity: async () => null } };
const broken = { access: { getIdentity: async () => { throw Error("Access unavailable"); } } };
const malformed = { access: { getIdentity: null } };
const healthURL = "https://example.invalid/api/ai/health";
const recommendURL = "https://example.invalid/api/ai/recommend";

const fixture = () => new Request(recommendURL, {
  method: "POST", headers: {
    "Content-Type": "application/json",
    "Cf-Access-Jwt-Assertion": "forged-token-should-not-work",
    "Origin": "https://alexsjewett.github.io",
  },
  body: JSON.stringify({ ingredients: "fictional potatoes, synthetic carrots" }),
});

for (const [label, env, ctx] of [
  ["no Access context", allowed, undefined],
  ["malformed Access context", allowed, malformed],
  ["wrong identity", allowed, denied],
  ["no allowlist", {}, trusted],
  ["blank allowlist", { ALLOWED_EMAIL: " " }, trusted],
  ["invalid allowlist", { ALLOWED_EMAIL: "not_an_email" }, trusted],
  ["identity lookup failed", allowed, broken],
  ["missing email", allowed, noEmail],
  ["null identity", allowed, nullIdentity],
]) {
  // Every failing health and recommendation request is denied identically.
  const health = await worker.fetch(new Request(healthURL), env, ctx);
  assert.equal(health.status, 403, label);
  assert.deepEqual(await health.json(), { error: "access_denied" }, label);

  const request = fixture();
  const response = await worker.fetch(request, env, ctx);
  assert.equal(response.status, 403, label);
  assert.deepEqual(await response.json(), { error: "access_denied" }, label);
  assert.equal(request.bodyUsed, false, label + " must not read body");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
}

for (const identity of [trusted, caseInsensitive]) {
  const health = await worker.fetch(new Request(healthURL), allowed, identity);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { service: "find-dinner-ai", enabled: false });
  assert.equal(health.headers.get("Cache-Control"), "no-store");
  assert.equal(health.headers.get("X-Content-Type-Options"), "nosniff");
}

const request = fixture();
const result = await worker.fetch(request, allowed, trusted);
assert.equal(result.status, 503);
assert.equal((await result.json()).error, "ai_pilot_disabled");
assert.equal(request.bodyUsed, false, "even authorized requests cannot read recipe data");
assert.equal(result.headers.get("Access-Control-Allow-Origin"), null);

assert.equal((await worker.fetch(new Request(recommendURL), allowed, trusted)).status, 404);
assert.equal((await worker.fetch(new Request("https://example.invalid/other"), allowed, trusted)).status, 404);
console.log("AI authorization regression tests passed; no diagnostic disclosures or recipe body reads");

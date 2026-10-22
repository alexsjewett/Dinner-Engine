import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Compile and exercise the exact Worker that would be deployed by Cloudflare.
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
assert.equal(config.preview_urls, false, "no publicly reachable preview URL");
assert.ok(config.compatibility_date, "deployment requires an explicit runtime compatibility date");

const allowed = { ALLOWED_EMAIL: "owner@example.test" }; // synthetic; no personal identity in tests
const trusted = { access: { getIdentity: async () => ({ email: "owner@example.test" }) } };
const denied = { access: { getIdentity: async () => ({ email: "stranger@example.test" }) } };
const broken = { access: { getIdentity: async () => { throw Error("Access unavailable"); } } };
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
  ["no identity", allowed, undefined],
  ["wrong identity", allowed, denied],
  ["no allowlist", {}, trusted],
  ["empty allowlist", { ALLOWED_EMAIL: " " }, trusted],
  ["identity lookup exception", allowed, broken],
]) {
  const request = fixture();
  const response = await worker.fetch(request, env, ctx);
  assert.equal(response.status, 403, label);
  assert.equal((await response.json()).error, "access_denied");
  assert.equal(request.bodyUsed, false, label + " must not read body");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
}

const health = await worker.fetch(new Request(healthURL), allowed, trusted);
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { service: "find-dinner-ai", enabled: false });
assert.equal(health.headers.get("Cache-Control"), "no-store");

const request = fixture();
const result = await worker.fetch(request, allowed, trusted);
assert.equal(result.status, 503);
assert.equal((await result.json()).error, "ai_pilot_disabled");
assert.equal(request.bodyUsed, false, "authenticated requests still cannot read recipe data");
assert.equal(result.headers.get("Access-Control-Allow-Origin"), null);

assert.equal((await worker.fetch(new Request(recommendURL), allowed, trusted)).status, 404);
assert.equal((await worker.fetch(new Request("https://example.invalid/other"), allowed, trusted)).status, 404);
console.log("AI foundation checks passed: exact-user Access required; billing disabled; recipe bodies never read");

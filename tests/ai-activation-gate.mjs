import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(path, "utf8");
const [worker, browser, catalog, pilot, quota, config] = await Promise.all([
  read("backend/src/index.ts"),
  read("src/pages/FindDinner.tsx"),
  read("src/services/aiPaprikaCatalogReadiness.ts"),
  read("backend/src/pilotSynthetic.ts"),
  read("backend/src/paidBudget.ts"),
  read("backend/wrangler.json"),
]);
// These are deliberate rollout boundaries, not substitutes for auth testing.
const route = worker.indexOf('url.pathname === "/api/ai/recommend"');
assert.ok(route >= 0, "real Paprika route must stay visible and explicitly blocked");
const region = worker.slice(route, route + 350);
assert.ok(region.includes('if (!realPaprikaReady(env)) return reply(503, { error: "ai_pilot_disabled" });'),
  "real recipes must be disabled by a separate exact runtime switch");
assert.ok(region.indexOf("ai_pilot_disabled") < region.indexOf("readFullPaprikaBody"),
  "disabled real route must return before reading any recipe body");
assert.ok(worker.includes("ctx.access.getIdentity()"),
  "never remove trusted Cloudflare identity lookup");
assert.ok(worker.includes('typeof identity?.email === "string"'),
  "exact verified owner allowlist must remain");
assert.ok(!/Access-Control-Allow-Origin.*\*/.test(worker),
  "no wildcard cross-origin permission");
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(browser),
  "Github Pages must not transmit Paprika data by default");
assert.ok(browser.includes("AiDinnerCompanion"),
  "real-recipe AI uses the explicit user-consent component");
assert.ok(!JSON.stringify(config).includes("AI_REAL_MODE"),
  "repository must never activate the protected real endpoint by default");
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(catalog),
  "local 200-recipe planner must not send requests");
assert.ok(catalog.includes("MAX_LOCAL_CATALOG_RECIPES = 200"));
assert.ok(pilot.includes("fictional-lentil-skillet") &&
  pilot.includes("syntheticPilotReady"),
  "paid testing uses a fixed fictional fixture only");
assert.ok(quota.includes("hourly: 10") && quota.includes("daily: 40") &&
  quota.includes("monthly: 100"));
assert.ok(quota.includes("monthlyMicroUsd: 5_000_000") &&
  quota.includes("perRequestMicroUsd: 1_500"),
  "do not silently raise server-enforced spending limits");
const wrangler = JSON.parse(config);
assert.ok(!JSON.stringify(wrangler).includes("OPENAI_API_KEY"),
  "API key must not be in repository runtime configuration");
assert.ok(!/AI_PILOT_MODE.*real/i.test(JSON.stringify(wrangler)),
  "billable full-library mode must not be deployed");
console.log("Real Paprika activation remains default-off, gated by owner identity and $5 budget.");

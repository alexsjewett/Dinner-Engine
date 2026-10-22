import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

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

const health = await worker.fetch(new Request("https://example.invalid/api/ai/health"));
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { service: "find-dinner-ai", enabled: false });

const request = new Request("https://example.invalid/api/ai/recommend", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ingredients: "fictional sample - no data should leave" }),
});
const response = await worker.fetch(request);
assert.equal(response.status, 503);
assert.equal((await response.json()).error, "ai_pilot_disabled");
assert.equal(response.headers.get("Cache-Control"), "no-store");
assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
assert.equal(request.bodyUsed, false, "no request body read while disabled");
assert.equal(
  (await worker.fetch(new Request("https://example.invalid/api/ai/recommend"))).status,
  404,
);
assert.equal(
  (await worker.fetch(new Request("https://example.invalid/unknown"))).status,
  404,
);
console.log("AI foundation checks passed: endpoint disabled, body unread and no permissive CORS");

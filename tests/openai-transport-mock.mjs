import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const suffix = ".openai-mock-test-" + process.pid + ".mjs";
const paths = [
  "backend/src/guardrails.ts", "backend/src/aiPilot.ts",
  "backend/src/paprikaContract.ts", "backend/src/paprikaModelDraft.ts",
  "backend/src/openAiTransport.ts",
];
const worker = await readFile("backend/src/index.ts", "utf8");
assert.ok(!worker.includes('from "./openAiTransport"'),
  "live Worker must not import provider transport in 3B.1");
assert.ok(worker.includes('return reply(503, { error: "ai_pilot_disabled" })'));
const made = [];
try {
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from "(\.\/[^"]+)"/g, (_, rel) =>
      'from "' + rel + suffix + '"');
    const output = path.replace(/\.ts$/, suffix);
    await writeFile(output, compiled, { flag: "wx" });
    made.push(output);
  }
  const importFrom = base => import(pathToFileURL(
    process.cwd() + "/backend/src/" + base + suffix).href);
  const { stagePaprikaModelRequest } = await importFrom("paprikaModelDraft");
  const { callStagedOpenAi, PROVIDER_URL } = await importFrom("openAiTransport");
  const recipe = {
    id: "fictional-recipe", paprikaUid: null, name: "Test Beans",
    ingredients: "beans, water", directions: "Cook beans",
    description: "", notes: "", servings: "2",
    prepTime: "10 min", cookTime: "15 min", totalTime: "25 min",
    source: "", sourceUrl: "", categories: ["Dinner"],
  };
  const payload = {
    version: 2, scope: "full-paprika-library",
    consent: "explicit-per-request", recipes: [recipe],
    criteria: {
      have: ["beans"], unavailable: [], timeLimitMinutes: 30,
      mustAvoidFoods: [], shouldAvoidFoods: [],
      preferAvoidFoods: [], dietaryNeeds: [],
    },
  };
  const draft = stagePaprikaModelRequest(payload);
  assert.ok(draft);
  const key = "synthetic-key-never-used-live-123456";
  let calls = 0;
  const good = {
    status: "completed",
    usage: { input_tokens: 1100, output_tokens: 100 },
    output: [{ type: "message", content: [{
      type: "output_text", text: JSON.stringify({ suggestions: [{
        recipeId: "fictional-recipe", explanation: "Convenient", cautions: [],
      }] }),
    }] }],
  };
  const mock = async (url, init) => {
    calls++;
    assert.equal(url, PROVIDER_URL);
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "Bearer " + key);
    assert.equal(init.headers["Content-Type"], "application/json");
    assert.equal(JSON.parse(init.body).store, false);
    assert.equal(JSON.parse(init.body).model, "gpt-6-luna");
    return Response.json(good);
  };
  assert.deepEqual(await callStagedOpenAi(draft, key, mock), good);
  assert.equal(calls, 1);
  assert.equal(await callStagedOpenAi(draft, "too-short", mock), null);
  assert.equal(calls, 1, "invalid secret never invokes provider");
  assert.equal(await callStagedOpenAi(draft, key, async () =>
    new Response("failed", { status: 500 })), null);
  assert.equal(await callStagedOpenAi(draft, key, async () =>
    new Response("{not-json", { status: 200 })), null);
  assert.equal(await callStagedOpenAi(draft, key, async () =>
    new Response("x".repeat(24_577), { status: 200 })), null);
  assert.equal(await callStagedOpenAi(draft, key, async () => {
    throw Error("simulated network failure");
  }), null);
  assert.equal(await callStagedOpenAi({ ...draft, request: {
    ...draft.request, model: "other-model",
  } }, key, mock), null);
  assert.equal(calls, 1);
  const diagnosed = [];
  const report = code => diagnosed.push(code);
  const noReasoning = { ...draft, request: {
    ...draft.request, reasoning: { effort: "none" },
  } };
  const captured = [];
  await callStagedOpenAi(noReasoning, key, async (_url, init) => {
    captured.push(JSON.parse(init.body));
    return Response.json(good);
  }, report);
  assert.deepEqual(captured[0].reasoning, { effort: "none" });
  assert.equal(captured[0].max_output_tokens, 700);
  assert.equal(captured[0].store, false);
  assert.deepEqual(diagnosed, []);
  assert.equal(await callStagedOpenAi({ ...draft, request: {
    ...draft.request, reasoning: { effort: "medium" },
  } }, key, mock, report), null);
  assert.equal(diagnosed.pop(), "provider_preflight_rejected");
  assert.equal(calls, 1, "wrong reasoning effort must not reach provider");
  assert.equal(await callStagedOpenAi(draft, key, async () =>
    new Response("untrusted error body", { status: 401 }), report), null);
  assert.equal(diagnosed.pop(), "provider_auth_failed");
  assert.equal(await callStagedOpenAi(draft, key, async () =>
    new Response("untrusted error body", { status: 429 }), report), null);
  assert.equal(diagnosed.pop(), "provider_rate_limited");
  assert.equal(await callStagedOpenAi(draft, key, async () =>
    new Response("not-json", { status: 200 }), report), null);
  assert.equal(diagnosed.pop(), "provider_invalid_response");
  assert.equal(await callStagedOpenAi(draft, key, async () =>
    { throw Error("private test network error"); }, report), null);
  assert.equal(diagnosed.pop(), "provider_network_error");
  console.log("Injected-provider transport: no live calls, bounded errors, safe diagnostics and no-reasoning cap passed");
} finally {
  await Promise.all(made.map(path => unlink(path).catch(() => {})));
}

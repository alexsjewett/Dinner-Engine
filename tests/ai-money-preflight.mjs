import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";
const source = await readFile("backend/src/paidBudget.ts", "utf8");
const out = "backend/src/paidBudget.money-test-" + process.pid + ".mjs";
try {
  await writeFile(out, ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  } }).outputText, { flag: "wx" });
  const { reservePaidBudget, PAID_LIMITS, safeReconciledAmount } =
    await import(pathToFileURL(process.cwd() + "/" + out).href);
  const map = new Map();
  const storage = { kv: { get: key => map.get(key), put: (key, value) => map.set(key, value) },
    transactionSync: fn => fn() };
  const now = Date.parse("2026-10-22T13:00:00Z");
  assert.equal(PAID_LIMITS.monthlyMicroUsd, 5_000_000);
  assert.equal(PAID_LIMITS.perRequestMicroUsd, 1_500);
  const attempts = await Promise.all(Array.from({ length: 30 },
    async () => reservePaidBudget(storage, now)));
  assert.equal(attempts.filter(Boolean).length, 10);
  assert.equal(map.get("paid:usd:2026-10"), 15_000);
  assert.equal(reservePaidBudget(storage, now), false);
  assert.equal(reservePaidBudget(storage, now + 3_600_000), true);
  assert.equal(safeReconciledAmount(-1), null);
  assert.equal(safeReconciledAmount(1_501), null);
  assert.equal(safeReconciledAmount(1_500), 1_500);
  map.set("paid:usd:2026-10", 4_999_000);
  assert.equal(reservePaidBudget(storage, now + 7_200_000), false,
    "monthly dollar ceiling blocks a reservation");
  map.set("paid:usd:2026-10", "corrupt");
  assert.throws(() => reservePaidBudget(storage, now + 7_200_000), /ledger_corrupt/);
  console.log("3B.1 staged money reservation tests passed");
} finally { await unlink(out).catch(() => {}); }

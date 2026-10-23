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
  const { reservePaidBudget, reservePaidBatch, PAID_LIMITS, safeReconciledAmount, reserveRequest, settleRequest } =
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
  const persistent = new Map();
  const money = { kv: { get: k => persistent.get(k), put: (k,v) => persistent.set(k,v) },
    transactionSync: fn => fn() };
  const id = "server_generated_id_000001";
  assert.equal(reserveRequest(money, now, id), "reserved");
  assert.equal(reserveRequest(money, now, id), "duplicate");
  assert.equal(persistent.get("paid:usd:2026-10"), 1500);
  assert.equal(settleRequest(money, id, 400), "settled");
  assert.equal(persistent.get("paid:usd:2026-10"), 400);
  assert.equal(settleRequest(money, id, 400), "duplicate");
  assert.equal(settleRequest(money, "missing_request_00001", 400), "invalid");
  assert.equal(reserveRequest(money, now, "second_request_00001"), "reserved");
  assert.equal(persistent.get("paid:usd:2026-10"), 1900,
    "unknown outcome retains full reserved amount");
  assert.equal(settleRequest(money, "second_request_00001", 1501), "invalid");
  assert.equal(persistent.get("paid:usd:2026-10"), 1900);
  assert.throws(() => reserveRequest(money, now, "bad"), /invalid_request_id/);
  const burst = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    Promise.resolve(reserveRequest(money, now, "concurrent_request_" + String(i).padStart(6, "0")))));
  assert.equal(burst.filter(x => x === "reserved").length, 8);
  assert.equal(burst.filter(x => x === "limited").length, 12);
  const batchMap = new Map();
  const batchStorage = {
    kv: { get: key => batchMap.get(key), put: (key, value) => batchMap.set(key, value) },
    transactionSync: fn => fn(),
  };
  const ids = ["batch_server_request_000001", "batch_server_request_000002"];
  assert.equal(reservePaidBatch(batchStorage, now, ids), "reserved");
  assert.equal(batchMap.get("paid:h:2026-10-22T13"), 2);
  assert.equal(batchMap.get("paid:usd:2026-10"), 3000);
  assert.equal(reservePaidBatch(batchStorage, now, ids), "duplicate");
  assert.equal(batchMap.get("paid:h:2026-10-22T13"), 2,
    "replayed batch must not spend again");
  assert.equal(settleRequest(batchStorage, ids[0], 79), "settled");
  assert.equal(batchMap.get("paid:usd:2026-10"), 1579);
  assert.equal(reservePaidBatch(batchStorage, now,
    Array.from({ length: 9 }, (_, i) => "over_limit_batch_id_" + i)), "hourly_limited");
  assert.equal(batchMap.get("paid:h:2026-10-22T13"), 2,
    "overlimit batch must not reserve even the first request");
  assert.throws(() => reservePaidBatch(batchStorage, now, [ids[0], ids[0]]),
    /invalid_request_ids/);
  assert.equal(reservePaidBatch(batchStorage, now,
    Array.from({ length: 8 }, (_, i) => "valid_batch_request_" + String(i).padStart(5,"0"))),
    "reserved");
  assert.equal(batchMap.get("paid:h:2026-10-22T13"), 10);
  // Distinct UTC-period diagnostics never weaken atomic no-reservation behavior.
  for (const [key, count, expected] of [
    ["paid:h:2026-10-22T13", 9, "hourly_limited"],
    ["paid:d:2026-10-22", 39, "daily_limited"],
    ["paid:m:2026-10", 99, "monthly_limited"],
    ["paid:usd:2026-10", 4_997_500, "spending_limited"],
  ]) {
    const blockedMap = new Map([[key, count]]);
    const blockedStorage = {
      kv: { get: k => blockedMap.get(k), put: (k, v) => blockedMap.set(k, v) },
      transactionSync: fn => fn(),
    };
    const before = [...blockedMap];
    const blockedIds = ["test_batch_limit_000001", "test_batch_limit_000002"];
    assert.equal(reservePaidBatch(blockedStorage, now, blockedIds), expected);
    assert.deepEqual([...blockedMap], before,
      "failure may not reserve even one request or mutate counters");
  }
  assert.equal(PAID_LIMITS.hourly, 10);
  assert.equal(PAID_LIMITS.daily, 40);
  assert.equal(PAID_LIMITS.monthly, 100);
  console.log("3B.1 money accounting and atomic complete-plan reservations passed");
} finally { await unlink(out).catch(() => {}); }

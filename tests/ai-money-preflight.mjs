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
  const { reservePaidBudget, reservePaidBatch, PAID_LIMITS, MAX_PAID_BATCH_CALLS, safeReconciledAmount, reserveRequest, settleRequest } =
    await import(pathToFileURL(process.cwd() + "/" + out).href);
  const map = new Map();
  const storage = { kv: { get: key => map.get(key), put: (key, value) => map.set(key, value) },
    transactionSync: fn => fn() };
  const now = Date.parse("2026-10-22T13:00:00Z");
  assert.equal(PAID_LIMITS.monthlyMicroUsd, 5_000_000);
  assert.equal(PAID_LIMITS.perRequestMicroUsd, 1_500);
  const attempts = await Promise.all(Array.from({ length: 60 },
    async () => reservePaidBudget(storage, now)));
  assert.equal(attempts.filter(Boolean).length, 50);
  assert.equal(map.get("paid:usd:2026-10"), 75_000);
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
  const burst = await Promise.all(Array.from({ length: 60 }, (_, i) =>
    Promise.resolve(reserveRequest(money, now, "concurrent_request_" + String(i).padStart(6, "0")))));
  assert.equal(burst.filter(x => x === "reserved").length, 48);
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
  assert.equal(MAX_PAID_BATCH_CALLS, 10);
  assert.throws(() => reservePaidBatch(batchStorage, now,
    Array.from({ length: MAX_PAID_BATCH_CALLS + 1 },
      (_, i) => "oversized_batch_request_" + i)), /invalid_request_ids/);
  assert.equal(batchMap.get("paid:h:2026-10-22T13"), 2,
    "oversized search plan must not reserve even the first request");
  assert.throws(() => reservePaidBatch(batchStorage, now, [ids[0], ids[0]]),
    /invalid_request_ids/);
  assert.equal(reservePaidBatch(batchStorage, now,
    Array.from({ length: 8 }, (_, i) => "valid_batch_request_" + String(i).padStart(5,"0"))),
    "reserved");
  assert.equal(batchMap.get("paid:h:2026-10-22T13"), 10);
  // Distinct UTC-period diagnostics never weaken atomic no-reservation behavior.
  for (const [key, count, expected] of [
    ["paid:h:2026-10-22T13", 49, "hourly_limited"],
    ["paid:d:2026-10-22", 149, "daily_limited"],
    ["paid:m:2026-10", 999, "monthly_limited"],
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
  assert.equal(PAID_LIMITS.hourly, 50);
  assert.equal(PAID_LIMITS.daily, 150);
  assert.equal(PAID_LIMITS.monthly, 1_000);
  const dailyMap = new Map();
  const dailyStorage = {
    kv: { get: k => dailyMap.get(k), put: (k,v) => dailyMap.set(k,v) },
    transactionSync: fn => fn(),
  };
  let dailyAccepted = 0;
  for (let hour = 0; hour < 4; hour++) {
    for (let i = 0; i < 50; i++) {
      if (reservePaidBudget(dailyStorage, now + hour * 3_600_000)) dailyAccepted++;
    }
  }
  assert.equal(dailyAccepted, 150);
  assert.equal(dailyMap.get("paid:d:2026-10-22"), 150);
  assert.equal(reservePaidBudget(dailyStorage, now + 86_400_000), true,
    "a new UTC day resets its daily quota");
  const monthlyMap = new Map([["paid:m:2026-10", 999]]);
  const monthlyStorage = {
    kv: { get: k => monthlyMap.get(k), put: (k,v) => monthlyMap.set(k,v) },
    transactionSync: fn => fn(),
  };
  assert.equal(reservePaidBudget(monthlyStorage, now), true);
  assert.equal(monthlyMap.get("paid:m:2026-10"), 1_000);
  assert.equal(reservePaidBudget(monthlyStorage, now + 86_400_000), false);
  assert.equal(reservePaidBudget(monthlyStorage, Date.parse("2026-11-01T00:00:00Z")), true,
    "a new UTC month resets its monthly quota without changing the $5 cap");
  console.log("3B.1 money accounting and atomic complete-plan reservations passed");
} finally { await unlink(out).catch(() => {}); }

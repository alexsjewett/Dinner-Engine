/**
 * 3B.1 prepared monetary reservation ledger. Not connected to paid calls.
 * All amounts are integer micro-USD, fixed one-owner namespace and UTC windows.
 * Reservations are never refunded automatically after a provider timeout:
 * unknown usage stays charged to the allowance (fail closed).
 */
export const PAID_LIMITS = {
  hourly: 10, daily: 40, monthly: 100,
  monthlyMicroUsd: 5_000_000,
  perRequestMicroUsd: 1_500,
} as const;

export interface MoneyStorage {
  kv: { get(key: string): unknown; put(key: string, value: number): void };
  transactionSync<T>(fn: () => T): T;
}
function safeCount(value: unknown): number {
  if (value === undefined) return 0;
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw Error("ledger_corrupt");
  return value as number;
}
function periodKeys(timestamp: number): string[] {
  if (!Number.isFinite(timestamp) || timestamp < 0) throw Error("invalid_clock");
  const iso = new Date(timestamp).toISOString();
  return ["paid:h:" + iso.slice(0, 13), "paid:d:" + iso.slice(0, 10),
    "paid:m:" + iso.slice(0, 7), "paid:usd:" + iso.slice(0, 7)];
}
export function reservePaidBudget(storage: MoneyStorage, timestamp: number): boolean {
  const keys = periodKeys(timestamp);
  return storage.transactionSync(() => {
    const values = keys.map(key => safeCount(storage.kv.get(key)));
    if (values[0] >= PAID_LIMITS.hourly ||
        values[1] >= PAID_LIMITS.daily ||
        values[2] >= PAID_LIMITS.monthly ||
        values[3] + PAID_LIMITS.perRequestMicroUsd > PAID_LIMITS.monthlyMicroUsd) return false;
    keys.forEach((key, index) => storage.kv.put(key,
      values[index] + (index === 3 ? PAID_LIMITS.perRequestMicroUsd : 1)));
    return true;
  });
}
/**
 * Only unused reserved allowance may be returned after independently verified
 * provider usage. Never accept a negative or over-reservation reconciliation.
 * This design still needs idempotent request IDs before any paid activation.
 */
export function safeReconciledAmount(actualMicroUsd: number): number | null {
  return Number.isSafeInteger(actualMicroUsd) && actualMicroUsd >= 0 &&
    actualMicroUsd <= PAID_LIMITS.perRequestMicroUsd ? actualMicroUsd : null;
}

/**
 * Idempotent lifecycle for future provider requests. Request IDs are generated
 * server-side and never reused. A request with unknown provider outcome stays
 * fully reserved; only a verified settlement may return unused allowance.
 * Every mutation is one synchronous Durable Object storage transaction.
 */
export function reserveRequest(storage: MoneyStorage, timestamp: number, requestId: string):
  "reserved" | "duplicate" | "limited" {
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) throw Error("invalid_request_id");
  const keys = periodKeys(timestamp);
  const stateKey = "paid:req:" + requestId;
  return storage.transactionSync(() => {
    const existing = storage.kv.get(stateKey);
    if (existing !== undefined) {
      safeCount(existing);
      return "duplicate";
    }
    const values = keys.map(key => safeCount(storage.kv.get(key)));
    if (values[0] >= PAID_LIMITS.hourly || values[1] >= PAID_LIMITS.daily ||
        values[2] >= PAID_LIMITS.monthly ||
        values[3] + PAID_LIMITS.perRequestMicroUsd > PAID_LIMITS.monthlyMicroUsd) return "limited";
    keys.forEach((key, index) => storage.kv.put(key,
      values[index] + (index === 3 ? PAID_LIMITS.perRequestMicroUsd : 1)));
    // Persist UTC month index as YYYYMM, with zero meaning reserved but unsettled.
    const month = Number(new Date(timestamp).toISOString().slice(0, 7).replace("-", ""));
    storage.kv.put(stateKey, month * 10_000);
    return "reserved";
  });
}
export function settleRequest(storage: MoneyStorage, requestId: string,
  verifiedActualMicroUsd: number): "settled" | "duplicate" | "invalid" {
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId) ||
      safeReconciledAmount(verifiedActualMicroUsd) === null) return "invalid";
  return storage.transactionSync(() => {
    const key = "paid:req:" + requestId;
    const raw = storage.kv.get(key);
    if (raw === undefined) return "invalid";
    const state = safeCount(raw);
    const month = Math.floor(state / 10_000);
    const settlement = state % 10_000;
    if (settlement !== 0) return "duplicate";
    const monthString = String(month);
    if (!/^20[0-9]{4}$/.test(monthString)) throw Error("ledger_corrupt");
    const monthKey = "paid:usd:" + monthString.slice(0, 4) + "-" + monthString.slice(4);
    const current = safeCount(storage.kv.get(monthKey));
    const refund = PAID_LIMITS.perRequestMicroUsd - verifiedActualMicroUsd;
    if (current < refund) throw Error("ledger_corrupt");
    storage.kv.put(monthKey, current - refund);
    // Offset by one so even a verified zero-dollar settlement is final.
    storage.kv.put(key, month * 10_000 + verifiedActualMicroUsd + 1);
    return "settled";
  });
}

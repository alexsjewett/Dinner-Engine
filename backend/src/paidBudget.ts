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

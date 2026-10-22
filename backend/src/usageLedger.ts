/**
 * Persistent one-user, nonbillable simulation ledger.
 * A SINGLE SQLite-backed Durable Object serializes reservations for all
 * the owner's devices. Counts are not kept in Worker memory or in a browser.
 * No email, recipe text, prompts or other personal information is stored.
 *
 * Important: the 10-cent reservation is a conservative PLACEHOLDER, not
 * measured OpenAI spending. Actual paid usage requires separate approval,
 * model pricing and reservation/reconciliation changes.
 */
import { DurableObject } from "cloudflare:workers";
import { reservePaidBudget, reserveRequest, settleRequest } from "./paidBudget";

export const LIMITS = {
  perHour: 10,
  perDay: 40,
  perMonth: 100,
  monthlyReserveCents: 1_000,
  reservePerTestCents: 10,
} as const;

interface LedgerContext {
  storage: {
    kv: {
      get(key: string): unknown;
      put(key: string, value: number): void;
    };
    transactionSync<T>(action: () => T): T;
  };
}

function counter(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Corrupt usage counter");
  }
  return value;
}

/** Fully synchronous reservation: all checks and writes commit atomically. */
export function reserveTest(
  storage: LedgerContext["storage"],
  timestamp: number,
): { allowed: boolean; reason?: "limit_reached" } {
  if (!Number.isFinite(timestamp) || timestamp < 0) throw new Error("Invalid clock");
  const iso = new Date(timestamp).toISOString();
  const hourKey = "h:" + iso.slice(0, 13);
  const dayKey = "d:" + iso.slice(0, 10);
  const monthKey = "m:" + iso.slice(0, 7);
  const centsKey = "c:" + iso.slice(0, 7);

  return storage.transactionSync(() => {
    const h = counter(storage.kv.get(hourKey));
    const d = counter(storage.kv.get(dayKey));
    const m = counter(storage.kv.get(monthKey));
    const cents = counter(storage.kv.get(centsKey));
    if (h >= LIMITS.perHour || d >= LIMITS.perDay ||
        m >= LIMITS.perMonth ||
        cents + LIMITS.reservePerTestCents > LIMITS.monthlyReserveCents) {
      return { allowed: false, reason: "limit_reached" };
    }
    storage.kv.put(hourKey, h + 1);
    storage.kv.put(dayKey, d + 1);
    storage.kv.put(monthKey, m + 1);
    storage.kv.put(centsKey, cents + LIMITS.reservePerTestCents);
    return { allowed: true };
  });
}

export class UsageLedger extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (request.method !== "POST" ||
        !["/reserve-test", "/reserve-paid-preflight", "/reserve-paid-id", "/settle-paid-id"].includes(pathname)) {
      return new Response("not_found", { status: 404 });
    }
    try {
      // No user data accepted or required by this internal ledger.
      if (pathname === "/reserve-paid-id" || pathname === "/settle-paid-id") {
        // Internal Durable Object method only: the public Worker has no route.
        // Reject unbounded or malformed request bodies before parsing.
        const raw = await request.text();
        if (raw.length > 160) return Response.json({ error: "invalid" }, { status: 400 });
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return Response.json({ error: "invalid" }, { status: 400 });
        }
        const data = value as Record<string, unknown>;
        if (typeof data.requestId !== "string" ||
            !/^[a-zA-Z0-9_-]{16,80}$/.test(data.requestId)) {
          return Response.json({ error: "invalid" }, { status: 400 });
        }
        if (pathname === "/reserve-paid-id") {
          if (Object.keys(data).length !== 1) return Response.json({ error: "invalid" }, { status: 400 });
          const result = reserveRequest(this.ctx.storage as LedgerContext["storage"], Date.now(), data.requestId);
          return Response.json({ result }, { status: result === "reserved" ? 200 : 409 });
        }
        if (Object.keys(data).length !== 2 || typeof data.actualMicroUsd !== "number") {
          return Response.json({ error: "invalid" }, { status: 400 });
        }
        const result = settleRequest(this.ctx.storage as LedgerContext["storage"], data.requestId, data.actualMicroUsd);
        return Response.json({ result }, { status: result === "settled" ? 200 : 409 });
      }
      if (pathname === "/reserve-paid-preflight") {
        const allowed = reservePaidBudget(this.ctx.storage as LedgerContext["storage"], Date.now());
        return Response.json({ allowed, testOnly: true }, { status: allowed ? 200 : 429 });
      }
      const result = reserveTest(this.ctx.storage as LedgerContext["storage"], Date.now());
      return Response.json(result, {
        status: result.allowed ? 200 : 429,
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return Response.json({ allowed: false, reason: "unavailable" }, { status: 503 });
    }
  }
}

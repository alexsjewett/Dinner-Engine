/**
 * Milestone 3A.2 — secure, NONBILLABLE guardrails.
 *
 * Authentication is enforced before reading requests. /api/ai/recommend
 * is permanently disabled here. Only an explicitly enabled test-only route
 * can validate a bounded JSON envelope and reserve a durable synthetic quota.
 *
 * NO OpenAI client, provider API keys, network AI calls, recipe persistence,
 * arbitrary proxying or plaintext identity output.
 */
import { checkBody } from "./guardrails";
export { UsageLedger } from "./usageLedger";

interface WorkerEnv {
  ALLOWED_EMAIL?: string; // Private Cloudflare Production runtime Secret
  AI_GUARDRAIL_MODE?: string; // Default absent/off; "test" permits nonbillable check only
  USAGE_LEDGER?: {
    getByName(name: string): { fetch(request: Request): Promise<Response> };
  };
}
interface WorkerContext {
  access?: { getIdentity(): Promise<{ email?: string } | null> };
}
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
function reply(status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), { status, headers });
}
async function isAllowed(env: WorkerEnv | undefined, ctx: WorkerContext | undefined): Promise<boolean> {
  if (!ctx?.access || typeof ctx.access.getIdentity !== "function") return false;
  const email = env?.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!email || !email.includes("@")) return false;
  try {
    const identity = await ctx.access.getIdentity();
    return typeof identity?.email === "string" &&
      identity.email.trim().toLowerCase() === email;
  } catch { return false; }
}
export default {
  async fetch(request: Request, env?: WorkerEnv, ctx?: WorkerContext): Promise<Response> {
    if (!await isAllowed(env, ctx)) return reply(403, { error: "access_denied" });

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/ai/health") {
      return reply(200, {
        service: "find-dinner-ai",
        enabled: false,
        guardrails: "configured",
      });
    }
    if (url.pathname === "/api/ai/recommend" && request.method === "POST") {
      // No billable provider integration exists. Never read original recipe bodies.
      return reply(503, { error: "ai_pilot_disabled" });
    }
    if (url.pathname !== "/api/ai/guardrails" || request.method !== "POST") {
      return reply(404, { error: "not_found" });
    }

    // Kill switch: absent/disabled by default, including on redeployment.
    if (env?.AI_GUARDRAIL_MODE !== "test") {
      return reply(503, { error: "guardrails_disabled" });
    }
    if (!env.USAGE_LEDGER) {
      return reply(503, { error: "guardrails_unavailable" });
    }
    const body = await checkBody(request);
    if (!body.ok) return reply(body.status, { error: body.error });

    try {
      // Only one global Durable Object ledger for this one-user pilot.
      // No recipe content, identity details, or user-controlled keys are sent.
      const stub = env.USAGE_LEDGER.getByName("pilot-owner-v1");
      const reserved = await stub.fetch(new Request("https://ledger.internal/reserve-test", {
        method: "POST",
      }));
      if (reserved.status === 429) return reply(429, { error: "limit_reached" });
      if (reserved.status !== 200) return reply(503, { error: "guardrails_unavailable" });
      const result: unknown = await reserved.json();
      if (typeof result !== "object" || result === null ||
          !("allowed" in result) || result.allowed !== true) {
        return reply(503, { error: "guardrails_unavailable" });
      }
      return reply(200, {
        accepted: true,
        testOnly: true,
        providerConnected: false,
      });
    } catch {
      return reply(503, { error: "guardrails_unavailable" });
    }
  },
};

/**
 * Milestone 3B.2 — opt-in, authenticated fictional paid test, disabled by default.
 *
 * Existing /api/ai/recommend remains hard-disabled: no real Paprika uploads.
 * The only provider-capable route is a same-origin, click-triggered, FICTIONAL
 * test, enabled exclusively by the runtime AI_PILOT_MODE=synthetic and a
 * server-held API secret. Identity checks precede body reads or provider work.
 */
import { checkBody } from "./guardrails";
import { runSyntheticPilot, syntheticPilotReady, type SyntheticPilotEnv } from "./pilotSynthetic";
export { UsageLedger } from "./usageLedger";

interface WorkerEnv extends SyntheticPilotEnv {
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
const syntheticPage = (ready: boolean): Response => new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Find dinner. — fictional AI test</title></head><body>
<main><h1>Find dinner. — fictional AI test</h1>
<p>This tests exactly one invented lentil recipe. It does not read or send your
Paprika recipes or household profiles. This request may cost a small amount
of OpenAI API credit and counts against the server-side $5 monthly allowance.</p>
<p><strong>State: ${ready ? "Configured for fictional tests" : "Disabled; no paid test can run"}</strong></p>
<button id="run" type="button" ${ready ? "" : "disabled"}>Run one paid fictional test</button>
<pre id="result" role="status" aria-live="polite"></pre>
<p>Imported Paprika recipes remain local. No food-safety guarantee.</p>
</main><script src="/api/ai/test/client.js" defer></script></body></html>`, {
  status: 200,
  headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  },
});
const syntheticClientJs = `"use strict";
const button = document.getElementById("run");
const status = document.getElementById("result");
button?.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Testing the fictional recipe…";
  try {
    const response = await fetch("/api/ai/test/synthetic", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Find-Dinner-Intent": "synthetic-test" },
      body: JSON.stringify({ confirmed: true }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) status.textContent =
      "Test unavailable (" + (data.error || response.status) + "). No retry was made.";
    else status.textContent = "Fictional test succeeded. " +
      data.recipeId + ": " + data.explanation + "\\nManual review required. " +
      data.cautions.join("; ") + "\\nEstimated model cost: $" +
      (data.estimatedMicroUsd / 1000000).toFixed(6) + ".";
  } catch {
    status.textContent = "Test unavailable. No retry was made.";
  } finally { button.disabled = false; }
});`;
async function checkSyntheticConfirmation(request: Request): Promise<boolean> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) ||
      !Number.isSafeInteger(Number(length)) || Number(length) > 128)) return false;
  if (request.headers.get("content-type") !== "application/json" || !request.body) return false;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 128) { await reader.cancel().catch(() => {}); return false; }
      chunks.push(next.value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
    return !!value && typeof value === "object" && !Array.isArray(value) &&
      Object.keys(value).length === 1 &&
      (value as Record<string, unknown>).confirmed === true;
  } catch { return false; }
  finally { reader.releaseLock(); }
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
    if (request.method === "GET" && url.pathname === "/api/ai/test") {
      return syntheticPage(syntheticPilotReady(env));
    }
    if (request.method === "GET" && url.pathname === "/api/ai/test/client.js") {
      return new Response(syntheticClientJs, {
        headers: { ...headers, "Content-Type": "text/javascript; charset=utf-8" },
      });
    }
    if (request.method === "POST" && url.pathname === "/api/ai/test/synthetic") {
      // Kill switch and secret checks happen BEFORE consuming the request body.
      if (!syntheticPilotReady(env)) return reply(503, { error: "ai_pilot_disabled" });
      // Same-origin, deliberate browser action only. No CORS allowances.
      if (request.headers.get("origin") !== url.origin ||
          request.headers.get("x-find-dinner-intent") !== "synthetic-test" ||
          request.headers.get("sec-fetch-site") === "cross-site") {
        return reply(403, { error: "intent_required" });
      }
      if (!await checkSyntheticConfirmation(request)) {
        return reply(400, { error: "invalid_request" });
      }
      const outcome = await runSyntheticPilot(env, fetch);
      return outcome.ok ? reply(200, outcome) :
        reply(outcome.status, { error: outcome.error });
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

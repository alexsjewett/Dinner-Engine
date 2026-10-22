/**
 * Milestone 3A.1 - nonbillable, fail-closed Cloudflare Worker.
 *
 * Temporary 3A.1 authentication diagnostics are returned ONLY on the health
 * route, as fixed, nonsensitive failure codes, without granting access.
 * Remove these details once iPhone Access verification succeeds.
 *
 * A Cloudflare Access policy must cover the entire Worker. Only the
 * platform-verified ctx.access identity is trusted; an independent exact
 * owner-email allowlist is a Cloudflare Worker secret.
 *
 * NO provider credentials, paid calls, or request body reads.
 */
interface WorkerEnv {
  /** Configured privately as a Cloudflare Worker secret. */
  ALLOWED_EMAIL?: string;
}

interface WorkerExecutionContext {
  /** Provided by Cloudflare only for Access-authenticated invocations. */
  access?: {
    getIdentity(): Promise<{ email?: string } | null>;
  };
}

/** Fixed codes only: never return email, identity details, tokens or secrets. */
type DeniedReason =
  | "access_context_missing"
  | "allowlist_missing"
  | "identity_lookup_failed"
  | "identity_email_missing"
  | "identity_mismatch";

type Authentication = { ok: true } | { ok: false; reason: DeniedReason };

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

async function checkAuthorization(
  env: WorkerEnv | undefined,
  ctx: WorkerExecutionContext | undefined,
): Promise<Authentication> {
  // Cloudflare-verified Access context is mandatory, not a request header.
  if (!ctx?.access || typeof ctx.access.getIdentity !== "function") {
    return { ok: false, reason: "access_context_missing" };
  }

  const allowed = env?.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!allowed || !allowed.includes("@")) {
    return { ok: false, reason: "allowlist_missing" };
  }

  let identity: { email?: string } | null;
  try {
    identity = await ctx.access.getIdentity();
  } catch {
    return { ok: false, reason: "identity_lookup_failed" };
  }

  if (typeof identity?.email !== "string" || !identity.email.trim()) {
    return { ok: false, reason: "identity_email_missing" };
  }
  if (identity.email.trim().toLowerCase() !== allowed) {
    return { ok: false, reason: "identity_mismatch" };
  }
  return { ok: true };
}

export default {
  async fetch(
    request: Request,
    env?: WorkerEnv,
    ctx?: WorkerExecutionContext,
  ): Promise<Response> {
    // Route recognition is safe before authorization; no request body is read.
    const url = new URL(request.url);
    const isHealth = request.method === "GET" && url.pathname === "/api/ai/health";
    const auth = await checkAuthorization(env, ctx);
    if (!auth.ok) {
      // Temporary diagnostics are intentionally restricted to health.
      // All other paths reveal no information about the failure reason.
      return reply(403, isHealth
        ? { error: "access_denied", diagnostic: auth.reason }
        : { error: "access_denied" });
    }

    if (isHealth) {
      return reply(200, { service: "find-dinner-ai", enabled: false });
    }
    if (url.pathname === "/api/ai/recommend" && request.method === "POST") {
      return reply(503, {
        error: "ai_pilot_disabled",
        message: "AI recommendations are not yet available.",
      });
    }
    return reply(404, { error: "not_found" });
  },
};

/**
 * Milestone 3A.1 - nonbillable, fail-closed Cloudflare Worker.
 *
 * Temporary authentication diagnostics were retired after owner-only
 * Safari authentication succeeded. Denied requests return generic 403.
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
): Promise<boolean> {
  // Cloudflare-verified Access context is mandatory, not a request header.
  if (!ctx?.access || typeof ctx.access.getIdentity !== "function") {
    return false;
  }

  const allowed = env?.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!allowed || !allowed.includes("@")) {
    return false;
  }

  let identity: { email?: string } | null;
  try {
    identity = await ctx.access.getIdentity();
  } catch {
    return false;
  }

  if (typeof identity?.email !== "string" || !identity.email.trim()) {
    return false;
  }
  if (identity.email.trim().toLowerCase() !== allowed) {
    return false;
  }
  return true;
}

export default {
  async fetch(
    request: Request,
    env?: WorkerEnv,
    ctx?: WorkerExecutionContext,
  ): Promise<Response> {
    // Authorization occurs before routing or reading a request body.
    if (!await checkAuthorization(env, ctx)) {
      return reply(403, { error: "access_denied" });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/ai/health") {
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

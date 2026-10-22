/**
 * Milestone 3A.1 - nonbillable, fail-closed Cloudflare Worker.
 *
 * A Cloudflare Access application must cover the entire Worker, including
 * production and previews. Only the platform-verified ctx.access identity is
 * trusted. An independent exact-email allowlist is stored as a Worker secret.
 *
 * NO provider credentials, paid calls, or recipe body reads are implemented.
 * Do not activate AI until persistent quotas, request validation, safety
 * review and on-device authentication tests all pass.
 */
interface WorkerEnv {
  /** Set privately in Cloudflare -> Worker -> Settings -> Variables and Secrets. */
  ALLOWED_EMAIL?: string;
}

interface WorkerExecutionContext {
  /** Cloudflare populates this only after Worker-level Access authenticates. */
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

async function authorized(env: WorkerEnv | undefined, ctx: WorkerExecutionContext | undefined): Promise<boolean> {
  // Missing secret OR missing Access authentication must fail closed.
  const allowed = env?.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!allowed || !allowed.includes("@") || !ctx?.access || typeof ctx.access.getIdentity !== "function") {
    return false;
  }
  try {
    const identity = await ctx.access.getIdentity();
    return typeof identity?.email === "string" &&
      identity.email.trim().toLowerCase() === allowed;
  } catch {
    // Invalid/expired identity and provider outages never bypass auth.
    return false;
  }
}

export default {
  async fetch(
    request: Request,
    env?: WorkerEnv,
    ctx?: WorkerExecutionContext,
  ): Promise<Response> {
    // Authentication is checked BEFORE routing or parsing a request body.
    if (!await authorized(env, ctx)) {
      return reply(403, { error: "access_denied" });
    }

    const url = new URL(request.url);
    if (url.pathname === "/api/ai/health" && request.method === "GET") {
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

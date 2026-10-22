/**
 * Milestone 3A stage 0 - intentionally disabled Worker entrypoint.
 * DO NOT enable paid calls before independently verified authentication,
 * server-side quotas and cost controls, secret handling and user consent.
 * This file contains no provider code, secrets or recipe transmissions.
 * GitHub Pages does not deploy this backend.
 */
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/ai/health" && request.method === "GET") {
      return reply(200, { service: "find-dinner-ai", enabled: false });
    }
    if (url.pathname === "/api/ai/recommend" && request.method === "POST") {
      // Reject without reading any recipe or profile body.
      return reply(503, {
        error: "ai_pilot_disabled",
        message: "AI recommendations are not yet available.",
      });
    }
    return reply(404, { error: "not_found" });
  },
};

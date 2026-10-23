/**
 * GitHub Pages -> Access-protected Cloudflare Worker popup handoff.
 *
 * The popup handles the billable POST on its OWN origin after Access login:
 * no third-party cookies, preflight bypass, anonymous Worker access, secrets,
 * recipe storage or local proxy are required. The caller must first receive
 * the signed-in popup's explicit ready message.
 */
import type { LocalPaprikaPreflight } from "./aiPaprikaRequest";

export type AiDinnerSuggestion = {
  recipeId: string; explanation: string; cautions: string[];
  requiresManualReview: true;
};
export type AiDinnerResult =
  | { ok: true; suggestions: AiDinnerSuggestion[];
      estimatedMicroUsd: number; batchCount: number }
  | { ok: false; error: string };
/**
 * Pin the owner's verified, public Worker address. This is not a secret.
 * Do not trust a dynamic build variable or a look-alike *.workers.dev
 * hostname for a page that may transmit Paprika recipe text.
 */
export const AI_WORKER_ORIGIN = "https://dinner-engine-ai.alexsjewett.workers.dev";

export function validatedWorkerOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.origin === AI_WORKER_ORIGIN &&
      url.protocol === "https:" &&
      !url.username && !url.password &&
      !url.search && !url.hash &&
      url.pathname === "/" ? url.origin : null;
  } catch { return null; }
}

/**
 * Must be called directly from the deliberate click event, without an await
 * before window.open (required for iPhone popup gesture handling).
 */
export function askAiWithSecurePopup(
  preflight: LocalPaprikaPreflight, approvedWorkerOrigin: string,
): Promise<AiDinnerResult> {
  if (!preflight.ok) return Promise.resolve({ ok: false, error: preflight.reason });
  const payload = preflight.payload;
  const origin = validatedWorkerOrigin(approvedWorkerOrigin);
  if (!origin) return Promise.resolve({ ok: false, error: "bridge_not_configured" });
  const state = crypto.randomUUID();
  const popup = window.open(origin + "/api/ai/bridge?state=" + state,
    "_blank");
  if (!popup) return Promise.resolve({ ok: false, error: "popup_blocked" });

  return new Promise<AiDinnerResult>(resolve => {
    let sent = false;
    let finished = false;
    const complete = (value: AiDinnerResult) => {
      if (finished) return;
      finished = true;
      window.removeEventListener("message", onMessage);
      clearInterval(closedCheck);
      clearTimeout(timeout);
      resolve(value);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== popup ||
          !event.data || typeof event.data !== "object" ||
          event.data.state !== state) return;
      if (event.data.type === "dinner-ai-ready" && !sent) {
        if (event.data.enabled !== true) {
          complete({ ok: false, error: "ai_pilot_disabled" });
          return;
        }
        sent = true;
        // Recipe text leaves the device ONLY after the signed-in popup verifies
        // the exact approved origin and announces active server safeguards.
        popup.postMessage({ type: "dinner-ai-request", state,
          payload }, origin);
      } else if (event.data.type === "dinner-ai-result" && sent) {
        const data = event.data;
        const valid = data.ok === true &&
          Array.isArray(data.suggestions) &&
          data.suggestions.length > 0 && data.suggestions.length <= 3 &&
          data.suggestions.every((item: unknown) => {
            if (!item || typeof item !== "object") return false;
            const s = item as Record<string, unknown>;
            return typeof s.recipeId === "string" &&
              typeof s.explanation === "string" &&
              Array.isArray(s.cautions) &&
              s.cautions.every(x => typeof x === "string") &&
              s.requiresManualReview === true;
          }) &&
          Number.isSafeInteger(data.estimatedMicroUsd) &&
          data.estimatedMicroUsd >= 0 &&
          Number.isSafeInteger(data.batchCount) &&
          data.batchCount >= 1 && data.batchCount <= 10;
        if (valid) complete({ ok: true,
          suggestions: data.suggestions,
          estimatedMicroUsd: data.estimatedMicroUsd,
          batchCount: data.batchCount });
        else complete({ ok: false,
          error: typeof data.error === "string" ? data.error : "ai_unavailable" });
      }
    };
    window.addEventListener("message", onMessage);
    const closedCheck = setInterval(() => {
      if (popup.closed) complete({ ok: false, error: "bridge_closed" });
    }, 1000);
    const timeout = setTimeout(() =>
      complete({ ok: false, error: "bridge_timeout" }), 300_000);
  });
}

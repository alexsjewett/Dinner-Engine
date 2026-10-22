/**
 * Staged provider transport for 3B.1, NOT imported by production Worker.
 * Caller must supply an authorized server-held key, an already-reserved
 * request, and an explicitly injected HTTP transport. No default fetch exists.
 */
import { PILOT_MODEL, MAX_OUTPUT_TOKENS } from "./aiPilot";
import { MAX_STAGED_INPUT_BYTES, type StagedRequest } from "./paprikaModelDraft";

export const MAX_PROVIDER_RESPONSE_BYTES = 24_576;
export const MAX_PROVIDER_BODY_BYTES = 20_480;
export const PROVIDER_TIMEOUT_MS = 15_000;
export const PROVIDER_URL = "https://api.openai.com/v1/responses";
export type ProviderFetch = (url: string, init: RequestInit) => Promise<Response>;
/** Fixed categories only: never return provider response bodies, headers or credentials. */
export type ProviderFailureCode =
  | "provider_preflight_rejected" | "provider_auth_failed"
  | "provider_request_rejected" | "provider_rate_limited"
  | "provider_unavailable" | "provider_timeout"
  | "provider_network_error" | "provider_invalid_response";
export type ProviderFailureReporter = (code: ProviderFailureCode) => void;

/** Never read or log an unbounded provider response. */
async function readBoundedJson(response: Response): Promise<unknown | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > MAX_PROVIDER_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(next.value);
    }
    const buffer = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
/**
 * Does not retry: after a timeout the provider may have billed anyway.
 * The budget reservation must remain held on ambiguous outcomes. A successful
 * HTTP response is still UNTRUSTED until validatePaprikaModelReply and usage
 * reconciliation succeed. Never forward raw provider output to the browser.
 */
export async function callStagedOpenAi(
  draft: StagedRequest,
  serverSecret: string,
  providerFetch: ProviderFetch,
  reportFailure?: ProviderFailureReporter,
): Promise<unknown | null> {
  if (draft?.request?.model !== PILOT_MODEL ||
      draft.request.store !== false ||
      draft.request.tool_choice !== "none" ||
      draft.request.max_output_tokens !== MAX_OUTPUT_TOKENS ||
      (draft.request.reasoning !== undefined &&
        (draft.request.reasoning?.effort !== "none" ||
          Object.keys(draft.request.reasoning).length !== 1)) ||
      draft.request.text?.format?.type !== "json_schema" ||
      draft.request.text.format.strict !== true ||
      !Number.isSafeInteger(draft.inputBytes) ||
      draft.inputBytes < 1 || draft.inputBytes > MAX_STAGED_INPUT_BYTES ||
      typeof serverSecret !== "string" ||
      serverSecret.length < 20 || serverSecret.length > 500 ||
      /\s/.test(serverSecret) ||
      typeof providerFetch !== "function") {
    reportFailure?.("provider_preflight_rejected");
    return null;
  }
  const encoded = JSON.stringify(draft.request);
  if (new TextEncoder().encode(encoded).byteLength > MAX_PROVIDER_BODY_BYTES) {
    reportFailure?.("provider_preflight_rejected");
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await providerFetch(PROVIDER_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + serverSecret,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: encoded,
      signal: controller.signal,
    });
    if (response.status !== 200) {
      reportFailure?.(response.status === 401 || response.status === 403
        ? "provider_auth_failed"
        : response.status === 429 ? "provider_rate_limited"
        : response.status >= 400 && response.status < 500
          ? "provider_request_rejected" : "provider_unavailable");
      return null;
    }
    const data = await readBoundedJson(response);
    if (data === null) reportFailure?.("provider_invalid_response");
    return data;
  } catch {
    reportFailure?.(controller.signal.aborted
      ? "provider_timeout" : "provider_network_error");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

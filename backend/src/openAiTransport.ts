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
): Promise<unknown | null> {
  if (draft?.request?.model !== PILOT_MODEL ||
      draft.request.store !== false ||
      draft.request.tool_choice !== "none" ||
      draft.request.max_output_tokens !== MAX_OUTPUT_TOKENS ||
      draft.request.text?.format?.type !== "json_schema" ||
      draft.request.text.format.strict !== true ||
      !Number.isSafeInteger(draft.inputBytes) ||
      draft.inputBytes < 1 || draft.inputBytes > MAX_STAGED_INPUT_BYTES ||
      typeof serverSecret !== "string" ||
      serverSecret.length < 20 || serverSecret.length > 500 ||
      /\s/.test(serverSecret) ||
      typeof providerFetch !== "function") return null;
  const encoded = JSON.stringify(draft.request);
  if (new TextEncoder().encode(encoded).byteLength > MAX_PROVIDER_BODY_BYTES) return null;
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
    if (response.status !== 200) return null;
    return await readBoundedJson(response);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

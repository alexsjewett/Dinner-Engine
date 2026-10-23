/**
 * Owner-only, opt-in real Paprika suggestions. Disabled until an explicit
 * AI_REAL_MODE=enabled runtime setting. Server validates full content and
 * reserves the *entire* bounded request plan before any OpenAI call.
 *
 * No recipes, prompt bodies, output text, identities, or secrets are logged
 * or persisted. Ambiguous outcomes keep the full unused reservation.
 */
import { planPaprikaModelBatches, diagnosePaprikaModelReply,
  type ModelValidationDiagnostic } from "./paprikaModelDraft";
import { exerciseStagedBatchPlan, type StagedLedger } from "./aiPilotOrchestrator";
import { callStagedOpenAi, type ProviderFailureCode, type ProviderFetch } from "./openAiTransport";
import type { FullPaprikaPayload } from "./paprikaContract";
import { type SyntheticPilotEnv } from "./pilotSynthetic";
import type { AiAdjustment } from "./aiPilot";

export interface RealPaprikaEnv extends SyntheticPilotEnv {
  AI_REAL_MODE?: string;
}
type RealFailure = ProviderFailureCode | ModelValidationDiagnostic |
  "budget_limit_reached" | "budget_unavailable" | "model_response_incomplete" |
  "model_response_invalid" | "budget_settlement_failed";
type RealResponse =
  | { ok: true; estimatedMicroUsd: number; batchCount: number;
      suggestions: Array<{ recipeId: string; explanation: string;
        cautions: string[]; adjustments?: AiAdjustment[]; requiresManualReview: true }> }
  | { ok: false; error: string };

export function realPaprikaReady(env: RealPaprikaEnv | undefined): boolean {
  return env?.AI_REAL_MODE === "enabled" &&
    typeof env.OPENAI_API_KEY === "string" &&
    env.OPENAI_API_KEY.length >= 20 && !!env.USAGE_LEDGER;
}
type Stub = { fetch(request: Request): Promise<Response> };
async function callLedger(stub: Stub, action: "reserve-paid-batch" | "settle-paid-id",
  payload: Record<string, unknown>): Promise<{ code: number; result: unknown }> {
  const response = await stub.fetch(new Request("https://ledger.internal/" + action, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
  const value: unknown = await response.json();
  return { code: response.status,
    result: value && typeof value === "object" && "result" in value ?
      value.result : null };
}

export async function runRealPaprika(
  payload: FullPaprikaPayload, env: RealPaprikaEnv, providerFetch: ProviderFetch,
): Promise<RealResponse> {
  if (!realPaprikaReady(env)) return { ok: false, error: "ai_pilot_disabled" };
  const batches = planPaprikaModelBatches(payload);
  if (!batches || batches.length < 1 || batches.length > 10)
    return { ok: false, error: "library_exceeds_safe_batch_limits" };
  const ids = batches.map(() => crypto.randomUUID());
  let ledger: Stub;
  try {
    ledger = env.USAGE_LEDGER!.getByName("pilot-owner-v1");
    const reserved = await callLedger(ledger, "reserve-paid-batch", { requestIds: ids });
    if (reserved.result !== "reserved" || reserved.code !== 200)
      return { ok: false, error: reserved.result === "limited" ?
        "budget_limit_reached" : "budget_unavailable" };
  } catch {
    return { ok: false, error: "budget_unavailable" };
  }

  let diagnostic: RealFailure | null = null;
  const report = (code: RealFailure) => { diagnostic ??= code; };
  let next = 0;
  const stagedLedger: StagedLedger = {
    // All calls have already been atomically reserved in the Durable Object.
    async reserve(id) {
      return ids[next++] === id ? "reserved" : "duplicate";
    },
    async settle(id, actualMicroUsd) {
      try {
        const result = await callLedger(ledger, "settle-paid-id", {
          requestId: id, actualMicroUsd,
        });
        if (result.code === 200 && result.result === "settled") return "settled";
      } catch { /* keep reservation */ }
      report("budget_settlement_failed");
      return "invalid";
    },
  };
  let index = 0;
  try {
    const outcome = await exerciseStagedBatchPlan(batches, stagedLedger,
      async draft => {
        // Apply the same low-reasoning, structured-response contract already
        // validated by the real-money fictional trial.
        const response = await callStagedOpenAi({
          ...draft, request: { ...draft.request, reasoning: { effort: "none" } },
        }, env.OPENAI_API_KEY!, providerFetch, report);
        if (response && typeof response === "object" && "status" in response &&
            response.status === "incomplete") {
          report("model_response_incomplete");
        } else if (response !== null) {
          const reason = diagnosePaprikaModelReply(response, draft.eligibleIds);
          if (reason) report(reason);
        }
        return response;
      },
      () => ids[index++],
    );
    if (!outcome) return {
      ok: false, error: diagnostic ?? "model_response_invalid",
    };
    // Cross-batch round-robin preserves each model's local ranking without
    // pretending to compare AI relevance scores it never supplied.
    // Optional model-proposed changes can only reference phrases already in
    // the original ingredient list. Strip, never auto-apply, ungrounded or
    // obvious Must-avoid replacements. Recommendations remain usable.
    const normalize = (value: string) => " " + value.toLowerCase().normalize("NFKD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ").replace(/\\s+/g, " ").trim() + " ";
    const recipeById = new Map(payload.recipes.map(recipe => [recipe.id, recipe]));
    const groups = outcome.groups.map(group => group.reply.suggestions.map(item => {
      const recipe = recipeById.get(item.recipeId);
      const original = recipe ? normalize(recipe.ingredients) : "";
      const adjustments = (item.adjustments ?? []).filter(change => {
        const phrase = normalize(change.ingredientFrom).trim();
        if (!phrase || !original.includes(" " + phrase + " ")) return false;
        const replacement = normalize(change.ingredientTo);
        return !payload.criteria.mustAvoidFoods.some(food => {
          const term = normalize(food).trim();
          return !term || [term, term + "s", term + "es"].some(variant =>
            replacement.includes(" " + variant + " "));
        });
      });
      return { ...item, adjustments };
    }));
    const suggestions: Array<{
      recipeId: string; explanation: string; cautions: string[];
      adjustments?: AiAdjustment[]; requiresManualReview: true;
    }> = [];
    for (let rank = 0; rank < 5 && suggestions.length < 3; rank++) {
      for (const group of groups) {
        const item = group[rank];
        if (item && suggestions.length < 3) suggestions.push(item);
      }
    }
    if (!suggestions.length) return { ok: false, error: "model_response_invalid" };
    return { ok: true, suggestions,
      batchCount: outcome.requestCount,
      estimatedMicroUsd: outcome.totalEstimatedMicroUsd };
  } catch {
    return { ok: false, error: "model_response_invalid" };
  }
}

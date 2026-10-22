/**
 * 3B.2: opt-in, owner-only, FICTIONAL recipe pilot.
 * The production Worker can import this safely: no request is made unless
 * enabled at runtime AND the authenticated user presses the test button.
 * Full Paprika recipe transmission remains disabled.
 */
import { planPaprikaModelBatches } from "./paprikaModelDraft";
import { exerciseStagedBatchPlan, type StagedLedger } from "./aiPilotOrchestrator";
import { callStagedOpenAi, type ProviderFetch } from "./openAiTransport";

export interface SyntheticPilotEnv {
  AI_PILOT_MODE?: string;
  OPENAI_API_KEY?: string;
  USAGE_LEDGER?: {
    getByName(name: string): { fetch(request: Request): Promise<Response> };
  };
}
export type SyntheticPilotResult =
  | { ok: true; testOnly: true; recipeId: string; explanation: string;
      cautions: string[]; requiresManualReview: true; estimatedMicroUsd: number }
  | { ok: false; status: number; error: string };

export function syntheticPilotReady(env: SyntheticPilotEnv | undefined): boolean {
  return env?.AI_PILOT_MODE === "synthetic" &&
    typeof env.OPENAI_API_KEY === "string" &&
    env.OPENAI_API_KEY.length >= 20 &&
    !!env.USAGE_LEDGER;
}

const fictionalPayload = {
  version: 2 as const,
  scope: "full-paprika-library" as const,
  consent: "explicit-per-request" as const,
  recipes: [{
    id: "fictional-lentil-skillet",
    paprikaUid: null,
    name: "Fictional Lentil Skillet (Synthetic Test)",
    ingredients: "1 cup lentils\n2 cups water\n1 cup diced carrots",
    directions: "Simmer the lentils in water. Cook the carrots separately.",
    description: "Invented demonstration recipe; not from the owner's library.",
    notes: "Synthetic fixture only. Do not rely on this for food safety.",
    servings: "2", prepTime: "10 min", cookTime: "25 min", totalTime: "35 min",
    source: "Find dinner. synthetic fixture", sourceUrl: "",
    categories: ["Dinner", "Synthetic"],
  }],
  criteria: {
    have: ["lentils", "carrots"], unavailable: [],
    timeLimitMinutes: 45, mustAvoidFoods: [], shouldAvoidFoods: [],
    preferAvoidFoods: [], dietaryNeeds: [],
  },
};

async function ledgerCall(
  stub: { fetch(request: Request): Promise<Response> },
  path: "reserve-paid-id" | "settle-paid-id",
  payload: Record<string, unknown>,
): Promise<{ status: number; result: unknown }> {
  const response = await stub.fetch(new Request("https://ledger.internal/" + path, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
  const json: unknown = await response.json();
  const result = json && typeof json === "object" && "result" in json ?
    json.result : null;
  return { status: response.status, result };
}

/** Server-only ledger, no recipe text, no user identity or client IDs. */
function makeLedger(env: SyntheticPilotEnv): StagedLedger {
  const stub = env.USAGE_LEDGER!.getByName("pilot-owner-v1");
  return {
    async reserve(requestId: string) {
      const value = await ledgerCall(stub, "reserve-paid-id", { requestId });
      return value.status === 200 && value.result === "reserved" ? "reserved" :
        value.status === 409 && value.result === "limited" ? "limited" : "duplicate";
    },
    async settle(requestId: string, actualMicroUsd: number) {
      const value = await ledgerCall(stub, "settle-paid-id", {
        requestId, actualMicroUsd,
      });
      return value.status === 200 && value.result === "settled" ? "settled" :
        value.status === 409 && value.result === "duplicate" ? "duplicate" : "invalid";
    },
  };
}

export async function runSyntheticPilot(
  env: SyntheticPilotEnv | undefined, providerFetch: ProviderFetch,
): Promise<SyntheticPilotResult> {
  if (!syntheticPilotReady(env)) return {
    ok: false, status: 503, error: "ai_pilot_disabled",
  };
  const plan = planPaprikaModelBatches(fictionalPayload);
  if (!plan || plan.length !== 1) return {
    ok: false, status: 503, error: "synthetic_fixture_unavailable",
  };
  try {
    const ledger = makeLedger(env!);
    const outcome = await exerciseStagedBatchPlan(
      plan, ledger,
      draft => callStagedOpenAi(draft, env!.OPENAI_API_KEY!, providerFetch),
    );
    if (!outcome) return {
      ok: false, status: 503, error: "pilot_test_unavailable",
    };
    const item = outcome.groups[0]?.reply.suggestions[0];
    if (!item || item.recipeId !== fictionalPayload.recipes[0].id) return {
      ok: false, status: 503, error: "pilot_test_unavailable",
    };
    return {
      ok: true, testOnly: true, recipeId: item.recipeId,
      explanation: item.explanation, cautions: item.cautions,
      requiresManualReview: true, estimatedMicroUsd: outcome.totalEstimatedMicroUsd,
    };
  } catch {
    return { ok: false, status: 503, error: "pilot_test_unavailable" };
  }
}

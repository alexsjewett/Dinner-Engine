/**
 * Milestone 3C: browser-only review of a possible future full-library AI plan.
 * No fetch, timers, credentials, storage writes, recipes or prompts leave this
 * function. The complete draft is handled only in memory and discarded.
 * This does not activate the production AI recommendation endpoint.
 */
import type { LocalPaprikaPreflight } from "./aiPaprikaRequest";
import {
  MAX_PAPRIKA_MODEL_BATCHES, MAX_STAGED_INPUT_BYTES, planPaprikaModelBatches,
} from "../../backend/src/paprikaModelDraft";

export type LocalAiReadiness =
  | { ready: false; reason: "consent_required" | "empty_library" |
      "too_many_recipes" | "request_too_large" |
      "invalid_recipe_or_constraints" | "batch_plan_unavailable";
      recipeCount: number; totalBytes: number }
  | { ready: true; recipeCount: number; totalBytes: number;
      batchCount: number; eligibleRecipeCount: number;
      knownConflictExcludedCount: number; largestBatchBytes: number;
      batchRecipeCounts: number[];
      /** Local-only planning information; NOT a provider cost forecast. */
      maxBatches: number; perBatchInputLimitBytes: number };

/**
 * A successful result means only that the current complete local library
 * fits the staged structural/byte checks. It is NOT an allergy or diet
 * certification, nor proof that future tokens or monetary quotas will pass.
 * For any failure, never quietly discard recipes or produce a partial plan.
 */
export function assessLocalAiReadiness(preflight: LocalPaprikaPreflight): LocalAiReadiness {
  if (!preflight.ok) return {
    ready: false, reason: preflight.reason,
    recipeCount: preflight.count, totalBytes: preflight.bytes,
  };
  const batches = planPaprikaModelBatches(preflight.payload);
  if (!batches || batches.length < 1 ||
      batches.length > MAX_PAPRIKA_MODEL_BATCHES ||
      batches.some((batch, i) =>
        batch.batchNumber !== i + 1 ||
        batch.totalBatches !== batches.length ||
        batch.totalLibraryRecipes !== preflight.count ||
        batch.recipeIds.length < 1 ||
        batch.draft.inputBytes > MAX_STAGED_INPUT_BYTES)) {
    return {
      ready: false, reason: "batch_plan_unavailable",
      recipeCount: preflight.count, totalBytes: preflight.bytes,
    };
  }
  const covered = batches.flatMap(batch => batch.recipeIds);
  const expected = preflight.payload.recipes.map(recipe => recipe.id);
  if (covered.length !== expected.length ||
      covered.some((id, i) => id !== expected[i]) ||
      new Set(covered).size !== covered.length) return {
    ready: false, reason: "batch_plan_unavailable",
    recipeCount: preflight.count, totalBytes: preflight.bytes,
  };
  const knownConflictExcludedCount =
    batches.reduce((n, batch) => n + batch.draft.excludedKnownConflictIds.length, 0);
  const eligibleRecipeCount =
    batches.reduce((n, batch) => n + batch.draft.eligibleIds.length, 0);
  if (eligibleRecipeCount < 1 ||
      eligibleRecipeCount + knownConflictExcludedCount !== preflight.count) {
    return {
      ready: false, reason: "batch_plan_unavailable",
      recipeCount: preflight.count, totalBytes: preflight.bytes,
    };
  }
  // Only safe scalar summaries are retained by the React view; no recipe text,
  // profile names, IDs or model prompt bodies.
  return {
    ready: true, recipeCount: preflight.count, totalBytes: preflight.bytes,
    batchCount: batches.length, eligibleRecipeCount, knownConflictExcludedCount,
    largestBatchBytes: Math.max(...batches.map(batch => batch.draft.inputBytes)),
    batchRecipeCounts: batches.map(batch => batch.recipeIds.length),
    maxBatches: MAX_PAPRIKA_MODEL_BATCHES,
    perBatchInputLimitBytes: MAX_STAGED_INPUT_BYTES,
  };
}

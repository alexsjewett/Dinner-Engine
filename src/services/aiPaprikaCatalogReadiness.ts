/**
 * Nonbillable, browser-only planning for a larger Paprika collection.
 *
 * IMPORTANT: A "window" is NOT permission to send part of the library to AI.
 * Every window must be included in the same future, separately approved
 * full-library operation; that operation does not exist in production.
 */
import { MAX_PAPRIKA_RECIPES } from "../../backend/src/paprikaContract";
import type { ImportedRecipe } from "../types/importedRecipe";
import type { HouseholdProfile } from "../types/profile";
import type { SearchCriteria } from "./dinnerMatcher";
import { prepareLocalPaprikaRequest } from "./aiPaprikaRequest";
import { assessLocalAiReadiness } from "./aiPaprikaReadiness";

/**
 * Explicit browser-only ceiling, separate from the current Worker contract.
 * This is NOT a new authorized backend upload or budget limit.
 */
export const MAX_LOCAL_CATALOG_RECIPES = 200;
export const MAX_LOCAL_CATALOG_WINDOWS = 20;

export type CatalogReadiness =
  | { ready: false; reason: "consent_required" | "empty_library" |
      "too_many_catalog_recipes" | "duplicate_recipe_ids" |
      "invalid_recipe_or_constraints" | "window_plan_unavailable" |
      "too_many_windows";
      recipeCount: number }
  | { ready: true; recipeCount: number; windowCount: number;
      batchCount: number; windowRecipeCounts: number[];
      batchRecipeCounts: number[]; eligibleRecipeCount: number;
      knownConflictExcludedCount: number; largestBatchBytes: number;
      /** Per-window UTF-8 body sizes; never a recipe list or upload body. */
      windowBodyBytes: number[];
      /** A future full-library session protocol is NOT active. */
      liveAiEnabled: false };

/**
 * Preserve every recipe exactly once, in original order. The algorithm
 * searches for the largest currently-valid window of <=40 full recipes,
 * <=98 KiB and <=10 staged model batches. Nothing is silently cut,
 * abbreviated or sent. All failed attempts are discarded immediately.
 */
export function assessLocalCatalogReadiness(
  recipes: readonly ImportedRecipe[],
  criteria: SearchCriteria,
  diners: readonly HouseholdProfile[],
  consentReviewed: boolean,
): CatalogReadiness {
  const recipeCount = recipes.length;
  const fail = (reason: Extract<CatalogReadiness, { ready: false }>["reason"]):
    CatalogReadiness => ({ ready: false, reason, recipeCount });

  if (!consentReviewed) return fail("consent_required");
  if (!recipeCount) return fail("empty_library");
  if (recipeCount > MAX_LOCAL_CATALOG_RECIPES) return fail("too_many_catalog_recipes");
  const ids = recipes.map(recipe => recipe.id);
  if (ids.some(id => typeof id !== "string") ||
      new Set(ids).size !== ids.length) return fail("duplicate_recipe_ids");

  let index = 0;
  const windowRecipeCounts: number[] = [];
  const batchRecipeCounts: number[] = [];
  const windowBodyBytes: number[] = [];
  let eligibleRecipeCount = 0;
  let knownConflictExcludedCount = 0;
  let largestBatchBytes = 0;

  while (index < recipeCount) {
    if (windowRecipeCounts.length >= MAX_LOCAL_CATALOG_WINDOWS)
      return fail("too_many_windows");
    const remaining = recipeCount - index;
    const maxLength = Math.min(remaining, MAX_PAPRIKA_RECIPES);
    let selected: {
      count: number; bytes: number;
      batchRecipeCounts: number[]; eligible: number; excluded: number;
      largestBatchBytes: number;
    } | null = null;
    let sawStructurallyInvalid = false;

    // The current single-window validator remains the authority on input
    // schema, immutable original text, dietary terms, and body size.
    for (let length = maxLength; length >= 1; length--) {
      const prepared = prepareLocalPaprikaRequest(
        recipes.slice(index, index + length), criteria, diners, true);
      if (!prepared.ok) {
        if (prepared.reason === "invalid_recipe_or_constraints")
          sawStructurallyInvalid = true;
        continue;
      }
      const plan = assessLocalAiReadiness(prepared);
      if (!plan.ready) continue;
      selected = {
        count: length, bytes: prepared.bytes,
        batchRecipeCounts: plan.batchRecipeCounts,
        eligible: plan.eligibleRecipeCount,
        excluded: plan.knownConflictExcludedCount,
        largestBatchBytes: plan.largestBatchBytes,
      };
      break;
    }

    if (!selected) return fail(sawStructurallyInvalid
      ? "invalid_recipe_or_constraints" : "window_plan_unavailable");
    windowRecipeCounts.push(selected.count);
    windowBodyBytes.push(selected.bytes);
    batchRecipeCounts.push(...selected.batchRecipeCounts);
    eligibleRecipeCount += selected.eligible;
    knownConflictExcludedCount += selected.excluded;
    largestBatchBytes = Math.max(largestBatchBytes, selected.largestBatchBytes);
    index += selected.count;
  }

  // Fail closed if any indexing or exclusion arithmetic unexpectedly drifts.
  if (index !== recipeCount ||
      windowRecipeCounts.reduce((a, b) => a + b, 0) !== recipeCount ||
      batchRecipeCounts.reduce((a, b) => a + b, 0) !== recipeCount ||
      eligibleRecipeCount + knownConflictExcludedCount !== recipeCount) {
    return fail("window_plan_unavailable");
  }
  return {
    ready: true, recipeCount,
    windowCount: windowRecipeCounts.length,
    batchCount: batchRecipeCounts.length,
    windowRecipeCounts, batchRecipeCounts,
    eligibleRecipeCount, knownConflictExcludedCount,
    largestBatchBytes, windowBodyBytes,
    liveAiEnabled: false,
  };
}

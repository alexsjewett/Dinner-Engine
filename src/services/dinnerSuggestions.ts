import type { Recipe } from "../types/recipe";
import type { ImportedRecipe } from "../types/importedRecipe";
import type { HouseholdProfile } from "../types/profile";
import { recommendDinners, selectDiners, type MatchResult, type SearchCriteria } from "./dinnerMatcher";
import { evaluateImportedRecipe, type ImportedMatchResult } from "./importedDinnerMatcher";

export type DinnerSuggestion = ({ source: "sample" } & MatchResult) | ImportedMatchResult;

/**
 * Use the same sample matcher as Milestone 1D. New local recipes take priority
 * as *review-needed* suggestions; no existing sample metadata is changed.
 * When no local recipes exist, sample ordering is exactly as before.
 */
export function recommendAllDinners(
  imported: ImportedRecipe[],
  samples: Recipe[],
  criteria: SearchCriteria,
  profiles: HouseholdProfile[],
  limit = 10,
): DinnerSuggestion[] {
  const diners = selectDiners(profiles, criteria);
  const mine: ImportedMatchResult[] = imported
    .map((recipe) => evaluateImportedRecipe(recipe, criteria, diners))
    .sort((a, b) => b.score - a.score || a.recipe.name.localeCompare(b.recipe.name));
  const demo: DinnerSuggestion[] = recommendDinners(samples, criteria, profiles, 10)
    .map((result) => ({ ...result, source: "sample" as const }));
  return [...mine, ...demo].slice(0, Math.max(0, Math.min(10, limit)));
}

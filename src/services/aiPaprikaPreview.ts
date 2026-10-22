import type { DinnerSuggestion } from "./dinnerSuggestions";
export function localPaprikaShortlist(results: readonly DinnerSuggestion[]) {
  return results.filter(item => item.source === "imported").slice(0, 5).map(item => ({
    id: item.recipe.id,
    title: item.recipe.name.slice(0, 150),
    ingredients: item.recipe.ingredients.slice(0, 2000),
    requiresManualReview: true as const,
    warnings: item.reviewReasons.slice(0, 4),
  }));
}

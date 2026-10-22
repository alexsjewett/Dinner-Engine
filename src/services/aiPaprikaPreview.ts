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

/** Local-only preview of the full imported recipe library, never uploaded here. */
export function fullPaprikaLibraryPreview(recipes: readonly import("../types/importedRecipe").ImportedRecipe[]) {
  return {
    recipeCount: recipes.length,
    recipeTitles: recipes.map(recipe => recipe.name),
    includesFullIngredients: true,
    includesDirections: true,
    transmitted: false as const,
  };
}

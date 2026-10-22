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

/**
 * This is a local consent manifest, NOT a request body. The actual upload
 * remains prohibited until separately approved and enabled on the server.
 */
export function localPaprikaConsentManifest(
  recipes: readonly import("../types/importedRecipe").ImportedRecipe[],
) {
  return {
    scope: "full-paprika-library" as const,
    count: recipes.length,
    includes: ["recipe names", "ingredients", "directions", "notes", "source links"] as const,
    excludes: ["household profiles", "browser storage keys"] as const,
    enabled: false as const,
  };
}

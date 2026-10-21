/** Browser-local Paprika record. Original text fields remain as exported. */
export interface ImportedRecipe {
  id: string;
  paprikaUid: string | null;
  name: string;
  ingredients: string;
  directions: string;
  description: string;
  notes: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  source: string;
  sourceUrl: string;
  categories: string[];
}

export interface ImportPreview {
  recipes: ImportedRecipe[];
  skipped: number;
  warning: string | null;
}

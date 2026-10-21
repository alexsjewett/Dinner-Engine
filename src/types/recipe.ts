/**
 * A demonstration recipe. Future imports can add provenance and verification
 * metadata without changing the core shape used by the library screens.
 */
export interface Recipe {
  id: string;
  householdId: string;
  source: string;
  title: string;
  estimatedMinutes: number;
  servings: number;
  tags: string[];
  description: string;
  ingredients: string[];
  instructions: string[];
}

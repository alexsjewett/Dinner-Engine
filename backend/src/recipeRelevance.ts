/**
 * Conservative, deterministic relevance checks shared by the browser and
 * owner-only Worker. An ingredient text hit is NOT dietary certification.
 * No network calls, storage, or user-specific data.
 */
export interface SearchableRecipe {
  name: string;
  ingredients: string;
}
export interface IngredientAdjustment {
  ingredientFrom: string;
  ingredientTo: string;
  why: string;
}
function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function variants(value: string): string[] {
  const phrase = normalize(value);
  if (!phrase) return [];
  const result = new Set([phrase, phrase + "s", phrase + "es"]);
  if (phrase.endsWith("ies") && phrase.length > 4) result.add(phrase.slice(0, -3) + "y");
  if (phrase.endsWith("s") && phrase.length > 3) result.add(phrase.slice(0, -1));
  if (phrase.endsWith("es") && phrase.length > 4) result.add(phrase.slice(0, -2));
  return [...result];
}
export function hasIngredientTerm(text: string, term: string): boolean {
  const body = " " + normalize(text) + " ";
  return variants(term).some(value => body.includes(" " + value + " "));
}
function checkedTerms(items: readonly string[]): string[] {
  return [...new Set(items.map(normalize).filter(Boolean))];
}
export function screenRecipeForSearch(
  recipe: SearchableRecipe,
  have: readonly string[],
  unavailable: readonly string[],
): { eligible: boolean; onHand: string[]; missing: string[] } {
  const listed = recipe.ingredients;
  // A recipe title may identify the star ingredient even when its imported
  // ingredient list is incomplete; exclusions always win.
  const missing = checkedTerms(unavailable).filter(term =>
    hasIngredientTerm(recipe.name + "\n" + listed, term));
  const positive = checkedTerms(have);
  const onHand = positive.filter(term => hasIngredientTerm(listed, term));
  return {
    eligible: missing.length === 0 && (positive.length === 0 || onHand.length > 0),
    onHand,
    missing,
  };
}
// Deliberately tiny cook-review whitelist: only like-for-like ingredient roles.
// Different culinary roles (e.g. broccoli and oregano) are never equivalent.
const swapGroups = [
  ["broccoli", "cauliflower"],
  ["spinach", "kale"],
  ["oregano", "thyme", "marjoram"],
  ["parsley", "cilantro"],
  ["tofu", "tempeh"],
  ["white rice", "brown rice"],
  ["olive oil", "avocado oil"],
  ["red onion", "yellow onion", "shallot"],
] as const;
function role(word: string): number {
  const value = normalize(word);
  return swapGroups.findIndex(group => group.some(item => normalize(item) === value));
}
/**
 * Accept a model's optional swap only if it changes a literal ingredient
 * to a listed-on-hand item in the SAME curated food-role group. Otherwise omit.
 * Never alter original recipe text or claim the substitution is allergy-safe.
 */
export function reviewAiAdjustments(
  changes: readonly IngredientAdjustment[] | undefined,
  recipe: SearchableRecipe,
  have: readonly string[],
  unavailable: readonly string[],
  mustAvoid: readonly string[],
): IngredientAdjustment[] {
  if (!Array.isArray(changes)) return [];
  const onHand = checkedTerms(have);
  const avoid = [...checkedTerms(unavailable), ...checkedTerms(mustAvoid)];
  return changes.slice(0, 1).flatMap(change => {
    if (!change || typeof change.ingredientFrom !== "string" ||
        typeof change.ingredientTo !== "string" || typeof change.why !== "string")
      return [];
    const from = normalize(change.ingredientFrom);
    const to = normalize(change.ingredientTo);
    const category = role(from);
    if (category < 0 || category !== role(to) || from === to ||
        !hasIngredientTerm(recipe.ingredients, from) ||
        !onHand.includes(to) ||
        avoid.some(term => hasIngredientTerm(to, term) || hasIngredientTerm(term, to)))
      return [];
    // Do not trust freeform model rationale. Use a grounded explanation.
    return [{ ingredientFrom: change.ingredientFrom,
      ingredientTo: change.ingredientTo,
      why: "You listed " + change.ingredientTo + " as available. Check whether this swap works in the recipe." }];
  });
}

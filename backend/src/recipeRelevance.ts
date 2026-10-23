/**
 * Conservative ingredient relevance and chef-guided adaptation planning.
 * Shared between browser and Worker. Never a food/allergen certification.
 * Only tightly scoped, food-science-plausible hard-constraint workarounds
 * may promote a recipe to the AI candidate set.
 */
export interface SearchableRecipe {
  name: string;
  ingredients: string;
  directions?: string;
}
export interface IngredientAdjustment {
  ingredientFrom: string;
  ingredientTo: string;
  why: string;
  method?: "substitute" | "omit";
}
export interface RecipeScreen {
  eligible: boolean;
  onHand: string[];
  missing: string[];
  adjustments: IngredientAdjustment[];
  adaptationTier: number;
}
function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function variants(value: string): string[] {
  const term = normalize(value);
  if (!term) return [];
  const found = new Set([term, term + "s", term + "es"]);
  if (term.endsWith("ies") && term.length > 4) found.add(term.slice(0, -3) + "y");
  if (term.endsWith("s") && term.length > 3) found.add(term.slice(0, -1));
  if (term.endsWith("es") && term.length > 4) found.add(term.slice(0, -2));
  return [...found];
}
export function hasIngredientTerm(text: string, term: string): boolean {
  const padded = " " + normalize(text) + " ";
  return variants(term).some(value => padded.includes(" " + value + " "));
}
function checkedTerms(items: readonly string[]): string[] {
  return [...new Set(items.map(normalize).filter(Boolean))];
}
function ingredientLines(source: string): string[] {
  return source.split(/\r?\n|\\n/).map(line => line.trim()).filter(Boolean);
}
function plantBasedIngredient(line: string, term: string): boolean {
  const t = normalize(term);
  // A dairy avoidance entry "milk" must not automatically flag coconut milk.
  if (t === "milk" || t === "dairy milk") {
    return /(?:coconut|oat|almond|soy|rice|cashew|pea)\s+milk\b/i.test(line);
  }
  if (t === "butter") return /\b(?:peanut|almond|cashew|sunflower)\s+butter\b/i.test(line);
  if (t === "cheese") return /\b(?:vegan|dairy.free|plant.based)\s+cheese\b/i.test(line);
  return false;
}
function aliases(term: string): string[] {
  switch (normalize(term)) {
    case "dairy":
      return ["milk", "butter", "cheese", "cream", "yogurt", "whey"];
    case "soy":
      return ["soy", "tofu", "tempeh", "edamame", "tamari"];
    case "tree nuts":
    case "nuts":
      return ["almonds", "walnuts", "cashews", "pecans", "pistachios", "hazelnuts", "peanuts"];
    case "gluten":
      return ["gluten", "wheat", "all purpose flour", "soy sauce", "bread", "pasta"];
    default: return [term];
  }
}
function matchLines(recipe: SearchableRecipe, term: string): string[] {
  return ingredientLines(recipe.ingredients).filter(line =>
    aliases(term).some(alias =>
      hasIngredientTerm(line, alias) && !plantBasedIngredient(line, alias)));
}
function avoidedReplacement(to: string, unavailable: readonly string[],
  mustAvoid: readonly string[], needs: readonly string[]): boolean {
  const blocked = [...unavailable, ...mustAvoid];
  if (blocked.some(word => aliases(word).some(alias =>
      hasIngredientTerm(to, alias) && !plantBasedIngredient(to, alias)))) return true;
  const vegan = needs.includes("vegan");
  const vegetarian = vegan || needs.includes("vegetarian");
  if (vegetarian && /\b(?:meat|chicken|beef|pork|fish|shrimp)\b/i.test(to)) return true;
  if (vegan && /\b(?:egg|milk|cheese|butter|honey)\b/i.test(to) &&
      !/\b(?:coconut milk|oat milk|almond milk|vegan cheese)\b/i.test(to)) return true;
  if (needs.includes("gluten-free") &&
      /\b(?:wheat|gluten|flour|bread|soy sauce)\b/i.test(to)) return true;
  return false;
}
const roleGroups = [
  ["broccoli", "cauliflower"],
  ["spinach", "kale"],
  ["oregano", "thyme", "marjoram"],
  ["parsley", "cilantro"],
  ["black beans", "pinto beans", "kidney beans"],
  ["white rice", "brown rice"],
  ["olive oil", "avocado oil"],
  ["red onion", "yellow onion", "shallot"],
] as const;
function role(value: string): number {
  return roleGroups.findIndex(group => group.some(word => normalize(word) === normalize(value)));
}
const optionalGarnish = new Set([
  "olives", "sesame seeds", "parsley", "cilantro", "chives", "green onions", "scallions",
]);
const meatTerms = ["chicken", "beef", "pork", "bacon", "sausage", "turkey",
  "fish", "salmon", "tuna", "shrimp", "anchovy", "gelatin"];
const veganTerms = ["egg", "eggs", "milk", "butter", "cheese", "cream", "honey", "yogurt"];
function dietaryTerms(needs: readonly string[]): string[] {
  const out: string[] = [];
  if (needs.includes("vegetarian") || needs.includes("vegan")) out.push(...meatTerms);
  if (needs.includes("vegan")) out.push(...veganTerms);
  if (needs.includes("gluten-free")) out.push("wheat", "all purpose flour", "bread", "pasta", "soy sauce");
  return checkedTerms(out);
}
function chooseReplacement(term: string, line: string, recipe: SearchableRecipe,
  have: readonly string[], unavailable: readonly string[], must: readonly string[],
  needs: readonly string[]): { change: IngredientAdjustment; tier: number } | null {
  const title = normalize(recipe.name);
  const normalizedTerm = normalize(term);
  const t = normalizedTerm === "dairy"
    ? ["milk", "butter", "cheese", "cream", "yogurt"].find(word =>
        hasIngredientTerm(line, word) && !plantBasedIngredient(line, word)) ?? normalizedTerm
    : normalizedTerm;
  if (t.length > 80) return null;
  const entireDish = title.includes(t) && !/black beans|pinto beans/.test(t);
  // Optional ingredients may be removed only when truly marked optional
  // and the dish is not named for that ingredient.
  if (optionalGarnish.has(t) && !entireDish &&
      /\b(optional|garnish|for serving|to serve|topping|on top)\b/i.test(line)) {
    return { tier: 2, change: {
      ingredientFrom: t, ingredientTo: "omit", method: "omit",
      why: "Optional garnish; the main dish works without it.",
    } };
  }
  const possibilities: Array<{from: string; to: string[]; context?: RegExp; tier?: number}> = [
    { from: "black beans", to: ["pinto beans", "kidney beans"] },
    { from: "pinto beans", to: ["black beans", "kidney beans"] },
    { from: "kidney beans", to: ["pinto beans", "black beans"] },
    { from: "broccoli", to: ["cauliflower"] },
    { from: "spinach", to: ["kale"] },
    { from: "milk", to: ["coconut milk", "oat milk"], context: /\b(curry|stew|soup)\b/i },
    { from: "dairy milk", to: ["coconut milk", "oat milk"], context: /\b(curry|stew|soup)\b/i },
    { from: "butter", to: ["olive oil"], context: /\b(curry|saute|stir fry|stir.fry)\b/i, tier: 2 },
    { from: "egg", to: ["firm tofu and nutritional yeast"], context: /\bquiche\b/i, tier: 4 },
    { from: "eggs", to: ["firm tofu and nutritional yeast"], context: /\bquiche\b/i, tier: 4 },
  ];
  const options = possibilities.find(option => option.from === t &&
    (!option.context || option.context.test(recipe.name + " " + recipe.directions)));
  if (!options) return null;
  // Do not treat words in an ingredient label as a whole ingredient type.
  if ((t === "milk" || t === "dairy milk") &&
      /buttermilk|condensed milk|evaporated milk/i.test(line)) return null;
  if (t === "egg" && /\begg\s+noodles\b/i.test(line)) return null;
  // Limit transformative adaptations to explicitly recognized contexts.
  if (entireDish && !/quiche/.test(title) && !/beans/.test(t)) return null;
  const alternatives = [...options.to].sort((a, b) =>
    Number(have.some(x => hasIngredientTerm(b, x))) -
    Number(have.some(x => hasIngredientTerm(a, x))));
  const to = alternatives.find(candidate =>
    !avoidedReplacement(candidate, unavailable, must, needs));
  if (!to) return null;
  // Avoid replacing a side seasoning with a vegetable or a protein.
  if (role(t) !== -1 && role(t) === role(to)) {
    // A known conventional culinary-role swap.
  } else if (!["milk", "dairy milk", "butter", "egg", "eggs"].includes(t)) {
    return null;
  }
  return { tier: options.tier ?? 1, change: {
    ingredientFrom: t, ingredientTo: to, method: "substitute",
    why: have.some(x => hasIngredientTerm(to, x))
      ? "A conventional alternative you listed as available."
      : options.tier === 4
        ? "A more involved vegan-style filling; adjust the preparation as well."
        : "A conventional alternative; not confirmed on hand.",
  } };
}
/**
 * Pantry entries are hints. Explicitly missing or prohibited ingredients
 * require a *validated* adaptation, not just the model's promise of one.
 * Unmentioned pantry ingredients remain unknown, not missing.
 */
export function screenRecipeForSearch(
  recipe: SearchableRecipe, have: readonly string[], unavailable: readonly string[],
  mustAvoid: readonly string[] = [], dietaryNeeds: readonly string[] = [],
): RecipeScreen {
  const onHand = checkedTerms(have).filter(term =>
    hasIngredientTerm(recipe.ingredients, term) &&
    !checkedTerms(unavailable).some(missing => aliases(missing).some(x =>
      hasIngredientTerm(term, x))));
  const missing = checkedTerms(unavailable).filter(term =>
    matchLines(recipe, term).length > 0 || hasIngredientTerm(recipe.name, term));
  const needs = checkedTerms(dietaryNeeds);
  const required = checkedTerms([...unavailable, ...mustAvoid, ...dietaryTerms(needs)]);
  const adjustments: IngredientAdjustment[] = [];
  let adaptationTier = 0;
  for (const term of required) {
    const lines = matchLines(recipe, term);
    const titleOnly = hasIngredientTerm(recipe.name, term) && lines.length === 0 &&
      !plantBasedIngredient(recipe.name, term);
    if (titleOnly) return { eligible: false, onHand, missing, adjustments: [], adaptationTier: 5 };
    if (!lines.length) continue;
    // A repeated hard ingredient can require multiple recipe changes: reject
    // rather than claiming that one narrow swap fixes every preparation.
    if (lines.length > 1) return {
      eligible: false, onHand, missing, adjustments: [], adaptationTier: 5,
    };
    const change = chooseReplacement(term, lines[0], recipe,
      checkedTerms(have), checkedTerms(unavailable), checkedTerms(mustAvoid), needs);
    if (!change) return { eligible: false, onHand, missing, adjustments: [], adaptationTier: 5 };
    if (adjustments.some(existing => hasIngredientTerm(lines[0], existing.ingredientFrom))) {
      continue; // Same original ingredient resolved via overlapping constraints.
    }
    adjustments.push(change.change);
    adaptationTier = Math.max(adaptationTier, change.tier);
    if (adjustments.length > 2) return {
      eligible: false, onHand, missing, adjustments: [], adaptationTier: 5,
    };
  }
  return { eligible: true, onHand, missing, adjustments, adaptationTier };
}
/**
 * Return independently verified hard-constraint changes, never freeform advice.
 * An optional AI suggestion without a hard constraint must match an explicit
 * conventional ingredient-role group and an actual original ingredient.
 */
export function reviewAiAdjustments(
  changes: readonly IngredientAdjustment[] | undefined,
  recipe: SearchableRecipe, have: readonly string[], unavailable: readonly string[],
  mustAvoid: readonly string[], dietaryNeeds: readonly string[] = [],
): IngredientAdjustment[] {
  const screening = screenRecipeForSearch(recipe, have, unavailable, mustAvoid, dietaryNeeds);
  if (!screening.eligible) return [];
  if (screening.adjustments.length) return screening.adjustments;
  if (!Array.isArray(changes)) return [];
  const onHand = checkedTerms(have);
  const avoid = [...checkedTerms(unavailable), ...checkedTerms(mustAvoid)];
  return changes.slice(0, 1).flatMap(change => {
    if (!change || typeof change.ingredientFrom !== "string" ||
        typeof change.ingredientTo !== "string") return [];
    const from = normalize(change.ingredientFrom);
    const to = normalize(change.ingredientTo);
    const group = role(from);
    if (group < 0 || group !== role(to) || from === to ||
        !matchLines(recipe, from).length ||
        !onHand.includes(to) ||
        avoid.some(term => hasIngredientTerm(to, term))) return [];
    return [{ ingredientFrom: change.ingredientFrom,
      ingredientTo: change.ingredientTo, method: "substitute" as const,
      why: "A conventional alternative you listed as available." }];
  });
}

/**
 * Stable cross-batch ranking for already screened recipes. The model supplies
 * culinary judgment within each batch; these signals make pantry and softer
 * restrictions comparable across batches. Never override eligibility.
 */
export function recommendationFitScore(
  recipe: SearchableRecipe, have: readonly string[], unavailable: readonly string[],
  mustAvoid: readonly string[], needs: readonly string[],
  shouldAvoid: readonly string[], preferAvoid: readonly string[],
): number {
  const screened = screenRecipeForSearch(recipe, have, unavailable, mustAvoid, needs);
  if (!screened.eligible) return -10_000;
  let score = 100 + Math.min(screened.onHand.length, 4) * 12
    - screened.adaptationTier * 20 - screened.adjustments.length * 6;
  const prominent = (word: string) => hasIngredientTerm(recipe.name, word);
  for (const word of checkedTerms(shouldAvoid)) {
    if (matchLines(recipe, word).length) score -= prominent(word) ? 60 : 13;
  }
  for (const word of checkedTerms(preferAvoid)) {
    if (matchLines(recipe, word).length) score -= prominent(word) ? 28 : 5;
  }
  return score;
}

import { recipeFacts, type IngredientFact } from "../data/recipeFacts";
import type { Recipe } from "../types/recipe";
import type { HouseholdProfile } from "../types/profile";
import { dietaryNeedLabel, avoidanceLevelLabel } from "../types/profile";

export type TimeChoice = 15 | 30 | 45 | 60;

export type SearchCriteria = {
  haveText: string;
  unavailableText: string;
  time: TimeChoice;
  dinerMode: "all" | "selected";
  selectedProfileIds: string[];
};

export type MatchResult = {
  recipe: Recipe;
  category: "straightforward" | "review";
  score: number;
  onHand: string[];
  notMarkedOnHand: string[];
  unavailable: string[];
  softNotes: string[];
  reviewReasons: string[];
};

function normalized(text: string): string {
  return text.toLocaleLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseIngredientInput(text: string): string[] {
  const seen = new Set<string>();
  return text.split(",").map((term) => term.trim()).filter((term) => {
    const key = normalized(term);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchTerm(term: string, item: IngredientFact, includeGroups: boolean): boolean {
  const needle = normalized(term);
  if (!needle) return false;
  const values = [item.label, ...item.aliases, ...(includeGroups ? item.groups : [])];
  return values.some((value) => normalized(value) === needle);
}

function pantryResult(
  ingredients: IngredientFact[],
  have: string[],
  unavailableInput: string[],
): Pick<MatchResult, "onHand" | "notMarkedOnHand" | "unavailable"> {
  const onHand: string[] = [];
  const notMarkedOnHand: string[] = [];
  const unavailable: string[] = [];
  for (const item of ingredients) {
    // Unavailable takes precedence if a food appears in both input fields.
    if (unavailableInput.some((term) => matchTerm(term, item, false))) {
      unavailable.push(item.label);
    } else if (have.some((term) => matchTerm(term, item, false))) {
      onHand.push(item.label);
    } else if (have.length > 0) {
      notMarkedOnHand.push(item.label);
    }
  }
  return { onHand, notMarkedOnHand, unavailable };
}

export function selectDiners(
  profiles: HouseholdProfile[],
  criteria: SearchCriteria,
): HouseholdProfile[] {
  return criteria.dinerMode === "all"
    ? profiles
    : profiles.filter((person) => criteria.selectedProfileIds.includes(person.id));
}

export function evaluateRecipe(
  recipe: Recipe,
  criteria: SearchCriteria,
  diners: HouseholdProfile[],
): MatchResult {
  const facts = recipeFacts[recipe.id];
  if (!facts) {
    return {
      recipe, category: "review", score: -100,
      onHand: [], notMarkedOnHand: [], unavailable: [],
      softNotes: [], reviewReasons: ["Recipe ingredient classification is missing; review manually."],
    };
  }

  const have = parseIngredientInput(criteria.haveText);
  const unavailableInput = parseIngredientInput(criteria.unavailableText);
  const kitchen = pantryResult(facts.ingredients, have, unavailableInput);
  const reviewReasons: string[] = [];
  const softNotes: string[] = [];

  if (recipe.estimatedMinutes > criteria.time) {
    reviewReasons.push("Takes about " + recipe.estimatedMinutes + " min, over your " + criteria.time + "-minute target.");
  }
  if (kitchen.unavailable.length > 0) {
    reviewReasons.push("Marked unavailable: " + kitchen.unavailable.join(", ") + ".");
  }

  // Dietary constraints belong to the actual selected diners, not the entire family.
  for (const person of diners) {
    for (const restriction of person.foodRestrictions) {
      const hits = facts.ingredients.filter((item) => matchTerm(restriction.food, item, true));
      if (hits.length === 0) continue;
      const description = person.name + ": " + restriction.food + " (" +
        avoidanceLevelLabel(restriction.level) + ") appears as " +
        hits.map((hit) => hit.label).join(", ") + ".";
      if (restriction.level === "must") reviewReasons.push(description);
      else softNotes.push(description);
    }

    for (const need of person.dietaryNeeds) {
      const status = facts.dietary[need];
      if (status === "no-known-conflict") continue;
      const detail = facts.notes[need] ?? "Check original ingredients and product labels.";
      reviewReasons.push(person.name + " (" + dietaryNeedLabel(need) + "): " + detail);
    }
  }

  // Not a food safety tool. The demo facts cannot evaluate labels, cross-contact
  // or unrecognized aliases, and cannot verify whether adaptations are appropriate.
  const score =
    (recipe.estimatedMinutes <= criteria.time ? 70 : -30)
    + kitchen.onHand.length * 15
    - kitchen.notMarkedOnHand.length * 2
    - kitchen.unavailable.length * 35
    - softNotes.length * 9
    - reviewReasons.length * 40
    - recipe.estimatedMinutes / 10;

  return {
    recipe, category: reviewReasons.length > 0 ? "review" : "straightforward",
    score, ...kitchen, softNotes, reviewReasons,
  };
}

/**
 * Keep the original first three suggestions, then optionally append other
 * candidates without softening or changing the matching/ranking rules.
 */
export function recommendDinners(
  recipes: Recipe[],
  criteria: SearchCriteria,
  profiles: HouseholdProfile[],
  limit = 3,
): MatchResult[] {
  const diners = selectDiners(profiles, criteria);
  const results = recipes.map((recipe) => evaluateRecipe(recipe, criteria, diners));
  const byScore = (a: MatchResult, b: MatchResult) =>
    b.score - a.score || a.recipe.title.localeCompare(b.recipe.title);
  const direct = results.filter((item) => item.category === "straightforward").sort(byScore);
  const review = results.filter((item) => item.category === "review").sort(byScore);
  const chosen = direct.slice(0, review.length > 0 ? 2 : 3);
  const topThree = [...chosen, ...review.slice(0, 3 - chosen.length)];
  if (limit <= 3) return topThree.slice(0, Math.max(0, limit));

  // First three match the original behavior. Extra options are appended after
  // them, preserving each candidate's conflict/review classification.
  const topIds = new Set(topThree.map((item) => item.recipe.id));
  const additional = [...direct, ...review].filter((item) => !topIds.has(item.recipe.id));
  return [...topThree, ...additional].slice(0, Math.min(10, limit));
}

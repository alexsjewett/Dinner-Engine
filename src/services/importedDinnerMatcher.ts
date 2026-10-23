import type { ImportedRecipe } from "../types/importedRecipe";
import type { HouseholdProfile } from "../types/profile";
import type { MatchResult, SearchCriteria } from "./dinnerMatcher";

/** Imported recipes have NOT been manually classified for dietary safety. */
export type ImportedMatchResult = Omit<MatchResult, "recipe"> & {
  source: "imported";
  recipe: ImportedRecipe;
  timeLabel: string;
};

function normalize(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function terms(value: string): string[] {
  return [...new Set(value.split(",").map((entry) => normalize(entry)).filter(Boolean))];
}

/**
 * Text-only, whole-word/whole-phrase detection within an original ingredient
 * line. This is NOT a verified ingredient classification. False positives and
 * false negatives are possible; never interpret a non-match as safe.
 */
function possibleLineMatch(term: string, line: string): boolean {
  const phrase = normalize(term);
  if (!phrase) return false;
  const haystack = " " + normalize(line) + " ";
  // Small, transparent singular/plural variants (egg/eggs, tomato/tomatoes).
  // They are not a food taxonomy and never imply safety when no match exists.
  const candidates = new Set([phrase, phrase + "s", phrase + "es"]);
  if (phrase.length > 3 && phrase.endsWith("s")) candidates.add(phrase.slice(0, -1));
  if (phrase.length > 4 && phrase.endsWith("es")) candidates.add(phrase.slice(0, -2));
  if (phrase.length > 4 && phrase.endsWith("ies")) candidates.add(phrase.slice(0, -3) + "y");
  return [...candidates].some((candidate) => haystack.includes(" " + candidate + " "));
}

function ingredientLines(source: string): string[] {
  return source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

/** Only parse unambiguous units; never invent times for absent/unclear fields. */
export function parseDurationMinutes(source: string): number | null {
  const value = source.trim().toLowerCase().replace(/\s+/g, " ");
  const match = /^(?:(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?))?\s*(?:(\d+(?:\.\d+)?)\s*(?:m|min|mins|minutes?))?$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  const minutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
  return Number.isFinite(minutes) && minutes > 0 && minutes <= 1440 ? minutes : null;
}

function importedTime(recipe: ImportedRecipe): { minutes: number | null; label: string; note: string | null } {
  const total = parseDurationMinutes(recipe.totalTime);
  if (total !== null) {
    return { minutes: total, label: recipe.totalTime, note: null };
  }
  const prep = parseDurationMinutes(recipe.prepTime);
  const cook = parseDurationMinutes(recipe.cookTime);
  if (prep !== null && cook !== null) {
    return { minutes: prep + cook, label: recipe.prepTime + " prep + " + recipe.cookTime + " cook", note: null };
  }
  const listed = recipe.totalTime.trim() || recipe.cookTime.trim() || recipe.prepTime.trim();
  const note = listed
    ? "Total cooking time cannot be verified from the original time fields (" + listed.slice(0, 90) + ")."
    : "Cooking time is missing from the imported recipe.";
  return { minutes: null, label: listed ? "Time unverified: " + listed : "Time not listed", note };
}

export function evaluateImportedRecipe(
  recipe: ImportedRecipe,
  criteria: SearchCriteria,
  diners: HouseholdProfile[],
): ImportedMatchResult {
  // Original Paprika text is read but NEVER mutated. Screening is intentionally
  // conservative: imported entries can only be offered as review candidates.
  const lines = ingredientLines(recipe.ingredients);
  const have = terms(criteria.haveText);
  const unavailableTerms = terms(criteria.unavailableText);
  const onHand: string[] = [];
  const notMarkedOnHand: string[] = [];
  const unavailable: string[] = [];

  for (const line of lines) {
    // User-marked unavailable always takes precedence over on-hand.
    if (unavailableTerms.some((term) => possibleLineMatch(term, line))) {
      unavailable.push(line);
    } else if (have.some((term) => possibleLineMatch(term, line))) {
      onHand.push(line);
    } else {
      // Show the original ingredient line even when users leave the pantry
      // box blank. The input is not an exhaustive household inventory.
      notMarkedOnHand.push(line);
    }
  }

  const reviewReasons: string[] = [
    "Imported ingredients have not been classified or verified. Check the complete original recipe and product labels before cooking.",
  ];
  const softNotes: string[] = [];
  const time = importedTime(recipe);
  if (time.note) reviewReasons.push(time.note);
  else if (time.minutes !== null && time.minutes > criteria.time) {
    reviewReasons.push("Estimated " + time.minutes + " min based on the listed time, over your " + criteria.time + "-minute target.");
  }
  if (!lines.length) reviewReasons.push("No ingredient lines were available to check.");
  if (unavailable.length) {
    reviewReasons.push("Possible unavailable ingredient matches: " + unavailable.slice(0, 5).join("; ") +
      (unavailable.length > 5 ? " (and more)" : "") + ".");
  }

  for (const diner of diners) {
    for (const restriction of diner.foodRestrictions) {
      const hits = lines.filter((line) => possibleLineMatch(restriction.food, line));
      if (!hits.length) continue;
      const message = diner.name + ": possible " + restriction.food + " match (" +
        (restriction.level === "must" ? "Must avoid" :
          restriction.level === "should" ? "Should avoid" : "Prefer to avoid") +
        ") in " + hits.slice(0, 3).join("; ") + (hits.length > 3 ? " (and more)" : "") + ".";
      if (restriction.level === "must") reviewReasons.push(message);
      else softNotes.push(message);
    }
    if (diner.dietaryNeeds.length) {
      const labels = diner.dietaryNeeds.map((need) =>
        need === "gluten-free" ? "Gluten-free" : need === "vegan" ? "Vegan" : "Vegetarian",
      );
      reviewReasons.push(diner.name + ": " + labels.join(", ") +
        " suitability has not been checked for this imported recipe.");
    }
  }
  if (diners.some((diner) => diner.foodRestrictions.length > 0)) {
    reviewReasons.push("Text matching can miss hidden ingredients, alternative names and cross-contact; no avoidance is certified.");
  }

  // Prefer recipe matches with ingredients on hand and confirmed time.
  // Must-avoid and unavailable matches receive strong penalties *within*
  // imported suggestions; none are ever called conflict-free.
  const hardHits = reviewReasons.filter((message) => message.includes("(Must avoid)")).length;
  const score = (time.minutes === null ? 0 : time.minutes <= criteria.time ? 45 : -45)
    + onHand.length * 24
    - unavailable.length * 50
    - hardHits * 100
    - softNotes.length * 12
    - (have.length > 0 ? notMarkedOnHand.length * 2 : 0)
    - (time.minutes ?? 60) / 20;

  return {
    source: "imported",
    recipe,
    timeLabel: time.label,
    category: "review",
    score,
    onHand: onHand.slice(0, 8),
    // Complete, unconfirmed ingredient list for the card, not a claim of
    // what the household actually lacks. Do not abbreviate Paprika recipes.
    notMarkedOnHand,
    unavailable: unavailable.slice(0, 8),
    softNotes,
    reviewReasons,
  };
}

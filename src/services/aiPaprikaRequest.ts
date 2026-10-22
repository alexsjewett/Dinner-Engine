/**
 * Browser-local Paprika consent preflight only; NO network, storage or AI calls.
 * Nothing is uploaded until the user separately approves 3B.2 activation.
 */
import type { ImportedRecipe } from "../types/importedRecipe";
import type { HouseholdProfile } from "../types/profile";
import type { SearchCriteria } from "./dinnerMatcher";
import {
  MAX_PAPRIKA_BODY_BYTES, MAX_PAPRIKA_RECIPES, validateFullPaprikaPayload,
} from "../../backend/src/paprikaContract";

const unique = (values: readonly string[]): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const term = value.trim();
    const key = term.toLowerCase();
    if (term && !seen.has(key)) { seen.add(key); result.push(term); }
  }
  return result;
};
const splitTerms = (value: string): string[] => unique(value.split(","));

export type LocalPaprikaPreflight =
  | { ok: false; reason: "consent_required" | "empty_library" |
      "too_many_recipes" | "request_too_large" | "invalid_recipe_or_constraints";
      bytes: number; count: number }
  | { ok: true; bytes: number; count: number; payload: {
      version: 2; scope: "full-paprika-library";
      consent: "explicit-per-request";
      recipes: ImportedRecipe[];
      criteria: {
        have: string[]; unavailable: string[]; timeLimitMinutes: number;
        mustAvoidFoods: string[]; shouldAvoidFoods: string[];
        preferAvoidFoods: string[]; dietaryNeeds: string[];
      };
    } };

/**
 * Construct a local-only full-library draft after explicit preview consent.
 * Includes every browser-imported recipe and every selected diner's
 * restrictions, without sending any names, identities or profiles.
 * No recipe text is truncated: an oversized library fails closed.
 */
export function prepareLocalPaprikaRequest(
  recipes: readonly ImportedRecipe[],
  criteria: SearchCriteria,
  diners: readonly HouseholdProfile[],
  consentAcknowledged: boolean,
): LocalPaprikaPreflight {
  if (!consentAcknowledged) return {
    ok: false, reason: "consent_required", count: recipes.length, bytes: 0,
  };
  if (!recipes.length) return {
    ok: false, reason: "empty_library", count: 0, bytes: 0,
  };
  if (recipes.length > MAX_PAPRIKA_RECIPES) return {
    ok: false, reason: "too_many_recipes", count: recipes.length, bytes: 0,
  };
  const restrictions = (level: "must" | "should" | "prefer") =>
    unique(diners.flatMap(diner => diner.foodRestrictions
      .filter(restriction => restriction.level === level)
      .map(restriction => restriction.food)));
  const payload = {
    version: 2 as const,
    scope: "full-paprika-library" as const,
    consent: "explicit-per-request" as const,
    recipes: recipes.map(recipe => ({ ...recipe, categories: [...recipe.categories] })),
    criteria: {
      have: splitTerms(criteria.haveText),
      unavailable: splitTerms(criteria.unavailableText),
      timeLimitMinutes: criteria.time,
      mustAvoidFoods: restrictions("must"),
      shouldAvoidFoods: restrictions("should"),
      preferAvoidFoods: restrictions("prefer"),
      dietaryNeeds: unique(diners.flatMap(diner => diner.dietaryNeeds)),
    },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  if (bytes > MAX_PAPRIKA_BODY_BYTES) return {
    ok: false, reason: "request_too_large", count: recipes.length, bytes,
  };
  if (!validateFullPaprikaPayload(payload)) return {
    ok: false, reason: "invalid_recipe_or_constraints", count: recipes.length, bytes,
  };
  return { ok: true, payload, bytes, count: recipes.length };
}

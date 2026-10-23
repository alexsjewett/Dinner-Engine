import type { SearchCriteria } from "./dinnerMatcher";
import type { AiDinnerSuggestion } from "./aiPopupBridge";

// Only a tab-local snapshot of vetted output is saved. Never store original
// Paprika text or a paid request, and never launch AI when restoring a search.
const KEY = "dinner-engine:ai-search-session:v1";

export type SavedAiSearch = {
  enabled: boolean;
  searched: boolean;
  suggestions: AiDinnerSuggestion[] | null;
  failure: string;
};

export function emptyAiSearch(enabled = false): SavedAiSearch {
  return { enabled, searched: false, suggestions: null, failure: "" };
}

function validSuggestion(value: unknown): value is AiDinnerSuggestion {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Partial<AiDinnerSuggestion>;
  return typeof s.recipeId === "string" && s.recipeId.length <= 200 &&
    typeof s.explanation === "string" && s.explanation.length <= 2000 &&
    Array.isArray(s.cautions) && s.cautions.length <= 10 &&
    s.cautions.every(x => typeof x === "string" && x.length <= 1000) &&
    s.requiresManualReview === true &&
    (s.adjustments === undefined ||
      (Array.isArray(s.adjustments) && s.adjustments.length <= 2 &&
        s.adjustments.every(change =>
          typeof change.ingredientFrom === "string" && change.ingredientFrom.length <= 80 &&
          typeof change.ingredientTo === "string" && change.ingredientTo.length <= 80 &&
          typeof change.why === "string" && change.why.length <= 110 &&
          (change.method === undefined || change.method === "substitute" ||
            change.method === "omit"))));
}

export function readAiSearchSession(submitted: SearchCriteria | null): SavedAiSearch {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw || raw.length > 40_000) return emptyAiSearch();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyAiSearch();
    const v = parsed as Partial<SavedAiSearch> & { submittedKey?: unknown };
    if (typeof v.enabled !== "boolean" || typeof v.searched !== "boolean" ||
      typeof v.failure !== "string" || v.failure.length > 1000 ||
      !(v.suggestions === null ||
        (Array.isArray(v.suggestions) && v.suggestions.length <= 3 &&
          v.suggestions.every(validSuggestion)))) return emptyAiSearch();
    // A different submitted search must never inherit AI explanations or swaps.
    if (!submitted || v.submittedKey !== JSON.stringify(submitted)) {
      return emptyAiSearch(v.enabled);
    }
    return { enabled: v.enabled, searched: v.searched,
      suggestions: v.suggestions, failure: v.failure };
  } catch {
    return emptyAiSearch();
  }
}

export function saveAiSearchSession(state: SavedAiSearch,
  submitted: SearchCriteria | null): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({
      ...state, submittedKey: submitted ? JSON.stringify(submitted) : null,
    }));
  } catch {
    // Storage-disabled browsers can still use the in-memory React state.
  }
}

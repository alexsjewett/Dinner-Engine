import type { SearchCriteria } from "./dinnerMatcher";

const SESSION_KEY = "dinner-engine:find-dinner-session:v1";
export const initialCriteria: SearchCriteria = {
  haveText: "",
  unavailableText: "",
  time: 30,
  dinerMode: "all",
  selectedProfileIds: [],
};

export type SavedSearch = {
  draft: SearchCriteria;
  submitted: SearchCriteria | null;
};

function validCriteria(value: unknown): value is SearchCriteria {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<SearchCriteria>;
  return typeof v.haveText === "string" &&
    typeof v.unavailableText === "string" &&
    (v.time === 15 || v.time === 30 || v.time === 45 || v.time === 60) &&
    (v.dinerMode === "all" || v.dinerMode === "selected") &&
    Array.isArray(v.selectedProfileIds) &&
    v.selectedProfileIds.every((id: unknown) => typeof id === "string");
}

export function readSearchSession(): SavedSearch {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { draft: initialCriteria, submitted: null };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) throw Error("Invalid session");
    const object = parsed as Partial<SavedSearch>;
    if (!validCriteria(object.draft) ||
      !(object.submitted === null || validCriteria(object.submitted))) {
      throw Error("Invalid search");
    }
    return { draft: object.draft, submitted: object.submitted };
  } catch {
    return { draft: initialCriteria, submitted: null };
  }
}

export function saveSearchSession(search: SavedSearch): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(search));
  } catch {
    // Not fatal: searching still works even when session storage is disabled.
  }
}

import type { HouseholdProfile } from "../types/profile";

const STORAGE_KEY = "dinner-engine:household-profiles:v1";
export const DEMO_HOUSEHOLD_ID = "demo-household";

interface StoredProfiles {
  version: 1;
  householdId: string;
  profiles: HouseholdProfile[];
}

export interface ProfileLoadResult {
  profiles: HouseholdProfile[];
  warning: string | null;
}

function isProfile(value: unknown): value is HouseholdProfile {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    candidate.householdId === DEMO_HOUSEHOLD_ID &&
    typeof candidate.name === "string" &&
    candidate.name.length > 0 &&
    Array.isArray(candidate.foodAvoids) &&
    candidate.foodAvoids.every((avoid: unknown) => typeof avoid === "string")
  );
}

/**
 * This data lives only in the current browser. Do not treat it as encrypted,
 * backed up, synchronized, or appropriate for sensitive medical records.
 */
export function loadProfiles(): ProfileLoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { profiles: [], warning: null };

    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== "object" || saved === null) {
      throw new Error("Invalid profile storage.");
    }
    const payload = saved as Partial<StoredProfiles>;
    if (
      payload.version !== 1 ||
      payload.householdId !== DEMO_HOUSEHOLD_ID ||
      !Array.isArray(payload.profiles) ||
      !payload.profiles.every(isProfile)
    ) {
      throw new Error("Unrecognized profile storage.");
    }

    return { profiles: payload.profiles, warning: null };
  } catch {
    return {
      profiles: [],
      warning:
        "Saved profiles could not be loaded on this device. Browser storage may be unavailable or its data may be damaged. Saving a new profile may replace the unreadable data.",
    };
  }
}

/** True only after the browser confirms the update was saved. */
export function saveProfiles(profiles: HouseholdProfile[]): boolean {
  const payload: StoredProfiles = {
    version: 1,
    householdId: DEMO_HOUSEHOLD_ID,
    profiles,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function parseFoodAvoids(input: string): string[] {
  const encountered = new Set<string>();
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => {
      const normalized = item.toLocaleLowerCase();
      if (!normalized || encountered.has(normalized)) return false;
      encountered.add(normalized);
      return true;
    });
}

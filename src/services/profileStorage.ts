import type {
  AvoidanceLevel,
  DietaryNeed,
  FoodRestriction,
  HouseholdProfile,
} from "../types/profile";

/**
 * Keep the original browser key so existing household data stays accessible.
 * The payload's own 'version' field, not the key suffix, identifies its schema.
 */
const STORAGE_KEY = "dinner-engine:household-profiles:v1";
export const DEMO_HOUSEHOLD_ID = "demo-household";

interface StoredProfilesV2 {
  version: 2;
  householdId: string;
  profiles: HouseholdProfile[];
}

interface LegacyProfile {
  id: string;
  householdId: string;
  name: string;
  foodAvoids: string[];
}

export interface ProfileLoadResult {
  profiles: HouseholdProfile[];
  warning: string | null;
}

const DIETARY_NEEDS: DietaryNeed[] = ["vegetarian", "vegan", "gluten-free"];
const LEVELS: AvoidanceLevel[] = ["must", "should", "prefer"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasCommonFields(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.householdId === DEMO_HOUSEHOLD_ID &&
    typeof value.name === "string" &&
    value.name.trim().length > 0
  );
}

function isLegacyProfile(value: unknown): value is LegacyProfile {
  if (!isRecord(value) || !hasCommonFields(value)) return false;
  return Array.isArray(value.foodAvoids) &&
    value.foodAvoids.every((food: unknown) => typeof food === "string");
}

function isFoodRestriction(value: unknown): value is FoodRestriction {
  if (!isRecord(value)) return false;
  return typeof value.food === "string" &&
    value.food.trim().length > 0 &&
    LEVELS.includes(value.level as AvoidanceLevel);
}

function isProfileV2(value: unknown): value is HouseholdProfile {
  if (!isRecord(value) || !hasCommonFields(value)) return false;
  return (
    Array.isArray(value.dietaryNeeds) &&
    value.dietaryNeeds.every((need: unknown) => DIETARY_NEEDS.includes(need as DietaryNeed)) &&
    Array.isArray(value.foodRestrictions) &&
    value.foodRestrictions.every(isFoodRestriction)
  );
}

/** Do not relax old restrictions: every former avoid becomes Must avoid. */
function upgradeProfile(profile: LegacyProfile): HouseholdProfile {
  const seen = new Set<string>();
  const foodRestrictions = profile.foodAvoids
    .map((food) => food.trim())
    .filter((food) => {
      const key = food.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((food): FoodRestriction => ({ food, level: "must" }));

  return {
    id: profile.id,
    householdId: profile.householdId,
    name: profile.name,
    dietaryNeeds: [],
    foodRestrictions,
  };
}

/**
 * Reads V1 and V2 without modifying localStorage. V1 data is converted in memory;
 * the next successful explicit save writes V2. No migration can erase a profile
 * simply because the website was refreshed.
 */
export function loadProfiles(): ProfileLoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { profiles: [], warning: null };

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.householdId !== DEMO_HOUSEHOLD_ID ||
        !Array.isArray(parsed.profiles)) {
      throw new Error("Unrecognized profile data");
    }

    if (parsed.version === 2 && parsed.profiles.every(isProfileV2)) {
      return { profiles: parsed.profiles, warning: null };
    }

    if (parsed.version === 1 && parsed.profiles.every(isLegacyProfile)) {
      return {
        profiles: parsed.profiles.map(upgradeProfile),
        warning: null,
      };
    }

    throw new Error("Unsupported profile data version");
  } catch {
    return {
      profiles: [],
      warning:
        "Saved profiles could not be loaded in this browser. Storage may be unavailable or the data format may be unreadable. Saving a new profile could replace that data.",
    };
  }
}

/** Returns true only when the browser confirms persistence. */
export function saveProfiles(profiles: HouseholdProfile[]): boolean {
  const payload: StoredProfilesV2 = {
    version: 2,
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

/** Clean and validate input; duplicate foods must be resolved intentionally. */
export function validateFoodRestrictions(
  rows: FoodRestriction[],
): { restrictions: FoodRestriction[]; error: string | null } {
  const seen = new Set<string>();
  const restrictions: FoodRestriction[] = [];
  for (const row of rows) {
    const food = row.food.trim();
    if (!food) continue;
    const key = food.toLocaleLowerCase();
    if (seen.has(key)) {
      return {
        restrictions: [],
        error: "Each food can be listed only once. Please remove duplicate entries.",
      };
    }
    seen.add(key);
    restrictions.push({ food, level: row.level });
  }
  return { restrictions, error: null };
}

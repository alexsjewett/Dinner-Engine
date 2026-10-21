/** A household profile in this browser-only prototype; ID is not a security boundary. */
export type DietaryNeed = "vegetarian" | "vegan" | "gluten-free";
export type AvoidanceLevel = "must" | "should" | "prefer";

export interface FoodRestriction {
  food: string;
  level: AvoidanceLevel;
}

export interface HouseholdProfile {
  id: string;
  householdId: string;
  name: string;
  dietaryNeeds: DietaryNeed[];
  foodRestrictions: FoodRestriction[];
}

export const DIETARY_NEED_OPTIONS: { value: DietaryNeed; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten-free", label: "Gluten-free" },
];

export const AVOIDANCE_LEVEL_OPTIONS: { value: AvoidanceLevel; label: string }[] = [
  { value: "must", label: "Must avoid" },
  { value: "should", label: "Should avoid" },
  { value: "prefer", label: "Prefer to avoid" },
];

export function dietaryNeedLabel(value: DietaryNeed): string {
  return DIETARY_NEED_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
export function avoidanceLevelLabel(value: AvoidanceLevel): string {
  return AVOIDANCE_LEVEL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

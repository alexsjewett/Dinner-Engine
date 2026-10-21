/** A person in the demonstration household. This ID is not a security boundary. */
export interface HouseholdProfile {
  id: string;
  householdId: string;
  name: string;
  foodAvoids: string[];
}

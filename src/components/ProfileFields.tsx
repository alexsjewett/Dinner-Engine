import type {
  DietaryNeed,
  FoodRestriction,
  AvoidanceLevel,
} from "../types/profile";
import {
  AVOIDANCE_LEVEL_OPTIONS,
  DIETARY_NEED_OPTIONS,
} from "../types/profile";

type Props = {
  idPrefix: string;
  dietaryNeeds: DietaryNeed[];
  onDietaryNeedsChange: (needs: DietaryNeed[]) => void;
  restrictions: FoodRestriction[];
  onRestrictionsChange: (rows: FoodRestriction[]) => void;
};

/** Shared fields keep new-profile and inline editing flows consistent. */
export function ProfileFields({
  idPrefix,
  dietaryNeeds,
  onDietaryNeedsChange,
  restrictions,
  onRestrictionsChange,
}: Props) {
  function toggleNeed(need: DietaryNeed, checked: boolean) {
    onDietaryNeedsChange(
      checked
        ? [...dietaryNeeds, need]
        : dietaryNeeds.filter((item) => item !== need),
    );
  }

  function updateRestriction(index: number, patch: Partial<FoodRestriction>) {
    onRestrictionsChange(
      restrictions.map((row, i) => i === index ? { ...row, ...patch } : row),
    );
  }

  return (
    <>
      <fieldset className="profile-choice-fieldset">
        <legend>Dietary needs and eating patterns</legend>
        <p className="helper-text">
          Select any that apply. These describe meal choices, not safety certification.
        </p>
        <div className="dietary-option-list">
          {DIETARY_NEED_OPTIONS.map((option) => (
            <label className="dietary-option" key={option.value}>
              <input
                type="checkbox"
                checked={dietaryNeeds.includes(option.value)}
                onChange={(event) => toggleNeed(option.value, event.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="profile-choice-fieldset">
        <legend>Foods to avoid</legend>
        <p className="helper-text">
          Add each food separately, then choose its priority for this person.
        </p>
        <div className="profile-restriction-list">
          {restrictions.length === 0 && (
            <p className="profile-restrictions-empty">No foods listed yet.</p>
          )}
          {restrictions.map((row, index) => (
            <div className="profile-restriction-editor" key={index}>
              <div className="profile-field">
                <label htmlFor={idPrefix + "-food-" + index}>Food</label>
                <input
                  id={idPrefix + "-food-" + index}
                  type="text"
                  maxLength={120}
                  autoComplete="off"
                  placeholder="e.g. peanuts"
                  value={row.food}
                  onChange={(event) => updateRestriction(index, { food: event.target.value })}
                />
              </div>
              <div className="profile-field">
                <label htmlFor={idPrefix + "-level-" + index}>Priority</label>
                <select
                  id={idPrefix + "-level-" + index}
                  value={row.level}
                  onChange={(event) => updateRestriction(index, {
                    level: event.target.value as AvoidanceLevel,
                  })}
                >
                  {AVOIDANCE_LEVEL_OPTIONS.map((level) => (
                    <option value={level.value} key={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
              <button
                className="profile-remove-restriction"
                type="button"
                aria-label={"Remove food " + (row.food.trim() || (index + 1))}
                onClick={() => onRestrictionsChange(restrictions.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          className="profile-secondary-button profile-add-restriction"
          type="button"
          onClick={() => onRestrictionsChange([...restrictions, { food: "", level: "must" }])}
        >
          + Add another food
        </button>
      </fieldset>
    </>
  );
}

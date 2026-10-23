import { useState, type FormEvent } from "react";
import { FeatureCard } from "../components/FeatureCard";
import { ProfileFields } from "../components/ProfileFields";
import {
  DEMO_HOUSEHOLD_ID,
  loadProfiles,
  saveProfiles,
  validateFoodRestrictions,
} from "../services/profileStorage";
import {
  avoidanceLevelLabel,
  dietaryNeedLabel,
  type DietaryNeed,
  type FoodRestriction,
  type HouseholdProfile,
} from "../types/profile";

type UpdateFields = Pick<HouseholdProfile, "name" | "dietaryNeeds" | "foodRestrictions">;
type ProfileCardProps = {
  profile: HouseholdProfile;
  onUpdate: (id: string, fields: UpdateFields) => boolean;
  onDelete: (id: string) => boolean;
};

function ProfileCard({ profile, onUpdate, onDelete }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftNeeds, setDraftNeeds] = useState<DietaryNeed[]>(profile.dietaryNeeds);
  const [draftRestrictions, setDraftRestrictions] = useState<FoodRestriction[]>(
    profile.foodRestrictions,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(false);

  function beginEdit() {
    setDraftName(profile.name);
    setDraftNeeds([...profile.dietaryNeeds]);
    setDraftRestrictions(profile.foodRestrictions.map((item) => ({ ...item })));
    setIsEditing(true);
    setConfirmDelete(false);
    setUpdated(false);
    setError("");
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      setError("Please enter a name.");
      return;
    }
    const validation = validateFoodRestrictions(draftRestrictions);
    if (validation.error) {
      setError(validation.error);
      return;
    }
    if (!onUpdate(profile.id, {
      name, dietaryNeeds: draftNeeds, foodRestrictions: validation.restrictions,
    })) {
      setError("Your browser couldn't save these changes. Please try again.");
      return;
    }
    setIsEditing(false);
    setError("");
    setUpdated(true);
  }

  function handleDelete() {
    if (!onDelete(profile.id)) setError("Your browser couldn't delete this profile. Please try again.");
  }

  return (
    <article className={"household-profile-card" + (isEditing ? " household-profile-card--editing" : "")}>
      <div className="household-profile-info">
        <span className="profile-avatar" aria-hidden="true">
          {profile.name.trim().charAt(0).toLocaleUpperCase()}
        </span>
        <div className="household-profile-copy">
          <h3>{profile.name}</h3>
          {!isEditing && (
            <>
              {profile.dietaryNeeds.length > 0 && (
                <div className="household-avoid-chips profile-dietary-summary">
                  {profile.dietaryNeeds.map((need) => (
                    <span className="profile-dietary-chip" key={need}>
                      {dietaryNeedLabel(need)}
                    </span>
                  ))}
                </div>
              )}
              {profile.foodRestrictions.length > 0 ? (
                <>
                  <p className="household-avoid-title">Foods to avoid</p>
                  <div className="household-avoid-chips">
                    {profile.foodRestrictions.map((restriction) => (
                      <span className="household-avoid-chip" key={restriction.food.toLocaleLowerCase()}>
                        {restriction.food} · {avoidanceLevelLabel(restriction.level)}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="helper-text">No individual foods listed.</p>
              )}
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <form className="profile-form profile-inline-form" onSubmit={handleUpdate}>
          <p className="profile-inline-title">Edit this person</p>
          <div className="profile-field">
            <label htmlFor={"profile-edit-name-" + profile.id}>Name</label>
            <input
              id={"profile-edit-name-" + profile.id}
              type="text"
              maxLength={80}
              autoComplete="off"
              required
              value={draftName}
              onChange={(event) => { setDraftName(event.target.value); setError(""); }}
            />
          </div>
          <ProfileFields
            idPrefix={"profile-edit-" + profile.id}
            dietaryNeeds={draftNeeds}
            onDietaryNeedsChange={(needs) => { setDraftNeeds(needs); setError(""); }}
            restrictions={draftRestrictions}
            onRestrictionsChange={(rows) => { setDraftRestrictions(rows); setError(""); }}
          />
          {error && <p className="profile-alert" role="alert">{error}</p>}
          <div className="profile-form-actions">
            <button className="profile-primary-button" type="submit">Save changes</button>
            <button
              className="profile-secondary-button"
              type="button"
              onClick={() => { setIsEditing(false); setError(""); }}
            >Cancel</button>
          </div>
        </form>
      ) : confirmDelete ? (
        <div className="profile-delete-confirm">
          <p>Delete {profile.name}'s profile from this device?</p>
          {error && <p className="profile-alert" role="alert">{error}</p>}
          <div className="profile-action-row">
            <button className="profile-danger-button" type="button" onClick={handleDelete}>
              Delete profile
            </button>
            <button
              className="profile-secondary-button"
              type="button"
              onClick={() => { setConfirmDelete(false); setError(""); }}
            >Keep profile</button>
          </div>
        </div>
      ) : (
        <>
          {updated && (
            <p className="profile-inline-success" role="status">Changes saved on this device.</p>
          )}
          <div className="profile-action-row">
            <button className="profile-secondary-button" type="button" onClick={beginEdit}>
              Edit
            </button>
            <button
              className="profile-text-danger-button"
              type="button"
              onClick={() => { setConfirmDelete(true); setError(""); setUpdated(false); }}
            >Delete</button>
          </div>
        </>
      )}
    </article>
  );
}

export function Profiles() {
  const [saved, setSaved] = useState(loadProfiles);
  const [name, setName] = useState("");
  const [needs, setNeeds] = useState<DietaryNeed[]>([]);
  const [restrictions, setRestrictions] = useState<FoodRestriction[]>([]);
  const [addError, setAddError] = useState("");
  const [addNotice, setAddNotice] = useState("");

  const profiles = saved.profiles;

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedName = name.trim();
    if (!cleanedName) { setAddError("Please enter a name."); return; }
    const validation = validateFoodRestrictions(restrictions);
    if (validation.error) { setAddError(validation.error); return; }

    const next: HouseholdProfile[] = [
      ...profiles,
      {
        id: crypto.randomUUID(),
        householdId: DEMO_HOUSEHOLD_ID,
        name: cleanedName,
        dietaryNeeds: needs,
        foodRestrictions: validation.restrictions,
      },
    ];

    if (!saveProfiles(next)) {
      setAddError("Your browser couldn't save this profile. Please try again.");
      setAddNotice("");
      return;
    }

    setSaved({ profiles: next, warning: null });
    setAddNotice("Profile added on this device.");
    setAddError("");
    setName("");
    setNeeds([]);
    setRestrictions([]);
  }

  function handleUpdate(id: string, fields: UpdateFields): boolean {
    const next = profiles.map((person) => person.id === id ? { ...person, ...fields } : person);
    if (!saveProfiles(next)) return false;
    setSaved({ profiles: next, warning: null });
    return true;
  }

  function handleDelete(id: string): boolean {
    const next = profiles.filter((person) => person.id !== id);
    if (!saveProfiles(next)) return false;
    setSaved({ profiles: next, warning: null });
    return true;
  }

  return (
    <div className="page-content">
      <div className="page-intro">
        <p className="eyebrow">Made for your table</p>
        <h1>Who's eating dinner today?</h1>
        <p className="lead">
          Save dietary needs and foods to avoid for each person. Kitchen Companion uses these preferences when suggesting recipes.
        </p>
      </div>

      <div className="local-storage-note" role="note">
        <strong>Saved on this device only.</strong>{" "}
        Profiles stay in this browser, not GitHub, and do not sync to other devices.
        
      </div>

      {saved.warning && <p className="profile-alert" role="alert">{saved.warning}</p>}

      <FeatureCard eyebrow="A seat at the table" title="Add a profile">
        <form className="profile-form" onSubmit={handleAdd}>
          <div className="profile-field">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              maxLength={80}
              autoComplete="off"
              placeholder="e.g. Sample Person"
              value={name}
              onChange={(event) => {
                setName(event.target.value); setAddError(""); setAddNotice("");
              }}
              required
            />
          </div>
          <ProfileFields
            idPrefix="profile-new"
            dietaryNeeds={needs}
            onDietaryNeedsChange={(items) => { setNeeds(items); setAddError(""); }}
            restrictions={restrictions}
            onRestrictionsChange={(rows) => { setRestrictions(rows); setAddError(""); }}
          />
          {addError && <p className="profile-alert" role="alert">{addError}</p>}
          {addNotice && <p className="profile-success" role="status">{addNotice}</p>}
          <div className="profile-form-actions">
            <button className="profile-primary-button" type="submit">Save profile</button>
          </div>
        </form>
      </FeatureCard>

      <div className="library-heading profile-list-heading">
        <h2>Your household</h2>
        <span className="recipe-count">
          {profiles.length} {profiles.length === 1 ? "person" : "people"}
        </span>
      </div>

      {profiles.length === 0 ? (
        <div className="profile-empty-state">
          <span className="profile-empty-icon" aria-hidden="true">♡</span>
          <strong>No profiles yet</strong>
          <p>Add a sample person above to get started.</p>
        </div>
      ) : (
        <div className="household-profile-list">
          {profiles.map((person) => (
            <ProfileCard
              key={person.id}
              profile={person}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

    </div>
  );
}

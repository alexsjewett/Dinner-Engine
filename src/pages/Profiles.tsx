import { useState, type FormEvent } from "react";
import { FeatureCard } from "../components/FeatureCard";
import {
  DEMO_HOUSEHOLD_ID,
  loadProfiles,
  parseFoodAvoids,
  saveProfiles,
} from "../services/profileStorage";
import type { HouseholdProfile } from "../types/profile";

type ProfileCardProps = {
  profile: HouseholdProfile;
  onUpdate: (id: string, name: string, foodAvoids: string[]) => boolean;
  onDelete: (id: string) => boolean;
};

/** Each profile owns its edit draft, so editing stays inside the tapped card. */
function ProfileCard({ profile, onUpdate, onDelete }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftAvoids, setDraftAvoids] = useState(profile.foodAvoids.join(", "));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(false);

  function beginEdit() {
    setDraftName(profile.name);
    setDraftAvoids(profile.foodAvoids.join(", "));
    setIsEditing(true);
    setConfirmDelete(false);
    setUpdated(false);
    setError("");
  }

  function cancelEdit() {
    setIsEditing(false);
    setError("");
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      setError("Please enter a name.");
      return;
    }
    if (!onUpdate(profile.id, name, parseFoodAvoids(draftAvoids))) {
      setError(
        "Your browser couldn't save this change. Please check its storage settings and try again.",
      );
      return;
    }
    setIsEditing(false);
    setError("");
    setUpdated(true);
  }

  function handleDelete() {
    if (!onDelete(profile.id)) {
      setError("Your browser couldn't delete this profile. Please try again.");
    }
  }

  return (
    <article className={"household-profile-card" + (isEditing ? " household-profile-card--editing" : "")}>
      <div className="household-profile-info">
        <span className="profile-avatar" aria-hidden="true">
          {profile.name.trim().charAt(0).toLocaleUpperCase()}
        </span>
        <div className="household-profile-copy">
          <h3>{profile.name}</h3>
          {!isEditing && (profile.foodAvoids.length ? (
            <>
              <p className="household-avoid-title">Foods avoided</p>
              <div className="household-avoid-chips">
                {profile.foodAvoids.map((food) => (
                  <span className="household-avoid-chip" key={food}>{food}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="helper-text">No foods listed as avoided.</p>
          ))}
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
              autoComplete="off"
              maxLength={80}
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value);
                setError("");
              }}
              required
            />
          </div>
          <div className="profile-field">
            <label htmlFor={"profile-edit-avoids-" + profile.id}>Foods they avoid</label>
            <textarea
              id={"profile-edit-avoids-" + profile.id}
              rows={3}
              maxLength={1000}
              placeholder="e.g. peanuts, shellfish, sesame"
              value={draftAvoids}
              onChange={(event) => {
                setDraftAvoids(event.target.value);
                setError("");
              }}
              aria-describedby={"profile-edit-help-" + profile.id}
            />
            <p id={"profile-edit-help-" + profile.id} className="helper-text">
              Separate foods with commas. Leave blank if none.
            </p>
          </div>
          {error && <p className="profile-alert" role="alert">{error}</p>}
          <div className="profile-form-actions">
            <button className="profile-primary-button" type="submit">
              Save changes
            </button>
            <button
              className="profile-secondary-button"
              type="button"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : confirmDelete ? (
        <div className="profile-delete-confirm">
          <p>Delete {profile.name}'s profile from this device?</p>
          {error && <p className="profile-alert" role="alert">{error}</p>}
          <div className="profile-action-row">
            <button
              type="button"
              className="profile-danger-button"
              onClick={handleDelete}
            >
              Delete profile
            </button>
            <button
              type="button"
              className="profile-secondary-button"
              onClick={() => {
                setConfirmDelete(false);
                setError("");
              }}
            >
              Keep profile
            </button>
          </div>
        </div>
      ) : (
        <>
          {updated && (
            <p className="profile-inline-success" role="status">
              Changes saved on this device.
            </p>
          )}
          <div className="profile-action-row">
            <button
              className="profile-secondary-button"
              type="button"
              onClick={beginEdit}
            >
              Edit
            </button>
            <button
              className="profile-text-danger-button"
              type="button"
              onClick={() => {
                setConfirmDelete(true);
                setError("");
                setUpdated(false);
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </article>
  );
}

export function Profiles() {
  const [saved, setSaved] = useState(loadProfiles);
  const [name, setName] = useState("");
  const [avoidsText, setAvoidsText] = useState("");
  const [addError, setAddError] = useState("");
  const [addNotice, setAddNotice] = useState("");

  const profiles = saved.profiles;

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedName = name.trim();
    if (!cleanedName) {
      setAddError("Please enter a name.");
      return;
    }

    const next: HouseholdProfile[] = [
      ...profiles,
      {
        id: crypto.randomUUID(),
        householdId: DEMO_HOUSEHOLD_ID,
        name: cleanedName,
        foodAvoids: parseFoodAvoids(avoidsText),
      },
    ];

    if (!saveProfiles(next)) {
      setAddError(
        "Your browser couldn't save this profile. Please check its storage settings and try again.",
      );
      setAddNotice("");
      return;
    }

    setSaved({ profiles: next, warning: null });
    setAddNotice("Profile added on this device.");
    setAddError("");
    setName("");
    setAvoidsText("");
  }

  function handleUpdate(id: string, newName: string, foodAvoids: string[]): boolean {
    const next = profiles.map((person) =>
      person.id === id ? { ...person, name: newName, foodAvoids } : person,
    );
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
        <h1>Who's coming to dinner?</h1>
        <p className="lead">
          Keep track of the foods each person avoids. These profiles will be
          available to select when we build Find Dinner.
        </p>
      </div>

      <div className="local-storage-note" role="note">
        <strong>Saved on this device only.</strong>{" "}
        Profiles stay in this browser, not in GitHub, and won't sync with
        your phone or laptop. For now, use fictional test profiles rather
        than sensitive medical details.
      </div>

      {saved.warning && (
        <p className="profile-alert" role="alert">{saved.warning}</p>
      )}

      <FeatureCard eyebrow="A seat at the table" title="Add a profile">
        <form className="profile-form" onSubmit={handleAdd}>
          <div className="profile-field">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              autoComplete="off"
              maxLength={80}
              placeholder="e.g. Sample Person"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setAddError("");
                setAddNotice("");
              }}
              required
            />
          </div>
          <div className="profile-field">
            <label htmlFor="profile-avoids">Foods they avoid</label>
            <textarea
              id="profile-avoids"
              rows={3}
              maxLength={1000}
              placeholder="e.g. peanuts, shellfish, sesame"
              value={avoidsText}
              onChange={(event) => {
                setAvoidsText(event.target.value);
                setAddError("");
                setAddNotice("");
              }}
              aria-describedby="profile-avoids-help"
            />
            <p id="profile-avoids-help" className="helper-text">
              Separate foods with commas. Leave blank if there are none to list.
            </p>
          </div>
          {addError && <p className="profile-alert" role="alert">{addError}</p>}
          {addNotice && <p className="profile-success" role="status">{addNotice}</p>}
          <div className="profile-form-actions">
            <button className="profile-primary-button" type="submit">
              Save profile
            </button>
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

      <div className="gentle-note">
        <span className="note-symbol" aria-hidden="true">♡</span>
        <div>
          <strong>Food restrictions need careful review.</strong>
          <p>
            Future recipe suggestions will combine selected people's avoids,
            but AI won't certify recipes as allergy-safe.
          </p>
        </div>
      </div>
    </div>
  );
}

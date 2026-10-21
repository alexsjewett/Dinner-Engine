import { useState, type FormEvent } from "react";
import { FeatureCard } from "../components/FeatureCard";
import {
  DEMO_HOUSEHOLD_ID,
  loadProfiles,
  parseFoodAvoids,
  saveProfiles,
} from "../services/profileStorage";
import type { HouseholdProfile } from "../types/profile";

export function Profiles() {
  const [saved, setSaved] = useState(loadProfiles);
  const [name, setName] = useState("");
  const [avoidsText, setAvoidsText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const profiles = saved.profiles;
  const editing = editingId !== null;

  function resetEditor() {
    setEditingId(null);
    setName("");
    setAvoidsText("");
    setFormError("");
  }

  function beginEdit(profile: HouseholdProfile) {
    setEditingId(profile.id);
    setName(profile.name);
    setAvoidsText(profile.foodAvoids.join(", "));
    setPendingDeleteId(null);
    setFormError("");
    setNotice("");
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedName = name.trim();
    if (!cleanedName) {
      setFormError("Please enter a name.");
      return;
    }

    const foodAvoids = parseFoodAvoids(avoidsText);
    const next: HouseholdProfile[] = editingId
      ? profiles.map((person) =>
          person.id === editingId
            ? { ...person, name: cleanedName, foodAvoids }
            : person,
        )
      : [
          ...profiles,
          {
            id: crypto.randomUUID(),
            householdId: DEMO_HOUSEHOLD_ID,
            name: cleanedName,
            foodAvoids,
          },
        ];

    if (!saveProfiles(next)) {
      setFormError(
        "Your browser couldn't save this change. Please check browser storage settings and try again.",
      );
      return;
    }

    setSaved({ profiles: next, warning: null });
    setNotice(editing ? "Profile updated on this device." : "Profile saved on this device.");
    resetEditor();
    setPendingDeleteId(null);
  }

  function handleDelete(id: string) {
    const next = profiles.filter((profile) => profile.id !== id);
    if (!saveProfiles(next)) {
      setFormError("Your browser couldn't delete this profile. Please try again.");
      setNotice("");
      return;
    }

    setSaved({ profiles: next, warning: null });
    if (editingId === id) resetEditor();
    setPendingDeleteId(null);
    setNotice("Profile deleted from this device.");
    setFormError("");
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
      {notice && <p className="profile-success" role="status">{notice}</p>}

      <FeatureCard
        eyebrow={editing ? "Editing a household member" : "A seat at the table"}
        title={editing ? "Edit profile" : "Add a profile"}
      >
        <form className="profile-form" onSubmit={handleSave}>
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
                setFormError("");
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
                setFormError("");
              }}
              aria-describedby="profile-avoids-help"
            />
            <p id="profile-avoids-help" className="helper-text">
              Separate foods with commas. Leave blank if there are none to list.
            </p>
          </div>
          {formError && <p className="profile-alert" role="alert">{formError}</p>}
          <div className="profile-form-actions">
            <button className="profile-primary-button" type="submit">
              {editing ? "Save changes" : "Save profile"}
            </button>
            {editing && (
              <button className="profile-secondary-button" type="button" onClick={resetEditor}>
                Cancel editing
              </button>
            )}
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
            <article className="household-profile-card" key={person.id}>
              <div className="household-profile-info">
                <span className="profile-avatar" aria-hidden="true">
                  {person.name.trim().charAt(0).toLocaleUpperCase()}
                </span>
                <div className="household-profile-copy">
                  <h3>{person.name}</h3>
                  {person.foodAvoids.length ? (
                    <>
                      <p className="household-avoid-title">Foods avoided</p>
                      <div className="household-avoid-chips">
                        {person.foodAvoids.map((food) => (
                          <span className="household-avoid-chip" key={food}>{food}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="helper-text">No foods listed as avoided.</p>
                  )}
                </div>
              </div>
              {pendingDeleteId === person.id ? (
                <div className="profile-delete-confirm">
                  <p>Delete {person.name}'s profile from this device?</p>
                  <div className="profile-action-row">
                    <button
                      type="button"
                      className="profile-danger-button"
                      onClick={() => handleDelete(person.id)}
                    >
                      Delete profile
                    </button>
                    <button
                      type="button"
                      className="profile-secondary-button"
                      onClick={() => setPendingDeleteId(null)}
                    >
                      Keep profile
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-action-row">
                  <button className="profile-secondary-button" type="button" onClick={() => beginEdit(person)}>
                    Edit
                  </button>
                  <button
                    className="profile-text-danger-button"
                    type="button"
                    onClick={() => {
                      setPendingDeleteId(person.id);
                      setNotice("");
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
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

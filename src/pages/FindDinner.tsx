import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { FeatureCard } from "../components/FeatureCard";
import { DinnerResultCard } from "../components/DinnerResultCard";
import { getAllRecipes } from "../data/cookbook";
import { loadProfiles } from "../services/profileStorage";
import {
  recommendDinners, selectDiners,
  type SearchCriteria, type TimeChoice,
} from "../services/dinnerMatcher";
import { readSearchSession, saveSearchSession, type SavedSearch } from "../services/searchSession";

export function FindDinner() {
  const [search, setSearch] = useState<SavedSearch>(readSearchSession);
  const [profilesState] = useState(loadProfiles);
  const [error, setError] = useState("");
  const profiles = profilesState.profiles;

  useEffect(() => { saveSearchSession(search); }, [search]);

  function changeCriteria(partial: Partial<SearchCriteria>) {
    setSearch((previous) => ({
      ...previous,
      draft: { ...previous.draft, ...partial },
    }));
    setError("");
  }

  function togglePerson(id: string, checked: boolean) {
    const ids = search.draft.selectedProfileIds.filter((value) => value !== id);
    changeCriteria({ selectedProfileIds: checked ? [...ids, id] : ids });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const available = new Set(profiles.map((person) => person.id));
    const selected = search.draft.selectedProfileIds.filter((id) => available.has(id));
    if (search.draft.dinerMode === "selected" && selected.length === 0) {
      setError("Select at least one person, or choose Whole household.");
      return;
    }
    const submitted = { ...search.draft, selectedProfileIds: selected };
    setSearch({ draft: submitted, submitted, expanded: false });
    setError("");
  }

  const draft = search.draft;
  const submitted = search.submitted;
  const diners = submitted ? selectDiners(profiles, submitted) : [];
  const results = submitted ? recommendDinners(getAllRecipes(), submitted, profiles, 10) : [];
  const firstThree = results.slice(0, 3);
  const extras = results.slice(3);
  const direct = firstThree.filter((item) => item.category === "straightforward");
  const review = firstThree.filter((item) => item.category === "review");
  const extraDirect = extras.filter((item) => item.category === "straightforward");
  const extraReview = extras.filter((item) => item.category === "review");

  return (
    <div className="page-content">
      <div className="page-intro">
        <p className="eyebrow">A little less deciding, a lot more dinner</p>
        <h1>What sounds good tonight?</h1>
        <p className="lead">
          Share what's in your kitchen, how much time you have, and who's eating.
          We'll suggest a few ideas from our sample cookbook.
        </p>
      </div>

      <FeatureCard eyebrow="Your kitchen, your table" title="Find your dinner">
        <form className="dinner-search-form" onSubmit={handleSearch}>
          <div className="profile-field">
            <label htmlFor="dinner-have">What ingredients do you have?</label>
            <textarea
              id="dinner-have"
              rows={2}
              maxLength={1000}
              value={draft.haveText}
              onChange={(event) => changeCriteria({ haveText: event.target.value })}
              placeholder="e.g. chicken, potatoes, broccoli"
              aria-describedby="dinner-have-help"
            />
            <p id="dinner-have-help" className="helper-text">
              Separate foods with commas; leave blank if you're open to shopping.
            </p>
          </div>

          <div className="profile-field">
            <label htmlFor="dinner-unavailable">What ingredients are unavailable?</label>
            <textarea
              id="dinner-unavailable"
              rows={2}
              maxLength={1000}
              value={draft.unavailableText}
              onChange={(event) => changeCriteria({ unavailableText: event.target.value })}
              placeholder="e.g. eggs, cheese"
              aria-describedby="dinner-unavailable-help"
            />
            <p id="dinner-unavailable-help" className="helper-text">
              Recipes needing those items will be marked for review.
            </p>
          </div>

          <fieldset className="dinner-fieldset">
            <legend>How much time do you have?</legend>
            <div className="dinner-time-options">
              {([15, 30, 45, 60] as TimeChoice[]).map((time) => (
                <label
                  className={"dinner-time-choice" + (draft.time === time ? " dinner-time-choice--active" : "")}
                  key={time}
                >
                  <input
                    type="radio"
                    name="dinner-time"
                    value={time}
                    checked={draft.time === time}
                    onChange={() => changeCriteria({ time })}
                  />
                  <span>{time === 60 ? "60+ min" : time + " min"}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="dinner-fieldset">
            <legend>Who's eating?</legend>
            <div className="dinner-diner-options">
              <label className="dinner-mode-choice">
                <input
                  type="radio"
                  name="diner-mode"
                  checked={draft.dinerMode === "all"}
                  onChange={() => changeCriteria({ dinerMode: "all" })}
                />
                Whole household
              </label>
              <label className="dinner-mode-choice">
                <input
                  type="radio"
                  name="diner-mode"
                  checked={draft.dinerMode === "selected"}
                  disabled={profiles.length === 0}
                  onChange={() => changeCriteria({ dinerMode: "selected" })}
                />
                Select people
              </label>
            </div>
            {profiles.length === 0 ? (
              <p className="helper-text">
                No profiles saved in this browser. <Link to="/profiles">Add a profile</Link> to apply dietary restrictions.
              </p>
            ) : (
              <div className="dinner-diner-list">
                {profiles.map((person) => (
                  <label key={person.id} className="dinner-diner-person">
                    <input
                      type="checkbox"
                      checked={draft.dinerMode === "all" || draft.selectedProfileIds.includes(person.id)}
                      disabled={draft.dinerMode === "all"}
                      onChange={(event) => togglePerson(person.id, event.target.checked)}
                    />
                    <span>{person.name}</span>
                  </label>
                ))}
              </div>
            )}
            {draft.dinerMode === "all" && profiles.length > 0 && (
              <p className="helper-text">All {profiles.length} saved profiles are included.</p>
            )}
          </fieldset>

          {error && <p className="profile-alert" role="alert">{error}</p>}
          <button type="submit" className="profile-primary-button dinner-search-submit">
            Find Dinner Ideas
          </button>
        </form>
      </FeatureCard>

      {submitted && (
        <section className="dinner-results" aria-labelledby="dinner-results-heading">
          <div className="dinner-results-heading">
            <p className="eyebrow">From your sample cookbook</p>
            <h2 id="dinner-results-heading">Dinner ideas</h2>
            <p className="helper-text">
              Showing {search.expanded ? results.length : firstThree.length} of {results.length} recipe ideas from your last search.
              {diners.length > 0
                ? " Considering " + diners.map((person) => person.name).join(", ") + "."
                : " No saved profiles selected: dietary restrictions were not checked."}
            </p>
            <p className="dinner-results-caveat">
              These are demo-rule matches, NOT verified allergy-safe or gluten-free meals.
              Check original ingredients, packaged food labels, preparation and cross-contact.
              Simple ingredient names may miss hidden ingredients or synonyms.
            </p>
          </div>

          {direct.length > 0 && (
            <div className="dinner-result-section">
              <h3>More straightforward options</h3>
              <p className="helper-text">
                No conflicts identified by this limited sample matcher. This is not a safety determination.
              </p>
              {direct.map((item) => <DinnerResultCard key={item.recipe.id} result={item} />)}
            </div>
          )}

          {review.length > 0 && (
            <div className="dinner-result-section">
              <h3>Needs adjustment or review</h3>
              <p className="helper-text">
                These may still inspire dinner, but need more time, shopping, portion
                changes or a cook's assessment before serving.
              </p>
              {review.map((item) => <DinnerResultCard key={item.recipe.id} result={item} />)}
            </div>
          )}

          {extras.length > 0 && (
            <div
              className="dinner-result-section"
              id="additional-dinner-matches"
              hidden={!search.expanded}
            >
              <h3>Additional matches</h3>
              <p className="helper-text">
                More ranked ideas from the same cookbook. Review notices and food restrictions
                still apply to each recipe.
              </p>
              {extraDirect.length > 0 && (
                <div className="dinner-additional-group">
                  <h4>More straightforward options</h4>
                  {extraDirect.map((item) => <DinnerResultCard key={item.recipe.id} result={item} />)}
                </div>
              )}
              {extraReview.length > 0 && (
                <div className="dinner-additional-group">
                  <h4>More options needing adjustment or review</h4>
                  {extraReview.map((item) => <DinnerResultCard key={item.recipe.id} result={item} />)}
                </div>
              )}
            </div>
          )}

          {extras.length > 0 && (
            <button
              className="dinner-more-button"
              type="button"
              aria-expanded={search.expanded}
              aria-controls="additional-dinner-matches"
              onClick={() => setSearch((previous) => ({
                ...previous,
                expanded: !previous.expanded,
              }))}
            >
              {search.expanded
                ? "Show fewer matches"
                : "Show more matches (" + extras.length + " more)"}
            </button>
          )}
        </section>
      )}

      <div className="gentle-note">
        <span className="note-symbol" aria-hidden="true">✦</span>
        <div>
          <strong>Original recipes stay unchanged.</strong>
          <p>
            This prototype uses ten manually classified recipes, not AI or
            certified allergen analysis. Later we'll explore ingredient swaps
            and separate toppings for a cook to review.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { AI_PILOT_PREVIEW_MESSAGE } from "../services/aiPilotPreview";
import { localPaprikaShortlist, fullPaprikaLibraryPreview } from "../services/aiPaprikaPreview";
import { prepareLocalPaprikaRequest } from "../services/aiPaprikaRequest";
import { assessLocalCatalogReadiness, type CatalogReadiness } from "../services/aiPaprikaCatalogReadiness";
import { FeatureCard } from "../components/FeatureCard";
import { DinnerResultCard } from "../components/DinnerResultCard";
import { getAllRecipes } from "../data/cookbook";
import { loadProfiles } from "../services/profileStorage";
import { listImportedRecipes } from "../services/importedRecipeStorage";
import { recommendAllDinners } from "../services/dinnerSuggestions";
import type { ImportedRecipe } from "../types/importedRecipe";
import {
  selectDiners,
  type SearchCriteria, type TimeChoice,
} from "../services/dinnerMatcher";
import { readSearchSession, saveSearchSession, type SavedSearch } from "../services/searchSession";

export function FindDinner() {
  const [search, setSearch] = useState<SavedSearch>(readSearchSession);
  const [profilesState] = useState(loadProfiles);
  const [error, setError] = useState("");
  const [aiScopeReviewed, setAiScopeReviewed] = useState(false);
  const [localAiReadiness, setLocalAiReadiness] = useState<CatalogReadiness | null>(null);
  const [localRecipes, setLocalRecipes] = useState<ImportedRecipe[]>([]);
  const [libraryStatus, setLibraryStatus] = useState<"loading" | "ready" | "error">("loading");
  const profiles = profilesState.profiles;

  useEffect(() => { saveSearchSession(search); }, [search]);
  useEffect(() => {
    let live = true;
    listImportedRecipes()
      .then((recipes) => {
        if (!live) return;
        setLocalRecipes(recipes);
        setLocalAiReadiness(null);
        setLibraryStatus("ready");
      })
      .catch(() => {
        if (live) setLibraryStatus("error");
      });
    return () => { live = false; };
  }, []);

  function changeCriteria(partial: Partial<SearchCriteria>) {
    setSearch((previous) => ({
      ...previous,
      draft: { ...previous.draft, ...partial },
    }));
    setError("");
    setAiScopeReviewed(false);
    setLocalAiReadiness(null);
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
    setAiScopeReviewed(false);
    setLocalAiReadiness(null);
  }

  const draft = search.draft;
  const submitted = search.submitted;
  const diners = submitted ? selectDiners(profiles, submitted) : [];
  const results = submitted && libraryStatus !== "loading"
    ? recommendAllDinners(localRecipes, getAllRecipes(), submitted, profiles, 10)
    : [];
  const aiPaprikaPreview = localPaprikaShortlist(results);
  const aiLibrarySummary = fullPaprikaLibraryPreview(localRecipes);
  const aiFullRequest = submitted && aiScopeReviewed && libraryStatus === "ready"
    ? prepareLocalPaprikaRequest(localRecipes, submitted, diners, true)
    : null;
  function checkLocalAiPlan() {
    if (!submitted || !aiScopeReviewed || libraryStatus !== "ready") return;
    // Never send, store or log recipe content during this local-only action.
    setLocalAiReadiness(assessLocalCatalogReadiness(localRecipes, submitted, diners, true));
  }
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
          We'll suggest ideas from your saved Paprika recipes and our sample cookbook.
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

      {libraryStatus === "loading" && (
        <p role="status" className="helper-text">
          Loading your browser-saved recipes…
        </p>
      )}
      {libraryStatus === "error" && (
        <p role="alert" className="profile-alert">
          Your local recipe library could not be read in this browser.
          Search results currently include sample recipes only; try reopening the app
          or check your browser's site data settings.
        </p>
      )}

      {submitted && libraryStatus !== "loading" && (
        <section className="dinner-results" aria-labelledby="dinner-results-heading">
          <div className="dinner-results-heading">
            <p className="eyebrow">
              {localRecipes.length > 0 ? "Your recipes first · Sample recipes also eligible" : "From your sample cookbook"}
            </p>
            <h2 id="dinner-results-heading">Dinner ideas</h2>
            <p className="helper-text">
              Showing {search.expanded ? results.length : firstThree.length} of the top {results.length} recipe ideas
              from {localRecipes.length} saved and {getAllRecipes().length} sample recipes.
              {diners.length > 0
                ? " Considering " + diners.map((person) => person.name).join(", ") + "."
                : " No saved profiles selected: dietary restrictions were not checked."}
            </p>
            <p className="dinner-results-caveat">
              Imported Paprika recipes are matched by simple ingredient words and any listed
              cooking times; their dietary suitability is NOT verified. All imported recipes
              require manual review. Sample recipes use limited demo rules.
              Never assume a meal is allergy-safe or gluten-free: check the complete original
              ingredient list, labels, preparation and cross-contact.
            </p>
          </div>

          <div className="dinner-result-section" aria-label="Upcoming AI recommendations">
            <h3>Optional AI dinner ideas — preparation only</h3>
            <p className="helper-text">{AI_PILOT_PREVIEW_MESSAGE}</p>
            <p className="helper-text">
              A fictional AI test succeeded. AI ranking of your own Paprika recipes
              is still switched off. The preparation check below runs entirely on
              this device and cannot request, spend on, or enable OpenAI.
            </p>
            <button className="profile-primary-button" type="button" disabled
              aria-describedby="ai-pilot-not-ready">
              Improve suggestions with AI — not available yet
            </button>
            {aiPaprikaPreview.length > 0 && (
              <details>
                <summary>Preview Paprika recipes for future AI suggestions ({aiPaprikaPreview.length})</summary>
                <p className="helper-text">This preview stays in your browser. Nothing is sent to AI yet. Imported recipes still need dietary review.</p>
                <ul>
                  {aiPaprikaPreview.map((item) => (
                    <li key={item.id}><strong>{item.title}</strong> — Manual dietary review required.</li>
                  ))}
                </ul>
              </details>
            )}
            <details>
              <summary>What sharing your full Paprika library with AI would mean</summary>
              <p className="helper-text">
                Your library currently contains {aiLibrarySummary.recipeCount} imported recipes.
                A future full-library AI request may include every imported recipe's
                ingredients, directions, descriptions, notes, timing, categories and source links,
                not just the five examples above. It may also include selected diners'
                food restrictions and dietary needs without their profile names or IDs.
                Personal information inside the recipe text itself is not automatically removed.
                OpenAI may retain submitted data under its API policies even when
                response storage is disabled. Nothing is transmitted now; a separate
                explicit AI action, authenticated server safeguards and your final
                activation approval will be required.
              </p>
            </details>
            {libraryStatus === "ready" && localRecipes.length > 0 && (
              <div className="profile-field">
                <label className="dinner-mode-choice">
                  <input
                    type="checkbox"
                    checked={aiScopeReviewed}
                    onChange={(event) => {
                      setAiScopeReviewed(event.target.checked);
                      setLocalAiReadiness(null);
                    }}
                  />
                  Review how my complete Paprika library would be prepared for AI
                </label>
                <p className="helper-text">
                  Preview only. Checking this box does not upload recipes, start an AI call,
                  or activate billing. Any future AI request will need an explicit action.
                </p>
                {aiFullRequest && (
                  <p className="helper-text" role="status">
                    {aiFullRequest.ok
                      ? "The single-window check passed: " + aiFullRequest.count +
                        " complete recipes, " + aiFullRequest.bytes.toLocaleString() +
                        " UTF-8 bytes. Multi-window local planning is available below."
                      : "The single-window check is limited (" + aiFullRequest.reason +
                        "). The offline planner below can still examine all " +
                        localRecipes.length + " recipes. No upload."}
                  </p>
                )}
                <button type="button" className="profile-secondary-button"
                  onClick={checkLocalAiPlan}>
                  Check full-library AI plan locally — no upload
                </button>
                {localAiReadiness && (
                  <div className="local-ai-readiness" role="status" aria-live="polite">
                    {localAiReadiness.ready ? (
                      <>
                        <strong>Local preparation checks passed (not activated).</strong>
                        <p>
                          All {localAiReadiness.recipeCount} recipes are accounted
                          for in {localAiReadiness.windowCount} complete planning
                          window{localAiReadiness.windowCount === 1 ? "" : "s"} and{" "}
                          {localAiReadiness.batchCount} bounded model batch
                          {localAiReadiness.batchCount === 1 ? "" : "es"}.
                          {" "}{localAiReadiness.eligibleRecipeCount} recipe IDs remain eligible;
                          {" "}{localAiReadiness.knownConflictExcludedCount} have obvious
                          text conflicts with Must avoid terms and cannot be recommended.
                        </p>
                        <p>
                          Recipes per planning window: {localAiReadiness.windowRecipeCounts.join(", ")}.
                          Model batches per window are limited separately.
                          Largest staged input: {localAiReadiness.largestBatchBytes.toLocaleString()} bytes.
                          This is not a tokenizer, dietary certification or cost estimate.
                        </p>
                        <p>
                          No AI suggestions have been generated. Nothing was uploaded,
                          stored in a cloud account, or billed.
                        </p>
                      </>
                    ) : (
                      <>
                        <strong>Full-library AI preparation is blocked.</strong>
                        <p>
                          Reason: {localAiReadiness.reason}. All {localAiReadiness.recipeCount}
                          {" "}recipes must fit the approved limits; we will not
                          silently send only a portion or remove a Must avoid rule.
                          Your ordinary dinner suggestions still work.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            <p id="ai-pilot-not-ready" className="helper-text">
              The AI connection is off until a separate privacy and billing review.
            </p>
          </div>

          {direct.length > 0 && (
            <div className="dinner-result-section">
              <h3>More straightforward options</h3>
              <p className="helper-text">
                No conflicts identified by the limited sample rules. Imported recipes
                never receive this label; it is not a food-safety determination.
              </p>
              {direct.map((item) => <DinnerResultCard key={item.source + item.recipe.id} result={item} />)}
            </div>
          )}

          {review.length > 0 && (
            <div className="dinner-result-section">
              <h3>Needs adjustment or review</h3>
              <p className="helper-text">
                These may still inspire dinner, but need more time, shopping, portion
                changes or a cook's assessment before serving.
              </p>
              {review.map((item) => <DinnerResultCard key={item.source + item.recipe.id} result={item} />)}
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
                More ranked ideas from your saved recipes and the sample cookbook.
                Review notices and food restrictions still apply to every recipe.
              </p>
              {extraDirect.length > 0 && (
                <div className="dinner-additional-group">
                  <h4>More straightforward options</h4>
                  {extraDirect.map((item) => <DinnerResultCard key={item.source + item.recipe.id} result={item} />)}
                </div>
              )}
              {extraReview.length > 0 && (
                <div className="dinner-additional-group">
                  <h4>More options needing adjustment or review</h4>
                  {extraReview.map((item) => <DinnerResultCard key={item.source + item.recipe.id} result={item} />)}
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
            Find Dinner reads imported recipes from this browser only, alongside
            ten manually classified fictional samples. Original Paprika text is
            preserved, and recommendations are not verified for allergies,
            gluten or cross-contact. Later we'll explore cook-reviewed swaps.
          </p>
        </div>
      </div>
    </div>
  );
}

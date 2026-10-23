import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { prepareLocalPaprikaRequest } from "../services/aiPaprikaRequest";
import { describeAiFailure } from "../services/aiQuotaFeedback";
import { assessLocalAiReadiness } from "../services/aiPaprikaReadiness";
import { AI_WORKER_ORIGIN, askAiWithSecurePopup, type AiDinnerSuggestion } from "../services/aiPopupBridge";
import { evaluateImportedRecipe } from "../services/importedDinnerMatcher";
import { reviewAiAdjustments, screenRecipeForSearch } from "../../backend/src/recipeRelevance";
import { FeatureCard } from "../components/FeatureCard";
import { DinnerResultCard } from "../components/DinnerResultCard";
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
  const [useAi, setUseAi] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiDinnerSuggestion[] | null>(null);
  const [aiFailure, setAiFailure] = useState("");
  const [aiSearch, setAiSearch] = useState(false);
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
    setAiSuggestions(null);
    setAiFailure("");
  }

  function togglePerson(id: string, checked: boolean) {
    const ids = search.draft.selectedProfileIds.filter((value) => value !== id);
    changeCriteria({ selectedProfileIds: checked ? [...ids, id] : ids });
  }

  function eligibleForSearch(recipe: ImportedRecipe, criteria: SearchCriteria,
    dinersForSearch: ReturnType<typeof selectDiners>): boolean {
    const must = dinersForSearch.flatMap(diner => diner.foodRestrictions
      .filter(item => item.level === "must").map(item => item.food));
    const needs = [...new Set(dinersForSearch.flatMap(diner => diner.dietaryNeeds))];
    return screenRecipeForSearch(recipe,
      criteria.haveText.split(","), criteria.unavailableText.split(","),
      must, needs).eligible;
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
    const dinersForRequest = selectDiners(profiles, submitted);
    if (useAi && (libraryStatus !== "ready" || localRecipes.length === 0)) {
      setError("Import some Paprika recipes before searching with AI.");
      return;
    }
    const eligibleNow = localRecipes.filter(recipe =>
      eligibleForSearch(recipe, submitted, dinersForRequest));
    if (useAi && eligibleNow.length === 0) {
      setSearch({ draft: submitted, submitted, expanded: false });
      setAiSearch(false);
      setAiSuggestions(null);
      setAiFailure("");
      setError("No recipes have a verified, practical route around your unavailable ingredients and Must-avoid restrictions. AI was not called.");
      return;
    }
    const prepared = useAi
      ? prepareLocalPaprikaRequest(localRecipes, submitted, dinersForRequest, true)
      : null;
    if (prepared && !prepared.ok) {
      const reasons: Record<string, string> = {
        empty_library: "Import Paprika recipes before asking AI.",
        too_many_recipes: "The AI pilot currently supports up to 40 complete recipes per request.",
        request_too_large: "Your complete library exceeds this pilot's safe request size. Nothing was uploaded.",
        invalid_recipe_or_constraints: "The complete library did not pass the local request checks.",
        consent_required: "Enable AI assistance to share your recipes.",
      };
      setError(reasons[prepared.reason]);
      return;
    }
    // Nonbillable local readiness check: do not open Access or incur provider
    // costs if the full original library cannot fit a bounded model plan.
    if (prepared?.ok && !assessLocalAiReadiness(prepared).ready) {
      setSearch({ draft: submitted, submitted, expanded: false });
      setAiSearch(false);
      setAiSuggestions(null);
      setAiFailure("");
      setError("Your complete library does not fit the current AI batch limits. " +
        "No AI request was sent; showing your usual recipe matches.");
      return;
    }
    // A fresh submit is the only act that authorizes this specific paid request.
    // The protected popup must open synchronously in the submit gesture on iPhone.
    const promise = prepared && prepared.ok
      ? askAiWithSecurePopup(prepared, AI_WORKER_ORIGIN)
      : null;
    setSearch({ draft: submitted, submitted, expanded: false });
    setAiSearch(!!promise);
    setAiSuggestions(null);
    setAiFailure("");
    setError("");
    if (promise) {
      setAiBusy(true);
      void promise.then(result => {
        if (!result.ok) {
          setAiFailure(describeAiFailure(result.error) +
            " Showing your usual recipe matches instead. No automatic retry.");
          return;
        }
        const allowed = new Map(eligibleNow.map(recipe => [recipe.id, recipe]));
        // The client rechecks the response even if an older Worker is deployed.
        // Never show a recipe requiring a missing ingredient or nonsensical swap.
        const safe = result.suggestions.flatMap(item => {
          const recipe = allowed.get(item.recipeId);
          if (!recipe) return [];
          const mustAvoid = dinersForRequest.flatMap(d => d.foodRestrictions
            .filter(restriction => restriction.level === "must")
            .map(restriction => restriction.food));
          const needs = [...new Set(dinersForRequest.flatMap(d => d.dietaryNeeds))];
          const adjustments = reviewAiAdjustments(item.adjustments, recipe,
            submitted.haveText.split(","), submitted.unavailableText.split(","),
            mustAvoid, needs);
          const unsafeSwapWording = /\b(substitut(?:e|ion)|swap|replac(?:e|ing)|instead of)\b/i;
          // Freeform model advice about swaps cannot bypass the reviewed
          // structured substitution contract.
          const explanation = unsafeSwapWording.test(item.explanation)
            ? adjustments.length > 0
              ? "This recipe is an option with the ingredient change shown below."
              : "This is a potential dinner from your saved recipes."
            : item.explanation;
          const cautions = item.cautions.filter(note =>
            !unsafeSwapWording.test(note));
          return [{ ...item, explanation, cautions, adjustments }];
        });
        if (safe.length === 0) {
          setAiFailure("No AI ideas met your ingredient rules. Showing matching recipes instead.");
          return;
        }
        setAiSuggestions(safe);
      }).catch(() => {
        setAiFailure("AI is unavailable. Showing your usual recipe matches. No automatic retry.");
      }).finally(() => setAiBusy(false));
    }
  }

  const draft = search.draft;
  const submitted = search.submitted;
  const diners = submitted ? selectDiners(profiles, submitted) : [];
  const eligibleRecipes = submitted && libraryStatus === "ready"
    ? localRecipes.filter(recipe => eligibleForSearch(recipe, submitted, diners))
    : [];
  const results = submitted && libraryStatus === "ready"
    ? recommendAllDinners(eligibleRecipes, [], submitted, profiles, 10)
    : [];
  // AI and ordinary searches share the same imported-recipe card component.
  // Only validated IDs already present in the browser's library are displayed.
  const aiMatches = aiSearch && aiSuggestions
    ? aiSuggestions.map(item => {
        const recipe = localRecipes.find(recipe => recipe.id === item.recipeId);
        if (!recipe || !submitted) return null;
        const match = evaluateImportedRecipe(recipe, submitted, diners);
        // Independently refuse recipes with detected hard dietary conflicts.
        if (!eligibleRecipes.some(candidate => candidate.id === recipe.id)) return null;
        return match;
      }).filter((item): item is NonNullable<typeof item> => item !== null)
    : null;
  const showingAi = aiMatches !== null && aiMatches.length > 0;
  const displayed = showingAi && aiMatches ? aiMatches : results;
  const aiById = new Map(showingAi ? aiSuggestions?.map(item => [item.recipeId, item]) : []);
  const firstThree = displayed.slice(0, 3);
  const extras = displayed.slice(3);

  return (
    <div className="page-content">
      <div className="page-intro">
        <h1>What sounds good tonight?</h1>
        <p className="lead">
          Your kitchen, your table. Find something good in your Paprika recipes.
        </p>
      </div>

      <FeatureCard title="Find your dinner">
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
              These ingredients need a sensible substitution or omission; otherwise the recipe won't qualify for AI suggestions.
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

          <label className="dinner-mode-choice dinner-ai-toggle">
            <input type="checkbox" role="switch" aria-label="Use AI assistance"
              checked={useAi} disabled={aiBusy}
              onChange={event => { setUseAi(event.target.checked); setAiFailure(""); setAiSuggestions(null); setAiSearch(false); }} />
            <span><strong>Use AI assistance</strong>
              <span className="dinner-ai-toggle-subtitle"> Optional · More tailored ideas</span>
            </span>
          </label>
          {error && <p className="profile-alert" role="alert">{error}</p>}
          <button type="submit" disabled={aiBusy || libraryStatus === "loading"}
            className="profile-primary-button dinner-search-submit">
            {aiBusy ? "AI is finding dinner ideas…" : "Find Dinner Ideas"}
          </button>
          <p className="helper-text dinner-ai-disclosure">
            {useAi
              ? "AI shares your entire imported recipe library and selected dietary preferences (not people's names) with OpenAI. Requests may incur API costs within the $5 monthly pilot allowance. Review all ingredients and suggestions before cooking or eating."
              : "AI is off. Dinner matching stays on your device."}
          </p>
          {aiBusy && <p className="helper-text" role="status" aria-live="polite">
            AI is thinking… Your dinner ideas will appear below when ready.
          </p>}
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
          Try reopening the app or check your browser's site data settings.
        </p>
      )}

      {submitted && libraryStatus === "ready" && (
        <section className="dinner-results" aria-labelledby="dinner-results-heading">
          <div className="dinner-results-heading">
            <p className="eyebrow">
              Your Paprika recipes
            </p>
            <h2 id="dinner-results-heading">Dinner ideas</h2>
            <p className="helper-text">
              Showing {search.expanded ? displayed.length : firstThree.length} of {displayed.length} recipe ideas
              from your {localRecipes.length} saved recipes.
              {diners.length > 0
                ? " Considering " + diners.map((person) => person.name).join(", ") + "."
                : " No saved profiles selected: dietary restrictions were not checked."}
            </p>
          </div>

          {aiFailure && <p className="profile-alert" role="status">{aiFailure}</p>}
          {aiBusy && <p className="helper-text" role="status">Preparing your AI recommendations…</p>}
          {!aiBusy && aiSearch && aiSuggestions && (
            <p className="helper-text" role="status">
              {showingAi ? "AI selected recipes from your Paprika library." :
                "No AI suggestions passed dietary screening. Showing your usual matches."}
            </p>
          )}
          {!aiBusy && displayed.length === 0 && (
            <p className="helper-text">No suitable recipes with a verified workaround match these restrictions. Try changing your criteria or importing more recipes.</p>
          )}
          {firstThree.length > 0 && (
            <div className="dinner-result-section">
              {firstThree.map((item) => <DinnerResultCard key={item.source + item.recipe.id}
                result={item} ai={aiById.get(item.recipe.id)} />)}
            </div>
          )}

          {extras.length > 0 && (
            <div className="dinner-result-section" id="additional-dinner-matches"
              hidden={!search.expanded}>
              <h3>More dinner ideas</h3>
              {extras.map((item) => <DinnerResultCard key={item.source + item.recipe.id}
                result={item} ai={aiById.get(item.recipe.id)} />)}
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

    </div>
  );
}

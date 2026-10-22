import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "react-router";
import { RecipeCard } from "../components/RecipeCard";
import { FeatureCard } from "../components/FeatureCard";
import { getAllRecipes } from "../data/cookbook";
import { parsePaprikaFile } from "../services/paprikaImport";
import { listImportedRecipes, saveImportedRecipes } from "../services/importedRecipeStorage";
import type { ImportPreview, ImportedRecipe } from "../types/importedRecipe";

const samples = getAllRecipes();
type Tab = "my" | "sample";
const TAB_SESSION_KEY = "find-dinner:library-tab:v1";

function readTab(): Tab {
  try {
    return sessionStorage.getItem(TAB_SESSION_KEY) === "sample" ? "sample" : "my";
  } catch {
    return "my";
  }
}

export function RecipeLibrary() {
  const [tab, setTab] = useState<Tab>(readTab);
  const [imported, setImported] = useState<ImportedRecipe[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try { sessionStorage.setItem(TAB_SESSION_KEY, tab); } catch { /* optional */ }
  }, [tab]);

  useEffect(() => {
    listImportedRecipes()
      .then(setImported)
      .catch(() => setError("Browser storage could not be read. Check your browser settings before importing."))
      .finally(() => setLoading(false));
  }, []);

  const savedIds = new Set(imported.map((recipe) => recipe.id));
  const available = preview?.recipes.filter((recipe) => !savedIds.has(recipe.id)) ?? [];

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    setPreview(null);
    setChosen([]);
    try {
      const parsed = await parsePaprikaFile(file);
      setPreview(parsed);
      setTab("my");
      // No default selection: only recipes the user chooses are saved.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read that export.");
    } finally { setBusy(false); }
  }

  function toggleSelection(id: string, checked: boolean) {
    setError("");
    setChosen((previous) => {
      if (!checked) return previous.filter((key) => key !== id);
      if (previous.includes(id)) return previous;
      if (previous.length >= 25) return previous;
      return [...previous, id];
    });
  }

  async function importSelection() {
    if (!preview || chosen.length === 0 || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const ids = new Set(chosen);
      const records = preview.recipes.filter((recipe) => ids.has(recipe.id) && !savedIds.has(recipe.id));
      const added = await saveImportedRecipes(records);
      const refreshed = await listImportedRecipes();
      setImported(refreshed);
      setPreview(null);
      setChosen([]);
      setNotice(
        added + " recipe" + (added === 1 ? "" : "s") +
        " saved in this browser. Re-imports won't overwrite existing copies.",
      );
    } catch {
      setError("Couldn't save your selection. Browser storage may be full or unavailable. Your Paprika export file has not been changed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="page-content">
      <div className="page-intro">
        <p className="eyebrow">A collection worth keeping</p>
        <h1>Your recipe library</h1>
        <p className="lead">
          Bring your favorite Paprika recipes into your browser, or explore our ten sample dinners.
        </p>
      </div>

      <div className="local-storage-note" role="note">
        <strong>Private to this browser—not synced or backed up.</strong>{" "}
        Imported recipes are stored in this device's IndexedDB, not GitHub.
        Clearing website data or using a private tab may erase them.
        Your Paprika export stays your backup. Find Dinner now suggests
        imported recipes with explicit manual-review warnings.
      </div>

      <div className="recipe-library-tabs" role="group" aria-label="Recipe collections">
        <button
          type="button"
          className={tab === "my" ? "recipe-library-tab recipe-library-tab--active" : "recipe-library-tab"}
          aria-pressed={tab === "my"}
          onClick={() => setTab("my")}
        >My recipes ({imported.length})</button>
        <button
          type="button"
          className={tab === "sample" ? "recipe-library-tab recipe-library-tab--active" : "recipe-library-tab"}
          aria-pressed={tab === "sample"}
          onClick={() => setTab("sample")}
        >Sample recipes ({samples.length})</button>
      </div>

      {tab === "my" ? (
        <>
          <FeatureCard eyebrow="Add your own recipes" title="Import from Paprika">
            <p>
              In Paprika, choose <strong>Settings → Export Recipes → Paprika Recipe Format</strong>.
              Save the <code>.paprikarecipes</code> file to Files, then select it here.
            </p>
            <p className="helper-text">
              Choose up to 25 recipes per import. Large exports may need to be split by category.
              Original ingredient and instruction text is preserved; photos are not imported.
            </p>
            <div className="profile-field">
              <label htmlFor="paprika-file">Paprika export file</label>
              <input
                id="paprika-file"
                className="paprika-file-input"
                type="file"
                accept=".paprikarecipes"
                disabled={busy || loading}
                onChange={onFile}
              />
            </div>
            {busy && <p role="status" className="helper-text">Processing recipes on this device…</p>}
            {error && <p role="alert" className="profile-alert">{error}</p>}
            {notice && <p role="status" className="profile-success">{notice}</p>}
          </FeatureCard>

          {preview && (
            <section className="paprika-preview" aria-labelledby="paprika-preview-heading">
              <div className="library-heading">
                <h2 id="paprika-preview-heading">Preview imported recipes</h2>
                <span className="recipe-count">{chosen.length}/25 selected</span>
              </div>
              <p className="helper-text">
                Found {preview.recipes.length} readable recipes. Select up to 25;
                nothing is saved until you tap Save selected recipes.
                {available.length < preview.recipes.length
                  ? " Recipes already imported are marked as duplicates." : ""}
              </p>
              {preview.warning && <p className="profile-alert" role="status">{preview.warning}</p>}
              <div className="profile-form-actions paprika-preview-actions">
                <button
                  type="button"
                  className="profile-secondary-button"
                  disabled={busy || available.length === 0}
                  onClick={() => setChosen(available.slice(0, 25).map((recipe) => recipe.id))}
                >Select first 25 new</button>
                <button
                  type="button"
                  className="profile-secondary-button"
                  disabled={busy}
                  onClick={() => { setPreview(null); setChosen([]); setError(""); }}
                >Cancel preview</button>
              </div>
              <div className="paprika-preview-list">
                {preview.recipes.map((recipe) => {
                  const duplicate = savedIds.has(recipe.id);
                  const selected = chosen.includes(recipe.id);
                  return (
                    <label className="paprika-preview-row" key={recipe.id}>
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={duplicate || busy || (!selected && chosen.length >= 25)}
                        onChange={(event) => toggleSelection(recipe.id, event.target.checked)}
                      />
                      <span>{recipe.name}</span>
                      {duplicate && <span className="paprika-duplicate">Already imported</span>}
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                className="profile-primary-button paprika-save-button"
                disabled={busy || chosen.length === 0}
                onClick={importSelection}
              >
                Save {chosen.length} selected recipe{chosen.length === 1 ? "" : "s"}
              </button>
            </section>
          )}

          <div className="library-heading paprika-library-heading">
            <h2>My recipes</h2>
            <span className="recipe-count">{imported.length} saved</span>
          </div>
          {loading ? (
            <p role="status" className="helper-text">Loading local recipes…</p>
          ) : imported.length === 0 ? (
            <div className="profile-empty-state">
              <strong>No imported recipes yet</strong>
              <p>Select a Paprika export above to get started.</p>
            </div>
          ) : (
            <div className="recipe-grid">
              {imported.map((recipe) => (
                <article className="recipe-card" key={recipe.id}>
                  <div className="recipe-card-head">
                    <span className="recipe-symbol" aria-hidden="true">♡</span>
                    <span className="recipe-timing">From Paprika</span>
                  </div>
                  <h3>{recipe.name}</h3>
                  <p>{recipe.description || "Original recipe imported from Paprika."}</p>
                  <div className="recipe-card-bottom">
                    <span>{recipe.totalTime || recipe.cookTime || "Time not listed"}</span>
                    <Link
                      className="view-recipe"
                      to={"/recipes/imported/" + encodeURIComponent(recipe.id)}
                      state={{ from: "/library" }}
                      aria-label={"View imported recipe " + recipe.name}
                    >View <span aria-hidden="true">→</span></Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="library-heading">
            <h2>Sample cookbook</h2>
            <span className="recipe-count">{samples.length} recipes</span>
          </div>
          <p className="library-note">
            Fictional demo recipes only; sample matching and times are illustrative.
          </p>
          <div className="recipe-grid">
            {samples.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
        </>
      )}
    </div>
  );
}

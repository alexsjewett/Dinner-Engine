import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { FeatureCard } from "../components/FeatureCard";
import { getRecipeById } from "../data/cookbook";
import { getImportedRecipe } from "../services/importedRecipeStorage";
import type { ImportedRecipe } from "../types/importedRecipe";
import type { AiDinnerSuggestion } from "../services/aiPopupBridge";
import { isGenericAiDisclaimer, usefulAiNotes } from "../services/aiRecommendationDisplay";

interface DetailsLocationState { from?: string; aiSuggestion?: AiDinnerSuggestion; }

export function RecipeDetails({ imported = false }: { imported?: boolean }) {
  const { recipeId } = useParams<{ recipeId: string }>();
  const { state } = useLocation();
  const origin = state as DetailsLocationState | null;
  const suggestion = origin?.aiSuggestion;
  const validSuggestion = imported && !!suggestion && suggestion.recipeId === recipeId &&
    typeof suggestion.explanation === "string" &&
    Array.isArray(suggestion.cautions) &&
    suggestion.cautions.every(item => typeof item === "string");
  const aiExplanation = suggestion && !isGenericAiDisclaimer(suggestion.explanation)
    ? suggestion.explanation : "";
  const aiCautions = suggestion ? usefulAiNotes(suggestion.cautions) : [];
  const aiHasAdvice = !!aiExplanation || aiCautions.length > 0 ||
    (suggestion?.adjustments?.length ?? 0) > 0;
  const backTo = origin?.from === "/" ? "/" : "/library";
  const backLabel = backTo === "/" ? "Dinner ideas" : "Recipe Library";
  const recipe = imported ? undefined : getRecipeById(recipeId ?? "");

  const [savedRecipe, setSavedRecipe] = useState<ImportedRecipe | null>(null);
  const [loading, setLoading] = useState(imported);
  const [readError, setReadError] = useState("");

  useEffect(() => {
    if (!imported || !recipeId) return;
    let active = true;
    getImportedRecipe(recipeId)
      .then((value) => { if (active) setSavedRecipe(value ?? null); })
      .catch(() => { if (active) setReadError("Could not open the local recipe in this browser."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [imported, recipeId]);

  return (
    <div className="page-content">
      <Link className="back-link" to={backTo}>
        <span aria-hidden="true">←</span> Back to {backLabel}
      </Link>

      {imported ? (
        loading ? (
          <p className="helper-text" role="status">Loading your recipe…</p>
        ) : savedRecipe ? (
          <>
            <div className="page-intro page-intro--details">
              <p className="eyebrow">From your Paprika export · Local to this browser</p>
              <h1>{savedRecipe.name}</h1>
              {savedRecipe.description && <p className="lead import-original-text">{savedRecipe.description}</p>}
              <div className="recipe-facts">
                {savedRecipe.totalTime && <span>Total time: {savedRecipe.totalTime}</span>}
                {savedRecipe.prepTime && <span>Prep: {savedRecipe.prepTime}</span>}
                {savedRecipe.cookTime && <span>Cook: {savedRecipe.cookTime}</span>}
                {savedRecipe.servings && <span>Serves: {savedRecipe.servings}</span>}
                {!savedRecipe.totalTime && !savedRecipe.prepTime && !savedRecipe.cookTime && (
                  <span>Cooking time not listed</span>
                )}
              </div>
            </div>
            {validSuggestion && suggestion && aiHasAdvice && (
              <FeatureCard title="AI dinner ideas">
                {aiExplanation && <p>{aiExplanation}</p>}
                {(suggestion.adjustments?.length ?? 0) > 0 && (
                  <>
                    <h3>Ingredient change to try</h3>
                    <ul>{suggestion.adjustments?.map((change, index) => (
                      <li key={index}>
                        <strong>Instead of {change.ingredientFrom}, try {change.ingredientTo}.</strong>{" "}
                        {change.why}
                      </li>
                    ))}</ul>
                  </>
                )}
                {aiCautions.length > 0 && (
                  <ul>{aiCautions.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}</ul>
                )}
              </FeatureCard>
            )}
            <FeatureCard eyebrow="Unmodified Paprika text" title="Original ingredients">
              <div className="import-original-text">{savedRecipe.ingredients || "No ingredients listed."}</div>
            </FeatureCard>
            <FeatureCard title="Original instructions">
              <div className="import-original-text">{savedRecipe.directions || "No instructions listed."}</div>
            </FeatureCard>
            {savedRecipe.notes && (
              <FeatureCard title="Original notes">
                <div className="import-original-text">{savedRecipe.notes}</div>
              </FeatureCard>
            )}
            {(savedRecipe.source || savedRecipe.sourceUrl || savedRecipe.categories.length > 0) && (
              <FeatureCard title="Original source and categories">
                {savedRecipe.source && <p>Source: {savedRecipe.source}</p>}
                {savedRecipe.sourceUrl && <p className="import-original-text">Source URL: {savedRecipe.sourceUrl}</p>}
                {savedRecipe.categories.length > 0 && (
                  <p>Categories: {savedRecipe.categories.join(", ")}</p>
                )}
              </FeatureCard>
            )}
          </>
        ) : (
          <FeatureCard title="Imported recipe not found">
            <p>{readError || "This recipe is not saved in this browser."}</p>
            <Link className="text-link" to="/library">Return to the library →</Link>
          </FeatureCard>
        )
      ) : recipe ? (
        <>
          <div className="page-intro page-intro--details">
            <p className="eyebrow">Sample recipe</p>
            <h1>{recipe.title}</h1>
            <p className="lead">{recipe.description}</p>
            <div className="recipe-facts">
              <span>About {recipe.estimatedMinutes} minutes</span>
              <span>Serves {recipe.servings}</span>
            </div>
          </div>
          <FeatureCard eyebrow="Unmodified demo recipe" title="Original ingredients">
            <ul className="ingredients-list">
              {recipe.ingredients.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </FeatureCard>
          <FeatureCard title="Original instructions">
            <ol className="instructions-list">
              {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </FeatureCard>
          <FeatureCard eyebrow="Not yet available" title="Possible swaps to review">
            <p>No swaps have been suggested. Later, Find Dinner will show proposed
              changes here separately without altering the original recipe.</p>
            <p className="helper-text">
              Always verify labels and restrictions. AI suggestions will never certify
              a recipe as allergy-safe.
            </p>
          </FeatureCard>
        </>
      ) : (
        <FeatureCard title="Recipe not found">
          <p>That recipe isn't in the sample cookbook.</p>
          <Link className="text-link" to="/library">Browse the library →</Link>
        </FeatureCard>
      )}
    </div>
  );
}

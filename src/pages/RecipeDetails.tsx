import { Link, useLocation, useParams } from "react-router";
import { FeatureCard } from "../components/FeatureCard";
import { getRecipeById } from "../data/cookbook";

interface DetailsLocationState { from?: string; }

export function RecipeDetails() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const { state } = useLocation();
  const origin = state as DetailsLocationState | null;
  const backTo = origin?.from === "/" ? "/" : "/library";
  const backLabel = backTo === "/" ? "Find Dinner" : "Recipe Library";
  const recipe = getRecipeById(recipeId ?? "");

  return (
    <div className="page-content">
      <Link className="back-link" to={backTo}>
        <span aria-hidden="true">←</span> Back to {backLabel}
      </Link>
      {recipe ? (
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

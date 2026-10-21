import { Link, useLocation } from "react-router";
import { FeatureCard } from "../components/FeatureCard";

interface DetailsLocationState {
  from?: string;
}

export function RecipeDetails() {
  const location = useLocation();
  const state = location.state as DetailsLocationState | null;
  const backToFind = state?.from === "/";
  const backTo = backToFind ? "/" : "/library";
  const backLabel = backToFind ? "Find Dinner" : "Recipe Library";

  return (
    <div className="page-content">
      <Link className="back-link" to={backTo}>
        <span aria-hidden="true">←</span> Back to {backLabel}
      </Link>
      <div className="page-intro page-intro--details">
        <p className="eyebrow">Recipe details preview</p>
        <h1>A closer look at dinner</h1>
        <p className="lead">
          This screen is a placeholder. We'll display real original recipes
          when we add the sample cookbook.
        </p>
      </div>

      <FeatureCard title="Original recipe">
        <p className="helper-text">Ingredients, original instructions, and cooking time will appear here.</p>
      </FeatureCard>

      <FeatureCard eyebrow="Always reviewed separately" title="Possible swaps to review">
        <p>
          Any future substitution ideas will be clearly marked as suggestions,
          with reasons and uncertainties. They will never replace the original recipe.
        </p>
        <p className="helper-text">
          No substitutions have been generated or evaluated in this milestone.
        </p>
      </FeatureCard>
    </div>
  );
}

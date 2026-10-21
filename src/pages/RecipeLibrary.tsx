import { RecipeCard } from "../components/RecipeCard";
import { FeatureCard } from "../components/FeatureCard";
import { getAllRecipes } from "../data/cookbook";

const recipes = getAllRecipes();

export function RecipeLibrary() {
  return (
    <div className="page-content">
      <div className="page-intro">
        <p className="eyebrow">A collection worth keeping</p>
        <h1>Your recipe library</h1>
        <p className="lead">
          Explore ten sample dinners. Your own Paprika recipes will come later.
        </p>
      </div>
      <div className="library-heading">
        <h2>Sample cookbook</h2>
        <span className="recipe-count">{recipes.length} recipes</span>
      </div>
      <p className="library-note">
        Demo content only. Cooking times and summaries are illustrative, not AI-generated.
        Ingredients have not been checked against dietary restrictions.
      </p>
      <div className="recipe-grid">
        {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
      </div>
      <div className="library-future">
        <FeatureCard eyebrow="Coming soon" title="Add your own recipes">
          <p>
            Paprika importing and adding other formats are planned for later phases.
            Original ingredients and instructions will be preserved.
          </p>
        </FeatureCard>
      </div>
    </div>
  );
}

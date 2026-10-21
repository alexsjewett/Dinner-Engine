import { Link } from "react-router";
import type { Recipe } from "../types/recipe";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <article className="recipe-card">
      <div className="recipe-card-head">
        <span className="recipe-symbol" aria-hidden="true">✳</span>
        <span className="recipe-timing">◷ About {recipe.estimatedMinutes} min</span>
      </div>
      <div className="recipe-tags">
        {recipe.tags.map((tag) => <span className="recipe-tag" key={tag}>{tag}</span>)}
      </div>
      <h3>{recipe.title}</h3>
      <p>{recipe.description}</p>
      <div className="recipe-card-bottom">
        <span>Serves {recipe.servings}</span>
        <Link to={`/recipes/${recipe.id}`} state={{ from: "/library" }}
          className="view-recipe" aria-label={`View ${recipe.title}`}>
          View <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

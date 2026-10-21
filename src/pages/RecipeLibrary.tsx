import { Link } from "react-router";
import { FeatureCard } from "../components/FeatureCard";

export function RecipeLibrary() {
  return (
    <div className="page-content">
      <div className="page-intro">
        <p className="eyebrow">A collection worth keeping</p>
        <h1>Your recipe library</h1>
        <p className="lead">A home for the meals you already love, with a little help choosing among them.</p>
      </div>

      <FeatureCard eyebrow="Library preview" title="Your cookbook starts here">
        <div className="illustration-circle" aria-hidden="true">◒</div>
        <p>
          We'll add ten sample recipes next. Each will have its own original ingredient
          list, instructions, estimated time, and short description.
        </p>
      </FeatureCard>

      <FeatureCard eyebrow="Coming soon" title="Add your own recipes">
        <p>
          Paprika imports and other recipe formats are planned for later phases.
          Original recipes will be preserved.
        </p>
        <Link className="text-link" to="/recipes/preview" state={{ from: "/library" }}>
          Preview recipe details <span aria-hidden="true">→</span>
        </Link>
      </FeatureCard>
    </div>
  );
}

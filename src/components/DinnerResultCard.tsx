import { Link } from "react-router";
import type { MatchResult } from "../services/dinnerMatcher";

export function DinnerResultCard({ result }: { result: MatchResult }) {
  const { recipe, onHand, notMarkedOnHand, unavailable, softNotes, reviewReasons } = result;
  const review = result.category === "review";
  return (
    <article className={"dinner-result-card" + (review ? " dinner-result-card--review" : "")}>
      <div className="dinner-result-header">
        <span className="dinner-result-category">
          {review ? "Needs adjustment or review" : "No identified conflicts in demo rules"}
        </span>
        <span className="recipe-timing">About {recipe.estimatedMinutes} min</span>
      </div>
      <h3>{recipe.title}</h3>
      <p className="dinner-result-description">{recipe.description}</p>
      {onHand.length > 0 && (
        <p className="dinner-match-line"><strong>Marked on hand:</strong> {onHand.join(", ")}</p>
      )}
      {notMarkedOnHand.length > 0 && (
        <p className="dinner-match-line"><strong>Not marked on hand:</strong> {notMarkedOnHand.join(", ")}</p>
      )}
      {unavailable.length > 0 && (
        <p className="dinner-match-line"><strong>Marked unavailable:</strong> {unavailable.join(", ")}</p>
      )}
      {reviewReasons.length > 0 && (
        <div className="dinner-result-review">
          <strong>What needs review</strong>
          <ul>{reviewReasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
          <p>An adjusted portion may be possible; the cook must assess original ingredients, preparation and cross-contact.</p>
        </div>
      )}
      {softNotes.length > 0 && (
        <div className="dinner-result-notes">
          <strong>Preferences to consider</strong>
          <ul>{softNotes.map((note, index) => <li key={index}>{note}</li>)}</ul>
        </div>
      )}
      <div className="dinner-result-footer">
        <span>Serves {recipe.servings}</span>
        <Link
          className="view-recipe"
          to={"/recipes/" + recipe.id}
          state={{ from: "/" }}
          aria-label={"View original " + recipe.title + " recipe"}
        >
          View recipe <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

import { Link } from "react-router";
import type { DinnerSuggestion } from "../services/dinnerSuggestions";

export function DinnerResultCard({ result }: { result: DinnerSuggestion }) {
  const { onHand, notMarkedOnHand, unavailable, softNotes, reviewReasons } = result;
  const imported = result.source === "imported";
  const title = imported ? result.recipe.name : result.recipe.title;
  const description = result.recipe.description;
  const time = imported ? result.timeLabel : "About " + result.recipe.estimatedMinutes + " min";
  const servings = imported
    ? (result.recipe.servings.trim() ? "Serves: " + result.recipe.servings : "Servings not listed")
    : "Serves " + result.recipe.servings;
  const to = imported
    ? "/recipes/imported/" + encodeURIComponent(result.recipe.id)
    : "/recipes/" + result.recipe.id;
  const review = result.category === "review";
  return (
    <article className={"dinner-result-card" + (review ? " dinner-result-card--review" : "")}>
      <div className="dinner-result-header">
        <div className="dinner-result-labels">
          <span className={"dinner-source-tag" + (imported ? " dinner-source-tag--my" : "")}>
            {imported ? "My Recipe" : "Sample Recipe"}
          </span>
          <span className="dinner-result-category">
            {review ? "Needs adjustment or review" : "No identified conflicts in demo rules"}
          </span>
        </div>
        <span className="recipe-timing">{time}</span>
      </div>
      <h3>{title}</h3>
      <p className="dinner-result-description">
        {description ? description.slice(0, 240) : imported
          ? "Original recipe imported from your Paprika library."
          : "Sample dinner idea."}
        {description.length > 240 ? "…" : ""}
      </p>
      {onHand.length > 0 && (
        <p className="dinner-match-line">
          <strong>Possible on-hand matches:</strong> {onHand.join("; ")}
        </p>
      )}
      {notMarkedOnHand.length > 0 && (
        <p className="dinner-match-line">
          <strong>Not marked on hand:</strong> {notMarkedOnHand.join("; ")}
          {imported ? " (partial list; not necessarily missing)" : ""}
        </p>
      )}
      {unavailable.length > 0 && (
        <p className="dinner-match-line">
          <strong>{imported ? "Possible unavailable matches:" : "Marked unavailable:"}</strong>{" "}
          {unavailable.join("; ")}
        </p>
      )}
      {reviewReasons.length > 0 && (
        <div className="dinner-result-review">
          <strong>What needs review</strong>
          <ul>{reviewReasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
          <p>Check the full original recipe, labels, preparation and cross-contact.
            A separate portion is never automatically safe.</p>
        </div>
      )}
      {softNotes.length > 0 && (
        <div className="dinner-result-notes">
          <strong>Preferences to consider</strong>
          <ul>{softNotes.map((note, index) => <li key={index}>{note}</li>)}</ul>
        </div>
      )}
      <div className="dinner-result-footer">
        <span>{servings}</span>
        <Link className="view-recipe" to={to} state={{ from: "/" }}
          aria-label={"View original " + title + " recipe"}>
          View recipe <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

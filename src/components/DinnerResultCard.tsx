import { Link } from "react-router";
import type { DinnerSuggestion } from "../services/dinnerSuggestions";
import type { AiDinnerSuggestion } from "../services/aiPopupBridge";

export function DinnerResultCard({ result, ai }: { result: DinnerSuggestion; ai?: AiDinnerSuggestion }) {
  const { onHand, unavailable, softNotes, reviewReasons } = result;
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
  const hardFlags = reviewReasons.filter(reason => reason.includes("(Must avoid)"));
  return (
    <article className={"dinner-result-card" + (review ? " dinner-result-card--review" : "")}>
      <div className="dinner-result-header">
        <div className="dinner-result-labels">
          <span className={"dinner-source-tag" + (imported ? " dinner-source-tag--my" : "")}>
            {imported ? "My Recipe" : "Sample Recipe"}
          </span>
          {ai && <span className="dinner-result-category">AI pick</span>}
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
      {unavailable.length > 0 && (
        <p className="dinner-match-line">
          <strong>{imported ? "Possible unavailable matches:" : "Marked unavailable:"}</strong>{" "}
          {unavailable.join("; ")}
        </p>
      )}
      {hardFlags.length > 0 && (
        <div className="dinner-result-review" role="note">
          <strong>Possible dietary conflict</strong>
          <ul>{hardFlags.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
        </div>
      )}
      {ai && (
        <div className="dinner-result-notes">
          <strong>AI recommendation</strong>
          <p>{ai.explanation}</p>
          {ai.cautions.length > 0 && (
            <ul>{ai.cautions.map((note, index) => <li key={index}>{note}</li>)}</ul>
          )}
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
        <Link className="view-recipe" to={to} state={{ from: "/", aiSuggestion: ai }}
          aria-label={"View original " + title + " recipe"}>
          View recipe <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

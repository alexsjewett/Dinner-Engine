import { FeatureCard } from "../components/FeatureCard";

export function FindDinner() {
  return (
    <div className="page-content">
      <div className="page-intro">
        <p className="eyebrow">A little less deciding, a lot more dinner</p>
        <h1>What sounds good tonight?</h1>
        <p className="lead">
          Dinner ideas shaped by what you have, who's eating, and how much time you have.
        </p>
      </div>
      <FeatureCard eyebrow="Coming in a later Phase 1 milestone" title="Find your dinner">
        <div className="preview-field">
          <span>What ingredients do you have?</span>
          <span className="preview-value">Ingredients you have on hand</span>
        </div>
        <div className="preview-field">
          <span>What common ingredients are you missing?</span>
          <span className="preview-value">Ingredients to avoid shopping for</span>
        </div>
        <div className="preview-field">
          <span>How much time?</span>
          <div className="chip-row" aria-label="Planned time options">
            <span className="chip">15 min</span>
            <span className="chip">30 min</span>
            <span className="chip">45 min</span>
            <span className="chip">60+ min</span>
          </div>
        </div>
        <div className="preview-field preview-field--last">
          <span>Who's eating?</span>
          <span className="preview-value">Choose household profiles</span>
        </div>
        <p className="helper-text">
          These are layout previews, not working search inputs yet. Finding and ranking
          recipes arrives in a subsequent milestone.
        </p>
      </FeatureCard>
      <div className="gentle-note">
        <span className="note-symbol" aria-hidden="true">✦</span>
        <div>
          <strong>Good food, thoughtful choices.</strong>
          <p>Future swap suggestions will be clearly separated from original recipes and require review.</p>
        </div>
      </div>
    </div>
  );
}

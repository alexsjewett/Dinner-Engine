import { FeatureCard } from "../components/FeatureCard";

export function Profiles() {
  return (
    <div className="page-content">
      <div className="page-intro">
        <p className="eyebrow">Made for your table</p>
        <h1>Who's coming to dinner?</h1>
        <p className="lead">
          Keep everyone's food preferences in one place, so future dinner searches
          can consider the people you're feeding.
        </p>
      </div>

      <FeatureCard eyebrow="Coming in a later Phase 1 milestone" title="Household profiles">
        <div className="profile-preview">
          <span className="profile-avatar" aria-hidden="true">+</span>
          <div>
            <strong>Add a household member</strong>
            <p>You'll be able to save a name and foods they avoid.</p>
          </div>
        </div>
        <p className="helper-text">
          Adding and editing profiles is not active yet. Restrictions for selected
          people will be combined during dinner searches.
        </p>
      </FeatureCard>
      <div className="gentle-note">
        <span className="note-symbol" aria-hidden="true">♡</span>
        <div>
          <strong>Safety matters.</strong>
          <p>Food restrictions need careful checking. AI won't declare recipes allergy-safe.</p>
        </div>
      </div>
    </div>
  );
}

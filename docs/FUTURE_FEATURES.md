# Dinner Engine — Future Features & Roadmap

**Purpose:** capture ideas without committing them to Phase 1. Priority and sequencing are provisional unless explicitly approved.

## Phase 1 — Agreed prototype scope
- Find Dinner form: available ingredients, unavailable common ingredients, 15/30/45/60+ minute options, multi-select eater profiles and whole-family toggle.
- Up to three recommendation cards, showing cooking time, kitchen matches, still-needed ingredients and clearly qualified demo swaps.
- Original recipe details, separate possible swaps, and back navigation that preserves search state.
- Browse ten individually stored placeholder recipes with summaries and add-more coming-soon messaging.
- Editable profiles with food avoids; mobile-first design with cream backgrounds, sage accents, rounded cards and fixed bottom navigation.
- Simple, explainable matching. Known restricted ingredients should be excluded, and uncertain ingredient claims should be identified for manual review.
- Initial persistence and hosting details remain **proposed**, not approved implementation decisions.

## Phase 2 — AI integration (future)
- Recipe summarization and estimated cook time at import, stored for reuse.
- Selective ingredient substitution proposals considering flavor, function and cooking method.
- Explainable reranking for promising candidates after deterministic restrictions checks.
- Compare AWS Bedrock Claude models with alternative API models; measure costs, latency and cooking quality.
- Token-efficient prompts, versioned evaluation cases, caching, retry/failure behavior, rate limits and budget alerts.
- Keep all model credentials on a trusted backend; never claim model output certifies allergy safety.

## Phase 3 — Recipe import and storage (future)
- Import Paprika exports while retaining original ingredients and instructions.
- Accept selected other recipe formats; normalize data without losing source fidelity.
- Store household recipe collections durably and support import validation, duplicate handling and edits.

## Phase 4 — Multi-household readiness (future)
- Household accounts, sign-in/invites and backend-enforced authorization.
- Data isolation for every household's recipes, profiles, searches and AI usage.
- Cross-device sync, backups, migrations and account deletion/export.
- Household AI usage budgets, quotas, and payment model (app-managed subscription/credits versus bring-your-own provider account).
- Monitoring, accessibility, performance, privacy controls and reliable deployment with a custom domain.

## Backlog rules
- Record ideas here before adding them to active phase scope.
- Each future feature needs a user benefit, risks, dependencies and acceptance criteria before implementation.
- New ideas do not imply approval to write code.

## Phase 1 increment tracker
- **Milestone 1A — App foundation:** Completed; product owner verified build and preview in GitHub Codespaces. Deployment is still deferred.
- **Milestone 1B — Recipe Library:** Source committed: ten JSON demo recipes, working library cards, ingredient lists and original instructions. Build/mobile review still pending.
- **Milestone 1C — Profiles:** Create/edit profiles and local persistence, with clear household affiliation.
- **Milestone 1D — Find Dinner:** Search inputs, multi-select eaters, rule-based ranking, recommendation cards and state preservation.
- **Later checkpoint — Hosting and iPhone testing:** Confirm privacy implications and plan eligibility before selecting deployment approach.

Increment sequence is proposed for the remainder of Phase 1; each code change still requires separate approval.

## Testing checkpoint after 1B
- Check 10 recipe cards appear and each View link opens the matching recipe.
- Verify Back to Recipe Library and the three-tab navigation.
- Confirm unknown recipe links display a friendly not-found state.
- Verify mobile layout and that sample/AI disclaimers are visible.
- Keep hosting decisions separate from this code increment.

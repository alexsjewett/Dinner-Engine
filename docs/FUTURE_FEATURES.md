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
- **Milestone 1B — Recipe Library:** Source committed: ten JSON demo recipes, working library cards, ingredient lists and original instructions. Product owner reviewed the updated library; automated build verification remains pending.
- **Milestone 1C — Profiles:** Implemented add/edit/delete, versioned browser-local persistence, stable IDs, storage error reporting and delete confirmation. Automated build and user testing pending.
- **Milestone 1D — Find Dinner:** Search inputs, multi-select eaters, rule-based ranking, recommendation cards and state preservation.
- **GitHub Pages hosting:** Public repository and automatic Pages workflow chosen; verify published URL and iPhone navigation after configuring Pages Settings.

Increment sequence is proposed for the remainder of Phase 1; each code change still requires separate approval.

## Testing checkpoint after 1B
- Check 10 recipe cards appear and each View link opens the matching recipe.
- Verify Back to Recipe Library and the three-tab navigation.
- Confirm unknown recipe links display a friendly not-found state.
- Verify mobile layout and that sample/AI disclaimers are visible.
- Keep hosting decisions separate from this code increment.

## Mandatory security gate — before AI APIs or private household data

**Status: Future / blocked until reviewed and explicitly approved.** A reminder is scheduled for the AI/API milestone.

- Never place AWS/OpenAI/other provider keys in GitHub, `.env` files committed to Git, public frontend environment variables, React bundles, or mobile browser storage.
- Introduce a trusted backend to invoke AI using securely managed credentials.
- Prevent anonymous use of billable endpoints; design authentication, server-enforced household authorization and data isolation.
- Validate requests; enforce per-user/household rate limits and AI quotas, maximum input size, monthly budgets and alerts; monitor misuse.
- Review logging for recipe/profile privacy and avoid storing sensitive food restrictions unnecessarily.
- Verify safety messaging for substitutions: never certify allergy safety from model output alone.
- Reassess public repository visibility and hosting before introducing personal records or secret configuration.

## Milestone 1C review checklist
- Create a fictional profile with comma-separated avoids; verify its name and distinct avoidance chips display.
- Create a second profile and confirm both remain after a page reload in the same browser.
- Edit an existing profile; verify the stable ID persists and saves on refresh.
- Delete a profile; check the confirmation and cancel behaviors.
- Check the same site on a different device: no profile sync is expected.
- Keep real dietary/health records and cloud synchronization out of scope until the future authentication and privacy/security checkpoint.

## Milestone 1C inline-edit follow-up

- **Approved and implemented:** Tap Edit on a household profile card to reveal name and comma-separated food avoids directly within that card. Save changes updates the existing profile; Cancel discards the draft.
- **Preserved:** Add form, existing local browser profiles, stable profile IDs and two-step delete behavior.
- **Acceptance test pending on device:** Edit a profile near the bottom on iPhone without scrolling to the top; Cancel and Save; refresh to check persistence; confirm deletion still requires confirmation.
- **Not authorized:** Profile sync, cloud backend, AI and Find Dinner matching are later milestones.

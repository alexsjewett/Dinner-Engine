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
- **Milestone 1C — Profiles:** CRUD, inline edits, browser-only persistence and deletion confirmation implemented and tested by product owner; Milestone 1C.2 expands the profile schema.
- **Milestone 1D — Find Dinner:** Working rule-based search and explained demo matches, product-owner feedback positive. Milestone 1D.1 adds branding and mobile UX polish without changing food-matching rules.
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

## New idea backlog — dietary needs, restriction levels and serving options (October 21, 2026)

**Product direction refined, implementation still pending explicit approval.** These ideas are not live features. Do not change profile schemas, matching rules or AI logic without a separate approved milestone. Keep personal household stories and health specifics out of this public repository.

### IDEA-001 — Profile dietary needs and eating patterns (consider before Milestone 1D)
- Offer simple checkboxes labeled **Dietary needs and eating patterns**, initially **Vegetarian**, **Vegan**, and **Gluten-free**. Use one Gluten-free selection, not separate celiac/voluntary preference checkboxes.
- A checkbox describes a dietary constraint for matching; it is **not** certification of food safety, absence of gluten, or absence of cross-contact. The interface should not infer why a user selected it.
- Confirm exact initial choices and the detailed recommendation behavior before implementation.

### IDEA-002 — Per-food avoidance priority (consider before Milestone 1D)
- Proposed per-food classifications: **Must avoid**, **Should avoid**, and **Prefer to avoid**. **Do not add an optional reason or allergy/intolerance/dislike field.**
- Treat **Must avoid** as a strict constraint for the particular eater's portion, not merely a scoring factor. Household-level recipe assessment must distinguish an ingredient in the recipe from an ingredient that a specific person would actually be served.
- An otherwise relevant recipe might be adaptable through omitting an ingredient or serving it separately, if a knowledgeable cook determines the preparation and serving arrangement is appropriate. Do **not** imply that separation alone eliminates allergen or cross-contact risks; ambiguous cases should require review, not be labeled safe.
- Existing `foodAvoids: string[]` entries must be carried forward conservatively (proposed default: Must avoid) under a versioned migration, without silently relaxing restrictions.
- Confirm entry UI, field names, migration rules, and behavior for uncertain ingredients before implementation.

### IDEA-003 — AI alternatives beyond substitutions (Phase 2)
- Beyond ingredient swaps, AI could suggest **omit**, **offer separately as an optional side/topping**, or **choose another dish**, accounting for different household members being served different portions.
- AI should explain preparation trade-offs and uncertainty. A suggested separate topping/side is not automatically an allergy-safe solution; the cook is responsible for evaluating preparation, utensils and cross-contact for their circumstances.
- Preserve original recipe text and keep AI-proposed modifications clearly separate.
- Defer implementation until the secure-backend, model-cost and safety review gates.

### Product principle — household flexibility with user control
- Dinner Engine should not presume everyone at the table must receive an identical version of a meal, nor reject every household recipe solely because one ingredient is unsuitable for one person.
- Distinguish **ingredient exists in original recipe**, **ingredient is in a specific person's portion**, and **whether an adaptation can be responsibly evaluated by the cook**. Never present automated recommendations as a guarantee of allergy safety.
- Store only generic product requirements in this public roadmap; do not document identifiable family health details.

## Milestone 1C.2 implementation note — October 21, 2026

- **Approved and implemented, user acceptance pending:** Dietary needs checkboxes (Vegetarian, Vegan, Gluten-free) and individual food avoidance levels (Must/Should/Prefer), without a reason field.
- Existing profile IDs and legacy foods are preserved; all historical avoids convert to **Must avoid**, never a softer level. Storage payload version becomes 2 on successful user save.
- **Deferred:** using those selections for rule-based recipe filtering, household eater selection, evaluating separate toppings/sides, or AI. These need a separately approved Find Dinner / AI milestone.
- Confirm on iPhone that older avoids, new choices, editing in place, Cancel, reload and deletion still work; new entries should not appear on another device.

## Milestone 1D acceptance and next-step backlog

**Source implemented; mobile validation pending.** Try shopping-ingredient matching, Must vs Should/Prefer ranking, vegan/vegetarian/gluten-free flagging, whole-household vs selected diners, and search restoration through recipe details. Build and successful GitHub Pages publishing must be independently checked.

**Next possible improvements (not authorized yet):** richer ingredient equivalence and exclusions; explicit ranking rationale or sort controls; more complete ingredient taxonomy for imports; confidence/unknown ingredient notices; a structured and cook-reviewed way to indicate which person gets an adjusted portion; stronger testing fixtures and automated unit tests.

The Phase 2 AI idea for optional sides/toppings, omissions, and substitutions remains deferred. It will require an explicit approval, secure server, cost controls and food-safety review.

## Milestone 1D.1 — Mobile UX & polish acceptance

**Approved and implemented:** visible rebrand to Find Dinner, revised search introduction, first three plus expandable up-to-ten results, recipe route scroll-to-top, structurally separated bottom navigation, and revised Profiles heading. Display name changes do not rename the repository or published URL. No dietary data or matching migration needed.

**Regression test on phone:** Open Recipe Details from the bottom of Find Dinner and Library; check the recipe title appears at the top. Return and expand/collapse results; confirm top three remain unchanged, review cards keep their warnings, and submitted filters survive. Scroll to the bottom of each long screen and verify navigation never covers actions/text. Recheck visible branding, Profiles heading, and mobile safe area.

**Future only / not authorized:** a separate naming exercise, full app icon/identity redesign, deeper kitchen matching, ingredient substitution AI, user accounts or API/backend features.

## Milestone 1D.2 — Footer polish

**Approved and implemented, awaiting phone visual acceptance:** A full-width white footer now backs the existing bottom navigation. The earlier floating-nav rounded container and pronounced shadow are removed, leaving softer rounding only on individual tab states. Main content still scrolls independently and stays above the footer. No other feature changes.

## Milestone 1D.3 — Final small UI polish and move-forward decision

**Approved and implemented; deployment and phone acceptance tracked separately.** Header changed to “Find dinner.” with a sage steaming-bowl icon and alignment to the page content column. The rest of the app was reviewed in a limited static UX checklist, with no broader redesign or unrelated feature work.

**Next:** Once the user confirms the revised header looks right, propose and separately approve the next functional feature milestone. Avoid polishing indefinitely without clear usability issues. Do not infer user acceptance from a successful GitHub Pages build.

## Milestone 2A — Local Paprika import (October 21, 2026)

**Approved and implemented; deploy and device acceptance tracked separately.** Users can select a Paprika Recipe Format export, preview titles and import up to 25 chosen recipes per batch into browser-only IndexedDB; My recipes browsing shows unmodified text and metadata. Duplicate Paprika IDs are skipped. Original sample cookbook remains accessible. No photos, cloud uploads, matching of imported recipes, AI or backend.

**Next proposal, not approved yet:** Build trustworthy matching for imported recipes. That requires explicit handling of unknown cooking times, ingredient normalization, ambiguous ingredient labels and per-person restriction review without certifying allergy safety. Keep original Paprika text immutable and derived matching facts distinct.

## Milestone 2B — Find Dinner includes your imported Paprika recipes

**Approved and implemented; mobile device acceptance pending.** Saved recipes are read from IndexedDB at search time, ranked ahead of ten fictional samples, and labeled by source. Original ingredient lines are screened using minimal word/phrase and plural matching; known times are used, unknown time remains a review warning. Every imported result requires manual assessment, especially when a saved person's dietary needs or restrictions are involved. Original Paprika contents, sample rules, profiles and sessions are unchanged.

**Next candidate (not approved):** a separate source-preserving ingredient review/enrichment screen for imported recipes, improved aliases and optional cook-reviewed substitutions, supported by stronger automated checks. No medical/allergy certification. AI and backend phases remain gated by separate security/budget approvals.

## Future UX backlog — Consolidate disclaimers and caution language (feedback October 21, 2026)

**Requested, not yet approved for implementation.** Primary user reports that disclaimer language is overwhelming, repetitive and distracting across Find Dinner, recipe result cards/details, Profiles and Recipe Library/import. Reduce warning fatigue while retaining appropriate due diligence, especially for genuine per-person dietary/restriction concerns and imperfect ingredient matching.

**Later review scope:**
- Inventory every warning, banner, helper paragraph, repeated caveat and safety-related label throughout all screens.
- Decide where one short, clear explanation can replace several repeated disclaimers; make detailed explanations available in a single easy-to-find "How recommendations work / limitations" destination if useful.
- Keep succinct **contextual** warnings only when they change a cooking decision (e.g., an apparent Must avoid ingredient hit, uncertain imported recipe classification, unknown time or label/cross-contact issue). Do not bury actionable warnings inside generic legal language.
- Use calm, plain-English language. Avoid implying that an imported recipe is verified allergy-safe/gluten-free or that the app has performed checks it has not actually performed.
- Review what privacy/storage guidance is genuinely necessary at import/profile entry, and eliminate repeated copy that users have already seen.
- For wider distribution beyond a single primary user, review any applicable legal, privacy, accessibility and food-safety communication needs; **do not assume a certain count of disclaimers alone provides legal protection**.

**Acceptance criterion:** noticeably less repetitive text on the core dinner flow, while actionable restrictions, uncertainties and material privacy limitations remain clearly identifiable at the point they matter.

**No UI/code change authorized by this backlog note.** Scope and approve the consolidation as a separate small milestone after current feature work.

## Milestone 3A — Approved OpenAI-first secure AI pilot

**Stage 3A.0 staged, no live AI:** a deliberately disabled backend Worker
scaffold, CI fail-closed test and design notes are in the repo. The working
2B recommendations and local recipe data remain unchanged.

**Before any billable or personal-data activation:** owner OpenAI API and
Cloudflare accounts; one-user verified authorization; iPhone Safari sign-in;
atomic durable quotas / spending protection; bounded prompts/outputs;
separate explicit privacy, security and budget review. See docs/AI_PILOT_PLAN.md.

**Future but not authorized for this increment:** AI ingredient substitutions,
serving variants, persistent cloud recipe storage, cross-device household
accounts, subscriptions and disclaimer consolidation. A large 2C rules-only
enhancement is deferred because current matching is already useful.

# Dinner Engine

A mobile-first, iPhone-friendly web application that helps a household choose what to cook based on available ingredients, missing staples, time, and household food restrictions, while proposing substitutions for human review.

**Status:** Phase 1 Milestone 1D: Find Dinner rule-based search, household profile selection and explained demo recipe recommendations implemented; final deployment and mobile acceptance checks tracked separately.

## Product vision
Dinner Engine is a companion to Paprika Recipe Manager, not a replacement. Start with a single household and ten placeholder recipes; design for future independent households, each with its own cookbook, profiles, and AI usage/payment arrangement.

## Core experience
- **Find Dinner:** ingredients on hand, missing ingredients, time (15, 30, 45, or 60+ minutes), selected eaters; up to three explainable dinner suggestions.
- **Recipe Library:** browse recipes, summaries, estimated cook times, and full original instructions. Adding recipes is coming soon in Phase 1.
- **Profiles:** add/edit people and lists of foods they avoid, with a whole-family selection option.
- **Recipe Details:** preserve original recipe text; show any possible swaps separately with explanations, including uncertainty.

## Safety
Never claim a recipe is allergy-safe from AI reasoning alone. Exclude known restricted ingredients using deterministic checks; flag ambiguous ingredients, packaged products, sauces, and unverified substitutions for manual review. Treat AI substitutions as suggestions, not safety certifications.

## Phase roadmap
1. **Phase 1 – Working prototype:** React + TypeScript, mobile interface, ten sample recipes as individual files, profiles, navigation, state retention, transparent rule-based matching. No live AI yet.
2. **Phase 2 – AI:** secure backend, provider comparison, cost controls, AI-generated summaries/time estimates and contextual substitutions.
3. **Phase 3 – Cookbook:** Paprika and other recipe imports, longer-term storage.
4. **Phase 4 – Production:** accounts, secure multi-household isolation, cross-device persistence, billing options, reliability and deployment polish.

Phase numbers describe planning sequence, not delivery commitments.

## Engineering principles
- Repository was initially private and is now public by the product owner's choice. Source code, project documentation and demo recipes are visible to anyone; do not commit personal household information or credentials.
- Prefer low ongoing costs; preserve the option to compare AWS Bedrock (boto3/InvokeModel) with other AI APIs.
- Separate frontend, backend and AI-provider concerns as the app evolves.
- Model recipes/profiles as belonging to a household; a household ID alone is **not** an authorization/security boundary.
- Never expose API credentials in browser code.
- Agree on the scope of each code-writing step and obtain explicit approval before creating or editing application code.

## Project documents
- [Decision register](docs/DECISIONS.md)
- [Future features and roadmap](docs/FUTURE_FEATURES.md)
- [Key learnings](docs/KEY_LEARNINGS.md)

## Current development state
React/TypeScript frontend foundation and ten static sample recipes are present. No backend, production recipe database, or AI integration is present. GitHub Pages workflow is configured; verify deployment in GitHub Actions and Pages Settings. GitHub Pages is deployed. Phase 1 profile persistence uses only the current browser; cloud data storage, authentication and AI API provider are still future work.

## Milestone 1A — Application foundation (October 20, 2026, Pacific time)
The React + TypeScript + Vite app foundation, page placeholders, fixed mobile bottom navigation, and CSS theme have been added. This is source code, **not a deployed website**. No recipe data, profile editing, recipe matching, AI, backend, or hosting were implemented.

### How to run locally (once Node.js 22.12+ is installed)
1. Open a terminal in the repository folder.
2. Run `npm install` to install dependencies (this generates a package lock file).
3. Run `npm run dev` and open the local address it prints.
4. Run `npm run build` to type-check and generate a production build.

The product owner verified the Milestone 1A build and preview successfully using GitHub Codespaces. Milestone 1B changes must be rebuilt and tested. Publishing and iPhone access are separate future steps.

## Milestone 1B — Sample Recipe Library (October 20, 2026, Pacific time)
- Ten sample dinner recipes are stored as separate JSON files in `src/data/recipes/`.
- Recipe cards and details screens now show cooking time, description, original ingredients and instructions.
- A placeholder explains that AI substitutions are not active, and importing recipes remains a coming-soon feature.
- A small `cookbook.ts` data-access module keeps the UI independent of the future storage layer.
- Samples are demonstration content, not Paprika exports. No ingredient safety certification or AI analysis has occurred.
- Run `git pull` and `npm run build` in your existing Codespace to verify this milestone. The repository has not been deployed.

## GitHub Pages auto-deployment — October 21, 2026

The site source is public; GitHub Actions is configured to build and publish the Vite `dist/` output when code is pushed to `main`. GitHub Pages must be enabled under **Settings → Pages → Build and deployment → Source: GitHub Actions**. Review the workflow run in **Actions** to verify a successful deployment.

**Expected URL after a successful deployment:** https://alexsjewett.github.io/Dinner-Engine/

The Vite `base` is `/Dinner-Engine/`. The frontend uses `HashRouter` for reliable static hosting, so internal pages have URLs such as `.../Dinner-Engine/#/library`. You can bookmark the main link on a phone or laptop and refresh after approved commits deploy.

If we later switch hosting or make the repository private, review the GitHub Pages and routing settings. Publishing a site or its repository makes its content accessible; do not place API keys, real household profiles, or other private data in frontend source files.

### Security gate before AI/backend work
**Do not deploy a paid AI API until an explicit security review and approval.** Store provider credentials only in backend-managed secrets; add identity/authorization controls before private household data or billable endpoints are exposed; require request validation, usage quotas, rate limits, spending budgets/alerts, and abuse protections. A public static page can connect to a secure backend later. See `docs/FUTURE_FEATURES.md`.

## Milestone 1C — Household Profiles (October 21, 2026)

- Profiles can be created, edited and deleted from the Profiles tab using a name and comma-separated food avoids.
- Each profile gets a stable random ID and the prototype household ID `demo-household`.
- Profile data is stored in the current browser using `localStorage` (key `dinner-engine:household-profiles:v1`), not checked into GitHub or synchronized between browsers.
- The form reports errors if the browser cannot save, and deleting requires an explicit second confirmation.
- Do not treat local browser storage as encrypted, backed up or appropriate for sensitive medical details. Use fictional test profiles until we have private household accounts and secure storage.
- Find Dinner matching and profile selection are implemented separately in Milestone 1D, using limited deterministic demo rules.
- No backend, AI integration, API keys or private user authentication were added.
- After GitHub Actions finishes, test adding, editing, refreshing and deleting a fictional profile on both mobile and desktop.

## Milestone 1C follow-up — Inline editing (October 21, 2026)

After confirming the original CRUD behavior worked, the product owner identified a mobile usability problem: tapping Edit brought existing profile data into the separate form at the top of the page, requiring an upward scroll. The approved fix opens name and food-avoidance fields **inside the corresponding profile card**, with local Save changes and Cancel buttons.

- The Add a profile form stays exclusively for creating new people.
- Each profile card owns its temporary edit draft; Cancel discards unsaved changes and Save updates that person's existing ID and data.
- Deletion still requires confirmation, and errors appear in the affected card instead of at the top.
- Browser storage schema, keys, existing profiles, and security scope are unchanged. No migration is necessary.
- Acceptance check: on iPhone, tap Edit for a profile near the bottom; the editable fields appear in the same card with no upward jump. Confirm Save persists after refresh and Cancel preserves the previous values.

## Milestone 1C.2 — Dietary needs and avoidance levels (October 21, 2026)

- Create or edit a person with checkboxes for **Vegetarian**, **Vegan**, **Gluten-free**; there is one Gluten-free option, not a medical-reason selector.
- Enter individual foods in rows, each with **Must avoid**, **Should avoid**, or **Prefer to avoid**. No reason is requested. Blank rows are ignored; duplicate food entries must be resolved before saving.
- The Add form stays separate, and existing persons can still be edited inline. Food rows can be added or removed.
- Existing version-1 browser profiles are **read without changing localStorage**, and their saved `foodAvoids` are interpreted as **Must avoid**. The first successful add/edit/delete writes the version-2 profile structure under the **same browser key**, preserving IDs and existing avoided foods.
- The original storage key name retains its `v1` suffix for backwards compatibility; the payload now declares `version: 2`. No profile data is committed to GitHub.
- A **Must avoid** classification will guide future per-person matching; it is not yet an implemented exclusion rule. Future meal suggestions may discuss cooking or serving ingredients separately, but must never claim allergy or gluten safety. Ambiguity requires human review.
- **Out of scope:** Find Dinner matching, AI, allergy certifications, account security, cloud storage and cross-device sync.
- Acceptance testing: verify existing profiles still appear with Must avoid entries, add/edit priority and checkbox selections, Cancel editing, remove rows, refresh persistence and delete confirmation on mobile.

## Milestone 1D — Find Dinner search (October 21, 2026)

Find Dinner now accepts comma-separated ingredients **on hand** and **unavailable**, a 15/30/45/60+ minute target, and either the whole set of saved household profiles or a selected subset. Click **Find Dinner Ideas** for up to three recommendations from the ten fictional recipes. One potential review/adjustment option is shown if available; straightforward matches are otherwise prioritized.

**How matching works:** `src/data/recipeFacts.ts` adds hand-curated demo ingredient labels, synonyms, and dietary indicators without rewriting original recipe text. `src/services/dinnerMatcher.ts` uses those facts to compare pantry terms, recipe times and only the selected diners' dietary needs and per-food restriction priorities.

- **Must avoid:** a known match or dietary conflict puts the recipe in the *Needs adjustment or review* group, never a conflict-free group. This does **not** automatically reject a possible household meal where a knowledgeable cook can make different portions.
- **Should avoid / Prefer to avoid:** known ingredient matches are clearly listed and lower the score, rather than automatically excluding the recipe.
- **Time over budget or explicitly unavailable ingredients:** classified as *Needs adjustment or review*, not presented as straightforward.
- **Vegetarian, Vegan, Gluten-free:** hand-checked sample rules indicate apparent conflicts or areas requiring review; the app cannot certify suitability, gluten safety, or cross-contact safety.
- **Ingredients on hand:** positive matches help ranking. If a user supplies an on-hand list, all other demo ingredients are reported as *not marked on hand*, NOT necessarily missing. Users can leave the list empty.
- **Demo synonyms:** comparisons use manually selected aliases and avoidance groups (e.g., dairy cheese is different from coconut milk); unrecognized terms, hidden ingredients and packaged-food details may be missed.

A recipe with identified conflicts may still inspire an adaptation, but **the user must evaluate the original recipe, individual portion, labels and preparation**. No algorithm-generated substitution is approved or provided here. The site's language never certifies food safety.

**State retention:** `src/services/searchSession.ts` stores draft/last-submitted criteria in this tab's `sessionStorage`, allowing search results to reappear after navigating to a recipe and back. This is local browser state, not a backend, sync or permanent saved search.

**Out of scope:** AI, backend services, importer, account authentication, new real recipe data or allergy certification.

### Test checklist
1. Search with `chicken, potatoes, broccoli` on hand and 45 min; confirm sensible sample matches and matched-ingredient explanations.
2. Mark `chicken` unavailable; check a chicken recipe moves to review.
3. Select a profile with `milk` marked Must avoid; confirm recipes with cheese/yogurt/butter are flagged rather than called conflict-free. Coconut milk should not be classified as dairy milk.
4. Try Gluten-free and Vegan checkboxes on sample profiles and inspect review reasons; labels and cross-contact still require human verification.
5. Open a suggested recipe, tap Back to Find Dinner; check input and results remain.
6. Repeat on iPhone; remember household profiles and searches are browser-local.

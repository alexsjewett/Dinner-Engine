# Find Dinner

A mobile-first, iPhone-friendly web application that helps a household choose what to cook based on available ingredients, missing staples, time, and household food restrictions, while proposing substitutions for human review.

**Status:** Milestone 3A.0 approved and staged. AI is not yet active: a nonbillable, fail-closed backend scaffold and security plan have been added. Existing 2B dinner recommendations remain live.

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

## Milestone 1D.1 — Mobile UX & Polish (October 21, 2026)

The **public-facing app name** is now **Find Dinner** (app header, browser title, and visible recipe messaging). The GitHub repository remains `alexsjewett/Dinner-Engine`, and the existing Pages URL and storage keys stay unchanged.

- Intro copy now begins: “Share what's in your kitchen, how much time you have, and who's eating.”
- Find Dinner still starts with the exact same **top three** deterministic recommendations and the same straightforward-versus-review markings. When more candidates are available, **Show more matches** appends up to seven more (ten total); **Show fewer matches** restores the initial three. Additional cards are flagged and explained with the same safety caveats.
- Expanding or collapsing the matches is held in the existing per-tab search session, including navigation to a recipe and back. A new submitted search resets to the initial three.
- Navigating to a recipe (including View from Find Dinner or Recipe Library) scrolls the actual page-content container to the top rather than inheriting the previous page's scroll position.
- The entire app now uses a full-height flex column. The header and bottom navigation occupy their own layout space; only main content scrolls. The nav no longer overlays any content, including on iPhone safe-area layouts.
- Profiles page now reads “Who's eating dinner today?”
- No changes were made to profile storage, recipe source data, ingredient classifications, dietary matching/ranking rules, AI/backend architecture, or GitHub URL.

**iPhone acceptance test:** open Find Dinner, run a search, expand and collapse results, open a recipe from lower in the list and verify its title appears at the top, return and verify search criteria and expanded status, scroll to the bottom on Find Dinner, Library, Profiles and Details, and confirm every final button and paragraph remains visible above the nav.

### Deployment verification — October 21, 2026

A later GitHub Actions run unexpectedly published an earlier commit after the Milestone 1D.1 build had already succeeded. To ensure the live GitHub Pages website includes the latest `Share what's in your kitchen...` copy and expandable up-to-ten matches, a documentation-only main-branch commit re-triggers the deployment using the latest source tree. Verify the **last successful deployment's SHA** equals the current `main` SHA; a successful build by itself does not guarantee the latest version remains published. Safari may also cache the old page, so refresh or open the published URL in a new tab after the correct deployment completes.

## Milestone 1D.2 — Bottom navigation visual polish (October 21, 2026)

- The bottom tabs sit inside a full-width, lightly separated **white footer**, rather than a floating, doubly rounded card surrounded by cream background.
- The three tabs and selected sage highlight remain, with slightly softer individual tab corners and minimal footer shadow.
- The footer (including the iPhone bottom safe area) occupies dedicated flex layout space; the main page scrolls independently and cannot pass underneath the navigation.
- **Only appearance/layout was changed:** no change to search results, recipe detail behavior, profile data, persistence, or AI.
- Mobile acceptance: on iPhone, inspect the boundary between cream content and white footer while scrolling and on long cards; confirm all final buttons and text are reachable above the footer.

## Milestone 1D.3 — Final header branding and UX checkpoint (October 21, 2026)

- Displayed app header is **Find dinner.** (lowercase `d` after Find, trailing period), left-aligned to the same centered content column as the page body at larger screen sizes.
- Replaced the plain starburst glyph with a small, hand-authored steaming-bowl SVG. It uses the existing sage icon color on a sage-soft rounded square, with no new image assets, icon package, network requests or fonts.
- The browser tab title remains **Find Dinner**, and GitHub repository, Pages URL, storage keys and navigation labels are unchanged.
- Reviewed the three core pages and recipe details for the final UX pass: route scroll-to-top, separate scrollable main pane and non-overlapping footer, existing editable profile controls, recipe links, and three-plus-expandable results. **Static code review does not establish on-device visual or interaction success.** No other application edits were necessary within this pass.
- **iPhone acceptance test:** confirm the icon looks aligned and visible, “Find dinner.” lines up with page content, no heading or header tagline crowds it on phone, view a recipe from the bottom of expanded results and return, and verify the white navigation footer does not cover the last item on any page.
- After acceptance, prioritize the **next functional product milestone** rather than open-ended aesthetic polishing. A separate explicit scope approval is required for the next feature.

## Milestone 2A — Paprika import and local recipe library (October 21, 2026)

**Scope approved:** import and browse your original recipes before attempting recommendation matching.

### How to use
1. In Paprika, open **Settings → Export Recipes**, select a category or All Recipes, and use **Paprika Recipe Format** (not HTML). Save the `.paprikarecipes` export where your device's browser can pick it. Paprika officially describes this export as a ZIP containing individually GZIP-compressed JSON recipe files.
2. In Find Dinner, open **Recipe Library → My recipes** and choose the export file. The app reads it **locally**, with no upload to a server.
3. Preview recipe names and select up to **25 new recipes per batch** (or use Select first 25 new). Already imported Paprika UIDs are identified and disabled. Nothing is stored until Save selected recipes is tapped.
4. Browse your saved recipes under My recipes, and open original ingredients/instructions, notes, sources, categories, servings and original time strings. Sample recipes remain available in their own tab.

### Storage and fidelity
- Imported recipes are stored only in this browser's **IndexedDB**, separate from sample JSON files and profile `localStorage`. The repository remains public and contains **no actual household recipes**.
- The app retains original plain-text ingredients, directions, description, notes, servings, prep time, cook time, total time, categories, and source fields when present. It does not invent a cooking duration or claim any nutrition/allergy verification.
- Recipe photo/base64 fields are **not imported** in this initial release. Images are omitted to reduce persistent storage size. Paprika itself remains the source/backup.
- The app uses original Paprika `uid` as an internal duplicate key when available; a deterministic content fingerprint is used as fallback. Existing saved records are never overwritten when importing again.
- Import is capped at a **35 MB outer archive**, **2,000 entries**, and bounded per-entry compressed/uncompressed sizes to avoid excessive work on mobile. Export smaller Paprika categories if the limit is reached. Invalid/oversize entries are skipped with a warning.
- Clearing site data, using private browsing, reinstalling a browser or switching devices may delete local recipes. There is **no sync, backup, account, or cloud storage**.

### Deliberately postponed
- **Historical 2A boundary (superseded by Milestone 2B below):** At initial import launch, Find Dinner still used sample recipes only. Milestone 2B adds conservative, review-only matching for imported recipes.
- AI, substitutions, Paprika sync, editing imported recipes, photos, exports and a private backend remain deferred.

### Mobile acceptance checks
- Test with a small, fictional or non-sensitive Paprika export first; verify preview names, selection limit, Save, My recipes cards, exact original ingredients/directions/notes, and reload persistence.
- Re-import the same file: existing recipe IDs should display as Already imported and not duplicate.
- Select another export/category to add recipes; sample recipe browsing and Find Dinner demo results should remain unchanged.
- Ensure the file picker, preview list and cards fit on iPhone, and that errors for unreadable/too-large files are understandable.
- Confirm imports are **not** present on a different device or in an incognito window.

## Milestone 2B — Match imported recipes in Find Dinner (October 21, 2026)

**Approved scope:** Give locally saved Paprika recipes priority in Find Dinner, label their source, apply limited ingredient and original-time matching, and explicitly flag uncertainty without implying allergy, gluten, or dietary safety. No AI, backend, storage migration or changes to the ten sample recipe facts.

### What happens now
- Find Dinner reads the **same IndexedDB store** as Recipe Library on each visit. Nothing needs to be re-imported and no originals are altered.
- Ranked **My Recipe** cards appear first; **Sample Recipe** cards may follow. The top three plus **Show more matches** behavior remains, capped at ten total results. If ten or more imported recipes exist, they can fill all ten slots.
- Imported recipe matches use literal, whole-word/phrase checks of original ingredient lines, with minimal plural variants such as `egg` / `eggs`. These matches are possibilities, not validated ingredient classifications; synonyms, compound foods, hidden ingredients, and cross-contact may be missed.
- On-hand terms increase a recipe's rank; explicitly unavailable terms take precedence. The label **Not marked on hand** does not mean missing.
- Timing is taken only from recognizable original duration strings such as `30 min` or `1 hr 15 mins`. If a parseable total isn't available, both prep and cook durations must be present before they can be added. Unknown or unclear durations remain **unverified**, are never guessed, and trigger a review note.
- Imported recipes **always** appear under **Needs adjustment or review**, even when no conflicting ingredient text is found. Possible Must avoid hits are highlighted by person and strongly demoted within owned-recipe ranking; Should/Prefer hits appear as preference notes. Selected Vegetarian, Vegan and Gluten-free needs are shown as **not verified** rather than assumed satisfied.
- The original deterministic sample matcher, profile selection, search session and saved profile data are unchanged. Returning from an imported recipe uses the existing search-state restoration.

### Safety and privacy
This is **not a nutrition, medical or food-safety checker**. Search uses text that may not reflect packaged-food allergens, alternatives, cross-contact or actual serving portions. Never treat absent text hits as certification. Original Paprika data stays in the user's browser; no recipe text, profiles or identifiers are sent to GitHub, AI or a backend. Browser clearing/private windows remain separate.

### Automated verification and phone acceptance
- CI runs the synthetic Paprika export smoke test **and** `npm run test:matching`: checks imported prioritization, unchanged sample-only ranking, review-only status, unknown times, individual Must/Prefer text matches, singular/plural detection, unavailable precedence and that matching leaves original recipe text unchanged.
- **Real iPhone testing still required:** using the same browser where recipes were saved, run Find Dinner and confirm a saved recipe appears with **My Recipe** and **Needs adjustment or review**. Expand up to ten, open that recipe, then return and confirm filters and results. Try an on-hand ingredient from one of your recipes, then list it as unavailable. Test a saved Must avoid restriction and an unknown-time recipe. Confirm no saved recipes appear in a different browser/private tab.
- If IndexedDB cannot be read, Find Dinner visibly warns and can still show fictional sample recommendations; it must never silently pretend imports were available.

**Deferred:** confidence-controlled ingredient parsing, real allergen taxonomy, cook-reviewed modifications/substitutions, Paprika sync, AI and a secure backend.

## Milestone 3A.0 — Approved OpenAI-first AI pilot, security foundation only

The user approved a small, one-user AI recommendation pilot using OpenAI via a
secure Cloudflare Worker. The initial deliverable is deliberately safe: a
disabled backend scaffold under backend/, tested by GitHub Actions, and an
explicit security, privacy and cost-control plan in docs/AI_PILOT_PLAN.md.

**No AI key, billable request, personal recipe transfer, or deployed backend
is part of 3A.0.** The existing iPhone web app stays unchanged, including
browser-local Paprika recipes, profiles, and deterministic search.

Before any AI service goes live: create the OpenAI and Cloudflare accounts,
confirm protected single-user authentication (including iPhone Safari),
implement persisted atomic quotas and cost controls, validate inputs,
obtain explicit action-by-action sharing consent, and approve the final
security and billing activation review. Never paste keys in the repository
or conversation.

**AI account checkpoint:** Owner reports Cloudflare account and OpenAI API project `dinner-engine` created (October 21, 2026 Pacific). Not yet connected. Next: Zero Trust onboarding, budget alerts and protected disabled Worker; see `docs/AI_PILOT_PLAN.md`.

**3A.1 preparation update (October 21, 2026 Pacific):** Cloudflare Zero Trust onboarding reported complete, and the owner approved using imported Paprika recipes for AI quality testing **after** authentication and budget gates are verified. `backend/wrangler.json` plus exact-owner Cloudflare Access authorization and CI tests are staged, not deployed. Next owner step: enable Protect all Workers > All traffic *before* connecting the GitHub repo in Cloudflare. Existing GitHub Pages frontend is unchanged; no AI secret or billable endpoint exists.

**3A.1 device checkpoint:** Cloudflare Git Worker `dinner-engine-ai` has now
been deployed from the `backend` root with global Access enabled.
An iPhone health check was denied despite configuring the owner-only
`ALLOWED_EMAIL` secret. Temporary health-route-only, non-identifying
403 failure codes are being tested and deployed to isolate the issue.
No auth bypass, API key, model calls or recipe transfer is involved.

**3A.1 iPhone acceptance update (October 21, 2026 Pacific):** An authenticated
Safari request to the protected `dinner-engine-ai/api/ai/health` now
returns `enabled:false`, after the `ALLOWED_EMAIL` value was moved from
Cloudflare's Build settings into **Production runtime** Variables and Secrets.
Approved temporary 403 diagnostic codes are now removed; further CI,
Cloudflare deployment and Private Safari session verification are separately
tracked. **AI remains disabled and nonbillable; no imported recipes were sent.**

## Milestone 3A.2 — Nonbillable request protection

The protected Cloudflare backend now includes a default-off developer validation route, strict schema and request-size limits, and shared SQLite Durable Object rate/simulated-spend reservations. The actual recommendation route remains disabled and has no OpenAI client or API key. The existing browser-local recipes and GitHub Pages app are unchanged.

Conservative test limits: 10 accepted tests/hour, 40/day, 100/month, synthetic 10 cents/test and synthetic $10/month. These are **not actual provider costs** or a guaranteed real-money ceiling. The test endpoint requires private Production runtime secret `AI_GUARDRAIL_MODE=test`; it is off by default. GitHub CI validates the Worker with a Wrangler dry-run, and Cloudflare must be checked independently before phone acceptance. See `backend/README.md` and `docs/AI_PILOT_PLAN.md`.

Connecting a paid model requires separate approval of real cost reservations/reconciliation, budget shutoff, outputs, privacy/retention and explicit user-triggered sharing.

**3B.1 staged preview (October 22, 2026 Pacific):** The Find dinner. results page now includes a disabled, clearly labeled AI action; the browser makes no AI requests. `backend/src/aiPilot.ts` prepares a minimized shortlist for proposed `gpt-6-luna` and validates output against candidate IDs, with synthetic preflight tests. OpenAI is **not connected**; $5/month is a design target, not an enforced real-money cap. Additional 3B.1 implementation and security review are required before separately approving 3B.2 billable activation.

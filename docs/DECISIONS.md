# Dinner Engine — Decision Register

Record meaningful product and technical decisions here. Use **Approved**, **Proposed**, **Open**, or **Superseded** and preserve prior decisions when directions change.

| ID | Status | Decision / question | Rationale and trade-off |
|---|---|---|---|
| DEC-001 | Approved | Build an iPhone-friendly, mobile-first Dinner Engine as a companion to Paprika, not a replacement. | Focus the product on deciding what's for dinner. |
| DEC-002 | Approved | Start with one household; aim eventually to serve separate users and families. | Avoid overbuilding the MVP while preserving a scalable domain model. |
| DEC-003 | Approved | Use React and TypeScript for the website. | Modern component-based UI and type checking; creates a learning curve. |
| DEC-004 | Superseded by DEC-026 | Store project source and documentation in GitHub; keep the repository private initially. | Version history and privacy during development; publication can be reconsidered. |
| DEC-005 | Approved | Require agreement and explicit approval before writing/editing application code. | Keeps the product owner involved in implementation choices. |
| DEC-006 | Approved | Split the work into phases; Phase 1 is a functioning prototype without live AI integration. | Validate product UX before backend and AI complexity. |
| DEC-007 | Approved | Build toward automatic, in-app AI using a separately billed API; a ChatGPT subscription does not cover third-party application API calls. | Seamless end-user UX, with some incremental usage costs. |
| DEC-008 | Approved | Minimize AI cost through deterministic filtering/ranking, reuse of stored summaries/time estimates, selective model calls, and usage controls. | Cheaper and more explainable; maintain manual review of safety uncertainties. |
| DEC-009 | Approved | Separate original recipes from suggested substitutions; never claim AI-established allergy safety. | Limits misleading safety assurances. |
| DEC-010 | Approved | Maintain README, decisions, future features, and key learnings as living GitHub Markdown documentation. | Preserves traceability and technical-PM education. |
| DEC-011 | Approved | Include Find Dinner, Recipe Library, Profiles, and Recipe Details in Phase 1; ten placeholder recipes and a coming-soon import affordance. | End-to-end prototype scope with limited data. |
| DEC-012 | Approved direction | Assign stable identifiers and associate recipes/profiles with a household in the data model. | Prepares for expansion, but does not itself provide secure separation. |
| DEC-013 | Approved for a later Phase 1 milestone | Use individual JSON files for placeholder recipes and browser-local storage for prototype profile persistence. | Simple and cheap; does not synchronize across devices. |
| DEC-014 | Proposed | Later use a secure backend for AI calls, potentially Python/boto3 with AWS Lambda/API Gateway and Amazon Bedrock InvokeModel. | Supports the original AWS learning goal; provider and deployment not yet finalized. |
| DEC-015 | Open | Select AI provider/models after comparing Bedrock and alternatives on substitution quality, cost and API behavior. | Avoid premature vendor lock-in. |
| DEC-016 | Partially resolved by DEC-027 | Choose deployment and data persistence approach, including GitHub Pages limitations and private-repo publishing eligibility. | Must support iPhone testing without exposing secrets. |
| DEC-017 | Open | Choose future authentication, household authorization, billing, quotas and cloud storage. | Needed for multi-household production, not Phase 1. |

## Process
- Before implementation, review the exact scope and obtain approval.
- At each milestone, update decision statuses, future backlog and learnings.
- An approved *direction* does not automatically approve a particular implementation or code change.
- When changing a decision, mark the old entry **Superseded** and add a new entry explaining why.

## Initial record
Initial agreements were made during product discussions on October 20, 2026 (Pacific time). The first documentation setup was authorized separately on the same date. This register summarizes those discussions; it is not evidence that proposed technical architecture has been implemented.

## Milestone 1A implementation decisions — October 20, 2026 (Pacific time)
| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-018 | Approved and implemented | Bootstrap React/TypeScript with Vite; use declarative React Router for four placeholder routes. | Small, understandable foundation; avoids backend and framework complexity for now. |
| DEC-019 | Approved and implemented | Use shared CSS variables for a cream/sage design, rounded cards and fixed safe-area-aware bottom navigation. | Mobile-first consistency without adding a styling library. |
| DEC-020 | Approved and implemented | Limit Milestone 1A to navigation, placeholder screens, project setup and documentation. | Real recipe data, matching, profiles, AI, backend and deployment remain out of scope. |
| DEC-021 | Deployment choice resolved by DEC-027; testing ongoing | Choose deployment path and test the build in an environment with npm package access. | Private repository does not imply private deployment; no site is published yet. |

**Implementation note:** The recipe details preview is accessible from both Find Dinner and Recipe Library. It returns to the origin using navigation state when provided, otherwise to Recipe Library. Preserving *actual search input/results* is still a later milestone because no search exists yet.

## Milestone 1B decisions — October 20, 2026 (Pacific time)

| ID | Status | Decision | Rationale |
|---|---|---|---|
| DEC-022 | Approved and implemented | Store 10 demonstration recipes as individual JSON files with stable recipe IDs and a sample household ID. | Simple, inexpensive Phase 1 catalog that can later be imported into durable storage. |
| DEC-023 | Approved and implemented | Implement Recipe Library cards and full original recipe details with a reusable card and separate cookbook service. | Preserve source content while avoiding coupling UI to storage. |
| DEC-024 | Approved and implemented | Display a plain disclaimer and leave possible swaps empty until the AI phase. | Avoid implying that mock data or unverified AI substitutions are safe. |
| DEC-025 | Open | Confirm Milestone 1B build and actual mobile UX in Codespaces. | Saving code is not the same as validating it. |

**Note:** Recipe descriptions and cooking times are illustrative sample values, not AI-generated. `demo-household` is an organizational field, not access control. Find Dinner matching, profile editing, backend, AI and deployment are not included in this milestone.

## Deployment and security checkpoint — October 21, 2026

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-026 | Approved | Change Dinner Engine repository visibility to **public**, after initial private development. | Enables GitHub Pages on GitHub Free and simple sharing/testing; source, docs, demonstration recipes and past commit metadata become publicly visible. Visibility may be changed later, but public copies/forks cannot be recalled. |
| DEC-027 | Approved and configured, deployment pending verification | Use GitHub Pages, deploying with GitHub Actions from `main`, with Vite base `/Dinner-Engine/`. | Desired free URL and automatic builds without Codespaces; published static files are public, not private family data storage. |
| DEC-028 | Approved and implemented | Use React Router `HashRouter` for GitHub Pages compatibility. | Direct refresh of nested pages works on static hosting; internal URLs include a `#`. We can revisit this with a backend-supported router. |
| DEC-029 | Approved security requirement for future development | Before AI API/backend deployment, perform a separate security review: backend-only secrets, household authentication/authorization, rate limits and quota enforcement, spending controls and abuse monitoring. | Prevent paid-model misuse and leaks on a public website. **No AI/API implementation is authorized by this decision.** |

The project owner explicitly opted into public GitHub hosting and requested a reminder when paid AI/API development approaches. The repository is currently public; GitHub Pages publication requires Pages Settings and successful workflow execution.

## Milestone 1C decisions — October 21, 2026

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-030 | Approved and implemented | Add, edit and delete household profiles with name and comma-separated food avoids. | Makes the Profiles page functional while preserving limited Phase 1 scope. |
| DEC-031 | Approved and implemented | Store profiles in versioned browser `localStorage`, with stable random IDs and a prototype household identifier. | No server cost; device-specific and neither encrypted nor cross-device synchronized. |
| DEC-032 | Approved and implemented | Start with no seeded people; require a confirmation step to delete and show errors when storage cannot save. | Avoid committing personal data, inadvertent deletions and misleading persistence claims. |
| DEC-033 | Open testing checkpoint | Confirm GitHub Actions build, live publication and profile CRUD on phone/desktop. | A successful commit is not equivalent to complete user acceptance testing. |

**Privacy and safety:** Dinner Engine remains a public static website. Browser-local profiles are not committed to GitHub, but this is not a secure healthcare-data storage mechanism. Use fictional entries for testing. Never infer allergy safety from an empty avoids list. Real multi-household data requires authenticated backend isolation in a later phase.

## Milestone 1C mobile UX follow-up — October 21, 2026

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-034 | Approved and implemented; device retest pending | Edit a profile inline within its own card instead of reusing the Add form at the top of the page. Keep Save and Cancel in the card. | Eliminates unnecessary scrolling on iPhone, keeps interaction in context and separates creating from editing. |
| DEC-035 | Approved and implemented | Preserve the existing `localStorage` schema, profile IDs and delete confirmation while changing only the presentation of editing. | Avoids migration or data loss and contains this iteration to mobile UX polish. |

The product owner confirmed Milestone 1C's original CRUD interactions functioned before requesting this refinement. Recheck inline editing and deployment; those are independent verification steps.

## Milestone 1C.2 — October 21, 2026

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-036 | Approved and implemented | Profiles offer exactly Vegetarian, Vegan and Gluten-free checkboxes under Dietary needs and eating patterns; no reason or diagnosis field. | Meets user-requested simplicity. A checkbox is not food-safety certification. |
| DEC-037 | Approved and implemented | Store each food as a separate entry with Must avoid / Should avoid / Prefer to avoid. Avoid reasons are not captured. | Supports future rule-based matching and softer ranking without forcing users to explain the restriction. |
| DEC-038 | Approved and implemented | Preserve original profile IDs and browser storage key; read legacy version-1 `foodAvoids` as Must avoid, then write payload version 2 on the next successful user save. | Conservative migration; no unnecessary rewrite on page load. Existing avoids are never silently softened. |
| DEC-039 | Future, not authorized | Implement household matching that distinguishes a person's plate from the original recipe and supports cook-reviewed separate toppings/sides. | Must avoid is a strict requirement for the affected eater, but not automatic household-recipe rejection; never imply AI/allergy certification. |
| DEC-040 | Verification pending | Confirm production build, GitHub Pages deploy and mobile CRUD/migration regression checks. | Builds do not replace user testing of existing browser data. |

The public repo contains only implementation and generic requirements, never real profile values. This milestone does not add recipe matching, AI or a backend.

## Milestone 1D — Find Dinner decisions (October 21, 2026)

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-041 | Approved and implemented | Replace the Find Dinner preview with working ingredient inputs, time options and whole-household or individual profile selection. | Makes the primary app workflow functional without an AI service. |
| DEC-042 | Approved and implemented | Create a separate curated ingredient/dietary index for ten fictional demo recipes. Preserve original recipe ingredients and instructions. | More explainable and reliable than raw substring matching, without implying a complete medical/allergen database. |
| DEC-043 | Approved and implemented | Apply per-selected-diner rules: Must avoid matches and dietary conflicts go to Needs adjustment/review; Should/Prefer lower ranking. | Strict restrictions cannot be traded away by ranking, yet household adaptations can be considered by a knowledgeable cook. |
| DEC-044 | Approved and implemented | Show up to three explained results, preferring straightforward suggestions with space for a review alternative. Explicitly unavailable items and over-budget recipes require review. | Makes trade-offs visible; does not assert recipes are safe or ready without assessment. |
| DEC-045 | Approved and implemented | Preserve draft and last-submitted search state in per-tab sessionStorage and navigate back from recipe details to Find Dinner. | Supports low-friction recipe browsing without a database. |
| DEC-046 | Verification pending | Validate final build/deploy and run mobile scenario-based testing of profile-specific hard constraints, synonyms, and navigation. | Automated build is not proof of nutritional accuracy or on-device UX quality. |

**Safety and scope:** This is a transparent ten-recipe demo matcher, not allergy-safe recipe certification. Free-text ingredient matching can miss composite, hidden or ambiguous ingredients; advise manual checks of products and cross-contact. The algorithm does not create AI substitutions, enforce real-world food safety or infer that a separate topping is safe.

## Milestone 1D.1 — Mobile UX polish (October 21, 2026)

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-047 | Approved and implemented | Use “Find Dinner” as the displayed app name, browser title and visible app copy; keep the Dinner-Engine repository name and GitHub Pages URL. | Friendly, focused branding without breaking hosting or links. |
| DEC-048 | Approved and implemented | Use the intro copy “Share what's in your kitchen, how much time you have, and who's eating.” | Makes the experience conversational and inviting. |
| DEC-049 | Approved and implemented | Continue to show the original first three recommendations, with optional expansion to up to ten and a collapse control. | Preserves matching order and safety flags while improving discovery. |
| DEC-050 | Approved and implemented | Reset the content-scroll container when navigating between routes, ensuring Recipe Details opens at the top. | Addresses a real iPhone navigation defect caused by inherited scroll position. |
| DEC-051 | Approved and implemented | Put bottom navigation in its own non-overlapping flex layout region, with a scrollable main region and iPhone safe-area margin. | Prevents content being hidden behind navigation without relying on guessed padding. |
| DEC-052 | Approved and implemented | Change the Profiles heading to “Who's eating dinner today?” | Requested copy improvement without altering profiles. |
| DEC-053 | Deployment and mobile regression verification pending | Verify build/deployment, long-page scroll endpoints, top-of-recipe navigation, result expansion/collapse, and state retention on iPhone. | Build success alone does not prove in-device scrolling or ergonomics. |

No ingredient/dietary rule, recipe, household data, or AI changes were authorized by this milestone.

## Milestone 1D.2 — Bottom navigation visual polish (October 21, 2026)

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-054 | Approved and implemented | Place the existing three-tab navigation in a full-width white footer with a fine top border, no floating card border or outer corner radius, and reduced shadow. Keep the selected tab rounded. | Avoids the awkward cream wedges and competing rounded cards reported in real iPhone testing, while retaining clear navigation. |
| DEC-055 | Pending device check | Preserve the 1D.1 dedicated footer space and content scrolling, including iOS safe-area coverage. | A visual refinement must not reintroduce overlapping navigation or clipped controls. |

This approval covers visual/layout polish only; no matching, recipe, profile, storage, or AI changes.

## Milestone 1D.3 — Header branding and UX checkpoint (October 21, 2026)

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-056 | Approved and implemented | Use “Find dinner.” with a trailing period in the visual header; keep the existing GitHub URL and browser title. | Friendlier personality without infrastructure renaming. |
| DEC-057 | Approved and implemented | Replace the starburst with a compact, sage-colored steaming-bowl SVG icon on sage-soft background. Align header width with the page content column. | Matches the established palette and aligns the brand with the primary content, without adding icon dependencies. |
| DEC-058 | Review complete; mobile acceptance pending | Perform a scoped static UX checklist for navigation, route scroll, results expansion and profile inputs, without unrelated rewrites. | Preserve core workflow while ensuring small polish does not overshadow the next functional increment. |

No changes to matching, profile storage, recipe content, AI, backend or public repository identifier.

## Milestone 2A — Paprika import (October 21, 2026)

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-059 | Approved and implemented | Read Paprika bulk `.paprikarecipes` exports in the browser, with ZIP members containing GZIP-compressed JSON. | Officially documented portable, machine-readable Paprika export; no server or account integration required. |
| DEC-060 | Approved and implemented | Preview all readable titles, require explicit checkbox selection of up to 25 per save; expose duplicates and import warnings. | Prevents unintentional bulk writes and makes each import reviewable. |
| DEC-061 | Approved and implemented | Store text-oriented Paprika records in browser IndexedDB, with Paprika UID-based duplicate prevention. Keep sample cookbook and profile storage untouched. | Enables local recipe browsing without public repo leakage, but provides no backup or sync. |
| DEC-062 | Approved and implemented | Preserve original text, timing as strings and metadata without invented durations; do not persist photo payloads. | Maintains source fidelity for displayed cooking information and limits browser storage needs. |
| DEC-063 | Explicitly deferred | Imported recipes are NOT eligible for Find Dinner matching until separate metadata/risk review. | Avoids unsafe or misleading results from unclassified imported ingredients. |
| DEC-064 | Verification pending | Check final GitHub build/deploy and real iPhone testing with a representative Paprika export. | A compiling importer is not proof of compatibility with every export or iOS storage state. |

**Privacy:** The app is still a publicly hosted static page. Browser-local IndexedDB is neither authenticated nor encrypted. Importing real household data should be an informed user choice; initial testing should use non-sensitive recipes. Never send Paprika exports to GitHub, a logging endpoint, or an AI service.

## Milestone 2B — Imported recipe matching (October 21, 2026)

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-065 | Approved and implemented | Read the existing browser-local IndexedDB cookbook when Find Dinner mounts; do not copy or rewrite imported recipe data. | Makes recipes from Milestone 2A available without re-importing or adding a server. |
| DEC-066 | Approved and implemented | Rank My Recipe candidates ahead of demo samples; keep the first-three and expandable up-to-ten search experience. | Prioritizes the recipes the household actually cooks, with visible source labels. |
| DEC-067 | Approved and implemented | Screen original ingredient lines with basic normalized whole-phrase and singular/plural text matching; treat all imported recipes as review-needed. | Offers immediately useful pantry matching without incorrectly asserting dietary safety from missing text. |
| DEC-068 | Approved and implemented | Display known original duration text and compare time only when total or both prep+cook durations parse unambiguously. | Avoids inventing time estimates or silently excluding recipes with unknown duration. |
| DEC-069 | Approved and implemented | Surface possible Must avoid ingredient hits and selected dietary needs for manual review; rank hard hits down within the imported group, never into straightforward/safe. | Preserves per-person warnings; no claim of recipe or portion safety, hidden ingredient detection or cross-contact clearance. |
| DEC-070 | Approved and implemented | Keep demo rules unchanged, add My Recipe/Sample Recipe labels, preserve per-tab search state, and display an error if imported browser storage fails to load. | Protects earlier behavior and makes local-data availability explicit. |
| DEC-071 | Automated checks implemented; mobile acceptance pending | Test with synthetic fixtures for mixed source ranking, review status, unknown times, hard/soft restrictions and preservation of originals; separately verify with real device. | Passing CI is not proof of end-to-end compatibility or food safety. |

**History:** DEC-063's 2A deferment of imported matching is superseded by DEC-065–070. Better ingredient verification and safe adaptations still require separately approved work.

**Security boundary:** IndexedDB remains local to each browser and origin, without encrypted accounts or backup. Actual household recipe text/profile data must not enter the public repository.

## Milestone 3A.0 — Secure AI foundation (approved October 21, 2026)

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-072 | Approved | Begin AI work with OpenAI as the initial provider; choose a lower-cost model after fictional tests, keeping the integration swappable. | Focus on recipe recommendations rather than multi-provider overhead. |
| DEC-073 | Approved direction, not deployed | Plan Cloudflare Worker server-side API access; never place model keys in public GitHub Pages frontend or repo. | An API key is a billable secret and client code is inspectable. |
| DEC-074 | Security gate | Protect the whole Worker with Cloudflare Access and enforce a one-user allowlist using verified `ctx.access` (or independently validated JWT if needed); prove login works on Safari. | Browser Origin checks or unchecked access headers are not authentication. |
| DEC-075 | Security gate | Persist atomic server-side budget and rate reservations, bound input/output, add off-switch and fail-closed handling, use provider notifications too. | Avoid an anonymously billable endpoint and unexpected spending. |
| DEC-076 | Approved | AI may transmit minimal relevant recipe content only when user explicitly invokes it, with a clear preview; originals stay in browser and deterministic matcher remains fallback. | Support AI value without silent recipe transfer or changes to source recipes. |
| DEC-077 | Staged, not activated | Commit only a nonbillable disabled backend entrypoint and CI smoke test pending the separate protected backend/activation review. | Work can begin without credentials or expenditure. |

The prior future-AI security gate remains mandatory. See docs/AI_PILOT_PLAN.md.

**3A account setup (October 21, 2026 Pacific):** Owner confirms OpenAI API project `dinner-engine` and Cloudflare account created. Neither connected; next: Cloudflare Zero Trust onboarding and OpenAI budget alerts. Worker-level Access with verified `ctx.access` is the preferred current authentication design.

## Milestone 3A.1 preparation — October 21, 2026 Pacific

| ID | Status | Decision | Rationale |
|---|---|---|---|
| DEC-078 | Approved, code staged, deployment pending | Use Cloudflare Worker-level verified `ctx.access` identity **and** an exact owner-email Worker secret for an independent fail-closed authorization check. | Missing or incorrect Access configuration must not allow personal data or billable calls. |
| DEC-079 | Approved, deployment pending | Apply account-wide **All traffic** Access protection before connecting automatic GitHub deployments; protect both production and previews. | Git integration may deploy immediately; avoid an accidental publicly accessible Worker. |
| DEC-080 | Approved testing preference, activation pending | Owner permits using their own imported Paprika recipes for the AI-quality pilot after login, durable quotas, explicit user-trigger and privacy/billing gates pass. Synthetic security tests still come first. | Test relevance with actual cookbook while preserving user consent and data minimization. |
| DEC-081 | Source prepared, not connected | Worker named `dinner-engine-ai` configured under `backend/`; normal GitHub Pages workflow still publishes only existing frontend. | Avoid moving original app or creating a billable endpoint during authentication setup. |

**External accounts:** OpenAI project `dinner-engine` and Cloudflare Zero Trust ready per owner. No Worker deployment, keys, personal data transfer or incurred AI usage has been claimed.

## Milestone 3A.1 auth diagnostic increment (October 21, 2026 Pacific)

| ID | Status | Decision | Rationale |
|---|---|---|---|
| DEC-082 | Approved, temporary | Return fixed, non-identifying 403 diagnostic codes **only** for `GET /api/ai/health`; never bypass auth or reveal identity, email or secret values. | Disambiguate missing Access context, missing allowlist, failed identity lookup, absent email, or mismatched identity after real Safari denial. |
| DEC-083 | Approved tests | Verify each failure code and keep every rejected request unread (body not parsed), with all other endpoints returning generic denial. Retain paid endpoint's 503 disablement. | Isolate the root cause without creating a privacy, authentication or cost regression. |

**Remove temporary health diagnostics once owner-only Safari auth succeeds; require independent CI, Cloudflare deployment and device verification.**

## Milestone 3A.1 — owner authentication acceptance (October 21, 2026 Pacific)

| ID | Status | Decision | Rationale |
|---|---|---|---|
| DEC-084 | Owner phone check passed | Correct the allowlist secret by using Cloudflare **Production runtime** Variables and Secrets instead of Build variables; verify the Worker returns `enabled:false` after Access/allowlist checks. | The `allowlist_missing` failure was a deployment configuration issue rather than an email-capitalization or identity-matching bug. |
| DEC-085 | Approved diagnostic cleanup; CI/Cloudflare verification tracked separately | Remove temporary HTTP 403 diagnostic codes once a working iPhone authentication is observed; restore generic denied responses and tests. | Avoid leaving unnecessary details exposed in a production authorization response. |

An authorized health request is not full security acceptance: still test Private Safari reauthentication and Cloudflare's production deployment of the cleanup. AI API billing remains disabled.

## Milestone 3A.1 private-session device acceptance (October 21, 2026 Pacific)

| ID | Status | Decision / finding | Rationale |
|---|---|---|---|
| DEC-086 | iPhone acceptance passed | A fresh Safari Private tab challenged the owner to sign in when accessing the protected Worker; ordinary Safari had already returned `enabled:false` for the approved identity. | Confirms that a new browser session doesn't receive the owner-authenticated health result without signing in. Not a comprehensive external-identity security test. |
| DEC-087 | Proposed for next approval, not yet implemented | Prepare strictly validated, nonbillable API request envelopes, atomic durable rate/estimated-cost reservations and a kill switch before introducing an OpenAI secret. | Avoid billable exposure and preserve the currently working recipe experience while testing security controls. |

**Remaining gate:** verify Cloudflare deployed the latest generic-denial cleanup, test off-switch/limits under concurrency, and explicitly approve billable API activation before sharing real recipe data.

## Milestone 3A.2 — Approved nonbillable safeguards (October 21, 2026 Pacific)

| ID | Status | Decision | Rationale |
|---|---|---|---|
| DEC-088 | Implemented | Leave OpenAI disconnected and `/api/ai/recommend` permanently disabled in this stage. | No accidental provider charges or recipe transmission. |
| DEC-089 | Implemented | Enforce versioned, exact-field JSON with 12 KiB streaming cap and at most five bounded recipes. | Reject oversized or malformed inputs before any quota reservation. |
| DEC-090 | Implemented | Use one SQLite-backed Durable Object to atomically persist per-hour/day/month quotas and simulated budget. | Prevent concurrent requests or new sessions bypassing shared limits. |
| DEC-091 | Implemented as simulations only | Reserve 10 placeholder cents per accepted guardrail test, with 10/hour, 40/day, 100/month and simulated $10 monthly limit. | A synthetic reservation is not a guaranteed cap on future billable API usage. |
| DEC-092 | Implemented; off by default | Accept test-only requests only when Production runtime `AI_GUARDRAIL_MODE=test`. | Simple emergency off-switch; missing flag rejects before reading a body. |
| DEC-093 | CI passed; device verification pending | Run adversarial/concurrent/persistent quota tests and Wrangler Worker dry-run in addition to existing Pages tests. | Backend bundling, Cloudflare deployment and phone acceptance remain independently checked. |

**No paid activation approved.** Real cost estimation/reconciliation, safety/retention review, opt-in AI UI and a model key need a later explicitly approved milestone.

## 3B.1 staged implementation decisions (October 22, 2026 Pacific)

| ID | Status | Decision | Rationale |
|---|---|---|---|
| DEC-094 | Implemented, nonbillable | Prepare a pure `gpt-6-luna` prompt builder and strict response validator; never call OpenAI in this phase. | Enables synthetic contract testing without secrets or paid calls. |
| DEC-095 | Implemented, disabled UI | Show an explicitly unavailable AI action next to local recommendations; do not transmit recipes or modify matching. | Make future opt-in discoverable without misleading users or sharing data. |
| DEC-096 | Design only, **not enforced for paid use** | Target $5/month, 8,000 input and 700 output tokens and 1,500 micro-USD conservative reservation per future call. | Provider token usage reconciliation and real budget enforcement must be implemented before activation. |
| DEC-097 | Outstanding 3B.1 work | Add actual disabled provider transport, durable real-cost reservation/reconciliation, authenticated browser session and CORS policy, and final privacy/security tests before 3B.2 activation. | Avoid claiming that prepared constants or a disabled UI are a working AI integration. |

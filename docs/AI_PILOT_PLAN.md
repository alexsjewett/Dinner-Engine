# Milestone 3A — One-user secure AI pilot

**Status:** Product direction and the stage 3A.0 repository-only implementation were approved October 21, 2026 (Pacific). No billable AI endpoint is configured, deployed or available to the public. Backend prototype is intentionally disabled. Household data and all existing deterministic Find Dinner functionality remain unchanged.

## User value and boundaries

The future "Ask AI for dinner ideas" action will let the primary user optionally ask an AI model to interpret a small set of locally saved Paprika recipes and explain recommendations. Users can compare results to the already useful deterministic matcher, which stays available as a fallback. Original recipe records are never rewritten.

Out of scope: AI substitutions, separate portions, AI calls automatically on every search, cloud recipe storage or sync, household subscriptions, accounts for multiple users, public/anonymous AI usage, and automated allergy or gluten safety certification.

## Architecture

Existing: React / TypeScript static website hosted on GitHub Pages, with locally stored imported Paprika recipes and household profiles.

Proposed: User explicitly invokes AI -> verify one-user sign-in -> Worker validates input and durable usage budget -> Worker submits limited recipe and search data to OpenAI using a server-side secret -> Worker validates and returns structured recommendation explanations. The browser must not hold the OpenAI secret or submit raw credentials.

OpenAI is the initial provider. Select a currently available lower-cost model after fictional recipe quality tests; keep it configurable on the server, not in browser input. No need to support other AI services from day one.

Cloudflare Worker is the proposed backend, with Cloudflare Access allowing exactly one approved identity. Its newer Worker-level Access integration exposes a Cloudflare-verified `ctx.access` identity. The Worker must reject missing Access context and restrict the verified identity to an approved one-user allowlist. When the platform-verified context is unavailable, an alternative implementation must cryptographically verify the Access JWT; never trust unchecked headers. Cloudflare Worker secrets hold the API key. Keep secrets out of the public repository, frontend bundles, client-side storage, GitHub Actions logs and this chat.

**Mobile domain issue:** the static frontend is on github.io; an Access-protected Worker is likely on another domain. Safari may restrict cross-origin sign-in cookies. Explicitly test the actual authentication flow on iPhone. If necessary, migrate a tested copy of the UI to a same-origin custom domain or use a genuinely secure, short-lived bearer sign-in design. Never solve Safari cookie problems by opening an anonymous endpoint.

## Hard gates before paid provider requests

1. Require Cloudflare Worker-level Access and check its platform-verified `ctx.access` identity against the one-user allowlist in the Worker. If this integration is unavailable, cryptographically verify JWT issuer/audience/expiry/signature. Test blocked anonymous, wrong-user, tampered-header and missing-Access requests.
2. Implement a small versioned input schema and maximum request bytes, number of candidate recipes, duration and output tokens. Do not allow client-selected models or arbitrary provider requests.
3. Implement atomic server-side, persisted quota reservations and reconciliation, with an off-switch and failure-closed behavior. Cloudflare Durable Objects with strongly consistent storage is a candidate. In-memory or local browser rate limits are insufficient. Use a provisional monthly spending target of **$10** and explicit per-request caps; this target is not a guarantee of a mathematically exact billing ceiling.
4. Set OpenAI project budget notifications and evaluate account-level hard usage controls where available. Project alerts alone are not spending caps.
5. Log only non-sensitive operational status and estimated cost. Never log raw recipe contents, saved diner constraints, prompt bodies or secrets.
6. Use bounded AI output, strict JSON schema validation, timeout and error fallback to the current deterministic matcher. Never treat a model response as a safety guarantee.
7. Document model provider data handling, retention and available store/retention options before sending genuine household data. Do not equate an API option with zero provider retention.
8. Explicit user opt-in for each AI action and short, understandable information about the categories of recipe/search/constraint data being sent. Minimize names and personal profile details.
9. Check live AI quality with synthetic, fictional recipes first. Obtain a **separate security and billing activation check** before transmitting real household recipes.
10. Keep the public GitHub Pages app usable during outages or when AI is shut off. Preserve a rollback switch.

## Delivery checkpoints

**3A.0 — Approved and staged now:**
- [x] OpenAI-first one-user architecture, security design and owner setup guidance
- [x] Nonbillable, disabled-by-default Worker scaffold; no OpenAI SDK or deployment config
- [x] CI test proving /api/ai/recommend responds 503 without reading request body
- [x] Owner reports OpenAI API project `dinner-engine` created and Cloudflare account ready (October 21, 2026 Pacific; not verified through a connection).
- [ ] Owner completes Cloudflare Zero Trust setup and OpenAI API project budget notifications.

**3A.1 — Protected backend, separate review before active billing:**
- [ ] Configure an Access-protected Worker on a tested domain / route
- [ ] Deny requests without verified `ctx.access` and allow only the approved user (or fully verify JWT if needed)
- [ ] Durable quotas, request validation, response schema, provider timeout, kill switch, logging minimization
- [ ] Anonymous and concurrency/adversarial security tests; real Safari sign-in check
- [ ] Owner places API project key directly into Worker secret storage, never in chat
- [ ] Test one fictional request with owner-controlled spending; review gate before personal data

**3A.2 — User-triggered AI comparisons:**
- [ ] Show what will be sent and obtain deliberate user action each time
- [ ] Generate AI explanations for a short candidate list, with original recipes untouched
- [ ] Side-by-side test against current recommendations; record quality/cost/latency
- [ ] Keep baseline fallback; approve expansion to substitutions separately

## Owner setup progress and next steps — no secrets in chat

**Accounts reported ready October 21, 2026 Pacific:** OpenAI API project
`dinner-engine` and Cloudflare account. The OpenAI project name does not need
to match the visible app name "Find dinner." Neither account is connected to
the deployed app and no model key or provider calls exist yet.

1. In https://dash.cloudflare.com/ open **Zero Trust**. If onboarding appears,
   select a team name (e.g. `dinner-engine` if available), choose the Zero
   Trust Free plan, finish the setup, and enable account 2FA. Cloudflare may
   request a payment method for the Free tier; enter it only on Cloudflare.
2. In https://platform.openai.com/ choose the `dinner-engine` project and
   open **Limits**. Configure a $10/month *soft budget* and notifications
   (e.g. 50% and 100%). Project budgets send alerts but do not stop spending.
   Our future Worker enforces rate/cost quotas separately.
3. Report only whether Zero Trust onboarding is complete or which
   non-sensitive screen appears. Do not share keys, emails, account IDs,
   login links with tokens, payment details or passwords.

**Next engineering step:** create and protect a disabled Worker with
Worker-level Cloudflare Access and one-user authorization, then verify
login in iPhone Safari. Do not configure a billable OpenAI key or connect
the public GitHub Pages app until authentication and durable quotas
pass the security checkpoint.

## Sources

- OpenAI API key safety: https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
- OpenAI project budget information: https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Protect Workers with Access: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- Signed Access token verification: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Durable Object transactional storage: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/


## 3A.1 checkpoint — Zero Trust ready; protected Worker source prepared

**Owner reported October 21, 2026 Pacific:** Cloudflare Zero Trust onboarding
is complete. The owner explicitly approved using their locally imported
Paprika recipes in AI quality tests once the security and spending gates
have been verified. Data is still browser-local; no automatic upload or
provider calls have occurred. Test the synthetic fixtures for authentication,
limit enforcement and error handling first; the first *quality* test may use
the approved Paprika recipes via a deliberate user action.

**Repository implementation status:**
- Added `backend/wrangler.json` specifying Worker `dinner-engine-ai`;
  it is deployable from the `backend` root but NOT connected/deployed yet.
- Worker returns HTTP 403 if Cloudflare-verified `ctx.access` is missing
  or if the Access identity does not match the exact server-side
  `ALLOWED_EMAIL` secret. Only a matching identity sees a disabled
  status (GET health) or HTTP 503 (POST recommendations).
- Synthetic CI checks authentication failure modes and verify request bodies
  are never consumed; no provider SDK or secret is present.
- **Before importing the GitHub repository into Cloudflare, activate
  Workers & Pages > Protect all Workers > All traffic with an appropriate
  owner-only policy.** This covers Worker production and preview URLs even
  when Cloudflare's Git integration deploys immediately.
- Then connect the GitHub project `alexsjewett/Dinner-Engine` as a
  Worker, root `backend`, name `dinner-engine-ai`, deploy
  `npx wrangler deploy`. Configure `ALLOWED_EMAIL` as a secret
  directly in Cloudflare. Test authenticated and unauthenticated access
  from iPhone Safari; never paste the identity or a token into chat.
- Cloudflare account ownership or email-domain match alone is not a
  substitute for the code's exact-email check. Do not choose Everyone,
  Bypass or a Previews-only policy.

**Not yet complete:** actual Worker deployment or on-device Access test,
any spend reservations/quota logic, OpenAI key or model connection,
GitHub Pages-to-Worker sign-in flow, or transmission of real recipes.
The next security milestone remains mandatory before enabling paid calls.

Documentation: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
and https://developers.cloudflare.com/workers/ci-cd/builds/.

## 3A.1 on-device auth debugging (October 21, 2026 Pacific)

**Actual device feedback:** Worker `dinner-engine-ai` deployed successfully
from the `backend` root with global All Workers Access protecting production
and previews. Owner added Production `ALLOWED_EMAIL` secret. The Safari
`/api/ai/health` request returned `403 access_denied`; the Access policy
was confirmed active. Owner checked casing differences and they did not fix
it (code compares lowercased emails).

**Approved limited diagnostic increment:** add *temporary*, non-identifying
failure codes on the authenticated health route's 403 response. Do not relax
Access, share identifying email values, log recipe data, read request bodies,
or activate OpenAI. Tests cover every diagnostic reason, forged headers,
missing identity, case-insensitive comparison and disabled paid endpoint.

**Acceptance:** After GitHub CI and Cloudflare Git auto-deploy are independently
confirmed, owner reloads Worker `/api/ai/health` in Safari and shares **only**
the returned `diagnostic` code. Determine precise next fix from that code;
after a successful owner-only request, remove temporary diagnostics and
repeat a fresh-Private-tab access test.

**Still blocked:** any OpenAI model calls, key setup, cost risk, real recipe
transmission or cross-origin frontend calls. Existing GitHub Pages recipe
matching remains available.

## 3A.1 user device acceptance and diagnostic cleanup (October 21, 2026 Pacific)

**Verified by owner on iPhone Safari:** after configuring `ALLOWED_EMAIL`
under Production Worker's **runtime** Variables and Secrets (rather than
Build variables), GET `/api/ai/health` returned `enabled:false`.
This confirms the Worker completed its verified Cloudflare Access identity
check and matched the runtime allowlist secret. No AI provider call or billing
was possible; the model endpoint remains deliberately disabled.

The temporary health-route failure diagnostic has been removed from source
and regression tests updated to require generic HTTP 403 JSON across all
unauthorized endpoints. **Verification pending:** the cleanup commit's
Cloudflare production deployment, and separate denial/sign-in requirements
in an iPhone Safari Private tab. Marked owner-only positive auth verified,
not full security sign-off.

**Next engineering gate (not yet active):** persistent atomic usage and cost
reservation, strict input/output schemas, budget kill switch, identity
session validation, provider retention review, and security tests before
configuring an OpenAI key or allowing actual Paprika uploads.

## 3A.1 — Private Safari authentication acceptance (October 21, 2026 Pacific)

**Owner confirmed on iPhone:** opening the Worker URL in a fresh Safari Private
session required signing in. The earlier normal Safari request returned
`{"service":"find-dinner-ai","enabled":false}` after the Production runtime
`ALLOWED_EMAIL` secret was corrected. Together these constitute acceptance
of the **positive owner-authentication and new-private-session challenge**
checks. This is not a full penetration test or proof that the generic-403
cleanup has deployed to Cloudflare; confirm that separately. Never place
the owner's email, tokens or private recipe records in this public document.

**Next small increment for separate approval — 3A.2, nonbillable guardrails:**
Implement versioned, bounded request schema validation; one-user, atomic,
durable rate/estimated-spend reservations via Cloudflare Durable Objects or
another verified strongly consistent store; a server-side disable switch;
generic error handling; and concurrency/malformed-input tests. Keep the
OpenAI provider completely disconnected, return a disabled response to
authorized AI requests, and leave the existing website untouched. No
OpenAI API key or imported recipe transmission until a later explicit
activation review. Exact budget limits and API behaviors need product-owner
approval before modifying application code.

## Milestone 3A.2 — Nonbillable guardrails implementation (October 21, 2026 Pacific)

**Approved and implemented in source.** Authentication remains the first gate. The GET health check still returns `enabled:false`. The POST recommendation route is hard-disabled (503) and never reads recipes or invokes OpenAI.

A separate POST `/api/ai/guardrails` is a **developer test-only** route requiring owner authentication and Production runtime secret `AI_GUARDRAIL_MODE=test`; the missing/default setting is an off-switch. It applies bounded, strict version-1 JSON validation (12,288-byte streaming cap, up to five recipes, controlled criteria) and an atomic reservation in one SQLite-backed Durable Object. Quotas: 10/hour, 40/day, 100/month, plus a **synthetic** 10-cent reservation per test against a **synthetic** $10 monthly allowance. Persistent counters are non-identifying. Missing ledger, storage errors, invalid input and disabled test flag all fail closed. OpenAI is not connected. No actual expense is tracked or guaranteed by these placeholders.

Tests cover wrong/absent identity, email case, forged request headers, off-switch, invalid and oversized payloads, unsupported content types, unknown schema fields, missing Durable Object binding, atomic concurrent reservations, persistence and corrupted counters. GitHub CI now tests the Worker with a Wrangler dry-run as well as the existing app.

**Still required:** confirm Cloudflare's latest successful build and live Worker health response; verify a clean Safari Private session still triggers sign-in. The test-only flag should remain absent/off unless a separate synthetic request exercise is planned. Do not enter an OpenAI API key or send Paprika data yet. Model-specific usage reservations, real provider spend reconciliation, maximum tokens, output validation, opt-in data sharing and a separate billable security review remain prerequisites.

## 3B.1 staged adapter and preview (October 22, 2026 Pacific)

Owner approved building the OpenAI integration and optional AI experience, with **all paid calls disabled until separate 3B.2 approval**. This commit deliberately stages only the safe, nonbillable portion: a pure TypeScript request builder and response validator in `backend/src/aiPilot.ts`, and a clearly disabled preview button on Find dinner. No browser network request, backend OpenAI fetch, credential, or cookbook upload is possible. The existing matcher and Paprika originals remain untouched.

Model proposed: `gpt-6-luna` (subject to the owner's OpenAI project availability); published Standard short-context input/output prices used for preflight math are $0.10/$0.50 per million tokens, verified from OpenAI documentation on October 22. Planned limits: 8,000 input tokens and 700 output tokens, with a rounded-up 1,500 micro-USD ($0.0015) preflight reservation and $5/month target. These constants are **not wired into a billable endpoint**, and the prior Durable Object still enforces only simulated 3A.2 quotas. Tokenization, actual model request/response accounting, provider errors, reservation reconciliation, cancellation behavior, and hard spending protection are **not yet implemented**. Do not describe the $5 target as enforced against OpenAI.

The staged adapter accepts only existing strict version-1 candidate payloads; strips recipe directions; requests rankings only among allowed IDs; rejects invented IDs, duplicate IDs, unexpected response fields and oversized explanations. The UI's disabled button clearly says no recipes are sent. AI cannot override existing safety restrictions. Before 3B.2, complete the actual provider transport behind a hard server-side kill switch, robust cost reservation/reconciliation, session/CORS design, privacy review and fully synthetic tests, then obtain separate paid activation approval.

### 3B.1 monetary reservation follow-up (October 22, 2026 Pacific)

Added `backend/src/paidBudget.ts` with a pure, synchronous fail-closed $5/month reservation function, 10/hour, 40/day, 100/month, and 1,500 micro-USD/request ceiling. Synthetic tests exercise concurrent calls, monthly exhaustion and corrupt state. **This module is not yet wired into the Durable Object or any provider call**; therefore it does not enforce a real budget. Remaining 3B.1 work: authenticate the opt-in browser transport, integrate a real provider call behind a default-off flag, connect persistent idempotent reservations, reconcile verified usage, handle timeouts conservatively, and verify all security gates before separately approving 3B.2. No keys or billable calls were introduced.

### 3B.1 idempotent accounting prototype (October 22, 2026 Pacific)

`backend/src/paidBudget.ts` now also exposes `reserveRequest` and `settleRequest`: server-generated opaque request IDs, atomic one-time reservation, duplicate rejection, verified settlement and a permanent reservation for unknown provider outcomes. Synthetic tests cover retry idempotency, duplicate settlement, over-reservation rejection, concurrent hourly limits and persistent counters. This remains a **prototype**: these lifecycle functions are not yet invoked by the production Worker or Durable Object endpoint, and actual OpenAI billing is disabled. Production integration requires unique IDs generated inside the Worker, durable settlement invocation, verified token usage, and a reconciliation strategy for disputed/over-limit provider costs. No real-dollar cap is claimed until that is complete.

### 3B.1 eligibility trust boundary

The matcher currently labels all imported Paprika recipes `review` because their dietary safety is not verified. For the initial AI pilot, the prepared eligibility gate permits only `straightforward` suggestions without review reasons or soft warnings. **A browser-supplied eligibility flag is not trustworthy.** Before model calls are activated, the Worker needs a trusted server-side source for eligibility (for example, a versioned server-owned sample catalog) or a defensible signed shortlist; otherwise the Worker must fail closed. Do not send imported recipes or household profiles to OpenAI by default. The pure gate is staged but not yet wired into the Worker.

### Paprika permission update (October 22, 2026)

The owner explicitly permits the full imported Paprika file to be shared with AI when the feature is activated. The staged client preview remains local and the live Worker still rejects recommendation calls. This permission changes the data-sharing scope but **does not authorize billable provider activation (3B.2)**. Before activation, display clear per-request consent about the full library, protect household dietary restrictions, enforce a verified server-side monetary ceiling and require the separate activation approval. Do not imply that the local preview already sends data.

### 3B.1 full Paprika contract and local preflight (October 22, 2026)

The owner's latest instruction permits the entire imported Paprika library to be shared with AI at activation. This supersedes the earlier sample-only assumption, but **does not enable actual requests or 3B.2 billing**. An offline-only version-2 schema accepts all fields currently retained by the browser importer for each recipe (not the original binary archive), requires a declared full-library scope and per-action consent marker, rejects unknown or missing fields, duplicate IDs, anonymous profile objects, oversized fields and request bodies, and is bounded at 40 recipes / 96 KiB of UTF-8 JSON. An oversized library must be rejected or explicitly handled in a separately approved scope change: NEVER silently truncate a user-approved "full library" request.

The local client builds an exact schema-checked draft with full ingredient, direction and note text, while representing each selected diner's MUST / SHOULD / PREFER avoidances and dietary needs anonymously. No diner name, profile ID or household ID is included. The UI allows a local-only acknowledgement and displays the actual serialized size or an explicit rejection reason; the on-screen AI action remains disabled. Passing this transport envelope check is **not** confirmation that the material fits the model's token context, is safe for an individual diner, meets provider retention requirements, or stays within a provider cost bound.

Imported recipes continue to be marked for manual dietary review. Text matching does not establish safety. Before 3B.2 the Worker must independently enforce authentication, eligibility, trusted dietary restrictions, actual input-token checks, validated output, rate/cost controls, privacy/retention review and provider fallback. The version-2 validator is intentionally not wired into the disabled /api/ai/recommend route; no recipes are read or forwarded there.

### 3B.1 offline OpenAI Responses adapter (October 22, 2026)

A separate, non-executing `backend/src/paprikaModelDraft.ts` now builds a locked-down OpenAI Responses API request shape: `gpt-6-luna`, `store:false`, no tool choice, fixed 700 output-token limit, strict JSON-schema output and a developer instruction to treat recipe text as untrusted. It retains **all** full-library recipe text rather than silently dropping imported recipes; obviously matching MUST-avoid ingredients are excluded from the *allowed recommendation IDs* using limited text matching, which is never evidence of safety. Returned IDs, text shape, tokens and costs require strict validation; every accepted suggestion is marked as requiring manual ingredient/label/cross-contact review.

This model adapter **is not imported by the deployed Worker** and does not call OpenAI. A 7,200-UTF-8-byte model-input staging cap is intentionally stricter than the 96-KiB transport contract. Libraries exceeding that draft cap currently fail closed: before 3B.2 either design and approve a bounded multi-batch full-library strategy or obtain explicit consent for a reduced scope. The byte bound is not a substitute for true model tokenization and provider usage accounting; a trusted input-token check is a mandatory activation gate. A declared `store:false` is not a guarantee of zero provider retention.

Pricing consulted on October 22, 2026: https://developers.openai.com/api/docs/pricing and Responses contract: https://developers.openai.com/api/reference/resources/responses/methods/create and strict output guidance: https://developers.openai.com/api/docs/guides/structured-outputs . No claim of guaranteed spending limits or user data safety is made until actual preflight, provider-side receipts and outage cases are verified.

### 3B.1 injectable provider transport (offline test only)

`backend/src/openAiTransport.ts` stages a single-call, no-retry Responses API POST with a 15-second abort, bounded request and response sizes, `store:false` inherited from the trusted model draft, and a provider credential supplied only as a server-side argument. It has **no default network client**: its tests supply a mocked HTTP function and synthetic data. It never logs a token, raw recipes or provider output. Provider failures, ambiguous timeouts, invalid JSON and large responses return no trusted AI suggestion; an external reservation must remain held after unknown outcomes. The module **is not imported by the live Worker**, which continues to return 503 before reading any recipe body. No OpenAI credential is in the repository or website bundle.

Before 3B.2: connect the authenticated Worker to the validated version-2 body, authoritative server eligibility check, token accounting, durable request-id reservation/settlement, the secret and this transport; verify full-library segmentation if necessary, same-origin Safari authentication, logs/retention, actual provider usage receipts and a reliable $5 server-side guardrail. None of these unverified features is described as live. The next owner gate is still explicit billable activation permission.

### 3B.1 multi-batch planning (offline)

A fail-closed planner now divides an otherwise-valid complete Paprika library into at most ten small model-input drafts when one request would exceed the staged 7,200-byte prompt cap. Every imported recipe must appear exactly once in the plan, without dropping or shortening recipe fields. Each planned call will need its own idempotent durable monetary reservation after activation; do not show partial AI rankings if any batch fails. The planner is not connected to the production Worker, does not make calls and is not a promise of successful provider-side token accounting. If a single recipe cannot fit, the planner rejects it and leaves deterministic recommendations available.

### 3B.1 synthetic budget choreography (not live)

An offline-only orchestrator now coordinates a bounded batch plan through injectable reserve, dispatch and settle callbacks. Each request receives a fresh server-generated opaque ID and reserves a fixed micro-dollar allowance before provider dispatch. Only a strictly validated, completed response with bounded provider token counts can settle and refund unused reserve. Failures, timeouts, duplicate reservations and unknown provider outcomes return no AI ranking and retain uncertain reservations. The entire AI result is withheld if any batch fails so the app can continue with deterministic matching.

All tests supply a fake provider and fake Durable Object-style storage; `aiPilotOrchestrator.ts` is **not imported by the production Worker**, and it contains no default provider transport. These mocks do not prove that the eventual actual OpenAI invoice is mathematically capped. Authentication, Cloudflare Durable Object dispatch integration, complete recipe security review, verified token handling and actual provider reconciliation still require approval and end-to-end testing.

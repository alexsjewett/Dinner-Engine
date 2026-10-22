# Milestone 3A — One-user secure AI pilot

**Status:** Product direction and the stage 3A.0 repository-only implementation were approved October 21, 2026 (Pacific). No billable AI endpoint is configured, deployed or available to the public. Backend prototype is intentionally disabled. Household data and all existing deterministic Find Dinner functionality remain unchanged.

## User value and boundaries

The future "Ask AI for dinner ideas" action will let the primary user optionally ask an AI model to interpret a small set of locally saved Paprika recipes and explain recommendations. Users can compare results to the already useful deterministic matcher, which stays available as a fallback. Original recipe records are never rewritten.

Out of scope: AI substitutions, separate portions, AI calls automatically on every search, cloud recipe storage or sync, household subscriptions, accounts for multiple users, public/anonymous AI usage, and automated allergy or gluten safety certification.

## Architecture

Existing: React / TypeScript static website hosted on GitHub Pages, with locally stored imported Paprika recipes and household profiles.

Proposed: User explicitly invokes AI -> verify one-user sign-in -> Worker validates input and durable usage budget -> Worker submits limited recipe and search data to OpenAI using a server-side secret -> Worker validates and returns structured recommendation explanations. The browser must not hold the OpenAI secret or submit raw credentials.

OpenAI is the initial provider. Select a currently available lower-cost model after fictional recipe quality tests; keep it configurable on the server, not in browser input. No need to support other AI services from day one.

Cloudflare Worker is the proposed backend, with Cloudflare Access allowing exactly one approved identity. The Worker must independently verify JWT signature, expiry, issuer, application audience and identity (not trust an arbitrary request header). Cloudflare Worker secrets hold the API key. Keep secrets out of the public repository, frontend bundles, client-side storage, GitHub Actions logs and this chat.

**Mobile domain issue:** the static frontend is on github.io; an Access-protected Worker is likely on another domain. Safari may restrict cross-origin sign-in cookies. Explicitly test the actual authentication flow on iPhone. If necessary, migrate a tested copy of the UI to a same-origin custom domain or use a genuinely secure, short-lived bearer sign-in design. Never solve Safari cookie problems by opening an anonymous endpoint.

## Hard gates before paid provider requests

1. Verify Access authentication plus independent Worker JWT validation and allowlist. Test denied unauthenticated, expired, wrong-audience and wrong-user tokens.
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
- [ ] Owner creates a dedicated OpenAI API project and Cloudflare account

**3A.1 — Protected backend, separate review before active billing:**
- [ ] Configure an Access-protected Worker on a tested domain / route
- [ ] Validate Access tokens in the Worker with a one-person allowlist
- [ ] Durable quotas, request validation, response schema, provider timeout, kill switch, logging minimization
- [ ] Anonymous and concurrency/adversarial security tests; real Safari sign-in check
- [ ] Owner places API project key directly into Worker secret storage, never in chat
- [ ] Test one fictional request with owner-controlled spending; review gate before personal data

**3A.2 — User-triggered AI comparisons:**
- [ ] Show what will be sent and obtain deliberate user action each time
- [ ] Generate AI explanations for a short candidate list, with original recipes untouched
- [ ] Side-by-side test against current recommendations; record quality/cost/latency
- [ ] Keep baseline fallback; approve expansion to substitutions separately

## Owner setup — no secrets or identifying details in chat

1. Open https://platform.openai.com/ and create a dedicated API project named Find Dinner. Configure billing, usage views, and conservative notifications. **Do not create or share an API key in chat yet.**
2. Open https://dash.cloudflare.com/ and create/sign in to a Cloudflare account; enable Zero Trust. We will guide Access and Worker setup once the architecture is ready to test. **Do not deploy an unprotected Worker.**
3. Return to chat with only "both accounts ready" (or specify which service needs help). Do not post keys, email address, credit-card details or profile data.
4. Later, paste the key directly into Cloudflare Worker Secrets through the Cloudflare dashboard, after verified authentication and quota controls are in place.

## Sources

- OpenAI API key safety: https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
- OpenAI project budget information: https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Protect Workers with Access: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- Signed Access token verification: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Durable Object transactional storage: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/

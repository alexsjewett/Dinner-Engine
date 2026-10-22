# Find Dinner AI Worker — protected, deliberately disabled

**Stage 3A.1 source prepared; not deployed, connected or billable.**

The Worker requires (1) a Cloudflare Access-authenticated request that supplies
trusted `ctx.access`, and (2) a matching exact email configured as a private
Worker variable/secret `ALLOWED_EMAIL`. Every other request receives HTTP 403.
Even an authorized request to `POST /api/ai/recommend` gets HTTP 503 *without
reading the recipe body*. No OpenAI integration, credentials or quotas are
present. The existing Find Dinner UI and its stored recipes are unchanged.

## Required sequence — do not skip the first protection step

1. In the Cloudflare account dashboard open **Workers & Pages**. Under
   **Protect all Workers**, select **Enable Access**.
   Choose **All traffic** (not Previews only).
   For Authentication policy choose **Cloudflare account** if only the owner
   is a member. Alternatively configure an exact one-user **Emails**
   allow policy in Cloudflare Zero Trust (not email domain or Everyone).
   Click **Apply Access**. This protects current and future Workers, including
   production and previews, BEFORE any Git deployment.
2. Only once account-wide Access has been confirmed, connect the
   `alexsjewett/Dinner-Engine` GitHub repo as a Cloudflare **Worker** project.
   Set project/Worker name to `dinner-engine-ai`, root directory `backend`,
   production branch `main`, build command `npm install` if requested, and deploy
   command `npx wrangler deploy`. The checked-in `backend/wrangler.json`
   pins the name, script and preview defaults.
   GitHub Pages remains completely separate and works as before.
   Connecting Git can deploy automatically; verify **All traffic** Access
   protection before this step.
3. In **Workers & Pages > dinner-engine-ai > Settings > Variables and Secrets**,
   create `ALLOWED_EMAIL` as a **Secret** with the exact email address used to
   authenticate to Cloudflare Access. Do not put it in GitHub, chat or a
   plaintext config file. Until present, Worker refuses every request.
4. In **Workers & Pages > dinner-engine-ai > Access**, verify All traffic
   protection applies to this Worker; **do not add a Bypass or Everyone**
   policy. Try the `workers.dev` Worker URL in iPhone Safari. Cloudflare
   should ask for authentication and the owner should be able to open
   `/api/ai/health`, which should say `{ "enabled": false }` alongside
   the service identifier. In a Private tab, sign-in should be required.
   If it does not work, stop and troubleshoot Access — never disable it.
5. Do not put an OpenAI key into any service yet. A paid endpoint cannot be
   turned on until durable spending quotas, request size limits, strict
   output validation, privacy controls and billing security review exist.

**Why two layers?** Cloudflare Access protects the whole Worker before
execution; checking `ctx.access` plus `ALLOWED_EMAIL` inside the Worker
guards against accidental removal/bypass or an incorrectly broad Access
policy. The string in an incoming `CF-Access-Jwt-Assertion` header is NEVER
accepted in place of verified Access context.

## CI

From repo root, `npm run test:ai-foundation` tests denied anonymous, wrong-user,
missing-secret and forged-header requests; it confirms no recipe bodies are
read and no API calls occur. GitHub Pages continues to build the frontend
independently. See `docs/AI_PILOT_PLAN.md` for the rest of the pilot.

## Temporary Access diagnostics (October 21, 2026 Pacific)

The Worker is now connected and deployed behind account-wide All Workers
Access. The owner configured the `ALLOWED_EMAIL` secret and reported an
`{"error":"access_denied"}` result for `GET /api/ai/health`. Case-only
changes of the configured email made no difference; case comparison was
already insensitive.

A **temporary** `diagnostic` field in the 403 JSON response for
`GET /api/ai/health` identifies which fail-closed check rejected access:

| Code | Interpretation | Safe next action |
|---|---|---|
| `access_context_missing` | Worker received no trusted Access context | Check Cloudflare Access application, Worker invocation and runtime docs; do NOT disable Access |
| `allowlist_missing` | `ALLOWED_EMAIL` is missing/blank/invalid in this Worker environment | Confirm Secret exists in Production, redeploy secret if needed |
| `identity_lookup_failed` | `ctx.access.getIdentity()` threw | Inspect Access configuration/identity service, no user data in logs |
| `identity_email_missing` | Verified Access identity did not provide email | Inspect identity provider/policy configuration |
| `identity_mismatch` | Email from verified Access differs from allowlist (case ignored) | Compare locally against `/cdn-cgi/access/get-identity`; do not share personal data |

Only fixed error codes are returned. No email, claims, secret values,
tokens, prompt data or request bodies are returned or logged.
Every failure **still responds 403**. Other endpoints only respond with
generic `access_denied`; AI remains disabled and unable to bill or transmit
recipes. Remove the codes once the iPhone Access check is resolved.

## 3A.1 authenticated iPhone success and diagnostic removal (October 21, 2026 Pacific)

**Owner verified** `GET /api/ai/health` now responds with
`{"service":"find-dinner-ai","enabled":false}` on iPhone Safari.
The earlier `allowlist_missing` failure came from setting the secret in
Cloudflare's **Build** section rather than the Worker Production **Bindings /
Variables and Secrets** runtime section. The owner corrected the configuration
without weakening Cloudflare Access, and the allowlist then passed.

The approved temporary 403 `diagnostic` codes have now been removed from
source. Denials to **all** endpoints are again generic:
`{"error":"access_denied"}`. Tests assert no failure details, no body
reads on denied requests, and no AI calls even for authorized requests.

**Separate outstanding checks:** GitHub CI success is not Cloudflare deployment
proof. Confirm the latest Git commit is deployed in Cloudflare, then verify
an authorized iPhone Safari request *and* that a fresh Private Safari session
requires sign-in. Do not submit personal recipe text to this endpoint until
durable request quotas and the billable security gate have been approved.

## 3A.2 — Nonbillable guardrails (October 21, 2026 Pacific)

The Worker remains OpenAI-free and its real recommendation route always returns HTTP 503 without reading a request body. The existing app and local Paprika recipes are unchanged.

The authenticated POST `/api/ai/guardrails` route is **off by default**. It accepts test requests only if the Production *runtime* secret `AI_GUARDRAIL_MODE` is exactly `test`. If absent or any other value, the test route returns 503 without reading a body. To stop it, change or remove that secret and deploy a new Worker version. Do not add a provider key.

In test mode, the Worker reads at most 12,288 bytes, accepts only version-1 JSON with known fields and up to 5 bounded fictional recipe candidates, and never persists or echoes ingredient, direction, search or profile text. It returns only an acceptance flag (test-only, no provider) or a generic error. Owner authentication still applies first.

`USAGE_LEDGER` binds one SQLite-backed Durable Object, identified by fixed internal name `pilot-owner-v1`. Synchronous transactions atomically reserve simulated 10-cent units against limits of 10 accepted tests/hour, 40/day, 100/month and $10/month in placeholder counters. UTC hour/day/month boundaries apply. The ledger stores only counts and **does not measure actual OpenAI spending**. Unavailable or corrupt ledger storage blocks requests. There is no billing reconciliation because no model is connected.

The GitHub CI now runs synthetic auth, schema, oversize, concurrency, persistence, corruption and off-switch cases and a Wrangler `deploy --dry-run` backend check. Independently confirm the current Cloudflare Workers Builds result and iPhone health/private-session behavior.

**Before any paid AI activation**: provider-specific token/price caps, actual usage reconciliation, consent, privacy/retention review, additional security tests and separate explicit approval are required. See `docs/AI_PILOT_PLAN.md`.

## 3B.1 nonbillable staged adapter

`src/aiPilot.ts` defines a pure, network-free OpenAI request preparation and output validation contract for proposed `gpt-6-luna`. It removes recipe directions, limits candidate IDs and explanation sizes, and computes conservative token-cost estimates from published rates. The current Worker **does not import or call this adapter**, and `/api/ai/recommend` still returns 503 without reading a body. The $5/month design target is **not** an enforced billable quota. Do not add an API key or turn on paid model requests. Provider transport, actual token accounting, durable real-money reconciliation, browser auth/CORS and separate security/activation approval remain outstanding.

### Prepared monetary ledger (not live)

`src/paidBudget.ts` defines fail-closed $5/month reservation arithmetic and conservative reconciliation validation with synthetic tests. It is **not imported by the running Worker** and does not protect any paid requests. There is no paid provider endpoint or API key. Idempotent reservations, storage integration, provider usage reconciliation and authenticated opt-in remain outstanding before any billable activation.

### 3B.1 internal budget preflight wired (October 22, 2026)

The Durable Object now accepts an internal-only `/reserve-paid-preflight` operation backed by SQLite transactional monetary counters. Synthetic tests verify the hourly cap and persistence across object reconstruction. The public Worker does not route to this operation; no provider transport, credentials, or paid requests exist. **The $5/month limit is not yet a real production cost cap.** Actual provider usage reconciliation, idempotency, authentication of browser opt-in and failure handling remain required before 3B.2.

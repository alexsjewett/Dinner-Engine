# Milestone 3B.2 — First fictional paid test (operator checklist)

**State after code deployment: OFF.** The new Worker test capability has no effect
unless the owner explicitly configures TWO private Production runtime values:
`OPENAI_API_KEY` (secret) and `AI_PILOT_MODE=synthetic`. Neither belongs in
GitHub code, repository variables, build settings, frontend storage, logs or chat.

This first stage **does not send any Paprika recipes or household profiles**.
`POST /api/ai/recommend` remains disabled and ignores its body regardless
of `AI_PILOT_MODE`. The existing local dinner suggestions continue working.

## Before setting the mode to synthetic

1. In OpenAI's `dinner-engine` API project, check that `gpt-6-luna` is
   permitted and request output is supported. Check Standard pricing against
   our $0.10/1M input and $0.50/1M output preflight assumption, including any
   changes, processing uplifts, or cached token accounting.
2. Check OpenAI project billing controls and enable a **hard**, enforced
   project spending limit of $5/month if available, alongside alerts.
   Some accounts/docs describe soft alert-only budgets; do not treat alerts
   as a stop. Provider hard-limit enforcement can lag; it is not a
   mathematical guarantee against overshoot.
3. Confirm Cloudflare Workers & Pages > Protect all Workers applies to both
   Production and previews and that the Access policy is OWNER ONLY.
   Confirm a fresh Safari Private window requires authentication.
4. Confirm Cloudflare `ALLOWED_EMAIL` is a **Production runtime Secret** and
   matches the authenticated owner. Never configure an Access bypass or
   anonymous endpoint.
5. The Worker is deployed with no `AI_PILOT_MODE` in `wrangler.json`.
   At this point GET `/api/ai/health` should report `enabled:false`
   and the fictional-test page `/api/ai/test` will show disabled.

## One fictional request (only after preceding checks)

1. From Cloudflare Worker `dinner-engine-ai` > Production > Settings >
   Variables and Secrets, add a **Secret** named `OPENAI_API_KEY` containing
   a key created for the `dinner-engine` OpenAI API project. Do not share
   or paste this key into chat or GitHub. Set as Production **runtime**
   secret, not as a build variable.
2. Add a separate Production **runtime text variable**
   `AI_PILOT_MODE` = `synthetic`. Do not use `paprika` or `live`;
   neither is supported. If missing or anything else, the test stays off.
3. Open the **authenticated Worker origin** in iPhone Safari,
   at `/api/ai/test`. The page must say it is configured for fictional
   tests and must explicitly require the **Run one paid fictional test**
   button. Press once. A real provider request is made only at that click;
   it uses a fictional lentil recipe and no browser cookbook data.
4. Report only the on-screen test status and generic error code or
   success; never send keys, Access tokens or emails. Independently verify
   the OpenAI project usage page for any actual charge.
5. Disable immediately by removing/changing `AI_PILOT_MODE` in Cloudflare
   runtime settings. To revoke access completely, also revoke the project
   key in OpenAI and remove the Worker secret.

## Protections and remaining uncertainty

The Worker authenticates via platform-verified Cloudflare Access first;
requires a matching origin, synthetic-only intent header and a single
`{"confirmed":true}` body bounded to 128 bytes. The user must click
an explicit same-origin button. An unconfigured Worker rejects the request
before consuming any body. No cross-origin CORS access is granted.

Each fictional request reserves $0.0015 in a one-user SQLite Durable Object
ledger before contacting the Responses API. Limits are 10/hour, 40/day,
100/month and a $5 monthly *server-side allowance*. The model is pinned
to `gpt-6-luna`, response output limited to 700 tokens; transport times out,
never automatically retries, and reserves ambiguous costs. Only validated
completed output and reported usage trigger idempotent cost settlement.
The UI displays a cautious estimated cost; the official OpenAI invoice is
the source of truth. Unexpected provider pricing, billing lag and usage
accounting can cause differences. All recipe recommendations retain manual
review warnings; AI does not certify dietary safety.

**Still not approved for real household recipe transmission** by this code
deployment alone: the browser / Worker origin and per-request consent UX for
full Paprika uploads, authoritative dietary eligibility, real token count
verification, and Safari integration must pass before enabling such a route.
Use the original deterministic matcher in all error states.

References:
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://platform.openai.com/pricing
- https://help.openai.com/en/articles/6614457-troubleshooting-api-usage-and-spend-limits
- https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform

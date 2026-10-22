# Dinner Engine: real Paprika AI activation gate (nonbillable design)

Status: **NOT ACTIVATED**. The owner verified one fictional, paid model call on
October 22, 2026, and approved continued *nonbillable* implementation. A
separate, express approval is required before transmitting any actual Paprika
recipes or profile restrictions to OpenAI.

## Verified groundwork

- The fictional Lentil Skillet succeeded with validated schema and model usage.
- The owner checked eight imported recipes: two model-draft batches of four,
  largest draft 6,489 UTF-8 bytes. These drafts were not sent.
- A later browser-only catalog preview accounts for up to 200 recipes across
  multiple request-sized windows. This is **not** server support for 200
  billable recipes, and does not change current per-request/rate caps.
- The currently running `POST /api/ai/recommend` must remain hard-disabled,
  prior to reading any recipe body. A fictional-only testing route is separate.

## Hard blocker 1: authenticate Safari requests on ONE origin

The public app runs on `alexsjewett.github.io`. The Access-protected
`dinner-engine-ai` Worker is on another origin. A protected cross-origin
POST with JSON and custom intent headers triggers CORS preflight. Cloudflare
documents that Access may reject this unauthenticated OPTIONS request, and
browser third-party-cookie policy can prevent the later authorized request.
Never resolve this by weakening Access, accepting unchecked headers, making
the paid route anonymous, or setting wildcard CORS.

**Preferred next deployment experiment: stage a separate authenticated
same-origin version of Find dinner. and API, with ALL paid real-Paprika
operations still OFF.** Keep GitHub Pages live as the existing fallback.
Validate an authenticated same-origin nonbillable request from iPhone Safari
and a rejected signed-out/incorrect-user request before transferring any real
recipes. The final architecture may be a separate Access-protected UI and API
routing design, but must preserve cryptographically verified user identity
within the API.

Special Cloudflare caution: Workers Static Assets currently do **not** pass
`ctx.access` into the user Worker. Do not assume that simply combining React
assets and the Worker in one deployment preserves the existing trusted
`ctx.access.getIdentity()` check. Test a supported separate API Worker or
cryptographic Access JWT validation before declaring that deployment safe.

GitHub Pages IndexedDB is origin-scoped. The eight saved imports do NOT
automatically appear on the new hostname. Do not attempt programmatic
cross-origin storage transfer. Keep current browser data intact and have the
owner re-import the original Paprika export into the new origin after the
nonbillable sign-in test works.

Sources:
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/cors/
- https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/

## Hard blocker 2: all-or-nothing large-catalog server orchestration

The Worker contract currently accepts at most 40 recipes / 98,304 UTF-8
request bytes. The staged provider adapter bounds individual model draft
input to 7,200 bytes and at most ten batches per **one** current window.
The Durable Object monetary ledger enforces 10 paid calls/hour, 40/day,
100/month, $5/month and a reserved maximum of $0.0015 per call.

Before real activation, server-side logic must bind the *complete* catalog
to an expressly confirmed request/session, check duplicate and missing
recipe IDs across every window, ensure uniform restrictions and criteria,
and verify the entire requested operation is affordable under the ledger
before **any** paid call. Never blindly execute window 1 when window 2 may
fail; no partial recommendation set can be shown as complete.

If a full library would require more than 10 paid calls in an hour,
the system must either refuse before spending or use a newly reviewed,
user-approved paced design and durable session limits. The browser-only
200-recipe planning cap is not permission to increase the existing 10/hour
limit or $5/month hard pilot allowance. Design for real provider usage,
unknown token usage, persistent reservations on timeouts, and no auto retries.

## Hard blocker 3: safety, disclosure and manual opt-in

- On every real AI action disclose full imported recipe text scope:
  names, ingredients, directions, descriptions, notes, sources, categories
  and times. Dietary terms for chosen diners may be transmitted without
  personal profile names/IDs. Recipe text itself can contain personal details.
- The user explicitly agreed to sending their full Paprika archive **once
  real AI is separately activated**, but requests still require deliberate
  per-action opt-in and clear size display. Current checkbox means preview,
  not activation, consent to bill or a network request.
- Keep Must avoid restrictions hard; exclude obvious conflicts from candidate
  IDs and demand manual review for unknown ingredients, packaging, label
  claims and possible cross-contact. Never infer that AI certifies safety.
- Keep original browser recipes unchanged and the deterministic matcher as
  fallback. Fail closed for an invalid/partial/model-rejected response.
- The Responses API request must continue to specify `store:false`. This
  avoids ordinary saved application responses; it is **not** a promise that
  provider abuse-monitoring data is retained for zero days. Current OpenAI
  documentation describes possible abuse-monitoring retention of up to
  30 days by default, subject to exceptions and approved controls.
  https://developers.openai.com/api/docs/guides/your-data

## Approval sequence

1. Owner approves **staging a separate same-origin Cloudflare-hosted test
   experience** while retaining the current GitHub Pages link and all
   real-recipe AI off.
2. Implement and verify the nonbillable authenticated same-origin iPhone
   sign-in path without raw recipe payloads, plus an appropriate on-device
   recipe re-import procedure. Do not connect the production Paprika AI route.
3. Implement full-catalog server authorization, bounded all-or-nothing
   session and budget checks with fictional mocks, and verify deployment.
4. Review realistic costs, provider data retention, limitations and
   cancellation/fallback before the owner separately approves activation.
5. Only after separate activation approval, enable opt-in real-recipe AI.
   Keep a default-off runtime kill switch and no automatic retries.

**Stop at the first unverified security condition.** A green GitHub Actions
run alone does not prove Cloudflare Access, same-origin Safari behavior,
live server budgets, or a safely transferred IndexedDB library.

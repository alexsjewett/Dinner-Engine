# One-click AI dinner suggestions: existing website, existing Worker

The product owner asked us to finish the real feature without creating a
second hosted website or migrating the existing local Paprika cookbook.

## Implementation (default off)

- The React app remains on GitHub Pages with all existing IndexedDB recipes.
- A separately consented **Ask AI about my Paprika recipes** action opens a
  user-initiated popup/tab at the existing Access-protected Cloudflare Worker.
  Login, if required, happens first-party on the Worker origin, not in a
  third-party cross-origin fetch.
- The popup requests an authenticated readiness result on its own origin.
  When the runtime switch is off, it notifies the app that AI is disabled;
  the app **does not send any recipe payload**.
- Only once the signed-in Worker reports ready does the original website send
  that explicitly approved request via `postMessage`, verifying the exact
  pinned Worker origin, popup window and ephemeral nonce. The popup accepts
  messages only from the expected GitHub Pages origin, then uses a first-party
  same-origin JSON POST to the existing Worker.
- The Worker requires verified Access owner identity, a separate
  `AI_REAL_MODE=enabled` Production runtime variable, a valid Origin,
  explicit intent header, and complete bounded version-2 Paprika payload
  before planning model requests. The server model and tokens remain fixed.
- For one request (max 40 full recipes and 98,304 UTF-8 bytes), every staged
  model call is **atomically** reserved from the existing Durable Object before
  the first provider call. The rate limits remain 10/hour, 40/day, 100/month,
  and $5/month reserved spending. Insufficient limits reject the full request
  before any provider call. Model validation and estimated-cost settlement
  are required; failure yields no partial AI suggestions or retries.
- Only matching original recipe IDs, bounded explanations, and mandatory
  review warnings are returned to React; original imported records aren't
  modified. Deterministic matching remains available.

## Cloudflare identity and Safari

The original GitHub Pages site and Worker have *different* origins, but only
the first-party, authenticated popup makes the POST. We **do not** add
wildcard CORS, weaken Cloudflare Access, bypass preflight, require third-party
cookies, or deploy an alternative website. This depends on the browser
preserving `window.opener` through Access sign-in, which must be tested on
iPhone Safari before treating the feature as production-ready.

## Remaining configuration and activation (owner controlled)

1. Obtain the **exact non-secret HTTPS Worker address** from the owner's
   Cloudflare dashboard: Workers & Pages → dinner-engine-ai → URL.
   Configure GitHub Pages with that single verified `dinner-engine-ai.*.workers.dev`
   origin via `VITE_AI_WORKER_ORIGIN` (build-time public setting). No API
   keys, email addresses or private values may go in frontend variables.
2. Leave `AI_REAL_MODE` **absent** initially; use the iPhone app button to
   confirm popup sign-in and that it reports *not activated* without sending
   the library. Verify the app and its local recipes remain intact.
3. After final owner authorization of sending the complete Paprika collection
   (including notes and dietary restrictions) and an expected small charge,
   add Production **runtime** `AI_REAL_MODE` with exact value `enabled`
   in Cloudflare, not in GitHub or the Cloudflare Build settings.
4. Confirm only the authenticated owner can run it and that the $5 monthly
   ledger is attached. Run one explicit opt-in test with the current eight
   recipes. A failed request is not automatically repeated; the ordinary
   matcher still works. Remove the runtime variable to shut off real AI.

**Scaling note:** the existing local catalog preview supports up to 200
recipes, but the active, paid operation is intentionally limited to one
bounded 40-recipe window and at most ten model calls. Later server-side
whole-library multiwindow orchestration is a distinct extension; never
present an incomplete catalog as a complete AI recommendation.

No real recipes are uploaded until the runtime switch and the owner's
deliberate per-request consent both exist.

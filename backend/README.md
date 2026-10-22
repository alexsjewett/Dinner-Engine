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

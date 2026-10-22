# Find Dinner AI backend — disabled foundation

**Not deployed. Not billable. No credentials are configured.**

This is the intentionally inactive foundation for Milestone 3A. The Worker
entrypoint at src/index.ts returns HTTP 503 to AI recommendation POSTs before
reading any request body. This prevents accidental transmission of local
recipe data while authorization and spending safeguards are not ready.

The existing GitHub Pages build does not deploy this Worker. There is no
Wrangler deployment configuration or OpenAI SDK here yet, deliberately.

The plan for a protected one-user Cloudflare Access deployment and required
hard security gates is documented in ../docs/AI_PILOT_PLAN.md.

Do not deploy this as a billable service or introduce a provider secret until
Access JWT verification, single-user authorization, durable spend limits,
input validation, no-content logging, iPhone Safari sign-in, and
opt-in consent have been tested. Store credentials only in Cloudflare secrets.

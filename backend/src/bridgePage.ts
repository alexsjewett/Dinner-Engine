/**
 * Same-origin authenticated popup bridge for the existing GitHub Pages app.
 * Safari does not need third-party cookies or CORS because the popup is opened
 * on the protected Worker origin and makes its own same-origin POST.
 * No recipe content is included in URLs, logs or browser storage.
 */
export const BRIDGE_ORIGIN = "https://alexsjewett.github.io";
export const BRIDGE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Find dinner. — secure AI connection</title>
<style>body{font:16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:34rem;margin:3rem auto;padding:0 1rem;color:#29372f;line-height:1.6}h1{font-size:1.5rem}p{color:#536358}</style>
</head><body><main><h1>Find dinner. — secure AI connection</h1>
<p id="status" role="status">Checking your protected connection…</p>
<p>AI requests use this authenticated window. The original Paprika recipes
stay unchanged in your cookbook. Do not close this window during an active
request.</p></main>
<script src="/api/ai/bridge/client.js" defer></script></body></html>`;

export const BRIDGE_JS = `"use strict";
(() => {
  const status = document.getElementById("status");
  const params = new URLSearchParams(location.search);
  const state = params.get("state");
  const trustedOrigin = "https://alexsjewett.github.io";
  if (!state || !/^[a-zA-Z0-9_-]{16,80}$/.test(state) || !window.opener) {
    status.textContent = "Please open this secure window from Find dinner.";
    return;
  }
  let used = false;
  function notify(kind, value) {
    window.opener.postMessage({ type: kind, state, ...value }, trustedOrigin);
  }
  async function begin() {
    try {
      const response = await fetch("/api/ai/bridge/status", {
        method: "GET", credentials: "same-origin", cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok || body.service !== "find-dinner-ai") throw Error("not-ready");
      if (body.enabled !== true) {
        status.textContent = "Your protected connection works. AI for real recipes is not yet activated.";
        notify("dinner-ai-ready", { enabled: false });
        return;
      }
      status.textContent = "Connected. Preparing to receive your approved recipe request…";
      notify("dinner-ai-ready", { enabled: true });
    } catch {
      status.textContent = "Unable to verify the secure connection.";
      notify("dinner-ai-ready", { enabled: false });
    }
  }
  window.addEventListener("message", async event => {
    if (used || event.origin !== trustedOrigin ||
        event.source !== window.opener || !event.data ||
        event.data.type !== "dinner-ai-request" || event.data.state !== state)
      return;
    used = true;
    status.textContent = "Asking AI about the approved Paprika library…";
    try {
      const response = await fetch("/api/ai/recommend", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json",
          "X-Find-Dinner-Intent": "real-paprika-opt-in" },
        body: JSON.stringify(event.data.payload),
      });
      const body = await response.json();
      if (!response.ok || body.ok !== true) {
        notify("dinner-ai-result", { ok: false,
          error: typeof body.error === "string" ? body.error : "ai_unavailable" });
      } else {
        notify("dinner-ai-result", { ok: true,
          suggestions: body.suggestions, estimatedMicroUsd: body.estimatedMicroUsd,
          batchCount: body.batchCount });
      }
    } catch {
      notify("dinner-ai-result", { ok: false, error: "ai_unavailable" });
    }
    status.textContent = "Request complete. Return to Find dinner.";
    window.close();
  });
  begin();
})();`;

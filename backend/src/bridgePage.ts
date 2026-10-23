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
<meta name="theme-color" content="#f6f8f4">
<title>Kitchen Companion — secure AI connection</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; min-height: 100svh;
    display: grid; place-items: center; padding: 1.25rem;
    background: #f6f8f4; color: #29372f;
    font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  main {
    width: 100%; max-width: 29rem; padding: 2.25rem 1.5rem;
    background: #fff; border: 1px solid #e2e9e0; border-radius: 1.25rem;
    box-shadow: 0 14px 36px rgba(31, 55, 38, .06); text-align: center;
  }
  .brand {
    margin: 0 0 .6rem; color: #597461; font-size: .8rem;
    font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  }
  .loader {
    width: 2.75rem; height: 2.75rem; margin: 0 auto 1.35rem;
    border: 3px solid #deeadf; border-top-color: #5f8868;
    border-radius: 50%; animation: spin .85s linear infinite;
  }
  h1 { margin: 0 0 .8rem; font-size: clamp(1.55rem, 6vw, 1.9rem); line-height: 1.2; }
  #detail { margin: 0; color: #526457; }
  #status { margin: 1.2rem 0 0; color: #396849; font-weight: 650; }
  #next {
    margin: 1.6rem 0 0; padding-top: 1.25rem;
    border-top: 1px solid #e7ece7; color: #617067; font-size: .93rem;
  }
  [hidden] { display: none !important; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .loader { animation: none; } }
</style>
</head><body>
<main>
  <div id="loader" class="loader" aria-hidden="true"></div>
  <p class="brand">Kitchen Companion</p>
  <h1 id="heading">Getting everything ready…</h1>
  <p id="detail">We're connecting securely before asking AI to find dinner ideas.</p>
  <p id="status" role="status" aria-live="polite">Connecting securely…</p>
  <p id="next">When AI finishes, this window will close automatically and you'll return to Kitchen Companion.</p>
</main>
<script src="/api/ai/bridge/client.js" defer></script></body></html>`;

export const BRIDGE_JS = `"use strict";
(() => {
  const heading = document.getElementById("heading");
  const detail = document.getElementById("detail");
  const status = document.getElementById("status");
  const loader = document.getElementById("loader");
  const next = document.getElementById("next");
  const params = new URLSearchParams(location.search);
  const state = params.get("state");
  const checkOnly = params.get("check") === "1";
  const trustedOrigin = "https://alexsjewett.github.io";
  function show(title, description, progress, working = true) {
    heading.textContent = title;
    detail.textContent = description;
    status.textContent = progress;
    loader.hidden = !working;
  }
  function returnToApp() {
    // Give the opener the focus where supported; Safari may instead switch
    // tabs automatically when this script-opened window closes.
    try { window.opener.focus(); } catch {}
    window.close();
  }
  if (!state || !/^[a-zA-Z0-9_-]{16,80}$/.test(state) || !window.opener) {
    show("Please return to Kitchen Companion",
      "Open the AI window from the app to start a secure request.",
      "This window cannot continue.", false);
    next.textContent = "You can close this window.";
    return;
  }
  if (checkOnly) {
    show("Checking your connection…",
      "Making sure Kitchen Companion can connect securely. No recipes are being shared.",
      "Connecting securely…");
    next.textContent = "We'll return you to Kitchen Companion when the check is done.";
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
        show("Connection checked",
          "Your secure connection works, but AI dinner suggestions are not switched on right now.",
          "No recipes were shared.", false);
        next.textContent = "Returning to Kitchen Companion…";
        notify("dinner-ai-ready", { enabled: false });
        setTimeout(returnToApp, 1400);
        return;
      }
      if (checkOnly) {
        show("You're connected!",
          "Kitchen Companion can securely connect to AI. No recipes were shared.",
          "Connection check complete.", false);
        next.textContent = "Returning to Kitchen Companion…";
        notify("dinner-ai-ready", { enabled: true });
        setTimeout(returnToApp, 1400);
        return;
      }
      show("Almost ready…",
        "Your secure connection is ready. Preparing your AI dinner search.",
        "Getting started…");
      notify("dinner-ai-ready", { enabled: true });
    } catch {
      show("We couldn't connect right now",
        "Please try again from Kitchen Companion.",
        "The secure connection couldn't be verified.", false);
      next.textContent = "Returning to Kitchen Companion…";
      notify("dinner-ai-ready", { enabled: false });
      setTimeout(returnToApp, 1400);
    }
  }
  window.addEventListener("message", async event => {
    if (used || checkOnly || event.origin !== trustedOrigin ||
        event.source !== window.opener || !event.data ||
        event.data.type !== "dinner-ai-request" || event.data.state !== state)
      return;
    used = true;
    show("Finding your dinner ideas…",
      "Kitchen Companion is using AI to find recipes that fit your needs.",
      "This may take a moment.");
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
        show("Search complete",
          "AI couldn't finish your dinner suggestions this time.",
          "Returning to Kitchen Companion…", false);
        next.textContent = "Your usual recipe matches are still available in the app.";
      } else {
        notify("dinner-ai-result", { ok: true,
          suggestions: body.suggestions, estimatedMicroUsd: body.estimatedMicroUsd,
          batchCount: body.batchCount });
        show("Dinner ideas are ready!",
          "Your AI suggestions are waiting in Kitchen Companion.",
          "Returning to Kitchen Companion…", false);
        next.textContent = "Your results will appear in the app.";
      }
    } catch {
      notify("dinner-ai-result", { ok: false, error: "ai_unavailable" });
      show("Search complete",
        "AI couldn't finish your dinner suggestions this time.",
        "Returning to Kitchen Companion…", false);
      next.textContent = "Your usual recipe matches are still available in the app.";
    }
    // Give Safari time to deliver the result before closing the popup.
    setTimeout(returnToApp, 900);
  });
  begin();
})();`;

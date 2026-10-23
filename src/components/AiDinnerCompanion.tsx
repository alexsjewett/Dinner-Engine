import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { ImportedRecipe } from "../types/importedRecipe";
import type { HouseholdProfile } from "../types/profile";
import type { SearchCriteria } from "../services/dinnerMatcher";
import { prepareLocalPaprikaRequest } from "../services/aiPaprikaRequest";
import { describeAiFailure } from "../services/aiQuotaFeedback";
import {
  AI_WORKER_ORIGIN, validatedWorkerOrigin, askAiWithSecurePopup,
  checkAiSecureConnection,
  type AiDinnerResult,
} from "../services/aiPopupBridge";

interface Props {
  recipes: ImportedRecipe[];
  criteria: SearchCriteria;
  diners: HouseholdProfile[];
}
const messages: Record<string, string> = {
  ai_pilot_disabled: "Your protected AI connection is ready for sign-in, but real recipe suggestions are not activated yet.",
  bridge_not_configured: "The existing Cloudflare AI Worker address still needs to be connected.",
  popup_blocked: "Safari blocked the secure AI window. Enable pop-ups for this site and try again.",
  bridge_closed: "The secure AI window closed before completion. No automatic retry was made.",
  bridge_timeout: "The secure AI window did not finish. No automatic retry was made.",
  ai_unavailable: "The AI connection could not finish. Your ordinary suggestions remain available.",
  budget_limit_reached: "The protected AI usage or spending allowance was reached.",
  budget_unavailable: "The spending safeguard is unavailable, so no model request was allowed.",
  library_exceeds_safe_batch_limits: "This complete library is larger than the current live AI request limits.",
  invalid_request: "The recipe library did not pass the server's request checks.",
  model_response_invalid: "AI did not produce a valid recommendation. No automatic retry was made.",
  provider_timeout: "The AI provider timed out. No automatic retry was made.",
};
export function AiDinnerCompanion({ recipes, criteria, diners }: Props) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState<string | null>(null);
  const [result, setResult] = useState<AiDinnerResult | null>(null);
  useEffect(() => {
    setConsent(false); setBusy(false); setResult(null);
  }, [criteria, recipes]);

  const configured = !!validatedWorkerOrigin(AI_WORKER_ORIGIN);
  const local = recipes.length > 0 && consent
    ? prepareLocalPaprikaRequest(recipes, criteria, diners, true)
    : null;

  function testConnection() {
    if (checking || busy) return;
    setChecking(true);
    setConnection(null);
    // No recipe data is even constructed for this action.
    void checkAiSecureConnection().then(outcome => {
      setConnection(outcome.ok
        ? outcome.enabled
          ? "Secure connection verified. Real AI is enabled at the server; a separate consent click is still required before sharing recipes."
          : "Secure connection verified. Real-recipe AI remains switched off. No recipes were sent or billed."
        : outcome.error === "popup_blocked"
          ? "Safari blocked the secure window. Allow pop-ups for Find dinner."
          : "The secure connection could not be verified (" + outcome.error + "). No recipes were sent.");
    }).catch(() => setConnection(
      "The secure connection could not be verified. No recipes were sent."
    )).finally(() => setChecking(false));
  }

  function requestSuggestions() {
    if (!consent || busy || !configured) return;
    const prepared = prepareLocalPaprikaRequest(recipes, criteria, diners, true);
    if (!prepared.ok) {
      setResult({ ok: false, error: prepared.reason });
      return;
    }
    setBusy(true);
    setResult(null);
    // This call opens the authenticated Worker tab synchronously during the
    // click; the original recipe texts are never put in the URL or storage.
    void askAiWithSecurePopup(prepared, AI_WORKER_ORIGIN).then(outcome => {
      if (outcome.ok) {
        const allowedIds = new Set(recipes.map(recipe => recipe.id));
        if (outcome.suggestions.some(item => !allowedIds.has(item.recipeId))) {
          setResult({ ok: false, error: "model_response_invalid" });
        } else setResult(outcome);
      } else setResult(outcome);
    }).catch(() => setResult({ ok: false, error: "ai_unavailable" }))
      .finally(() => { setBusy(false); setConsent(false); });
  }

  return (
    <div className="ai-companion">
      <h3>Ask AI for dinner ideas</h3>
      <p className="helper-text">
        Optional: ask the protected AI service to rank recipes from your own
        Paprika library. Your usual dinner matches keep working.
      </p>
      <button type="button" className="profile-secondary-button"
        onClick={testConnection} disabled={checking || busy}>
        {checking ? "Checking secure connection…" : "Check secure AI connection — no recipe upload"}
      </button>
      {connection && <p className="helper-text" role="status">{connection}</p>}
      {recipes.length === 0 ? (
        <p className="helper-text">Import recipes under My recipes to try this feature.</p>
      ) : (
        <>
          <label className="dinner-mode-choice">
            <input type="checkbox" checked={consent}
              disabled={busy}
              onChange={event => { setConsent(event.target.checked); setResult(null); }} />
            I want to share all {recipes.length} of my imported Paprika recipes
            and these dinner preferences with AI for this request.
          </label>
          <p className="helper-text">
            This includes full ingredients, directions, notes, times and recipe
            sources, plus selected dietary restrictions without diner names or IDs.
            Original recipes are not changed. OpenAI may temporarily retain API
            data under its policies even with response storage disabled.
            AI cannot certify food or allergy safety.
          </p>
          {local && !local.ok && (
            <p role="status" className="helper-text">
              Local request blocked ({local.reason}). Your full library won't
              be silently trimmed.
            </p>
          )}
          <button type="button" className="profile-primary-button"
            disabled={!configured || !consent || busy || local?.ok === false}
            onClick={requestSuggestions}>
            {busy ? "Waiting for secure AI window…" : "Ask AI about my Paprika recipes"}
          </button>
          {!configured && (
            <p className="helper-text" role="status">
              The secure AI connection needs its verified Cloudflare Worker address
              configured before recipe sharing can be enabled. No AI request is made.
            </p>
          )}
          {result && (
            <div className="local-ai-readiness" role="status" aria-live="polite">
              {result.ok ? (
                <>
                  <strong>AI dinner suggestions — review before cooking</strong>
                  {result.suggestions.map(item => {
                    const original = recipes.find(recipe => recipe.id === item.recipeId);
                    if (!original) return null;
                    return (
                      <div key={item.recipeId} className="ai-dinner-suggestion">
                        <p><strong>{original.name}</strong></p>
                        <p>{item.explanation}</p>
                        <p className="helper-text">{item.cautions.join(" ")}</p>
                        <Link to={"/recipes/imported/" + encodeURIComponent(item.recipeId)}>
                          View original recipe
                        </Link>
                      </div>
                    );
                  })}
                  <p className="helper-text">
                    Estimated model cost: {"$" + (result.estimatedMicroUsd / 1_000_000).toFixed(6)}.
                    Across {result.batchCount} verified AI request
                    {result.batchCount === 1 ? "" : "s"}. Keep checking ingredients,
                    labels and cross-contact.
                  </p>
                </>
              ) : (
                <>
                  <strong>AI suggestions unavailable</strong>
                  <p>{result.error.startsWith("budget_")
                      ? describeAiFailure(result.error)
                      : messages[result.error] ?? "The secure AI request did not finish. No automatic retry was made."}</p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

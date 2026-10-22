/**
 * 3B.1: explicitly disabled preview only. No browser requests, URLs, keys,
 * or recipe transmission. Real opt-in transport needs 3B.2 approval.
 */
export const AI_PILOT_READY_FOR_BILLING = false as const;
export const AI_PILOT_PREVIEW_MESSAGE =
  "AI suggestions are being prepared. Your existing dinner results are still available; no recipes are sent to OpenAI.";

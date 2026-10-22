/**
 * NON-EXECUTING staged orchestration. NOT imported by the live Worker.
 * All side effects require explicit injected callbacks; no default provider,
 * authentication bypass, secret, ledger, or network dependency exists.
 */
import {
  MAX_PAPRIKA_MODEL_BATCHES,
  validatePaprikaModelReply, type StagedPaprikaBatch,
  type VerifiedStagedReply,
} from "./paprikaModelDraft";

export interface StagedLedger {
  reserve(requestId: string): Promise<"reserved" | "limited" | "duplicate">;
  settle(requestId: string, actualMicroUsd: number):
    Promise<"settled" | "duplicate" | "invalid">;
}
export interface StagedExecution {
  groups: Array<{ batchNumber: number; recipeIds: string[];
    reply: VerifiedStagedReply }>;
  totalEstimatedMicroUsd: number;
  requestCount: number;
}
function validPlan(batches: readonly StagedPaprikaBatch[]): boolean {
  if (batches.length < 1 || batches.length > MAX_PAPRIKA_MODEL_BATCHES) return false;
  const count = batches[0].totalLibraryRecipes;
  const ids: string[] = [];
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    if (batch.batchNumber !== i + 1 ||
        batch.totalBatches !== batches.length ||
        batch.totalLibraryRecipes !== count ||
        batch.recipeIds.length < 1 ||
        batch.recipeIds.some(id => typeof id !== "string") ||
        batch.draft.eligibleIds.some(id => !batch.recipeIds.includes(id))) return false;
    ids.push(...batch.recipeIds);
  }
  return ids.length === count && new Set(ids).size === ids.length;
}
/**
 * Reserve before EACH potential provider request. No retries or partial
 * successes returned. On ambiguous responses, provider errors or settlement
 * failures, do not refund unknown cost. The caller falls back to local matching.
 * Generated request IDs never come from browser payloads.
 */
export async function exerciseStagedBatchPlan(
  batches: readonly StagedPaprikaBatch[],
  ledger: StagedLedger,
  dispatch: (draft: StagedPaprikaBatch["draft"]) => Promise<unknown>,
  makeServerRequestId: () => string = () => crypto.randomUUID(),
): Promise<StagedExecution | null> {
  if (!validPlan(batches)) return null;
  const groups: StagedExecution["groups"] = [];
  let totalEstimatedMicroUsd = 0;
  for (const batch of batches) {
    let id: string;
    try {
      id = makeServerRequestId();
      if (!/^[a-zA-Z0-9_-]{16,80}$/.test(id)) return null;
      if (await ledger.reserve(id) !== "reserved") return null;
    } catch { return null; }
    let response: unknown;
    try { response = await dispatch(batch.draft); }
    catch { return null; } // Ambiguous outcome: keep full reservation.
    const verified = validatePaprikaModelReply(response, batch.draft.eligibleIds);
    if (!verified) return null;
    try {
      if (await ledger.settle(id, verified.estimatedMicroUsd) !== "settled") return null;
    } catch { return null; }
    totalEstimatedMicroUsd += verified.estimatedMicroUsd;
    groups.push({ batchNumber: batch.batchNumber,
      recipeIds: [...batch.recipeIds], reply: verified });
  }
  return { groups, totalEstimatedMicroUsd, requestCount: groups.length };
}

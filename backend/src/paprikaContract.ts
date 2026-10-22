/**
 * Milestone 3B.1: full imported Paprika library request contract (offline only).
 * This file has no network transport; the production recommendation endpoint
 * remains hard-disabled until separately approved 3B.2 activation.
 */
export const MAX_PAPRIKA_BODY_BYTES = 98_304;
export const MAX_PAPRIKA_RECIPES = 40;

type JsonRecord = Record<string, unknown>;
function object(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exactKeys(value: JsonRecord, required: readonly string[]): boolean {
  const found = Object.keys(value);
  return found.length === required.length &&
    required.every(key => Object.hasOwn(value, key));
}
function string(value: unknown, max: number, allowEmpty = true): value is string {
  return typeof value === "string" && value.length <= max &&
    (allowEmpty || value.trim().length > 0) &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
}
const recipeKeys = [
  "id", "paprikaUid", "name", "ingredients", "directions",
  "description", "notes", "servings", "prepTime", "cookTime",
  "totalTime", "source", "sourceUrl", "categories",
] as const;
function validRecipe(value: unknown): value is JsonRecord {
  if (!object(value) || !exactKeys(value, recipeKeys)) return false;
  return string(value.id, 128, false) &&
    (value.paprikaUid === null || string(value.paprikaUid, 200)) &&
    string(value.name, 250, false) &&
    string(value.ingredients, 16_000) &&
    string(value.directions, 24_000) &&
    string(value.description, 4_000) &&
    string(value.notes, 8_000) &&
    string(value.servings, 200) &&
    string(value.prepTime, 200) &&
    string(value.cookTime, 200) &&
    string(value.totalTime, 200) &&
    string(value.source, 1_000) &&
    string(value.sourceUrl, 2_000) &&
    Array.isArray(value.categories) && value.categories.length <= 40 &&
    value.categories.every(category => string(category, 200, false));
}
function validTerms(value: unknown, max: number): boolean {
  return Array.isArray(value) && value.length <= max &&
    value.every(term => string(term, 100, false));
}
function validCriteria(value: unknown): boolean {
  if (!object(value) || !exactKeys(value, [
    "have", "unavailable", "timeLimitMinutes", "mustAvoidFoods",
    "shouldAvoidFoods", "preferAvoidFoods", "dietaryNeeds",
  ])) return false;
  return validTerms(value.have, 30) &&
    validTerms(value.unavailable, 30) &&
    [15, 30, 45, 60].includes(value.timeLimitMinutes as number) &&
    validTerms(value.mustAvoidFoods, 30) &&
    validTerms(value.shouldAvoidFoods, 30) &&
    validTerms(value.preferAvoidFoods, 30) &&
    Array.isArray(value.dietaryNeeds) && value.dietaryNeeds.length <= 3 &&
    value.dietaryNeeds.every(need =>
      ["vegetarian", "vegan", "gluten-free"].includes(need as string)) &&
    new Set(value.dietaryNeeds).size === value.dietaryNeeds.length;
}
/**
 * The version-2 contract requires *every* imported recipe to be supplied.
 * The server cannot independently verify browser-local library completeness:
 * the UI must disclose the submitted count and require opt-in per request.
 * The consent flag is not authentication; Cloudflare Access must authorize
 * the request before any body is read.
 */
export function validateFullPaprikaPayload(value: unknown): boolean {
  if (!object(value) || !exactKeys(value, [
    "version", "scope", "consent", "recipes", "criteria",
  ])) return false;
  if (value.version !== 2 || value.scope !== "full-paprika-library" ||
      value.consent !== "explicit-per-request") return false;
  if (!Array.isArray(value.recipes) || value.recipes.length < 1 ||
      value.recipes.length > MAX_PAPRIKA_RECIPES ||
      !value.recipes.every(validRecipe) || !validCriteria(value.criteria)) return false;
  const ids = value.recipes.map((recipe: JsonRecord) => recipe.id);
  if (new Set(ids).size !== ids.length) return false;
  // UTF-8 bytes, not string length, are the transport bound.
  return new TextEncoder().encode(JSON.stringify(value)).byteLength <= MAX_PAPRIKA_BODY_BYTES;
}
type Result = { ok: true } | { ok: false; status: number; error: string };
/** Read at most the specified bytes; never log, persist, or forward contents. */
export async function checkFullPaprikaBody(request: Request): Promise<Result> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
    request.headers.get("content-type") ?? "")) {
    return { ok: false, status: 415, error: "unsupported_media_type" };
  }
  const length = request.headers.get("content-length");
  if (length !== null &&
      (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) {
    return { ok: false, status: 400, error: "invalid_request" };
  }
  if (length !== null && Number(length) > MAX_PAPRIKA_BODY_BYTES) {
    return { ok: false, status: 413, error: "payload_too_large" };
  }
  if (!request.body) return { ok: false, status: 400, error: "invalid_request" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_PAPRIKA_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413, error: "payload_too_large" };
      }
      chunks.push(next.value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const parsed: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(buffer));
    return validateFullPaprikaPayload(parsed) ? { ok: true } :
      { ok: false, status: 400, error: "invalid_request" };
  } catch {
    return { ok: false, status: 400, error: "invalid_request" };
  } finally {
    reader.releaseLock();
  }
}

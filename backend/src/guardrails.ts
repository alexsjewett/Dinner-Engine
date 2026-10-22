/**
 * Stage 3A.2: strict, versioned NONBILLABLE test request contract.
 * No content is persisted or forwarded to an AI provider.
 */
export const MAX_BODY_BYTES = 12_288;
const MAX_RECIPES = 5;
const MAX_TEXT = 2_000;
const MAX_TITLE = 150;
const MAX_ITEM = 80;

type JsonObject = Record<string, unknown>;
type ParseResult = { ok: true } | { ok: false; status: number; error: string };

function object(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function keys(value: JsonObject, required: string[], optional: string[] = []): boolean {
  const found = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key)) &&
    found.every((key) => required.includes(key) || optional.includes(key));
}
function text(value: unknown, max: number, allowEmpty = false): boolean {
  return typeof value === "string" && value.length <= max &&
    (allowEmpty || value.trim().length > 0) &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
}
function terms(value: unknown, max: number): boolean {
  return Array.isArray(value) && value.length <= max &&
    value.every((item) => text(item, MAX_ITEM)) &&
    new Set(value.map((item: string) => item.trim().toLowerCase())).size === value.length;
}

export function validatePayload(data: unknown): boolean {
  if (!object(data) || !keys(data, ["version", "recipes", "criteria"])) return false;
  if (data.version !== 1 || !Array.isArray(data.recipes) ||
      data.recipes.length < 1 || data.recipes.length > MAX_RECIPES) return false;

  const ids = new Set<string>();
  for (const recipe of data.recipes) {
    if (!object(recipe) || !keys(recipe, ["id", "title", "ingredients"], ["directions", "minutes"])) {
      return false;
    }
    if (!text(recipe.id, 128) || !/^[a-zA-Z0-9:%_.-]+$/.test(recipe.id as string) ||
        !text(recipe.title, MAX_TITLE) || !text(recipe.ingredients, MAX_TEXT)) return false;
    if (recipe.directions !== undefined && !text(recipe.directions, MAX_TEXT, true)) return false;
    if (recipe.minutes !== undefined && recipe.minutes !== null &&
        (!Number.isInteger(recipe.minutes) || (recipe.minutes as number) < 1 ||
         (recipe.minutes as number) > 1_440)) return false;
    if (ids.has(recipe.id as string)) return false;
    ids.add(recipe.id as string);
  }

  const criteria = data.criteria;
  if (!object(criteria) ||
      !keys(criteria, ["have", "unavailable", "timeLimitMinutes"], ["avoidFoods", "dietaryNeeds"])) return false;
  if (!terms(criteria.have, 20) || !terms(criteria.unavailable, 20) ||
      ![15, 30, 45, 60].includes(criteria.timeLimitMinutes as number)) return false;
  if (criteria.avoidFoods !== undefined && !terms(criteria.avoidFoods, 12)) return false;
  if (criteria.dietaryNeeds !== undefined &&
      (!Array.isArray(criteria.dietaryNeeds) || criteria.dietaryNeeds.length > 3 ||
       criteria.dietaryNeeds.some((need) => !["vegetarian", "vegan", "gluten-free"].includes(need)) ||
       new Set(criteria.dietaryNeeds).size !== criteria.dietaryNeeds.length)) return false;
  return true;
}

/**
 * Read at most MAX_BODY_BYTES; do not call request.json() or request.text()
 * without an upper limit. Discard content after validation.
 */
export async function checkBody(request: Request): Promise<ParseResult> {
  const type = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/.test(type)) {
    return { ok: false, status: 415, error: "unsupported_media_type" };
  }
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader !== null) {
    if (!/^\d+$/.test(lengthHeader)) return { ok: false, status: 400, error: "invalid_request" };
    if (Number(lengthHeader) > MAX_BODY_BYTES) return { ok: false, status: 413, error: "payload_too_large" };
  }
  if (!request.body) return { ok: false, status: 400, error: "invalid_request" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413, error: "payload_too_large" };
      }
      chunks.push(next.value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const part of chunks) {
      body.set(part, offset);
      offset += part.byteLength;
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(body);
    const json: unknown = JSON.parse(decoded);
    return validatePayload(json) ? { ok: true } :
      { ok: false, status: 400, error: "invalid_request" };
  } catch {
    return { ok: false, status: 400, error: "invalid_request" };
  } finally {
    reader.releaseLock();
  }
}

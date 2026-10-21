import { gunzipSync, strFromU8, unzip } from "fflate";
import type { ImportedRecipe, ImportPreview } from "../types/importedRecipe";

const MAX_ARCHIVE_BYTES = 35 * 1024 * 1024;
const MAX_GZIP_ENTRY_BYTES = 4 * 1024 * 1024;
const MAX_JSON_BYTES = 12 * 1024 * 1024;
const MAX_ENTRIES = 2000;

const text = (record: Record<string, unknown>, key: string): string =>
  typeof record[key] === "string" ? record[key] as string : "";

function stableHash(value: string): string {
  // Identity fallback for rare Paprika exports without a uid.
  let hash = 2166136261;
  for (let n = 0; n < value.length; n += 1) {
    hash ^= value.charCodeAt(n);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function toImported(value: unknown): ImportedRecipe | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const name = text(row, "name").trim();
  if (!name || name.length > 500) return null;
  const uid = text(row, "uid").trim();
  const ingredients = text(row, "ingredients");
  const directions = text(row, "directions");
  if (!ingredients.trim() && !directions.trim()) return null;
  const fingerprint = [name, ingredients, directions].join("\u0001");
  const categories = Array.isArray(row.categories)
    ? row.categories.filter((item): item is string => typeof item === "string").slice(0, 100)
    : [];
  return {
    id: "paprika:" + (uid ? encodeURIComponent(uid) : "no-uid-" + stableHash(fingerprint)),
    paprikaUid: uid || null,
    name,
    ingredients,
    directions,
    description: text(row, "description"),
    notes: text(row, "notes"),
    servings: text(row, "servings"),
    prepTime: text(row, "prep_time"),
    cookTime: text(row, "cook_time"),
    totalTime: text(row, "total_time"),
    source: text(row, "source"),
    sourceUrl: text(row, "source_url"),
    categories,
  };
}

/**
 * Reads a Paprika bulk export entirely on-device. ZIP members ending in
 * .paprikarecipe hold GZIP-compressed JSON, sometimes with base64 images.
 * Images are deliberately discarded in this text-only first milestone.
 */
export async function parsePaprikaFile(file: File): Promise<ImportPreview> {
  if (!file.name.toLowerCase().endsWith(".paprikarecipes")) {
    throw new Error("Choose a Paprika Recipe Format (.paprikarecipes) export.");
  }
  if (file.size > MAX_ARCHIVE_BYTES) {
    throw new Error("This export is over 35 MB. Try exporting a smaller Paprika category.");
  }
  if (file.size === 0) throw new Error("That export file is empty.");
  let entryCount = 0;
  let tooLarge = 0;
  let tooMany = false;
  const bytes = new Uint8Array(await file.arrayBuffer());
  let extracted: Record<string, Uint8Array>;
  try {
    extracted = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
      unzip(bytes, {
        filter: (info) => {
          if (!info.name.toLowerCase().endsWith(".paprikarecipe")) return false;
          entryCount += 1;
          if (entryCount > MAX_ENTRIES) { tooMany = true; return false; }
          if (info.originalSize > MAX_GZIP_ENTRY_BYTES) { tooLarge += 1; return false; }
          return true;
        },
      }, (err, contents) => err ? reject(err) : resolve(contents));
    });
  } catch {
    throw new Error("This file could not be opened as a Paprika export. Please export using Paprika Recipe Format.");
  }
  if (tooMany) throw new Error("This export has over 2,000 recipes. Please export a smaller category.");
  const seen = new Set<string>();
  const recipes: ImportedRecipe[] = [];
  let skipped = tooLarge;
  for (const compressed of Object.values(extracted)) {
    try {
      // GZIP is the inner Paprika format; an unusual or oversized entry is skipped.
      // GZIP footer stores the decompressed byte count modulo 2^32.
      // Reject oversized records BEFORE allocating the decompressed JSON.
      if (compressed.length < 18) { skipped += 1; continue; }
      const tail = compressed.length - 4;
      const estimatedSize = (compressed[tail] |
        (compressed[tail + 1] << 8) |
        (compressed[tail + 2] << 16) |
        (compressed[tail + 3] << 24)) >>> 0;
      if (estimatedSize > MAX_JSON_BYTES) { skipped += 1; continue; }
      const jsonBytes = gunzipSync(compressed);
      if (jsonBytes.length > MAX_JSON_BYTES) { skipped += 1; continue; }
      const recipe = toImported(JSON.parse(strFromU8(jsonBytes)));
      if (!recipe || seen.has(recipe.id)) { skipped += 1; continue; }
      seen.add(recipe.id);
      recipes.push(recipe);
    } catch { skipped += 1; }
  }
  recipes.sort((a, b) => a.name.localeCompare(b.name));
  if (!recipes.length) {
    throw new Error("No readable recipes were found. Try a smaller export using Paprika Recipe Format.");
  }
  return {
    recipes,
    skipped,
    warning: skipped ? skipped + " unreadable, oversized or duplicate entries were skipped." : null,
  };
}

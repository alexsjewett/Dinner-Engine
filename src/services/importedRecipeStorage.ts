import type { ImportedRecipe } from "../types/importedRecipe";

const DB_NAME = "find-dinner:local-cookbook:v1";
const STORE = "paprika-recipes";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser does not support local recipe storage."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error || new Error("Could not open local cookbook."));
    request.onblocked = () => reject(new Error("Close other Find Dinner tabs and try again."));
  });
}

export async function listImportedRecipes(): Promise<ImportedRecipe[]> {
  const db = await openDb();
  try {
    return await new Promise<ImportedRecipe[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      let recipes: ImportedRecipe[] = [];
      request.onsuccess = () => { recipes = request.result as ImportedRecipe[]; };
      tx.oncomplete = () => resolve(recipes.sort((a, b) => a.name.localeCompare(b.name)));
      tx.onerror = () => reject(tx.error || new Error("Cannot read saved recipes."));
      tx.onabort = () => reject(tx.error || new Error("Cannot read saved recipes."));
    });
  } finally { db.close(); }
}

export async function getImportedRecipe(id: string): Promise<ImportedRecipe | undefined> {
  const db = await openDb();
  try {
    return await new Promise<ImportedRecipe | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result as ImportedRecipe | undefined);
      request.onerror = () => reject(request.error || new Error("Cannot read the recipe."));
    });
  } finally { db.close(); }
}

/** Atomic add-only transaction: an existing Paprika UID is never overwritten. */
export async function saveImportedRecipes(recipes: ImportedRecipe[]): Promise<number> {
  const db = await openDb();
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      let inserted = 0;
      for (const recipe of recipes) {
        const check = store.get(recipe.id);
        check.onsuccess = () => {
          if (check.result === undefined) {
            const write = store.add(recipe);
            write.onsuccess = () => { inserted += 1; };
          }
        };
      }
      tx.oncomplete = () => resolve(inserted);
      tx.onerror = () => reject(tx.error || new Error("Could not save the selected recipes."));
      tx.onabort = () => reject(tx.error || new Error("Could not save the selected recipes."));
    });
  } finally { db.close(); }
}

/** Delete a single saved recipe, after its IndexedDB transaction commits. */
export async function deleteImportedRecipe(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Could not delete recipe."));
      tx.onabort = () => reject(tx.error || new Error("Could not delete recipe."));
    });
  } finally { db.close(); }
}

/** Clear saved recipes only; never delete profiles or other browser data. */
export async function deleteAllImportedRecipes(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Could not delete saved recipes."));
      tx.onabort = () => reject(tx.error || new Error("Could not delete saved recipes."));
    });
  } finally { db.close(); }
}

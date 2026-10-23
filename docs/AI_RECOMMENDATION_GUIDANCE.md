# Kitchen Companion — AI Recipe Recommendation & Adaptation Guidance

**Status:** Approved product behavior / design specification; **not yet implemented** in the live AI algorithm.  
**Recorded:** October 22, 2026 (Pacific time).  
**Scope:** Ranking dinner recipes from the user's Paprika library; suggesting ingredient swaps, omissions, and separately served components; explaining ingredient availability.  
**Source of truth:** This document captures the product owner's decisions. Engineering prompts, screening, validators, UI copy, and tests should implement these rules without silently narrowing them.

## Product philosophy

> Think creatively like an experienced allergen-friendly chef, but recommend conservatively like a practical home cook.

Knowledge of an advanced adaptation does not mean it deserves a high rank. Prefer appealing, familiar recipes with simple, reliable changes over more complicated transformations, all else being comparable. Protect the identity, flavor, texture, and cooking function of the dish. A recipe should sound delicious and be feasible to cook—not merely satisfy keyword matches.

The original Paprika recipe must remain unchanged. All alterations are *suggested* and clearly distinguished from the source recipe.

## Search inputs and their meaning

### Ingredients available (positive signals, not requirements)

- These ingredients may be on hand or ingredients the user is especially interested in using.
- Reward relevant recipes that use one or more available ingredients; **do not require** an exact ingredient match or the use of every entered ingredient.
- Treat other, unmentioned ingredients as **unknown availability**, not automatically missing.
- Consider available ingredients as preferred candidate replacements *when* they are safe for the intended diner(s), culinarily appropriate, and preserve the dish.
- Example: entering broccoli, carrots, peas, butter, and rice may legitimately result in a broccoli-and-rice dish using only part of the list.
- Possible future enhancement (not an input today): distinguish "I really want to use this" from "I happen to have this."

### Ingredients not available (constraints with possible workarounds)

- These are explicitly known to be unavailable, often staples such as rice or soy sauce.
- **Do not recommend cooking the ingredient as written**; however, a recipe can still qualify if an appropriate substitution or sensible omission makes the dish work.
- A good replacement need **not** be in the available-ingredients field. Prefer replacements on hand, but allow additional suggested purchases; clearly indicate when a replacement is *not confirmed on hand*.
- Decide whether optional garnishes should be omitted or replaced based on their culinary role in that particular recipe.
- If no credible workaround exists without substantially damaging the dish, exclude it or rank it well below viable candidates—not as a straightforward match.
- Example: pinto beans can replace unavailable black beans in many burrito bowls. Simply removing an essential ingredient from a recipe is not a valid workaround.

### Food restrictions and selected diners

Apply restrictions to the diner(s) selected for the search, including existing Vegetarian, Vegan, and Gluten-free dietary needs. Consider explicit restrictions at three levels:

| Level | Behavior |
| --- | --- |
| **Must avoid** | The restricted item must not be included in that diner's served portion. A recipe can qualify only if omission, a high-quality compatible substitution, or safe and genuinely separate serving/preparation resolves the conflict. If no valid adaptation exists, exclude it. |
| **Should avoid** | Meaningful negative ranking signal, especially when the ingredient defines the dish (e.g., tomato marinara for someone avoiding tomatoes). Minor optional ingredients can be acceptable; favor simple adaptations. |
| **Prefer to avoid** | Lighter ranking penalty. Favor avoiding it when otherwise comparable, but a strong recipe containing a minor amount can still rank well. |

- An ingredient's *role and prominence* matter. Olives as a minor salad topping differ from tomatoes as the foundation of a marinara.
- **Safety is not inferred from the search form alone.** "Must avoid" can reflect allergies or other essential needs. Serving an ingredient separately does *not* resolve potential cross-contact for every diner. Recommend separate serving only where the diner can safely avoid the ingredient; for ambiguous allergy-sensitive situations, do not present separation as proven safe.
- Do not label a recipe allergy-safe, gluten-safe, or cross-contact-safe based only on model reasoning. Preserve deterministic restrictions and conservative handling of uncertain packaged ingredients/labels.
- "Should" and "Prefer" may remain eligible without a modification; their impact is primarily ranking and optional explanation, unlike a Must-avoid conflict that must be resolved.

## How to propose an adaptation

Evaluate three distinct methods. Choose what works best in context, not a generic swap:

1. **Substitute:** Replace an original ingredient with one that performs its relevant flavor, structural, thickening, binding, fat, liquid, or other function.
2. **Omit:** Remove a genuinely optional ingredient without making the recipe unappealing or nonfunctional.
3. **Separate:** Serve an optional topping/side separately or otherwise adapt preparation for selected diners *only if practical and appropriate for the restriction*.

Always assess:
- **Dietary compatibility:** The proposed *served result* respects Must-avoid and dietary constraints.
- **Culinary compatibility:** It performs the needed food-science function in this recipe.
- **Dish identity and quality:** The final flavor, texture, and recognizable character remain appealing.
- **Complexity and practicality:** Added ingredients, technique, time, shopping, and separate preparation should count against a recommendation when otherwise comparable.

Prefer conventional like-for-like changes, but allow skilled allergen-friendly culinary adaptations at lower priority when justified. Never substitute just because both terms are vegetables or share an ingredient category: broccoli is not an oregano replacement.

### Qualitative adaptation tiers (guidance, not fixed score weights)

| Tier | Illustration | Ranking guidance |
| --- | --- | --- |
| **1 — Natural fit / trivial change** | A compatible curry already satisfies the selected diners; coconut milk replaces dairy milk where appropriate | Highest priority when other factors are comparable |
| **2 — Easy omission or separation** | Leave out minor salad olives; serve optional cheese separately when appropriate | Little penalty if dish remains excellent |
| **3 — Moderate adjustment** | A cashew-based cream substitute in a compatible pasta sauce | Moderate penalty for added ingredients/technique |
| **4 — Major transformation** | Egg quiche becomes tofu/nutritional-yeast vegan quiche with revised preparation | Possible, but substantial penalty versus simpler equally appealing meals |
| **5 — Not a credible adaptation** | An implausible replacement that fundamentally undermines tomato marinara | Do not present as a suitable adaptation |

These examples are contextual, not universal ingredient equivalencies. For example, coconut milk is not a good milk replacement in *every* dish.

## Qualification and ranking

1. **Feasibility first:** Reject recipes whose Must-avoid/dietary conflicts or unavailable essentials cannot be credibly resolved. Do not reject merely for an available-ingredient nonmatch.
2. **Prefer minimal, excellent adaptations:** Naturally compatible dishes and simple high-quality changes should usually outrank major transformations.
3. **Rank among viable recipes** using culinary appeal and intact dish identity, available-ingredient relevance, practical shopping burden, selected diners' Should/Prefer restrictions, preparation time, and adaptation complexity.
4. **Prefer on-hand substitutions**, but do not exclude a strong recipe solely because the best replacement is unmentioned or must be obtained.
5. **Do not allow keyword overlap to overpower overall quality.** A recipe matching four on-hand items but requiring awkward swaps should usually rank below an excellent recipe matching one item with little modification.
6. Treat the result as a *suggestion*, not an authoritative safety classification. Only return original recipe IDs from the supplied library; do not invent dishes or silently modify source data.

Exact score weights and tie-breakers are **not yet specified**. They should be calibrated with realistic recipes and tests rather than invented here.

## What the user should see

- A short, specific explanation for *why* each recommendation fits; avoid repetitive generic review/safety boilerplate in every card.
- If a modification is needed, identify the **original ingredient, method** (substitute / omit / separate), **new ingredient if any**, and a practical culinary reason.
- Show **On-hand match** separately from **Other ingredients needed**.
- "Other ingredients needed" should account for ingredients in the intended adapted recipe not confirmed as available, **without asserting that every unmentioned ingredient is actually missing**. Don't include correctly omitted ingredients; show substitutions/purchases as needed. Users are not expected to enter every pantry item.
- Surface a concrete restriction or uncertain ingredient issue when material to a specific recipe. Never claim that AI has certified food or cross-contact safety.

## Example evaluation scenarios

| User input and recipe | Expected behavior |
| --- | --- |
| Have broccoli, carrots, peas, butter, rice; good recipe only uses broccoli/rice | Eligible; positive relevance, no penalty for unused pantry items |
| Have broccoli; tempting recipe has no broccoli | May still recommend if it is the better feasible dinner |
| Rice explicitly unavailable; rice-based dish has no credible alternative | Exclude or strongly deprioritize; not a straightforward suggestion |
| Black beans unavailable; burrito bowl uses black beans | Suggest pinto beans when compatible; disclose if pinto beans aren't confirmed on hand |
| Sesame seeds unavailable, only garnish | Decide whether to omit based on dish; don't mechanically exclude |
| Coconut milk on hand, curry requests dairy milk | Prefer easy swap when flavor/texture and restrictions permit |
| Vegan diner, traditional egg quiche | Tofu/nutritional-yeast transformation may be possible, but lower priority than simpler attractive vegan-compatible meals |
| Must avoid olives; olives are optional salad topping | Omit or serve separately if that truly resolves this diner's restriction |
| Should avoid tomato; tomato marinara | Heavy ranking penalty because tomato defines the dish |
| Original recipe has oregano; user has broccoli | Never invent broccoli-for-oregano substitution |
| Explicit Must-avoid ingredient in a sauce, with no satisfactory workaround | Exclude regardless of pantry overlap |
| User lists only broccoli on hand; recipe needs oil, salt, garlic | Display unconfirmed additional ingredients without assuming user is out of all staples |

## Implementation map (future work, **not activated by this document**)

- **Canonical product guidance:** `docs/AI_RECOMMENDATION_GUIDANCE.md` (this document).
- **Existing runtime request prompt:** `backend/src/paprikaModelDraft.ts` builds the OpenAI Responses API `instructions` string and structured JSON response schema. The model receives those generated instructions and current request data; it **does not automatically read repository Markdown files**.
- **Existing deterministic eligibility and substitutions:** `backend/src/recipeRelevance.ts`, `backend/src/realPaprika.ts`, and `backend/src/aiPilot.ts`. These gates must be updated *together* with the prompt. Editing only prompt text will not allow recipes the server already excludes.
- **Existing response validation:** `backend/src/paprikaModelDraft.ts` and `backend/src/aiPilot.ts`, including strict schema and ID validation. Keep independent validation, budget caps, explicit opt-in, untrusted-recipe handling, and no automatic retries.
- **Existing browser search/UI:** `src/services/aiPaprikaRequest.ts`, `src/services/aiRecommendationDisplay.ts`, and the recommendation cards. Preserve "Other ingredients needed" and ensure UI terminology reflects true/unknown ingredient availability.
- **Recommended next implementation:** keep this document as the human-readable source of truth; create a **versioned server-side recommendation prompt/module** aligned with it, potentially bundling a `.md` prompt at build time if deployment tooling supports that safely. Do not fetch the prompt live from GitHub or expose server prompting as browser-owned logic. Update eligibility, substitution verification, structured output, and regression tests in the same planned change.
- **Known current mismatches to fix:** mandatory at-least-one on-hand match; rejecting all explicitly unavailable ingredient matches before substitution; blanket Must-avoid text filtering even where an appropriate adaptation is possible; only one swap from a narrow hard-coded whitelist and only from entered on-hand ingredients; response contract not clearly representing omission/separation; cross-batch ranking that cannot directly compare all candidate quality. The current system therefore **does not yet follow this specification**.

## Acceptance conditions for implementation

- Add focused tests for every scenario above using representative Paprika recipe text, including ambiguous ingredient names and allergies/cross-contact cases.
- Ensure suggestions never violate deterministic Must-avoid protections; do not accept an unverified modification merely because the model says it works.
- Verify ranking prefers excellent, low-complexity adaptations over higher ingredient-overlap recipes needing major changes.
- Verify the model can suggest reasonable substitutions not on hand while accurately identifying additional ingredients.
- Verify existing cost/consent/security controls, response validation, fallback to normal matching, and preservation of original recipe data.
- Review user-visible wording on iPhone for specific, concise adaptations and the "Other ingredients needed" section before deploying.

**Change control:** This file records agreed behavior only. Production code, model prompt, schema, tests and deployment require a separately scoped implementation change.

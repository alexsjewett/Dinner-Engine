# Dinner Engine

A mobile-first, iPhone-friendly web application that helps a household choose what to cook based on available ingredients, missing staples, time, and household food restrictions, while proposing substitutions for human review.

**Status:** Phase 1, Milestone 1B source committed. First foundation build confirmed by product owner; new library changes require testing.

## Product vision
Dinner Engine is a companion to Paprika Recipe Manager, not a replacement. Start with a single household and ten placeholder recipes; design for future independent households, each with its own cookbook, profiles, and AI usage/payment arrangement.

## Core experience
- **Find Dinner:** ingredients on hand, missing ingredients, time (15, 30, 45, or 60+ minutes), selected eaters; up to three explainable dinner suggestions.
- **Recipe Library:** browse recipes, summaries, estimated cook times, and full original instructions. Adding recipes is coming soon in Phase 1.
- **Profiles:** add/edit people and lists of foods they avoid, with a whole-family selection option.
- **Recipe Details:** preserve original recipe text; show any possible swaps separately with explanations, including uncertainty.

## Safety
Never claim a recipe is allergy-safe from AI reasoning alone. Exclude known restricted ingredients using deterministic checks; flag ambiguous ingredients, packaged products, sauces, and unverified substitutions for manual review. Treat AI substitutions as suggestions, not safety certifications.

## Phase roadmap
1. **Phase 1 – Working prototype:** React + TypeScript, mobile interface, ten sample recipes as individual files, profiles, navigation, state retention, transparent rule-based matching. No live AI yet.
2. **Phase 2 – AI:** secure backend, provider comparison, cost controls, AI-generated summaries/time estimates and contextual substitutions.
3. **Phase 3 – Cookbook:** Paprika and other recipe imports, longer-term storage.
4. **Phase 4 – Production:** accounts, secure multi-household isolation, cross-device persistence, billing options, reliability and deployment polish.

Phase numbers describe planning sequence, not delivery commitments.

## Engineering principles
- Use a private GitHub repository during initial development.
- Prefer low ongoing costs; preserve the option to compare AWS Bedrock (boto3/InvokeModel) with other AI APIs.
- Separate frontend, backend and AI-provider concerns as the app evolves.
- Model recipes/profiles as belonging to a household; a household ID alone is **not** an authorization/security boundary.
- Never expose API credentials in browser code.
- Agree on the scope of each code-writing step and obtain explicit approval before creating or editing application code.

## Project documents
- [Decision register](docs/DECISIONS.md)
- [Future features and roadmap](docs/FUTURE_FEATURES.md)
- [Key learnings](docs/KEY_LEARNINGS.md)

## Current development state
React/TypeScript frontend foundation and ten static sample recipes are present. No backend, production recipe database, AI integration, or deployment is present. Hosting, persistence, API provider, authentication, and final implementation architecture remain to be confirmed in a technical design checkpoint.

## Milestone 1A — Application foundation (October 20, 2026, Pacific time)
The React + TypeScript + Vite app foundation, page placeholders, fixed mobile bottom navigation, and CSS theme have been added. This is source code, **not a deployed website**. No recipe data, profile editing, recipe matching, AI, backend, or hosting were implemented.

### How to run locally (once Node.js 22.12+ is installed)
1. Open a terminal in the repository folder.
2. Run `npm install` to install dependencies (this generates a package lock file).
3. Run `npm run dev` and open the local address it prints.
4. Run `npm run build` to type-check and generate a production build.

The product owner verified the Milestone 1A build and preview successfully using GitHub Codespaces. Milestone 1B changes must be rebuilt and tested. Publishing and iPhone access are separate future steps.

## Milestone 1B — Sample Recipe Library (October 20, 2026, Pacific time)
- Ten sample dinner recipes are stored as separate JSON files in `src/data/recipes/`.
- Recipe cards and details screens now show cooking time, description, original ingredients and instructions.
- A placeholder explains that AI substitutions are not active, and importing recipes remains a coming-soon feature.
- A small `cookbook.ts` data-access module keeps the UI independent of the future storage layer.
- Samples are demonstration content, not Paprika exports. No ingredient safety certification or AI analysis has occurred.
- Run `git pull` and `npm run build` in your existing Codespace to verify this milestone. The repository has not been deployed.

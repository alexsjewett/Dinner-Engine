# Dinner Engine — Decision Register

Record meaningful product and technical decisions here. Use **Approved**, **Proposed**, **Open**, or **Superseded** and preserve prior decisions when directions change.

| ID | Status | Decision / question | Rationale and trade-off |
|---|---|---|---|
| DEC-001 | Approved | Build an iPhone-friendly, mobile-first Dinner Engine as a companion to Paprika, not a replacement. | Focus the product on deciding what's for dinner. |
| DEC-002 | Approved | Start with one household; aim eventually to serve separate users and families. | Avoid overbuilding the MVP while preserving a scalable domain model. |
| DEC-003 | Approved | Use React and TypeScript for the website. | Modern component-based UI and type checking; creates a learning curve. |
| DEC-004 | Superseded by DEC-026 | Store project source and documentation in GitHub; keep the repository private initially. | Version history and privacy during development; publication can be reconsidered. |
| DEC-005 | Approved | Require agreement and explicit approval before writing/editing application code. | Keeps the product owner involved in implementation choices. |
| DEC-006 | Approved | Split the work into phases; Phase 1 is a functioning prototype without live AI integration. | Validate product UX before backend and AI complexity. |
| DEC-007 | Approved | Build toward automatic, in-app AI using a separately billed API; a ChatGPT subscription does not cover third-party application API calls. | Seamless end-user UX, with some incremental usage costs. |
| DEC-008 | Approved | Minimize AI cost through deterministic filtering/ranking, reuse of stored summaries/time estimates, selective model calls, and usage controls. | Cheaper and more explainable; maintain manual review of safety uncertainties. |
| DEC-009 | Approved | Separate original recipes from suggested substitutions; never claim AI-established allergy safety. | Limits misleading safety assurances. |
| DEC-010 | Approved | Maintain README, decisions, future features, and key learnings as living GitHub Markdown documentation. | Preserves traceability and technical-PM education. |
| DEC-011 | Approved | Include Find Dinner, Recipe Library, Profiles, and Recipe Details in Phase 1; ten placeholder recipes and a coming-soon import affordance. | End-to-end prototype scope with limited data. |
| DEC-012 | Approved direction | Assign stable identifiers and associate recipes/profiles with a household in the data model. | Prepares for expansion, but does not itself provide secure separation. |
| DEC-013 | Approved for a later Phase 1 milestone | Use individual JSON files for placeholder recipes and browser-local storage for prototype profile persistence. | Simple and cheap; does not synchronize across devices. |
| DEC-014 | Proposed | Later use a secure backend for AI calls, potentially Python/boto3 with AWS Lambda/API Gateway and Amazon Bedrock InvokeModel. | Supports the original AWS learning goal; provider and deployment not yet finalized. |
| DEC-015 | Open | Select AI provider/models after comparing Bedrock and alternatives on substitution quality, cost and API behavior. | Avoid premature vendor lock-in. |
| DEC-016 | Partially resolved by DEC-027 | Choose deployment and data persistence approach, including GitHub Pages limitations and private-repo publishing eligibility. | Must support iPhone testing without exposing secrets. |
| DEC-017 | Open | Choose future authentication, household authorization, billing, quotas and cloud storage. | Needed for multi-household production, not Phase 1. |

## Process
- Before implementation, review the exact scope and obtain approval.
- At each milestone, update decision statuses, future backlog and learnings.
- An approved *direction* does not automatically approve a particular implementation or code change.
- When changing a decision, mark the old entry **Superseded** and add a new entry explaining why.

## Initial record
Initial agreements were made during product discussions on October 20, 2026 (Pacific time). The first documentation setup was authorized separately on the same date. This register summarizes those discussions; it is not evidence that proposed technical architecture has been implemented.

## Milestone 1A implementation decisions — October 20, 2026 (Pacific time)
| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-018 | Approved and implemented | Bootstrap React/TypeScript with Vite; use declarative React Router for four placeholder routes. | Small, understandable foundation; avoids backend and framework complexity for now. |
| DEC-019 | Approved and implemented | Use shared CSS variables for a cream/sage design, rounded cards and fixed safe-area-aware bottom navigation. | Mobile-first consistency without adding a styling library. |
| DEC-020 | Approved and implemented | Limit Milestone 1A to navigation, placeholder screens, project setup and documentation. | Real recipe data, matching, profiles, AI, backend and deployment remain out of scope. |
| DEC-021 | Deployment choice resolved by DEC-027; testing ongoing | Choose deployment path and test the build in an environment with npm package access. | Private repository does not imply private deployment; no site is published yet. |

**Implementation note:** The recipe details preview is accessible from both Find Dinner and Recipe Library. It returns to the origin using navigation state when provided, otherwise to Recipe Library. Preserving *actual search input/results* is still a later milestone because no search exists yet.

## Milestone 1B decisions — October 20, 2026 (Pacific time)

| ID | Status | Decision | Rationale |
|---|---|---|---|
| DEC-022 | Approved and implemented | Store 10 demonstration recipes as individual JSON files with stable recipe IDs and a sample household ID. | Simple, inexpensive Phase 1 catalog that can later be imported into durable storage. |
| DEC-023 | Approved and implemented | Implement Recipe Library cards and full original recipe details with a reusable card and separate cookbook service. | Preserve source content while avoiding coupling UI to storage. |
| DEC-024 | Approved and implemented | Display a plain disclaimer and leave possible swaps empty until the AI phase. | Avoid implying that mock data or unverified AI substitutions are safe. |
| DEC-025 | Open | Confirm Milestone 1B build and actual mobile UX in Codespaces. | Saving code is not the same as validating it. |

**Note:** Recipe descriptions and cooking times are illustrative sample values, not AI-generated. `demo-household` is an organizational field, not access control. Find Dinner matching, profile editing, backend, AI and deployment are not included in this milestone.

## Deployment and security checkpoint — October 21, 2026

| ID | Status | Decision | Rationale and trade-off |
|---|---|---|---|
| DEC-026 | Approved | Change Dinner Engine repository visibility to **public**, after initial private development. | Enables GitHub Pages on GitHub Free and simple sharing/testing; source, docs, demonstration recipes and past commit metadata become publicly visible. Visibility may be changed later, but public copies/forks cannot be recalled. |
| DEC-027 | Approved and configured, deployment pending verification | Use GitHub Pages, deploying with GitHub Actions from `main`, with Vite base `/Dinner-Engine/`. | Desired free URL and automatic builds without Codespaces; published static files are public, not private family data storage. |
| DEC-028 | Approved and implemented | Use React Router `HashRouter` for GitHub Pages compatibility. | Direct refresh of nested pages works on static hosting; internal URLs include a `#`. We can revisit this with a backend-supported router. |
| DEC-029 | Approved security requirement for future development | Before AI API/backend deployment, perform a separate security review: backend-only secrets, household authentication/authorization, rate limits and quota enforcement, spending controls and abuse monitoring. | Prevent paid-model misuse and leaks on a public website. **No AI/API implementation is authorized by this decision.** |

The project owner explicitly opted into public GitHub hosting and requested a reminder when paid AI/API development approaches. The repository is currently public; GitHub Pages publication requires Pages Settings and successful workflow execution.

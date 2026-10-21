# Dinner Engine — Decision Register

Record meaningful product and technical decisions here. Use **Approved**, **Proposed**, **Open**, or **Superseded** and preserve prior decisions when directions change.

| ID | Status | Decision / question | Rationale and trade-off |
|---|---|---|---|
| DEC-001 | Approved | Build an iPhone-friendly, mobile-first Dinner Engine as a companion to Paprika, not a replacement. | Focus the product on deciding what's for dinner. |
| DEC-002 | Approved | Start with one household; aim eventually to serve separate users and families. | Avoid overbuilding the MVP while preserving a scalable domain model. |
| DEC-003 | Approved | Use React and TypeScript for the website. | Modern component-based UI and type checking; creates a learning curve. |
| DEC-004 | Approved | Store project source and documentation in GitHub; keep the repository private initially. | Version history and privacy during development; publication can be reconsidered. |
| DEC-005 | Approved | Require agreement and explicit approval before writing/editing application code. | Keeps the product owner involved in implementation choices. |
| DEC-006 | Approved | Split the work into phases; Phase 1 is a functioning prototype without live AI integration. | Validate product UX before backend and AI complexity. |
| DEC-007 | Approved | Build toward automatic, in-app AI using a separately billed API; a ChatGPT subscription does not cover third-party application API calls. | Seamless end-user UX, with some incremental usage costs. |
| DEC-008 | Approved | Minimize AI cost through deterministic filtering/ranking, reuse of stored summaries/time estimates, selective model calls, and usage controls. | Cheaper and more explainable; maintain manual review of safety uncertainties. |
| DEC-009 | Approved | Separate original recipes from suggested substitutions; never claim AI-established allergy safety. | Limits misleading safety assurances. |
| DEC-010 | Approved | Maintain README, decisions, future features, and key learnings as living GitHub Markdown documentation. | Preserves traceability and technical-PM education. |
| DEC-011 | Approved | Include Find Dinner, Recipe Library, Profiles, and Recipe Details in Phase 1; ten placeholder recipes and a coming-soon import affordance. | End-to-end prototype scope with limited data. |
| DEC-012 | Approved direction | Assign stable identifiers and associate recipes/profiles with a household in the data model. | Prepares for expansion, but does not itself provide secure separation. |
| DEC-013 | Proposed | Use individual JSON files for placeholder recipes and browser-local storage for prototype profile persistence. | Simple and cheap; does not synchronize across devices. |
| DEC-014 | Proposed | Later use a secure backend for AI calls, potentially Python/boto3 with AWS Lambda/API Gateway and Amazon Bedrock InvokeModel. | Supports the original AWS learning goal; provider and deployment not yet finalized. |
| DEC-015 | Open | Select AI provider/models after comparing Bedrock and alternatives on substitution quality, cost and API behavior. | Avoid premature vendor lock-in. |
| DEC-016 | Open | Choose deployment and data persistence approach, including GitHub Pages limitations and private-repo publishing eligibility. | Must support iPhone testing without exposing secrets. |
| DEC-017 | Open | Choose future authentication, household authorization, billing, quotas and cloud storage. | Needed for multi-household production, not Phase 1. |

## Process
- Before implementation, review the exact scope and obtain approval.
- At each milestone, update decision statuses, future backlog and learnings.
- An approved *direction* does not automatically approve a particular implementation or code change.
- When changing a decision, mark the old entry **Superseded** and add a new entry explaining why.

## Initial record
Initial agreements were made during product discussions on October 20, 2026 (Pacific time). The first documentation setup was authorized separately on the same date. This register summarizes those discussions; it is not evidence that proposed technical architecture has been implemented.

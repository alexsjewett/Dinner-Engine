# Dinner Engine — Key Learnings

A learning journal for technical product management. Entries are short, plain-language explanations grounded in decisions made for this project.

## Concepts introduced

### React
A JavaScript library for constructing interactive UI from reusable components, such as recipe cards, search controls and navigation. **PM takeaway:** separate user-facing experiences into coherent components and behaviors.

### TypeScript
A typed extension of JavaScript that helps developers detect certain mistakes earlier. **PM takeaway:** types make data contracts (e.g., what a recipe contains) clearer; they do not eliminate runtime errors.

### Repository (repo)
A GitHub-hosted home for project files, code and history. The repository starts private. **PM takeaway:** one shared place for the project's source of truth.

### Commit
A tracked change to the repository, usually accompanied by a description. **PM takeaway:** decisions and code changes should have understandable histories.

### Markdown
A lightweight text format using conventions like `# Heading` and `- list item`. GitHub renders it nicely. **PM takeaway:** readable documentation can live next to code.

### Frontend versus backend
The **frontend** runs in the browser and displays the UI. The **backend** can enforce permissions, store private data and call paid AI services securely. **PM takeaway:** a private GitHub repo is not a substitute for backend security.

### API
A defined way for software components to exchange requests and responses. The Dinner Engine frontend will eventually call a backend API, which can call an AI model. **PM takeaway:** API contracts help teams build components independently.

### AI tokens and usage costs
AI services often meter input and output text in tokens. Sending fewer recipes, caching stable outputs and limiting calls can reduce cost. **PM takeaway:** design for unit economics, not just model quality.

### Deterministic algorithms versus AI
Deterministic code follows explicit rules; generative AI interprets context and proposes responses. **PM takeaway:** use rules for known restriction exclusions and AI for nuanced culinary suggestions, with manual review of uncertain safety information.

### Multi-tenancy
One application serves multiple households while keeping their information separate. **PM takeaway:** including a household ID in records helps future organization, but server-enforced authorization is still required.

### Phased MVP and acceptance criteria
An MVP is a limited but meaningful experience that can be tested end-to-end. Acceptance criteria describe observable behavior that shows a feature works. **PM takeaway:** validate usability and learning before paying for production complexity.

### Configuration and provider flexibility
Keeping AI calls behind an application service can make it easier to change providers. **PM takeaway:** modular design can reduce future switching costs; it still adds some abstraction work today.

## Questions to revisit in technical design
- How do React components and TypeScript data types work together?
- What is the simplest safe way to test an iPhone-friendly website while code is private?
- How should recipe data and local profiles be stored in Phase 1?
- What will require a backend when we add paid AI requests?
- How do we compare model quality and cost using repeatable examples?

## Update convention
After each milestone, add: **Concept**, **Plain-English explanation**, **Where used in Dinner Engine**, and **What I learned / next question**. Keep unresolved questions visible.

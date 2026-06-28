# Contributing to ApplyNest

Thanks for contributing.

## Local Setup

1. Install dependencies:
   - `npm install`
2. Run quality checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run check-format`
   - `npm run build`

## Branching

- Default branch is `main`.
- Create feature branches from `main`.
- Keep pull requests focused and small when possible.

## Pull Requests

- Use the pull request template.
- Describe the change and why it is needed.
- Include screenshots for UI changes.
- If extension permissions or manifest entries change, explain and justify the change.

## Coding Guidelines

- Use TypeScript for new logic.
- Keep changes scoped to the touched extension context (popup/options/sidepanel/content/background).
- Prefer small, testable units and explicit error handling.
- Run all local checks before opening a pull request.

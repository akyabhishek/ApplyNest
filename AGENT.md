# ApplyNest Agent Context

ApplyNest is a React and TypeScript Chrome Manifest V3 extension. Use this context when developing, debugging, reviewing, or validating the repository.

## Repository Map

- `src/background/service-worker.ts`: background business logic, runtime message routing, storage operations, side-panel behavior, and dynamic content-script registration.
- `src/content/index.ts`: page-context form detection, floating action button, suggestions, and direct field insertion.
- `src/popup/popup-app.tsx`: compact launcher and recent-copy workflow.
- `src/options/options-app.tsx`: full vault CRUD, templates, setup, and import/export.
- `src/sidepanel/sidepanel-app.tsx`: fields/templates search, sorting, arranging, copying, and insertion.
- `src/shared/messaging.ts`: runtime-message availability check and response wrapper.
- `src/shared/storage.ts`: state persistence, field CRUD, search scoring, and recent-copy data.
- `src/shared/types.ts`: state, message-related result, and domain types.
- `src/shared/icon-map.ts`, `src/shared/icon-picker.tsx`: icon resolution and selection.
- `src/shared/cn.ts`: conditional Tailwind class merging.
- `vite.config.ts`: multi-entry build configuration for popup, options, side panel, service worker, and content script.
- `public/manifest.json`: Manifest V3 permissions, commands, content-script matches, and extension entry points.

## Context Boundaries

Treat each runtime context as an independent entry point:

1. **Service worker** runs in the background and may restart. Do not rely on in-memory state for persistence.
2. **Content script** runs in web pages and must be emitted as a classic non-module content script. Keep required messaging helpers local; do not add imports from shared modules to `src/content/index.ts` unless the build output is verified to remain compatible with Chrome content scripts.
3. **Popup**, **options**, and **side panel** are separate React documents. They can share source modules, but each has its own mount point and lifecycle.

When changing cross-context behavior, trace the complete path: UI sender, message type, service-worker handler, content-script receiver, response type, and UI error state. Search for every existing use of a message before renaming or changing its payload.

## Messaging and Storage Rules

- Preserve the repository's discriminated message shape with an explicit `type` and optional `payload`.
- Use `sendRuntimeMessage` from `src/shared/messaging.ts` in contexts where shared modules are supported, and handle runtime-unavailable errors.
- Keep content-script message code compatible with its non-module bundle constraint.
- Preserve the current insertion message names and result contract. `InsertValueResult` uses `ok` plus optional `NO_TARGET`, `NO_ACTIVE_TAB`, or `CONTENT_UNAVAILABLE` reasons.
- Treat `src/shared/types.ts` and the active message handlers as authoritative. Repository notes may describe historical routing and must be checked against source before use.
- Use `getState` and `setState` from `src/shared/storage.ts` rather than duplicating persistence logic. The storage layer uses `chrome.storage.local` when available and a `localStorage` fallback otherwise.
- Preserve the `applynest_state_v1` storage key and existing state shape unless a migration is deliberately designed.
- After mutations in a React Query context, invalidate the relevant query data so views do not display stale state.
- Keep optional fields optional, especially `VaultField.icon`, and provide the established icon fallback when rendering.

## Change Workflow

1. Identify the owning context and the nearest function that directly controls the behavior.
2. Read the related type, message sender/receiver, storage helper, and entry-point wiring before editing.
3. Make the smallest focused TypeScript/React change. Preserve existing public message names and UI behavior unless the request requires a contract change.
4. If changing extension behavior, inspect `public/manifest.json` and `vite.config.ts`. Add permissions, host matches, or entry points only when required, and explain permission changes in the PR.
5. Keep UI changes scoped to the affected document and preserve responsive behavior, existing styles, icons, and keyboard flows.
6. For security-sensitive changes, avoid exposing private user data in logs or messages and follow `SECURITY.md`.

## Validation

Run the narrowest relevant check first, then the complete local checks before finishing:

```powershell
npm run typecheck
npm run lint
npm run check-format
npm run build
```

Use `npm run bundle` when validating the release ZIP. It builds `dist/` and creates `release/ApplyNest-extension.zip`.

For manual extension validation:

1. Run `npm run build`.
2. Open `chrome://extensions/` and enable Developer mode.
3. Choose **Load unpacked** and select the generated `dist/` directory.
4. Exercise the changed context: popup, options, side panel, background command, or supported job-site content script.
5. Reload the extension after rebuilding and check the browser console for service-worker and content-script errors.
6. For content-script changes, verify form detection, insertion, fallback reasons, and behavior on a supported host.

## Common Pitfalls

- Do not import shared modules into the content script without checking the generated `dist/assets/content.js`; Chrome content scripts configured by `manifest.json` must load correctly.
- Do not assume the service worker remains alive or that its in-memory sets survive restart.
- Do not bypass the storage abstraction or silently change the persisted state shape.
- Do not broaden form selectors to include hidden or submit controls; preserve safe field detection.
- Do not forget the response path when adding a message handler, including the default/error response.
- Do not rely on a single context's cache after a mutation; refresh or invalidate the affected query.
- Do not make manifest permission or host-permission changes without reviewing their security and privacy impact.
- Keep `package.json` and `public/manifest.json` versions synchronized when preparing a release.

## Release and Security

- Keep pull requests focused and include screenshots for UI changes.
- Before release, run all checks and verify the generated manifest and assets in `dist/`.
- `npm run release:push` creates the GitHub release tag using the manifest version; inspect version changes before running it.
- Report vulnerabilities privately through GitHub Security Advisories. Do not disclose security bugs in public issues.
# ApplyNest Chrome Extension

ApplyNest is a local-first Chrome extension that speeds up repetitive job applications with:

- reusable profile vault fields and cover letter templates
- command-style quick search and one-click copy
- floating in-page widget on job portals
- Smart Form Detection suggestions beside inputs
- AI-assisted setup for importing profile details into the vault

## Stack

- Chrome Manifest V3
- React + TypeScript + Vite
- Tailwind CSS
- React Query
- Framer Motion

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Build extension assets:

```bash
npm run build
```

3. Load extension in Chrome:

- Open `chrome://extensions`
- Enable Developer Mode
- Click Load unpacked
- Select the `dist` folder

## Development

Run the Vite dev server for UI iteration:

```bash
npm run dev
```

Note: Chrome extension contexts (service worker/content script) are validated from production build in `dist`.

## Current Baseline

- popup: search/copy launcher with recent history
- options: manage fields, templates, import/export, AI setup, and scoped delete actions
- side panel: compact quick context view with Fields/Templates tabs and sort controls
- content script: floating button and inline field suggestions
- background: message routing, search, copy history, form candidate mapping

## Key Features

- Fields vault for personal, professional, education, FAQ, and link data
- Template vault for reusable cover letters and job-tailoring content
- Guided setup and AI Based Setup flows for fast vault creation
- Side panel tabs for switching between fields and templates
- Scoped delete flow that can remove only fields, only templates, or everything
- Export/import support for backing up and restoring the full vault state
- Search and copy flows across popup, side panel, and in-page suggestions

## Next Priorities

- portal-specific detector adapters
- robust field confidence tuning and undo actions
- more advanced template variable resolution
- end-to-end tests for LinkedIn, Greenhouse, Lever, Workday

## Contributing and Security

- Contribution guide: see `CONTRIBUTING.md`
- Security policy: see `SECURITY.md`

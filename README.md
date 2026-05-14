# Smart Tab Group

Smart Tab Group is a Manifest V3 browser extension for Microsoft Edge and Chromium browsers that keeps a crowded tab workspace manageable. It scans open tabs, normalizes URLs, detects duplicates, focuses the tab that already exists, and applies conservative tab grouping plans with readable names.

## Project Overview

The MVP is intentionally lightweight:

- no backend server
- no account or sync requirement
- no telemetry
- no aggressive page-content inspection
- no silent bulk tab closing

The current implementation covers:

- tab scanning with `chrome.tabs.query`
- URL normalization for duplicate detection
- rule-based duplicate detection with entity-aware matching
- focus-existing-tab behavior for newly opened duplicates
- grouping plans and tab group application
- popup UI for scan, grouping, duplicate close, ungroup, and settings
- local persistence via `chrome.storage.local`

## Screenshots

Screenshot placeholders:

- `docs/screenshots/popup-summary.png`
- `docs/screenshots/grouped-tabs.png`
- `docs/screenshots/settings.png`

## Installation

### Microsoft Edge

1. Open `edge://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository folder.
5. Pin the extension if you want quick access from the toolbar.

### Chrome / Chromium

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository folder.

## Permissions

The extension requests only the permissions needed for the MVP:

- `tabs`: scan tabs, focus existing tabs, and close duplicates when explicitly allowed
- `tabGroups`: create, title, color, and remove tab groups
- `storage`: persist settings, scan summaries, and action history

## Safety Philosophy

Safety is the default posture:

- duplicate auto-focus is allowed
- duplicate auto-close is limited to the newly opened duplicate tab
- bulk close requires explicit popup action
- grouping can run in dry-run mode
- pinned tabs are excluded from grouping plans
- ignored domains can be configured by the user

## Architecture

```text
smart-tab-group/
  manifest.json
  src/
    background/
      background.js
    core/
      duplicateDetector.js
      groupApplier.js
      groupPlanner.js
      settings.js
      tabClassifier.js
      tabScanner.js
      urlNormalizer.js
    popup/
      popup.css
      popup.html
      popup.js
    utils/
      debounce.js
      logger.js
```

## Development Setup

No build step is required for the MVP.

1. Clone the repository.
2. Load it as an unpacked extension in Edge or Chrome.
3. Open the popup and run `Scan Tabs`.
4. Keep `Dry-run mode` enabled until you are ready to apply real grouping.

## How It Works

### Duplicate Detection

Duplicate detection currently uses layered rules:

1. exact normalized URL
2. same extracted entity id
3. same canonical host + path

Normalization removes common tracking parameters, lowercases hostnames, strips trailing slashes, and sorts query parameters.

### Grouping

Grouping is generic, not limited to work tabs. The planner currently uses:

- known host presets
- extracted entities
- category heuristics
- hostname fallback naming

Examples of generated titles include:

- `GitHub`
- `Jira MAP`
- `Docs`
- `Logs & Dashboards`
- hostname-derived workspace names

## Roadmap

### Phase 2

- content script metadata extraction
- better semantic grouping
- custom grouping rules
- inactivity detection
- workspace snapshots

### Phase 3

- AI naming
- semantic clustering
- local embedding model
- workspace recommendations
- automatic cleanup suggestions
- task/context understanding

## Notes

This MVP is designed to be practical first. Some browser pages such as internal extension or settings pages may expose limited metadata to extensions, so duplicate detection and grouping intentionally focus on safe, accessible tabs.

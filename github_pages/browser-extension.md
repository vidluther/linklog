---
layout: single
title: Browser Extension
permalink: /browser-extension/
toc: true
---

A Chrome/Safari MV3 browser extension that lets you save links to your Linkblog with one click, a right-click context menu, or a keyboard shortcut.

## Supported Browsers

- **Chrome** — primary target, full feature support
- **Safari** — supported via `browser` namespace shim (`globalThis.browser ?? globalThis.chrome`). **Caveat:** Safari does not support the `notifications` API, so notification calls silently no-op.

## Installation

### Build from Source

From the repository root:

```bash
pnpm build:extension
```

This runs lint, typecheck, and compilation. The built extension lands in `browser-extension/dist/`.

To clean and rebuild:

```bash
pnpm clean:extension && pnpm build:extension
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/dist/` directory
5. The Linkblog icon appears in your toolbar

### Load in Safari

1. Open Safari → Settings → Advanced → enable "Show features for web developers"
2. Open Develop menu → enable the extension
3. Follow Safari's prompts to allow the extension

## Configuration

Click the Linkblog extension icon to open the popup. Scroll to the **Settings** section:

1. **API Key** — enter your `x-api-key` value (the raw key starting with `lb_`)
2. **API Endpoint** — set to your links endpoint, e.g. `https://api.linkblog.in/alice/links` (replace `alice` with your username)
3. Click **Save Settings**

Settings are stored in `browser.storage.sync` and persist across browser sessions.

## Usage

There are three ways to save a link:

### 1. Popup

1. Navigate to the page you want to save
2. Click the Linkblog extension icon
3. The current page URL is shown automatically
4. Optionally edit the **Title** and **Summary** fields
5. Click **Save to Linkblog**
6. A success or error message appears below the button

### 2. Context Menu

1. Right-click on any page or link
2. Select **Save to Linkblog**
3. A browser notification confirms success or shows the error

When right-clicking a link, the link's URL is saved (not the current page).

### 3. Keyboard Shortcut

Press **Alt+Shift+L** (same on macOS) to save the current page instantly. A notification confirms the result.

## Development

For development with continuous compilation:

```bash
cd browser-extension
pnpm watch
```

This runs `tsc --watch` and recompiles on file changes. You'll still need to reload the extension in `chrome://extensions/` after changes.

### Project Structure

```
browser-extension/
├── manifest.json              # MV3 manifest (permissions, commands, icons)
├── package.json               # Workspace package (linkblog-extension)
├── tsconfig.json
├── icons/                     # Extension icons (16, 48, 128px)
└── src/
    ├── background/
    │   └── service-worker.ts  # Context menu, keyboard shortcut, message handler
    ├── popup/
    │   ├── popup.html         # Popup UI
    │   ├── popup.css          # Popup styles
    │   └── popup.ts           # Popup logic (save, settings)
    └── types/
        ├── index.ts           # Shared types and defaults
        └── browser.d.ts       # Browser namespace type declarations
```

### Permissions

The extension requests:

- `activeTab` — access the current tab's URL and title
- `storage` — persist API key and endpoint settings
- `contextMenus` — add "Save to Linkblog" to right-click menu
- `notifications` — show save confirmation notifications
- `host_permissions` for `https://api.linkblog.in/*` — make API requests

# UI Screenshot Gates

Prompt 130 adds a project-local Playwright visual gate:

```bash
npm run test:ui-visual
```

Prompt 132 adds the alpha acceptance route:

```bash
npm run test:ui-alpha
```

The gate runs in Chromium through `playwright.config.ts`, using the managed Vite dev server on the configured Playwright port. It does not depend on the Codex in-app browser.

## Captured States

The gate captures screenshots for these deterministic states at 1366x768 and 1600x900:

- R1 town HUD
- R2 road combat route
- R3 crypt combat route
- R4 forest gathering route
- R5 smithy crafting
- R6 bank storage
- R7 housing build mode
- R8 Profession Atlas
- R9 Adventure Map
- spellbook
- inventory tooltip
- settings/help

Screenshots are written as Playwright test artifacts under `output/playwright/test-results/`.

## Blocking Checks

Each state runs DOM geometry checks before its screenshot is accepted:

- no horizontal body scroll;
- every `[data-ui-window]` and `[data-ui-hotbar]` is inside the viewport;
- no visible window overlaps `[data-ui-hotbar]`;
- visible tooltip markup stays inside the viewport;
- `[data-ui-footer]` elements are not clipped;
- visible `[data-ui-text]` boxes do not overlap beyond tolerance;
- Escape closes the active React surface where applicable;
- Tab/focus stays inside Help/Settings for the settings state.

The gate is intentionally approximate. It is meant to fail on recurring unreadable UI classes of bugs, not to replace manual art review.

## Alpha Acceptance Route

`npm run test:ui-alpha` reuses the same viewport pair and adds save/reload, UI reset, tooltip stability, duplicate legacy absence, and performance budget checks. It is documented in `docs/REACT_UI_SCREENSHOT_QA_REPORT.md`.

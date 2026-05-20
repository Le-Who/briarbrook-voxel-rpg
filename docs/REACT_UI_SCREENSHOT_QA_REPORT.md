# React UI Screenshot QA Report

Prompt 132 status: passed for internal alpha acceptance.

## Scripts

```bash
npm run test:ui-visual
npm run test:ui-alpha
```

Both scripts use the project-local Playwright dependency and managed Vite server from `playwright.config.ts`. They do not depend on the Codex in-app browser.

## Latest Evidence

- `npm run test:ui-visual`: passed 2/2 Chromium tests at 1366x768 and 1600x900.
- `npm run test:ui-alpha`: passed 2/2 Chromium tests at 1366x768 and 1600x900.

Artifacts are written under:

```text
output/playwright/test-results/
```

The artifact directory is ignored by git.

## Visual States Covered

`test:ui-visual` captures and checks:

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

`test:ui-alpha` adds an end-to-end acceptance route:

- fresh save;
- inventory/equipment/hotbar agreement;
- spellbook, bank, crafting, build mode, chat, help/settings;
- forest, road, and crypt route transitions;
- Profession Atlas and Adventure Map lazy chunks;
- movement mode save/reload persistence;
- UI reset;
- tooltip mount stability;
- duplicate legacy panel absence;
- DOM/window performance budgets.

## Blocking Checks

- no horizontal body scroll;
- no React UI window outside the viewport;
- no visible window blocking the hotbar;
- no tooltip outside the viewport;
- no clipped action footer;
- no player-facing text overlap above tolerance;
- Escape closes applicable React panels;
- Help/Settings focus stays inside the panel;
- React UI errors and Vite overlays are absent;
- migrated legacy panel selectors are absent.

## Known Limit

Pixel baseline comparison is not enabled yet. The current gate uses screenshots plus deterministic DOM geometry checks to block the overlap classes that triggered this migration.

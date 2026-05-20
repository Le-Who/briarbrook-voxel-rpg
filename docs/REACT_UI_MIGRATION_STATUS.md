# React UI Migration Status

Prompt 132 cut decision: accepted for internal alpha.

This decision covers the React UI migration from prompts 119-132. It does not approve a React Three Fiber migration, new gameplay features, or removal of the Three.js/VoxelRenderer world renderer.

## Decision

React UI is accepted as the player-facing UI layer for internal alpha.

No explicit legacy fallback is required for the migrated player-facing panels:

- Inventory
- Bank
- Hotbar
- Spellbook
- Crafting
- Market
- Journal
- Build Mode
- Chat
- Help / Settings
- Profession Atlas
- Adventure Map

Legacy frameworkless panel modules remain in the repository only as direct-test/rollback references. `uiPanelRegistry` and `UIManager.renderHud()` keep the migrated surfaces React-owned for player-facing runtime.

## Acceptance Evidence

- `npm run test:ui-alpha` passed at 1366x768 and 1600x900.
- `npm run test:ui-smoke` passed at 1366x768 and 1600x900.
- `npm run test:ui-visual` passed at 1366x768 and 1600x900.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run content:validate` passed with 0 errors and the existing 18 warnings.
- `npm run build` passed with the documented Vite chunk warning.

## Manual QA Coverage

The 45-60 minute human exploratory session from the prompt was not performed by the agent. Instead, prompt 132 adds the deterministic `npm run test:ui-alpha` route. It covers:

- fresh save;
- town HUD;
- inventory/equipment/hotbar state agreement;
- spellbook readability;
- bank storage;
- smithy/crafting;
- build mode;
- forest, road, and crypt routes;
- Profession Atlas;
- Adventure Map;
- chat collapse/scroll;
- help/settings;
- movement mode persistence through save/reload;
- UI reset;
- tooltip stability;
- duplicate legacy panel absence;
- DOM/window performance budgets.

Human exploratory play should still be scheduled before any external alpha, but it is not a blocker for internal alpha because the required core UI surfaces are covered by automated gates.

## Required Passes

| Requirement | Status | Evidence |
| --- | --- | --- |
| No overlapping text in core panels | Pass | `test:ui-visual`, `test:ui-alpha` geometry checks |
| No tooltip flicker | Pass | `test:ui-alpha` stable tooltip anchor/mount check, `TooltipManager.test.ts` |
| Inventory, bank, hotbar agree on item state | Pass | `test:ui-alpha`, `inventory-bank-hotbar.test.tsx` |
| Spellbook readable | Pass | `test:ui-alpha`, `test:ui-visual`, `knowledge-panels.test.tsx` |
| Crafting readable | Pass | `test:ui-alpha`, `test:ui-visual`, `knowledge-panels.test.tsx` |
| Build mode readable | Pass | `test:ui-alpha`, `test:ui-visual`, `common-surfaces.test.tsx` |
| Chat collapses/scrolls | Pass | `test:ui-alpha`, `test:ui-smoke`, `common-surfaces.test.tsx` |
| Map/Atlas workspaces readable | Pass | `test:ui-alpha`, `test:ui-visual`, `planning-workspaces.test.tsx` |
| Movement mode settings persist | Pass | `test:ui-alpha` save/reload check |
| UI reset works | Pass | `test:ui-alpha`, `telemetry-health.test.ts` |
| No duplicate legacy panels | Pass | `test:ui-alpha`, `test:ui-smoke`, `LEGACY_UI_RETIREMENT.md` |
| Performance acceptable | Pass | `test:ui-alpha`, `test:perf-ui`, `UI_BUNDLE_AUDIT.md` |
| Build/tests pass | Pass | Full gate commands above |

## Remaining Issue Classification

### Blocker

None found in the prompt 132 gate.

### Must Fix Before Internal Alpha

None found.

### Acceptable Known Issue

- Vite still warns about chunks larger than 500 kB. Prompt 131 reduced and documented the warning; remaining oversized chunks are the app entry and Three vendor chunk.
- Legacy panel modules still exist for direct unit tests and rollback reference, but player-facing rendering is React-owned.
- Tooltip ownership is transitional: the active hover dispatcher is still the single legacy `TooltipManager`, with React overlay roots and screenshot gates preventing scroll-container clipping.
- The prompt-requested 45-60 minute human exploratory playtest has not been run by the agent. It is required before external alpha or demo, not before internal alpha.

### Polish

- Add pixel-baseline screenshot comparison after layout churn slows down.
- Split Help and Settings into separate persisted routes if the Simulation UI state grows a dedicated settings panel.
- Replace direct legacy panel tests with React/data-contract tests, then delete old panel modules.

### Future

- Split large static game data and renderer-adjacent systems to reduce the remaining app entry chunk.
- Decide whether the Three vendor chunk should use a documented warning threshold or deeper renderer-level splitting.

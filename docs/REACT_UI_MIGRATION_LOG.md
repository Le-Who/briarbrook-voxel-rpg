# React UI Migration Log

## Prompt 119 - UI Technology Decision Record

Status: Accepted.

Completed:
- Added `docs/ADR-React-UI-Migration.md`.
- Chose React UI overlay mounted under `#ui-root`.
- Rejected React Three Fiber for this migration pack.
- Documented dependency policy, migration sequencing, Simulation authority, and rollback containment.

Not Done:
- No React dependencies were added in this stage.
- No runtime UI code was changed in this stage.

Validation:
- `npm run lint` passed.

Risks:
- Bundle and runtime cost from React remains unmeasured until the shell and build integration stages.
- Duplicate legacy/React panel rendering must be actively prevented during later migration stages.

## Prompt 120 - React Overlay Shell And Build Integration

Status: Accepted.

Completed:
- Added `react` and `react-dom` runtime dependencies plus React type packages.
- Enabled TSX compilation with `jsx: react-jsx`.
- Added `src/ui/react/` with `App.tsx`, `ReactUIRoot.tsx`, `mountReactUI.tsx`, bridge, registry, and required folder structure.
- Mounted React into a sibling `.react-ui-layer` under `#ui-root` after `Game` initializes, leaving `#game-canvas` and legacy `UIManager` intact.
- Added a React error boundary that shows a recoverable internal-alpha error panel if the React shell crashes.
- Added `uiPanelRegistry` with all stage-120 panels owned by legacy until their migration prompts disable legacy rendering.
- Added focused tests for bridge dispatch/snapshot behavior and explicit legacy/react panel ownership.

Not Done:
- No gameplay panels were migrated yet.
- No legacy panel was disabled yet because every panel still belongs to legacy in this stage.
- No optional Vite React plugin was added; the current Vite/TypeScript setup builds TSX without it.

Validation:
- Red test first: `npx vitest run src/ui/react/tests/react-ui-shell.test.ts` failed on missing bridge module.
- Focused test passed: `npx vitest run src/ui/react/tests/react-ui-shell.test.ts`.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run content:validate` passed with the existing 18 warnings and zero errors.
- `npm run build` passed with the existing large chunk warning.
- Browser smoke at `http://127.0.0.1:5173` confirmed `#game-canvas`, `.react-ui-layer`, `.bb-overlay-layer`, all five overlay roots, no React error panel, and `pointer-events: none` on the empty overlay layer. The browser error log buffer still contains stale fixed entries from prompt 121, so the current DOM error panel check is the accepted signal for this stage.
- Browser smoke at `http://127.0.0.1:5173` confirmed canvas, legacy HUD, tooltip layer, and `.react-ui-layer` coexist without a framework error overlay.

Risks:
- Browser page-scope evaluation could not prove `window.briarbrookGame` directly, likely because the browser automation reads from an isolated world; the source still assigns the debug globals in `src/main.ts`.
- React is now in the main bundle. Bundle and chunk-splitting impact must be measured and documented in prompt 131.
- The shell currently subscribes to every Simulation emit; later selectors must narrow React rendering before real panels migrate.

## Prompt 121 - Game State Bridge Selectors And Command Dispatch

Status: Accepted with one documented adaptation.

Completed:
- Added `src/ui/react/bridge/GameUIBridge.ts` with `getSnapshot()`, `subscribe()`, `dispatchAction()`, `getGame()`, and command helpers.
- Added `src/ui/react/bridge/selectors.ts` with immutable snapshot slices and central selectors for inventory, equipment, bank, hotbar, spell castability, item use state, target/prompt, skills, Profession Atlas, Adventure Map, Build Mode, chat, and window layout.
- Added React bridge context and hooks: `useGameSnapshot`, `useGameCommand`, `useUISetting`, and `useWindowState`.
- Updated the React shell to consume `GameUIBridge` snapshots instead of reading raw `GameState` directly.
- Added tests for item transfer dispatch, hotbar assignment dispatch, and spell castability selectors.
- Kept a backward-compatible `dispatch` alias for the stage-120 bridge test while making `dispatchAction` the React-facing command path.

Not Done:
- No migrated panel consumes the selectors yet.
- `unequipItem` is not gameplay-backed because Simulation has no `UNEQUIP_ITEM` action; the adaptation is documented in `docs/REACT_UI_MIGRATION_IMPLEMENTATION_NOTES.md`.

Validation:
- Red test first: `npx vitest run src/ui/react/tests/game-ui-bridge.test.ts` failed on missing `GameUIBridge`.
- Focused tests passed: `npx vitest run src/ui/react/tests/game-ui-bridge.test.ts src/ui/react/tests/react-ui-shell.test.ts`.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run build` passed with the existing large chunk warning.
- Browser reload smoke confirmed canvas, legacy HUD, tooltip layer, and React coexistence shell still mount.

Risks:
- Snapshot slices are immutable copies, which is safe for React boundaries but may need memoized per-slice selectors as panel migration increases render volume.
- `getGame()` exists only as a scoped escape hatch; React components should continue to use selectors and command helpers.
- The command helper layer currently proves dispatch shape, not Simulation acceptance of every command.

## Prompt 122 - Design Tokens And Layout Primitives React

Status: Accepted.

Completed:
- Added `src/ui/react/theme/tokens.ts` with Briarbrook React token values for spacing, typography, colors, sizes, radii, shadows, z-index layers, motion, and breakpoints.
- Added matching `--bb-*` CSS variables in `src/styles.css`.
- Added React layout primitives in `src/ui/react/components/primitives.tsx`: `GameWindow`, `PanelHeader`, `PanelTabs`, `PanelToolbar`, `SplitPane`, `ScrollArea`, `SlotGrid`, `DataList`, `DetailPane`, `ActionFooter`, `InspectorDrawer`, `StatusRow`, `Badge`, `IconButton`, `Text`, and `EmptyState`.
- Added CSS contracts that keep complex windows structured as header/body/footer, make overflowing bodies use `ScrollArea`, constrain tabs/toolbar overflow, and avoid viewport-specific magic numbers in primitive layout.
- Added compact breakpoint behavior at `max-width: 1366px` for split panes.
- Added server-rendered primitive tests that verify tokens and expected structural classes/roles.

Not Done:
- Existing legacy panels do not use these primitives yet.
- No inventory, spellbook, atlas, or map panel was migrated in this stage.

Validation:
- Red test first: `npx vitest run src/ui/react/tests/layout-primitives.test.tsx` failed on missing token/component modules.
- Focused React tests passed: `npx vitest run src/ui/react/tests/layout-primitives.test.tsx src/ui/react/tests/game-ui-bridge.test.ts src/ui/react/tests/react-ui-shell.test.ts`.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run build` passed with the existing large chunk warning.
- Browser smoke confirmed canvas, legacy HUD, React layer, and `--bb-*` token variables load; stale console entries from an earlier fixed 121 error remain in the browser log buffer, but the current page has no React error panel.

Risks:
- Primitive CSS increases the global stylesheet size; prompt 131 must measure the final bundle/runtime impact.
- These primitives are only protective once migrated panels actually use them.

## Prompt 123 - Window Manager V2 React Workspaces

Status: Accepted as a React-facing contract layer.

Completed:
- Added `src/ui/react/windows/windowManagerV2.ts`.
- Defined React window contracts for docked, floating, modal, workspace, and overlay surfaces.
- Added workspace definitions for `professionAtlas` and `adventureMap` with hotbar-safe large centered layouts, close-on-Esc behavior, non-draggable workspace semantics, and layout persistence eligibility.
- Added mode policies for Exploration, Combat, Crafting, Build, Planning, and Menu/Pause.
- Added dedicated layout presets for Restore Default, Combat, Build, Planning, and Crafting.
- Added versioned v2 persistence migration for older stored window rects.
- Added tests for workspace contracts, hotbar-safe clamping, planning collapse rules, dedicated mode presets, and v1-to-v2 layout migration.

Not Done:
- The legacy DOM `WindowManager` still owns legacy panels until those panels migrate.
- No React window chrome is rendered yet; this stage provides the v2 contract and pure layout policy.
- Collapsed/pinned/window-mode state is not persisted into save data yet beyond the v2 persistence model helper.

Validation:
- Red test first: `npx vitest run src/ui/react/tests/window-manager-v2.test.ts` failed on missing v2 module.
- Focused v2 test passed: `npx vitest run src/ui/react/tests/window-manager-v2.test.ts`.
- Legacy and React window tests passed: `npx vitest run src/ui/react/tests/window-manager-v2.test.ts src/ui/react/tests/layout-primitives.test.tsx src/ui/window-manager.test.ts src/ui/WindowManager.test.ts`.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run build` passed with the existing large chunk warning.

Risks:
- There are now two window-manager layers by design during migration: legacy DOM manager for old panels and React v2 contracts for migrated panels. Prompt 129 must verify no duplicated panel rendering.
- The React v2 contract must become the only owner for each migrated panel as migration proceeds.

## Prompt 124 - Tooltip Popover Modal Layer React

Status: Accepted as a React overlay contract layer.

Completed:
- Added `src/ui/react/components/OverlayLayer.tsx` with stable top-level roots for tooltip, popover, context menu, modal, and toast layers.
- Mounted the empty `OverlayLayer` from `ReactUIRoot` so React-owned overlays are outside future inventory/spellbook/map scroll containers.
- Added `src/ui/react/components/overlayState.ts` with `ReactTooltipController`, viewport-aware `placeOverlay()`, and a throttled toast queue.
- Implemented tooltip placement rules for viewport clamping, edge flipping, and hotbar-safe hover placement.
- Kept empty popover/modal roots pointer-passive so the new layer does not block current world interaction before panels migrate.
- Added overlay CSS z-index contracts, tooltip frame styling, and hotbar-safe toast stacking.
- Added tests for portal root structure, stable tooltip mount count across unrelated ticks, hotbar-safe placement, and repeated toast throttling.

Not Done:
- Legacy tooltip content is not migrated yet; this stage creates the React layer and state contract for migrated panels.
- Context-menu close behavior is represented by portal/event contracts, but no React context menu surface uses it yet.
- Toasts are not wired to gameplay events yet.

Validation:
- Red test first: `npx vitest run src/ui/react/tests/overlay-layer.test.tsx` failed on missing overlay modules.
- Focused overlay test passed: `npx vitest run src/ui/react/tests/overlay-layer.test.tsx`.
- React UI tests passed: `npx vitest run src/ui/react/tests`.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run content:validate` passed with the existing 18 warnings and zero errors.
- `npm run build` passed with the existing large chunk warning.

Risks:
- Real migrated tooltips must use `contentVersion` correctly; otherwise the controller will intentionally ignore rebuilt but semantically identical hover content.
- Prompt 129 still needs to prove legacy and React tooltip ownership does not duplicate player-facing overlays.

## Prompt 125 - Inventory Bank Hotbar React Migration

Status: Accepted with documented adaptations.

Completed:
- Added `src/ui/react/windows/InventoryBankHotbarSurfaces.tsx` with React-owned Inventory, Bank Storage, and Hotbar surfaces.
- Switched `inventory`, `bank`, and `hotbar` ownership to `react` in `uiPanelRegistry`.
- Updated legacy `UIManager.renderHud()` to stop rendering legacy Inventory, Bank, and Hotbar markup when those panels are React-owned.
- Extended the React snapshot with inventory capacity/weight/gold, bank capacity/gold, and hotbar cooldown data.
- Inventory now uses `GameWindow`, `PanelToolbar`, `ScrollArea`, `SlotGrid`, and fixed `ActionFooter`; cells render icon, count, and compact state badges only.
- Bank now uses the same primitives with storage grid, search, Deposit Resources, Withdraw, and Take All actions through Simulation commands.
- Hotbar now renders ten readable React slots with 1-0 labels, active/equipped/missing badges, cooldown overlay support, drag/drop data contracts, and `[` / `]` active-slot navigation.
- Existing drag/drop payload contracts are preserved via DOM data attributes, so React slots still route drops through the existing UI drag bridge and Simulation actions.
- Added CSS for React item slots, hotbar slots, drop feedback, fixed footers, and 1366px compact sizing.

Not Done:
- Deposit Gold was not added because the current Simulation action model has no bank-gold transfer action.
- React window resize is CSS-backed in this stage; persisted React window layout wiring is deferred to the later legacy-retirement/layout consolidation prompts.
- Bank browser smoke was not forced by mutating state; bank rendering and ownership are covered by SSR tests, while runtime opening remains tied to banker interaction.

Validation:
- Red test first: `npx vitest run src/ui/react/tests/inventory-bank-hotbar.test.tsx` failed on missing React surface module.
- Focused test passed: `npx vitest run src/ui/react/tests/inventory-bank-hotbar.test.tsx`.
- React/UI bridge slice passed: `npx vitest run src/ui/react/tests src/ui/dom-rendering-budget.test.ts src/ui/drag-payload.test.ts src/systems/inventory-drag.test.ts src/game/save-load-regression.test.ts`.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run content:validate` passed with the existing 18 warnings and zero errors.
- `npm run build` passed with the existing large chunk warning.
- Browser smoke at `http://127.0.0.1:5173` after restarting the dev server confirmed React inventory/hotbar render, legacy inventory/hotbar/bank are absent, 36 inventory drop targets and 10 hotbar drop targets exist, hotbar/inventory dimensions are readable at 1366x768, and no React error panel is present.

Risks:
- React migrated slots still use the existing legacy global tooltip manager through stable tooltip data attributes; prompt 129 must retire duplicate ownership cleanly when the tooltip layer moves fully React.
- Full bank runtime flow should be re-smoked once prompt 128/129 provide broader UI navigation gates or a test helper for opening service panels without gameplay movement.

## Prompt 126 - Spellbook Crafting Market Journal React Migration

Status: Accepted with local Playwright smoke coverage.

Completed:
- Added `src/ui/react/windows/KnowledgePanelsSurfaces.tsx` with React-owned Spellbook, Crafting, Market, and Journal surfaces.
- Switched `spellbook`, `crafting`, `market`, and `journal` ownership to `react` in `uiPanelRegistry`.
- Updated legacy `UIManager.renderHud()` to stop rendering legacy Spellbook, Crafting, Market, and Journal markup when those panels are React-owned.
- Extended the React snapshot with spellbook filters/view mode, crafting station/queue state, market work order/order state, and journal quest/rumor/area/event summaries.
- Spellbook now uses header, toolbar filters, compact spell cards, `SplitPane`, detail pane, and footer actions; cards keep metadata out of the card body.
- Crafting now uses a station dropdown, recipe list/detail split layout, requirements/output detail, repairs/work-order delivery sections, and fixed action footer.
- Market now uses category/view/search controls, readable order list, detail pane, missing-item progress, pin-to-journal, and delivery actions.
- Journal now uses section list, entries, and detail pane in a split workspace-like layout instead of one dense text panel.
- Added CSS overrides so knowledge split layouts remain multi-column at 1366px instead of collapsing into unreadable one-column panels.

Not Done:
- Market and Journal detail selection remains minimal; the first matching detail is shown until a later richer selection model is needed.
- React migrated tooltips still use the existing legacy tooltip data-attribute contract until prompt 129 retires duplicate tooltip ownership.

Validation:
- Red test first: `npx vitest run src/ui/react/tests/knowledge-panels.test.tsx` failed on missing React knowledge surface module.
- Focused test passed: `npx vitest run src/ui/react/tests/knowledge-panels.test.tsx`.
- React/UI slice passed: `npx vitest run src/ui/react/tests src/ui/dom-rendering-budget.test.ts src/ui/drag-payload.test.ts src/game/save-load-regression.test.ts`.
- Post-layout fix focused check passed: `npx vitest run src/ui/react/tests/knowledge-panels.test.tsx src/ui/react/tests/react-ui-shell.test.ts`.
- `npm run test:ui-smoke` passed for 1366x768 and 1600x900 after the local Playwright gate was added.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run content:validate` passed with the existing 18 warnings and zero errors.
- `npm run build` passed with the existing large chunk warning.

Risks:
- Prompt 130 should expand the smoke into screenshot/collision gates for these migrated knowledge panels.
- Prompt 129 still needs to prove there are no duplicate legacy/React ownership paths for tooltips and retired panel markup.

## Browser Smoke Reliability Gate

Status: Accepted as the project-local browser proof path for the migration.

Completed:
- Added project-local Playwright runner support through `@playwright/test`, which brings `playwright` and `playwright-core`.
- Added `playwright.config.ts` with a managed Vite `webServer` on a dedicated port, Chromium project, trace/video/screenshot-on-failure settings, and output under `output/playwright/`.
- Added `npm run test:e2e` and `npm run test:ui-smoke`.
- Added `tests/e2e/react-ui-smoke.pw.ts` covering app boot, React shell/overlay roots, hotbar usability, migrated panel opening, duplicate legacy panel absence, and 1366x768 / 1600x900 split layout readability.
- Kept Playwright tests on a `*.pw.ts` suffix with explicit Playwright `testMatch` so Vitest does not import them during `npm test`.
- Added `.gitignore` coverage for generated Playwright output.
- The first red run found a real React runtime warning in `ReactHotbar`; fixed the missing list key in `src/ui/react/windows/InventoryBankHotbarSurfaces.tsx`.

Validation:
- Red run: `npm run test:ui-smoke` failed on React's unique child key warning from `ReactHotbar`.
- Fixed run: `npm run test:ui-smoke` passed for 1366x768 and 1600x900.
- Integration red run: `npm test` initially imported the Playwright spec through Vitest's default `*.spec.ts` glob; the e2e file was renamed to `*.pw.ts` and Playwright `testMatch` was narrowed.
- `npm test` passed after e2e isolation.
- `npm run lint` passed.
- `npm run test:perf-ui` passed.
- `npm run content:validate` passed with the existing 18 warnings and zero errors.
- `npm run build` passed with the existing large chunk warning.

Risks:
- This is a smoke gate, not the full screenshot matrix requested by prompt 130. Prompt 130 should expand it with screenshot artifacts, collision checks, and broader planning workspace coverage.

## Prompt 127 - Profession Atlas And Adventure Map React Workspaces

Status: Accepted with Profession Pathway Cards as the readable graph fallback.

Completed:
- Added `src/ui/react/windows/PlanningWorkspaces.tsx` with React-owned planning workspaces for Skills / Profession Atlas / Mastery and Adventure Map.
- Switched `skills` and `map` ownership to `react` in `uiPanelRegistry`.
- Updated `UIManager.renderHud()` to stop rendering legacy `SkillsPanel` and `MapPanel` when those panels are React-owned.
- Updated `App` so planning workspaces hide inventory, bank, spellbook, crafting, market, and journal React windows while keeping the React hotbar usable.
- Implemented Profession Atlas as pathway cards instead of adding a graph dependency. The workspace has header tabs, lens/contract sidebar, pathway card center, detail pane, and footer actions for pin/fit/reset/future visibility.
- Implemented Adventure Map as a full React planning workspace with layer toolbar, icon/cluster map canvas, detail pane, and bottom intel cards for entrances, danger, and housing.
- Adventure Map canvas uses icon and service-cluster labels (`data-map-label-mode="icons-and-clusters"`) rather than long absolute-position labels.
- Extended the project Playwright smoke to open Profession Atlas and Adventure Map through the React bridge, verify legacy `.skills-panel` / `.map-panel` absence, verify service clustering, and verify inventory hides under map planning mode.

Not Done:
- No React Flow or SVG graph dependency was added. This is intentional; the fallback cards are more reliable for alpha readability and bundle budget.
- The legacy `SkillsPanel` and `MapPanel` functions remain in the codebase because existing direct unit tests and old contracts still exercise them until prompt 129 retires legacy UI ownership more broadly.

Validation:
- Red test first: `npx vitest run src/ui/react/tests/planning-workspaces.test.tsx` failed on missing `PlanningWorkspaces`.
- Focused tests passed: `npx vitest run src/ui/react/tests/planning-workspaces.test.tsx src/ui/react/tests/react-ui-shell.test.ts src/ui/react/tests/inventory-bank-hotbar.test.tsx`.
- `npm run test:ui-smoke` passed for 1366x768 and 1600x900, including Profession Atlas and Adventure Map workspace checks.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run content:validate` passed with the existing 18 warnings and zero errors.
- `npm run build` passed with the existing large chunk warning.

Risks:
- Prompt 129 still needs to remove or quarantine legacy `SkillsPanel` / `MapPanel` player-facing paths after all dependent tests and fallback contracts are migrated.
- Prompt 130 should add screenshot/collision assertions for the new icon/cluster map and pathway cards beyond the current smoke assertions.

## Prompt 128 - Build Mode, Chat, Help, And Settings React Migration

Status: Accepted with a combined Help/Settings React window.

Completed:
- Added `src/ui/react/windows/CommonSurfaces.tsx` for React-owned Build Mode, Chat, Help, and Settings surfaces.
- Switched `build`, `chat`, `help`, and `settings` ownership to `react` in `uiPanelRegistry`.
- Updated `UIManager.renderHud()` so legacy `BuildPanel`, `ChatPanel`, and `HelpPanel` no longer render when those surfaces are React-owned.
- Extended the React snapshot with build validity/message, chat opacity/retention/show-tabs, and readable settings fields for movement, camera, FPS cap, tooltip delay, accessibility, layout, and keybindings.
- Implemented a dedicated Build Layout with catalog, placement grid/help, materials/inventory compact pane, action footer, and a single warning surface.
- Implemented React Chat collapse/expand, channel tabs, scrollable message log, bottom-only auto-scroll, unread badge, retention/opacity controls, and isolated input focus.
- Implemented React Help/Settings with current-setting help rows, movement mode, camera settings, UI scale/font scale, FPS cap, tooltip delay, accessibility toggles, reset layout, and keybinding view.
- Updated the local Playwright smoke to cover Chat, Help/Settings, Build Mode, duplicate legacy absence, hotbar usability, and viewport bounds at 1366x768 and 1600x900.

Not Done:
- Settings is routed inside the Help/Settings window because the current Simulation UI route exposes `ui.panels.help`; a separate settings window route can be split later if a persisted `settings` panel route is added.
- Chat drag is React-local for this stage. Full persisted React window-layout consolidation remains part of the later legacy-retirement/layout prompts.
- Legacy direct unit tests for `ChatPanel` and `HelpPanel` remain until prompt 129 retires or quarantines old frameworkless panel contracts.

Validation:
- Red test first: `npx vitest run src/ui/react/tests/common-surfaces.test.tsx` failed on missing `CommonSurfaces`.
- Focused tests passed: `npx vitest run src/ui/react/tests/common-surfaces.test.tsx src/ui/react/tests/react-ui-shell.test.ts src/ui/react/tests/inventory-bank-hotbar.test.tsx src/ui/react/tests/knowledge-panels.test.tsx src/ui/react/tests/planning-workspaces.test.tsx`.
- `npm run test:ui-smoke` initially failed on a bad smoke selector for the React chat scroll child; the selector was corrected and the rerun passed for 1366x768 and 1600x900.
- `npm run lint` initially failed because the snapshot did not expose build validity/message; the selector was extended and the rerun passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run content:validate` passed with the existing 18 warnings and zero errors.
- `npm run build` passed with the existing large chunk warning.

Risks:
- Prompt 129 must ensure no player-facing legacy Build/Chat/Help/Settings markup remains active outside direct legacy tests.
- Prompt 130 should add screenshot/collision assertions for Build Layout, Help/Settings, and Chat beyond the current smoke assertions.
- Prompt 131 should account for the added React common surfaces in the bundle/performance budget.

## Prompt 129 - Legacy UI Retirement And Anti-Overlap Policy

Status: Accepted with transitional tooltip ownership documented.

Completed:
- Added `docs/LEGACY_UI_RETIREMENT.md` listing each legacy panel, React replacement status, disable/remove path, risks, and tests.
- Added `docs/UI_OVERLAP_POLICY.md` defining the layout rules for migrated React panels and the development warning policy.
- Added `src/ui/react/components/layoutGuard.ts` with a dev-only `ReactLayoutGuard` and pure warning engine for common overlap violations.
- Mounted `ReactLayoutGuard` in `ReactUIRoot`.
- Added `src/ui/react/tests/layout-guard.test.ts` covering warnings for missing `ScrollArea`, clipped text, tooltip outside overlay root, viewport escape, and hotbar overlap.
- Added a legacy root click guard in `UIManager` so React-owned panel clicks are not processed again by the frameworkless click delegation path.
- Kept all migrated panels gated by `uiPanelRegistry`; `UIManager.renderHud()` skips legacy Inventory, Bank, Hotbar, Spellbook, Skills, Journal, Market, Map, Build, Chat, and Help/Settings render paths when React-owned.

Not Done:
- Legacy panel modules are not physically deleted because existing direct unit tests still cover legacy data contracts until prompt 130 replaces them with visual/collision gates or React-specific equivalents.
- Tooltip ownership remains transitional: React overlay roots exist, and the guard catches tooltip markup outside allowed roots, but the active hover dispatcher is still the single legacy `TooltipManager`.

Validation:
- Red test first: `npx vitest run src/ui/react/tests/layout-guard.test.ts` failed on missing `layoutGuard`.
- Focused tests passed: `npx vitest run src/ui/react/tests/layout-guard.test.ts src/ui/react/tests/common-surfaces.test.tsx src/ui/react/tests/react-ui-shell.test.ts src/ui/react/tests/inventory-bank-hotbar.test.tsx src/ui/react/tests/knowledge-panels.test.tsx src/ui/react/tests/planning-workspaces.test.tsx`.
- `npm run test:ui-smoke` passed for 1366x768 and 1600x900 after adding the legacy root click guard.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run content:validate` passed with the existing 18 warnings and zero errors.
- `npm run build` passed with the existing large chunk warning.

Risks:
- Prompt 130 should turn the policy into screenshot/collision gates instead of relying only on dev warnings.
- Prompt 131 must include the `ReactLayoutGuard` and common surfaces in bundle/performance accounting.
- Physical deletion of old panel modules should wait until direct legacy tests are replaced or explicitly retired.

## Prompt 130 - UI Testing, Visual Regression, And Screenshot Gates

Status: Accepted with an approximate Playwright geometry gate.

Completed:
- Added `npm run test:ui-visual` as a separate Playwright script for screenshot and DOM geometry gates.
- Added `tests/e2e/ui-visual-regression.pw.ts` covering 1366x768 and 1600x900.
- Captured deterministic states: R1 town HUD, R2 road route, R3 crypt route, R4 forest gathering route, R5 smithy crafting, R6 bank storage, R7 housing build mode, R8 Profession Atlas, R9 Adventure Map, spellbook, inventory tooltip, and settings/help.
- Added `docs/UI_SCREENSHOT_GATES.md` documenting the script, captured states, artifact location, and blocking checks.
- Added stable `data-ui-window`, `data-ui-text`, `data-ui-scroll`, `data-ui-tooltip`, `data-ui-footer`, and `data-ui-hotbar` markers across React primitives and custom surfaces.
- Added React Escape handling for migrated panels so screenshot gate states can verify Escape closes the active surface.
- Fixed three real layout regressions found by the new gate: default Chat overlapping the hotbar, Build Layout overlapping the hotbar safe area, and Profession Atlas collapsing to one column at 1366px because the generic split-pane media rule overrode planning-specific columns.
- Updated `hotbar` v2 window policy so the hotbar itself uses viewport dock placement while other windows continue to avoid the hotbar safe area.

Not Done:
- Pixel baseline comparison is not enabled yet; this stage captures screenshots and blocks on deterministic DOM geometry/readability checks.
- 1920x1080 remains optional and was not added to keep the local gate runtime bounded.

Validation:
- `npm run test:ui-visual` initially failed on real hotbar overlap and 1366 Profession Atlas text overlap; after layout fixes it passed for both required viewports.
- `npm run test:ui-smoke` passed for 1366x768 and 1600x900.
- `npm run lint` passed.
- `npm test` passed.
- `npm run test:perf-ui` passed.
- `npm run content:validate` passed with the existing 18 warnings and zero errors.
- `npm run build` passed with the existing large chunk warning.

Risks:
- Prompt 131 must include the new visual gate runtime and React marker/guard cost in the bundle/performance review.
- Pixel baselines may be added later, but the current gate is intentionally approximate to avoid unstable screenshot diffs during architecture migration.

## Prompt 131 - Bundle Performance, Code Splitting, And Runtime Budget

Status: Accepted with the remaining Vite chunk warning documented.

Completed:
- Added `vite.config.ts` with `react-vendor` and `three-vendor` manual chunks.
- Lazy-loaded `PlanningWorkspaces` so Profession Atlas and Adventure Map are emitted as a separate dynamic chunk.
- Lazy-loaded `KnowledgePanelsSurfaces` so Spellbook, Crafting, Market, and Journal are emitted as a separate dynamic chunk.
- Removed the React shell's clock/full-snapshot subscription; shell visibility now uses primitive selectors, and Escape reads the bridge snapshot only on keydown.
- Added React panel render counters and connected them to the existing `PerfMonitor.windowRenderPerSecond` path with `react:*` ids.
- Updated visible window budget counting so React `data-ui-window` surfaces are included in `UIManager.getPerformanceStats()`.
- Added `docs/UI_BUNDLE_AUDIT.md` with pre/post build sizes, dependency budget, runtime metrics, and warning status.

Not Done:
- The Vite warning is not eliminated. The React migration no longer ships planning/knowledge workspaces in the entry chunk, but the main game entry and Three vendor chunk still exceed the default 500 kB threshold.
- No threshold was raised and no warning was suppressed.

Validation:
- Baseline `npm run build` before changes passed with one JS entry chunk at 1,669.44 kB / 464.48 kB gzip and the existing Vite warning.
- Focused perf tests passed: `npx vitest run src/ui/react/tests/render-metrics.test.ts src/game/perf-monitor.test.ts src/ui/performance-budget.test.ts`.
- `npm run test:ui-smoke` passed for 1366x768 and 1600x900 after lazy-loading the workspaces.
- `npm run test:ui-visual` passed for 1366x768 and 1600x900.
- `npm run lint` passed.
- `npm test` passed: 88 files and 396 tests.
- `npm run test:perf-ui` passed: 12 files and 72 tests.
- `npm run content:validate` passed with the existing 18 warnings and zero errors.
- Final `npm run build` passed with `react-vendor` at 192.35 kB / 60.28 kB gzip, `PlanningWorkspaces` at 14.09 kB / 4.67 kB gzip, `KnowledgePanelsSurfaces` at 15.83 kB / 4.85 kB gzip, and app entry reduced to 941.78 kB / 265.46 kB gzip.

Risks:
- Prompt 132 must make the alpha decision with the warning still present, or explicitly scope a later game-data/renderer split.
- The React render counter is intentionally lightweight and panel-level. It is enough for alpha regression spotting, not a profiler replacement.

## Prompt 132 - React UI Alpha Acceptance Gate

Status: Accepted for internal alpha.

Completed:
- Added `npm run test:ui-alpha` as the deterministic React UI alpha acceptance route.
- Added `tests/e2e/react-ui-alpha-acceptance.pw.ts` covering fresh save, town HUD, inventory/equipment/hotbar agreement, spellbook, bank, crafting, build mode, forest/road/crypt routes, Profession Atlas, Adventure Map, chat, help/settings, save/reload persistence, UI reset, tooltip stability, duplicate legacy absence, and DOM/window performance budgets.
- Added `docs/REACT_UI_MIGRATION_STATUS.md` with the final cut decision and issue classification.
- Added `docs/REACT_UI_SCREENSHOT_QA_REPORT.md` with the visual/alpha Playwright evidence and known screenshot limit.
- Updated `UI_BUNDLE_AUDIT.md`, `LEGACY_UI_RETIREMENT.md`, `UI_OVERLAP_POLICY.md`, and `UI_SCREENSHOT_GATES.md` for the final acceptance state.

Not Done:
- The prompt-requested 45-60 minute human exploratory playtest was not performed by the agent. It is documented as required before external alpha/demo, not as an internal-alpha blocker.
- Pixel baseline comparison is still not enabled.

Validation:
- `npm run test:ui-alpha` initially caught acceptance-test issues: inventory capacity was 36 rather than a hard-coded 24, save/reload was being invalidated by a repeated localStorage clear, planning workspace state hid inventory before tooltip checks, and perf data needed to be read from `dev.renderStats` instead of `perfDebug`.
- After fixing the test route, `npm run test:ui-alpha` passed for 1366x768 and 1600x900.

Risks:
- The remaining Vite chunk warning is accepted for internal alpha and tracked in `UI_BUNDLE_AUDIT.md`.
- Legacy modules remain until direct tests are replaced.
- Human exploratory QA is still required before widening the audience beyond internal alpha.

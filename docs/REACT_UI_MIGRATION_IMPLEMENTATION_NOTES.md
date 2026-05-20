# React UI Migration Implementation Notes

## Prompt 121 - Unequip Command Adaptation

Prompt 121 lists `unequipItem` as a React UI command. The current Simulation action model has `EQUIP_ITEM`, but no dedicated `UNEQUIP_ITEM` or equivalent equipment-slot action.

Safe adaptation:
- Do not invent a new gameplay action during the UI rescue pass.
- Keep `unequipItem` in the React command surface so later components can depend on a stable command name.
- Return `{ accepted: false, reason: 'No Simulation action exists for unequip yet.' }` and dispatch nothing.
- Revisit only if a later prompt explicitly requires equipment-slot behavior and adds a Simulation-backed action with tests.

## Prompt 125 - Bank Gold And React Window Layout Adaptations

Prompt 125 asks for Deposit Gold and save/load preservation of layout and hotbar.

Safe adaptation:
- Keep hotbar assignment and item transfer fully Simulation-backed through existing `SET_HOTBAR_SLOT`, `MOVE_HOTBAR_SLOT`, `USE_HOTBAR`, and `MOVE_ITEM` actions.
- Do not add a new gold banking gameplay feature in this UI rescue pass. The current action model has item banking, trade gold, and bank gold display, but no bank-gold transfer action.
- Implement `Deposit Resources` as a UI command fan-out over existing `MOVE_ITEM` actions for resource stacks.
- Keep React inventory and bank windows on v2 default rects with CSS resize during this stage. Persisted React window layout storage should be wired only when the later layout-retirement prompts consolidate old and new window state.

## Browser Smoke Reliability Adaptation

During the React migration pass, ad hoc smoke checks used the Codex in-app Browser plus a manually started Vite dev server. That path proved unstable because the browser log buffer can retain stale entries, the server lifecycle is not tied to the check, and Windows can mis-handle `Start-Process npm` unless `npm.cmd` is used explicitly.

Safe adaptation:
- Treat project-local Playwright as the browser proof surface for React UI migration work.
- Keep the in-app Browser useful for exploratory inspection, but do not make it the source of truth for migration acceptance.
- Add `@playwright/test` as a dev dependency; it brings the Playwright runner, CLI, `playwright`, and `playwright-core`.
- Use `playwright.config.ts` to start Vite through `webServer` on a dedicated port and tear it down after the run.
- Keep generated Playwright output under `output/playwright/`, ignored by git.
- Use `npm run test:ui-smoke` for the current React UI smoke: app boot, React overlay shell, hotbar, migrated panel ownership, legacy duplicate absence, and 1366x768 / 1600x900 readable split layouts.
- Keep Playwright tests named `*.pw.ts` so Vitest's default `*.test.ts` / `*.spec.ts` scan does not execute them during `npm test`.

## Prompt 127 - Planning Workspace Adaptations

Prompt 127 allows React Flow, custom SVG graph, or Profession Pathway Cards for the Profession Atlas.

Safe adaptation:
- Do not add React Flow or another graph dependency during the UI rescue pass. Bundle impact is already deferred to prompt 131, and a broken graph would fail the prompt's readability goal.
- Use Profession Pathway Cards first: they preserve the lens, node, contract, detail, and goal-pin information in a stable grid that works at 1366x768.
- Keep legacy `SkillsPanel` and `MapPanel` functions available for existing direct unit tests and rollback, but set `skills` and `map` ownership to React so `UIManager` no longer renders them in the player HUD.
- Treat Adventure Map labels as icons/clusters on the canvas, with full labels in the detail pane and bottom intel cards. This avoids text collisions without inventing new map gameplay.
- When planning workspaces are open, React hides inventory/bank and knowledge windows while keeping the hotbar usable.

## Prompt 128 - Common Surface Adaptations

Prompt 128 asks for Build Mode, Chat, Help, and Settings to move to React while preserving Simulation authority.

Safe adaptation:
- Use one React `CommonSurfaces` layer for Build Mode, Chat, Help, and Settings, with `build`, `chat`, `help`, and `settings` marked React-owned in `uiPanelRegistry`.
- Keep gameplay commands Simulation-backed through existing actions (`TOGGLE_BUILD_MODE`, `SET_BUILD_PIECE`, `PLACE_BUILDING`, `SET_CHAT_MODE`, `SEND_CHAT`, settings actions, and layout reset actions).
- Render Settings inside the Help/Settings React window because the current player-facing route opens `ui.panels.help`; there is no separate persisted `ui.panels.settings` route yet. The Settings section still has its own `data-react-panel="settings"` marker and Simulation-backed controls.
- Use a dedicated Build Layout instead of a floating legacy build panel. While Build Mode is open, React hides inventory/bank and knowledge windows and provides a compact materials/inventory column inside the build workspace so HUD and hotbar remain predictable.
- Keep exactly one build warning row in the build workspace. Do not repeat the same warning through tooltips or toasts during this migration stage.
- Implement Chat collapse/expand and bottom-only auto-scroll in React. Chat drag is handled inside the React component for the current session; broader persisted React window-layout consolidation remains for the later legacy-retirement/layout prompts.

## Prompt 129 - Legacy Retirement Adaptations

Prompt 129 asks for duplicate legacy paths to be retired and anti-overlap warnings to catch common regressions.

Safe adaptation:
- Keep legacy panel modules in the repository temporarily because existing direct unit tests still cover old data contracts and prompt 130 has not yet replaced them with screenshot/collision gates.
- Treat `uiPanelRegistry` as the player-facing ownership source of truth. `UIManager.renderHud()` now skips all migrated legacy panel render calls.
- Add a root click guard so legacy `UIManager` click delegation ignores React-owned panel clicks, preventing duplicate Simulation dispatch from React buttons that use legacy-like data attributes.
- Add React `ReactLayoutGuard` as a dev-only warning layer. It warns but does not mutate layout or hide UI, so it cannot mask real overlap bugs.
- Keep tooltip retirement transitional: React overlay roots and `TooltipPortal` exist, but the current hover dispatcher remains the single legacy `TooltipManager` path until a later stage wires React tooltip state end to end.

## Prompt 130 - Screenshot Gate Adaptations

Prompt 130 asks for browser screenshot gates and approximate readability checks.

Safe adaptation:
- Use the project-local Playwright dependency and managed Vite server added during the smoke reliability work.
- Add a separate `npm run test:ui-visual` script instead of mixing screenshot/collision checks into the faster smoke gate.
- Store screenshots as Playwright artifacts under `output/playwright/test-results/`, which remains ignored by git.
- Use DOM geometry checks as blocking assertions: viewport bounds, hotbar blockage, tooltip bounds, clipped footers, body horizontal scroll, and approximate text overlap.
- Add `data-ui-*` markers to React primitives and major custom surfaces so the visual gate does not rely on brittle CSS class names alone.
- The first gate runs caught real regressions: chat/hotbar overlap, build/hotbar overlap, and 1366 Profession Atlas split collapse. These were fixed by moving hotbar to viewport dock policy, preserving lower safe insets for workspaces, and restoring planning split columns after the generic mobile split-pane rule.

## Prompt 131 - Bundle And Runtime Budget Adaptations

Prompt 131 asks for React bundle accounting, lazy-heavy workspaces, and runtime performance tracking.

Safe adaptation:
- Add `vite.config.ts` with explicit `react-vendor` and `three-vendor` chunks instead of changing the app architecture or raising the warning threshold.
- Lazy-load the two heaviest React UI groups at the existing ownership boundary: `PlanningWorkspaces` for Profession Atlas / Adventure Map, and `KnowledgePanelsSurfaces` for Spellbook / Crafting / Market / Journal.
- Keep Inventory, Bank, Hotbar, Build, Chat, Help, and Settings in the initial React layer because those are HUD/common surfaces and must remain responsive.
- Do not add React Flow or another graph dependency for the Atlas during the budget pass.
- Remove the root React shell's clock/full-snapshot subscription. Escape handling now reads a snapshot only when Escape is pressed.
- Feed lightweight React panel render counters into the existing `PerfMonitor.windowRenderPerSecond` map with `react:*` ids rather than adding a second metrics stack.
- Count React `data-ui-window` surfaces in the existing visible-window budget so the dev overlay reflects migrated windows.
- Keep the remaining Vite warning visible and documented in `docs/UI_BUNDLE_AUDIT.md`; do not hide it by raising `chunkSizeWarningLimit`.

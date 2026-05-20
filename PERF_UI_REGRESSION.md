# Performance and UI Regression Suite

Purpose: keep CPU, tooltip, inventory, chat, minimap/map, movement-mode, tree-resource, save/load, and Profession Atlas fixes from regressing while the internal alpha gameplay and visual-reference passes expand.

Last updated: 2026-05-20.

Current verification on 2026-05-20:

- `npm run lint`: passed (`tsc --noEmit`).
- `npm test`: passed, 77 files / 357 tests.
- `npm run test:perf-ui`: passed, 12 files / 69 tests.
- `npm run content:validate`: passed, 0 errors / 18 known warnings.
- `npm run build`: passed with the known large chunk warning.
- Browser smoke from prompt 117 covered R1-R9 HUD screenshot parity across desktop viewports and UI scales; dev overlay counters remain the source of truth for live render/DOM budget reads.

## Automated Gate

Run before product-cut or release-candidate checks:

```bash
npm run lint
npm test
npm run test:perf-ui
npm run content:validate
npm run build
```

`test:perf-ui` covers:

| Area | Automated coverage |
| --- | --- |
| Performance counters and budgets | `src/game/perf-monitor.test.ts`, `src/game/loop-governor.test.ts`, `src/ui/performance-budget.test.ts` |
| DOM render containment | `src/ui/dom-rendering-budget.test.ts`, `src/ui/window-manager.test.ts` |
| Tooltip stability and viewport clamp | `src/ui/TooltipManager.test.ts` |
| Chat panel modes and virtualization | `src/ui/chat-panel.test.ts` |
| Minimap compact/standard/expanded behavior | `src/ui/map-navigation.test.ts` |
| Movement modes and persistence | `src/game/movement-mode.test.ts`, `src/game/save-load.test.ts` |
| Tree harvestability and protected trees | `src/systems/tree-harvestability.test.ts` |
| Profession Atlas layout, node details, search, pinning | `src/ui/profession-ui.test.ts` |

For visual-reference changes, also update `VISUAL_BUDGET.md` and the relevant reference QA document with current render stats.

## Browser Performance Cases

Use a production preview (`npm run build && npm run preview -- --host 127.0.0.1`) and the dev overlay counters. Capture a 20 second sample after a 5 second warmup. CPU estimate is the sum of measured main-thread subsystem averages divided by frame budget; it is a local estimate, not OS CPU.

| Case | Setup | FPS | CPU estimate | Frame ms | Draw calls | DOM updates/sec | Tooltip updates/sec | Minimap redraw/sec | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Idle town | Fresh save, no panels, town |  |  |  |  |  |  |  |  |
| Idle forest | Dev travel or walk to forest, no panels |  |  |  |  |  |  |  |  |
| Inventory open | Inventory window open, no hover |  |  |  |  |  |  |  |  |
| Spellbook open | Spellbook window open on grid |  |  |  |  |  |  |  |  |
| Skills Atlas open | Skills -> Profession Atlas, Treasure Hunter lens |  |  |  |  |  |  |  |  |
| Chat expanded | Chat expanded with 80+ messages |  |  |  |  |  |  |  |  |
| Minimap compact | Minimap compact, no player movement |  |  |  |  |  |  |  |  |
| Pause/help | Pause or Help open |  |  |  |  |  |  |  |  |
| Active combat | Road bandit engaged |  |  |  |  |  |  |  |  |
| Gathering | Forest tree chop or mining action active |  |  |  |  |  |  |  |  |

## Manual UI Cases

| Case | Check |
| --- | --- |
| Inventory resize | Resize inventory from minimum to wide/tall. Slots stay inside grid, footer remains visible, layout persists. |
| Inventory tooltip boundaries | Hover first/last inventory slots at small viewport. Tooltip stays inside viewport and uses the global tooltip layer. |
| Chat move/resize/collapse | Move and resize chat, switch expanded/compact/collapsed/combat-hidden. Latest control and channel filters remain clickable. |
| Chat scroll lock | With 80+ messages, scroll upward and receive/add messages. Scroll position should not jump to bottom unless Latest is clicked. |
| Minimap modes | Switch compact, standard, expanded, hidden. Compact stays HUD-only; expanded opens Map panel and layer toggles. |
| Movement modes | Keyboard Only blocks ground click movement; Mouse Only blocks WASD movement; Keyboard + Mouse allows both and WASD cancels click path. |
| Movement persistence | Change movement mode, save/reload. Selected mode survives. |
| Atlas pan/zoom/search/pin | Open Skills Atlas, pan graph, zoom -, Fit, Reset, +, search "map", select Lockpicking, pin node. Journal shows pinned node. |
| Tooltip stability during world updates | Hover an inventory or skill tooltip while the world idles for 20 seconds. Tooltip remount count must not increase unless the hovered content version changes. |
| All windows at small viewport | At 390x720 or similar, open inventory, spellbook, skills, journal, market, chat, map, help. Windows remain reachable and hotbar-safe. |
| Tree variants | Forest trees chop and sync to stumps/resource tiles. Protected town trees deny chopping with protected feedback. |

## Thresholds

Critical thresholds:

| Metric | Threshold |
| --- | --- |
| Tooltip remounts while hovering same anchor | Must not increase from unrelated world/UI updates. Content updates only when `data-tooltip-version` changes. |
| Minimap compact redraw cadence | Must not redraw every frame while idle. Compact mode should remain cadence-driven and dirty-state-driven. |
| Inventory rerender on unrelated animation ticks | Inventory window render count should not advance every frame when inventory state and layout are unchanged. |
| Paused/menu CPU | Paused or menu/planning mode should use substantially lower simulation/render cadence than active gameplay. |
| DOM node budget | Stay under `renderPerformanceBudget.domNodeCount`; failures are blocking. |
| Tooltip viewport clamp | Tooltip bounds must remain inside the viewport at corners. |
| Movement mode contract | Direct actions and real input must both obey selected movement mode. |

Severity rules:

| Severity | Meaning |
| --- | --- |
| Blocker | Crash, save corruption, stuck movement mode, broken inventory, broken tree harvesting, or Atlas pin cannot update Journal. |
| High | Sustained idle redraw every frame, tooltip flicker/remount loop, click moves in Keyboard Only, WASD moves in Mouse Only. |
| Medium | Layout clipping at common desktop/mobile sizes, minimap wrong mode, chat scroll jumps, Atlas search/detail stale. |
| Low | Cosmetic spacing issue, known browser autoplay warning, missing favicon, known content warning without gameplay impact. |

## Known Remaining Issues

| Issue | Severity | Workaround |
| --- | --- | --- |
| Vite build warns that the main JS chunk is over 500 kB. | Low | Track for future code-splitting; not a functional regression. |
| Content validation reports 18 known warnings for event economy-impact labels and `tool:torch` source metadata. | Low | Existing content-validation warnings; runtime content remains valid with 0 errors and 0 dead references. |
| Headless/first-load browser warns that AudioContext needs a user gesture. | Low | Expected browser autoplay policy; first user gesture resumes audio. |
| Browser requests a missing favicon on first load. | Low | Cosmetic browser request; add favicon asset during release polish if desired. |

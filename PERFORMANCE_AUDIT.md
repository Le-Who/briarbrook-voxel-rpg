# Performance Audit

Current status update: 2026-05-20
Current validation: `npm run lint`, `npm test`, `npm run test:perf-ui`, `npm run content:validate`, and `npm run build` all pass on the post-foundation/internal-alpha branch. `content:validate` reports 0 warnings, and `npm run build` still reports the accepted Vite large-chunk warning for the main JavaScript bundle.

This document keeps the original Phase 10 browser profiling table as the baseline that motivated loop-governor, dirty UI, minimap, tooltip, and DOM containment work. The current R1-R9 visual-reference budget captures and worst-observed render stats live in `VISUAL_BUDGET.md`.

Date: 2026-05-19  
Build mode: production build via `npm run build` and `npm run preview -- --host 127.0.0.1 --port 4173`  
Viewport: 1280x720  
Browser: Codex in-app Chromium browser surface. The exact user agent and OS-level CPU counters were not exposed to the read-only browser context.  
Method: 20 second browser runs per scenario, with the dev overlay hidden during the run and briefly opened to read the latest `PerfMonitor` sample. Browser DevTools GPU timing and OS CPU percentage were not available through this automation surface, so GPU time is marked `n/a` and CPU is estimated from measured main-thread subsystem time.

## Instrumentation Added

- `src/game/PerfMonitor.ts` records one-second samples for input, simulation, audio, renderer, render stats, and UI.
- Runtime counters now include UI renders, HUD replacements, queued HUD replacements, label writes, minimap updates, tooltip sync scans, raycasts, pathfinding calls, active timers, active intervals, and per-fragment render counts.
- `VoxelRenderer.screenToWorld()` and `VoxelRenderer.pickEntity()` increment raycast counters.
- `MovementSystem` increments a pathfinding counter when `buildPath()` runs.
- The dev overlay shows the new subsystem counters, dirty flags, and hot render fragments.

## Measurement Table

CPU estimate is main-thread measured work per second: `(simulation avg ms + renderer avg ms + UI avg ms) * UI calls per second`. It is not OS total CPU usage.

| Scenario | FPS | Avg frame | Worst frame | CPU estimate | Draw calls | Meshes | DOM nodes | Windows | UI renders/s | Minimap/s | Tooltip sync/s | Raycasts/s | Pathfind/s | Timers / intervals |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Town idle | 143 | 9.3ms | 14.2ms | 813ms/s | 1858 | 3474 | 564 | 0 | 107.0 | 107.0 | 1070.0 | 0 | 0 | 2 / 0 |
| Town moving | 145 | 8.3ms | 14.0ms | 673ms/s | 453 | 3474 | 558 | 0 | 120.2 | 120.2 | 1201.7 | 0 | 0 | 1 / 0 |
| Forest idle | 143 | 8.3ms | 20.8ms | 757ms/s | 1417 | 2004 | 529 | 0 | 120.2 | 120.2 | 1201.6 | 0 | 0 | 2 / 0 |
| Crypt idle | 71 | 8.3ms | 20.8ms | 444ms/s | 846 | 1179 | 536 | 0 | 120.0 | 120.0 | 1199.9 | 0 | 0 | 1 / 0 |
| Inventory open | 143 | 8.5ms | 20.9ms | 697ms/s | 453 | 3483 | 701 | 1 | 118.2 | 118.2 | 5436.5 | 0 | 0 | 2 / 0 |
| Skills ledger open | 143 | 8.3ms | 14.1ms | 461ms/s | 846 | 1179 | 639 | 0 | 121.2 | 121.2 | 1211.9 | 0 | 0 | 1 / 0 |
| Profession Atlas open | 143 | 8.3ms | 14.0ms | 678ms/s | 453 | 3483 | 652 | 0 | 121.0 | 121.0 | 1210.0 | 0 | 0 | 1 / 0 |
| Paused help open | 73 | 8.4ms | 20.9ms | 726ms/s | 497 | 3483 | 878 | 1 | 119.0 | 119.0 | 1190.0 | 0 | 0 | 2 / 0 |

## Browser Profiling Findings

- Scripting time is dominated by the full RAF pipeline running at 107 to 121 UI/s in nearly every state. The pause/help screen still calls `Simulation.update()`, `VoxelRenderer.render()`, and `UIManager.render()` every frame.
- Renderer time is the largest measured subsystem: 3.2ms to 7.0ms average per frame. Estimated render budget remains above 16.7ms in every scene, mainly due mesh/draw-call volume.
- DOM/UI time is smaller per frame, but it repeats at display refresh. Inventory raises UI average to 0.9ms and tooltip sync to 5436.5 element scans/s.
- Rendering/layout/paint cannot be split further from this browser surface. DOM node counts remain under the current 1800 budget, but repeated `innerHTML` label writes and full HUD string generation happen every frame.
- GPU/WebGL time is `n/a`; the available signal is renderer subsystem time plus Three.js draw calls, triangles, mesh count, and estimated frame cost.
- Garbage collection spikes were not directly visible. Heap ranged from 86.1MB to 154.4MB in measured scenarios.
- Raycasts and pathfinding were not active in these idle/menu samples: both measured 0/s. The raycast candidate count is still high enough to track under interaction.
- No `setInterval` loops were observed in the measured runtime. Active timers were 1 to 2, mostly the RAF loop and UI replacement timers.

## Top 10 CPU Contributors

1. Uncapped `requestAnimationFrame` loop
   - Category: render loop / simulation scheduling
   - Evidence: UI/render cycles run at 107 to 121/s even in inventory, atlas, and pause/help.
   - Fix: add a render-loop governor with 60 FPS active cap, lower UI-only cadence, and idle sleep.
   - Risk: medium. Affects input feel and animation cadence.
   - Gameplay/UX impact: positive if input remains immediate.

2. Full UI render every frame
   - Category: DOM/UI
   - Evidence: `UIManager.render()` runs 107 to 121/s across all scenarios.
   - Fix: add dirty-state invalidation and skip HUD HTML rebuild when gameplay/UI state did not change.
   - Risk: medium. Must preserve prompt, hotbar, combat flag, and drag updates.
   - Gameplay/UX impact: positive if stale UI is avoided.

3. Minimap rebuild every frame
   - Category: minimap / DOM
   - Evidence: minimap updates match UI renders exactly: 107 to 121/s.
   - Fix: cache minimap HTML by area, position tile, waypoint, time label, and local event state.
   - Risk: low to medium.
   - Gameplay/UX impact: positive; waypoint and player dot freshness must be kept.

4. Tooltip sync scans every frame
   - Category: tooltip / DOM query churn
   - Evidence: 1070/s idle, 5436.5/s with inventory open.
   - Fix: sync tooltip mode only after HUD replacement, tooltip mode changes, or newly mounted nodes.
   - Risk: low.
   - Gameplay/UX impact: positive; must preserve compact/advanced tooltip toggle.

5. Repeated icon render requests
   - Category: asset/icon
   - Evidence: cumulative icon render requests reached 270k to 945k while cached icons stayed at 12 to 26.
   - Fix: memoize panel fragments or pre-resolve icon markup per item/spell/skill state instead of calling `renderIcon()` during every HUD template pass.
   - Risk: medium because inventory/hotbar quantities and durability must still update.
   - Gameplay/UX impact: neutral to positive.

6. Mesh and draw-call budgets are exceeded
   - Category: WebGL render
   - Evidence: town idle 1858 draw calls and 3474 meshes; forest idle 1417 draw calls and 2004 meshes; crypt idle 846 draw calls and 1179 meshes.
   - Fix: batch static props, instance repeated terrain/foliage/props, reduce material fragmentation, and avoid rebuilding rings/effects every frame.
   - Risk: medium to high depending on visual batching scope.
   - Gameplay/UX impact: visual parity must be protected.

7. Pause/help still runs full render/UI work
   - Category: idle throttling / menu state
   - Evidence: paused help open still shows 119 UI renders/s and 5.2ms renderer average.
   - Fix: when paused, freeze simulation, render only dirty UI changes, and drop world render cadence unless an animation is explicitly active.
   - Risk: medium.
   - Gameplay/UX impact: positive; resume latency must stay instant.

8. Label layer writes every frame
   - Category: DOM writes
   - Evidence: label writes match UI renders: 107 to 121/s.
   - Fix: compare label HTML or maintain keyed label nodes and update only when visible labels move/change.
   - Risk: low to medium.
   - Gameplay/UX impact: neutral if floating labels remain responsive.

9. HUD replacement queue churn
   - Category: UI replacement throttle
   - Evidence: forest idle queued 73.5 HUD replacements/s, town idle queued 8/s, inventory queued 7.9/s.
   - Fix: stop generating replacement candidates every frame; dirty flags should decide whether replacement is necessary before queueing.
   - Risk: medium.
   - Gameplay/UX impact: positive; reduces click target instability risk.

10. Render stats collection runs in the frame path
    - Category: profiling overhead
    - Evidence: `getRenderStats()` traverses scene/UI state every frame to calculate mesh/material/entity/raycast candidate stats.
    - Fix: lower stat collection cadence to 1/s in dev overlay, keep only cheap frame counters per frame.
    - Risk: low if stats remain fresh enough for debugging.
    - Gameplay/UX impact: neutral.

## Budget Targets

- Main gameplay: default to 60 FPS, with Help-panel choices for 120 or Custom 30-240; renderer average should stay under 8ms at the default cap and frame budget under 16.7ms.
- FPS cap setting changes active/combat render cadence only. Simulation stays fixed at 60 Hz, and planning/pause/background cadences remain reduced.
- UI-only/menu state: near-idle CPU, no full-rate simulation, no full HUD rebuild every frame. Target UI renders under 5/s when static.
- Inventory, Skills, Spellbook, Atlas: update on state changes, input, scroll, drag, or tooltip mode changes, not on every RAF.
- Idle town/forest/crypt: simulation may keep a low fixed rate, but static UI/minimap/labels should sleep. Rendering can continue only for visible world animation.
- Pause/help: no full-rate simulation; world render should stop or drop to a very low cadence unless resume preview animation is intentionally active.
- Background tab: pause or throttle nonessential work to 1 FPS or browser visibility-driven sleeps.

## Current Guardrail Coverage

- `npm run lint`: TypeScript static quality gate (`tsc --noEmit`).
- `npm test`: full Vitest project suite.
- `npm run test:perf-ui`: focused performance/UI regression suite for loop governor, render budgets, DOM containment, tooltips, minimap/map, movement modes, save/load, tree harvestability, and Profession Atlas.
- `npm run content:validate`: registry/dead-reference validation for areas, items, spells, skills, professions, recipes, work orders, resources, enemies, loot tables, housing objects, map markers, events, quests, and visual prefabs.
- `npm run build`: TypeScript compile plus production Vite build.

Known accepted warnings:

- Vite reports the main JavaScript chunk over 500 kB after minification.

## Optimization Plan

1. Add a render-loop governor and idle throttling.
   - First target: cap active gameplay at 60 FPS and pause/help at a low dirty-only cadence.
   - Verification: repeat town idle, inventory, atlas, and pause/help 20s profiles.

2. Make UI rendering dirty-driven.
   - Track state version keys for HUD, labels, minimap, tooltip mode, and each panel.
   - Skip full HUD string generation when no dirty flag is set.

3. Split minimap into cached terrain and dynamic markers.
   - Terrain and service markers should refresh on area/quest discovery changes.
   - Player marker can update at a lower fixed cadence or by tile changes.

4. Move tooltip sync out of the per-frame path.
   - Run only after HUD replacement or tooltip mode changes.
   - Add a regression test for compact/advanced switching after cached HUD reuse.

5. Reduce icon request churn.
   - Keep icon cache, but stop invoking `renderIcon()` for unchanged item/spell/skill rows each frame.

6. Batch static render geometry after loop/UI waste is confirmed fixed.
   - Prioritize town and forest because they exceed draw-call and mesh budgets most clearly.

## Acceptance Status For Prompt 79

- Bottlenecks are measured and documented.
- Dev overlay shows subsystem counters, dirty flags, per-window fragment renders, raycast count, pathfinding count, minimap count, and tooltip sync count.
- The next optimization plan is profile-driven.
- Gameplay design was not changed to hide performance problems.

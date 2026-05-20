# Visual Budget

This document turns prompt 109's visual targets into measurable guardrails before additional detail is added. The hard runtime baseline remains `src/render/RenderBudgets.ts`; the per-reference targets below are stricter planning budgets meant to catch overbuilding early.

Last updated: 2026-05-20.

## Existing Hard Runtime Budget

| Metric | Hard Limit |
| --- | ---: |
| Rough draw calls | 450 |
| Meshes | 1200 |
| Visible entities | 160 |
| Raycast candidates | 900 |
| Triangles | 140000 |
| Estimated frame time | 16.7 ms |
| Post-transition heap estimate | 180 MB |
| UI DOM nodes | 1800 |
| Visible managed windows | 8 |
| Cached icons | 260 |
| Event listeners | 48 |
| Dynamic lights | 3 |
| Active particles/effect elements | 90 |

## Per-Reference Planning Targets

| Ref | Scene/UI State | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | UI/DOM Target | Special Limit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| R1 | Briarbrook Town Square + default HUD | <= 360 | <= 950 | <= 120000 | <= 120 | <= 650 | <= 1400 DOM nodes, <= 6 windows | Flower/cobble/fence/stall dressing batched or instanced where practical. |
| R2 | Old River Road combat | <= 300 | <= 800 | <= 95000 | <= 50 | <= 450 | <= 1300 DOM nodes | Active combat VFX <= 25 elements; damage labels fade/event-driven. |
| R3 | Forgotten Crypt combat | <= 320 | <= 900 | <= 110000 | <= 55 | <= 500 | <= 1350 DOM nodes | Dynamic lights <= 3; loot labels are temporary. |
| R4 | Greymont Forest gathering | <= 330 | <= 900 | <= 105000 | <= 80 | <= 600 | <= 1300 DOM nodes | Only active resource gain label; foliage/resource repeats use shared geometry/materials. |
| R5 | Brom's Smithy + crafting UI | <= 260 | <= 650 | <= 75000 | <= 35 | <= 350 | <= 1550 DOM nodes, <= 6 windows | Forge point light counts against dynamic light budget; queue updates event-driven. |
| R6 | Briarbrook Bank + storage UI | <= 250 | <= 620 | <= 70000 | <= 30 | <= 325 | <= 1600 DOM nodes, <= 6 windows | Inventory + storage must not exceed window layering budget. |
| R7 | Player Plot build mode | <= 330 | <= 850 | <= 95000 | <= 45 | <= 550 | <= 1550 DOM nodes, <= 6 windows | Grid and placement ghost batched; no per-cell DOM. |
| R8 | Profession Atlas modal | current scene + <= 40 UI draw-equivalent | scene baseline | scene baseline | scene baseline | scene baseline | <= 900 nodes inside modal, global <= 1800 | Graph layout on state change only; tooltip remounts stable. |
| R9 | Adventure Map modal + minimap | current scene + <= 35 UI draw-equivalent | scene baseline | scene baseline | scene baseline | scene baseline | <= 700 nodes inside map, global <= 1800 | Minimap/map redraw dirty-state/event-driven, not per-frame DOM. |

## Repeated Prop Policy

Use shared geometry/materials or instancing/batching for:

- Cobble variants, small stones, rubble, cracked tiles.
- Flowers, grass tufts, ferns, shrubs, small ground cover.
- Fence posts, railing segments, bridge planks, roof trims.
- Crates, barrels, shelves, books, ledgers, sacks, produce, ore/coal chunks.
- Torch/lamp bodies where only transforms differ.
- Map markers and profession graph icons through cached icon markup.

New unique mesh families are justified only when they create a reusable builder or prefab family used across at least one complete scene target.

## UI Budget Rules

- Keep global managed windows at or below 8; target no more than 6 during visual-reference QA.
- Keep global DOM nodes at or below 1800 with all reference-required panels open.
- Keep per-modal graph/map DOM below its reference target; switch to canvas/SVG batching or simpler labels before exceeding it.
- Cache icons and prefab previews; the cached icon count must remain at or below 260.
- Do not update chat, minimap, map, atlas graph, hotbar, or tooltip DOM every frame.
- Damage, resource gain, and loot labels should be created from gameplay events, pooled where practical, and removed after fade.
- Tooltips must keep deterministic content by item/spell/skill/profession id.

## Renderer Budget Rules

- Capture dev render stats before and after each visual pass.
- Keep material count low by using `MaterialLibrary.get` and palette variants rather than one-off `MeshStandardMaterial` allocations.
- Prefer existing `VoxelKit` builders before custom mesh clusters.
- If a repeated prop family exceeds roughly 50 instances in a scene, evaluate instancing/batching before adding more.
- Dynamic point lights are reserved for forges, torches, spell effects, and key lamps; decorative lights must be baked into emissive material or omitted.
- Raycast candidates should include interactables and useful hover targets only, not every decorative prop or decorative child mesh.

## R1 Budget Capture - Prompt 111

Captured with the `r1-town-square` screenshot parity preset after the Briarbrook density pass.

| Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | DOM Nodes | Windows | Estimated Frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1366x768 | 358 / 360 | 400 / 950 | 42240 / 120000 | 34 / 120 | 184 / 650 | 442 / 1400 | 2 / 6 | 11.0 ms / 16.7 ms |
| 390x844 | 239 / 360 | 400 / 950 | 39612 / 120000 | 34 / 120 | 184 / 650 | 442 / 1400 | 2 / 6 | 9.5 ms / 16.7 ms |

Budget decisions:
- Dense repeated terrain/cobble, flower, trim, and small dressing families use instanced or post-build static batching where practical.
- Town sunlight shadows are not used as dynamic shadow casters; the R1 hub relies on ambient direction, emissive lamp accents, and material contrast.
- Town actor rendering is radius-gated to keep visible labels, bodies, raycast targets, and interaction readability aligned.

## R2-R4 Budget Capture - Prompt 112

Captured with the `r2-road-combat`, `r3-crypt-combat`, and `r4-forest-gathering` screenshot parity presets after the road/forest/crypt reference pass.

| Ref | Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | DOM Nodes | Windows | Estimated Frame |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R2 | 1366x768 | 197 / 300 | 195 / 800 | 20168 / 95000 | 17 / 50 | 105 / 450 | 417 / 1300 | 2 / 6 | 7.7 ms / 16.7 ms |
| R2 | 390x844 | 139 / 300 | 202 / 800 | 19560 / 95000 | 17 / 50 | 105 / 450 | 421 / 1300 | 2 / 6 | 7.0 ms / 16.7 ms |
| R3 | 1366x768 | 183 / 320 | 182 / 900 | 14908 / 110000 | 13 / 55 | 90 / 500 | 318 / 1350 | 1 / 6 | 7.3 ms / 16.7 ms |
| R3 | 390x844 | 129 / 320 | 182 / 900 | 14152 / 110000 | 13 / 55 | 90 / 500 | 418 / 1350 | 2 / 6 | 6.7 ms / 16.7 ms |
| R4 | 1366x768 | 220 / 330 | 278 / 900 | 23012 / 105000 | 45 / 80 | 189 / 600 | 402 / 1300 | 2 / 6 | 8.5 ms / 16.7 ms |
| R4 | 390x844 | 122 / 330 | 278 / 900 | 20804 / 105000 | 45 / 80 | 189 / 600 | 402 / 1300 | 2 / 6 | 7.3 ms / 16.7 ms |

Budget decisions:
- Road, forest, and crypt dressing reuse existing voxel helpers plus static batching/shared material caches; no unique authored mesh pipeline was added for prompt 112.
- Combat VFX are single-event slash, hit, projectile, and floating-text states rather than continuous particle trails.
- Crypt dynamic torch/light treatment stays at the shared dynamic-light budget and uses mostly emissive/static visual contrast.
- Forest resource feedback is tied to the active gather state; hover/active labels are temporary and no permanent node-name layer was added.
- Mobile target frames are repositioned below the compact top HUD so combat panels remain readable without overlapping vitals or the minimap.

## R5-R6 Budget Capture - Prompt 113

Captured with the `r5-smithy-crafting` and `r6-bank-storage` screenshot parity presets after the service-interior reference pass.

| Ref | Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | DOM Nodes | Windows | Estimated Frame |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R5 | 1366x768 | 77 / 260 | 75 / 650 | 4976 / 75000 | 3 / 35 | 27 / 350 | 587 / 1550 | 2 / 6 | 5.3 ms / 16.7 ms |
| R5 | 390x844 | 64 / 260 | 76 / 650 | 4820 / 75000 | 3 / 35 | 27 / 350 | 577 / 1550 | 2 / 6 | 5.2 ms / 16.7 ms |
| R6 | 1366x768 | 73 / 250 | 72 / 620 | 4820 / 70000 | 3 / 30 | 27 / 325 | 487 / 1600 | 3 / 6 | 5.3 ms / 16.7 ms |
| R6 | 390x844 | 63 / 250 | 72 / 620 | 4652 / 70000 | 3 / 30 | 27 / 325 | 487 / 1600 | 3 / 6 | 5.2 ms / 16.7 ms |

Budget decisions:
- R5/R6 interiors reuse existing voxel builders plus procedural ledgers, lockboxes, forge glow, ingot crates, and repair bench dressing; no external runtime asset dependency was added.
- R5 crafting uses a live queue/craft state and one restrained forge/craft-loop effect rather than a persistent particle field.
- R6 keeps bank and inventory as managed windows. Desktop uses paired windows; phone viewports use a stacked service layout to avoid bank/inventory overlap and window-layer confusion.
- Bank storage slots are scrollable inside the managed window when height is constrained.

## R7 Budget Capture - Prompt 114

Captured with the `r7-housing-build` screenshot parity preset after the housing build-mode reference pass.

| Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | DOM Nodes | Windows | Estimated Frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1366x768 | 123 / 330 | 124 / 850 | 13546 / 95000 | 9 / 45 | 46 / 550 | 636 / 1550 | 2 / 6 | 6.3 ms / 16.7 ms |
| 390x844 | 78 / 330 | 124 / 850 | 12214 / 95000 | 9 / 45 | 46 / 550 | 636 / 1550 | 2 / 6 | 5.7 ms / 16.7 ms |

Budget decisions:
- R7 keeps the plot boundary, road/water context, dock edge, and starter objects as procedural voxel geometry with shared material caches; no external runtime asset dependency was added.
- The placement ghost uses one transparent material plus a lightweight footprint helper and orientation arrow, not per-cell DOM or a mesh per grid tile.
- The build grid remains a live managed window with grouped categories; the compact placement help is fixed in a safe desktop HUD zone and embedded in the build panel on phone viewports.
- Housing placement validation remains gameplay-driven: outside-plot, collision/pathing, material shortage, and storage constraints come from the existing building/housing systems.

## R8 Budget Capture - Prompt 115

Captured with the `r8-profession-atlas` screenshot parity preset after the Profession Atlas reference pass. Render stats reflect the live Briarbrook town background plus the Atlas UI; modal node count is counted inside `.profession-atlas-redesign`.

| Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | Global DOM Nodes | Atlas DOM Nodes | Windows | Estimated Frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1366x768 | 358 / 450 hard | 400 / 1200 hard | 42240 / 140000 hard | 34 / 160 hard | 184 / 900 hard | 624 / 1800 | 150 / 900 | 2 / 6 | 11.0 ms / 16.7 ms |
| 390x844 | 239 / 450 hard | 400 / 1200 hard | 39612 / 140000 hard | 34 / 160 hard | 184 / 900 hard | 436 / 1800 | 150 / 900 | 2 / 6 | 9.5 ms / 16.7 ms |

Budget decisions:
- R8 uses custom HTML/SVG controls and existing CSS; no React, React Flow, or graph dependency was added.
- Graph layout is derived from authored profession node positions and state changes, not recomputed per frame.
- Future/unimplemented nodes are honest and toggleable. Hiding future nodes removes them and their edges from the live graph instead of only dimming them.
- Search, selected-node details, and pin-to-Journal reuse the dirty-state HUD path. Atlas search clears the cached skills fragment before immediate rerender so the graph does not stay stale while an input has focus.

## R9 Budget Capture - Prompt 116

Captured with the `r9-adventure-map` screenshot parity preset after the Adventure Map reference pass. Render stats reflect the Greymont Forest background, compact companion minimap, inventory/status panels, quest tracker, and expanded Adventure Map.

| Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | Global DOM Nodes | Map DOM Nodes | Windows | Estimated Frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1366x768 | 289 / 450 hard | 333 / 1200 hard | 23736 / 140000 hard | 61 / 160 hard | 255 / 900 hard | 526 / 1800 | 127 / 700 | 3 / 6 | 9.7 ms / 16.7 ms |
| 390x844 | 141 / 450 hard | 333 / 1200 hard | 20856 / 140000 hard | 61 / 160 hard | 255 / 900 hard | 526 / 1800 | 127 / 700 | 3 / 6 | 7.8 ms / 16.7 ms |

Budget decisions:
- R9 keeps the expanded map as DOM/SVG-like HTML over the existing HUD system and keeps the companion minimap compact and wordless while the map is open.
- Regional labels are live text inside the map markers, not only tooltip/title text, so screenshots remain readable.
- Discovery gating is applied before render: undiscovered road/crypt/plot/treasure markers are not present in the expanded map DOM by default.
- Layer filters remove layer DOM from the expanded map while preserving the player layer.
- No normal-mode debug travel buttons are rendered; dev travel remains gated behind both dev overlay and dev travel flags.

## R1-R9 HUD Screenshot Parity Capture - Prompt 117

Captured with `artifacts/playwright-runner/117-hud-screenshot-parity-smoke.mjs` across all nine screenshot parity presets, viewports 1366x768, 1600x900, and 1920x1080, and UI scales 90%, 100%, 110%, and 125%.

| Metric | Worst Observed | Hard Limit |
| --- | ---: | ---: |
| Rough draw calls | 360 | 450 |
| Meshes | 401 | 1200 |
| Triangles | 42264 | 140000 |
| Visible entities | 61 | 160 |
| Raycast candidates | 255 | 900 |
| Global DOM nodes | 680 | 1800 |
| Managed windows | 3 | 8 |
| Estimated frame | 11.0 ms | 16.7 ms |

Budget decisions:
- Prompt 117 keeps screenshot parity prompts in the live HUD and removes the debug-like `Screenshot parity ready...` prompt from reference captures.
- The 117 smoke treats `[ui-window-qa]` warnings as failures so hotbar/window overlap and missing scroll containment do not silently regress.
- The build panel now has managed-window scroll containment to keep action controls reachable at higher UI scales.
- R4 accepts the live gathering progress prompt after simulation advances, while unit coverage verifies the initial short affordance prompt.
- Remaining warnings are non-blocking browser automation warnings: AudioContext autoplay and Chromium `ReadPixels` during screenshot capture.

## R1-R9 Raycast And Light Budget Capture - Prompt 119

Captured at 1366x768 after moving runtime point-light plans behind a test-covered budget table and narrowing entity raycasts to primary pick-target meshes.

| Ref | Dynamic Point Lights | Raycast Candidates Before | Raycast Candidates After | Pick Proof |
| --- | ---: | ---: | ---: | --- |
| R1 | 3 / 3 | 184 | 63 | Bank portal pick resolves. |
| R2 | 3 / 3 | 105 | 33 | Highway Bandit pick resolves. |
| R3 | 3 / 3 | 90 | 25 | Skeletal Warrior pick resolves. |
| R4 | 2 / 3 | 189 | 88 | Active gathering target remains visible and budgeted. |
| R5 | 3 / 3 | 27 | 5 | Smithy service entities remain visible and budgeted. |
| R6 | 3 / 3 | 27 | 5 | Bank service entities remain visible and budgeted. |
| R7 | 2 / 3 | 46 | 15 | Build-mode scene remains budgeted. |
| R8 | 3 / 3 | 184 | 63 | Profession Atlas town background remains budgeted. |
| R9 | 2 / 3 | 255 | 120 | Adventure Map forest background remains budgeted. |

Budget decisions:
- The raycast counter now represents primary pick-target meshes per visible entity, not every child mesh in an entity model.
- Entity visuals, labels, service markers, terrain dressing, and static scene detail were not removed to reduce the counter.
- Runtime dynamic-light additions must go through `runtimeDynamicLightPlans` and stay within `assetPerformanceBudget.maxDynamicLights`.

## Verification Gates

Required after each implementation prompt in the visual block:

- Focused tests touching the changed surface, for example:
  - `npm test -- src/render/art-direction.test.ts src/ui/performance-budget.test.ts`
  - plus map, profession, crafting, inventory, or housing tests when those surfaces change.
- `npm run test:perf-ui`.
- `npm run build`.
- Browser smoke at desktop and one mobile-sized viewport for the changed reference.
- Dev render stats captured in the relevant QA/audit doc.
- Console check for runtime errors and repeated warnings.

Current full-project publish gate on 2026-05-20:

- `npm run lint`: passed (`tsc --noEmit`).
- `npm test`: passed, 88 files / 415 tests.
- `npm run test:perf-ui`: passed, 12 files / 77 tests.
- `npm run content:validate`: passed, 0 errors / 0 warnings.
- `npm run build`: passed with the accepted Vite large-chunk warning.

Remaining budget risks:

- Future Treasure Hunting expansion must reuse the R1-R9 budget counters for clue markers, secret containers, traps, map updates, floating text, and reward VFX.
- Current Vite app-entry bundle size warning is not a frame-budget failure, but it remains a release polish/code-splitting item.
- Content validation is currently clean; future content taxonomy warnings should not be treated as render-budget failures unless they change runtime visual scope.

## Visual Budget Checklist

- [ ] Baseline stats captured before adding detail.
- [ ] Repeated prop families identified before scene dressing.
- [ ] Shared geometry/material reuse documented for new builders.
- [ ] UI DOM/window counts checked with required panels open.
- [ ] Minimap/map/atlas updates confirmed event-driven.
- [x] No permanent resource labels added.
- [x] No debug buttons left in normal mode.
- [ ] Golden Path route smoke rerun after each visual prompt that touches town, road, forest, crypt, bank, smithy, map, or housing.

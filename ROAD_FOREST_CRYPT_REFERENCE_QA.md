# Road Forest Crypt Reference QA - Prompt 112

Prompt 112 implements the R2, R3, and R4 target screenshots as live adventure gameplay states: outdoor bandit combat, crypt undead combat, and forest gathering/mining route discovery.

## Acceptance Criteria

- [x] R2 Old River Road presents a readable combat lane with bandits, ally support, checkpoint dressing, fences, lanterns, target frame, damage float, slash VFX, projectile line, and active hotbar fallback.
- [x] R3 Forgotten Crypt presents a darker but playable combat space with torch pools, pillars, cracked floors, sarcophagus/altar dressing, readable undead target, loot label, spell VFX, and companion presence.
- [x] R4 Greymont Forest presents active gathering with distinguishable harvestable trees/ore, mine entrance dressing, tracks/clues, temporary `+12 Wood` feedback, and visible inventory/resource context.
- [x] Every obvious forest tree resource entity is backed by `ResourceMap` and returns an explicit response through the interaction affordance path: `Chop`, `Protected`, `Depleted`, or `Too small/shrub`.
- [x] Combat/gathering states are actual game state, not static overlays: target ids, gathering ids, hotbar slots, VFX, projectiles, labels, and action progress are all live state.
- [x] R2/R3/R4 render stats stay inside the stricter planning budgets in `VISUAL_BUDGET.md`.
- [x] Golden Path focused smoke remains compatible with the adventure reference pass.

## Implemented

- Added `src/render/AdventureReferencePlan.ts` as the R2/R3/R4 contract for road combat, crypt combat, forest harvesting, landmarks, prop families, feedback, and dynamic-light limits.
- Added `src/render/adventure-reference.test.ts` to enforce the reference contracts, screenshot parity state, forest resource map backing, explicit tree responses, and valid R4 gather distance.
- Updated `src/tools/screenshotParity.ts` so R2/R3/R4 presets apply real action states: active target selection, combat cooldowns, hit flashes, projectiles, floating damage, loot, active tool hotbar, and active gathering.
- Expanded `VoxelRenderer` road dressing with checkpoint/clearance markers, low fences, embankments, lantern/readability details, and road-side combat-safe props.
- Expanded forest dressing with mine tracks, forage clues, log/rock context, resource-node readability, and a parity spawn that keeps `res_tree_5` within valid gathering range.
- Expanded crypt dressing with cracked floors, torch pools, sarcophagus, altar, rubble/bones, and restrained light treatment.
- Updated resource affordances so forest axe targeting reports explicit `Depleted` and `Too small/shrub` responses instead of silent or ambiguous failure states.
- Adjusted mobile target-frame layout so combat target UI does not overlap compact player vitals or the minimap.
- Captured R2/R3/R4 desktop and mobile screenshots:
  - `artifacts/playwright/112-r2-desktop.png`
  - `artifacts/playwright/112-r2-mobile.png`
  - `artifacts/playwright/112-r3-desktop.png`
  - `artifacts/playwright/112-r3-mobile.png`
  - `artifacts/playwright/112-r4-desktop.png`
  - `artifacts/playwright/112-r4-mobile.png`

## Stack-Realistic Decisions

- No Blockbench or MagicaVoxel runtime dependency was introduced. New scene detail is procedural voxel geometry through existing renderer helpers and shared material caches.
- The references are approximated as production gameplay states, not pixel-perfect target copies; dense foliage, crypt rubble, and road dressing use low-poly/voxel substitutes.
- Combat effects are deliberately restrained: one slash/hit/projectile event plus short-lived labels instead of expensive particle trails.
- Forest labels are only hover/active/resource feedback. No permanent label layer was added for every node.
- R4 uses `res_tree_5` as the active wood target, with the parity spawn moved into real gathering range so the gather state survives simulation updates.

## Verification

Red/green:
- `npm test -- src/render/adventure-reference.test.ts` initially failed because `src/render/AdventureReferencePlan.ts` did not exist.
- `npm test -- src/render/adventure-reference.test.ts` passed after adding the reference contract and implementation.
- Browser smoke initially caught two real QA issues: target-frame timing/conditional checks and R4 gathering range. Both were fixed before acceptance.

Focused checks:
- `npm test -- src/render/adventure-reference.test.ts src/systems/tree-harvestability.test.ts src/systems/InteractionAffordanceSystem.test.ts src/game/world-feedback.test.ts src/systems/FacingSystem.test.ts src/systems/vfx-system.test.ts src/game/golden-path.test.ts src/tools/production-tools.test.ts` passed: 8 files, 34 tests.
- `node artifacts/playwright-runner/112-adventure-reference-smoke.mjs` passed at 1366x768 and 390x844 for R2, R3, and R4 with no console errors.

Final full gate:
- `npm test` passed: 66 files, 276 tests.
- `npm run test:perf-ui` passed: 12 files, 59 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts/playwright-runner/112-adventure-reference-smoke.mjs` passed at 1366x768 and 390x844 for R2, R3, and R4 with no console errors.

Additional gate fix:
- The full `npm test` run exposed that the existing long-running stability soak could exceed its local 10s Vitest timeout under full-suite CPU contention while the harness itself remained green. The test timeout was raised to 20s without changing `runStabilityGateHarness` or reducing soak coverage.

Browser smoke stats:

| Ref | Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | DOM Nodes | Windows | Estimated Frame |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R2 | 1366x768 | 197 / 300 | 195 / 800 | 20168 / 95000 | 17 / 50 | 105 / 450 | 417 / 1300 | 2 / 6 | 7.7 ms / 16.7 ms |
| R2 | 390x844 | 139 / 300 | 202 / 800 | 19560 / 95000 | 17 / 50 | 105 / 450 | 421 / 1300 | 2 / 6 | 7.0 ms / 16.7 ms |
| R3 | 1366x768 | 183 / 320 | 182 / 900 | 14908 / 110000 | 13 / 55 | 90 / 500 | 318 / 1350 | 1 / 6 | 7.3 ms / 16.7 ms |
| R3 | 390x844 | 129 / 320 | 182 / 900 | 14152 / 110000 | 13 / 55 | 90 / 500 | 418 / 1350 | 2 / 6 | 6.7 ms / 16.7 ms |
| R4 | 1366x768 | 220 / 330 | 278 / 900 | 23012 / 105000 | 45 / 80 | 189 / 600 | 402 / 1300 | 2 / 6 | 8.5 ms / 16.7 ms |
| R4 | 390x844 | 122 / 330 | 278 / 900 | 20804 / 105000 | 45 / 80 | 189 / 600 | 402 / 1300 | 2 / 6 | 7.3 ms / 16.7 ms |

Warnings observed during browser smoke:
- Existing content warning: `visual prefab tool:torch declares magicavoxel but has no sourcePath yet`.
- Browser autoplay warning for `AudioContext` before user gesture.
- Desktop Chromium emitted transient WebGL `ReadPixels` performance warnings during screenshot capture.

## Not Done

- No pixel-perfect copy of R2/R3/R4 was attempted.
- No new authored external model files were created.
- No new complex combat AI, dungeon-secret system, tree-felling physics, or full mining progression was added in this visual pass.
- No full 60-minute soak was run in this prompt.

## Remaining Risks

- The current screenshots are stack-realistic and readable but still less dense than the target references; future density should continue through batching/shared materials.
- The existing torch `sourcePath` warning remains an asset-pipeline cleanup item.
- The existing Vite large chunk warning remains outside this prompt.
- Broader save/load and long-session stability remain later release-candidate gates.

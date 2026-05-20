# Housing Build Mode Reference QA - Prompt 114

Prompt 114 implements the R7 target screenshot as a live Player Plot housing/build-mode state with real placement validation, grouped build categories, costs, rotation/cancel controls, and useful starter objects.

## Acceptance Criteria

- [x] R7 Player Plot presents a readable owned build area with fenced boundary, road approach, water/dock context, nearby town dressing, starter plot objects, grid overlay, and a valid placement ghost.
- [x] Build UI exposes `Walls`, `Floors`, `Doors`, `Roofs`, `Decor`, and `Utility/Storage` groups with selected piece state, item grid, selected detail, material cost, and a Place action.
- [x] Placement feedback includes valid green ghost, invalid red ghost, shortage/blocked amber states, footprint text, collision/pathing messaging, material shortage messaging, and an orientation arrow.
- [x] Player can discover place, rotate, cancel, snap, footprint, and material state without debug buttons in normal mode.
- [x] Starter housing is useful but constrained through `small_chest`, `basic_workbench`, `torch`, `bedroll_home`, `resource_crate`, and `small_trophy_hook`.
- [x] Placement stays constrained to the owned plot, cannot block occupied cells, consumes materials, creates storage only through legitimate placement, and persists through save/load.
- [x] R7 render and UI stats stay inside the stricter planning budgets in `VISUAL_BUDGET.md`.

## Implemented

- Added `src/render/HousingBuildReferencePlan.ts` as the R7 contract for scene composition, build tabs, starter pieces, validation feedback, constraints, and reference id.
- Added `src/render/housing-build-reference.test.ts` to enforce the R7 contract, screenshot parity state, useful starter pieces, build UI text/actions, material shortage, outside-plot blocking, and occupied-cell blocking.
- Updated `src/tools/screenshotParity.ts` so `r7-housing-build` applies a real housing state:
  - active `housing` area and claimed starter plot
  - open build and inventory panels
  - selected `small_chest` in `Utility/Storage`
  - seeded material stacks for visual and interaction checks
  - snapped grid, rotation state, valid ghost position, and R7 prompt text
- Updated `BuildPanel` with grouped R7 tabs, starter utility/storage pieces, placement state, footprint text, and explicit Place/Rotate/Cancel controls.
- Updated `UIManager` so Rotate dispatches real build rotation and Cancel leaves build placement mode.
- Updated `VoxelRenderer` with visible plot-boundary fence dressing plus ghost feedback colors, footprint helper, and orientation arrow.
- Updated housing starter definitions so `basic_workbench` and `resource_crate` are valid tier-0 starter utility pieces.
- Updated `torch` build-piece category to `Utility` so it appears in the R7 utility/storage build group.
- Added `artifacts/playwright-runner/114-housing-build-smoke.mjs` for desktop/mobile R7 browser smoke.
- Captured R7 desktop and mobile screenshots:
  - `artifacts/playwright/114-r7-desktop.png`
  - `artifacts/playwright/114-r7-mobile.png`

## Stack-Realistic Decisions

- No Blockbench or MagicaVoxel runtime dependency was introduced. R7 uses procedural voxel geometry and existing renderer helpers.
- The R7 house/plot is a stack-realistic playable build state, not a pixel-perfect copy of the target screenshot.
- Placement help is fixed in a safe desktop HUD zone and embedded in the build panel on phone viewports because an off-panel absolute helper was clipped or moved off-screen by managed-window constraints.
- The ghost and grid are renderer helpers, not DOM overlays, so build-mode feedback stays inside render/UI budgets.
- The build group `Utility/Storage` intentionally includes storage, crafting, utility, garden, and trophy pieces so the starter functional loop is visible in one build-mode pass.

## Verification

Red/green:
- `npm test -- src/render/housing-build-reference.test.ts` initially failed because `src/render/HousingBuildReferencePlan.ts` did not exist.
- `npm test -- src/render/housing-build-reference.test.ts` passed after adding the reference contract and implementation.
- Browser smoke initially caught the desktop placement help outside the viewport. It then caught the mobile media-rule transform still shifting the help panel off-screen. Both layout defects were fixed before acceptance.

Focused checks:
- `npm test -- src/render/housing-build-reference.test.ts src/systems/housing-system.test.ts src/game/golden-path.test.ts src/game/save-load-regression.test.ts src/ui/window-manager.test.ts src/ui/dom-rendering-budget.test.ts` passed: 6 files, 34 tests.
- `node artifacts/playwright-runner/114-housing-build-smoke.mjs` passed at 1366x768 and 390x844 with no console errors.

Final full gate:
- `npm test` passed: 68 files, 285 tests.
- `npm run test:perf-ui` passed: 12 files, 61 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts/playwright-runner/114-housing-build-smoke.mjs` passed at 1366x768 and 390x844 with no console errors. The JSON capture is `artifacts/playwright/114-housing-build-smoke.json`.

Browser smoke stats:

| Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | DOM Nodes | Windows | Estimated Frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1366x768 | 123 / 330 | 124 / 850 | 13546 / 95000 | 9 / 45 | 46 / 550 | 636 / 1550 | 2 / 6 | 6.3 ms / 16.7 ms |
| 390x844 | 78 / 330 | 124 / 850 | 12214 / 95000 | 9 / 45 | 46 / 550 | 636 / 1550 | 2 / 6 | 5.7 ms / 16.7 ms |

Warnings observed during browser smoke:
- Content validation is currently clean with 0 warnings.
- Browser autoplay warning for `AudioContext` before user gesture.
- Chromium can emit transient WebGL `ReadPixels` performance warnings during screenshot capture.

## Not Done

- No full structural simulation or arbitrary freeform mesh editing was added.
- No neighborhood/multiplayer ownership model was added.
- No new authored external model files were created.
- No full 60-minute soak was run in this prompt.

## Remaining Risks

- The torch prefab is documented as procedural-only; future authored torch source work should add a real `.vox` path before changing its source tool.
- The existing Vite large chunk warning remains outside this prompt.
- Broader mobile window presets may need another pass after additional reference modals are implemented.
- Long-session stability remains a later release-candidate gate.

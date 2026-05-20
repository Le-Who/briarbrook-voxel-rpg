# Briarbrook Town Square QA - Prompt 111

Prompt 111 implements the R1 target screenshot as a live Briarbrook Town Square state, not a static image or pixel-perfect copy.

## Acceptance Criteria

- [x] Cozy hub composition is present: central fountain, cobblestone plaza, dense flower beds, civic banners, benches, lamps, market dressing, and service signage.
- [x] Bank, smithy, market, forest road, old road, and housing ferry are identifiable through service plaques, route stones, minimap markers, and existing interaction prompts.
- [x] Player, fountain, at least three named NPCs, market, exits, and minimap context are readable in the R1 screenshot parity state.
- [x] HUD hierarchy matches the reference contract: top-left vitals, top-right minimap, bottom-left chat, bottom hotbar/progress, right-side inventory/status only when opened.
- [x] Repeated town dressing is implemented with instancing/batching/shared materials where practical.
- [x] Render stats stay inside the stricter R1 planning budget from `VISUAL_BUDGET.md`.
- [x] Golden Path focused smoke remains compatible with the town density pass.

## Implemented

- Added `src/render/TownSquareVisualPlan.ts` as the R1 visual target contract for town landmarks, service entrances, exit signs, NPC budget, dressing, and planning budgets.
- Added `src/render/town-square-reference.test.ts` to enforce the R1 landmarks, service routes, label budget, minimap markers, and NPC/dressing counts.
- Expanded Briarbrook's renderer dressing with service plaques, route stones, flower beds, civic banners, market produce stacks, benches, lamp placement, fountain trim, and ground-flower instancing.
- Added generic static mesh batching and terrain/flower instancing in `VoxelRenderer` to keep the denser hub inside budget.
- Added town-specific entity render culling so distant social/service actors do not create hidden raycast and mesh cost while nearby labels remain matched to visible bodies.
- Added a `Market Sign` minimap marker through `SpatialUX` to complete the town service triangle with bank and smithy.
- Adjusted short-height and mobile status-panel layout so the R1 right-side opened panels are readable on desktop and stay inside the viewport on mobile.
- Captured R1 desktop and mobile smoke screenshots:
  - `artifacts/playwright/111-briarbrook-town-desktop.png`
  - `artifacts/playwright/111-briarbrook-town-mobile.png`

## Stack-Realistic Decisions

- No Blockbench or MagicaVoxel runtime dependency was introduced. New town dressing is procedural voxel geometry plus reusable renderer helpers.
- Dense cobble/flower/fence/stall detail is approximated with shared materials and instanced/static-batched boxes instead of unique authored meshes.
- The R1 target keeps labels sparse: important nearby NPC names, selected or service markers, and minimap/service affordances carry most of the readability.
- Town lighting favors material contrast and lamp emissive accents; town directional shadows are disabled to keep the hub within frame and draw-call budgets.

## Verification

Red/green:
- `npm test -- src/render/town-square-reference.test.ts` initially failed because `src/render/TownSquareVisualPlan.ts` did not exist.
- `npm test -- src/render/town-square-reference.test.ts` passed after adding the R1 contract.

Focused checks:
- `npm test -- src/render/town-square-reference.test.ts src/render/art-direction.test.ts src/game/golden-path.test.ts` passed: 3 files, 11 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts/playwright-runner/111-briarbrook-town-smoke.mjs` passed at 1366x768 and 390x844 with no console errors.

Browser smoke stats:

| Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | DOM Nodes | Windows | Estimated Frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1366x768 | 358 / 360 | 400 / 950 | 42240 / 120000 | 34 / 120 | 184 / 650 | 442 / 1400 | 2 / 6 | 11.0 ms / 16.7 ms |
| 390x844 | 239 / 360 | 400 / 950 | 39612 / 120000 | 34 / 120 | 184 / 650 | 442 / 1400 | 2 / 6 | 9.5 ms / 16.7 ms |

Final full gate:
- `npm test` passed: 65 files, 273 tests.
- `npm run test:perf-ui` passed: 12 files, 59 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts/playwright-runner/111-briarbrook-town-smoke.mjs` passed at 1366x768 and 390x844 with no console errors.

Warnings observed during browser smoke:
- Content validation is currently clean with 0 warnings.
- Browser autoplay warning for `AudioContext` before user gesture.
- Desktop Chromium emitted transient WebGL `ReadPixels` performance warnings during screenshot capture.

## Not Done

- No pixel-perfect copy of the R1 image was attempted.
- No unique house facade models were authored for every building.
- No permanent crowd simulation was added.
- No full 60-minute soak was run in this prompt.

## Remaining Risks

- The R1 desktop draw-call planning budget is intentionally tight at 358 / 360; future town dressing should replace or batch before adding more unique props.
- Prompt 91's broader many-window layering risk still needs retest in later bank/smithy/map prompts.
- The existing Vite large chunk warning remains outside this prompt.
- The torch prefab is documented as procedural-only; future authored torch source work should add a real `.vox` path before changing its source tool.

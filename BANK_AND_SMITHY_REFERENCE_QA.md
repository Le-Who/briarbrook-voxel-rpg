# Bank And Smithy Reference QA - Prompt 113

Prompt 113 implements the R5 and R6 target screenshots as live service-interior gameplay states: Brom's Smithy crafting/repair and Briarbrook Bank storage/inventory transfer.

## Acceptance Criteria

- [x] R5 Brom's Smithy presents a readable cutaway workshop with forge glow, anvil, Brom, tool racks, ore/material bins, ingot crates, repair bench, warm lighting, and movement space.
- [x] R5 crafting UI is a live panel with recipe list, selected `Iron Armor`, existing inventory requirements, readiness state, quantity stepper, craft action, repair actions, and queue feedback.
- [x] Brom's public forge can start a real `iron_armor` craft without requiring a home forge.
- [x] R6 Briarbrook Bank presents a readable secure interior with banker counter, shelves, chests, ledgers, rug/banner, storage clutter, warm lighting, and stable banker prompt.
- [x] R6 bank UI is a live storage surface with bank grid, inventory grid, capacity, bank gold, item stack counts, drop targets, Take All, deposit, and withdraw interactions.
- [x] Inventory and bank storage are operable without window-layer confusion: paired on desktop, stacked on phone viewports.
- [x] R5/R6 render stats stay inside the stricter planning budgets in `VISUAL_BUDGET.md`.

## Implemented

- Added `src/render/ServiceInteriorReferencePlan.ts` as the R5/R6 contract for service props, UI requirements, prompts, and reference ids.
- Added `src/render/service-interiors-reference.test.ts` to enforce service contracts, screenshot parity setup, clean prompts, and Brom public-forge crafting behavior.
- Updated `src/tools/screenshotParity.ts` so R5 and R6 presets apply real service states instead of static screenshots:
  - R5 sets `blacksmith`, forge station, `iron_armor`, material availability, damaged repairable gear, a visible queue job, Brom hover/selection, and forge-loop VFX.
  - R6 sets `bank`, bank storage contents, bank gold, selected bank slot, Eldon hover/selection, and open inventory/bank panels.
- Expanded `VoxelRenderer` bank interior with shelf, ledger, lockbox, and chest dressing.
- Expanded `VoxelRenderer` smithy interior with forge glow, ingot crates, hot ingot, and repair bench dressing.
- Updated `InteractionAffordanceSystem` prompts:
  - `Banker - Open Bank`
  - `Blacksmith - Craft / Repair`
- Updated `BankPanel` with `Bank Storage`, capacity/gold summary, stable bank drop targets, and tooltip state.
- Updated `CraftingPanel` with `Blacksmithing` service title, requirements readiness, disabled missing-material state, queue row, and repair actions.
- Updated `CraftingSystem` so the public Brom forge can start forge recipes in the `blacksmith` area while other station types still require home stations.
- Updated `WindowManager` with a small-viewport service stack for `bank + inventory`, preventing the prompt 91 class of window overlap in the R6 phone capture.
- Added `artifacts/playwright-runner/113-service-interiors-smoke.mjs` for desktop/mobile service smoke.
- Captured R5/R6 desktop and mobile screenshots:
  - `artifacts/playwright/113-r5-desktop.png`
  - `artifacts/playwright/113-r5-mobile.png`
  - `artifacts/playwright/113-r6-desktop.png`
  - `artifacts/playwright/113-r6-mobile.png`

## Stack-Realistic Decisions

- No Blockbench or MagicaVoxel runtime dependency was introduced. New interior detail is procedural voxel geometry through existing renderer helpers and shared material caches.
- R5/R6 are stack-realistic approximations, not pixel-perfect copies. Workshop and bank details are functional low-poly/voxel props rather than unique authored meshes.
- R5 keeps a single restrained forge/craft-loop effect and relies on emissive materials for workshop heat.
- R6 uses desktop paired windows and phone stacked windows because side-by-side bank+inventory cannot fit cleanly in a 390px viewport.
- Bank scroll behavior is constrained to the storage slot grid when the managed window is shortened.

## Verification

Red/green:
- `npm test -- src/render/service-interiors-reference.test.ts` initially failed because `src/render/ServiceInteriorReferencePlan.ts` did not exist.
- `npm test -- src/render/service-interiors-reference.test.ts` passed after adding the reference contract and implementation.
- Browser smoke initially caught a real mobile window overlap: the bank panel covered inventory slot clicks on 390px width. The service stack was added before acceptance.

Focused checks:
- `npm test -- src/render/service-interiors-reference.test.ts src/ui/window-manager.test.ts src/ui/dom-rendering-budget.test.ts src/game/golden-path.test.ts src/systems/economy.test.ts` passed: 5 files, 31 tests.
- `npm test -- src/ui/window-manager.test.ts src/render/service-interiors-reference.test.ts` passed after the mobile service-stack fix: 2 files, 17 tests.
- `node artifacts/playwright-runner/113-service-interiors-smoke.mjs` passed at 1366x768 and 390x844 for R5 and R6 with no console errors.

Final full gate:
- `npm test` passed: 67 files, 282 tests.
- `npm run test:perf-ui` passed: 12 files, 61 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts/playwright-runner/113-service-interiors-smoke.mjs` passed at 1366x768 and 390x844 for R5 and R6 with no console errors. The JSON capture is `artifacts/playwright/113-service-interiors-smoke.json`.

Browser smoke stats:

| Ref | Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | DOM Nodes | Windows | Estimated Frame |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R5 | 1366x768 | 77 / 260 | 75 / 650 | 4976 / 75000 | 3 / 35 | 27 / 350 | 587 / 1550 | 2 / 6 | 5.3 ms / 16.7 ms |
| R5 | 390x844 | 64 / 260 | 76 / 650 | 4820 / 75000 | 3 / 35 | 27 / 350 | 577 / 1550 | 2 / 6 | 5.2 ms / 16.7 ms |
| R6 | 1366x768 | 73 / 250 | 72 / 620 | 4820 / 70000 | 3 / 30 | 27 / 325 | 487 / 1600 | 3 / 6 | 5.3 ms / 16.7 ms |
| R6 | 390x844 | 63 / 250 | 72 / 620 | 4652 / 70000 | 3 / 30 | 27 / 325 | 487 / 1600 | 3 / 6 | 5.2 ms / 16.7 ms |

Warnings observed during browser smoke:
- Existing content warning: `visual prefab tool:torch declares magicavoxel but has no sourcePath yet`.
- Browser autoplay warning for `AudioContext` before user gesture.
- Desktop Chromium can emit transient WebGL `ReadPixels` performance warnings during screenshot capture.

## Not Done

- No pixel-perfect copy of R5/R6 was attempted.
- No new authored external model files were created.
- No full crafting economy rebalance, auction-house flow, banking permissions, or unique model per recipe was added in this visual pass.
- No full 60-minute soak was run in this prompt.

## Remaining Risks

- The existing torch `sourcePath` warning remains an asset-pipeline cleanup item.
- The existing Vite large chunk warning remains outside this prompt.
- Phone bank/inventory stacking is functional and readable, but long-term mobile window presets may need a broader pass when more service panels are implemented.
- Broader save/load and long-session stability remain later release-candidate gates.

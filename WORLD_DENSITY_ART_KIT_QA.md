# World Density Art Kit QA

Prompt: 104-world-density-art-kit-and-procedural-prop-pass
Date: 2026-05-20

## Scope

- Added `AreaDensityArtKit` as the authored density contract for existing areas only.
- Covered required kit families: town stone path, timber house walls, roof variants, market props, forest vegetation, mine props, crypt props, road props, and housing plot props.
- Added 56 nonblocking procedural prop placements across Briarbrook, Old River Road, Greymont Forest/Mine, Forgotten Crypt, and Player Plot.
- Connected the plan to `VoxelRenderer` through `applyProceduralDensityPass`.

## Implementation Notes

- Repeated density props are batched through `InstancedMesh` via existing `queueInstancedBox` / `flushInstancedBoxBatches`.
- Props are small, nonblocking dressing only: flowers, grass tufts, stone chips, crates, barrels, signs, planks, rubble, bones, mushrooms, ore chips, and plot stakes.
- Placement data includes roles for landmarks, interaction affordances, path readability, and camera-safe dressing.
- Clearance zones keep new dressing away from the town hub, road combat lane, mine interaction prompt, forest gathering affordance, crypt combat/loot center, and housing build grid.
- The renderer uses canonical material/shape buckets for the density pass after an initial smoke run showed per-variant tiny props were too expensive.

## Acceptance Check

- No new regions were added.
- Existing locations receive denser authored dressing.
- Repeated props use shared geometry/material batching rather than unique meshes.
- New density props do not block movement and are kept out of gameplay clearance zones.

## Verification

- RED: `npm test -- src\render\area-density-art-kit.test.ts` failed before `AreaDensityArtKit` existed.
- GREEN: `npm test -- src\render\area-density-art-kit.test.ts src\render\art-direction.test.ts` passed.
- Browser smoke: `node artifacts\playwright-runner\112-adventure-reference-smoke.mjs` passed after the density pass was compressed back under scene budgets.

## Risks

- This pass improves procedural density but does not add external Blockbench/MagicaVoxel source assets.
- Runtime screenshots should still be used to tune exact prop placement if a future pass finds a specific camera angle too busy.

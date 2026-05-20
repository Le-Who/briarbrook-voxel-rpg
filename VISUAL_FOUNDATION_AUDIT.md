# Visual Foundation Audit

Prompt 110 creates shared systems for the reference implementation block. It does not attempt to match any one screenshot directly; individual reference passes must consume this foundation instead of adding scene-specific hacks.

## Foundation Added

- Reusable `VoxelKit` builders for prompt-110 prop families:
  - cobblestone/path, timber wall, roof/overhang, market stall, fountain, fence, lamp post, crates/barrels, flowers/bushes, trees/stumps, ore nodes, mine entrance, crypt wall/floor/pillars, forge, anvil, tool rack, bank shelf, bank counter, build-mode ghost, bridge, dock.
- Existing renderer one-offs for fountain, counter, anvil, tool rack, and mine entrance now route through shared kit builders.
- Lighting preset contract in `visualLightingPresets`:
  - Briarbrook day, road dusk, forest day, crypt readable, smithy forge, bank warm, housing build.
- CSS UI token aliases for the reference screenshot language:
  - panel background, gold border, title text, active/inactive tab states, slot border, selected/invalid states, compact minimap, target frame, item badges, graph families, objective map marker.
- Dev-only Screenshot Parity mode:
  - Nine presets matching R1-R9.
  - Applies area, player position, time phase, camera zoom/offset, active target, selected UI mode, and required windows.
  - Hides dev overlay and disables dev travel while active.
  - Camera controller locks to the preset zoom/offset/focus while parity is active.

## Acceptance Checklist

- [x] Individual references can use shared `VoxelKit` builders instead of local scene-only mesh clusters.
- [x] Runtime asset contract remains procedural-first and browser-native.
- [x] Lighting presets exist for all prompt-required moods with dynamic light budgets at or below 3.
- [x] UI tokens cover panels, gold accent, tabs, slots, state colors, minimap, target frame, item badges, graph nodes, and map markers.
- [x] HUD consistency is preserved by using existing player frame, hotbar, chat, minimap, and managed panels.
- [x] Screenshot Parity mode is dev-only and hides normal debug controls when preparing captures.
- [x] No debug buttons were added to normal mode.

## Verification

- `npm test -- src/render/art-direction.test.ts src/tools/production-tools.test.ts src/ui/ui-customization.test.ts`: PASS, 3 files, 21 tests.
- `npm test`: PASS, 64 files, 271 tests.
- `npm run test:perf-ui`: PASS, 12 files, 59 tests.
- `npm run build`: PASS. Existing Vite chunk-size warning remains.
- Browser smoke at `http://127.0.0.1:5173/`: PASS.
  - Applied and validated Screenshot Parity presets for R1 town, R5 smithy crafting, R7 housing build, R8 profession atlas, and R9 adventure map.
  - Confirmed parity mode opens expected panels, locks camera zoom, disables dev travel, and hides the dev overlay.
  - Screenshot evidence: `artifacts/playwright/110-screenshot-parity-smoke.png`.
  - Console warnings observed: existing missing `tool:torch` sourcePath warning, browser AudioContext autoplay warning, and WebGL `ReadPixels` stall warnings. No console errors.

## Not Done In Prompt 110

- No per-reference scene composition pass was implemented; those belong to prompts 111-118.
- No authored Blockbench or MagicaVoxel source files were created.
- No glTF/glb runtime assets were introduced.
- No final per-reference acceptance screenshots were captured yet; prompt 110 only captured a Screenshot Parity setup smoke image.

## Remaining Risks

- The new prop builders are available but not yet broadly used by every area builder; upcoming reference passes should replace local clusters only where it improves reuse without changing gameplay.
- Screenshot Parity presets are capture setup helpers, not acceptance proof by themselves.
- Prompt 91's multi-window layering issue still needs focused retesting in bank/smithy/map-heavy reference passes.

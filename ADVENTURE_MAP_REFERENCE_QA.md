# Adventure Map Reference QA - Prompt 116

Prompt 116 implements the R9 target as complementary compact minimap and expanded Adventure Map systems with discovery-gated regional navigation.

## Acceptance Criteria

- [x] R9 is approximated in-engine as a real expanded Adventure Map state, not a static screenshot.
- [x] Compact minimap can run clean and wordless with terrain/roads, player marker, north marker, and essential marker only.
- [x] When the expanded map is open, the HUD minimap remains compact instead of duplicating area/risk/time text.
- [x] Expanded Adventure Map can show Briarbrook, Old River Road, Greymont Forest, Mine Entrance, Forgotten Crypt, Briarbrook Bank, Brom's Smithy, Player Plot, roads/bridges, discovered markers, pinned objective, rumor, treasure clue, and route hint.
- [x] Discovery rules prevent undiscovered regional destinations and treasure clues from appearing by default.
- [x] Expanded map includes filters/legend, pin/unpin waypoint flow, center-on-player action, route hint, and no normal-mode debug teleport buttons.
- [x] R9 render and UI stats stay inside the budgets in `VISUAL_BUDGET.md`.

## Implemented

- Updated `Minimap` so `minimapMode: expanded` renders a compact companion minimap while the expanded map panel owns details.
- Updated `MapPanel` into an `Adventure Map`:
  - region-level markers for discovered destinations
  - live marker labels
  - regional roads/bridge hints
  - discovery-gated service/entrance/housing/danger/pinned layers
  - route hint panel
  - center-on-player waypoint action
  - unpin waypoint action
  - layer filters that preserve player context
- Added regional Adventure Map derivation in `MapPanel` using current discovery state, pinned waypoint, active rumors, and treasure map knowledge.
- Updated the R9 screenshot parity preset behavior so R9 opens in Forest with discovered Briarbrook/road/crypt/plot/services, pinned rumor, rough treasure map, treasure waypoint, inventory/status/quest panels, and expanded map mode.
- Added `artifacts/playwright-runner/116-adventure-map-smoke.mjs` for desktop/mobile R9 browser smoke.
- Captured R9 desktop and mobile screenshots:
  - `artifacts/playwright/116-r9-desktop.png`
  - `artifacts/playwright/116-r9-mobile.png`

## Stack-Realistic Decisions

- The expanded map remains a DOM/CSS UI surface in the existing managed window stack; no map engine or external dependency was added.
- The region map is a stylized tactical/navigation layer, not a full world-scroll cartography system.
- Discovery gating is data/state-driven before rendering, so hidden destinations are absent from the DOM rather than visually dimmed.
- Marker labels are visible in the expanded map only. The compact minimap keeps dots and north marker only to stay readable.

## Verification

Red/green:
- `npm test -- src/ui/map-navigation.test.ts` initially failed because expanded-map mode still rendered the detailed minimap and because undiscovered destinations leaked through town portal labels.
- Browser smoke then caught a visual readability issue: important regional marker names existed only as `title` attributes and were not visible on the map.
- Compact expanded-mode minimap, regional discovery-gated map derivation, and visible marker labels were added before acceptance.

Focused checks:
- `npm test -- src/ui/map-navigation.test.ts` passed: 1 file, 12 tests.
- `npm test -- src/ui/map-navigation.test.ts src/game/loop-governor.test.ts src/tools/production-tools.test.ts src/ui/window-manager.test.ts src/ui/dom-rendering-budget.test.ts` passed: 5 files, 43 tests.
- `node artifacts/playwright-runner/116-adventure-map-smoke.mjs` passed at 1366x768 and 390x844 with no console errors.

Final full gate:
- `npm test` passed: 68 files, 288 tests.
- `npm run test:perf-ui` passed: 12 files, 64 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts/playwright-runner/116-adventure-map-smoke.mjs` passed at 1366x768 and 390x844 with no console errors. The JSON capture is `artifacts/playwright/116-adventure-map-smoke.json`.

Browser smoke stats:

| Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | Global DOM Nodes | Map DOM Nodes | Windows | Estimated Frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1366x768 | 289 / 450 hard | 333 / 1200 hard | 23736 / 140000 hard | 61 / 160 hard | 255 / 900 hard | 526 / 1800 | 127 / 700 | 3 / 6 | 9.7 ms / 16.7 ms |
| 390x844 | 141 / 450 hard | 333 / 1200 hard | 20856 / 140000 hard | 61 / 160 hard | 255 / 900 hard | 526 / 1800 | 127 / 700 | 3 / 6 | 7.8 ms / 16.7 ms |

Warnings observed during browser smoke:
- Existing content warning: `visual prefab tool:torch declares magicavoxel but has no sourcePath yet`.
- Browser autoplay warning for `AudioContext` before user gesture.
- Chromium can emit transient WebGL `ReadPixels` performance warnings during screenshot capture.

## Not Done

- No infinite world map or scrollable cartography engine was added.
- No full GIS/pathfinding route system was added.
- No online/shared map behavior was added.
- No full 60-minute soak was run in this prompt.

## Remaining Risks

- The existing torch `sourcePath` warning remains an asset-pipeline cleanup item.
- The existing Vite large chunk warning remains outside this prompt.
- Future world expansion will need a richer regional-map data model rather than hard-coded first-region marker positions.
- Long-session map/minimap cadence still belongs to later release-candidate gates.

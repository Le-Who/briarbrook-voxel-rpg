# Profession Atlas Reference QA - Prompt 115

Prompt 115 implements the R8 target as a usable Profession Atlas: a relationship map for classless playstyles, not a passive skill tree and not an oversized empty panel.

## Acceptance Criteria

- [x] R8 is approximated as an actual interactive UI state in the existing Skills window.
- [x] Three-pane layout is present: profession lenses/filters on the left, graph canvas in the center, selected node/profession details on the right.
- [x] Required controls exist and work: search, zoom out, zoom in, fit, reset, pin goal, and show/hide future nodes.
- [x] Node types are distinct: Skill, Tool, Resource, Activity, Output, Service, Milestone, and Future/Unimplemented.
- [x] Initial lenses include Armsman, Ranger, Hedge Mage, Treasure Hunter, Field Medic, Town Smith, Builder, and Provisioner.
- [x] Selecting a lens highlights a planning route without locking class identity.
- [x] Pin Goal updates Journal state.
- [x] Atlas stays honest about not-yet-implemented skills and future contracts.
- [x] R8 render and UI stats stay inside the budgets in `VISUAL_BUDGET.md`.

## Implemented

- Updated `SkillsPanel` so Profession Atlas has a live three-pane relationship UI with:
  - left profession lenses
  - center SVG/HTML graph
  - right selected-node detail card
  - search
  - zoom out/in
  - fit/reset
  - pin lens/pin node
  - show/hide future nodes
- Added `professionAtlasShowFuture` to `GameState` UI state, actions, save/load migration defaults, Simulation handling, and LoopGovernor dirty signatures.
- Updated `UIManager` so Atlas search and future-toggle rerender the skills fragment immediately even while an input is focused.
- Expanded the Town Smith relationship cluster with mining activity, iron ore, iron bars, smith contracts, and future guild contracts so R8 presents the full node-type vocabulary in the blacksmithing target state.
- Updated the R8 screenshot parity preset behavior to open Atlas on Town Smith with Blacksmithing selected and relevant material/tool state seeded.
- Added `artifacts/playwright-runner/115-profession-atlas-smoke.mjs` for desktop/mobile R8 browser smoke.
- Captured R8 desktop and mobile screenshots:
  - `artifacts/playwright/115-r8-desktop.png`
  - `artifacts/playwright/115-r8-mobile.png`

## Stack-Realistic Decisions

- No React or React Flow dependency was added because the project is plain TypeScript + Three.js and the existing DOM/SVG UI stack is sufficient.
- The graph is authored data plus SVG/HTML, not a full graph engine. This keeps node count predictable and avoids adding a heavy dependency for one window.
- Future nodes are shown by default to keep the Atlas honest, with a live Hide Future control for players who want a cleaner planning view.
- R8 is a practical UI approximation, not a pixel-perfect copy. The target composition and function are preserved: lenses, graph relationships, selected detail, and HUD-safe modal behavior.

## Verification

Red/green:
- `npm test -- src/ui/profession-ui.test.ts` initially failed because the Atlas lacked `data-atlas-future="hide"` and show/hide future behavior.
- The focused test passed after adding future visibility state, controls, and rendering.
- Browser smoke initially caught two real interaction issues:
  - Town Smith did not expose every required node type in the R8 target state.
  - Atlas search/future-toggle could leave the graph DOM stale while the search input had focus.
- Both issues were fixed before acceptance.

Focused checks:
- `npm test -- src/ui/profession-ui.test.ts` passed: 1 file, 5 tests.
- `npm test -- src/ui/profession-ui.test.ts src/ui/skill-graph.test.ts src/systems/ProfessionSystem.test.ts src/tools/production-tools.test.ts` passed: 4 files, 20 tests.
- `node artifacts/playwright-runner/115-profession-atlas-smoke.mjs` passed at 1366x768 and 390x844 with no console errors.

Final full gate:
- `npm test` passed: 68 files, 286 tests.
- `npm run test:perf-ui` passed: 12 files, 62 tests.
- `npm run build` passed with the existing Vite large chunk warning.
- `node artifacts/playwright-runner/115-profession-atlas-smoke.mjs` passed at 1366x768 and 390x844 with no console errors. The JSON capture is `artifacts/playwright/115-profession-atlas-smoke.json`.

Browser smoke stats:

| Viewport | Draw Calls | Meshes | Triangles | Visible Entities | Raycast Candidates | Global DOM Nodes | Atlas DOM Nodes | Windows | Estimated Frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1366x768 | 358 / 450 hard | 400 / 1200 hard | 42240 / 140000 hard | 34 / 160 hard | 184 / 900 hard | 624 / 1800 | 150 / 900 | 2 / 6 | 11.0 ms / 16.7 ms |
| 390x844 | 239 / 450 hard | 400 / 1200 hard | 39612 / 140000 hard | 34 / 160 hard | 184 / 900 hard | 436 / 1800 | 150 / 900 | 2 / 6 | 9.5 ms / 16.7 ms |

Warnings observed during browser smoke:
- Content validation is currently clean with 0 warnings.
- Browser autoplay warning for `AudioContext` before user gesture.
- Chromium can emit transient WebGL `ReadPixels` performance warnings during screenshot capture.

## Not Done

- No external graph/layout dependency was added.
- No passive perk tree, build planner, or AI career advisor was added.
- No full profession contract economy was implemented beyond the Atlas relationship representation.
- No full 60-minute soak was run in this prompt.

## Remaining Risks

- The torch prefab is documented as procedural-only; future authored torch source work should add a real `.vox` path before changing its source tool.
- The existing Vite large chunk warning remains outside this prompt.
- The graph is authored, not automatic. Adding many future professions later will need a data/layout pass.
- Broader profession-contract gameplay remains a later gameplay/depth prompt, not prompt 115.

# Reference QA Matrix - Prompt 118

Prompt 118 verifies that the nine visual references are now maintainable, interactive implementation targets rather than brittle static recreations.

## QA Command

Fresh QA runner:

```powershell
node artifacts\playwright-runner\118-reference-qa-matrix-smoke.mjs
```

Additional gates reused for this cut:

```powershell
npm test
npm run test:perf-ui
npm run build
node artifacts\playwright-runner\117-hud-screenshot-parity-smoke.mjs
```

## Reference QA Matrix

| Ref | Scene | Scene Present | UI State Present | Actual Gameplay Interaction Works | Performance Acceptable | No Debug UI | Screenshot Parity Acceptable | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Briarbrook Town Square | yes | yes | yes | yes | yes | yes | None. |
| R2 | Old River Road Combat | yes | yes | yes | yes | yes | yes | None. |
| R3 | Forgotten Crypt Combat | yes | yes | yes | yes | yes | yes | None. |
| R4 | Greymont Forest Gathering | yes | yes | yes | yes | yes | yes | None. |
| R5 | Smithy Crafting | yes | yes | yes | yes | yes | yes | None. |
| R6 | Bank Storage | yes | yes | yes | yes | yes | yes | None. |
| R7 | Housing Build Mode | yes | yes | yes | yes | yes | yes | None. |
| R8 | Profession Atlas | yes | yes | yes | yes | yes | yes | None. |
| R9 | Adventure Map | yes | yes | yes | yes | yes | yes | None. |

Interaction evidence:

- R2/R3 use live combat target frames, selected enemies, damage/impact/projectile states, and existing combat systems.
- R4 uses an active gathering state on `res_tree_5`, live resource feedback, and inventory resource context.
- R5/R6/R7/R8/R9 have visible enabled action controls and are additionally covered by their feature-specific browser smokes from prompts 113-117.
- R1 remains the normal hub state that supports the Golden Path route, inventory/status awareness, NPC services, map/minimap context, and first-hour entry points.

## Performance QA

Captured at 1366x768, UI scale 100%, with all R1-R9 screenshot parity presets. `frameTimeMs` is the live automation sample; `estimatedFrameMs` is the render-budget signal used by the runtime guard.

| Ref | FPS Sample | Frame ms Sample | Estimated Frame ms | Draw Calls | Meshes | Visible Entities | Raycast Candidates | DOM Nodes | UI Renders/s | HUD Replaces/s | Memory MB | Tooltip Stability |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| R1 | 10 | 100 | 11.0 | 358 | 400 | 34 | 184 | 442 | 3.5 | 1.8 | 26.3 | stable, 0 mounts/updates |
| R2 | 10 | 100 | 7.7 | 197 | 195 | 17 | 105 | 447 | 2.1 | 1.1 | 26.3 | stable, 0 mounts/updates |
| R3 | 10 | 100 | 7.3 | 183 | 182 | 13 | 90 | 419 | 3.7 | 1.8 | 26.3 | stable, 0 mounts/updates |
| R4 | 10 | 100 | 8.5 | 220 | 278 | 45 | 189 | 407 | 1.8 | 0.9 | 26.3 | stable, 0 mounts/updates |
| R5 | 10 | 100 | 5.3 | 77 | 75 | 3 | 27 | 566 | 5.0 | 2.0 | 26.3 | stable, 0 mounts/updates |
| R6 | 10 | 100 | 5.3 | 75 | 73 | 3 | 27 | 481 | 5.8 | 1.9 | 26.3 | stable, 0 mounts/updates |
| R7 | 10 | 100 | 6.3 | 122 | 122 | 8 | 43 | 713 | 5.8 | 1.9 | 26.3 | stable, 0 mounts/updates |
| R8 | 10 | 100 | 11.0 | 360 | 401 | 34 | 184 | 425 | 4.0 | 1.3 | 26.3 | stable, 0 mounts/updates |
| R9 | 10 | 100 | 9.7 | 291 | 334 | 61 | 255 | 563 | 4.5 | 1.8 | 26.3 | stable, 0 mounts/updates |

All rows stayed under the hard budgets in `VISUAL_BUDGET.md`: 450 draw calls, 1200 meshes, 160 visible entities, 900 raycast candidates, 140000 triangles, 1800 DOM nodes, 8 visible managed windows, 16.7 ms estimated frame, and 180 MB post-transition memory estimate.

## Cut Pass

Removed or hidden:

- The debug-like `Screenshot parity ready...` HUD prompt was removed from live capture states in prompt 117.
- Screenshot parity/dev scene buttons remain gated behind the dev overlay and are absent from normal captures.
- Build-mode overflow was cut by adding managed-window scroll containment instead of leaving hidden action controls at higher UI scales.
- Permanent resource labels were avoided; resource feedback remains hover/active/floating-event driven.
- The 117 smoke now fails on `[ui-window-qa]` warnings, preventing future hotbar/window or scroll containment regressions.

Kept:

- Current scene prop density, because the R1-R9 performance and readability checks stayed under budget.
- Single-event combat/gathering VFX, because they support readability and remain well below VFX/performance budgets.
- HTML/CSS graph/map UI for R8/R9, because it remains interactive and under DOM budgets without adding a heavy graph dependency.

No cut required:

- No debug buttons were visible in normal captures.
- No reference state exceeded renderer or DOM budgets.
- No scene was reduced to a static image layer.

## Stack Reality Check

| Requirement | Result |
| --- | --- |
| Reproducible in current code | yes; all states are reached through `DEV_APPLY_SCREENSHOT_PARITY` and normal live systems. |
| Data-driven where possible | yes; references use existing entities, professions, recipes, bank/inventory, housing pieces, map layers, and content registries. |
| Performance-budgeted | yes; `VISUAL_BUDGET.md`, prompt-specific smokes, 117 matrix smoke, and 118 matrix smoke cover budgets. |
| Saved/loaded if persistent | yes for persistent gameplay surfaces; housing placement, bank/inventory, map/profession state, and previous save/load regressions are covered by existing tests. |
| Documented | yes; `VISUAL_REFERENCE_MAP.md`, `VISUAL_REFERENCE_IMPLEMENTATION_PLAN.md`, `VISUAL_BUDGET.md`, per-reference QA docs, and this matrix. |

## Acceptance

- The references have been translated into real maintainable implementation targets.
- No scene is just a static recreation.
- Improvements support the Golden Path and first internal alpha by preserving town/road/forest/crypt/service/housing/map/profession workflows under the shared performance and UI guardrails.

## Known Non-Blocking Warnings

- `tool:torch` is marked procedural-only, and content validation is currently clean with 0 warnings.
- AudioContext autoplay warnings appear in automation until a user gesture starts audio.
- Chromium `ReadPixels` warnings appear during screenshot capture and are tied to browser automation, not normal gameplay.

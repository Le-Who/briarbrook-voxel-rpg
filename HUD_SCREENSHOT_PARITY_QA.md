# HUD And Screenshot Parity QA - Prompt 117

Prompt 117 unified the live HUD contract across all nine visual reference presets. The pass keeps the screenshots as interactive game states, not static image mocks.

## Scope

Covered reference presets:

| Ref | Preset | Area | Required HUD State |
| --- | --- | --- | --- |
| R1 | `r1-town-square` | Town | Player frame, minimap, chat, hotbar, inventory/status context. |
| R2 | `r2-road-combat` | Road | Combat target frame, damage/combat VFX, no debug buttons. |
| R3 | `r3-crypt-combat` | Crypt | Combat target frame, party/combat state, no debug buttons. |
| R4 | `r4-forest-gathering` | Forest | Active gathering state, resource feedback, inventory/status context. |
| R5 | `r5-smithy-crafting` | Blacksmith | Brom service prompt, crafting action visible and usable. |
| R6 | `r6-bank-storage` | Bank | Banker prompt, inventory and bank storage usable together. |
| R7 | `r7-housing-build` | Housing | Build prompt, placement controls, ghost/grid, build panel scroll containment. |
| R8 | `r8-profession-atlas` | Town | Profession Atlas modal over stable HUD background. |
| R9 | `r9-adventure-map` | Forest | Expanded Adventure Map plus compact companion minimap. |

## Implementation Notes

- `src/tools/screenshotParity.ts` now assigns short, capture-safe HUD prompts instead of the prior debug-like `Screenshot parity ready...` prompt.
- `src/systems/InteractionAffordanceSystem.ts` now uses the prompt 117 short prompt contract for combat targets, bank/smithy service targets, and resource targets.
- `src/game/WorldFeedback.ts` now uses resource-definition names for hover/action labels, so ore/tree prompts read as `Oak Tree — Chop` and `Copper Vein — Mine`.
- `src/styles.css` gives `.managed-window.build-panel` its own vertical scroll containment, closing the build-panel overflow QA warning without changing normal panel composition.
- `artifacts/playwright-runner/117-hud-screenshot-parity-smoke.mjs` validates all nine presets across 1366x768, 1600x900, and 1920x1080 at UI scale 90%, 100%, 110%, and 125%.

## Prompt Contract

Verified short prompts:

| Target | Prompt |
| --- | --- |
| Banker | `Banker — Open Bank` |
| Oak Tree | `Oak Tree — Chop` |
| Copper Vein | `Copper Vein — Mine` |
| Brom | `Brom — Craft/Repair` |
| Skeletal Warrior | `Skeletal Warrior — Target` |
| Plot | `Plot — Build` |

R4 note: after the live gather loop ticks, the center prompt can transition from `Oak Tree — Chop` to progress text such as `Chopping Oak Tree... 56%`. The short affordance prompt remains verified by unit coverage and the preset state before the action-progress loop updates.

## Browser QA

Command:

```powershell
node artifacts\playwright-runner\117-hud-screenshot-parity-smoke.mjs
```

Matrix:

| Viewports | UI Scales | Presets | Total States |
| --- | --- | --- | ---: |
| 1366x768, 1600x900, 1920x1080 | 0.90, 1.00, 1.10, 1.25 | R1-R9 | 108 |

Checks performed:

- Player frame, hotbar, minimap, and chat or chat button are visible and inside viewport.
- Combat target frame appears only for R2/R3 and contains the selected enemy.
- Required action controls are visible and enabled for crafting, banking, building, profession pinning, and map waypoint flows.
- Managed windows stay above the hotbar safe area.
- `[ui-window-qa]` warnings are treated as smoke failures.
- Debug overlay, dev travel, screenshot preset buttons, and dev scene buttons are absent in normal HUD captures.
- DOM/window/render metrics remain under `VISUAL_BUDGET.md` hard limits.

Screenshots captured:

- `artifacts/playwright/117-R1-r1-town-square.png`
- `artifacts/playwright/117-R2-r2-road-combat.png`
- `artifacts/playwright/117-R3-r3-crypt-combat.png`
- `artifacts/playwright/117-R4-r4-forest-gathering.png`
- `artifacts/playwright/117-R5-r5-smithy-crafting.png`
- `artifacts/playwright/117-R6-r6-bank-storage.png`
- `artifacts/playwright/117-R7-r7-housing-build.png`
- `artifacts/playwright/117-R8-r8-profession-atlas.png`
- `artifacts/playwright/117-R9-r9-adventure-map.png`

## Budget Summary

Worst observed values across the 117 smoke matrix stayed below the shared hard budgets:

| Metric | Observed Max | Hard Budget |
| --- | ---: | ---: |
| Rough draw calls | 360 | 450 |
| Meshes | 401 | 1200 |
| Triangles | 42264 | 140000 |
| Visible entities | 61 | 160 |
| Raycast candidates | 255 | 900 |
| DOM nodes | 680 | 1800 |
| Managed windows | 3 | 8 |
| Estimated frame | 11.0 ms | 16.7 ms |

## Acceptance

- All nine target states can be captured from the actual game using screenshot parity presets.
- HUD hierarchy is consistent: top-left player frame, bottom hotbar, top-right minimap, bottom-left chat, contextual right/panel surfaces, combat target frame only in combat.
- The reference UI remains functional: action buttons are present/enabled where relevant and existing R5/R6/R7/R8/R9 smokes cover direct interactions.
- Prompt text is short and no longer uses debug-like screenshot readiness text.
- No debug controls remain in normal reference captures.

## Not Done

- No pixel-perfect copy work was attempted.
- No new external art pipeline dependency was added.
- The `tool:torch` prefab still declares a MagicaVoxel source without a sourcePath; this predates prompt 117 and remains a content-pipeline cleanup item.

## Remaining Risks

- Chromium reports expected AudioContext autoplay warnings in automated runs because no user gesture starts audio.
- Chromium `ReadPixels` performance warnings appear during screenshot capture; they are tied to automation capture, not normal gameplay.
- R4 has both an affordance prompt and a live gathering progress prompt. The QA runner accepts the live-progress prompt after the simulation advances.

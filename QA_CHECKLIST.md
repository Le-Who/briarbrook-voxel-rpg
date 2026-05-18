# QA Checklist

Current stability pass: 2026-05-18

## Critical Regression Matrix

| Category | Checks | Status |
| --- | --- | --- |
| Browser input | Right-click opens in-game context menu, page stays unscrolled, Esc closes context menu, UI drag does not select text | Checked in browser smoke |
| Window manager | Inventory, Spellbook, Skills, Journal, Market and Help open/close; drag clamps inside viewport; resize respects min size; active/new window rises above older windows; reset layout keeps panels above hotbar | Checked in browser smoke and `src/ui/WindowManager.test.ts` |
| Drag/drop | Inventory/spell/skill sources expose `data-hotbar-source`; hotbar slots expose `data-hotbar-drop`; HTML5 drop path remains implemented | Needs real-browser manual retest because current in-app CUA drag did not create a DataTransfer drop |
| Spellbook | Open/close, resize, grid/list/circle views, known/all/unknown filters, search data coverage, detail panel, assign-to-hotbar, cast selected spell | Checked by browser smoke plus `src/ui/SpellbookPanel.test.ts` |
| Inventory | Open/close, slots stay inside managed panel, tooltip path uses centralized tooltip layer | Checked in browser smoke and tooltip tests |
| Hotbar | Number assignment path, tooltip, page scroll isolation | Checked in browser smoke |
| Tooltips | One tooltip visible, tooltip layer uses `pointer-events: none`, no native title attributes in managed UI | Checked in browser smoke and `src/ui/TooltipManager.test.ts` |
| Transitions | Bank and smithy enter/exit loops, safe spawn, stale hover/target/approach cleanup | Checked by `src/game/transition-stability.test.ts` |
| Movement/action states | Direct movement cancels approach, stale buffered action watchdog, movement after transition | Checked by `src/game/transition-stability.test.ts` and browser movement smoke |
| Camera | Follow smoothing, reduced motion, camera smoothing controls, no transition snap regression | Checked by `src/render/RenderMotion.test.ts`, `src/game/camera-controller.test.ts`, Help control smoke |
| Save/load | Durable position, area, inventory, hotbar, known spells, UI layout/focus order, skills, quest progress; transient hover/targeting/context/pending action cleared | Checked by `src/game/save-load-regression.test.ts` |
| Combat targeting | Manual/assist/aggressive approach modes, archer/mage no unwanted melee approach, Esc cancellation, dead/unreachable target cleanup | Checked by `src/game/combat-intent.test.ts` |
| Resource targeting | Tool targeting path, resource approach, stale target clearing across transition | Covered by transition tests and existing resource/system tests |
| Performance | Production build succeeds; browser smoke had no new console errors; chunk-size warning remains non-blocking | Checked by `npm run build` and browser logs |

## Fixed During This Pass

- Spellbook detail no longer shows stale selected spell details when the active filter has no results.
- Save/load now clears transient hover, selected target and targeting state instead of preserving stale references.
- Window z-order now uses state-backed focus order so newly opened or focused windows reliably rise above overlapping windows.
- Help panel controls now fit inside the managed window width and key settings remain hit-testable above the hotbar.

## Automation Added

- `src/game/save-load-regression.test.ts` for durable save/load roundtrip and transient cleanup.
- Repeated bank and smithy enter/exit cycle coverage in `src/game/transition-stability.test.ts`.
- Window focus-order coverage in `src/ui/WindowManager.test.ts`.

## Known Follow-Up

- Native HTML5 drag-to-hotbar should be retested in a normal browser session. The in-app CUA drag path did not synthesize a `DataTransfer` payload, while click/keyboard hotbar assignment is verified and working.

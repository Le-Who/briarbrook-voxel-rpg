# UI/Input QA Gate

This checklist is the production gate for browser input, window layout, and major UI panels. Update it when input routing, managed windows, hotbar behavior, drag/drop, panel layout, or UI settings change.

## Browser Default Suppression

- Pass: right-clicking the game canvas opens the in-game context menu and does not show the browser menu.
- Pass: right-clicking spell, skill, item, and hotbar sources opens assignment/context UI instead of browser UI.
- Pass: native HTML drag is suppressed for game UI sources; custom pointer drag is used for hotbar assignment and inventory movement.
- Pass: text selection remains available in editable fields only.
- Pass: wheel events scroll internal panel bodies when available and do not scroll the page behind the HUD.

## Window Dragging

- Pass: dragging a managed window title bar moves the window with pointer events.
- Pass: title bars remain inside the viewport after drag.
- Pass: drag is cancelled by Esc and pointercancel.
- Pass: buttons, inputs, selects, and explicit no-drag controls inside headers do not start window dragging.

## Z-Order

- Pass: clicking a window brings it to the front.
- Pass: modal windows stay above non-modal windows.
- Pass: duplicate z-indexes are treated as a dev assertion failure.
- Pass: Esc closes the current topmost closeable window before falling through to pause.

## Viewport Clamping

- Pass: managed windows clamp to the visible viewport and reserve the hotbar safe area.
- Pass: saved layout reloads through sanitation and reclamps if the viewport shrinks.
- Pass: large windows use the mobile/fullscreen fallback below the small viewport breakpoint.
- Pass: reset layout clears persisted positions and restores usable defaults.

## Hotbar Accessibility

- Pass: every hotbar slot remains visible and hit-testable after opening large panels.
- Pass: the hotbar z-index stays above quest/objective overlays.
- Pass: digit hotkeys work in normal gameplay.
- Pass: digit hotkeys do not fire while a text field is focused.

## Spellbook/Hotbar Assignment

- Pass: dragging a known spell to a hotbar slot assigns that spell.
- Pass: right-click assignment menu assigns a spell/item to a selected slot.
- Pass: Shift+Digit assigns the selected spell when the spellbook is open.
- Pass: hotbar slots can be moved and cleared through custom UI.

## Inventory Drag/Drop

- Pass: dragging an item to the hotbar creates an item binding.
- Pass: dragging an inventory item to another inventory slot moves/swaps/merges according to inventory rules.
- Pass: dragging an item to a valid equipment slot equips it.
- Pass: invalid drops show an in-game prompt and do not mutate state.

## Chat Focus

- Pass: typing in chat does not trigger panel hotkeys or hotbar actions.
- Pass: Esc blurs chat/search fields first.
- Pass: spellbook and market search inputs preserve focus while typing.

## Right-Click/Context Actions

- Pass: canvas right-click opens the game context menu.
- Pass: build mode right-click rotates the pending building instead of opening browser UI.
- Pass: hotbar and source right-click menus close when clicking outside.

## Panel Overflow

- Pass: inventory, spellbook, skills, journal, market, crafting, character, and help panels stay within viewport bounds.
- Pass: large panel content scrolls internally.
- Pass: page-level horizontal and vertical scroll remain false during panel stress.
- Pass: title and close controls stay reachable.

## UI Scale

- Pass: UI scale supports 80%, 90%, 100%, and 110%.
- Pass: scale changes do not move panels over the hotbar.
- Pass: reset layout remains usable at each scale.

## Save/Load Layout

- Pass: valid persisted positions survive reload.
- Pass: invalid persisted positions are ignored.
- Pass: reset layout removes persisted layout data.

## Esc Behavior

- Pass: Esc cancels active hotbar/window drag.
- Pass: Esc cancels targeting.
- Pass: Esc closes context menus.
- Pass: Esc closes the top window before toggling pause.
- Pass: Esc blurs focused editable fields without pausing.

## Reduced Motion/UI Settings

- Pass: reduced motion can be toggled from Help.
- Pass: UI scale can be changed from Help.
- Pass: settings are reflected in the dev overlay debug state.

## Dev Overlay Isolation

- Pass: F9 opens/closes the dev overlay.
- Pass: gameplay hotkeys are blocked while the dev overlay is active.
- Pass: the overlay shows input mode, focused element/window, topmost window, active drag payload, pointer capture, last prevented browser default action, target mode, viewport, and UI scale.

## Browser Matrix

| Browser | Result | Notes |
| --- | --- | --- |
| Chromium / Playwright | Pass | Tested on 2026-05-20 with `npm run test:ui-smoke`; React inventory item drag to hotbar is hit-tested and validated at 1366x768 and 1600x900. |
| Chromium / Codex Browser | Pass | Tested on 2026-05-18 with the in-app Browser against `http://localhost:5173/`. |
| Firefox | Not run | No Firefox executable or browser target was available in this workspace session. |
| Safari | Not run | Safari is not available on this Windows workspace. |
| Edge | Not run | No Edge executable or browser target was available in this workspace session. |

## Viewport Matrix

| Viewport | Result | Notes |
| --- | --- | --- |
| 1366x768 | Pass | Panel geometry, hotbar hit testing, and UI scales 80/90/100/110 verified in Chromium. |
| 1440x900 | Pass | Full UI/input regression smoke passed in Chromium. |
| 1920x1080 | Pass | Large panel geometry verified in Chromium. |
| 520x720 | Pass | Smaller-than-intended/mobile clamp verified; spellbook stayed within viewport and above hotbar. |
| UI scale 80/90/100/110 | Pass | No body scroll, no hotbar obstruction, close controls reachable. |

## Critical Regression Checklist

| Test | Result |
| --- | --- |
| Right-click inside game does not open browser menu | Pass |
| Drag spell to hotbar | Pass |
| Drag item to hotbar | Pass |
| Drag inventory item to another slot | Pass |
| Drag window title bar | Pass |
| Open major panels and reset layout | Pass |
| Chat typing does not trigger hotkeys | Pass |
| Esc closes top window or cancels drag/targeting correctly | Pass |
| Panel scroll works without scrolling the page | Pass |
| Saved window layout reloads and reclamps | Pass |

## Automated/Semi-Automated Checks

- Vitest covers window clamping, default window layout, z-order layering, saved layout sanitation, hotbar source parsing, editable target detection, input mode derivation, and drag/drop payload rules.
- WindowManager dev assertions warn on:
  - title bars outside the viewport;
  - panel overlap with the hotbar safe area;
  - managed windows missing max-height constraints;
  - overflowing windows without an internal scroll region;
  - duplicate z-index ownership.
- Dev overlay instrumentation covers the live input/debug state needed to investigate regressions.
- Later React UI work added project-local Playwright gates (`test:ui-smoke`, `test:ui-visual`, and `test:ui-alpha`). This older Codex Browser smoke remains useful as historical input evidence, but the current committed browser runner is Playwright.
- `test:ui-smoke` now asserts that the center of a React inventory item source and hotbar target are the active hit-test elements before dragging, then verifies the hotbar binding in the React UI snapshot.

## Known Limitations

- Firefox and Edge compatibility remain unverified in this session because no runnable targets were available.
- Safari compatibility is unverified on Windows.
- The production build still emits the existing large chunk warning; it is not a UI/input failure but should be addressed by future code splitting.

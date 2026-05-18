# Stability Acceptance Gate

Date: 2026-05-18
Scope: browser input capture, UI/window management, hotbar drag/drop, input routing, save/load, and long-run softlock resistance after the phase 27-34 UI fixes.

## Result

Status: PASS

Evidence:
- `npm test -- src/tools/stability-gate.test.ts`: PASS. Covers new-game reset state, dev gate kit, all major panels open, content validation, save/load roundtrip, common input actions, and an accelerated 20-minute simulation soak.
- `npm test -- src/ui/window-manager.test.ts src/game/input-router.test.ts`: PASS. Covers saved window clamping, z-order helpers, hotbar source parsing, editable-field routing, targeting/build/pause/dev modes, modal UI, and drag modes.
- `npm test`: PASS, 20 files and 79 tests.
- `npm run build`: PASS. Vite still reports the existing large chunk warning.
- Browser smoke at `http://127.0.0.1:5173/`: PASS. Fresh reload had no new console errors, Gate Kit/Open Panels exposed 10 managed windows, all managed title bars stayed on-screen, hotbar stayed visible, document body did not scroll, and inventory window drag moved from about `1088,194` to `828,64` without fresh errors.

Remaining issues:
- None known from this gate.

Release note:
- Repeat the manual wall-clock 20-minute play pass before a public RC if later prompts change UI, input, save/load, or major panel structure.

## Manual Checklist

| Area | Case | Expected Result | Status |
| --- | --- | --- | --- |
| Browser input capture | Right-click canvas and game UI. | Browser context menu does not open inside game-owned surfaces. | PASS |
| Browser input capture | Right-click outside the game root. | Browser defaults are not globally destroyed. | PASS |
| Browser input capture | Drag item, spell, and window title bars. | No page text selection and no native ghost image. | PASS |
| Browser input capture | Wheel-scroll inside long panels. | Panel scrolls internally; document body does not scroll. | PASS |
| Pointer capture | Drag a managed window and release outside its original header. | Drag remains stable until pointer release. | PASS |
| Item drag/drop | Drag inventory item to hotbar. | Slot receives item/tool binding and remains usable. | PASS |
| Spell drag/drop | Drag spellbook spell to hotbar. | Slot receives spell binding and cast path remains available. | PASS |
| Skill/action assignment | Assign supported skill/action to hotbar. | Supported binding appears; unsupported source gives a clear prompt. | PASS |
| Right-click fallback | Right-click hotbar slot/context affordance. | Assignment/clear/move fallback works without browser menu. | PASS |
| Hotbar use | Press keys 1-0. | Correct hotbar slots fire; focused text fields do not trigger hotbar. | PASS |
| Hotbar overlays | Trigger cooldown/resource-cost actions. | Slot state remains visible and updates without hiding the bar. | PASS |
| Invalid assignment | Drop invalid source on a slot. | Clear user-facing prompt and no corrupted binding. | PASS |
| Window dragging | Drag inventory, spellbook, skills, journal, market, and help by title bars. | Movable windows follow pointer and stay within viewport title-bar bounds. | PASS |
| Window z-order | Click behind/overlapping windows. | Clicked window comes to front; modal windows stay above non-modal windows. | PASS |
| Window closing | Press Escape with windows open. | Targeting/context/selection cancel first, otherwise topmost closeable window closes. | PASS |
| Modal rules | Open help/trade/merchant modal windows. | Modal layer blocks only the modal flow; other windows are not permanently trapped. | PASS |
| Large panels | Open spellbook, skills, inventory, market, journal, and help together. | Coexist without trapping the user; long content uses internal scroll. | PASS |
| Hotbar accessibility | Open every major panel. | Hotbar remains visible and not permanently hidden. | PASS |
| UI scale | Scale down/up from Help. | Layout remains usable from 80% to 125%; text does not overflow controls. | PASS |
| Reduced motion | Toggle reduced motion. | Preference persists and motion-heavy UI can be reduced. | PASS |
| Save/load | Save after moving, changing inventory/bank/equipment/skills/spells/hotbar/quests/housing/UI prefs. | Loaded state preserves all listed categories. | PASS |
| Window layout load | Save or inject off-screen window positions. | Positions are clamped back into the usable viewport on load/decorate. | PASS |
| Targeting modes | Begin targeting, then open inventory/spellbook. | Targeting is preserved until explicit target or cancel. | PASS |
| Combat with UI open | Keep inventory/spellbook open and use combat/hotbar. | UI stays responsive; combat action can dispatch; no softlock. | PASS |
| Gathering with UI open | Keep inventory open and target resource with axe/pickaxe. | Gathering path remains available; UI does not eat the targeting state. | PASS |
| Escape/cancel | Escape during targeting, context menu, selection, and window state. | Correct top-priority cancel path runs. | PASS |
| Dev overlay separation | Toggle F9/dev overlay and use dev controls. | Overlay does not leak movement/hotbar input into gameplay. | PASS |
| Long play | Run 20 minutes of normal play/soak. | No UI/input softlock, no stuck action queue, no invalid state. | PASS via accelerated stability harness |

## Automated Harness

Scripted entrypoint:
- `src/tools/StabilityGateHarness.ts`

Focused test:
- `src/tools/stability-gate.test.ts`

Harness coverage:
- reset to a new game state;
- give test items and spells;
- open every major panel;
- validate the content registry;
- save/load roundtrip for player position/area, inventory, bank, equipment, skills, spellbook, hotbar, quests/journal, housing, UI preferences;
- simulate targeting plus inventory, Escape/cancel, hotbar dispatch, pause/help freeze, and dev overlay isolation;
- run an accelerated 20-minute simulation soak and check for queued-action softlocks.

## Blocking Criteria

This phase blocks new feature work if any of these regress:
- browser defaults interrupt canvas or UI interactions;
- managed windows can be dragged permanently off-screen;
- a panel permanently hides the hotbar or traps focus;
- item or spell hotbar assignment corrupts bindings;
- targeting is accidentally cancelled by ordinary panel use;
- save/load loses core player, inventory, bank, equipment, skill, spellbook, hotbar, quest, housing, or UI preference state;
- dev overlay input leaks into normal gameplay.

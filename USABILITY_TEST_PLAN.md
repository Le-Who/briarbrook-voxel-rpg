# Usability Test Plan

This plan tests whether a fresh player understands Briarbrook's current UI without developer coaching. It should be run before release-candidate cuts and after any major HUD, inventory, input, Journal, market, or build-mode change.

## Test Setup

- Build: current local branch, fresh save, default UI layout, 1366x768 desktop viewport first.
- Session length: 25 to 35 minutes per player.
- Moderator stance: give the task, stay quiet for 90 seconds, then allow one neutral hint.
- Recording: capture screen, task timer, wrong clicks, wrong panels, tooltip hovers, chat reliance, and recovery from invalid actions.
- Pass rule: a task is successful when the player completes it and can explain what changed in game state.

## Core Task Script

| ID | Task | Start Condition | Success Criteria | Expected UI Surface |
| --- | --- | --- | --- | --- |
| T1 | Move to Mira and talk | Fresh spawn in town | Player reaches Mira and triggers dialogue/interact | World labels, minimap, prompt, `Interact` action |
| T2 | Open inventory and identify equipped weapon | After T1 | Player opens Inventory and correctly says what weapon is equipped | Inventory, HUD loadout, Character if opened |
| T3 | Equip a bow or sword | Starter inventory unchanged | Player equips another valid weapon and can explain equipped state | Inventory, Character paperdoll, HUD weapon chip |
| T4 | Assign a spell to hotbar | Spellbook known spells available | Player assigns Magic Arrow or another known spell to a hotbar slot | Spellbook, hotbar assign menu, hotbar slot state |
| T5 | Use axe on a tree | Player has axe, near tree or forest route | Player starts or attempts valid tree gathering with axe | Hotbar/tool targeting, world labels, action progress |
| T6 | Identify why a spell cannot be cast | Missing reagent, no mana, out of range, or invalid target induced | Player can name the blocking reason without moderator naming it | Spell card, hotbar invalid state, prompt, tooltip |
| T7 | Compare two armor pieces | Inventory contains two armor candidates | Player identifies current armor, candidate armor, and likely tradeoff | Inventory compare panel, Character stats, tooltips |
| T8 | Find current objective in Journal | Quest tracker visible | Player opens Journal and finds the current objective route | Journal, Guide, Quest tracker |
| T9 | Open market/work order | Market access visible or quick button available | Player opens Market and explains one work order requirement/reward | Market board, work-order mode |
| T10 | Place a housing object if unlocked | Housing plot or build mode available | Player places or explains why placement is locked/unavailable | Build panel, housing plot, placement ghost |
| T11 | Reset UI layout | Windows moved or scaled | Player resets layout and notices windows return to default | Help/settings, managed windows |

## Metrics

Capture one row per task:

| Metric | Definition |
| --- | --- |
| Time to complete | Seconds from task readout to success or abandon. |
| Wrong clicks | Clicks on irrelevant world targets, slots, buttons, or disabled actions. |
| Wrong panel opens | Count of panels opened that do not help complete the task. |
| Tooltip hovers needed | Hovers or long pauses over tooltip-bearing UI before success. |
| Chat reliance | Count of chat/system messages read out loud or used as the main clue. |
| Equipped explanation | `pass`, `partial`, or `fail`; player can say what is equipped and where it is shown. |
| Active hotbar explanation | `pass`, `partial`, or `fail`; player can say which hotbar slot is active and why. |
| Invalid action recovery | `pass`, `partial`, or `fail`; player can recover after a blocked action. |

## Friction Tags

Use one or more tags on every issue:

- `visual ambiguity`
- `missing feedback`
- `too much information`
- `hidden control`
- `layout obstruction`
- `terminology problem`
- `input conflict`
- `state not visible`
- `text-only feedback`
- `unclear next step`

## Pass 0: Internal Simulated Run

Date: 2026-05-18  
Runner: Codex, simulated fresh-player pass against the current local UI after prompt 66 input/keybinding work.  
Method: reviewed the current rendered HUD/help/keybinding surfaces in browser, exercised keyboard capture, chat focus, context-menu navigation, and mapped the remaining first-session tasks against the live UI and existing audit docs. This is a baseline, not a substitute for an external player.

| Task | Result | Time | Wrong Clicks | Wrong Panels | Tooltip Hovers | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| T1 Move to Mira and talk | partial | 95s est. | 2 | 0 | 1 | World labels and minimap help, but "Press E nearby" competes with click-to-move expectations. |
| T2 Identify equipped weapon | pass | 25s est. | 0 | 0 | 0 | HUD loadout now exposes Iron Sword clearly; Inventory alone is less obvious than HUD/Character. |
| T3 Equip bow or sword | partial | 75s est. | 3 | 1 | 2 | Inventory selection/equip exists, but equipped-vs-assigned badges need player learning. |
| T4 Assign spell to hotbar | pass | 70s est. | 2 | 1 | 2 | Hotbar assign menu works; drag/right-click assignment is discoverable only after Help or experimentation. |
| T5 Use axe on tree | partial | 140s est. | 5 | 1 | 3 | Tool targeting is functional, but the route to a valid tree and targetable tree feedback needs stronger cues. |
| T6 Explain spell block | partial | 60s est. | 2 | 0 | 3 | Missing reasons exist in prompt/tooltips, but blocking state is still too text-dependent. |
| T7 Compare armor | partial | 95s est. | 3 | 2 | 4 | Comparison language exists, but the user must know which panel owns the comparison. |
| T8 Find objective in Journal | pass | 35s est. | 1 | 0 | 0 | Guide/Quest tracker point to Journal; Journal still has dense tab competition. |
| T9 Open market/work order | pass | 50s est. | 1 | 1 | 1 | Market work-order mode is understandable once opened; discovery depends on quick button visibility. |
| T10 Place housing object | partial | 180s est. | 6 | 2 | 3 | If not already at housing, the unlock/travel prerequisite is not visible enough. |
| T11 Reset UI layout | pass | 25s est. | 0 | 0 | 0 | Help exposes reset layout and presets clearly. |

Baseline interpretation:

- Fastest understood surfaces: HUD loadout, hotbar active slot, Help settings, Journal objective.
- Highest-friction surfaces: tool targeting, housing placement prerequisites, armor comparison ownership, spell failure reasons.
- Keyboard safety improved: typing in chat consumes number keys, Escape clears text focus before window cancellation, and context menu actions are keyboard navigable.

## Top 10 UX Issues And Concrete Fixes

| Priority | Issue | Tags | Evidence From Pass 0 | Concrete UI Fix |
| ---: | --- | --- | --- | --- |
| 1 | Tool use on world resources is not visually explicit enough. | `visual ambiguity`, `unclear next step`, `state not visible` | T5 had the highest estimated time and wrong clicks. | Add a persistent tool-targeting chip near the prompt and stronger valid tree/ore hover rings with the required tool icon. |
| 2 | Housing placement prerequisites are hidden until the player is already trying to build. | `hidden control`, `unclear next step`, `text-only feedback` | T10 depends on knowing travel/unlock state. | Add a Build panel prerequisite strip: current area, plot ownership, materials, selected piece, placement validity. |
| 3 | Spell failure reasons rely too much on prompt/tooltip text. | `text-only feedback`, `missing feedback`, `state not visible` | T6 requires hovering or reading prompt after failure. | Add reagent/mana/range blocker chips directly on prepared spell and hotbar spell slots. |
| 4 | Equipment compare ownership is unclear. | `hidden control`, `too much information`, `visual ambiguity` | T7 sends players between Inventory and Character. | Add a compact compare drawer inside Inventory when armor/weapon is selected, with "equipped" and "candidate" columns. |
| 5 | Equipped versus assigned versus active badges need a legend during first use. | `terminology problem`, `visual ambiguity` | T3/T4 use `E`, `H`, and active markers before players know them. | Add first-session tooltip copy and a short Help legend for `E`, `H`, active hand, missing requirement, and cooldown. |
| 6 | Market discovery depends on quick-button conditions. | `hidden control`, `unclear next step` | T9 is clear once opened but may be invisible. | Keep Market in Journal/work-order routes and add a disabled/locked Market entry explaining when it appears. |
| 7 | Journal objective is findable, but tab density creates scan cost. | `too much information`, `layout obstruction` | T8 passes but still exposes many competing tabs. | Add a default "Current" lane at the top of Journal with active objective, next action, and linked panel button. |
| 8 | Contextual invalid recovery is inconsistent across spells, tools, build, and hotbar. | `missing feedback`, `input conflict`, `text-only feedback` | T6/T10 recoverability is partial. | Standardize invalid action feedback: red/amber chip, one-line reason, and the next valid action button where possible. |
| 9 | Chat/system messages can become the main tutorial path. | `too much information`, `unclear next step` | Several tasks rely on chat as fallback explanation. | Move durable tutorial guidance into Guide/Journal, and reserve chat for world flavor plus recent event logs. |
| 10 | Help contains strong controls but is long and scroll-heavy. | `too much information`, `layout obstruction` | T11 passes, but keybindings/settings increase Help length. | Split Help into tabs or collapsible sections: Basics, UI, Keybindings, Accessibility, Systems. Keep Reset Layout always visible. |

## Reporting Template

Use this format after each external player:

```text
Tester:
Build:
Viewport:
Input device:

Task results:
T1 ...

Top observed friction:
1. [tag] Issue, task, evidence, proposed fix.

Quotes or player explanations:
- Equipped:
- Active hotbar:
- Invalid action recovery:

Release recommendation:
pass / needs fixes / block release candidate
```

## Release Gate

Before a release-candidate UI cut:

- At least 3 fresh-player passes should complete T1, T2, T4, T8, and T11 without moderator hints.
- Median time for T1, T2, T4, and T8 should be below 90 seconds each.
- No task should average more than 3 wrong panel opens.
- At least 2 of 3 players must explain equipped weapon and active hotbar slot correctly.
- At least 2 of 3 players must recover from one invalid spell/tool/build action without being told the fix.

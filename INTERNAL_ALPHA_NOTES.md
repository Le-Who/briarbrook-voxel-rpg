# Internal Alpha Notes

Audience: 5-20 controlled internal testers.
Purpose: structured feedback on the browser TypeScript + Three.js voxel RPG slice.
Positioning: this is not public marketing, not a public demo, and not a feature-complete promise.

## What Is In

- one region: Briarbrook, Old River Road, Greymont Forest, Forgotten Crypt, service interiors, and the starter housing plot.
- First 60-minute golden path: movement, talk, skills, gathering, banking, smithy/crafting, utility magic, road combat, crypt secret route, work order, and first housing placement.
- Treasure/dungeon secret MVP: suspicious ground, lock/trap/container routes, crypt clue, and early loot.
- Utility magic MVP: Magic Arrow, Heal, Night Sight, Detect Magic, Telekinesis, Unlock, Magic Lock, Magic Trap, Water Walk, Recall/Mark, and related feedback.
- Basic economy/work orders: vendor prices, market board, local demand, item sinks, repair costs, and first-hour balance reporting.
- Housing Tier 0-1: starter plot, build mode, simple storage, workbench route, and Tier 1 upgrade target.
- Readable combat encounters: road bandits, crypt undead, target frame, damage/guard feedback, healing and gear wear.
- Stable UI/performance guardrails: managed windows, hotbar, minimap/map, Profession Atlas, tooltip stability, save/load, and UI reset.

## What Is Not In

- No second region.
- No multiplayer gameplay.
- No full crime/PvP.
- No pets or taming.
- No large auction house.
- No boats.
- No huge spell expansion.

## Controls

- Move: WASD or Arrow keys. Mouse movement can be enabled from Help.
- Interact: E or click a nearby target.
- Hotbar: 1-0.
- Inventory: I.
- Skills and Profession Atlas: K, then select the Profession Atlas tab.
- Spellbook: M.
- Journal: J.
- Help/Pause: Esc.
- Build mode: use the Build panel on the housing plot.

## How To Test

1. Start a new save and follow the Next Step guide.
2. Talk to Mira, open Skills, gather from a tree, and mine ore.
3. Bank or sell spare goods, then visit Brom's Smithy.
4. Cast one valid spell and one spell with missing requirements.
5. Take the Old River Road and fight at least one bandit.
6. Visit Greymont Forest, find the mine/crypt route, and open or inspect one secret/loot object.
7. Complete one work order or market transaction.
8. Visit the housing plot, place one Tier 0 object, then check Tier 1 requirements.
9. Open Profession Atlas, select a profession node, and pin or inspect a goal.
10. Save, reload, and verify inventory, equipment, movement mode, map state, quest state, and UI layout.

## Bug Report Template

- Tester:
- Build/date:
- Browser and OS:
- Area:
- What you were trying to do:
- What happened:
- What you expected:
- Steps to reproduce:
- Save exported: yes/no
- Telemetry exported: yes/no
- Screenshot or short video attached: yes/no
- Severity: blocker / major / minor / polish

## Save Export Instructions

1. Open Help or Dev Tools if available in the test build.
2. Use Save Game before reproducing risky transitions.
3. Use the telemetry export/debug export control when requested by the test coordinator.
4. Attach the exported save/telemetry text with the bug report.
5. If export is unavailable, note the active area, quest step, inventory weight, gold, and last action.

## Questionnaire

- Did the first objective make sense within the first minute?
- Was movement clear in your chosen mode?
- Did you understand why a tree, ore node, spell, or work order could not be used?
- Was combat readable enough to understand target, danger, healing, and gear wear?
- Did the minimap or map help you choose where to go next?
- Did inventory weight, equipment condition, and active hotbar state stay clear?
- Did Profession Atlas feel like a profession relationship map rather than a passive skill tree?
- Did the housing plot feel reachable and useful within the first hour?
- What was the first moment where you felt lost?
- What was the most valuable improvement before a wider test?

## Telemetry Summary

Ask testers to export telemetry after the session when possible. Useful counters:

- First-hour path completion time.
- Damage dealt/taken and death count.
- Gold earned/spent.
- Resource yields/outflow.
- Skill gains and skill-use events.
- Potion, reagent, and bandage consumption.
- Durability loss and repairs completed.
- Work orders completed and completion time.
- Combat time-to-kill samples.
- Stuck recovery events, transition fallbacks, tooltip remounts, and UI reset usage.

## Known Issues

- The app still emits the existing Vite large chunk warning during build.
- Content validation has non-blocking event economy wording warnings and a visual prefab source-path warning.
- Localization is certified for critical prompts/new systems, but legacy UI labels are still mostly English.
- The balance targets are practical slice targets and need real tester telemetry before final tuning.
- This build is browser-only and controlled-test focused; it should not be treated as a public alpha.

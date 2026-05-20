# Golden Path QA

Prompt: 92-golden-path-release-director-pass
Date: 2026-05-19
Scope: first coherent starter route, lightweight first-hour Director, route QA, and release-director acceptance notes.

## Director Contract

- `deriveFirstHourDirector(state)` is the single first-hour route source for Guide, Journal, and map objective pins.
- Hints are delayed. The Director exposes `hint.unlocked=false` until the player has been inactive for `FIRST_HOUR_STALL_HINT_SECONDS` seconds on the current step.
- The route adapts from current state. If the player already completed an action, the next unfinished milestone becomes active.
- Map pins are objective waypoints only. They do not teleport, do not enable debug travel, and do not replace sandbox exploration.
- Defense is represented by the existing `Parrying` skill. `Survival` is now a real Wilderness skill so the first-hour surface can cover Cartography, Tracking, and Survival as separate profession concepts.

## Required Skill Surface

The first-hour recommendation pool covers these real skills:

- Combat: Swordsmanship, Archery, Tactics, Parrying.
- Recovery: Healing, Anatomy.
- Magic: Magery, Meditation, Evaluating Intelligence.
- Resource and craft: Mining, Lumberjacking, Blacksmithing, Carpentry.
- Dungeon and route utility: Lockpicking, Detect Hidden, Remove Trap, Cartography, Tracking, Survival.

The player does not need to master every skill in one hour. The route must make the profession surface visible and let at least 12 skill events happen naturally through use.

## Route QA Table

| Step | Expected Result | Fallback If Missing Item Or Context | Failure Handling | Save/Load Check |
| --- | --- | --- | --- | --- |
| 1. Arrive in Briarbrook | Fresh save starts in town with Guide open and no dev overlay. | Use new game state only. Do not use dev travel. | If guide is hidden, open Journal and confirm Current Objective. | Save immediately, reload, confirm area `town`, guide state, inventory, and hotbar persist. |
| 2. Talk to Mira | `talk_mira` completes and next objective moves to Inventory. | If Mira cannot be clicked, use nearby interaction prompt or map objective at the fountain. | If dialogue does not progress, inspect quest `prepare_for_road` objective state. | Reload after talk and confirm next step is still Inventory. |
| 3. Inspect Inventory and equipped gear | Inventory shows tools, beginner spellbook, consumables, weapon/armor slots, and carried resources. | If a tool is missing, buy or retrieve from bank/starting kit before leaving town. | If gear slots are empty, equip starter sword/armor or document broken starter kit. | Reload with Inventory open and confirm equipped gear remains. |
| 4. Open Skills and profession goal | Skills panel shows ledger/atlas/mastery and first-hour relevant skills. | If Skills panel cannot open from keybind, use UI button/panel action. | If Profession Atlas is not reachable, record as route blocker. | Reload and confirm Skills panel state does not corrupt hotbar or quest. |
| 5. Get and bind a tool | Axe and pickaxe are available on hotbar or inventory drag source. | If a hotbar slot is overwritten, drag the tool from Inventory back to an empty slot. | If drag/click assignment fails, use existing default hotbar and log UI issue. | Reload and confirm tool hotbar bindings persist. |
| 6. Chop a tree | Lumberjacking use yields logs and updates skill/quest/resource telemetry. | If current tree is protected or depleted, follow objective/map to a harvestable tree. | If gathering is interrupted, retry after movement stops and tool targeting clears. | Save after logs gained, reload, confirm logs and skill event persist. |
| 7. Mine ore | Mining use yields ore/stone and progresses Brom route. | If no ore in town, take Forest Road objective to Greymont mine rocks. | If rock is depleted, move to another vein or wait for respawn. | Reload after ore gained, confirm ore count and objective progress. |
| 8. Bank or sell one resource | Eldon or market interaction stores/sells one spare resource and marks economy/storage loop. | If too few resources, gather another small stack first. | If bank window cannot accept item, test drag/drop and direct action separately. | Reload after bank/sell and confirm item moved or gold changed. |
| 9. Craft or repair at Broms Smithy | Forge UI allows smelt/craft/repair and uses Blacksmithing loop. | If bars are missing, smelt ore first. If repair target is missing, craft a simple iron item. | If craft queue stalls, record station, recipe, resource counts, and timer state. | Reload after craft/repair and confirm output, resource spend, and station state. |
| 10. Prepare two spells | Magic Arrow and Heal are known/usable with mana and reagents. | If reagents are low, buy from Orren or use starter rewards. | If target spell fizzles, verify mana/reagents were consumed correctly and retry. | Reload after casting and confirm known spells/hotbar state. |
| 11. Take/check one work order | Market board or work-order surface shows a concrete demand and reward. | If no exact item is ready, pick an order that matches current material path. | If board is hidden behind another window, reset layout and record layering risk. | Reload with market state and confirm orders remain sane. |
| 12. Travel to Old River Road | Player reaches road through physical portal/sign route, no debug teleport. | If map waypoint is off-area, follow Town Gate/Old River Road signs. | If transition fails, use return guidance and inspect portal fallback telemetry. | Save on road, reload, confirm area `road` and objective marker. |
| 13. Survive road fight | Player damages a bandit, takes manageable pressure, and can recover. | Use melee, bow, Magic Arrow, potion, bandage, or Heal depending on resources. | If death occurs, record enemy, health, recovery action, and whether respawn works. | Reload during/after fight and confirm target/loot/quest state is stable. |
| 14. Reach Greymont Forest and mine route | Player follows forest route and sees mine/crypt lead. | If road route is dangerous, return to town, restock, then enter Forest Road. | If forest objective marker is absent, check Director objective for `forest_mine`. | Save in forest, reload, confirm area and discovered location. |
| 15. Discover crypt clue | Crypt lead is surfaced by mine entrance, lore clue, rumor, or route objective. | If clue item is missing, use mine/crypt entrance discovery as route clue. | If crypt feels like a blind teleport, document missing environmental cue. | Reload after clue/discovery and confirm Journal/Map still points correctly. |
| 16. Enter Forgotten Crypt | Player enters crypt through mine entrance and sees high-risk/dungeon UI context. | If too dark, use Night Sight or torch before entry. | If transition fallback fires, capture area before/after and safe spawn state. | Save on entry, reload, confirm crypt area, minimap risk, and return guidance. |
| 17. Solve one lock, trap, or secret | Detect Magic/Detect Hidden/Lockpicking/Remove Trap/open container resolves one curiosity beat. | If lockpicks are missing, use Detect Magic or a non-locked secret path where available. | If trap opens without readable warning, record as dungeon readability issue. | Reload after secret and confirm opened/disarmed/revealed state persists. |
| 18. Return to Briarbrook | Player exits crypt to forest and returns to town by road/sign route. | If lost, use map return guidance and entrance markers. | If objective remains stuck in crypt after return, inspect `return_town` milestone. | Save in town after return and confirm objective advances. |
| 19. Turn in or complete one work order | Work order completion or sale produces gold/reward and transaction log. | If exact work order item is missing, sell a gathered/crafted resource and record incomplete order risk. | If delivery consumes items without reward, block release and inspect EconomySystem. | Reload after completion and confirm gold, telemetry, and transaction log. |
| 20. Place one useful housing/workshop object | Ferry to plot, build mode placement, and persistent object appear on plot. | If materials are missing, use starter plot resources or gather wood/stone. | If invalid placement has no readable feedback, record build-mode UX issue. | Save on plot after placement, reload, confirm placed object persists. |

## Acceptance Checklist

- [x] First-hour Director tracks route milestones from state rather than fixed UI copy.
- [x] Director objective pins feed Journal and SpatialUX map/minimap layers.
- [x] Hints are delayed and only unlock after inactivity on the current step.
- [x] First-hour skill suggestions cover at least 12 real skills and the prompt-required profession surface.
- [x] Guide panel remains compact and uses the Director route.
- [x] No debug buttons or dev overlay are enabled in normal mode.
- [x] Browser smoke confirms fresh route objective, delayed hint derivation, Journal waypoint, Map objective row, and no dev travel.
- [ ] Full browser golden-path smoke from fresh save through housing placement.
- [ ] Full 60-minute wall-clock soak. This remains a release hold from prompt 91 unless replaced by an approved shorter soak.

## Verification

- `npm test`: PASS, 64 files, 266 tests.
- `npm run test:perf-ui`: PASS, 12 files, 59 tests.
- `npm run build`: PASS, with the existing Vite large chunk warning.
- Browser smoke: PASS at `http://127.0.0.1:5173/`.
  - Fresh save starts in town, dev overlay is false, Guide shows `Talk to Mira at the fountain`, no immediate hint, and two compact guide rows.
  - Delayed hint derivation unlocks after a 95 second stalled state and points to Mira.
  - Journal exposes an objective waypoint and includes `Survival` plus `Remove Trap`.
  - Expanded map lists `Talk to Mira at the fountain` as the objective and does not show dev travel.
  - Screenshot: `artifacts/playwright/92-golden-path-director-smoke.png`.

## Done In Prompt 92

- Added Director objective pins and stall-gated hint state.
- Routed Guide, Journal, and SpatialUX through the Director objective contract.
- Added `Survival` as a real Wilderness skill and included it in first-hour and profession surfaces.
- Added tests for delayed hints/objective pins and required skill coverage.

## Not Done In Prompt 92

- No new visual-reference implementation. That belongs to prompts 109-118.
- No gameplay-depth systems from prompts 93-108 were implemented.
- No multiplayer decision work was started.

## Remaining Risks

- Full 60-minute first-hour completion is not yet recorded in browser.
- Prompt 91 found a multi-window layering issue where an open Market window could intercept another panel interaction.
- First-hour work-order completion still depends on available inventory matching an order; QA should verify the simplest guaranteed order from a fresh route.

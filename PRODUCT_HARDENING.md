# Product Hardening Pass

Date: 2026-05-18

Scope: current playable slice after UI/window/input fixes. This pass focuses on the first 30-60 minutes: Briarbrook onboarding, resource gathering, banking, crafting, spellcasting, road combat, crypt prep, economy loops, and first housing placement.

## Golden Path Audit

| Step | Status | Notes |
| --- | --- | --- |
| Start in Briarbrook | Pass | New player now starts as level 1 with a compact road kit instead of a stocked demo character. |
| Talk to guide NPC | Pass | Quest focus and guide panel point to Mira first. |
| Open skills/spellbook/inventory/journal | Pass | Input/UI regression pass confirms panels open, clamp, and do not block hotbar access. |
| Gather wood/ore | Pass | Trees now produce Logs, matching the first quest and board/carpentry loops. Ore still feeds smelting. |
| Craft or repair | Pass | `smelt_iron` is the default forge recipe; crafting gives started/success/failure feedback. |
| Buy/bank/sell | Pass | Banking a spare resource advances the first quest; market/work orders remain available as early economy goals. |
| Cast spells | Pass | Beginner spellbook is limited to practical starter spells: Magic Arrow, Heal, Create Food, Night Sight, Detect Magic. |
| Fight road enemy | Pass | Road bandit HP/damage was tuned down for novice gear. |
| Enter crypt | Pass with caution | Crypt loop is connected by quest objectives and Detect Magic, but dungeon pacing still needs a dedicated playtest pass. |
| Loot/return | Pass with caution | Loot and container systems are functional; reward clarity should be revisited after dungeon secrets work. |
| Place housing object | Pass | Tier-0 quest wording now points to actually placeable camp objects. |

## Confusion Points Found

- Starter inventory looked like a demo sandbox: full armor, ring, bars, ore, building materials, many reagents, and a stocked bank.
- Beginner spellbook exposed every spell, making progression and profession identity feel fake.
- Tree entity harvesting could produce Wood while the first quest asked for Logs.
- Housing quest wording named objects that are not tier-0 placeable.
- Minimap coordinates exposed a raw `x,y,z` style readout.

## Fixes Applied

- Reduced starter state to a novice road kit:
  - level 1, 95 gold, empty bank;
  - leather armor and cracked shield instead of iron armor, silver ring, and top-tier kit;
  - enough tools, bandages, arrows, and starter reagents to practice, not skip loops.
- Limited `beginnerSpellIds` to the starter spell set.
- Changed tree resource definitions to yield Logs directly.
- Tuned early road enemies down for the new starter gear.
- Set default crafting recipe to `smelt_iron`.
- Reworded housing quest objective to tier-0 placeable objects.
- Replaced raw minimap `x,y,z` with an in-world `Map x:z` readout.
- Added `src/game/golden-path.test.ts` to verify early loop integrity without dev tools.

## Feedback Audit

| Action | Current Feedback |
| --- | --- |
| Cannot interact due to range | Prompt: move closer to named entity/resource. |
| Gathering starts | Prompt/action state shows action label and progress percent. |
| Gathering succeeds | System message, floating text, quest/telemetry updates. |
| Gathering fails or depleted | Prompt/system message explains missing tool, depletion, invalid target, or full pack. |
| Crafting starts | System message names recipe. |
| Crafting succeeds/fails | System/floating text names result; failure refunds where configured. |
| Spell cast starts | Words of power/casting prompt. |
| Spell succeeds/fizzles | Prompt/system/floating text; mana and reagents are consumed on cast start. |
| Banking | Item move advances quest and relieves weight pressure. |
| Work order/market | Transaction log, gold/resource telemetry, and reward preview. |
| Housing placement | Prompt explains invalid placement or confirms placed object. |

## Loop Integrity

- Gathering creates useful resources: Logs feed boards and market demand; ore feeds smelting and work orders.
- Resources feed crafting/building/work orders: early recipes and housing tier costs use gathered outputs.
- Combat consumes/rewards items: weapons degrade, potions/bandages matter, enemies drop gold/loot.
- Magic consumes mana/reagents and has value: starter spells cover damage, healing, light, food, and detection.
- Bank/storage solves pressure: first quest explicitly pushes banking, and housing storage persists later.
- Housing gives persistence: tier-0 camp placement and storage are covered by tests.

## Balance Notes

- Early road enemies now fit leather/cracked-shield starter gear better than the old iron-armor baseline.
- Starter potions and reagents are intentionally limited; Orren/Sela/market loops should matter.
- Starting gold is enough for first purchases but no longer enough to ignore resource and work-order loops.
- Gathering and crafting durations are acceptable for the current slice; revisit after a full timed 60-minute run.

## Known Issues / Next Priorities

- Dungeon reward clarity still needs a focused pass after the secrets/treasure prompt.
- Normal mode still exposes many systems quickly; profession clarity should be handled by the upcoming skill graph prompt.
- A committed browser E2E runner is still deferred; current browser smoke is semi-automated through Codex Browser.
- The production bundle still has the existing large chunk warning.

## Verification

- Focused product tests: `src/game/golden-path.test.ts`.
- Browser sanity in Chromium: Lv.1 start, no dev overlay/travel, road kit visible, no Iron Armor/Silver Ring/Iron Bar in starter inventory, no fresh console warn/error.
- Build: `npm run build`.

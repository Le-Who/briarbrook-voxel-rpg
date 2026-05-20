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
| Loot/return | Pass with caution | Loot and container systems are functional; opened dungeon containers now summarize exact gold and item rewards, but pacing still needs a dedicated playtest pass. |
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
- Added a guaranteed tier-0 Mira log work order that can be completed from the first starter tree harvest.
- Reworked Help/Settings guidance into first-hour, spell/tool/housing, panel, and current-UI sections.
- Made opened containers summarize exact reward gold and item names instead of referring to generic contents.
- Added browser smoke coverage for dragging a React inventory item to a hotbar slot and fixed the inventory/bank footer containment that made slot centers unhit-testable at 1366px.
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

- Normal mode still exposes many systems quickly; profession clarity should be handled by the upcoming skill graph prompt.
- Project-local Playwright browser gates now cover UI smoke, visual regression, and alpha acceptance; the remaining browser gap is the full Golden Path route and 60-minute soak.
- The production bundle still has the existing large chunk warning.

## Skipped Target Reclassification - 2026-05-20

| Target | Class | Decision / proof |
| --- | --- | --- |
| Help UI restructuring | Yellow, executed | Safety: guidance-only React UI copy/layout, no simulation or save contract change. Proof: `npm test -- src/ui/react/tests/common-surfaces.test.tsx`, `npm run test:perf-ui`. |
| Spell/tool/housing comprehension UX | Yellow, executed | Folded into Help/Settings sections with explicit spell targeting, tool targeting, and housing placement rows. Same proof as Help UI. |
| First-hour work-order guarantee | Yellow, executed | Safety: one low-tier order using existing economy completion flow, no reward inflation or schema change. Proof: `npm test -- src/systems/economy.test.ts`, `npm test -- src/game/golden-path.test.ts src/systems/FirstHourDirector.test.ts src/systems/economy.test.ts`, `npm run content:validate`. |
| Hotbar/native drag browser retest | Yellow, executed | Safety: browser-proof and CSS containment only, preserving existing drag payload/action contracts. Proof: `npm run test:ui-smoke` verifies inventory item drag to hotbar at 1366x768 and 1600x900. |
| Dungeon reward clarity | Yellow, executed | Safety: message/prompt wording only, no loot table, trap, lock, or economy change. Proof: `npm test -- src/systems/treasure-system.test.ts`. |
| Full browser Golden Path through housing | Yellow, blocked for exact proof | Missing proof: a no-dev browser route or manual QA log from fresh save through guide, gathering, bank/craft/spell, road, crypt, return, work order, ferry, and housing placement. Existing `test:ui-alpha` still uses dispatch/dev teleport, so it is not the requested full Golden Path proof. |
| 60-minute soak | Yellow, blocked for exact proof | Missing proof: a final-candidate 60-minute wall-clock browser run log, or an approved automated equivalent that records crash-free runtime, console/page errors, save/reload health, and memory/perf snapshots. |
| Vite code-splitting | Red for further warning-reduction work | Prompt 131 already added manual React/Three vendor chunks and lazy UI workspaces. Further splitting touches build/runtime loading invariants. Approval-ready proposal: protected invariant is stable Vite boot, chunk loading, world renderer startup, and offline/browser preview behavior; smallest safe scope is one measured split of static game data or renderer-adjacent systems; required tests are baseline and post-change `npm run build`, `npm run test:ui-smoke`, `npm run test:ui-alpha`, cold-load browser smoke, and dist chunk-size comparison; rollback is reverting `vite.config.ts` or the selected dynamic import boundary. |

## Verification

- Focused product tests: `src/game/golden-path.test.ts`.
- Browser sanity in Chromium: Lv.1 start, no dev overlay/travel, road kit visible, no Iron Armor/Silver Ring/Iron Bar in starter inventory, no fresh console warn/error.
- Build: `npm run build`.

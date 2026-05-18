# Golden Path: First 45-60 Minutes

Date: 2026-05-18
Target: a first playable session that starts in Briarbrook, teaches one system at a time, and ends with a persistent home object without using dev tools.

## Director Summary

The first session is a guided slice through town, professions, magic, road combat, forest harvesting, the Forgotten Crypt, economy, and housing. The player is Valen, a novice with a modest road kit, not a stocked demo character. The route uses normal portals, NPCs, resources, enemies, and panels.

Dev tools stay behind F9/dev overlay only. Normal play should not require teleport buttons, spawn buttons, raw coordinate reading, demo resource labels, or screenshot-only enemies.

## First 10 Minutes

Route:
1. Spawn in Briarbrook at the town square.
2. Talk to Mira at the fountain.
3. Open Skills, Inventory, Journal/Help.
4. Use the axe on a normal tree near town or Greymont Forest.
5. Bank one spare resource with Eldon.
6. Return to Mira to close the road-kit loop.

NPCs:
- Mira: session guide.
- Eldon: banking and storage pressure.

Systems taught:
- movement and interact;
- inventory and hotbar basics;
- skill list and gain progress;
- normal-world tree gathering;
- banking as storage relief.

Rewards:
- modest gold, bandages, boards, sulfurous ash.

Fail states:
- no axe: prompt explains the missing tool;
- full pack: gathering says the pack is full;
- no banked resource: quest focus keeps pointing at Eldon.

## First 30 Minutes

Route:
1. Take the profession leads unlocked after Mira: Brom, Orren, Sela.
2. Mine a valid forest rock face with the pickaxe.
3. Enter Brom's Smithy through the Smithy Door and smelt iron.
4. Visit Orren in town for reagents and spell practice.
5. Cast Magic Arrow, Heal or Night Sight, then Meditate.
6. Visit Sela and use a bandage.
7. Assign a spell/tool/heal item to the hotbar.
8. Walk through the Old River Road gate.
9. Fight the first bandit encounter and loot it.

NPCs:
- Brom: mining, forge, repair/craft motivation.
- Orren: reagents, spellbook, Magery, meditation.
- Sela: bandage timing and Healing/Anatomy.
- Gate Warden Alric: road danger.

Systems taught:
- Mining and Blacksmithing;
- reagent costs;
- spell targeting and utility magic;
- bandage delay;
- hotbar assignment;
- target selection, stamina, enemy wind-up, loot.

Rewards:
- iron bars, reagent refill, potions, road loot, XP/gold.

Fail states:
- missing ore/material: crafting panel explains missing materials;
- no mana/reagents: spell prompt explains cost and suggests potion/meditation;
- low health: Sela/potions/bandages give recovery routes;
- enemy pressure: downed state supports recovery instead of a hard stop.

## First 60 Minutes

Route:
1. Follow the road/forest lead to Greymont Forest.
2. Harvest real trees and rock faces near the old mine route.
3. Optional: use Detect Hidden, Tracking, or treasure clues around forest caches.
4. Enter the Forgotten Crypt physically through `Mine to Crypt`.
5. Clear the entry chamber and combat room.
6. Use Detect Magic/Detect Hidden/Lockpicking/Remove Trap/Unlock-style utility before the reward chest.
7. Open the Warded Reliquary or secret-room chest and loot it.
8. Exit back through the Forest Exit, return to Briarbrook.
9. Sell, repair, bank, or fulfill one work order.
10. Take the ferry to the housing plot.
11. Place one useful object: chest, workbench, torch, bedroll, resource crate, camp sign, or similar starter utility.
12. Save and reload to confirm persistence.

NPCs:
- Mira: crypt lead after the road is handled.
- Liora: crypt mood/party flavor.
- Joryn: plot handoff.
- Optional economy NPCs: Brom, Corrin, Eldon, Sela, market board customers.

Systems taught:
- world route continuity;
- forest harvesting;
- dungeon entry without teleport;
- trap/secret caution;
- loot and economy conversion;
- housing placement and persistence.

Rewards:
- crypt gold and ring;
- treasure/map objects;
- repair kit/vendor contract opportunities;
- starter home materials and persistent placed object.

Fail states:
- crypt too hard: return route remains open, town services are close;
- trap not detected: damage is survivable but teaches caution;
- missing lock/utility: route can still continue, but best reward is delayed;
- no housing materials: Joryn/quest rewards and Corrin's goods point to wood/stone.

## Exact World Route

1. Briarbrook spawn -> Mira at fountain.
2. Town tree or Forest Road -> normal tree.
3. Bank Door -> Eldon in Briarbrook Bank -> Town Door.
4. Forest Road -> forest tree/ore vein -> Town Road.
5. Smithy Door -> Brom's Smithy forge -> Town Door.
6. Orren/Ysolda/Sela in Briarbrook for magic/healing prep.
7. Old River Road gate -> road bandits -> Town Gate.
8. Forest Road -> Greymont Forest mine route.
9. Mine to Crypt -> Forgotten Crypt.
10. Forest Exit -> Forest Road/Town Road -> Briarbrook.
11. Bank/sell/repair/work order.
12. Housing Plot Ferry -> plot -> place object -> Town Ferry.

## Skill Coverage

Trainable or meaningfully touched in the current route:
- Swordsmanship: melee attacks on road/crypt enemies.
- Archery: optional bow pressure on road enemies.
- Tactics: support skill on weapon attacks.
- Anatomy: support skill on weapon/healing actions.
- Healing: bandages with Sela/road pressure.
- Magery: Magic Arrow, Heal, Night Sight, Detect Magic.
- Evaluating Intelligence: support for offensive spells.
- Meditation: active mana recovery.
- Mining: pickaxe on rock faces/ore.
- Lumberjacking: axe on normal trees.
- Blacksmithing: smelting/forge/repair route.
- Carpentry: boards, housing objects, plot loop.
- Detect Hidden: forest/crypt secret checks.
- Lockpicking: locked/trapped crypt containers where tools are available.
- Remove Trap: trapped container route where trained/available.
- Cooking or Alchemy: economy/crafting side path through Marella/Ysolda.
- Peacemaking/Musicianship: optional bard action in road combat if using the lute.
- Tracking/Cartography: optional treasure and forest clue support.

Not yet fully trainable as a required first-hour path:
- Animal Taming/Veterinary/Herding: defined skills, no first-session animal loop yet.
- Camping: defined as a fantasy role, not a functional required loop yet.
- Spirit Speak/Dark Rites/Arcane Force/Ritual Weaving: specialty identities, not first-hour required mechanics.

## Pacing Targets

Current target ranges:
- tree chopping: 1.2-3.5 seconds;
- mining: 1.5-4.0 seconds;
- early combat: 20-60 seconds per small encounter;
- bandage: meaningful delay around 4-5 seconds for a novice;
- spell cast: under 1 second for early spells with clear feedback;
- early crafting: 3-8 seconds for first recipes, within the 5-15 second target for meaningful items;
- travel between beats: usually under 1-2 minutes by portal/road route.

## Dev-Only

These are dev-only and must stay behind the dev overlay:
- teleport scene buttons;
- spawn item/enemy/gold controls;
- raw runtime coordinate inspection;
- resource reset;
- quest-step completion;
- stability gate kit/open-panels buttons.

## Intentionally Out Of Scope

Not part of the first 60 minutes:
- full class/profession specialization;
- deep player housing upgrade tiers;
- player vendors or multiplayer economy;
- complex taming/pet loop;
- long treasure-map chain beyond one optional cache;
- advanced spell schools and travel magic beyond basic utility;
- full dungeon boss progression.

## Acceptance Status

Status: PASS for the current build slice.

Implemented supporting changes:
- first-session quest leads now unlock by act prerequisites instead of handing the crypt lead out early;
- GuidePanel now points through town prep, professions, magic, road, forest, crypt, economy, and housing;
- Journal skill coverage now lists the actual first-hour trainable/support skills;
- automated tests cover the quest unlock order and the existing no-dev golden path loops.

Known gaps:
- the first crypt is spatially represented by connected dungeon content and secret/trap reward containers, but it is still compact;
- animal and camping professions remain defined but not first-hour functional requirements;
- the 45-60 minute timing is director pacing, not a literal forced timer.

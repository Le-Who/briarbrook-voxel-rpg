# Briarbrook Vertical Slice Director Pass

## What Works

- The player starts in Briarbrook with movement, click interaction, hotbar, inventory, skills, spellbook, quest tracker, minimap, local chat, and banking already available.
- The world has physical travel through doors, roads, ferry, forest, mine and crypt portals; debug travel is now hidden behind dev overlay state.
- Skill-by-doing is active for combat, weapon support, bandages, crafting, spellcasting, gathering, barding, lockpicking, trap handling, and core utility skills.
- Combat has target lock, telegraphs, stamina pressure, defensive action, ranged/melee attacks, spell projectiles, poison, bandages, potions, loot and enemy roles.
- Crafting and economy are connected through stations, recipes, repair, durability, merchant trade, work orders, market orders, item provenance and gold telemetry.
- Housing persists placed objects and already supports a meaningful first workshop object such as crate, torch, floor, wall, barrel, or door.
- Save/load covers player state, inventory, equipment, bank, skills, known spells, quests, resources, economy, world time, housing objects and container state.

## Stubbed Or Thin

- Crime, faction reputation and guard response are not part of the player path yet.
- Animal and advanced wilderness skills exist as future roles but are marked "Not yet trainable" if they are not wired into this slice.
- Multiplayer remains architecture-ready, not player-facing.
- Some economy depth is simulated through work orders and market orders rather than a full local supply chain.

## Confusing Before This Pass

- The tutorial path asked for broad systems but did not explicitly connect barding, Detect Magic, locked/trapped chests, or a final home object into the quest chain.
- Dev travel could be toggled separately from the dev overlay, which risked surfacing teleport buttons outside the intended dev-only surface.
- Skills UI implied every listed skill trained the same way; future-only skills now state that they are not trainable in this slice.
- The crypt had enemies and loot but lacked a clear lock/trap/magic-utility proof point.

## Isolated Systems Connected

- Detect Magic and Reveal now expose hidden/warded containers.
- Unlock Minor can open the crypt reliquary and marks the trap for safer handling.
- Lockpicking, Remove Trap, Detect Hidden and Resisting Spells now participate in a dungeon chest loop.
- Peacemaking/Provocation/Discordance can advance the road encounter quest, tying barding into the golden path.
- Telemetry now sees resource yields from terrain tools as well as entity gathering.

## Cut From Normal Player Path

- Spawn item, spawn enemy, add gold, set skill, reset resources, dev scenes, time simulation and telemetry export stay inside the dev overlay.
- Area teleport buttons are only rendered when the dev overlay is open.
- Test-scene labels are not part of the ordinary HUD.

## Dev-Only

- `F9` / backquote toggles the dev overlay.
- `F10` can still arm the old area travel list, but it is only visible while the dev overlay is open.
- Production validation errors and telemetry export are visible in console and dev overlay, not normal play.

## 60-Minute Target Flow

1. Arrive in Briarbrook, talk to Mira, read local chat/rumors, open Skills, inspect inventory and bank a spare resource.
2. Use axe and pickaxe on real terrain or resource objects, gain Lumberjacking and Mining, then return to town.
3. Visit Brom, smelt ore or repair/craft a simple item, learn durability and preparation.
4. Visit Orren, use the spellbook, cast Magic Arrow, Heal and Night Sight, then meditate.
5. Use bandages with Sela's lesson, then physically leave through Old River Road.
6. Fight bandits, read target frame/telegraphs, use defense, potion or bandage, try a bard action, loot the encounter.
7. Follow the route through forest and mine entrance, gather more resources and optionally reveal the hidden hunter cache.
8. Enter the crypt, fight skeletons and the mage cultist, cast Detect Magic, unlock/disarm/open the Warded Reliquary.
9. Return to Briarbrook, sell/bank/repair, complete the quest chain, travel to the housing plot and place a useful starter object.
10. Save, reload, and confirm inventory, skills, known spells, quests, reliquary/opened state and housing placement persist.

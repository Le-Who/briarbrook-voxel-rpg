# Briarbrook Refactor Notes

## Prompt 1 Audit

The current vertical slice already has a working loop: physical area travel, combat, gathering, crafting, trading, bank storage, housing placement, chat flavor, and save/load. The weak point is architectural: several systems are still authored in compact per-area modules rather than a full world graph. Resource nodes still begin from seeded data, and economy/crafting chains need a deeper regional model.

## Current Hardcoded Limitations

- World flow is still chunk/area-based internally, but normal play now uses physical portals instead of minimap travel buttons.
- Static geometry and blocked cells are authored as per-area code in `VoxelRenderer` and `AreaManager`.
- NPCs, enemies, portals, and many placements still originate in `createInitialEntities`.
- Skills were originally a fixed TypeScript union and panel rows were not grouped for a large skill list.
- Resource nodes rendered always-visible labels, which made the forest read like a debug scene.
- Combat targeting still uses a direct `activeTargetId` and should later converge with the generic target model.
- Crafting recipes exist as data, but production chains, vendors, and regional prices are still shallow.

## New Direction

- Keep `GameState -> Simulation Systems -> Renderer/UI` as the core contract.
- Move definitions into data modules first: skills, spells, resources, recipes, economy, and world graph.
- Treat Three.js objects as mirrors of state only; hover, selection, inspection, and interactions go through actions.
- Keep growing the connected overworld by turning current portals into richer adjacency/streaming metadata.
- Prefer inspect-on-hover and selected-target feedback over always-visible labels.
- Scale skills by category and data definitions so 50+ skills can exist without rewriting state or UI.

## Prompt 1 Code Changes

- Skills are data-driven through `src/data/skills.ts`, grouped by category, and migrated into old saves.
- Resource node behavior is data-driven through `src/data/resources.ts`; harvesting now reads duration, respawn, tool, skill, and inspection text from definitions.
- Firebolt has been moved into `src/data/spells.ts`; combat casts by spell id rather than a single hardcoded firebolt path.
- UI state now has generic hover and selected target references for entities, tiles, and inventory slots.
- Resource names no longer float over every tree and vein. Resource inspection appears only on hover or while gathering.
- The skills panel is grouped and scrollable for a large skill list.
- Inventory item actions can be closed. Dev travel remains available behind F10, but normal navigation uses doors, roads, ferries, and entrances.

## Prompt 2 Skill System Changes

- Added `src/data/skillDefinitions.ts` as the canonical registry for 55 skills across Barding, Combat, Warrior Specialties, Crafting, Magic, Thieving / Subterfuge, and Wilderness.
- `SkillState` is now decimal and cap-aware with `realValue`, `bonusValue`, `gainProgress`, `cap`, `mode`, `lastGainAt`, `lastSuccessfulUseAt`, and `ggsTimer`.
- Valen now uses a hybrid adventurer template: weapon combat, healing, parrying, magery, mining, lumberjacking, blacksmithing, and cooking start above zero while most other skills stay low.
- `SkillSystem.attemptSkillUse` is the central gate for gains. It handles Raise/Lower/Lock, the 700.0 total cap, difficulty-sensitive chance, related support skills, and a simplified guaranteed-gain fallback.
- Combat, ranged attacks, magic, gathering, and crafting now call `attemptSkillUse` rather than directly adding whole skill levels.
- Skills UI now has group tabs, search, one-decimal values, cap total, and per-skill mode buttons.
- Dexterity is now represented alongside Agility for compatibility; current formulas use Dexterity while old saves map Agility into Dexterity.

## Prompt 3 Targeting And Resource Changes

- Added general targeting actions for entity, tile, inventory, self/friendly/hostile style target refs, plus `BEGIN_TARGETING`, `CANCEL_TARGETING`, `USE_TOOL_ON_TARGET`, `USE_SKILL_ON_TARGET`, and `USE_SPELL_ON_TARGET`.
- Axe, pickaxe/shovel, and fishing pole now enter targeting mode from item Use or hotbar. Invalid targets produce chat/prompt feedback instead of silently doing nothing.
- Added `src/data/resourceMaps.ts` and `WorldState.resourceTiles` so static-looking forest/town trees, mine rocks, and water regions can be harvested without being special named entities.
- Lumberjacking now targets tree tiles and can produce logs, bark fragments, kindling, and higher-skill rare woods. Axe-on-logs can convert logs into boards.
- Mining now targets ore/rock tiles and supports skill-gated ore progression: iron, dull copper, copper, bronze, shadow iron, gold ore, and rare gems.
- Fishing now targets water tiles and can train Fishing/Cooking, with fish and rare junk/treasure table support.
- Resource feedback uses hover-only hints while targeting plus chat/floating text after the action; no permanent resource name labels were restored.

## Prompt 4 Magic And Spellbook Changes

- Replaced the one-off firebolt route with `src/data/spells.ts` and `src/systems/SpellSystem.ts`.
- Added 16 data-driven Magery spells across the first four circles: targeted damage, healing, food creation, night sight, cure, protection, strength, poison/debuff, telekinesis, wall of stone, and recall.
- Valen now starts with a beginner spellbook plus reagents; old saves migrate in the spellbook, known spells, and reagent stacks.
- Casting validates known spell, Magery requirement, mana, reagents, range, and target type before starting a timed cast.
- Reagents and mana are consumed on cast attempt, fizzles are real outcomes, and successful casts train Magery plus support skills such as Evaluating Intelligence, Meditation, Focus, and Resisting Spells.
- Added a real spellbook panel with circles, reagent counts, selected-spell details, target/self cast button, and a Meditation action.
- The hotbar's third slot now casts the currently selected spell rather than a hardcoded firebolt.
- Targeted spells work through the same target model as tools: choose a spell, enter target mode, or select an enemy and cast from the hotbar.
- Browser QA covered spellbook rendering, repeated Create Food casts with fizzles/successes and reagent consumption, Magic Arrow target casting against a Highway Bandit, target-frame HP changes, and console health.

## Prompt 5 Skill Template Combat Changes

- Item definitions now support weapon class, base damage, swing speed, range, stamina cost, ammo, durability, skill used, support skill, and special move tags.
- Combat formulas now use the equipped weapon model plus skill combinations: weapon skill affects hit chance, Tactics and Anatomy affect damage, Strength affects melee, Dexterity affects hit/dodge/speed, armor/resists reduce damage, and low stamina slows attacks.
- Shields now matter: Valen starts with an iron shield, Parrying can block enemy hits, shield durability degrades, and block feedback is shown as floating text/chat.
- Archery now consumes arrows. The bow hotbar path uses bow/ammo semantics even when Valen currently has a sword equipped.
- Added timed bandages with Healing/Anatomy rolls, interrupt risk from damage, and poison-cleansing support at higher Healing.
- Added poison potions and weapon coating. Poisoning skill determines success/potency, poison charges sit on the weapon stack, and undead resist poison heavily.
- Added Hiding/Stealth state. Hiding rolls against nearby enemies, hidden movement is slower, stealth movement can reveal Valen, and attacking/casting breaks hidden.
- Added a combat actions panel with Hide, Bandage, Poison Blade, Peacemaking, Provocation, and Discordance.
- Bard MVP is real: instruments gate bard actions, Musicianship is checked first, bard skills target enemies, cooldowns apply, and success/failure feedback is visible. Peacemaking pacifies, Discordance debuffs, and Provocation redirects enemies when another valid enemy is nearby.
- Enemy variety now includes Bandit Archer, Brigand Swordsman, Grey Wolf, and Mage Cultist alongside existing skeletons and bandits.
- Browser QA covered combat panel rendering, hide roll feedback, poison consumption/failure, bandage timer and completion, Peacemaking roll feedback, arrow consumption, ranged damage, target-frame HP changes, and console health.

## Prompt 6 Connected Overworld Changes

- Normal minimap travel buttons were removed. F10 toggles the old area buttons as a dev-only travel surface.
- Portals now carry destination spawn points and are handled through `InteractionSystem`, with fade, panel cleanup, discovered-area updates, and area-specific windows for bank/smithy/housing.
- Briarbrook was expanded with larger bounds, extra service NPCs, shops, docks, signs, gardens, and wider streets around the square.
- Greymont Forest was expanded with denser irregular tree placement, a path, stream/bridges, herb nodes, extra ore nodes, mine signage, and a physical mine-to-crypt entrance.
- Forgotten Crypt was expanded to a larger multi-room layout with branching blockers, side chests, more columns, torches, bones, and blood props.
- The minimap now shows route hints and portal markers instead of acting as a teleport menu.
- Browser QA walked from Briarbrook to Greymont Forest and then into Forgotten Crypt using physical Forest Road and Mine to Crypt interactions; normal HUD had zero `button[data-area]` controls.

## Prompt 7 Economy And Crafting Network Changes

- Recipe data now uses a richer model: station type, minimum skill, difficulty, inputs, outputs, exceptional chance, quality tier, failure mode, and optional tool requirement while preserving old recipe compatibility fields.
- Added station categories for forge/anvil, carpentry, fletching, alchemy, scribing, tailoring, cooking, and tinkering. The crafting panel now has station tabs, output rows, quality/failure metadata, and internal scrolling so craft buttons stay above the hotbar.
- Added working recipes across at least eight professions: smelting/blacksmithing, carpentry, bowcraft/fletching, tailoring, alchemy, inscription, cooking, and tinkering.
- Added supporting items for economy loops: oak bow, crossbow, refresh/cure/explosion potions, scroll/rune outputs, lockpicks, gears, lanterns, fish steaks, trail rations, crate/chest/door kits, mage robe, and leather armor.
- Town vendors now carry profession supplies and expose low-skill training offers. Merchant training uses real gold and updates skill values through `GameState`.
- New visual station props were added to town: cooking fire, alchemy table, scribe desk, loom, worktables, and tinkering bench.
- Browser QA covered station tabs, Tinkering craft queue/outcome, material requirement display, and Marshal Torren training Cooking from 14.0 to 15.0 with gold deducted.

## Prompt 8 Visual UX Immersion Changes

- Camera framing is slightly closer and lower, while keeping the orthographic isometric view.
- Per-area mood lighting now uses distinct fog ranges plus point-light accents for town lanterns, interiors, forge glow, forest torchlight, crypt torch pools, road dusk lights, and housing plot lanterns.
- Procedural materials now carry names/base colors so water/river/stream materials shimmer over time. Ground colors use deterministic subtle variation instead of strong checkerboard alternation.
- Terrain tiles now receive sparse integrated details such as cobble chips, grass tufts, forest tufts, crypt floor cracks, and road pebbles.
- Houses now have voxel tile roofs with ridges, seams, overhang trim, doors, lit windows, and brass knobs instead of single flat roof slabs.
- Added dense procedural prop families: barrels, sacks, benches, carts, well, flowerboxes, stumps, log piles, mushrooms, rock scatter, fallen branches, bushes, tombs, rubble, candles, cracked walls, chains, broken weapons, and wagon tracks.
- Character rendering now distinguishes social/NPC clothing, guards, merchants, cultists, archers, wolves, and skeletons. Actors have simple bob/limb/weapon motion and hit reactions.
- Loot labels now appear only near Valen or on hover; resource labels remain hover/gathering only.
- Added a real Guide panel with onboarding steps for Mira, tree gathering, Skills, Spellbook, bandages, and crypt traversal.
- Added spell and skill tooltip surfaces while preserving the scrollable 55-skill panel and spellbook layout.
- Browser QA confirmed no normal debug travel buttons, guide rendering, scrollable 55-skill All tab, spellbook entries, canvas sizing, and no fresh console errors after reload.

## Prompt 9 30-Minute Vertical Slice Changes

- Replaced the old starter quest set with a seven-part tutorial chain: Prepare for the Road, Ore for Brom, A Mages Errand, Patch Yourself Up, Trouble on the Road, Bones Beneath Briarbrook, and A Place to Call Yours.
- Added a quest-event layer so real simulation actions advance objectives: talking to NPCs, opening panels, gathering, crafting, buying, casting, meditating, bandaging, banking, entering areas, building, looting, and killing.
- The first 30-minute path now intentionally touches at least 12 skills through Lumberjacking, Carpentry, Mining, Blacksmithing, Arms Lore, Magery, Meditation, Evaluating Intelligence, Healing, Anatomy, weapon skills, Tactics, and Parrying/Defense.
- NPC dialogue now teaches mechanics in-world: Mira introduces preparation, Eldon explains bank weight relief, Brom explains smelting and forge patterns, Orren explains reagents/spellbook/meditation, Sela explains bandages, Alric frames road combat, Corrin points toward boards/housing, and Joryn explains persistent plot placement.
- Existing saves migrate into the tutorial chain and reopen the Quest Tracker and Guide so the new route is visible without resetting the whole game.
- Quest completion no longer removes simple collect objectives; only deliver objectives consume items, so tutorial resources remain useful for crafting and housing.
- Browser QA confirmed the tracker appears on existing saves, normal UI still has zero debug travel buttons, opening Skills advances the real Prepare for the Road objective, and no fresh console errors appeared after reload.

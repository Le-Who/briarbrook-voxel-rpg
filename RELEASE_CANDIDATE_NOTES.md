# Release Candidate Notes

Date: 2026-05-18
Target: first showable vertical slice of the modern UO-like voxel sandbox RPG.

## Implemented Systems

- Isometric Three.js voxel world with distinct town, bank, blacksmith, forest, road, crypt, and housing plot scenes.
- Keyboard/click movement, target selection, hover rings, world labels, context actions, and routed input modes.
- Windowed UI with inventory, bank, skills, spellbook, journal, market board, crafting, character, help, treasure map, build panel, and dev overlay.
- Use-based skills, stat modes, profession atlas, mastery milestones, relevant/future skill labeling, and skill telemetry.
- Inventory, equipment, weight, hotbar assignment, item use, consumables, tools, durability, repairs, and save/load persistence.
- Combat with melee, ranged, weapon abilities, defense, bandages, poison blade, bard skills, enemy telegraphs, loot drops, and downed/respawn state.
- Spellbook with known/unknown filters, mana/reagent costs, targeting, fizzles, projectiles, utility spells, Detect Magic, Unlock Minor, Recall/Mark support, and meditation.
- Resource gathering from world objects and terrain tiles, depletion/respawn, tool wear, and quest/telemetry hooks.
- Crafting, merchant sales, market buy/sell orders, work orders, gold sinks, and economy telemetry.
- Quest chain for the first session: Briarbrook prep, forge/magic/healing lessons, road combat, crypt reliquary, and housing placement.
- Treasure maps, hidden caches, crypt secrets, lock/trap/disarm flow, and dungeon reward tracking.
- Tier 0-1 housing with claim, placement, undo, move-last safety, storage persistence, reinforced storage, gardens, stations, rest, and plot-only build mode.
- Content validation and stability harnesses covering shipped content, UI/input, save/load migration, and first-session loops.

## Partially Implemented Systems

- Crime, snooping, theft, reputation, and risk zones exist but are intentionally light for this RC.
- Social NPCs simulate a lived-in MMO town with ambient dialogue/trade; they are not full multiplayer agents.
- Housing is a starter workshop slice, not full deed/vendor/decoration gameplay.
- Treasure hunting supports maps/secrets/locks/traps, but it is still a compact MVP.
- Economy has handcrafted work orders and market orders, not a fully simulated town supply chain.
- Performance stats are now exposed in the dev overlay as rough budgets, not a profiler replacement.

## Disabled Or Future Systems

- Debug scenes, teleports, item/enemy spawning, gold grants, skill grants, time changes, telemetry export, and content validation output are behind the dev overlay.
- Dev area travel remains hidden unless the dev overlay and dev travel flag are both active.
- Build mode no longer teleports from normal play; players must travel to the housing plot.
- Future-only/support skills are labeled in the Skills panel instead of being presented as fully trainable.
- Full-loot PvP, faction warfare, deep vendor AI, and long-term wilderness professions remain future milestones.

## Cut And Visibility Pass

| Surface | RC Decision |
| --- | --- |
| Quest tracker completion button | Cut from normal mode; ready quests now ask the player to speak with the giver. |
| Chat `+` save button | Cut; save stays in Help/dev surfaces where its meaning is clear. |
| Build button outside housing | Hidden and guarded; no normal-mode build teleport. |
| Resource labels | No permanent labels; hover/tool/gathering feedback only. |
| Debug travel buttons | Dev overlay only. |
| Unknown spells | Kept visible but honestly marked as Unknown with requirements. |
| Future/support skills | Kept visible with future/support labeling and tooltips. |
| Ambient social NPCs | Kept as town flavor because they have names/dialogue/trade or route context. |

## Known Issues

- The production bundle still emits the existing Vite large chunk warning.
- Browser QA is strongest in Chromium; Firefox headless screenshot smoke passed locally, and Edge remains a recommended repeat before public distribution.
- The first crypt secret loop is playable but still benefits from a guided lockpick/Unlock Minor tutorial step.
- Long-run balance beyond the first hour is not tuned.
- Some social/economy depth is authored rather than systemic.

## Controls

- Move: WASD or click.
- Interact: E or click nearby objects/NPCs/portals.
- Hotbar: 1-0.
- Inventory: I.
- Skills: K.
- Spellbook: M.
- Journal: J.
- Combat actions: A.
- Help/pause: Esc or `?` button.
- Dev overlay: F9/backquote.

## Golden Path

1. Talk to Mira at the fountain.
2. Open Skills and Inventory, inspect the starter kit.
3. Use axe on trees and bank one spare resource with Eldon.
4. Mine ore in the forest, visit Brom, smelt or repair.
5. Open Spellbook, cast Magic Arrow, Heal or Night Sight, then meditate.
6. Use bandages and assign at least one spell/tool to the hotbar.
7. Walk through the town gate to Old River Road.
8. Defeat a bandit, read telegraphs/target frame, loot the drop.
9. Follow the forest/mine route toward the crypt.
10. Use Detect Magic before the Warded Reliquary, then unlock/disarm/open it.
11. Return to town, sell or fulfill an order, bank spare goods.
12. Travel by ferry to the housing plot, place one useful object, save, reload, and verify state.

## Save/Load Notes

- Save/load preserves player state, inventory, equipment, bank, gold, skills, spellbook, quests, hotbar, UI preferences, economy, resources, treasure state, housing objects/storage, and world time.
- Volatile render/dev/action state is stripped or reset on save/load.
- Older saves are migrated for spellbook filters, skill/profession views, hotbar shape, resource definitions, economy fields, treasure fields, and render stats.

## Performance Notes

- Render budgets are tracked in the dev overlay: draw calls, mesh counts, instancing counts, visible entities, raycast candidates, rough frame estimate, geometry/material count, triangles, and heap when available.
- Current art direction favors reusable VoxelKit builders and cached box geometries.
- Static terrain and props rebuild on area transition; entities/effects update separately.
- If a scene exceeds budget, reduce low-value clutter before weakening interaction feedback.

## RC Validation Checklist

- `npm test` for full automated coverage.
- `npm run build` for TypeScript and production bundle verification.
- Browser smoke at `http://127.0.0.1:5173/` in Chromium: no normal-mode console errors, no page scroll, dev overlay only when toggled, save/load after refresh.
- Chromium desktop UI scale at 90%, 100%, and 110%; reduced motion on/off.
- Firefox headless screenshot smoke at 1280x720.
- Repeat Edge smoke before external release if Edge is part of the target browser matrix.

## Next Recommended Milestone

Make the first 60-minute session more guided and measured: add a lightweight RC playtest script, strengthen crypt prep around lockpicks/Unlock Minor, capture browser performance baselines per area, and tune work-order/housing rewards from observed first-session data.

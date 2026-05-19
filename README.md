# Briarbrook Voxel RPG

A browser-based voxel RPG vertical slice built with TypeScript, Vite, and Three.js.

Briarbrook is inspired by classic sandbox RPG verbs at a high level: town life, skills, inventory, banking, crafting, gathering, trading, housing, quests, and dungeon combat. It does not use copied names, maps, lore, UI assets, art packs, or external visual assets.

## Current Build Status

The current branch contains the Phase 10 performance and UI hardening pass. It is ready for focused internal playtesting, not a broad external release.

Recent hardening includes:

- CPU and render budget instrumentation with dev overlay counters.
- Loop governor throttling for active play, planning panels, pause/menu states, and background tabs.
- DOM rendering containment for inventory, chat, spellbook, skills, tooltips, and minimap.
- Stable tooltip lifecycle with viewport boundary clamping.
- First-class movable, resizable, collapsible chat panel.
- Compact minimap plus a separate expanded Map panel.
- Resizable inventory layout with fixed footer and centralized tooltip layer.
- Systemic harvestable and protected tree resources.
- Explicit movement modes: Keyboard Only, Mouse Only, and Keyboard + Mouse.
- Redesigned Profession Atlas with lenses, pan/zoom/search, node details, implemented/future status, and Journal pinning.

See `INTERNAL_BUILD_NOTES.md`, `PERF_UI_REGRESSION.md`, `PERFORMANCE_AUDIT.md`, `INVENTORY_LAYOUT_NOTES.md`, and `TREE_HARVEST_AUDIT.md` for the detailed cut notes and QA expectations.

## Run

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the local Vite URL, usually `http://127.0.0.1:5173/`.

Production build:

```bash
npm run build
```

Production preview:

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

## Verification

Before treating a cut as playable, run:

```bash
npm test
npm run test:perf-ui
npm run build
```

`npm run test:perf-ui` is the focused regression gate for Phase 10. It covers performance counters, loop governor behavior, DOM render containment, tooltip stability, chat modes, minimap/map behavior, movement modes, save/load persistence, tree harvestability, and Profession Atlas UI.

`npm run build` currently passes with the known Vite warning that the main JavaScript chunk is over 500 kB after minification. That warning is accepted for the internal build and tracked for later code splitting.

## Controls

- `WASD` / arrow keys: move in Keyboard Only or Keyboard + Mouse mode.
- Mouse click: select, attack, interact, and move only when Mouse Only or Keyboard + Mouse mode allows it.
- `E`: interact with the nearest usable object.
- `1`: attack.
- `2`: bow attack.
- `3`: Magic Arrow.
- `4`: health potion.
- `5`: mana potion.
- `6`: bandage.
- `7`: axe/world tree target.
- `8`: pickaxe/world mining target.
- `9`: Night Sight.
- `0`: utility action; opens pack or build flow depending on context.
- `[` / `]`: select previous or next hotbar slot.
- `C`: character panel.
- `K`: skills and Profession Atlas.
- `I`: inventory.
- `B`: bank panel.
- `H` or Build button: housing/build mode.
- Build mode: left click place, right click rotate, `Z`/`C` rotate, `X` cancel, `V` snap.

Movement Mode and camera-relative movement are configured from the Help panel. Keyboard Only is the default so accidental ground clicks do not move the player.

## Implemented Systems

- Serializable `GameState` owns player, entities, inventory, bank, skills, quests, chat, craft queue, build mode, projectiles, loot, resources, UI layout, movement settings, performance counters, and placed buildings.
- `Simulation` is the action dispatcher; DOM and Three.js do not directly mutate gameplay state.
- Procedural voxel-style world rendering for Briarbrook, bank, smithy, forest, crypt, road encounter, and housing plot.
- Real item stacks, equipment, weight, consumables, banking, trade offers, and gold.
- Combat with target frame, melee, bow, magic, enemy AI, damage, death, XP, skill gain, and loot drops.
- Gathering with node depletion/respawn, protected town trees, tool requirements, skill gain, floating text, and inventory updates.
- Blacksmithing recipes with requirements, material consumption, crafting queue, and output items.
- Housing placement with grid ghost, rotation, plot validation, overlap checks, resource cost, storage, and localStorage save support.
- Quest and Journal flows driven by inventory, kills, pinned profession goals, and first-hour progress.
- Social town illusion through NPCs, simulated player names, and ambient local trade/chat.
- Window manager for draggable, resizable, hotbar-safe panels across inventory, spellbook, skills, journal, market, map, help, and chat.

## Internal QA Focus

Run a 45-60 minute human play session before any wider release. The automation covers the main contracts, but the exact current cut still needs manual pacing and stuck-state review.

Recommended manual smoke:

1. Start a fresh game in town and verify Keyboard Only mode blocks ground-click movement.
2. Switch to Mouse Only and Keyboard + Mouse, checking that each mode honors its movement contract.
3. Resize inventory, hover edge slots, and confirm tooltip bounds.
4. Collapse and expand chat while messages arrive.
5. Switch minimap compact, standard, expanded, and hidden.
6. Open Skills -> Profession Atlas, search a node, select it, and pin it to Journal.
7. Chop a forest tree and try a protected town tree.
8. Fight a road enemy, cast a spell, gather a resource, save, reload, and confirm no stuck action.
9. Leave town/menu/help states idle with the dev overlay open and confirm reduced loop cadence.

## Current Limitations

- The current cut is an internal build, not an external release candidate.
- Full 45-60 minute human playtest has not been recorded for this exact cut.
- Movement is straight-line with collision, not full pathfinding.
- The voxel engine is procedural runtime geometry, not an imported `.vox` or Blockbench asset pipeline.
- Trade partner inventories are lightweight simulated snapshots, not persistent NPC economy ledgers.
- Main JS chunk is still over the default Vite warning threshold.
- Browser console can show expected low-severity warnings for AudioContext autoplay, missing favicon, and `tool:torch` source metadata.
- No multiplayer, server backend, or full asset authoring pipeline yet.

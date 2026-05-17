# Briarbrook Voxel RPG

A browser-based voxel RPG vertical slice built with TypeScript, Vite, and Three.js.

The project is inspired by classic sandbox RPG verbs at a high level: town life, skills, inventory, banking, crafting, gathering, trading, housing, quests, and dungeon combat. It does not use copied names, maps, lore, UI assets, art packs, or external visual assets.

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL, usually `http://127.0.0.1:5173/`.

Production build:

```bash
npm run build
```

## Controls

- `WASD` / arrow keys: move
- Mouse click: move, select, attack, or interact
- `E`: interact with nearby object
- `1` sword, `2` bow, `3` firebolt, `4` health potion, `5` mana potion, `7` gather with nearby tool
- `C`: character panel
- `K`: skills panel
- `I`: inventory
- `B`: bank panel
- `H` or Build button: housing/build mode
- Build mode: left click place, right click rotate, `Z`/`C` rotate, `X` cancel, `V` snap

## Implemented Systems

- Serializable `GameState` owns player, entities, inventory, bank, skills, quests, chat, craft queue, build mode, projectiles, loot, and placed buildings.
- `Simulation` is the action dispatcher; DOM and Three.js do not directly mutate gameplay state.
- Procedural voxel-style world rendering for Briarbrook, bank, smithy, forest, crypt, road encounter, and housing plot.
- Real item stacks, equipment, weight, consumables, banking, trade offers, and gold.
- Combat with target frame, melee, bow, firebolt, enemy AI, damage, death, XP, skill gain, and loot drops.
- Gathering with node depletion/respawn, tool requirements, skill gain, floating text, and inventory updates.
- Blacksmithing recipes with requirements, material consumption, crafting queue, and output items.
- Housing placement with grid ghost, rotation, plot validation, overlap checks, resource cost, and localStorage save support.
- Quest tracker driven by inventory and kill events.
- Social town illusion through NPCs, simulated player names, and ambient local trade/chat.

## Current Limitations

- Movement is straight-line with collision, not full pathfinding.
- The voxel engine is procedural runtime geometry, not an imported `.vox` or Blockbench asset pipeline.
- Trade partner inventories are lightweight simulated snapshots, not persistent NPC economy ledgers.
- UI is dense by design to match the reference mockups; small viewports collapse or overlap more aggressively than a full responsive release should.
- No multiplayer, server backend, audio, or asset authoring pipeline yet.

# Environment Art Direction

Phase 14 prompt 141 reference lock.

Global quality bar: `REF_141_ENVIRONMENT_QUALITY_BAR.png`.

Location references:

- Briarbrook town: `REF_142_TOWN_SQUARE_HERO.png`
- Greymont Forest: `REF_143_GREYMONT_FOREST.png`
- Forgotten Crypt: `REF_144_CRYPT_COMBAT.png`
- Player Plot: `REF_145_PLAYER_PLOT_BUILD.png`

## Locked Direction

The world should read as rich voxel diorama gameplay, not a debug grid and not a flat tile prototype. Each scene needs a clear walkable composition, strong silhouettes, visible blocker causes, readable interaction anchors, and enough repeated small detail to feel authored while staying browser-feasible.

Visual pillars:

- Clear play lane first: roads, doors, bridges, mine mouths, combat arenas, and build grids must read before decoration.
- Modular density: repeatable voxel kits, shared materials, and batched prop families provide richness without one-off meshes everywhere.
- Silhouette hierarchy: buildings, trees, mine entrance, crypt walls, fences, pillars, stalls, and player plot boundaries must be recognizable at gameplay zoom.
- Warm readable lighting: lamps, torches, forge glow, and day/dusk ambient color should shape attention without exceeding dynamic light budgets.
- Player-facing polish: no debug labels, no raw implementation text, no invisible walls, no abstract build table standing in for the world.

## Pipeline Decision

Chosen pipeline: **C. Hybrid**.

Primary production path:

- Continue using the procedural/modular runtime voxel kit in `VoxelKit`, `VoxelRenderer`, `AreaDensityArtKit`, and `Materials`.
- Rebuild locations from authored layout plans plus reusable builders, not from freehand one-off mesh clusters.
- Use shared `MaterialLibrary` keys and static batching/instancing where repeated props grow.

Light authored-asset path:

- Allow a small authored modular glTF/VOX kit only for hero modules that are reused across a full location class, such as a market stall variant, mine gate, crypt sarcophagus, timber facade segment, dock/fence segment, or forge workbench.
- Do not replace the Three.js renderer and do not introduce a new asset runtime during this reference-parity pass.

Justification:

- The current renderer already supports the needed quality bar: voxel builders, material caching, ambient presets, point-light budgets, density props, screenshot-parity presets, and render-stat gates.
- The reference targets need better composition, modular prop coverage, and density discipline more than a renderer rewrite.
- A hybrid path leaves room for authored modules later while keeping prompt 142-145 rebuilds lightweight, testable, and reversible.

## Authored Asset Rules

Source tools:

- MagicaVoxel or Blender for optional voxel/gltf source modules.
- Source files live outside runtime imports until approved: `art-src/environment/<kit>/<asset>.vox` or `.blend`.

Runtime format:

- Browser runtime format is `.glb` when an authored asset is actually shipped.
- Runtime assets live under `public/assets/environment/<kit>/<asset>.glb`.
- Generated or baked texture atlases, if any, live under `public/assets/environment/<kit>/textures/`.

Import path:

- Add manifest entries before runtime use.
- Load through an explicit environment-asset helper or existing asset manifest path; do not ad hoc fetch inside React UI components.
- Keep gameplay/collision in `AreaManager` and data systems. Mesh import must not become the source of truth for collision.

Naming conventions:

- `<kit>_<role>_<variant>_v<number>.glb`
- Examples: `town_timber_facade_a_v1.glb`, `forest_mine_gate_a_v1.glb`, `crypt_sarcophagus_a_v1.glb`, `housing_fence_corner_a_v1.glb`.

LOD and instancing:

- Hero modules can use one simple gameplay LOD. No distance-based runtime LOD system is required for this pass.
- Repeated props use `InstancedMesh`, static batching, or existing procedural builders before adding many separate authored mesh instances.
- Collision remains manually authored with visible blockers documented in `TRAVERSABILITY_AUDIT.md`.

## Acceptable Complexity

Per scene, target the reference feel with layered but controlled detail:

- 1-3 major silhouettes.
- 3-6 reusable medium prop clusters.
- 20-80 small nonblocking dressing pieces depending on scene size.
- 2-3 dynamic point lights maximum, matching `VISUAL_BUDGET.md`.
- Texture/material count stays low through palette variants and shared material keys.
- UI frame budget remains unchanged: global DOM and managed-window limits still come from `PERFORMANCE_BUDGET.md` and `VISUAL_BUDGET.md`.

Forbidden patterns:

- Empty collision in open-looking ground.
- Dense visual clutter inside combat/gathering/build lanes.
- Decoration that blocks the player without matching collision docs.
- Per-cell DOM for world grids.
- Permanent labels on every resource/prop.
- Debug copy, implementation labels, or screenshot-helper text in normal play.
- New renderer, new framework, or direct React mutation of `GameState`.
- One-off materials for every prop color.

## Material Palette

Town:

- Warm cobble grey, moss green, oak/brown timber, aged plaster, blue civic cloth, flower accents, warm window light.

Market and service:

- Oak crates, dark barrels, striped cloth, brass/gold small accents, forge orange, bank safe brass, ledger parchment.

Road:

- Dusk brown road, muted grass, dark fence wood, grey stone, orange lantern pools, cool river blue.

Forest and mine:

- Layered greens, dark trunk browns, copper/iron ore accents, wet stone, mine timber, warm lanterns.

Crypt:

- Charcoal stone, cold grey rubble, bone ivory, muted red damage accents, warm torch orange, black fog void.

Housing/player plot:

- Outdoor grass and moss, clear fence wood, ghost green placement material, garden accents, dock/water blue.

## Lighting Presets

Use the existing `visualLightingPresets` as the starting point:

| Preset | Location | Mood | Dynamic light cap |
| --- | --- | --- | ---: |
| `briarbrook-day` | Town | Warm daylight with civic lamp accents. | 3 |
| `road-day-dusk` | Road | Readable danger, lantern contrast, clear combat silhouettes. | 3 |
| `forest-day` | Forest | Green dappled daylight with readable resource prompts. | 2 |
| `crypt-readable` | Crypt | Dark room, bounded torch pools, readable enemies. | 3 |
| `smithy-forge` | Smithy | Warm forge-led indoor light. | 3 |
| `bank-warm` | Bank | Safe warm interior, controlled lamps. | 3 |
| `housing-build` | Player Plot | Clear outdoor build readability. | 2 |

Lighting rules:

- Dynamic lights are for gameplay landmarks, not generic decoration.
- Emissive material and color contrast should do most small lamp work.
- Crypt can be dark, but enemy silhouettes, floor lanes, and loot anchors must stay readable.

## Prop Density Rules

- Keep all required routes and interaction anchors clear first.
- Use small density props as nonblocking path readability markers.
- Props inside `densityClearanceZones` must be sparse and camera-safe.
- Repeated prop families must be shared/batched/instanced once they exceed roughly 50 scene instances.
- Path-edge clutter should imply blockers only where collision agrees.
- Foliage density belongs around edges and landmarks; not over target frames, labels, or build ghost cells.

## Modular Kits

| Kit | Primary use | Required modules |
| --- | --- | --- |
| Briarbrook town kit | Town square and market street | Timber facades, roof variants, civic banners, fountain, cobble patches, lamp posts, sign boards, flower beds, benches, low stone walls. |
| Market/service kit | Market, bank, smithy exterior/interior | Striped stall, produce crates, barrels, counter, ledger/lockbox, forge, anvil, ore bins, workbench, tool rack, safe/shelf props. |
| Road kit | Old River Road | Cobble/dirt road patches, low fences, stone walls, checkpoint gate, warning signs, bridge/river edge, wagon tracks, broken cart, lantern posts. |
| Forest kit | Greymont Forest | Tree variants, shrubs, flowers, stumps, fallen branches, forage patches, rocks, resource nodes, stream banks, bridge planks. |
| Mine approach kit | Forest mine entrance | Timber portal, rock wall, ore cart/track, ore chips, warning lamp, mine sign, rubble, tool crates. |
| Crypt kit | Forgotten Crypt | Stone walls, cracked floors, pillars, sarcophagus, altar, rubble, bones, candles/torches, secret wall markers, loot anchors. |
| Smithy kit | Smithy interior and service exterior | Forge, anvil, ore bins, weapon rack, tool bench, coal sacks, glowing metal, service counter, warm lamps. |
| Bank kit | Bank interior and exterior anchor | Teller counter, vault/safe, ledger, lockboxes, shelf stacks, benches, warm lamps, clear door marker. |
| Housing/player plot kit | Build plot | Fence segments, grid-safe ground, well, table/chair/bed/chest previews, garden bed, dock, plot signs, placement ghost footprint. |

## Performance Budget

Use existing hard limits from `VISUAL_BUDGET.md` and do not loosen them:

| Scene class | Draw calls target | Mesh target | Triangle target | Dynamic lights | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Town | <= 360 | <= 950 | <= 120000 | <= 3 | Highest density, strongest batching pressure. |
| Road | <= 300 | <= 800 | <= 95000 | <= 3 | Combat lane must stay clear. |
| Forest | <= 330 | <= 900 | <= 105000 | <= 2 | Foliage/resource repeats require shared geometry. |
| Crypt | <= 320 | <= 900 | <= 110000 | <= 3 | Darkness cannot hide unreadable enemies. |
| Smithy | <= 260 | <= 650 | <= 75000 | <= 3 | Forge counts as key light. |
| Bank | <= 250 | <= 620 | <= 70000 | <= 3 | UI window budget is usually the tighter limit. |
| Housing build | <= 330 | <= 850 | <= 95000 | <= 2 | Grid/ghost must be batched, never per-cell DOM. |

Shared budget rules:

- UI frame budget unchanged.
- Raycast candidates target interactables and useful hover meshes only.
- Decorative props should not become individual raycast targets.
- Material variants must reuse `MaterialLibrary.get`.
- New density passes must update `VISUAL_BUDGET.md` when measured stats shift.

## Reference Parity Targets

| Location | Primary reference | Required silhouettes | Required props | Interaction anchors | Lighting mood |
| --- | --- | --- | --- | --- | --- |
| Briarbrook Town Square | `REF_142_TOWN_SQUARE_HERO.png` | Fountain hub, timber buildings, market canopy, gate/sign, large trees, water/dock edge. | Cobble square, benches, flower beds, banners, crates/barrels, civic lamps, market produce. | Bank, smithy, market board, forest road, old road, ferry, key NPCs. | Warm clear day, cozy town lamps. |
| Briarbrook Market Street | `REF_141_ENVIRONMENT_QUALITY_BAR.png` plus `REF_142_TOWN_SQUARE_HERO.png` | Dense street corridor, timber facades, striped stall, trees, visible water edge. | Stall clutter, crates, flower beds, fences, lamps, signposts, cobble variation. | Merchant, market board, service doors, road signs. | Bright town daylight with warm windows. |
| Old River Road | `REF_140_TRAVERSABLE_ROAD_FOREST.png` and later prompt 143 road target | Road curve, fences, lanterns, river/water edge, bridge, danger lane. | Broken cart, warning signs, low fences, stones, shrubs, bridge planks, torch posts. | Town gate, bandits, ally NPC, shrine/cache, road quest objective. | Dusk danger with clear combat silhouettes. |
| Greymont Forest | `REF_143_GREYMONT_FOREST.png` | Mine mouth, forest canopy, path fork, ore/resource cluster, bridge/stream. | Dense trees, shrubs, flowers, rocks, mine cart/rails, ore veins, lanterns, fences. | Mine to crypt portal, ore node, harvestable tree, forest exit, hunter/quest anchor. | Green dappled daylight, warm mine lamps. |
| Forgotten Crypt | `REF_144_CRYPT_COMBAT.png` | Stone room, pillars, sarcophagus/altar, dark edge void, enemy silhouettes. | Rubble, bones, candles, torches, cracked floor, secret walls, loot chest. | Forest exit, skeleton targets, loot, secret wall, crypt clue. | Dark but playable torch pools. |
| Smithy | Prompt 145 smithy reference | Forge/anvil silhouette, service counter, ore/workshop wall. | Ore bins, tool racks, coal sacks, glowing forge, weapons, workbench. | Smith NPC, crafting station, repair/smelt anchors, town door. | Warm forge-led interior. |
| Bank | Prompt 145 bank reference | Counter/vault silhouette, safe room edge, warm secure interior. | Ledger, lockboxes, shelves, teller counter, lamps, benches. | Banker, bank chest/storage, town door. | Warm safe interior. |
| Player Plot | `REF_145_PLAYER_PLOT_BUILD.png` | Clear fenced build grid, house/dock context, ghost footprint, boundary fence. | Fence, well, worktable, garden beds, starter furniture, plot stakes, water/dock. | Build ghost, rotate/place/cancel controls, ferry, storage pieces. | Clear outdoor build light. |

## Lock Notes

- This document is the quality bar for prompts 142-145.
- If a later rebuild cannot match a target because of runtime budget, record the reason in `REFERENCE_DEVIATION_MATRIX.md` with proof.
- The pipeline decision can be revisited only after prompts 142-146 if evidence shows the procedural/hybrid path cannot meet the target within budget.

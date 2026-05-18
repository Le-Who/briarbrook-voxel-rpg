# Art Direction Consolidation

Date: 2026-05-18

This pass locks the voxel RPG into one visual system: compact diorama scale, readable silhouettes, authored area mood, and measurable render budgets. Procedural detail is allowed only when it improves place identity without hiding gameplay.

## Readability Hierarchy

1. Player.
2. Current target.
3. Incoming danger or telegraph.
4. Interactable object.
5. Loot.
6. NPC.
7. Environment detail.

Environment detail must never hide the player, target ring, combat telegraph, chest/portal/resource affordance, or dropped loot. If visual density competes with interaction clarity, remove or darken the dressing first.

## Scale Rules

- Player and humanoids stay the main vertical reference: taller than crates, chests, rubble, and resource props.
- Chests, ore veins, logs, herbs, doors, portals, and workstations need distinct silhouettes from the default camera before color is considered.
- Houses and walls may be large, but roofs must remain cutaway-aware and should not cover the player in normal town movement.
- Resource props are readable on hover or with the correct tool, not through permanent labels.
- Housing pieces remain grid-aligned and compact enough that a tier-0 plot still reads as a clean build space.

## Palette Families

- Briarbrook town: warm plaster, terracotta roof, muted timber, varied gray-brown cobble, brass, banner cloth, and lamp orange.
- Forest: layered olive greens, moss, damp roots, muted flowers, gray rocks, and subtle ore/resource accents.
- Mine/Crypt: near-black stone, cold gray floors, cracked masonry, bone ivory, rusted metal, torch orange, and rare cyan/blue magical accents.
- Road: dusty cobble, worn grass, weathered wood, low fences, campfire/torch warm points, and open ambush space.
- Housing: clean grass, water/dock edge, simple timber, low stone boundaries, and player pieces that share the same wood/stone language as town.

Avoid one-hue scenes. Every area needs at least three terrain/material tones plus one intentional accent family.

## Area Mood

- Briarbrook is warm, dense, and lived-in: varied cobble, signs, barrels, crates, flowerboxes, carts, banners, lamps, stalls, docks, and small garden details.
- Forest is lush, irregular, and layered: varied tree sizes, shrubs, logs, rocks, flowers, roots, mushrooms, and subtle resource affordances.
- Mine/Crypt is darker and dangerous: torch pools, cracked stone, bones, rubble, coffins/tombs, traps, hidden-door hints, chains, and controlled magic color.
- Road is a readable travel corridor: fences, signposts, wagon ruts, bridges, sparse trees, and intentional open combat pockets.
- Housing is clean enough to build while integrated into the world. Plot boundaries become prominent only in build mode.

## Lighting Rules

- Area mood starts with `areaAmbient` fog/background/hemi/sun values, then a few local lights tied to real sources.
- Fire, lamps, candles, forges, and spell effects can be emissive; broad decorative glow fields are avoided.
- Night and crypt darkness should reduce mood brightness without losing player/target/telegraph contrast.
- Torch pools in dangerous spaces should guide navigation, not flood the entire room.

## Prop Density

- Town supports the highest prop density, but routes, NPCs, market stalls, portals, and chests keep clear click space.
- Forest can be irregular, but path and stream corridors stay visually separated.
- Crypt clutter sits on edges, corners, and room landmarks; floor telegraphs must remain readable.
- Road uses sparse props and low occlusion so enemy approach and ambush spaces are clear.
- Housing base scenery is restrained; player placement supplies density over time.

## Label And Interaction Rules

- No permanent labels over resources.
- Interactables use hover rings, cursor changes, selected-target rings, or short nearby labels.
- Loot labels appear only nearby or on hover.
- Quest markers remain subtle through NPC role labels, quest tracker text, and nearby affordances rather than large world pins.
- Hidden secrets should have environmental hints such as cracks, suspicious rubble, magic tint, or unusual layout breaks.
- Telegraphs must stay brighter and more geometric than environmental detail.

## Procedural Builders

Reusable builders live in `src/render/VoxelKit.ts` and should be preferred for repeated scene forms:

- `treeBuilder`
- `rockBuilder`
- `oreVeinBuilder`
- `timberHouseBuilder`
- `marketStallBuilder`
- `lampPostBuilder`
- `fenceBuilder`
- `bridgeBuilder`
- `chestBuilder`
- `dungeonColumnBuilder`
- `rubbleBuilder`
- `forgeBuilder`
- `bannerBuilder`

Builder options support seed, variation, material theme, wear, damage, size, color, color variation, props, and metadata. New scene detail should reuse these controls before adding new one-off voxel clusters.

## Performance Budgets

Measured in the dev overlay after area transition:

| Metric | Budget |
| --- | ---: |
| Draw calls | <= 450 |
| Mesh count | <= 1200 |
| Visible entities | <= 160 |
| Raycast candidates | <= 900 |
| Triangles | <= 140000 |
| Rough frame estimate | <= 16.7 ms |
| Heap after transition | <= 180 MB |

If an area exceeds budget, prefer in this order:

1. Reuse `VoxelKit` builders and cached box geometries.
2. Batch or reduce static terrain/detail clusters.
3. Use instancing for repeated small props.
4. Add separate picking proxies if raycast candidates climb.
5. Dispose unused geometries/materials on area transition.
6. Remove low-value clutter before reducing interaction feedback.

## UI And World Cohesion

- Item and spell icons use the same simple material language as voxel props: strong silhouettes, one or two accent colors, no debug-only glyphs.
- Panels remain compact and scroll internally so the dense world keeps enough visible playfield.
- The minimap is stylized navigation, not raw debug readout.
- UI scale must remain usable with dense scenes: labels are sparse, hotbar stays visible, and dev metrics live only in the dev overlay.

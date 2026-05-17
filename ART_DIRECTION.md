# Briarbrook Art Direction

This slice uses compact voxel dioramas: readable silhouettes, warm handcrafted props, and enough procedural variation to keep repeated buildings and terrain from looking stamped. The camera is isometric and gameplay-first, so every asset must read at small screen size before it earns extra detail.

## Goals

- Preserve instant recognition for player, NPCs, enemies, resources, containers, vendors, and quest props.
- Use grounded medieval frontier materials: weathered timber, muted plaster, mossy stone, iron, copper, warm firelight, and low-saturation cloth accents.
- Keep interactable objects brighter or more shaped than background dressing.
- Make towns feel lived-in through small repeated details, not through large noisy meshes.
- Keep the scene performant on integrated GPUs and mobile browsers.

## Palette Rules

- Primary terrain colors stay muted: olive grass, gray-brown roads, desaturated stone, dark crypt floors.
- Interactable accents may use stronger hue: magic cyan, potion red/blue, chest brass, vendor cloth, forge orange.
- Fire and lamps should be warm and emissive, but their meshes stay small so they do not overpower action readability.
- Crypt colors should be colder and darker than town/forest, with orange candles used as navigation markers.
- Avoid single-hue areas. Each biome needs at least three neighboring material tones plus one intentional accent family.

## Procedural Voxel Kit

Reusable builders live in `src/render/VoxelKit.ts` and should be preferred over one-off box clusters for common scene assets:

- `timberHouseBuilder`
- `stoneWallBuilder`
- `marketStallBuilder`
- `treeBuilder`
- `oreVeinBuilder`
- `dungeonColumnBuilder`
- `chestBuilder`
- `forgeBuilder`
- `fenceBuilder`
- `bridgeBuilder`
- `dockBuilder`
- `lampPostBuilder`
- `bannerBuilder`

Builder options support seed, size, theme, wear, damage, color, color variation, and optional props. New scene dressing should use those knobs instead of introducing unrelated variants. The renderer caches box geometries by dimensions, so new kit pieces should keep dimension reuse high.

## Silhouette And Readability

- Characters stay taller than single-tile props and should keep clear head/body/weapon silhouettes.
- Containers need a visible lid and lock face. Locked or trapped variants can use brighter lock color or faint emissive cues.
- Resource nodes must differ by shape and accent: ore is low and faceted, trees are vertical and leafy, herbs stay flat and clustered.
- Houses use raised roofs with roof cutaway metadata. Any new roof mesh must set `userData.roof = true`.
- Signs, lamps, banners, and vendor stalls should sit near routes and quest hubs, never hide critical click targets.

## Area Notes

- Town: warm plaster, terracotta roofs, mixed cobble, stalls, docks, garden patches, lamps, and readable road edges.
- Bank: darker timber interior, rug/counter landmarks, chests, controlled light, minimal clutter near NPCs.
- Blacksmith: forge orange, ore bins, anvil, tool racks, hot metal accents, soot-heavy stone.
- Forest: larger tree silhouettes, root and tuft ground details, mossy rocks, path color separation.
- Crypt: dark stone, cracked floors, columns, rubble, candles, bones, chains, and cyan/blue magic cues for hidden secrets.
- Road: sparse structures, wagon ruts, bridge landmarks, campfire/torch anchors, threat-readable open space.
- Housing: player-placed pieces must remain clearly grid-aligned, with water/dock edges and fenced plot boundaries.

## Lighting

- Lighting is area-authored in `VoxelRenderer.applyLighting`.
- Use ambient/fog to establish biome mood, then a small number of point lights for landmarks.
- Night should lower global intensity without hiding combat silhouettes.
- Do not add broad decorative glow fields. Prefer small light sources tied to lamps, forges, candles, and spell effects.

## Performance Budget

- Target static areas below a few thousand simple box meshes and keep draw calls observable through dev render stats.
- Reuse `VoxelKit` builders and cached box geometries before adding custom geometry.
- Prefer material reuse through `MaterialLibrary.get`; do not create unique materials unless color/emissive behavior is meaningfully different.
- Avoid per-frame allocation in render loops. Static terrain and props should be rebuilt only on area change.
- Keep animated materials limited to water/river/stream families.

## Review Checklist

- Does the object read correctly from the default camera at desktop and mobile sizes?
- Does it preserve gameplay target clarity and not overlap important HUD or click zones?
- Does it use an existing kit builder or justify a new reusable one?
- Does it maintain palette separation from its area background?
- Does it keep geometry/material reuse reasonable and show acceptable render stats in the dev overlay?

# Tree Harvest Audit

## Findings

- Tree visuals used to be split between static renderer-only trees and a small hand-authored `ResourceNodeEntity` set. Static trees were not pickable and were not guaranteed to exist in `world.resourceTiles`, so axe targeting could only work on some visible trees.
- Forest had 45 procedural static tree visuals plus 7 named tree resource nodes. Only the named resource nodes were consistently interactable before this pass.
- Town had 22 ornamental tree visuals. They looked like trees but were not registered. These are now classified as protected town trees and explain the rule instead of silently failing.
- Road had 5 outskirts tree visuals and housing had 1 plot tree visual. These now register as low-yield harvestable trees.
- Stumps, bush patches, flower boxes, mushrooms, roots, and tiny terrain tufts are decorative or forage-adjacent props, not wood trees. They stay out of the axe tree contract.
- The old desync was caused by creating tree visuals directly in `VoxelRenderer` while ResourceMap data was generated separately. The fix moves obvious standing trees into systemic tree placements that feed both resource entities and `world.resourceTiles`.

## Classification

- `harvestableTree`: forest, road/outskirts, and player-plot standing trees.
- `protectedTownTree`: town ornamental trees. Axe targeting returns "Protected Tree" and action feedback says "Town tree is protected."
- `decorativeTinyShrub`: bush patches, flowers, terrain tufts, mushrooms, and herb-like decor.
- `stumpDepletedTree`: depleted tree visual state and preplaced stump decor.
- `questTree`: reserved for future named quest trees; Ancient Yew remains a harvestable special tree for now.
- `collisionOnlyProp`: non-tree props that block or shape paths, such as walls, signs, stalls, rocks, and buildings.

## Runtime Contract

- Standing tree placements are registered in `resourcePlacements`, spawned as pickable `ResourceNodeEntity` records, and mirrored into `world.resourceTiles`.
- Resource tiles store `classification`, `protected`, `entityId`, `tileId`, `visualState`, yield table, depletion timer, harvest count, and area/tile coordinates.
- Chopping an entity-backed tree also depletes its ResourceMap tile. When it recovers, entity collision and tile state are restored together.
- Depleted trees render as a stump/cut-mark visual rather than disappearing permanently.

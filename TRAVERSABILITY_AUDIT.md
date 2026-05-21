# Traversability Audit

Phase 14 prompt 140 reference lock.

Targets:

- `REF_140_TRAVERSABLE_ROAD_FOREST.png`
- `REF_143_OLD_RIVER_ROAD.png`
- `REF_143_GREYMONT_FOREST.png`

Rule: blocked movement must have a visible cause in the world. Valid visible causes are wall, fence, cliff, water, dense trees or bushes, furniture, closed door, rubble, pillar, building mass, or obvious resource/entity body.

## Collision Contract

| Class | Runtime source | Player expectation |
| --- | --- | --- |
| Walkable ground | Area bounds minus hard blockers, live blockers, and placed blocking buildings | Clear roads, paths, floors, bridges, service-room entries, plot entry lanes. |
| Hard blockers | `AreaManager` static blocker sets | Buildings, interior walls, crypt walls, pillars, mine wall, stream banks, road fences, water edge, plot fence. |
| Soft blockers | Non-blocking dressing and low clutter | Grass, flowers, pebbles, small signs, minor props, lighting markers; these may decorate routes but must not stop movement. |
| Interactable blockers | Entities/buildings with `blocksMovement` | NPCs, living enemies, resource nodes before depletion, containers, and placed buildings. They must be visible and targetable. |
| One-way blockers | None authored for this pass | Traversal should not depend on hidden one-way collision. |
| Portal zones | `PortalEntity` origin plus requested destination spawn | Origin and destination must be walkable, have a move exit, be reachable from area spawn, and not overlap another destination portal tile. |

## Findings And Fixes

| Location | Coordinate / route | Issue found | Visible cause | Fix type | Status |
| --- | --- | --- | --- | --- | --- |
| Greymont Forest | `x=-1..1,z=6` bridge route | Visible bridge lane over the stream was blocked by the stream-bank collision line. | Bridge planks are visible and should be walkable. | Remove blocker / widen path. | Fixed in `AreaManager.buildForestBlocked()`. |
| Old River Road | `x=10,z=9` and side water/fence line | River/fence edge needed explicit blocker explanation and collision parity with the visible north edge. | Fence, riverbank, water edge. | Add visual-cause contract / adjust nav mesh. | Fixed with `getBlockerExplanation()` and road edge blocker coverage. |
| Old River Road -> Briarbrook | `portal_town_road` destination `12,4` | Return spawn landed inside a static town blocker near the road gate. Runtime could only recover via safe-spawn fallback. | Blocked town building/market mass. | Adjust portal destination spawn. | Fixed to `13,5`. |
| Briarbrook -> Old River Road | `portal_road` destination `-8,0` | Destination overlapped the return portal tile and forced fallback avoidance. | Portal marker, not a landing tile. | Adjust portal destination spawn. | Fixed to `-8,-1`. |
| Briarbrook -> Player Plot | `portal_plot` destination `-8,5` | Destination overlapped the return ferry portal and forced fallback avoidance. | Ferry portal marker. | Adjust portal destination spawn. | Fixed to `-8,4`. |
| Greymont Forest -> Forgotten Crypt | `portal_crypt` destination `-9,4` | Destination overlapped the crypt exit portal and forced fallback avoidance. | Crypt exit portal marker. | Adjust portal destination spawn. | Fixed to `-9,3`. |
| Forgotten Crypt -> Greymont Forest | `portal_forest_crypt` destination `7,-7` | Return spawn landed inside the mine wall collision volume. | Mine rock wall. | Adjust portal destination spawn. | Fixed to `7,-4`. |
| Bank -> Briarbrook | `portal_town_bank` destination `-8,-2` | Return spawn overlapped the bank door portal and forced fallback avoidance. | Door portal marker. | Adjust portal destination spawn. | Fixed to `-8,-1`. |
| Smithy -> Briarbrook | `portal_town_smith` destination `6,-3` | Return spawn overlapped the smithy door portal and forced fallback avoidance. | Door portal marker. | Adjust portal destination spawn. | Fixed to `6,-2`. |
| Forgotten Crypt | `0,0` | Static central blocker needed documented visible cause. | Central pillar. | Add collision explanation. | Covered by `getBlockerExplanation()`. |
| Player Plot | `0,9` | Water edge blocker needed documented visible cause. | Water beyond fenced plot and dock. | Add collision explanation. | Covered by `getBlockerExplanation()`. |
| Bank / Smithy interiors | Door-to-service routes | No new invisible wall found after portal checks. | Interior walls and furniture frame the blocked edges. | Document route. | Covered by QA route test. |
| Briarbrook town | Spawn-to-road and spawn-to-bank routes | No route break after portal spawn fixes. | Buildings, fountain, market stall blocks remain visible causes. | Document route. | Covered by QA route test. |

## QA Routes

All routes are covered by `src/world/traversability-contract.test.ts` with static blockers enabled and entity blockers disabled:

- Briarbrook spawn to Old River Road gate.
- Briarbrook spawn to Bank door.
- Bank counter to Town door.
- Smithy anvil to Town door.
- Greymont Forest spawn to Town Road over the visible bridge lane.
- Greymont Forest spawn to Mine to Crypt.
- Old River Road town gate to old bridge lane.
- Forgotten Crypt spawn to Forest Exit.
- Player Plot spawn to build footprint.
- Player Plot spawn to ferry opening.
- Every portal origin and requested destination spawn.

Additional focused validation for the prompt-140 input paths:

- Keyboard-only movement: `npm test -- src/game/movement-mode.test.ts`.
- Mouse movement: `npm test -- src/game/movement-mode.test.ts`.
- Combat movement: `npm test -- src/game/combat-intent.test.ts`.
- Gathering movement and resource blocker visibility: `npm test -- src/systems/tree-harvestability.test.ts`.

## Deviation Note

The current road and forest scenes now use the reference traversal language: clear lanes, visible fences/rocks/water/trees for blockers, and non-fallback portal landings. Exact environment art density, lighting, and composition are still below `REF_140_TRAVERSABLE_ROAD_FOREST.png`, `REF_143_OLD_RIVER_ROAD.png`, and `REF_143_GREYMONT_FOREST.png`; those are deferred to prompts 141 and 143.

# Character Motion Notes

## Current Pipeline

- Logical position lives in `GameState`: `player.position`, `player.movement.velocity`, and each `Entity.position`.
- Logical facing now lives beside that state in `FacingState`: `facingYaw`, `desiredFacingYaw`, `lastFacingSource`, optional lock time, and optional look-at target.
- `FacingSystem` owns yaw math, short-angle stepping, action locks, movement updates, target/cast/interact/gather facing, and save migration defaults.
- `RenderMotionTracker` interpolates position and yaw samples for the renderer. It remains render-only and does not feed rotation back into simulation state.
- `VoxelRenderer.animateActor` applies visual yaw to the actor group and keeps procedural bob/limb swing separate from gameplay facing.

## Why The Actor Looked Fixed

- The player render yaw was derived from current velocity only.
- When velocity dropped below the threshold, `facingFromVelocity` returned `0`, so idle, attack, cast, and interact states visually drifted back to the same yaw.
- NPCs returned `0` for facing unless they were enemies; enemies were render-derived rather than state-driven.
- No action system wrote "look at this target" into gameplay state, so combat/cast/gather readability depended on incidental movement.

## Forward Axis

- Character voxel detail is built toward local `-Z`: hair, belt detail, and weapon placement read as the actor front.
- World logical yaw uses `atan2(delta.x, delta.z)`, where yaw `0` means world `+Z`.
- The visual model therefore uses `MODEL_FORWARD_OFFSET = PI` when applying `group.rotation.y`, so the local `-Z` visual front points toward the logical world yaw.

## Facing Priority Implemented

- Direct movement releases action facing lock and updates immediately from input or waypoint direction.
- Melee and ranged attacks face the target with a short target lock.
- Spell casts face the selected entity/tile at cast start and again on release.
- Gathering and tool targeting face the resource tile or node.
- NPC/social interaction turns both the player and the NPC toward each other.
- Enemies face movement while patrolling/chasing/returning and face targets during attack telegraphs.
- Idle keeps the last meaningful yaw; it does not reset to world zero.

## Debug Support

- Dev overlay now displays player facing source and current-to-desired yaw in degrees.
- Dev overlay buttons toggle facing arrows, desired-facing arrows, velocity vectors, and look-at lines.
- Debug arrows are render-only effects generated from state each frame.

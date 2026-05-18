# Transition And Action State Stability

## Current Flow

- Direct dev/area travel goes through `Simulation.enterArea()` or `DevToolsSystem.teleportPlayer()`.
- Door and portal clicks go through `InteractionSystem.interactEntity()` and then portal-specific transition handling.
- Player position was assigned directly from `AreaManager.getSpawn()` or `portal.spawn`.
- Collision/pathing comes from `AreaManager` static blocked tiles plus current-area blocking entities and placed buildings.
- Approach actions are stored as `state.realtime.pendingAction`; the visible "Approaching ..." text comes from `state.ui.prompt`.

## Root Cause

- Movement commands cleared the movement path but did not clear `pendingAction`, so the next fixed tick could recreate the stale auto-approach and make WASD/click movement appear ignored.
- Buffered targets were resolved by position only; target area/death/missing state was not validated each tick.
- Transition cleanup existed in multiple places, so portal exits, dev teleports, and direct area travel could drift.
- Some portal spawns overlap the destination area's reverse portal tile, especially interior exits back to town.

## Contract Added

- Area transitions now run through a shared transition helper that cancels movement, approach, casting, gathering, bandage, stale targets, hover/context prompts, and transient UI state before placing the player.
- Spawns are resolved with `resolveSafeSpawn(...)`, which tests the requested tile first, then searches nearby rings while avoiding blocked tiles, entities, buildings, portal trigger tiles, and trapped single-tile positions.
- The action buffer now validates target existence, target area, death state, timeout, and path availability before continuing an approach.
- Direct movement and manual stop cancel stale approach intent immediately.
- Dev overlay now exposes action state, target id/area, path length, last movement command, last cancellation reason, current portal, last transition, and safe spawn fallback count.

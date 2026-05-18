import { areas } from '../data/areas';
import { setPlayerActionState } from './ActionStateSystem';
import { recordActionCancellation, recordStuckRecovery, recordTransitionFallback } from './TelemetrySystem';
import type { AreaId, GameState, TargetRef, Vec3 } from '../game/types';
import { AreaManager, resolveSafeSpawn } from '../world/AreaManager';

export interface AreaTransitionOptions {
  portalId?: string | null;
  requestedSpawn?: Vec3;
  avoidPortalIds?: string[];
}

export function clearMovementState(state: GameState): void {
  state.player.targetPosition = null;
  state.player.movement.intent = null;
  state.player.movement.velocity = { x: 0, z: 0 };
  state.player.movement.path = [];
  state.player.movement.waypoint = null;
}

export function cancelApproachIntent(state: GameState, reason: string, prompt?: string): boolean {
  if (!state.realtime.pendingAction) return false;
  state.realtime.pendingAction = null;
  clearMovementState(state);
  state.dev.stability.lastActionCancellationReason = reason;
  recordActionCancellation(state, reason);
  if (prompt) state.ui.prompt = prompt;
  return true;
}

export function clearInvalidAreaTargets(state: GameState, areaId = state.player.currentArea): void {
  const activeTarget = state.player.activeTargetId ? state.entities[state.player.activeTargetId] : null;
  if (!activeTarget || activeTarget.area !== areaId || ('state' in activeTarget && activeTarget.state === 'dead')) {
    state.player.activeTargetId = null;
  }
  if (!isTargetInArea(state, state.ui.hoverTarget, areaId)) state.ui.hoverTarget = null;
  if (!isTargetInArea(state, state.ui.selectedTarget, areaId)) state.ui.selectedTarget = null;
  if (!isTargetInArea(state, state.ui.contextMenu?.target ?? null, areaId)) state.ui.contextMenu = null;
}

export function transitionPlayerToArea(
  state: GameState,
  areaManager: AreaManager,
  destination: AreaId,
  options: AreaTransitionOptions = {}
): { from: AreaId; to: AreaId; spawn: Vec3; usedFallback: boolean } {
  const from = state.player.currentArea;
  const requestedSpawn = options.requestedSpawn ? { ...options.requestedSpawn } : areaManager.getSpawn(destination);

  setPlayerActionState(state, 'transitioning', 0.1, options.portalId ?? 'area-transition');
  cancelApproachIntent(state, 'Area transition cancelled approach.');
  clearMovementState(state);
  state.gathering = null;
  state.spellCasting = null;
  state.bandage = null;
  state.ui.hoverTarget = null;
  state.ui.selectedTarget = null;
  state.ui.targeting = null;
  state.ui.contextMenu = null;
  state.player.activeTargetId = null;

  const spawn = resolveSafeSpawn(state, areaManager, destination, requestedSpawn, 4, {
    avoidPortalIds: options.avoidPortalIds
  });
  state.player.currentArea = destination;
  state.player.position = { ...spawn.position };
  state.player.movement.tile = { x: Math.round(spawn.position.x), z: Math.round(spawn.position.z) };
  state.world.discoveredAreas = Array.from(new Set([...state.world.discoveredAreas, destination]));
  state.dev.stability.currentPortalId = options.portalId ?? null;
  state.dev.stability.lastTransition = {
    from,
    to: destination,
    portalId: options.portalId ?? null,
    requested: spawn.requested,
    resolved: spawn.position,
    usedFallback: spawn.usedFallback,
    at: state.clock
  };
  if (spawn.usedFallback) {
    state.dev.stability.safeSpawnFallbackCount += 1;
    recordTransitionFallback(state);
  }
  clearInvalidAreaTargets(state, destination);
  setPlayerActionState(state, 'idle', 0, 'transition-complete');

  if (!areaManager.hasMoveExitInArea(state, destination, state.player.position.x, state.player.position.z)) {
    state.ui.prompt = `Entered ${areas[destination].name}, but the spawn has no clear exit.`;
    state.dev.stability.lastActionCancellationReason = 'Safe spawn has no valid move direction.';
    recordStuckRecovery(state);
  }

  return { from, to: destination, spawn: spawn.position, usedFallback: spawn.usedFallback };
}

function isTargetInArea(state: GameState, target: TargetRef, areaId: AreaId): boolean {
  if (!target) return true;
  if (target.kind === 'tile') return target.areaId === areaId;
  if (target.kind === 'entity' || target.kind === 'ground-item' || target.kind === 'friendly' || target.kind === 'hostile') {
    const entity = state.entities[target.entityId];
    return Boolean(entity && entity.area === areaId && (!('state' in entity) || entity.state !== 'dead'));
  }
  return true;
}

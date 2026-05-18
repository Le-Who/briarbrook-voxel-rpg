import type { Entity, FacingSource, FacingState, GameState, TargetRef, Vec2, Vec3 } from '../game/types';

export const MODEL_FORWARD_OFFSET = Math.PI;
const TWO_PI = Math.PI * 2;
const FACING_EPSILON = 0.035;
const PLAYER_TURN_SPEED = Math.PI * 8;
const ENTITY_TURN_SPEED = Math.PI * 6;

type FacingActor = { facing?: FacingState };

export function createFacingState(yaw = 0, source: FacingSource = 'idle'): FacingState {
  return {
    facingYaw: normalizeYaw(yaw),
    desiredFacingYaw: normalizeYaw(yaw),
    lastFacingSource: source,
    facingLockedUntil: 0,
    lookAtEntityId: null,
    lookAtPosition: null
  };
}

export function ensureFacingState(actor: FacingActor, fallbackYaw = 0): FacingState {
  actor.facing ??= createFacingState(fallbackYaw);
  actor.facing.facingYaw = normalizeYaw(actor.facing.facingYaw ?? fallbackYaw);
  actor.facing.desiredFacingYaw = normalizeYaw(actor.facing.desiredFacingYaw ?? actor.facing.facingYaw);
  actor.facing.lastFacingSource ??= 'idle';
  actor.facing.facingLockedUntil ??= 0;
  actor.facing.lookAtEntityId ??= null;
  actor.facing.lookAtPosition ??= null;
  return actor.facing;
}

export function yawFromDelta(x: number, z: number): number {
  return normalizeYaw(Math.atan2(x, z));
}

export function yawBetween(from: Vec3, to: Vec3): number | null {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (Math.hypot(dx, dz) < FACING_EPSILON) return null;
  return yawFromDelta(dx, dz);
}

export function releaseFacingLock(actor: FacingActor): void {
  const facing = ensureFacingState(actor);
  facing.facingLockedUntil = 0;
  facing.lookAtEntityId = null;
  facing.lookAtPosition = null;
}

export function faceActorTowardPosition(
  actor: FacingActor,
  actorPosition: Vec3,
  targetPosition: Vec3,
  source: FacingSource,
  now: number,
  options: { lockSeconds?: number; force?: boolean; lookAtEntityId?: string | null } = {}
): boolean {
  const yaw = yawBetween(actorPosition, targetPosition);
  if (yaw == null) return false;
  return setDesiredFacing(actor, yaw, source, now, {
    lockSeconds: options.lockSeconds,
    force: options.force,
    lookAtEntityId: options.lookAtEntityId ?? null,
    lookAtPosition: options.lookAtEntityId ? null : { ...targetPosition }
  });
}

export function facePlayerTowardTarget(state: GameState, target: TargetRef, source: FacingSource, lockSeconds = 0.35): boolean {
  const position = targetPosition(state, target);
  if (!position) return false;
  return faceActorTowardPosition(state.player, state.player.position, position, source, state.clock, {
    lockSeconds,
    force: source !== 'movement',
    lookAtEntityId: target?.kind === 'entity' || target?.kind === 'hostile' || target?.kind === 'friendly' || target?.kind === 'ground-item' ? target.entityId : null
  });
}

export function facePlayerTowardEntity(state: GameState, entityId: string, source: FacingSource, lockSeconds = 0.35): boolean {
  const entity = state.entities[entityId];
  if (!entity) return false;
  return faceActorTowardPosition(state.player, state.player.position, entity.position, source, state.clock, {
    lockSeconds,
    force: source !== 'movement',
    lookAtEntityId: entity.id
  });
}

export function facePlayerFromVelocity(state: GameState, velocity: Vec2, source: FacingSource = 'movement'): boolean {
  if (Math.hypot(velocity.x, velocity.z) < FACING_EPSILON) return false;
  return setDesiredFacing(state.player, yawFromDelta(velocity.x, velocity.z), source, state.clock, { force: source === 'movement' });
}

export function faceEntityTowardPosition(entity: Entity, targetPosition: Vec3, source: FacingSource, now: number, lockSeconds = 0.25): boolean {
  return faceActorTowardPosition(entity, entity.position, targetPosition, source, now, {
    lockSeconds,
    force: source !== 'movement'
  });
}

export function faceEntityFromDelta(entity: Entity, dx: number, dz: number, source: FacingSource, now: number): boolean {
  if (Math.hypot(dx, dz) < FACING_EPSILON) return false;
  return setDesiredFacing(entity, yawFromDelta(dx, dz), source, now, { force: source === 'movement' });
}

export function updateFacingState(facing: FacingState, dt: number, turnSpeed = PLAYER_TURN_SPEED): void {
  const maxDelta = Math.max(0, dt) * turnSpeed;
  facing.desiredFacingYaw = normalizeYaw(facing.desiredFacingYaw);
  facing.facingYaw = stepAngle(facing.facingYaw, facing.desiredFacingYaw, maxDelta);
}

export function updateAllFacing(state: GameState, dt: number): void {
  const playerFacing = ensureFacingState(state.player);
  updateLookAtFacing(state, state.player, state.player.position, state.clock);
  if (!isFacingLocked(playerFacing, state.clock)) facePlayerFromVelocity(state, state.player.movement.velocity);
  updateFacingState(playerFacing, dt, PLAYER_TURN_SPEED);

  for (const entity of Object.values(state.entities)) {
    const facing = entity.facing;
    if (!facing) continue;
    updateLookAtFacing(state, entity, entity.position, state.clock);
    if (entity.kind === 'enemy' && entity.state === 'attack') {
      faceEntityTowardPosition(entity, state.player.position, 'target', state.clock, 0.25);
    }
    updateFacingState(ensureFacingState(entity), dt, ENTITY_TURN_SPEED);
  }
}

export function normalizeYaw(value: number): number {
  let yaw = value % TWO_PI;
  if (yaw <= -Math.PI) yaw += TWO_PI;
  if (yaw > Math.PI) yaw -= TWO_PI;
  return yaw;
}

export function shortestAngleDelta(from: number, to: number): number {
  return normalizeYaw(to - from);
}

function setDesiredFacing(
  actor: FacingActor,
  yaw: number,
  source: FacingSource,
  now: number,
  options: { lockSeconds?: number; force?: boolean; lookAtEntityId?: string | null; lookAtPosition?: Vec3 | null } = {}
): boolean {
  const facing = ensureFacingState(actor);
  if (!options.force && source === 'movement' && isFacingLocked(facing, now)) return false;
  facing.desiredFacingYaw = normalizeYaw(yaw);
  facing.lastFacingSource = source;
  if (options.lockSeconds && options.lockSeconds > 0) facing.facingLockedUntil = Math.max(facing.facingLockedUntil, now + options.lockSeconds);
  if (options.force || source !== 'movement') {
    facing.lookAtEntityId = options.lookAtEntityId ?? null;
    facing.lookAtPosition = options.lookAtPosition ? { ...options.lookAtPosition } : null;
  } else {
    facing.lookAtEntityId = null;
    facing.lookAtPosition = null;
  }
  return true;
}

function updateLookAtFacing(state: GameState, actor: FacingActor, actorPosition: Vec3, now: number): void {
  const facing = ensureFacingState(actor);
  const entity = facing.lookAtEntityId ? state.entities[facing.lookAtEntityId] : null;
  const target = entity?.area === state.player.currentArea || actor === state.player ? entity?.position : null;
  const lookAt = target ?? facing.lookAtPosition;
  if (!lookAt || facing.facingLockedUntil < now) return;
  const yaw = yawBetween(actorPosition, lookAt);
  if (yaw != null) facing.desiredFacingYaw = yaw;
}

function isFacingLocked(facing: FacingState, now: number): boolean {
  return facing.facingLockedUntil > now && facing.lastFacingSource !== 'movement';
}

function targetPosition(state: GameState, target: TargetRef): Vec3 | null {
  if (!target) return null;
  if (target.kind === 'tile') return target.position;
  if (target.kind === 'entity' || target.kind === 'hostile' || target.kind === 'friendly' || target.kind === 'ground-item') return state.entities[target.entityId]?.position ?? null;
  if (target.kind === 'self') return state.player.position;
  return null;
}

function stepAngle(current: number, target: number, maxDelta: number): number {
  const delta = shortestAngleDelta(current, target);
  if (Math.abs(delta) <= maxDelta || maxDelta === 0) return normalizeYaw(target);
  return normalizeYaw(current + Math.sign(delta) * maxDelta);
}

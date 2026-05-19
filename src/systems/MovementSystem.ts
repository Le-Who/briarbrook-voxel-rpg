import type { GameState, Vec3 } from '../game/types';
import type { AreaManager } from '../world/AreaManager';
import { recordPathfindingCall } from '../game/PerfMonitor';
import { interruptPlayerAction, isPlayerStunned, refreshPlayerActionState, setPlayerActionState } from './ActionStateSystem';
import { addSystemMessage } from './ChatSystem';
import { faceActorTowardPosition, facePlayerFromVelocity, releaseFacingLock } from './FacingSystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';

export function movePlayerBy(state: GameState, areaManager: AreaManager, dx: number, dz: number): void {
  if (isPlayerStunned(state)) return;
  interruptPlayerAction(state, 'movement');
  const len = Math.hypot(dx, dz) || 1;
  state.player.movement.intent = { x: dx / len, z: dz / len };
  state.player.movement.intentUntil = state.clock + state.realtime.fixedDelta * 2.5;
  state.player.movement.path = [];
  state.player.movement.waypoint = null;
  state.player.targetPosition = null;
  releaseFacingLock(state.player);
  facePlayerFromVelocity(state, state.player.movement.intent);
  checkStealthMovement(state);
}

export function setMoveTarget(state: GameState, areaManager: AreaManager, position: Vec3): boolean {
  if (isPlayerStunned(state)) return false;
  interruptPlayerAction(state, 'movement');
  state.player.targetPosition = { x: Math.round(position.x), y: 0, z: Math.round(position.z) };
  state.player.movement.intent = null;
  state.player.movement.path = buildPath(state, areaManager, state.player.targetPosition);
  if (!state.player.movement.path.length) {
    clearPath(state);
    state.ui.prompt = 'Path blocked.';
    return false;
  }
  state.player.movement.waypoint = state.player.movement.path.shift() ?? state.player.targetPosition;
  releaseFacingLock(state.player);
  faceActorTowardPosition(state.player, state.player.position, state.player.movement.waypoint, 'movement', state.clock, { force: true });
  checkStealthMovement(state);
  return true;
}

export function updatePlayerMovement(state: GameState, areaManager: AreaManager, dt: number): void {
  if (isPlayerStunned(state)) {
    state.player.movement.velocity = { x: 0, z: 0 };
    refreshPlayerActionState(state);
    return;
  }

  const movement = state.player.movement;
  const player = state.player.position;
  let desired = movement.intent && movement.intentUntil >= state.clock ? movement.intent : null;
  let waypoint = movement.waypoint;

  if (!desired && state.player.targetPosition) {
    if (!waypoint) {
      movement.path = buildPath(state, areaManager, state.player.targetPosition);
      waypoint = movement.path.shift() ?? state.player.targetPosition;
      movement.waypoint = waypoint;
    }
    const dx = waypoint.x - player.x;
    const dz = waypoint.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.1) {
      if (movement.path.length) {
        waypoint = movement.path.shift() ?? null;
        movement.waypoint = waypoint;
      } else {
        player.x = waypoint.x;
        player.z = waypoint.z;
        state.player.targetPosition = null;
        movement.waypoint = null;
        waypoint = null;
      }
    }
    if (waypoint) {
      const tx = waypoint.x - player.x;
      const tz = waypoint.z - player.z;
      const len = Math.hypot(tx, tz) || 1;
      desired = { x: tx / len, z: tz / len };
    }
  }

  movement.maxSpeed = state.player.combatProfile.hidden ? 2.1 : 4.8;
  const targetSpeed = desired ? movement.maxSpeed * pathSpeedScale(state, waypoint) : 0;
  const currentSpeed = Math.hypot(movement.velocity.x, movement.velocity.z);
  const acceleration = desired ? 24 : 18;
  const nextSpeed = moveToward(currentSpeed, targetSpeed, acceleration * dt);
  const dir = desired ?? (currentSpeed > 0 ? { x: movement.velocity.x / currentSpeed, z: movement.velocity.z / currentSpeed } : { x: 0, z: 0 });
  movement.velocity = { x: dir.x * nextSpeed, z: dir.z * nextSpeed };
  if (desired && nextSpeed > 0.04) facePlayerFromVelocity(state, movement.velocity);

  const nextX = player.x + movement.velocity.x * dt;
  const nextZ = player.z + movement.velocity.z * dt;
  let moved = false;
  if (!areaManager.isBlocked(state, nextX, player.z)) {
    player.x = nextX;
    moved = moved || Math.abs(movement.velocity.x) > 0.01;
  } else {
    movement.velocity.x = 0;
    clearPath(state);
  }
  if (!areaManager.isBlocked(state, player.x, nextZ)) {
    player.z = nextZ;
    moved = moved || Math.abs(movement.velocity.z) > 0.01;
  } else {
    movement.velocity.z = 0;
    clearPath(state);
  }

  movement.tile = { x: Math.round(player.x), z: Math.round(player.z) };
  if (moved) {
    checkStealthMovement(state);
    setPlayerActionState(state, 'moving', 0.12, desired === movement.intent ? 'intent' : 'path');
  } else {
    refreshPlayerActionState(state);
  }
}

function buildPath(state: GameState, areaManager: AreaManager, target: Vec3): Vec3[] {
  recordPathfindingCall();
  const start = { x: Math.round(state.player.position.x), z: Math.round(state.player.position.z) };
  const goal = nearestWalkable(state, areaManager, Math.round(target.x), Math.round(target.z));
  if (!goal) return [];
  if (start.x === goal.x && start.z === goal.z) return [{ x: goal.x, y: 0, z: goal.z }];
  const queue = [start];
  const cameFrom = new Map<string, string | null>([[key(start.x, start.z), null]]);
  const maxVisited = 420;
  const dirs = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 }
  ];

  while (queue.length && cameFrom.size < maxVisited) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.z === goal.z) break;
    const ordered = dirs
      .slice()
      .sort((a, b) => Math.hypot(goal.x - (current.x + a.x), goal.z - (current.z + a.z)) - Math.hypot(goal.x - (current.x + b.x), goal.z - (current.z + b.z)));
    for (const dir of ordered) {
      const next = { x: current.x + dir.x, z: current.z + dir.z };
      const nextKey = key(next.x, next.z);
      if (cameFrom.has(nextKey)) continue;
      if (areaManager.isBlocked(state, next.x, next.z)) continue;
      cameFrom.set(nextKey, key(current.x, current.z));
      queue.push(next);
    }
  }

  const goalKey = key(goal.x, goal.z);
  if (!cameFrom.has(goalKey)) return [];
  const path: Vec3[] = [];
  let cursor: string | null = goalKey;
  while (cursor) {
    const [x, z] = cursor.split(',').map(Number);
    if (x !== start.x || z !== start.z) path.push({ x, y: 0, z });
    cursor = cameFrom.get(cursor) ?? null;
  }
  return path.reverse();
}

function nearestWalkable(state: GameState, areaManager: AreaManager, x: number, z: number): { x: number; z: number } | null {
  if (!areaManager.isBlocked(state, x, z)) return { x, z };
  for (let radius = 1; radius <= 3; radius += 1) {
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) !== radius && Math.abs(oz) !== radius) continue;
        const nx = x + ox;
        const nz = z + oz;
        if (!areaManager.isBlocked(state, nx, nz)) return { x: nx, z: nz };
      }
    }
  }
  return null;
}

function pathSpeedScale(state: GameState, waypoint: Vec3 | null): number {
  if (!waypoint || !state.player.targetPosition) return 1;
  const finalDist = Math.hypot(state.player.targetPosition.x - state.player.position.x, state.player.targetPosition.z - state.player.position.z);
  return Math.max(0.35, Math.min(1, finalDist / 1.2));
}

function clearPath(state: GameState): void {
  state.player.targetPosition = null;
  state.player.movement.path = [];
  state.player.movement.waypoint = null;
}

function moveToward(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  return Math.max(target, current - maxDelta);
}

function key(x: number, z: number): string {
  return `${x},${z}`;
}

function checkStealthMovement(state: GameState): void {
  if (!state.player.combatProfile.hidden) return;
  if (state.clock - state.player.combatProfile.lastStealthCheckAt < 0.75) return;
  state.player.combatProfile.lastStealthCheckAt = state.clock;
  const stealth = getSkillValue(state, 'Stealth');
  const success = Math.random() * 100 < Math.max(35, Math.min(97, (45 + stealth * 0.45) * (state.world.time?.stealthModifier ?? 1)));
  attemptSkillUse(state, 'Stealth', { verb: 'hidden-move', difficulty: 28, success, relatedSkills: ['Hiding'] });
  if (success) return;
  state.player.combatProfile.hidden = false;
  state.player.combatProfile.hiddenUntil = 0;
  addSystemMessage(state, 'You make too much noise and reveal yourself.');
}

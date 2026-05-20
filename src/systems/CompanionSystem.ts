import type { AreaId, CompanionCommand, CompanionRole, CompanionState, GameState, NpcEntity, Vec3 } from '../game/types';
import { AreaManager } from '../world/AreaManager';
import { addChat } from './ChatSystem';
import { calculateDerivedStats } from './EquipmentSystem';
import { faceEntityFromDelta, faceEntityTowardPosition } from './FacingSystem';
import { addFloatingText } from './LootSystem';
import { queueSpellRoleEffect, queueWeaponImpactEffect } from './VfxSystem';

export interface CompanionHireOptions {
  role?: CompanionRole;
  command?: CompanionCommand;
  temporary?: boolean;
  outingSeconds?: number;
}

interface RoleSpec {
  label: string;
  maxHealth: number;
  maxMana: number;
  assistRange: number;
  assistDamage: number;
  assistCooldown: number;
  followDistance: number;
  speed: number;
}

const MAX_ACTIVE_COMPANIONS = 2;
const DEFAULT_OUTING_SECONDS = 20 * 60;

export const companionRoleSpecs: Record<CompanionRole, RoleSpec> = {
  guard: {
    label: 'Guard',
    maxHealth: 82,
    maxMana: 18,
    assistRange: 2.35,
    assistDamage: 5,
    assistCooldown: 2.5,
    followDistance: 2.15,
    speed: 3.4
  },
  archer: {
    label: 'Archer',
    maxHealth: 58,
    maxMana: 24,
    assistRange: 7.5,
    assistDamage: 4,
    assistCooldown: 2.15,
    followDistance: 3.15,
    speed: 3.55
  },
  healer: {
    label: 'Healer',
    maxHealth: 52,
    maxMana: 76,
    assistRange: 5.5,
    assistDamage: 1,
    assistCooldown: 4.5,
    followDistance: 2.75,
    speed: 3.25
  },
  scout: {
    label: 'Scout',
    maxHealth: 54,
    maxMana: 36,
    assistRange: 6.75,
    assistDamage: 2,
    assistCooldown: 3.2,
    followDistance: 3,
    speed: 3.8
  }
};

export function activeCompanions(state: GameState): NpcEntity[] {
  normalizePartyIds(state);
  return state.world.partyMemberIds
    .map((id) => state.entities[id])
    .filter((entity): entity is NpcEntity => Boolean(entity && (entity.kind === 'npc' || entity.kind === 'social') && entity.companion));
}

export function hireCompanion(state: GameState, entityId: string, options: CompanionHireOptions = {}): boolean {
  normalizePartyIds(state);
  const entity = state.entities[entityId];
  if (!entity || (entity.kind !== 'npc' && entity.kind !== 'social')) {
    state.ui.prompt = 'That target cannot join you.';
    return false;
  }
  if (!state.world.partyMemberIds.includes(entity.id) && state.world.partyMemberIds.length >= MAX_ACTIVE_COMPANIONS) {
    state.ui.prompt = 'Party limit reached for this slice.';
    return false;
  }
  const role = options.role ?? companionRoleForNpc(entity);
  const temporary = options.temporary ?? true;
  const companion = createCompanionState(state, entity, role, {
    command: options.command ?? entity.companion?.command ?? 'follow',
    temporary,
    outingSeconds: options.outingSeconds
  });
  entity.companion = companion;
  entity.blocksMovement = false;
  if (!state.world.partyMemberIds.includes(entity.id)) state.world.partyMemberIds.push(entity.id);
  addChat(state, companionIntro(entity, role), { channel: 'Party', speaker: entity.name, tone: 'party' });
  state.ui.prompt = `${entity.name} joins as ${companionRoleSpecs[role].label}.`;
  return true;
}

export function dismissCompanion(state: GameState, entityId: string, reason = 'dismissed'): boolean {
  normalizePartyIds(state);
  const entity = state.entities[entityId];
  if (!entity || (entity.kind !== 'npc' && entity.kind !== 'social') || !entity.companion) return false;
  delete entity.companion;
  entity.blocksMovement = true;
  state.world.partyMemberIds = state.world.partyMemberIds.filter((id) => id !== entityId);
  const text = reason === 'expired' ? `${entity.name} heads back after the outing.` : `${entity.name} leaves the party.`;
  addChat(state, text, { channel: 'Party', speaker: entity.name, tone: 'party' });
  state.ui.prompt = text;
  return true;
}

export function setCompanionCommand(state: GameState, entityId: string, command: CompanionCommand): boolean {
  normalizePartyIds(state);
  const entity = state.entities[entityId];
  if (!entity || (entity.kind !== 'npc' && entity.kind !== 'social') || !entity.companion) return false;
  entity.companion.command = command;
  addChat(state, `${entity.name}: ${command}.`, { channel: 'Party', speaker: entity.name, tone: 'party' });
  state.ui.prompt = `${entity.name} set to ${command}.`;
  return true;
}

export function normalizeCompanionState(state: GameState): void {
  normalizePartyIds(state);
  state.world.partyMemberIds = state.world.partyMemberIds.filter((id) => {
    const entity = state.entities[id];
    if (!entity || (entity.kind !== 'npc' && entity.kind !== 'social')) return false;
    entity.companion = ensureCompanionState(state, entity);
    entity.blocksMovement = false;
    return true;
  });
}

export function updateCompanions(state: GameState, areaManager: AreaManager, dt: number): void {
  normalizeCompanionState(state);
  const companions = activeCompanions(state);
  companions.forEach((entity, index) => {
    const companion = entity.companion;
    if (!companion) return;
    if (companion.temporary && companion.expiresAt > 0 && state.clock >= companion.expiresAt) {
      dismissCompanion(state, entity.id, 'expired');
      return;
    }
    if (companion.downedUntil > state.clock) return;
    if (entity.area !== state.player.currentArea || distance(entity.position, state.player.position) > 13.5) {
      regroupCompanion(state, areaManager, entity, index, 'Regroup');
    }
    tryHealerSupport(state, entity);
    tryScoutHint(state, entity);
    tryAssist(state, entity);
    updateCompanionMovement(state, areaManager, entity, index, dt);
    recoverIfStuck(state, areaManager, entity, index);
  });
}

function createCompanionState(
  state: GameState,
  entity: NpcEntity,
  role: CompanionRole,
  options: { command: CompanionCommand; temporary: boolean; outingSeconds?: number }
): CompanionState {
  const spec = companionRoleSpecs[role];
  const previous = entity.companion;
  return {
    role,
    command: options.command,
    temporary: options.temporary,
    hiredAt: state.clock,
    expiresAt: options.temporary ? state.clock + (options.outingSeconds ?? DEFAULT_OUTING_SECONDS) : 0,
    health: Math.min(previous?.health ?? spec.maxHealth, spec.maxHealth),
    maxHealth: spec.maxHealth,
    mana: Math.min(previous?.mana ?? spec.maxMana, spec.maxMana),
    maxMana: spec.maxMana,
    lastAssistAt: previous?.lastAssistAt ?? -999,
    lastHealAt: previous?.lastHealAt ?? -999,
    lastScoutAt: previous?.lastScoutAt ?? -999,
    lastStuckCheckAt: state.clock,
    stuckSeconds: 0,
    lastPosition: { ...entity.position },
    downedUntil: previous?.downedUntil ?? 0
  };
}

function ensureCompanionState(state: GameState, entity: NpcEntity): CompanionState {
  const role = entity.companion?.role ?? companionRoleForNpc(entity);
  const command = entity.companion?.command ?? 'follow';
  const normalized = createCompanionState(state, entity, role, {
    command,
    temporary: entity.companion?.temporary ?? true,
    outingSeconds: entity.companion?.temporary && entity.companion.expiresAt > state.clock ? entity.companion.expiresAt - state.clock : DEFAULT_OUTING_SECONDS
  });
  normalized.hiredAt = entity.companion?.hiredAt ?? normalized.hiredAt;
  normalized.expiresAt = Number.isFinite(entity.companion?.expiresAt) ? (entity.companion?.expiresAt ?? normalized.expiresAt) : 0;
  normalized.lastPosition = entity.companion?.lastPosition ?? normalized.lastPosition;
  normalized.lastStuckCheckAt = entity.companion?.lastStuckCheckAt ?? normalized.lastStuckCheckAt;
  normalized.stuckSeconds = entity.companion?.stuckSeconds ?? normalized.stuckSeconds;
  return normalized;
}

function companionRoleForNpc(entity: NpcEntity): CompanionRole {
  const id = entity.id.toLowerCase();
  const name = entity.name.toLowerCase();
  if (id.includes('durnok') || name.includes('healer')) return 'healer';
  if (id.includes('aric_road')) return 'archer';
  if (id.includes('aric') || name.includes('scout')) return 'scout';
  if (id.includes('liora') || entity.role === 'guard') return 'guard';
  return 'guard';
}

function normalizePartyIds(state: GameState): void {
  state.world.partyMemberIds = Array.isArray(state.world.partyMemberIds) ? Array.from(new Set(state.world.partyMemberIds)) : [];
}

function companionIntro(entity: NpcEntity, role: CompanionRole): string {
  if (role === 'healer') return 'I will keep the outing patched up.';
  if (role === 'scout') return 'I will watch for tracks and hidden signs.';
  if (role === 'archer') return 'I will support from range and keep pressure light.';
  return 'I will hold the front and keep clear of doors.';
}

function updateCompanionMovement(state: GameState, areaManager: AreaManager, entity: NpcEntity, index: number, dt: number): void {
  const companion = entity.companion;
  if (!companion || companion.command === 'hold') return;
  const target = safeCompanionSpot(state, areaManager, entity.id, index);
  const allowedDistance = companionRoleSpecs[companion.role].followDistance;
  if (distance(entity.position, target) <= allowedDistance * 0.45) return;
  moveCompanionToward(state, areaManager, entity, target, dt, companionRoleSpecs[companion.role].speed);
}

function moveCompanionToward(state: GameState, areaManager: AreaManager, entity: NpcEntity, target: Vec3, dt: number, speed: number): void {
  const dx = target.x - entity.position.x;
  const dz = target.z - entity.position.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = entity.position.x + (dx / len) * dt * speed;
  const nz = entity.position.z + (dz / len) * dt * speed;
  const sideways = [
    { x: nx, z: nz },
    { x: entity.position.x + (-dz / len) * dt * speed, z: entity.position.z + (dx / len) * dt * speed },
    { x: entity.position.x + (dz / len) * dt * speed, z: entity.position.z + (-dx / len) * dt * speed }
  ];
  const step = sideways.find((candidate) => isCompanionStepSafe(state, areaManager, entity.area, candidate.x, candidate.z, entity.id));
  if (!step) return;
  faceEntityFromDelta(entity, step.x - entity.position.x, step.z - entity.position.z, 'movement', state.clock);
  entity.position.x = step.x;
  entity.position.z = step.z;
}

function tryAssist(state: GameState, entity: NpcEntity): boolean {
  const companion = entity.companion;
  if (!companion || companion.command !== 'assist') return false;
  const target = state.player.activeTargetId ? state.entities[state.player.activeTargetId] : null;
  if (!target || target.kind !== 'enemy' || target.area !== state.player.currentArea || target.state === 'dead') return false;
  const spec = companionRoleSpecs[companion.role];
  if (distance(entity.position, target.position) > spec.assistRange) return false;
  if (state.clock - companion.lastAssistAt < spec.assistCooldown) return false;
  if (target.health <= 1) return false;
  const amount = Math.min(target.health - 1, spec.assistDamage);
  if (amount <= 0) return false;
  target.health = Math.max(1, target.health - amount);
  companion.lastAssistAt = state.clock;
  state.combat.hitFlashes[target.id] = state.clock + 0.14;
  faceEntityTowardPosition(entity, target.position, 'target', state.clock, 0.35);
  addFloatingText(state, `${amount} assist`, target.position, companion.role === 'healer' ? '#69e681' : '#ffcf57');
  if (companion.role === 'archer' || companion.role === 'scout') {
    state.projectiles.push({
      id: `companion_${entity.id}_${Math.round(state.clock * 1000)}`,
      kind: 'arrow',
      from: { ...entity.position, y: entity.position.y + 1.1 },
      to: { ...target.position, y: target.position.y + 1.1 },
      age: 0,
      duration: 0.35,
      color: companion.role === 'scout' ? '#8bd9ff' : '#d9bf77'
    });
  } else {
    queueWeaponImpactEffect(state, 'sword', target.position, { armor: target.armor });
  }
  return true;
}

function tryHealerSupport(state: GameState, entity: NpcEntity): boolean {
  const companion = entity.companion;
  if (!companion || companion.role !== 'healer' || companion.command === 'passive') return false;
  if (state.clock - companion.lastHealAt < 8) return false;
  const stats = calculateDerivedStats(state);
  if (state.player.downed.active) {
    if (companion.mana < 20) return false;
    companion.mana -= 20;
    companion.lastHealAt = state.clock;
    state.player.downed = { active: false, since: 0, respawnAt: 0 };
    state.player.health = Math.max(state.player.health, Math.round(stats.maxHealth * 0.22));
    addChat(state, 'Back on your feet. Do not rush it.', { channel: 'Party', speaker: entity.name, tone: 'party' });
    addFloatingText(state, 'Revive', state.player.position, '#69e681');
    queueSpellRoleEffect(state, 'heal', entity.position, state.player.position, '#69e681');
    return true;
  }
  if (state.player.health > stats.maxHealth * 0.58 || companion.mana < 10) return false;
  const amount = Math.min(stats.maxHealth - state.player.health, 14);
  if (amount <= 0) return false;
  companion.mana -= 10;
  companion.lastHealAt = state.clock;
  state.player.health = Math.min(stats.maxHealth, state.player.health + amount);
  addFloatingText(state, `+${Math.round(amount)}`, state.player.position, '#69e681');
  queueSpellRoleEffect(state, 'heal', entity.position, state.player.position, '#69e681');
  return true;
}

function tryScoutHint(state: GameState, entity: NpcEntity): boolean {
  const companion = entity.companion;
  if (!companion || companion.role !== 'scout' || companion.command === 'passive') return false;
  if (state.clock - companion.lastScoutAt < 10) return false;
  const hidden = Object.values(state.entities).find(
    (candidate) => candidate.kind === 'container' && candidate.area === state.player.currentArea && candidate.hidden && distance(candidate.position, state.player.position) <= 8
  );
  if (hidden?.kind === 'container') {
    hidden.hidden = false;
    companion.lastScoutAt = state.clock;
    addChat(state, `${hidden.name}: hidden mark spotted.`, { channel: 'Party', speaker: entity.name, tone: 'party' });
    addFloatingText(state, 'Scout Hint', hidden.position, '#8bd9ff');
    return true;
  }
  const trap = state.world.magicFields.find((field) => field.area === state.player.currentArea && field.kind === 'trap' && field.remaining > 0 && distance(field.position, state.player.position) <= 7);
  if (!trap) return false;
  companion.lastScoutAt = state.clock;
  addFloatingText(state, 'Tracks', trap.position, '#8bd9ff');
  return true;
}

function recoverIfStuck(state: GameState, areaManager: AreaManager, entity: NpcEntity, index: number): void {
  const companion = entity.companion;
  if (!companion) return;
  if (state.clock - companion.lastStuckCheckAt < 1) return;
  const moved = distance(entity.position, companion.lastPosition);
  const farFromPlayer = distance(entity.position, state.player.position) > 5.5;
  companion.stuckSeconds = moved < 0.08 && farFromPlayer && companion.command !== 'hold' ? companion.stuckSeconds + (state.clock - companion.lastStuckCheckAt) : 0;
  companion.lastStuckCheckAt = state.clock;
  companion.lastPosition = { ...entity.position };
  if (companion.stuckSeconds < 2.4) return;
  companion.stuckSeconds = 0;
  state.dev.telemetry.stuckRecoveryEvents += 1;
  regroupCompanion(state, areaManager, entity, index, 'Stuck');
}

function regroupCompanion(state: GameState, areaManager: AreaManager, entity: NpcEntity, index: number, label: string): void {
  entity.area = state.player.currentArea;
  entity.position = safeCompanionSpot(state, areaManager, entity.id, index);
  entity.blocksMovement = false;
  if (entity.companion) {
    entity.companion.lastPosition = { ...entity.position };
    entity.companion.lastStuckCheckAt = state.clock;
  }
  addFloatingText(state, label, entity.position, '#8bd9ff');
}

function safeCompanionSpot(state: GameState, areaManager: AreaManager, companionId: string, index: number): Vec3 {
  const offsets = [
    { x: -1.6, z: -1.2 },
    { x: 1.6, z: -1.2 },
    { x: -2.2, z: 0.8 },
    { x: 2.2, z: 0.8 },
    { x: 0, z: -2.4 },
    { x: 0, z: 2.4 },
    { x: -3, z: -1.8 },
    { x: 3, z: -1.8 }
  ];
  const ordered = offsets.slice(index).concat(offsets.slice(0, index));
  for (const offset of ordered) {
    const candidate = { x: state.player.position.x + offset.x, y: 0, z: state.player.position.z + offset.z };
    if (isCompanionStepSafe(state, areaManager, state.player.currentArea, candidate.x, candidate.z, companionId)) return candidate;
  }
  return { ...state.player.position, x: state.player.position.x - 1.2 };
}

function isCompanionStepSafe(state: GameState, areaManager: AreaManager, area: AreaId, x: number, z: number, companionId: string): boolean {
  if (areaManager.isBlockedInArea(state, area, x, z, companionId)) return false;
  if (nearTrapField(state, area, x, z)) return false;
  if (nearPortal(state, area, x, z)) return false;
  return true;
}

function nearTrapField(state: GameState, area: AreaId, x: number, z: number): boolean {
  return state.world.magicFields.some((field) => field.area === area && field.kind === 'trap' && field.remaining > 0 && Math.hypot(field.position.x - x, field.position.z - z) < 0.95);
}

function nearPortal(state: GameState, area: AreaId, x: number, z: number): boolean {
  return Object.values(state.entities).some((entity) => entity.kind === 'portal' && entity.area === area && Math.hypot(entity.position.x - x, entity.position.z - z) < 1.05);
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

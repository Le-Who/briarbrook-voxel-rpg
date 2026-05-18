import type { AreaId, GameState, ItemDef, ResourceKind, Vec3, VisualEffect, VisualEffectKind, VisualEffectTier } from '../game/types';

export const VFX_TIER_BUDGET: Record<VisualEffectTier, { label: string; maxActive: number; defaultDuration: number }> = {
  0: { label: 'UI-only state change', maxActive: 0, defaultDuration: 0 },
  1: { label: 'Small particles, sparks, outlines, and short cues', maxActive: 24, defaultDuration: 0.42 },
  2: { label: 'Projectiles and short area effects', maxActive: 12, defaultDuration: 0.75 },
  3: { label: 'Rare boss or event-scale effects', maxActive: 2, defaultDuration: 1.4 }
};

const TOTAL_EFFECT_BUDGET = 34;
let nextVfxId = 1;

type VisualEffectInput = Omit<VisualEffect, 'id' | 'area' | 'startedAt' | 'duration'> & {
  area?: AreaId;
  startedAt?: number;
  duration?: number;
};

export function pushVisualEffect(state: GameState, effect: VisualEffectInput): void {
  if (effect.tier === 0) return;
  pruneVisualEffects(state);
  const duration = state.ui.reducedMotion && effect.tier > 1 ? Math.min(effect.duration ?? VFX_TIER_BUDGET[effect.tier].defaultDuration, 0.42) : effect.duration ?? VFX_TIER_BUDGET[effect.tier].defaultDuration;
  const tierBudget = VFX_TIER_BUDGET[effect.tier].maxActive;
  removeOldestMatching(state, (candidate) => candidate.tier === effect.tier, Math.max(0, activeByTier(state, effect.tier) - tierBudget + 1));
  removeOldestMatching(state, () => true, Math.max(0, state.visualEffects.length - TOTAL_EFFECT_BUDGET + 1));
  state.visualEffects.push({
    ...effect,
    id: createVisualEffectId(),
    area: effect.area ?? state.player.currentArea,
    startedAt: effect.startedAt ?? state.clock,
    duration
  });
}

function createVisualEffectId(): string {
  nextVfxId += 1;
  return `vfx_${nextVfxId.toString(36)}`;
}

export function pruneVisualEffects(state: GameState): void {
  state.visualEffects = state.visualEffects.filter((effect) => state.clock - effect.startedAt < effect.duration);
}

export function queueWeaponSwingEffect(state: GameState, weaponClass: ItemDef['weaponClass'], targetPosition: Vec3): void {
  const kind: VisualEffectKind = weaponClass === 'fencing' ? 'pierce_thrust' : 'slash_arc';
  const color = weaponClass === 'fencing' ? '#dbe7ff' : weaponClass === 'axe' ? '#ffd27d' : '#ffd968';
  pushVisualEffect(state, {
    kind,
    tier: 1,
    position: state.player.position,
    targetPosition,
    yaw: yawBetween(state.player.position, targetPosition),
    color,
    duration: 0.34
  });
}

export function queueWeaponImpactEffect(state: GameState, weaponClass: ItemDef['weaponClass'], position: Vec3, options: { crit?: boolean; armor?: number } = {}): void {
  if (weaponClass === 'mace' || weaponClass === 'staff') {
    pushVisualEffect(state, { kind: 'mace_impact', tier: 1, position, color: '#c8bca4', duration: 0.38, intensity: options.armor ?? 1 });
  }
  if ((options.armor ?? 0) > 0) {
    pushVisualEffect(state, { kind: 'armor_sparks', tier: 1, position, color: '#ffd27d', duration: 0.32, intensity: Math.min(3, 1 + (options.armor ?? 0) / 8) });
  } else {
    pushVisualEffect(state, { kind: 'hit_impact', tier: 1, position, color: '#ff7768', duration: 0.28 });
  }
  if (options.crit) pushVisualEffect(state, { kind: 'crit_cue', tier: 1, position, color: '#ffd968', duration: 0.48 });
}

export function queueBlockEffect(state: GameState, position: Vec3, yaw?: number): void {
  pushVisualEffect(state, { kind: 'shield_block', tier: 1, position, yaw, color: '#8bd9ff', duration: 0.36 });
}

export function queueMissEffect(state: GameState, position: Vec3, dodged = false): void {
  pushVisualEffect(state, { kind: dodged ? 'dodge_cue' : 'miss_cue', tier: 1, position, color: dodged ? '#8bd9ff' : '#d8d8d8', duration: 0.34 });
}

export function queueGatheringEffect(state: GameState, kind: ResourceKind | 'fish', position: Vec3, result: 'active' | 'success' | 'depleted' = 'success'): void {
  const normalizedKind: ResourceKind = kind === 'fish' ? 'water' : kind;
  if (result === 'depleted') {
    pushVisualEffect(state, { kind: 'depleted_cue', tier: 1, position, color: '#9c9385', duration: 0.55 });
    return;
  }
  const effectKind: VisualEffectKind = normalizedKind === 'tree' ? 'wood_chips' : normalizedKind === 'ore' ? 'ore_sparks' : normalizedKind === 'water' ? 'water_ripple' : 'herb_sparkle';
  const color = normalizedKind === 'tree' ? '#d29a5b' : normalizedKind === 'ore' ? '#d8d5c9' : normalizedKind === 'water' ? '#8bd9ff' : '#b7f28a';
  pushVisualEffect(state, { kind: effectKind, tier: normalizedKind === 'water' ? 2 : 1, position, color, duration: result === 'active' ? 0.34 : 0.58 });
}

export function queueSpellRoleEffect(state: GameState, role: string, position: Vec3, targetPosition?: Vec3, color = '#7ad7ff'): void {
  const kind = spellRoleEffectKind(role);
  pushVisualEffect(state, {
    kind,
    tier: kind === 'rune_circle' || kind === 'reveal_pulse' ? 2 : 1,
    position,
    targetPosition,
    yaw: targetPosition ? yawBetween(position, targetPosition) : undefined,
    color,
    duration: kind === 'reveal_pulse' || kind === 'rune_circle' ? 0.9 : 0.55
  });
}

export function spellRoleEffectKind(role: string): VisualEffectKind {
  if (role === 'heal' || role === 'Healing') return 'heal_particles';
  if (role === 'protection' || role === 'strength' || role === 'Buff') return 'buff_ring';
  if (role === 'debuff' || role === 'poison' || role === 'Debuff' || role === 'Control') return 'debuff_mark';
  if (role === 'reveal') return 'reveal_pulse';
  if (role === 'recall' || role === 'mark_rune' || role === 'Travel') return 'rune_circle';
  if (role === 'fizzle') return 'fizzle_smoke';
  if (role === 'damage' || role === 'Damage') return 'hit_impact';
  if (role === 'utility' || role === 'Utility' || role === 'unlock' || role === 'telekinesis' || role === 'detect_magic') return 'utility_line';
  return 'hit_impact';
}

function activeByTier(state: GameState, tier: VisualEffectTier): number {
  return state.visualEffects.filter((effect) => effect.tier === tier).length;
}

function removeOldestMatching(state: GameState, predicate: (effect: VisualEffect) => boolean, count: number): void {
  if (count <= 0) return;
  const ids = state.visualEffects
    .filter(predicate)
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(0, count)
    .map((effect) => effect.id);
  if (!ids.length) return;
  const remove = new Set(ids);
  state.visualEffects = state.visualEffects.filter((effect) => !remove.has(effect.id));
}

function yawBetween(from: Vec3, to: Vec3): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

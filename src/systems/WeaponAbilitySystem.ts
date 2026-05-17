import { itemDefs } from '../data/items';
import type { EnemyEntity, GameState, ItemDef, ItemStack } from '../game/types';
import { setPlayerActionState } from './ActionStateSystem';
import { addSystemMessage } from './ChatSystem';
import { calculateDerivedStats } from './EquipmentSystem';
import { addFloatingText } from './LootSystem';
import { recordKill } from './QuestSystem';
import { attemptSkillUse, gainPlayerXp, getSkillValue } from './SkillSystem';

interface WeaponAbilityDef {
  id: string;
  label: string;
  weaponClasses: Array<NonNullable<ItemDef['weaponClass']>>;
  staminaCost: number;
  cooldown: number;
  range: number;
  damageMultiplier: number;
  maxTargets: number;
  skill: string;
  effect?: 'bleed' | 'stagger' | 'pin' | 'armor_crush' | 'riposte';
}

export const weaponAbilities: Record<string, WeaponAbilityDef> = {
  quick_slash: {
    id: 'quick_slash',
    label: 'Quick Slash',
    weaponClasses: ['sword'],
    staminaCost: 4,
    cooldown: 0.8,
    range: 1.75,
    damageMultiplier: 0.72,
    maxTargets: 1,
    skill: 'Swordsmanship'
  },
  cleave: {
    id: 'cleave',
    label: 'Cleave',
    weaponClasses: ['sword', 'axe'],
    staminaCost: 9,
    cooldown: 4.2,
    range: 2.1,
    damageMultiplier: 0.86,
    maxTargets: 2,
    skill: 'Swordsmanship'
  },
  lunge: {
    id: 'lunge',
    label: 'Lunge',
    weaponClasses: ['fencing'],
    staminaCost: 6,
    cooldown: 2.4,
    range: 2.4,
    damageMultiplier: 1.05,
    maxTargets: 1,
    skill: 'Fencing'
  },
  heavy_blow: {
    id: 'heavy_blow',
    label: 'Heavy Blow',
    weaponClasses: ['mace', 'staff'],
    staminaCost: 10,
    cooldown: 4.8,
    range: 1.8,
    damageMultiplier: 1.45,
    maxTargets: 1,
    skill: 'Mace Fighting',
    effect: 'stagger'
  },
  aimed_shot: {
    id: 'aimed_shot',
    label: 'Aimed Shot',
    weaponClasses: ['bow', 'crossbow'],
    staminaCost: 8,
    cooldown: 3.2,
    range: 9,
    damageMultiplier: 1.32,
    maxTargets: 1,
    skill: 'Archery',
    effect: 'pin'
  }
};

export function useWeaponAbility(state: GameState, abilityId: string, entityId?: string): void {
  const ability = weaponAbilities[abilityId];
  if (!ability) {
    state.ui.prompt = 'Unknown weapon ability.';
    return;
  }
  const cooldownUntil = state.combat.abilityCooldowns[ability.id] ?? 0;
  if (cooldownUntil > state.clock) {
    state.ui.prompt = `${ability.label} is not ready.`;
    return;
  }
  const equipped = equippedWeapon(state);
  if (!ability.weaponClasses.includes(equipped.def.weaponClass ?? 'unarmed')) {
    state.ui.prompt = `${ability.label} does not fit your weapon.`;
    return;
  }
  const target = resolveEnemyTarget(state, entityId);
  if (!target) {
    state.ui.prompt = 'Select a hostile target.';
    return;
  }
  const dist = distance(state.player.position, target.position);
  const range = Math.max(ability.range, equipped.def.range ?? 1.5);
  if (dist > range) {
    state.ui.prompt = 'Move closer for that ability.';
    return;
  }
  const cost = adjustedStaminaCost(state, ability.staminaCost);
  if (state.player.stamina < cost) {
    state.ui.prompt = 'Not enough stamina.';
    return;
  }
  state.player.stamina = Math.max(0, state.player.stamina - cost);
  state.combat.abilityCooldowns[ability.id] = state.clock + ability.cooldown;
  state.combat.lastAttackAt = state.clock;
  setPlayerActionState(state, 'attacking', ability.cooldown < 1 ? 0.3 : 0.55, ability.id);

  const targets = ability.maxTargets > 1 ? nearbyEnemies(state, target, ability.range, ability.maxTargets) : [target];
  for (const enemy of targets) {
    const skillValue = getSkillValue(state, ability.skill);
    const stats = calculateDerivedStats(state);
    const base = Math.max(1, Math.round((stats.minDamage + stats.maxDamage + skillValue * 0.12) * 0.5 * ability.damageMultiplier - enemy.armor * 0.22));
    enemy.health = Math.max(0, enemy.health - base);
    state.combat.hitFlashes[enemy.id] = state.clock + 0.22;
    addFloatingText(state, `${ability.label} ${base}`, enemy.position, '#ffd968');
    attemptSkillUse(state, ability.skill, { verb: 'weapon-ability', difficulty: 20 + enemy.level * 4, success: true, targetId: enemy.id, relatedSkills: ['Tactics'] });
    if (ability.effect === 'stagger') enemy.attackTimer += 0.8;
    if (ability.effect === 'pin') enemy.pacifiedUntil = Math.max(enemy.pacifiedUntil, state.clock + 0.55);
    if (enemy.health <= 0) finishAbilityKill(state, enemy);
  }
  gainPlayerXp(state, 5);
  state.ui.prompt = `${ability.label}.`;
}

export function performDefensiveAction(state: GameState): void {
  const cost = adjustedStaminaCost(state, 6);
  if (state.player.stamina < cost) {
    state.ui.prompt = 'Too tired to defend.';
    return;
  }
  state.player.stamina = Math.max(0, state.player.stamina - cost);
  state.combat.defenseUntil = state.clock + 0.65;
  state.combat.riposteUntil = state.clock + 1.15;
  setPlayerActionState(state, 'moving', 0.3, 'defense');
  addFloatingText(state, 'Guard', state.player.position, '#8bd9ff');
  state.ui.prompt = 'Defensive stance.';
}

function equippedWeapon(state: GameState): { stack: ItemStack | null; def: ItemDef } {
  const stack = state.player.equipment.weapon ?? null;
  const def = stack ? itemDefs[stack.itemId] : undefined;
  return {
    stack,
    def:
      def?.weaponClass
        ? def
        : {
            id: 'unarmed',
            name: 'Unarmed',
            type: 'weapon',
            stackable: false,
            maxStack: 1,
            weight: 0,
            value: 0,
            icon: { shape: 'blade', primary: '#d8d4c7' },
            weaponClass: 'unarmed',
            baseDamageMin: 2,
            baseDamageMax: 5,
            range: 1.25
          }
  };
}

function resolveEnemyTarget(state: GameState, entityId?: string): EnemyEntity | null {
  const id = entityId ?? state.player.activeTargetId;
  const entity = id ? state.entities[id] : null;
  return entity?.kind === 'enemy' && entity.state !== 'dead' ? entity : null;
}

function nearbyEnemies(state: GameState, primary: EnemyEntity, radius: number, maxTargets: number): EnemyEntity[] {
  return Object.values(state.entities)
    .filter((entity): entity is EnemyEntity => entity.kind === 'enemy' && entity.area === state.player.currentArea && entity.state !== 'dead' && distance(entity.position, primary.position) <= radius)
    .slice(0, maxTargets);
}

function adjustedStaminaCost(state: GameState, base: number): number {
  const armorId = state.player.equipment.armor?.itemId ?? '';
  const shieldPenalty = state.player.equipment.shield ? 1 : 0;
  const armorPenalty = armorId.includes('iron') ? 2 : armorId.includes('leather') ? 0.5 : armorId.includes('robe') ? -1 : 0;
  return Math.max(1, base + armorPenalty + shieldPenalty);
}

function finishAbilityKill(state: GameState, enemy: EnemyEntity): void {
  enemy.state = 'dead';
  enemy.blocksMovement = false;
  enemy.health = 0;
  recordKill(state, enemy.name);
  gainPlayerXp(state, enemy.level * 18);
  addSystemMessage(state, `${enemy.name} defeated.`);
}

function distance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

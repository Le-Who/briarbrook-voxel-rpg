import { itemDefs } from '../data/items';
import type { EnemyEntity, GameState, TargetRef } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { calculateDerivedStats } from './EquipmentSystem';
import { getItemCount, removeItems } from './InventorySystem';
import { addFloatingText } from './LootSystem';
import { recordQuestEvent } from './QuestSystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';
import { refreshPlayerActionState, setPlayerActionState } from './ActionStateSystem';

export function startBandage(state: GameState, target: TargetRef = { kind: 'self' }): void {
  if (state.bandage) {
    state.ui.prompt = 'You are already applying a bandage.';
    return;
  }
  if (getItemCount(state.player.inventory, 'bandage') <= 0) {
    state.ui.prompt = 'You need a bandage.';
    return;
  }
  removeItems(state.player.inventory, 'bandage', 1);
  const duration = Math.max(2.4, 5.6 - state.player.attributes.Dexterity * 0.06 - getSkillValue(state, 'Healing') * 0.01);
  state.bandage = {
    target,
    startedAt: state.clock,
    duration,
    remaining: duration,
    interrupted: false
  };
  setPlayerActionState(state, 'interacting', duration, 'bandage');
  state.ui.prompt = 'Applying bandage...';
  addSystemMessage(state, 'You begin applying a bandage.');
}

export function updateBandage(state: GameState, dt: number): void {
  const bandage = state.bandage;
  if (!bandage) return;
  if (state.combat.lastDamagedAt > bandage.startedAt) bandage.interrupted = true;
  bandage.remaining = Math.max(0, bandage.remaining - dt);
  if (bandage.remaining > 0) return;
  state.bandage = null;
  refreshPlayerActionState(state);
  recordQuestEvent(state, { type: 'bandage' });

  const healing = getSkillValue(state, 'Healing');
  const anatomy = getSkillValue(state, 'Anatomy');
  const successChance = Math.max(0.25, Math.min(0.94, 0.48 + healing * 0.006 + anatomy * 0.002 - (bandage.interrupted ? 0.28 : 0)));
  const success = Math.random() < successChance;
  attemptSkillUse(state, 'Healing', { verb: 'bandage', difficulty: 22 + (bandage.interrupted ? 20 : 0), success, relatedSkills: ['Anatomy'] });
  if (!success) {
    state.ui.prompt = 'The bandage slips.';
    addFloatingText(state, 'Slip', state.player.position, '#d8d8d8');
    addSystemMessage(state, 'The bandage slips before it helps.');
    return;
  }
  const stats = calculateDerivedStats(state);
  const before = state.player.health;
  const amount = Math.round(14 + healing * 0.38 + anatomy * 0.16);
  state.player.health = Math.min(stats.maxHealth, state.player.health + amount);
  if (state.player.combatProfile.poison && healing >= 45) {
    state.player.combatProfile.poison = null;
    addSystemMessage(state, 'The bandage draws out the poison.');
  }
  addFloatingText(state, `+${Math.round(state.player.health - before)}`, state.player.position, '#55e676');
  state.ui.prompt = 'Bandage applied.';
}

export function applyPoisonToWeapon(state: GameState, potionSlot?: number): void {
  const weapon = state.player.equipment.weapon;
  const def = weapon ? itemDefs[weapon.itemId] : null;
  if (!weapon || !def?.weaponClass) {
    state.ui.prompt = 'Equip a weapon before applying poison.';
    return;
  }
  const eligible = ['fencing', 'sword', 'axe'].includes(def.weaponClass);
  if (!eligible) {
    state.ui.prompt = 'Poison will not hold on that weapon.';
    return;
  }
  const hasPotion = typeof potionSlot === 'number' ? state.player.inventory.slots[potionSlot]?.itemId === 'poison_potion' : getItemCount(state.player.inventory, 'poison_potion') > 0;
  if (!hasPotion) {
    state.ui.prompt = 'You need a poison potion.';
    return;
  }
  if (typeof potionSlot === 'number') {
    const stack = state.player.inventory.slots[potionSlot];
    if (stack) {
      stack.quantity -= 1;
      if (stack.quantity <= 0) state.player.inventory.slots[potionSlot] = null;
    }
  } else {
    removeItems(state.player.inventory, 'poison_potion', 1);
  }
  const poisoning = getSkillValue(state, 'Poisoning');
  const success = Math.random() < Math.max(0.35, Math.min(0.9, 0.48 + poisoning * 0.006));
  attemptSkillUse(state, 'Poisoning', { verb: 'apply-poison', difficulty: 28, success, itemId: weapon.itemId });
  if (!success) {
    state.ui.prompt = 'You spoil the poison while coating the blade.';
    addSystemMessage(state, state.ui.prompt);
    return;
  }
  weapon.poisonCharges = 3 + Math.floor(poisoning / 35);
  weapon.poisonPotency = 9 + Math.floor(poisoning / 8);
  state.ui.prompt = `${def.name} is coated with poison.`;
  addSystemMessage(state, state.ui.prompt);
}

export function attemptHide(state: GameState): void {
  const nearby = Object.values(state.entities).filter((entity) => entity.kind === 'enemy' && entity.area === state.player.currentArea && entity.state !== 'dead' && Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z) < 6).length;
  const hiding = getSkillValue(state, 'Hiding');
  const stealth = getSkillValue(state, 'Stealth');
  const difficulty = 20 + nearby * 14;
  const stealthModifier = state.world.time?.stealthModifier ?? 1;
  const success = Math.random() * 100 < Math.max(15, Math.min(94, (48 + hiding * 0.55 + stealth * 0.15 - nearby * 14) * stealthModifier));
  attemptSkillUse(state, 'Hiding', { verb: 'hide', difficulty, success, relatedSkills: ['Stealth'] });
  if (!success) {
    state.player.combatProfile.hidden = false;
    state.ui.prompt = 'You fail to hide.';
    addFloatingText(state, 'Revealed', state.player.position, '#d8d8d8');
    return;
  }
  state.player.combatProfile.hidden = true;
  state.player.combatProfile.hiddenUntil = state.clock + 18 + stealth * 0.1;
  state.player.targetPosition = null;
  state.player.movement.intent = null;
  state.player.movement.path = [];
  state.player.movement.waypoint = null;
  state.player.movement.velocity = { x: 0, z: 0 };
  setPlayerActionState(state, 'hidden', 0.35, 'hiding');
  state.ui.prompt = 'You melt into cover.';
  addFloatingText(state, 'Hidden', state.player.position, '#8bd9ff');
}

export function useBardSkill(state: GameState, skillId: 'Peacemaking' | 'Provocation' | 'Discordance', target: TargetRef = null): void {
  if (!hasInstrument(state)) {
    state.ui.prompt = 'You need an instrument.';
    return;
  }
  const cooldownUntil = state.player.combatProfile.bardCooldowns[skillId] ?? 0;
  if (cooldownUntil > state.clock) {
    state.ui.prompt = `${skillId} is not ready.`;
    return;
  }
  const enemy = resolveEnemyTarget(state, target);
  if (!enemy) {
    state.ui.targeting = { mode: 'skill', skillId, prompt: `Select an enemy for ${skillId}.` };
    state.ui.prompt = state.ui.targeting.prompt;
    return;
  }
  const musicianship = getSkillValue(state, 'Musicianship');
  const skill = getSkillValue(state, skillId);
  const difficulty = 20 + enemy.level * 7 + enemy.magicResist * 0.4;
  const musicOk = Math.random() * 100 < Math.max(30, Math.min(95, 50 + musicianship * 0.45 - enemy.level * 3));
  attemptSkillUse(state, 'Musicianship', { verb: 'play-instrument', difficulty, success: musicOk, targetId: enemy.id });
  const success = musicOk && Math.random() * 100 < Math.max(18, Math.min(90, 42 + skill * 0.62 - enemy.level * 5));
  attemptSkillUse(state, skillId, { verb: 'bard-control', difficulty, success, targetId: enemy.id, relatedSkills: ['Musicianship'] });
  state.player.combatProfile.bardCooldowns[skillId] = state.clock + 7;
  if (!success) {
    addFloatingText(state, 'Off-key', enemy.position, '#d8d8d8');
    state.ui.prompt = `${skillId} fails.`;
    return;
  }
  if (skillId === 'Peacemaking') {
    enemy.pacifiedUntil = state.clock + 7 + skill * 0.05;
    enemy.state = 'idle';
    addFloatingText(state, 'Calmed', enemy.position, '#8bd9ff');
  } else if (skillId === 'Discordance') {
    enemy.discordUntil = state.clock + 12;
    enemy.discordAmount = 3 + Math.floor(skill / 18);
    addFloatingText(state, 'Discord', enemy.position, '#b66dff');
  } else {
    const other = nearestOtherEnemy(state, enemy);
    if (other) {
      enemy.provokedTargetId = other.id;
      addFloatingText(state, 'Provoked', enemy.position, '#ffb966');
    } else {
      enemy.pacifiedUntil = state.clock + 3;
      addFloatingText(state, 'Distracted', enemy.position, '#ffb966');
    }
  }
  state.ui.prompt = `${skillId} succeeds.`;
  recordQuestEvent(state, { type: 'bard', skillId });
}

function hasInstrument(state: GameState): boolean {
  return ['lute', 'drum', 'harp'].some((itemId) => getItemCount(state.player.inventory, itemId) > 0 || Object.values(state.player.equipment).some((stack) => stack?.itemId === itemId));
}

function resolveEnemyTarget(state: GameState, target: TargetRef): EnemyEntity | null {
  const id = target?.kind === 'entity' ? target.entityId : state.player.activeTargetId;
  const entity = id ? state.entities[id] : null;
  return entity?.kind === 'enemy' && entity.state !== 'dead' ? entity : null;
}

function nearestOtherEnemy(state: GameState, source: EnemyEntity): EnemyEntity | null {
  let best: EnemyEntity | null = null;
  let bestDist = Infinity;
  for (const entity of Object.values(state.entities)) {
    if (entity.kind !== 'enemy' || entity.id === source.id || entity.area !== source.area || entity.state === 'dead') continue;
    const dist = Math.hypot(entity.position.x - source.position.x, entity.position.z - source.position.z);
    if (dist < bestDist) {
      best = entity;
      bestDist = dist;
    }
  }
  return bestDist < 8 ? best : null;
}

import { createId } from '../game/GameState';
import { itemDefs } from '../data/items';
import { combatRoleContracts, type CombatRoleId } from '../data/combatEncounters';
import { emitAudioHook } from '../audio/AudioHooks';
import type { CombatTelegraph, EnemyEntity, GameState, ItemDef, ItemStack, Projectile, Vec3 } from '../game/types';
import { AreaManager } from '../world/AreaManager';
import { handlePlayerDamaged, setPlayerActionState } from './ActionStateSystem';
import { addSystemMessage } from './ChatSystem';
import { calculateDerivedStats } from './EquipmentSystem';
import { degradeArmorFromHit, degradeEquippedItem, degradeItemStack, durabilityScale, isBroken } from './EconomySystem';
import { faceEntityFromDelta, faceEntityTowardPosition, facePlayerTowardEntity } from './FacingSystem';
import { addFloatingText, spawnLootFromEnemy } from './LootSystem';
import { recordKill } from './QuestSystem';
import { attemptSkillUse, gainPlayerXp, getSkillValue } from './SkillSystem';
import { removeItems } from './InventorySystem';
import { recordCombatEngagementStart, recordCombatTimeToKill, recordDamageDealt, recordDamageTaken, recordDeath, recordDurabilityLoss } from './TelemetrySystem';
import { pruneVisualEffects, queueBlockEffect, queueMissEffect, queueSpellRoleEffect, queueWeaponImpactEffect, queueWeaponSwingEffect } from './VfxSystem';

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function rollDamage(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function combatRole(enemy: EnemyEntity): CombatRoleId {
  return enemy.combatRole in combatRoleContracts ? (enemy.combatRole as CombatRoleId) : 'grunt';
}

function combatRoleTuning(enemy: EnemyEntity) {
  return combatRoleContracts[combatRole(enemy)];
}

function warningColorHex(role: CombatRoleId): string {
  const color = combatRoleContracts[role].warningColor;
  if (color === 'red') return '#ff4f3f';
  if (color === 'violet') return '#b66dff';
  return '#ffb966';
}

function angleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function yawToAttacker(target: EnemyEntity, attacker: Vec3): number {
  return Math.atan2(attacker.x - target.position.x, attacker.z - target.position.z);
}

function attackerInFront(target: EnemyEntity, attacker: Vec3): boolean {
  const facingYaw = target.facing?.facingYaw ?? 0;
  return Math.abs(angleDelta(facingYaw, yawToAttacker(target, attacker))) <= Math.PI * 0.42;
}

function hasActiveCastTelegraph(state: GameState, enemy: EnemyEntity): boolean {
  return state.combat.telegraphs.some((telegraph) => telegraph.sourceId === enemy.id && telegraph.kind === 'cast');
}

function interruptEnemyCast(state: GameState, enemy: EnemyEntity): boolean {
  if (!hasActiveCastTelegraph(state, enemy)) return false;
  state.combat.telegraphs = state.combat.telegraphs.filter((telegraph) => !(telegraph.sourceId === enemy.id && telegraph.kind === 'cast'));
  enemy.attackTimer = Math.max(enemy.attackTimer, enemy.attackCooldown * 0.55, 1);
  addFloatingText(state, 'Interrupted', enemy.position, '#bce6ff');
  queueSpellRoleEffect(state, 'fizzle', enemy.position, undefined, '#bce6ff');
  emitAudioHook('spell_fizzle', { id: enemy.id, area: enemy.area, position: enemy.position });
  return true;
}

function preferredRetreatTarget(enemy: EnemyEntity, playerPosition: Vec3): Vec3 {
  const dx = enemy.position.x - playerPosition.x;
  const dz = enemy.position.z - playerPosition.z;
  const len = Math.hypot(dx, dz) || 1;
  return {
    x: enemy.position.x + (dx / len) * 2,
    y: 0,
    z: enemy.position.z + (dz / len) * 2
  };
}

function shouldKeepDistance(enemy: EnemyEntity): boolean {
  return combatRoleTuning(enemy).preferredDistance > 2.25;
}

function equippedWeapon(state: GameState): { stack: ItemStack | null; def: ItemDef; skill: string; support: string } {
  const stack = state.player.equipment.weapon ?? null;
  const def = stack ? itemDefs[stack.itemId] : undefined;
  const fallback: ItemDef = {
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
    swingSpeed: 1.35,
    range: 1.25,
    staminaCost: 2,
    skillUsed: 'Wrestling',
    supportSkill: 'Tactics'
  };
  const weapon = def?.weaponClass ? def : fallback;
  return {
    stack,
    def: weapon,
    skill: weapon.skillUsed ?? (weapon.weaponClass === 'bow' || weapon.weaponClass === 'crossbow' ? 'Archery' : weapon.weaponClass === 'fencing' ? 'Fencing' : weapon.weaponClass === 'mace' || weapon.weaponClass === 'staff' ? 'Mace Fighting' : weapon.weaponClass === 'unarmed' ? 'Wrestling' : 'Swordsmanship'),
    support: weapon.supportSkill ?? 'Tactics'
  };
}

function rangedWeapon(state: GameState): { stack: ItemStack | null; def: ItemDef; skill: string; support: string } {
  const equipped = equippedWeapon(state);
  if (equipped.def.weaponClass === 'bow' || equipped.def.weaponClass === 'crossbow') return equipped;
  const inventoryStack = state.player.inventory.slots.find((slot) => {
    const def = slot ? itemDefs[slot.itemId] : null;
    return def?.weaponClass === 'bow' || def?.weaponClass === 'crossbow';
  }) ?? null;
  const def = inventoryStack ? itemDefs[inventoryStack.itemId] : itemDefs.simple_bow;
  return {
    stack: inventoryStack,
    def,
    skill: def.skillUsed ?? 'Archery',
    support: def.supportSkill ?? 'Tactics'
  };
}

export function weaponCooldown(state: GameState): number {
  const { def } = equippedWeapon(state);
  const stats = calculateDerivedStats(state);
  const maxStamina = Math.max(1, stats.maxStamina);
  const staminaRatio = Math.max(0, Math.min(1, state.player.stamina / maxStamina));
  const lowStaminaPenalty = staminaRatio < 0.35 ? 1.35 : staminaRatio < 0.65 ? 1.12 : 1;
  return Number(((def.swingSpeed ?? stats.attackSpeed) * lowStaminaPenalty).toFixed(2));
}

function defenderScore(target: EnemyEntity): number {
  const shieldLike = target.combatRole === 'guard' ? target.defenseSkill * 0.55 : 0;
  const parryLike = target.aiStyle === 'melee' ? target.defenseSkill * 0.45 : 0;
  return target.defenseSkill + parryLike + shieldLike + target.level * 2;
}

function hitChance(attackerSkill: number, defender: number, dexterity: number, rangePenalty = 0): number {
  return Math.max(18, Math.min(92, 62 + (attackerSkill - defender) * 0.42 + dexterity * 0.45 - rangePenalty));
}

function consumeStamina(state: GameState, cost: number): void {
  state.player.stamina = Math.max(0, state.player.stamina - cost);
}

function breakHidden(state: GameState, reason: string): void {
  if (!state.player.combatProfile.hidden) return;
  state.player.combatProfile.hidden = false;
  state.player.combatProfile.hiddenUntil = 0;
  addSystemMessage(state, `You reveal yourself by ${reason}.`);
}

function getTarget(state: GameState, entityId?: string): EnemyEntity | null {
  const id = entityId ?? state.player.activeTargetId;
  const entity = id ? state.entities[id] : null;
  if (!entity || entity.kind !== 'enemy' || entity.state === 'dead') return null;
  return entity;
}

export function meleeAttack(state: GameState, entityId?: string): void {
  const target = getTarget(state, entityId);
  if (!target) return;
  const { stack, def, skill, support } = equippedWeapon(state);
  if (isBroken(stack)) {
    state.ui.prompt = `${def.name} is broken and must be repaired.`;
    addSystemMessage(state, state.ui.prompt);
    return;
  }
  if (def.weaponClass === 'bow' || def.weaponClass === 'crossbow') {
    rangedAttack(state, entityId);
    return;
  }
  const weaponConditionScale = durabilityScale(stack);
  const dist = distance(state.player.position, target.position);
  const range = def.range ?? 1.45;
  if (dist > range) {
    state.ui.prompt = 'Move closer to strike.';
    return;
  }
  recordCombatEngagementStart(state, target.id);
  facePlayerTowardEntity(state, target.id, 'target', 0.5);
  setPlayerActionState(state, 'attacking', 0.38, target.id);
  queueWeaponSwingEffect(state, def.weaponClass, target.position);
  emitAudioHook('weapon_swing', { id: target.id, area: target.area, position: target.position });
  breakHidden(state, 'attacking');
  const stats = calculateDerivedStats(state);
  const staminaCost = def.staminaCost ?? 4;
  if (state.player.stamina < Math.max(1, staminaCost * 0.35)) {
    state.ui.prompt = 'Too exhausted to swing cleanly.';
    addFloatingText(state, 'Tired', state.player.position, '#bdb6a7');
    return;
  }
  consumeStamina(state, staminaCost);
  const weaponSkill = getSkillValue(state, skill);
  const chance = hitChance(weaponSkill, defenderScore(target), state.player.attributes.Dexterity);
  if (Math.random() * 100 > chance) {
    degradeEquippedItem(state, 'weapon', 1);
    addFloatingText(state, 'Miss', target.position, '#d8d8d8');
    queueMissEffect(state, target.position);
    attemptSkillUse(state, skill, { verb: 'melee-miss', difficulty: target.defenseSkill, success: false, targetId: target.id, relatedSkills: [support] });
    return;
  }
  if (enemyParries(state, target, weaponSkill)) {
    degradeEquippedItem(state, 'weapon', 1);
    return;
  }
  const crit = Math.random() * 100 < stats.critChance;
  const baseMin = def.baseDamageMin ?? stats.minDamage;
  const baseMax = def.baseDamageMax ?? stats.maxDamage;
  const tacticsMultiplier = 1 + getSkillValue(state, 'Tactics') / 180;
  const anatomyBonus = target.enemyType === 'Undead' ? 0 : getSkillValue(state, 'Anatomy') / 230;
  const strengthBonus = state.player.attributes.Strength * 0.14;
  const axeBonus = def.weaponClass === 'axe' ? getSkillValue(state, 'Lumberjacking') / 180 : 0;
  const discordPenalty = target.discordUntil > state.clock ? target.discordAmount : 0;
  const effectiveArmor = Math.max(0, target.armor - discordPenalty);
  const raw = (rollDamage(baseMin, baseMax) + strengthBonus + weaponSkill * 0.08) * (tacticsMultiplier + anatomyBonus + axeBonus) * weaponConditionScale;
  const damage = Math.max(1, Math.round((raw - effectiveArmor * 0.45) * (crit ? 1.65 : 1)));
  damageEnemyByWeapon(state, target, damage, stack);
  degradeEquippedItem(state, 'weapon', 1);
  state.combat.hitFlashes[target.id] = state.clock + 0.2;
  addFloatingText(state, `${damage}${crit ? '!' : ''}`, target.position, crit ? '#ffd968' : '#ff6262');
  queueWeaponImpactEffect(state, def.weaponClass, target.position, { crit, armor: target.armor });
  emitAudioHook('weapon_hit', { id: target.id, area: target.area, position: target.position, intensity: damage });
  emitAudioHook('hit', { id: target.id, area: target.area, position: target.position, intensity: damage });
  attemptSkillUse(state, skill, { verb: 'melee-hit', difficulty: 20 + target.level * 5, success: true, targetId: target.id, relatedSkills: [support, 'Anatomy'] });
  gainPlayerXp(state, 4);
  if (target.health <= 0) killEnemy(state, target);
}

export function rangedAttack(state: GameState, entityId?: string): void {
  const target = getTarget(state, entityId);
  if (!target) return;
  const { stack, def, skill, support } = rangedWeapon(state);
  if (isBroken(stack)) {
    state.ui.prompt = `${def.name} is broken and must be repaired.`;
    addSystemMessage(state, state.ui.prompt);
    return;
  }
  const weaponConditionScale = durabilityScale(stack);
  const dist = distance(state.player.position, target.position);
  const range = def.weaponClass === 'bow' || def.weaponClass === 'crossbow' ? (def.range ?? 8) : 8;
  if (dist > range) {
    state.ui.prompt = 'Target is out of bow range.';
    return;
  }
  recordCombatEngagementStart(state, target.id);
  facePlayerTowardEntity(state, target.id, 'target', 0.45);
  setPlayerActionState(state, 'attacking', 0.34, target.id);
  queueWeaponSwingEffect(state, 'bow', target.position);
  emitAudioHook('bow_draw', { id: target.id, area: target.area, position: state.player.position });
  if (def.requiredAmmo && !removeItems(state.player.inventory, def.requiredAmmo, 1)) {
    state.ui.prompt = `You need ${itemDefs[def.requiredAmmo]?.name ?? def.requiredAmmo}.`;
    addSystemMessage(state, state.ui.prompt);
    return;
  }
  breakHidden(state, 'shooting');
  consumeStamina(state, def.staminaCost ?? 4);
  const archery = getSkillValue(state, skill);
  const hit = hitChance(archery, defenderScore(target), state.player.attributes.Dexterity, dist * 2.1);
  launchProjectile(state, 'arrow', state.player.position, target.position, '#d9bf77');
  emitAudioHook('bow_release', { id: target.id, area: target.area, position: target.position });
  if (Math.random() * 100 > hit) {
    if (stack) {
      const before = stack.durability ?? stack.maxDurability ?? 0;
      const broke = degradeItemStack(stack, 1);
      recordDurabilityLoss(state, stack.itemId, before - (stack.durability ?? 0));
      if (broke) addSystemMessage(state, `${def.name} is broken and needs repair.`);
    }
    addFloatingText(state, 'Miss', target.position, '#d8d8d8');
    queueMissEffect(state, target.position);
    attemptSkillUse(state, skill, { verb: 'ranged-miss', difficulty: 18 + target.level * 5 + dist * 2, success: false, targetId: target.id, relatedSkills: [support] });
    return;
  }
  const tacticsMultiplier = 1 + getSkillValue(state, 'Tactics') / 220;
  const base = rollDamage(def.baseDamageMin ?? 5, def.baseDamageMax ?? 10);
  const damage = Math.max(1, Math.round((base + state.player.attributes.Dexterity * 0.26 + archery * 0.11) * tacticsMultiplier * weaponConditionScale - target.armor * 0.25));
  target.health = Math.max(0, target.health - damage);
  recordDamageDealt(state, 'ranged', damage);
  interruptEnemyCast(state, target);
  if (stack) {
    const before = stack.durability ?? stack.maxDurability ?? 0;
    const broke = degradeItemStack(stack, 1);
    recordDurabilityLoss(state, stack.itemId, before - (stack.durability ?? 0));
    if (broke) addSystemMessage(state, `${def.name} is broken and needs repair.`);
  }
  state.combat.hitFlashes[target.id] = state.clock + 0.2;
  addFloatingText(state, `${damage}`, target.position, '#ffb966');
  queueWeaponImpactEffect(state, def.weaponClass, target.position, { armor: target.armor });
  emitAudioHook('weapon_hit', { id: target.id, area: target.area, position: target.position, intensity: damage });
  emitAudioHook('hit', { id: target.id, area: target.area, position: target.position, intensity: damage });
  attemptSkillUse(state, skill, { verb: 'ranged-hit', difficulty: 18 + target.level * 5 + dist * 2, success: true, targetId: target.id, relatedSkills: [support, 'Anatomy'] });
  gainPlayerXp(state, 4);
  if (target.health <= 0) killEnemy(state, target);
}

export function updateProjectiles(state: GameState, dt: number): void {
  state.projectiles.forEach((projectile) => {
    projectile.age += dt;
  });
  state.projectiles = state.projectiles.filter((projectile) => projectile.age < projectile.duration);
  state.floatingTexts.forEach((text) => {
    text.age += dt;
    text.position.y += dt * 0.55;
  });
  state.floatingTexts = state.floatingTexts.filter((text) => text.age < text.lifetime);
  pruneVisualEffects(state);
}

export function updateEnemyCombat(state: GameState, areaManager: AreaManager, dt: number): void {
  updateCombatStatuses(state, dt);
  updateCombatTelegraphs(state, dt);
  if (state.player.downed.active) return;
  const stats = calculateDerivedStats(state);
  for (const entity of Object.values(state.entities)) {
    if (entity.kind !== 'enemy' || entity.area !== state.player.currentArea || entity.state === 'dead') continue;
    if (entity.pacifiedUntil > state.clock) {
      entity.state = 'idle';
      continue;
    }
    if (entity.provokedTargetId && updateProvokedEnemy(state, areaManager, entity, dt)) continue;
    const dist = distance(entity.position, state.player.position);
    const leashDist = distance(entity.position, entity.leashOrigin);
    entity.attackTimer = Math.max(0, entity.attackTimer - dt);
    entity.patrolTimer += dt;
    const visibility = state.world.time?.visibilityModifier ?? 1;
    const dangerModifier = state.world.time?.dangerModifier ?? 1;
    const effectiveAggroRadius = entity.aggroRadius * dangerModifier;
    const hiddenDetectionPenalty = state.player.combatProfile.hidden ? (getSkillValue(state, 'Hiding') * 0.04 + getSkillValue(state, 'Stealth') * 0.03) / Math.max(0.55, visibility) : 0;
    const canDetectHidden = !state.player.combatProfile.hidden || dist < Math.max(1.1, 3.2 - hiddenDetectionPenalty) || entity.aiStyle === 'mage';

    if (leashDist > 10.5) {
      entity.state = 'return';
    } else if ((canDetectHidden && dist <= effectiveAggroRadius) || entity.health < entity.maxHealth) {
      entity.state = dist <= entity.attackRange ? 'attack' : 'chase';
    } else if (entity.state !== 'patrol' && entity.state !== 'return') {
      entity.state = Math.sin(entity.patrolTimer) > 0.72 ? 'patrol' : 'idle';
    }

    if (tryEnemyRoleUtility(state, entity, dist)) continue;
    if (tryEnemyMageUtility(state, entity, dist)) continue;

    const tuning = combatRoleTuning(entity);
    if ((entity.state === 'attack' || entity.state === 'chase') && shouldKeepDistance(entity) && dist < tuning.preferredDistance * 0.72) {
      moveEnemyToward(state, areaManager, entity, preferredRetreatTarget(entity, state.player.position), dt, entity.combatRole === 'skirmisher' ? 2.35 : 1.85);
      continue;
    }

    if (entity.state === 'return') {
      moveEnemyToward(state, areaManager, entity, entity.leashOrigin, dt, 2.35);
      if (distance(entity.position, entity.leashOrigin) < 0.35) {
        entity.position = { ...entity.leashOrigin };
        entity.state = 'idle';
        entity.health = Math.min(entity.maxHealth, entity.health + 8);
      }
      continue;
    }

    if (entity.state === 'patrol') {
      const target = {
        x: entity.leashOrigin.x + Math.sin(entity.patrolTimer * 0.65) * 1.4,
        y: 0,
        z: entity.leashOrigin.z + Math.cos(entity.patrolTimer * 0.5) * 1.4
      };
      moveEnemyToward(state, areaManager, entity, target, dt, 0.75);
    }

    if (entity.state === 'chase') {
      const targetDistance = shouldKeepDistance(entity) ? Math.max(1.2, tuning.preferredDistance - 0.35) : 0;
      if (!targetDistance || dist > targetDistance) moveEnemyToward(state, areaManager, entity, state.player.position, dt, 2.1);
    }
    if (entity.state === 'attack' && entity.attackTimer <= 0) {
      entity.attackTimer = entity.attackCooldown;
      startEnemyTelegraph(state, entity);
    }
  }
}

function tryEnemyRoleUtility(state: GameState, enemy: EnemyEntity, dist: number): boolean {
  if (enemy.attackTimer > 0) return false;
  if (enemy.combatRole === 'support') return tryEnemySupportUtility(state, enemy, dist);
  if (enemy.combatRole === 'trapkeeper') return tryEnemyTrapkeeperUtility(state, enemy, dist);
  return false;
}

function tryEnemySupportUtility(state: GameState, enemy: EnemyEntity, dist: number): boolean {
  if (dist > enemy.aggroRadius + 2) return false;
  let target: EnemyEntity | null = null;
  let lowestRatio = 1;
  for (const entity of Object.values(state.entities)) {
    if (entity.kind !== 'enemy' || entity.id === enemy.id || entity.area !== enemy.area || entity.state === 'dead') continue;
    const allyDist = distance(enemy.position, entity.position);
    if (allyDist > 7) continue;
    const ratio = entity.health / Math.max(1, entity.maxHealth);
    if (ratio < lowestRatio && ratio < 0.72) {
      target = entity;
      lowestRatio = ratio;
    }
  }
  if (!target) return false;
  const amount = Math.min(target.maxHealth - target.health, 7 + enemy.level);
  if (amount <= 0) return false;
  target.health += amount;
  enemy.attackTimer = Math.max(enemy.attackCooldown, 2.4);
  faceEntityTowardPosition(enemy, target.position, 'cast', state.clock, 0.55);
  addFloatingText(state, `+${Math.round(amount)}`, target.position, '#55e676');
  queueSpellRoleEffect(state, 'heal', enemy.position, target.position, '#69e681');
  emitAudioHook('spell_impact', { id: enemy.id, area: enemy.area, position: target.position, intensity: 1 });
  return true;
}

function tryEnemyTrapkeeperUtility(state: GameState, enemy: EnemyEntity, dist: number): boolean {
  if (dist > enemy.aggroRadius + 1.5) return false;
  const existing = state.world.magicFields.some((field) => field.area === enemy.area && field.kind === 'trap' && field.remaining > 0 && distance(field.position, state.player.position) < 3.5);
  if (existing) return false;
  const dx = state.player.position.x - enemy.position.x;
  const dz = state.player.position.z - enemy.position.z;
  const len = Math.hypot(dx, dz) || 1;
  const step = Math.max(1.1, Math.min(2.5, dist * 0.45));
  const position = {
    x: Math.round(enemy.position.x + (dx / len) * step),
    y: 0,
    z: Math.round(enemy.position.z + (dz / len) * step)
  };
  state.world.magicFields.push({
    id: createId('enemy_trap'),
    kind: 'trap',
    area: enemy.area,
    position,
    createdAt: state.clock,
    remaining: 8,
    power: Math.min(7, 4 + Math.floor(enemy.level / 2))
  });
  enemy.attackTimer = Math.max(enemy.attackCooldown, 2.2);
  faceEntityTowardPosition(enemy, position, 'target', state.clock, 0.45);
  addFloatingText(state, 'Trap Set', position, '#ffb966');
  emitAudioHook('danger_warning', { id: enemy.id, area: enemy.area, position });
  return true;
}

function tryEnemyMageUtility(state: GameState, enemy: EnemyEntity, dist: number): boolean {
  if (enemy.aiStyle !== 'mage' || enemy.attackTimer > 0) return false;
  const inCastingAwareness = dist <= enemy.aggroRadius + 2;
  if (state.player.combatProfile.hidden && inCastingAwareness) {
    state.player.combatProfile.hidden = false;
    state.player.combatProfile.hiddenUntil = 0;
    enemy.attackTimer = Math.max(1.2, enemy.attackCooldown * 0.7);
    addFloatingText(state, 'Reveal', enemy.position, '#ffe98d');
    addSystemMessage(state, `${enemy.name} reveals hidden movement nearby.`);
    return true;
  }
  if (enemy.health <= enemy.maxHealth * 0.35 && inCastingAwareness) {
    const amount = Math.min(enemy.maxHealth - enemy.health, 8 + enemy.level * 2);
    if (amount <= 0) return false;
    enemy.health += amount;
    enemy.attackTimer = Math.max(1.4, enemy.attackCooldown * 0.85);
    addFloatingText(state, `+${Math.round(amount)}`, enemy.position, '#55e676');
    return true;
  }
  return false;
}

function enemyParries(state: GameState, target: EnemyEntity, attackerSkill: number): boolean {
  if (target.aiStyle !== 'melee' || target.enemyType === 'Beast') return false;
  const isShieldGuard = target.combatRole === 'guard';
  if (isShieldGuard && !attackerInFront(target, state.player.position)) return false;
  const chance = isShieldGuard ? Math.max(45, Math.min(82, 36 + (target.defenseSkill - attackerSkill) * 0.16 + target.level * 2)) : Math.max(3, Math.min(22, 4 + (target.defenseSkill - attackerSkill) * 0.12 + target.level));
  if (Math.random() * 100 > chance) return false;
  addFloatingText(state, isShieldGuard ? 'Shielded' : 'Blocked', target.position, '#8bd9ff');
  state.combat.hitFlashes[target.id] = state.clock + 0.1;
  queueBlockEffect(state, target.position, target.facing?.facingYaw);
  emitAudioHook('weapon_block', { id: target.id, area: target.area, position: target.position });
  emitAudioHook('block', { id: target.id, area: target.area, position: target.position });
  return true;
}

function playerParries(state: GameState, enemy: EnemyEntity): boolean {
  const shield = state.player.equipment.shield;
  if (!shield) {
    attemptSkillUse(state, 'Parrying', { verb: 'parry-no-shield', difficulty: 18 + enemy.level * 5, success: false, targetId: enemy.id, relatedSkills: ['Focus'] });
    return false;
  }
  const parry = getSkillValue(state, 'Parrying');
  const chance = Math.max(8, Math.min(52, 18 + parry * 0.45 + state.player.attributes.Dexterity * 0.15 - enemy.weaponSkill * 0.08));
  const success = Math.random() * 100 < chance;
  attemptSkillUse(state, 'Parrying', { verb: 'parry', difficulty: 18 + enemy.level * 5, success, targetId: enemy.id, relatedSkills: ['Focus'] });
  if (!success) return false;
  const before = shield.durability ?? itemDefs[shield.itemId]?.durability ?? 20;
  shield.durability = Math.max(0, (shield.durability ?? itemDefs[shield.itemId]?.durability ?? 20) - 1);
  recordDurabilityLoss(state, shield.itemId, before - shield.durability);
  addFloatingText(state, 'Block', state.player.position, '#8bd9ff');
  queueBlockEffect(state, state.player.position, state.player.facing.facingYaw);
  addSystemMessage(state, `You block with ${itemDefs[shield.itemId]?.name ?? 'shield'}.`);
  emitAudioHook('weapon_block', { id: enemy.id, area: enemy.area, position: state.player.position });
  emitAudioHook('parry', { id: enemy.id, area: enemy.area, position: state.player.position });
  return true;
}

function startEnemyTelegraph(state: GameState, enemy: EnemyEntity): void {
  if (state.combat.telegraphs.some((telegraph) => telegraph.sourceId === enemy.id)) return;
  faceEntityTowardPosition(enemy, state.player.position, 'target', state.clock, 0.6);
  const role = combatRole(enemy);
  const roleTuning = combatRoleContracts[role];
  const kind: CombatTelegraph['kind'] = roleTuning.telegraphKind;
  const duration = roleTuning.windupSeconds;
  state.combat.telegraphs.push({
    id: createId('telegraph'),
    sourceId: enemy.id,
    kind,
    area: enemy.area,
    origin: { ...enemy.position },
    targetPosition: { ...state.player.position },
    startedAt: state.clock,
    duration,
    remaining: duration,
    radius: enemy.aiStyle === 'archer' || enemy.aiStyle === 'mage' ? enemy.attackRange : Math.max(1.15, enemy.attackRange + 0.35),
    color: warningColorHex(role)
  });
  emitAudioHook('danger_warning', { id: enemy.id, area: enemy.area, position: enemy.position });
  addFloatingText(state, kind === 'cast' ? 'Casting' : kind === 'shot' ? 'Aiming' : 'Wind-up', enemy.position, kind === 'cast' ? '#b66dff' : '#ffb966');
}

function updateCombatTelegraphs(state: GameState, dt: number): void {
  const resolved: CombatTelegraph[] = [];
  for (const telegraph of state.combat.telegraphs) {
    telegraph.remaining -= dt;
    if (telegraph.remaining <= 0) resolved.push(telegraph);
  }
  state.combat.telegraphs = state.combat.telegraphs.filter((telegraph) => telegraph.remaining > 0);
  resolved.forEach((telegraph) => resolveTelegraph(state, telegraph));
}

function resolveTelegraph(state: GameState, telegraph: CombatTelegraph): void {
  if (state.player.downed.active) return;
  const enemy = state.entities[telegraph.sourceId];
  if (!enemy || enemy.kind !== 'enemy' || enemy.state === 'dead' || enemy.area !== state.player.currentArea) return;
  const stats = calculateDerivedStats(state);
  const dist = distance(enemy.position, state.player.position);
  if (dist > telegraph.radius + 0.35) {
    addFloatingText(state, 'Evade', state.player.position, '#8bd9ff');
    queueMissEffect(state, state.player.position, true);
    attemptSkillUse(state, 'Wrestling', { verb: 'dodge', difficulty: 18 + enemy.level * 5, success: true, targetId: enemy.id, relatedSkills: ['Focus'] });
    return;
  }
  if (telegraph.kind === 'shot') launchProjectile(state, 'arrow', enemy.position, state.player.position, '#d9bf77');
  if (telegraph.kind === 'cast') launchProjectile(state, 'magic_arrow', enemy.position, state.player.position, '#b66dff');
  const defended = state.combat.defenseUntil >= state.clock;
  if (defended) {
    addFloatingText(state, 'Guard', state.player.position, '#8bd9ff');
    queueBlockEffect(state, state.player.position, state.player.facing.facingYaw);
    attemptSkillUse(state, 'Parrying', { verb: 'guard', difficulty: 18 + enemy.level * 5, success: true, targetId: enemy.id, relatedSkills: ['Focus'] });
  }
  const discord = enemy.discordUntil > state.clock ? enemy.discordAmount : 0;
  const raw = rollDamage(enemy.damage[0], enemy.damage[1]) - discord;
  const magicHit = enemy.aiStyle === 'mage';
  const mitigation = magicHit ? stats.magicResist * 0.1 : stats.armor * 0.08;
  const defenseMultiplier = defended ? 0.38 : Math.hypot(state.player.movement.velocity.x, state.player.movement.velocity.z) > 2.8 ? 0.68 : 1;
  const damage = Math.max(1, Math.round((raw - mitigation) * defenseMultiplier));
  state.player.health = Math.max(0, state.player.health - damage);
  recordDamageTaken(state, damage);
  degradeArmorFromHit(state, magicHit ? 1 : 2);
  state.combat.lastDamagedAt = state.clock;
  state.combat.hitFlashes.player = state.clock + 0.18;
  handlePlayerDamaged(state, damage);
  addFloatingText(state, magicHit ? `${damage} spell` : `${damage}`, state.player.position, magicHit ? '#b66dff' : '#ff3f3f');
  if (magicHit) queueSpellRoleEffect(state, 'debuff', state.player.position, enemy.position, '#b66dff');
  else queueWeaponImpactEffect(state, enemy.combatRole === 'brute' ? 'mace' : 'sword', state.player.position, { armor: stats.armor });
  emitAudioHook('hit', { id: enemy.id, area: enemy.area, position: state.player.position, intensity: damage });
  attemptSkillUse(state, magicHit ? 'Resisting Spells' : 'Parrying', { verb: magicHit ? 'resist-spell' : 'take-damage', difficulty: 18 + enemy.level * 5, success: defended, targetId: enemy.id, relatedSkills: ['Focus'] });
  if (state.player.health <= 0) downPlayer(state);
}

function damageEnemyByWeapon(state: GameState, target: EnemyEntity, damage: number, weaponStack: ItemStack | null): void {
  target.health = Math.max(0, target.health - damage);
  recordDamageDealt(state, 'melee', damage);
  interruptEnemyCast(state, target);
  if (!weaponStack || !weaponStack.poisonCharges || !weaponStack.poisonPotency) return;
  weaponStack.poisonCharges -= 1;
  const resist = target.poisonResist + (target.enemyType === 'Undead' ? 30 : 0);
  if (Math.random() * 100 < resist) {
    addFloatingText(state, 'Resist Poison', target.position, '#bce6ff');
    return;
  }
  target.poison = {
    sourceId: 'player',
    potency: weaponStack.poisonPotency,
    tickTimer: 2,
    remaining: 10 + Math.floor(getSkillValue(state, 'Poisoning') / 12)
  };
  addFloatingText(state, 'Poisoned', target.position, '#66d45f');
  addSystemMessage(state, `${target.name} is poisoned.`);
}

function updateCombatStatuses(state: GameState, dt: number): void {
  if (state.player.combatProfile.hidden && state.clock > state.player.combatProfile.hiddenUntil) {
    state.player.combatProfile.hidden = false;
    addSystemMessage(state, 'You are no longer hidden.');
  }
  const playerPoison = state.player.combatProfile.poison;
  if (playerPoison) {
    playerPoison.remaining -= dt;
    playerPoison.tickTimer -= dt;
    if (playerPoison.tickTimer <= 0) {
      playerPoison.tickTimer = 2.2;
      const amount = Math.max(1, Math.round(playerPoison.potency * 0.45));
      state.player.health = Math.max(0, state.player.health - amount);
      recordDamageTaken(state, amount);
      state.combat.lastDamagedAt = state.clock;
      handlePlayerDamaged(state, amount);
      addFloatingText(state, `Poison ${amount}`, state.player.position, '#66d45f');
      if (state.player.health <= 0) downPlayer(state);
    }
    if (playerPoison.remaining <= 0) state.player.combatProfile.poison = null;
  }
  for (const entity of Object.values(state.entities)) {
    if (entity.kind !== 'enemy' || !entity.poison || entity.state === 'dead') continue;
    entity.poison.remaining -= dt;
    entity.poison.tickTimer -= dt;
    if (entity.poison.tickTimer <= 0) {
      entity.poison.tickTimer = 2;
      const amount = Math.max(1, Math.round(entity.poison.potency * 0.5));
      entity.health = Math.max(0, entity.health - amount);
      recordDamageDealt(state, 'poison', amount);
      addFloatingText(state, `Poison ${amount}`, entity.position, '#66d45f');
      state.combat.hitFlashes[entity.id] = state.clock + 0.18;
      if (entity.health <= 0) killEnemy(state, entity);
    }
    if (entity.poison.remaining <= 0) entity.poison = null;
  }
}

function updateProvokedEnemy(state: GameState, areaManager: AreaManager, enemy: EnemyEntity, dt: number): boolean {
  const target = enemy.provokedTargetId ? state.entities[enemy.provokedTargetId] : null;
  if (!target || target.kind !== 'enemy' || target.state === 'dead' || target.area !== enemy.area) {
    enemy.provokedTargetId = null;
    return false;
  }
  enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
  const dist = distance(enemy.position, target.position);
  if (dist > enemy.attackRange) {
    moveEnemyToward(state, areaManager, enemy, target.position, dt, 1.8);
  } else if (enemy.attackTimer <= 0) {
    faceEntityTowardPosition(enemy, target.position, 'target', state.clock, 0.45);
    enemy.attackTimer = enemy.attackCooldown;
    const damage = Math.max(1, rollDamage(enemy.damage[0], enemy.damage[1]) - Math.round(target.armor * 0.2));
    target.health = Math.max(0, target.health - damage);
    addFloatingText(state, `${damage}`, target.position, '#ffb966');
    if (target.health <= 0) killEnemy(state, target);
  }
  return true;
}

function moveEnemyToward(state: GameState, areaManager: AreaManager, enemy: EnemyEntity, target: Vec3, dt: number, speed: number): void {
  const dx = target.x - enemy.position.x;
  const dz = target.z - enemy.position.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = enemy.position.x + (dx / len) * dt * speed;
  const nz = enemy.position.z + (dz / len) * dt * speed;
  const step = chooseEnemyStep(state, areaManager, enemy, nx, nz, dx, dz, len, dt, speed);
  if (step) {
    faceEntityFromDelta(enemy, step.x - enemy.position.x, step.z - enemy.position.z, 'movement', state.clock);
    enemy.position.x = step.x;
    enemy.position.z = step.z;
  }
}

function chooseEnemyStep(state: GameState, areaManager: AreaManager, enemy: EnemyEntity, nx: number, nz: number, dx: number, dz: number, len: number, dt: number, speed: number): { x: number; z: number } | null {
  const candidates = [
    { x: nx, z: nz },
    { x: enemy.position.x + (-dz / len) * dt * speed, z: enemy.position.z + (dx / len) * dt * speed },
    { x: enemy.position.x + (dz / len) * dt * speed, z: enemy.position.z + (-dx / len) * dt * speed }
  ];
  return candidates.find((candidate) => !areaManager.isBlocked(state, candidate.x, candidate.z, enemy.id) && !isHazardStep(state, enemy, candidate.x, candidate.z)) ?? null;
}

function isHazardStep(state: GameState, enemy: EnemyEntity, x: number, z: number): boolean {
  return state.world.magicFields.some((field) => field.area === enemy.area && field.kind === 'trap' && field.remaining > 0 && Math.hypot(field.position.x - x, field.position.z - z) < 0.85);
}

function launchProjectile(state: GameState, kind: Projectile['kind'], from: Vec3, to: Vec3, color: string): void {
  state.projectiles.push({
    id: createId('projectile'),
    kind,
    from: { x: from.x, y: from.y + 1.1, z: from.z },
    to: { x: to.x, y: to.y + 1.1, z: to.z },
    age: 0,
    duration: 0.35,
    color
  });
}

function killEnemy(state: GameState, enemy: EnemyEntity): void {
  recordCombatTimeToKill(state, enemy.id);
  enemy.state = 'dead';
  enemy.blocksMovement = false;
  enemy.health = 0;
  addFloatingText(state, 'Loot', enemy.position, '#f6df8b');
  addSystemMessage(state, `${enemy.name} defeated.`);
  recordKill(state, enemy.name);
  gainPlayerXp(state, enemy.level * 18);
  spawnLootFromEnemy(state, enemy);
}

function downPlayer(state: GameState): void {
  if (state.player.downed.active) return;
  recordDeath(state);
  state.player.downed = {
    active: true,
    since: state.clock,
    respawnAt: state.clock + 4
  };
  state.player.health = 0;
  state.player.targetPosition = null;
  state.player.movement.velocity = { x: 0, z: 0 };
  state.player.movement.intent = null;
  state.player.movement.path = [];
  state.player.movement.waypoint = null;
  state.spellCasting = null;
  state.gathering = null;
  addSystemMessage(state, 'You are downed. Respawn at a safe shrine when ready.');
  addFloatingText(state, 'Downed', state.player.position, '#ff6262');
}

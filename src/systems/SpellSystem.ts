import { areas } from '../data/areas';
import { emitAudioHook } from '../audio/AudioHooks';
import { text } from '../content/Strings';
import { itemDefs } from '../data/items';
import { spellDefs, type SpellDefinition } from '../data/spells';
import { createId } from '../game/GameState';
import type { EnemyEntity, GameState, SpellEffectState, TargetRef, Vec3 } from '../game/types';
import { actionSucceeded, invalidAction } from './ActionFeedbackSystem';
import { refreshPlayerActionState, setPlayerActionState } from './ActionStateSystem';
import { addSystemMessage } from './ChatSystem';
import { dispelContainerBarrier, revealMagicalContainers, unlockContainerWithSpell } from './ContainerSystem';
import { calculateDerivedStats } from './EquipmentSystem';
import { facePlayerTowardTarget } from './FacingSystem';
import { addItem, hasItems, removeItems } from './InventorySystem';
import { addFloatingText, pickupLoot, spawnLootFromEnemy } from './LootSystem';
import { recordKill, recordQuestEvent } from './QuestSystem';
import { attemptSkillUse, gainPlayerXp, getSkillValue } from './SkillSystem';
import { recordCombatEngagementStart, recordCombatTimeToKill, recordDamageDealt, recordItemConsumed } from './TelemetrySystem';
import { triggerTrapWithTelekinesis } from './TreasureSystem';
import { queueSpellRoleEffect } from './VfxSystem';
import { revealSubtleMarksNear } from './SecretSystem';

export function castSpellIntent(state: GameState, spellId: string, target: TargetRef = null): void {
  const spell = spellDefs[spellId];
  if (!spell) {
    invalidAction(state, text('error.unknownSpell'), undefined, { position: state.player.position });
    return;
  }
  if (state.spellCasting) {
    invalidAction(state, text('error.alreadyCasting'), undefined, { position: state.player.position });
    return;
  }
  state.ui.selectedSpellId = spellId;
  if (!state.player.spellbook.knownSpellIds.includes(spellId)) {
    invalidAction(state, text('error.spellNotKnown', { spell: spell.displayName }), undefined, { position: state.player.position });
    return;
  }
  if (getSkillValue(state, 'Magery') < spell.minSkill) {
    invalidAction(state, text('error.mageryTooLow', { spell: spell.displayName, required: spell.minSkill.toFixed(1) }), undefined, { position: state.player.position });
    return;
  }
  if (state.player.mana < spell.manaCost) {
    invalidAction(state, text('error.notEnoughMana', { spell: spell.displayName, mana: spell.manaCost }), undefined, { position: state.player.position });
    return;
  }
  if (!hasItems(state.player.inventory, spell.reagents)) {
    const missingReagents = spell.reagents.filter((req) => !hasItems(state.player.inventory, [req]));
    const missing = missingReagents
      .map((req) => itemDefs[req.itemId]?.name ?? req.itemId)
      .join(', ');
    invalidAction(state, text('error.missingReagents', { count: missingReagents.length, reagents: missing }), undefined, { position: state.player.position });
    return;
  }
  const worldReason = spellWorldPreflightReason(state, spell);
  if (worldReason) {
    invalidAction(state, worldReason, undefined, { position: state.player.position });
    return;
  }
  const resolved = resolveSpellTarget(state, spell, target);
  if (resolved === 'needs-target') {
    state.ui.targeting = {
      mode: 'spell',
      spellId,
      prompt: spell.targetType === 'tile' ? text('prompt.selectSpellTile', { spell: spell.displayName }) : text('prompt.selectSpellTarget', { spell: spell.displayName })
    };
    state.ui.prompt = state.ui.targeting.prompt;
    return;
  }
  if (resolved === null) return;
  if (state.player.combatProfile.hidden) {
    state.player.combatProfile.hidden = false;
    state.player.combatProfile.hiddenUntil = 0;
    addSystemMessage(state, 'You reveal yourself by casting.');
  }
  facePlayerTowardTarget(state, resolved, 'cast', spell.castTime + 0.25);
  state.player.mana = Math.max(0, state.player.mana - spell.manaCost);
  spell.reagents.forEach((req) => {
    removeItems(state.player.inventory, req.itemId, req.quantity);
    recordItemConsumed(state, req.itemId, req.quantity);
  });
  state.spellCasting = {
    id: createId('cast'),
    spellId,
    target: resolved,
    remaining: spell.castTime,
    total: spell.castTime
  };
  setPlayerActionState(state, 'casting', spell.castTime, spell.id);
  state.ui.prompt = spell.wordsOfPower ? `${spell.wordsOfPower}...` : `Casting ${spell.displayName}...`;
  emitAudioHook('spell_cast', { id: spell.id, area: state.player.currentArea, position: state.player.position, intensity: spell.circle });
}

export function updateSpellCasting(state: GameState, dt: number): void {
  updateSpellEffects(state, dt);
  if (!state.spellCasting) return;
  state.spellCasting.remaining = Math.max(0, state.spellCasting.remaining - dt);
  if (state.spellCasting.remaining > 0) return;
  const casting = state.spellCasting;
  state.spellCasting = null;
  const spell = spellDefs[casting.spellId];
  if (!spell) return;
  facePlayerTowardTarget(state, casting.target, 'cast', 0.2);
  completeSpell(state, spell, casting.target);
  refreshPlayerActionState(state);
}

export function meditate(state: GameState): void {
  const restored = 8 + Math.floor(getSkillValue(state, 'Meditation') / 12);
  const stats = calculateDerivedStats(state);
  state.player.mana = Math.min(stats.maxMana, state.player.mana + restored);
  attemptSkillUse(state, 'Meditation', { verb: 'meditate', difficulty: 20, success: true, relatedSkills: ['Focus'] });
  actionSucceeded(state, `+${restored} Mana`, { position: state.player.position, floatText: `+${restored} Mana`, color: '#58b7ff' });
  state.spellEffects.push({ id: createId('effect'), type: 'meditation', remaining: 5, amount: restored });
  setPlayerActionState(state, 'interacting', 0.4, 'meditation');
  recordQuestEvent(state, { type: 'meditate' });
}

function completeSpell(state: GameState, spell: SpellDefinition, target: TargetRef): void {
  const magery = getSkillValue(state, 'Magery');
  const successChance = Math.max(0.08, Math.min(0.95, 0.52 + (magery - spell.difficulty) * 0.012));
  const success = Math.random() < successChance;
  attemptSkillUse(state, 'Magery', {
    verb: 'cast-spell',
    difficulty: spell.difficulty,
    success,
    targetId: target?.kind === 'entity' ? target.entityId : undefined,
    relatedSkills: offensive(spell) ? ['Evaluating Intelligence', 'Meditation', 'Resisting Spells'] : ['Meditation', 'Resisting Spells']
  });
  if (!success) {
    invalidAction(state, `${spell.displayName} fizzles.`, 'Try again with higher Magery or better focus.', { position: state.player.position, floatText: 'Fizzle', color: '#bce6ff' });
    queueSpellRoleEffect(state, 'fizzle', state.player.position, undefined, '#bce6ff');
    emitAudioHook('spell_fizzle', { id: spell.id, area: state.player.currentArea, position: state.player.position, intensity: spell.circle });
    return;
  }
  recordQuestEvent(state, { type: 'cast', spellId: spell.id });
  applySpellEffect(state, spell, target);
  emitAudioHook('spell_impact', { id: spell.id, area: state.player.currentArea, position: spellVisualTargetPosition(state, target, target?.kind === 'entity' ? state.entities[target.entityId] : null), intensity: spell.circle });
}

function applySpellEffect(state: GameState, spell: SpellDefinition, target: TargetRef): void {
  const targetEntity = target?.kind === 'entity' ? state.entities[target.entityId] : null;
  const visualTarget = spellVisualTargetPosition(state, target, targetEntity);
  const visualRole = spellVisualRole(spell);
  queueSpellRoleEffect(state, visualRole, visualRole === 'utility' ? state.player.position : visualTarget, visualRole === 'utility' ? visualTarget : undefined, spell.projectileColor ?? spellVisualColor(visualRole));
  const evalInt = getSkillValue(state, 'Evaluating Intelligence');
  if (spell.effectType === 'damage' && targetEntity?.kind === 'enemy') {
    const resisted = Math.random() * 100 < targetEntity.armor * 0.4;
    const amount = Math.max(2, Math.round(spell.power + state.player.attributes.Intelligence * 0.45 + evalInt * 0.16 - (resisted ? targetEntity.armor * 0.4 : 0)));
    damageEnemy(state, targetEntity, amount, spell.projectileKind ?? 'magic_arrow', spell.projectileColor ?? '#bde7ff');
    state.ui.prompt = `${spell.displayName} hits for ${amount}.`;
    return;
  }
  if (spell.effectType === 'heal') {
    const amount = Math.round(spell.power + state.player.attributes.Intelligence * 0.35 + getSkillValue(state, 'Healing') * 0.08);
    const before = state.player.health;
    state.player.health = Math.min(75 + state.player.attributes.Constitution * 2.5, state.player.health + amount);
    addFloatingText(state, `+${Math.round(state.player.health - before)}`, state.player.position, '#55e676');
    state.projectiles.push({ id: createId('projectile'), kind: 'heal', from: state.player.position, to: state.player.position, age: 0, duration: 0.5, color: '#69e681' });
    state.ui.prompt = `${spell.displayName} restores health.`;
    return;
  }
  if (spell.effectType === 'create_food') {
    addItem(state.player.inventory, 'fresh_bread', spell.power);
    addFloatingText(state, `+${spell.power} Fresh Bread`, state.player.position, '#f0c957');
    state.ui.prompt = 'Food appears in your pack.';
    return;
  }
  if (spell.effectType === 'night_sight') {
    addEffect(state, { type: 'night_sight', remaining: 60, amount: 1 });
    const subtleMarks = revealSubtleMarksNear(state, state.player.position, 5);
    addFloatingText(state, 'Night Sight', state.player.position, '#ffe98d');
    state.ui.prompt = subtleMarks ? 'Your sight brightens and catches subtle marks.' : 'Your sight brightens.';
    return;
  }
  if (spell.effectType === 'detect_magic') {
    addEffect(state, { type: 'detect_magic', remaining: spell.power, amount: 1 });
    const fieldCount = state.world.magicFields.filter((field) => field.area === state.player.currentArea).length;
    const containerAuras = revealMagicalContainers(state, 'detect_magic');
    const auraCount = fieldCount + containerAuras;
    addFloatingText(state, auraCount ? `${auraCount} aura${auraCount === 1 ? '' : 's'}` : 'No auras', state.player.position, '#6fd4ff');
    state.ui.prompt = auraCount ? 'Magical auras shimmer nearby.' : 'No active magic nearby.';
    return;
  }
  if (spell.effectType === 'reveal') {
    state.player.combatProfile.hidden = false;
    state.player.combatProfile.hiddenUntil = 0;
    const revealed = revealMagicalContainers(state, 'reveal');
    addEffect(state, { type: 'reveal', remaining: 8, amount: spell.power });
    addFloatingText(state, revealed ? `Reveal ${revealed}` : 'Reveal', state.player.position, '#ffe98d');
    state.ui.prompt = revealed ? 'Hidden caches and traps are revealed.' : 'Hidden presences are revealed.';
    return;
  }
  if (spell.effectType === 'water_walk') {
    addEffect(state, { type: 'water_walk', remaining: spell.power, amount: 1 });
    state.world.magicFields.push({
      id: createId('field'),
      kind: 'bridge',
      area: state.player.currentArea,
      position: { ...state.player.position },
      createdAt: state.clock,
      remaining: spell.power,
      power: 1
    });
    addFloatingText(state, 'Water Walk', state.player.position, '#9ad8ff');
    state.ui.prompt = 'A thin bridge of force forms underfoot.';
    return;
  }
  if (spell.effectType === 'cure') {
    state.spellEffects = state.spellEffects.filter((effect) => effect.type !== 'poison' || effect.targetId !== 'player');
    state.player.combatProfile.poison = null;
    addFloatingText(state, 'Cured', state.player.position, '#d7f5d7');
    state.ui.prompt = 'Poison is purged.';
    return;
  }
  if (spell.effectType === 'protection') {
    addEffect(state, { type: 'protection', remaining: 40, amount: spell.power });
    addFloatingText(state, 'Protection', state.player.position, '#9bbdff');
    state.ui.prompt = 'Protective magic settles around you.';
    return;
  }
  if (spell.effectType === 'strength') {
    addEffect(state, { type: 'strength', remaining: 45, amount: spell.power });
    state.player.stamina += spell.power;
    addFloatingText(state, 'Strength', state.player.position, '#ffd968');
    state.ui.prompt = 'Strength surges through you.';
    return;
  }
  if ((spell.effectType === 'debuff' || spell.effectType === 'poison') && targetEntity?.kind === 'enemy') {
    const amount = spell.effectType === 'poison' ? spell.power : Math.max(1, spell.power + Math.floor(evalInt / 20));
    recordCombatEngagementStart(state, targetEntity.id);
    targetEntity.health = Math.max(0, targetEntity.health - amount);
    recordDamageDealt(state, spell.effectType, amount);
    state.combat.hitFlashes[targetEntity.id] = state.clock + 0.25;
    addFloatingText(state, spell.effectType === 'poison' ? `Poison ${amount}` : `Weakened`, targetEntity.position, spell.effectType === 'poison' ? '#66d45f' : '#b66dff');
    state.projectiles.push({
      id: createId('projectile'),
      kind: spell.effectType === 'poison' ? 'poison' : 'magic_arrow',
      from: { ...state.player.position, y: state.player.position.y + 1 },
      to: { ...targetEntity.position, y: targetEntity.position.y + 1 },
      age: 0,
      duration: 0.35,
      color: spell.effectType === 'poison' ? '#66d45f' : '#b66dff'
    });
    state.ui.prompt = `${spell.displayName} takes hold.`;
    if (targetEntity.health <= 0) finishEnemyKill(state, targetEntity);
    return;
  }
  if (spell.effectType === 'telekinesis' && target?.kind === 'entity') {
    if (triggerTrapWithTelekinesis(state, target)) return;
    const entity = state.entities[target.entityId];
    if (entity?.kind === 'loot') pickupLoot(state, entity.id);
    state.ui.prompt = 'Telekinesis reaches out.';
    return;
  }
  if (spell.effectType === 'magic_lock') {
    if (magicLockTarget(state, target)) return;
    state.ui.prompt = 'Magic Lock needs a simple unopened container or door.';
    return;
  }
  if (spell.effectType === 'unlock') {
    if (unlockContainerWithSpell(state, target)) return;
    addFloatingText(state, 'Unlocked', target?.kind === 'tile' ? target.position : state.player.position, '#dbe7ff');
    state.ui.prompt = 'A minor lock gives way.';
    return;
  }
  if (spell.effectType === 'magic_trap' && target?.kind === 'tile') {
    state.world.magicFields.push({
      id: createId('field'),
      kind: 'trap',
      area: state.player.currentArea,
      position: { x: Math.round(target.position.x), y: 0, z: Math.round(target.position.z) },
      createdAt: state.clock,
      remaining: spell.power,
      power: spell.power
    });
    addFloatingText(state, 'Trap Set', target.position, '#ffb966');
    state.ui.prompt = 'A small magical trap hums in place.';
    return;
  }
  if (spell.effectType === 'wall' && target?.kind === 'tile') {
    const id = createId('spell_wall');
    const building = {
      id,
      kind: 'building' as const,
      area: state.player.currentArea,
      name: 'Wall of Stone',
      pieceId: 'stone_wall',
      rotation: 0,
      position: { x: Math.round(target.position.x), y: 0, z: Math.round(target.position.z) },
      blocksMovement: true
    };
    state.world.placedBuildings.push(building);
    state.entities[id] = building;
    addEffect(state, { type: 'stone_wall', buildingId: id, remaining: spell.power, amount: 1 });
    state.ui.prompt = 'A stone wall rises.';
    return;
  }
  if (spell.effectType === 'recall') {
    const mark = state.world.recallMark;
    if (!mark) {
      state.ui.prompt = 'Mark a safe rune first.';
      return;
    }
    state.player.currentArea = mark.area;
    state.player.position = { ...mark.position };
    state.player.targetPosition = null;
    state.player.movement.path = [];
    state.player.movement.waypoint = null;
    state.player.movement.velocity = { x: 0, z: 0 };
    state.ui.targeting = null;
    state.ui.prompt = `You recall to ${areas[mark.area].name}.`;
    addSystemMessage(state, `You recall to ${areas[mark.area].name}.`);
    return;
  }
  if (spell.effectType === 'dispel_field') {
    if (target?.kind === 'entity' && dispelContainerBarrier(state, target)) return;
    const position = target?.kind === 'tile' ? target.position : state.player.position;
    const before = state.world.magicFields.length;
    state.world.magicFields = state.world.magicFields.filter((field) => field.area !== state.player.currentArea || distance(field.position, position) > 1.6);
    const removed = before - state.world.magicFields.length;
    const walls = state.spellEffects.filter((effect) => effect.type === 'stone_wall' && effect.buildingId);
    for (const wall of walls) {
      const building = wall.buildingId ? state.entities[wall.buildingId] : null;
      if (building && distance(building.position, position) <= 1.6) {
        delete state.entities[building.id];
        state.world.placedBuildings = state.world.placedBuildings.filter((candidate) => candidate.id !== building.id);
        wall.remaining = 0;
      }
    }
    state.spellEffects = state.spellEffects.filter((effect) => effect.remaining > 0);
    addFloatingText(state, removed ? 'Dispelled' : 'No Field', position, '#dbe7ff');
    state.ui.prompt = removed ? 'The magical field collapses.' : 'No magical field there.';
    return;
  }
  if (spell.effectType === 'mark_rune') {
    if (!isSafeRecallArea(state.player.currentArea)) {
      state.ui.prompt = 'Mark requires a safe town, service, or housing point.';
      return;
    }
    state.world.recallMark = { area: state.player.currentArea, position: { ...state.player.position }, markedAt: state.clock };
    state.world.magicFields.push({
      id: createId('field'),
      kind: 'marked_rune',
      area: state.player.currentArea,
      position: { ...state.player.position },
      createdAt: state.clock,
      remaining: 20,
      power: 1
    });
    addEffect(state, { type: 'mark_rune', remaining: 20, amount: 1 });
    addFloatingText(state, 'Rune Marked', state.player.position, '#ffcf57');
    state.ui.prompt = 'This safe location is marked for Recall.';
  }
}

function spellWorldPreflightReason(state: GameState, spell: SpellDefinition): string {
  if (spell.effectType === 'recall' && !state.world.recallMark) return 'Mark a safe rune first.';
  if (spell.effectType === 'mark_rune' && !isSafeRecallArea(state.player.currentArea)) return 'Mark requires a safe town, service, or housing point.';
  if ((spell.effectType === 'recall' || spell.effectType === 'mark_rune') && state.combat.lastDamagedAt > 0 && state.combat.lastDamagedAt > state.clock - 3) return 'Travel magic fails under immediate attack.';
  return '';
}

function isSafeRecallArea(areaId: GameState['player']['currentArea']): boolean {
  return areaId === 'town' || areaId === 'bank' || areaId === 'blacksmith' || areaId === 'housing';
}

function magicLockTarget(state: GameState, target: TargetRef): boolean {
  const container = target?.kind === 'entity' ? state.entities[target.entityId] : null;
  if (!container || container.kind !== 'container') return false;
  if (container.opened) {
    state.ui.prompt = `${container.name} is already open.`;
    return true;
  }
  if (container.hidden || container.protected || container.requiredSpellId || container.trap || container.lockDifficulty > 35) {
    state.ui.prompt = `${container.name} resists Magic Lock.`;
    return true;
  }
  container.locked = true;
  container.lockDifficulty = Math.max(18, Math.min(35, container.lockDifficulty || 18 + Math.floor(getSkillValue(state, 'Magery') / 10)));
  addFloatingText(state, 'Magic Lock', container.position, '#dbe7ff');
  addSystemMessage(state, `${container.name} is sealed with a weak magical lock.`);
  state.ui.prompt = `${container.name} is magically locked.`;
  emitAudioHook('spell_impact', { id: 'magic_lock', area: container.area, position: container.position });
  return true;
}

function damageEnemy(state: GameState, enemy: EnemyEntity, amount: number, projectileKind: NonNullable<SpellDefinition['projectileKind']>, color: string): void {
  recordCombatEngagementStart(state, enemy.id);
  enemy.health = Math.max(0, enemy.health - amount);
  recordDamageDealt(state, 'spell', amount);
  state.combat.hitFlashes[enemy.id] = state.clock + 0.25;
  state.projectiles.push({
    id: createId('projectile'),
    kind: projectileKind,
    from: { ...state.player.position, y: state.player.position.y + 1.1 },
    to: { ...enemy.position, y: enemy.position.y + 1.1 },
    age: 0,
    duration: projectileKind === 'lightning' ? 0.18 : 0.45,
    color
  });
  addFloatingText(state, `${amount}`, enemy.position, color);
  if (enemy.health <= 0) {
    finishEnemyKill(state, enemy);
  }
}

function finishEnemyKill(state: GameState, enemy: EnemyEntity): void {
  if (enemy.state === 'dead') return;
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

function resolveSpellTarget(state: GameState, spell: SpellDefinition, target: TargetRef): TargetRef | 'needs-target' | null {
  if (spell.targetType === 'self' || spell.targetType === 'none') return { kind: 'self' };
  if (spell.targetType === 'area' && (!target || target.kind === 'self')) return { kind: 'self' };
  if (!target && spell.targetType === 'entity' && state.player.activeTargetId) return { kind: 'entity', entityId: state.player.activeTargetId };
  if (!target) return 'needs-target';
  if (spell.targetType === 'entity' && target.kind !== 'entity') {
    invalidAction(state, 'That spell needs a living target.', 'Select a creature or enemy.', { position: state.player.position });
    return null;
  }
  if (spell.targetType === 'tile' && target.kind !== 'tile') {
    invalidAction(state, 'That spell needs a ground tile.', 'Select the ground.', { position: state.player.position });
    return null;
  }
  if (spell.targetType === 'area' && target.kind !== 'tile' && target.kind !== 'entity' && target.kind !== 'self') {
    invalidAction(state, 'That spell needs a nearby area.', 'Select the ground or a nearby target.', { position: state.player.position });
    return null;
  }
  if ((spell.targetType === 'item' || spell.targetType === 'rune') && target.kind !== 'inventory' && target.kind !== 'ground-item') {
    invalidAction(state, 'That spell needs an item target.', 'Select an item in your pack or on the ground.', { position: state.player.position });
    return null;
  }
  if ((spell.targetType === 'door' || spell.targetType === 'container') && target.kind !== 'tile' && target.kind !== 'entity' && target.kind !== 'ground-item') {
    invalidAction(state, 'That spell needs a fixture target.', 'Select a door, lock, trap, or container.', { position: state.player.position });
    return null;
  }
  if (spell.targetType === 'corpse' && target.kind !== 'ground-item' && target.kind !== 'entity') {
    invalidAction(state, 'That spell needs a corpse target.', 'Select a corpse or remains.', { position: state.player.position });
    return null;
  }
  const position = target.kind === 'entity' ? state.entities[target.entityId]?.position : target.kind === 'tile' ? target.position : state.player.position;
  const targetEntity = target.kind === 'entity' ? state.entities[target.entityId] : null;
  if (spell.lineOfSight && targetEntity && 'hidden' in targetEntity && targetEntity.hidden) {
    invalidAction(state, 'Line of sight blocked.', 'Reveal the target or move to a clear angle.', { position: targetEntity.position });
    return null;
  }
  if (position && distance(state.player.position, position) > spell.range) {
    invalidAction(state, 'You are too far away for that spell.', 'Move closer or choose a nearer target.', { position });
    return null;
  }
  return target;
}

function updateSpellEffects(state: GameState, dt: number): void {
  state.spellEffects.forEach((effect) => {
    effect.remaining -= dt;
    if (effect.type === 'meditation') {
      const bonus = dt * (0.65 + getSkillValue(state, 'Meditation') * 0.012);
      state.player.mana += bonus;
    }
  });
  state.world.magicFields.forEach((field) => {
    field.remaining -= dt;
  });
  state.world.magicFields = state.world.magicFields.filter((field) => field.remaining > 0);
  const expired = state.spellEffects.filter((effect) => effect.remaining <= 0);
  for (const effect of expired) {
    if (effect.type === 'stone_wall' && effect.buildingId) {
      delete state.entities[effect.buildingId];
      state.world.placedBuildings = state.world.placedBuildings.filter((building) => building.id !== effect.buildingId);
    }
  }
  state.spellEffects = state.spellEffects.filter((effect) => effect.remaining > 0);
}

function addEffect(state: GameState, effect: Omit<SpellEffectState, 'id'>): void {
  state.spellEffects = state.spellEffects.filter((candidate) => candidate.type !== effect.type || candidate.targetId !== effect.targetId);
  state.spellEffects.push({ id: createId('effect'), ...effect });
}

function offensive(spell: SpellDefinition): boolean {
  return spell.effectType === 'damage' || spell.effectType === 'debuff' || spell.effectType === 'poison';
}

function spellVisualRole(spell: SpellDefinition): string {
  if (spell.effectType === 'heal') return 'heal';
  if (spell.effectType === 'protection' || spell.effectType === 'strength' || spell.effectType === 'night_sight' || spell.effectType === 'cure') return 'Buff';
  if (spell.effectType === 'debuff' || spell.effectType === 'poison') return 'debuff';
  if (spell.effectType === 'reveal') return 'reveal';
  if (spell.effectType === 'recall' || spell.effectType === 'mark_rune') return 'recall';
  if (spell.effectType === 'detect_magic' || spell.effectType === 'telekinesis' || spell.effectType === 'unlock' || spell.effectType === 'magic_lock' || spell.effectType === 'dispel_field' || spell.effectType === 'magic_trap' || spell.effectType === 'wall' || spell.effectType === 'water_walk' || spell.effectType === 'create_food') return 'utility';
  return 'damage';
}

function spellVisualColor(role: string): string {
  if (role === 'heal') return '#69e681';
  if (role === 'Buff') return '#9bbdff';
  if (role === 'debuff') return '#b66dff';
  if (role === 'reveal') return '#ffe98d';
  if (role === 'recall') return '#ffcf57';
  if (role === 'utility') return '#6fd4ff';
  return '#ff6262';
}

function spellVisualTargetPosition(state: GameState, target: TargetRef, targetEntity: GameState['entities'][string] | null): Vec3 {
  if (targetEntity) return targetEntity.position;
  if (target?.kind === 'tile') return target.position;
  if (target?.kind === 'ground-item') return state.entities[target.entityId]?.position ?? state.player.position;
  return state.player.position;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

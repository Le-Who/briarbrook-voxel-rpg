import { createSkillState, skillDefinitionById } from '../data/skillDefinitions';
import { emitAudioHook } from '../audio/AudioHooks';
import type { AttributeName, GameState, SkillId, SkillName, SkillState, Vec3 } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { recordSkillGainTelemetry } from './TelemetrySystem';

export interface SkillUseContext {
  verb: string;
  difficulty: number;
  success: boolean;
  targetId?: string;
  tile?: Vec3;
  itemId?: string;
  relatedSkills?: SkillId[];
}

export function skillXpThreshold(value: number): number {
  return Math.max(12, 24 + value * 1.6);
}

export function usedSkillTotal(state: GameState): number {
  return Object.values(state.player.skills).reduce((total, skill) => total + (skill.realValue ?? skill.value), 0);
}

export function getSkillValue(state: GameState, skillId: SkillId): number {
  return ensureSkill(state, skillId).value;
}

export function setSkillMode(state: GameState, skillId: SkillId, mode: SkillState['mode']): void {
  const skill = ensureSkill(state, skillId);
  skill.mode = mode;
}

export function attemptSkillUse(state: GameState, skillId: SkillId, context: SkillUseContext): boolean {
  const skill = ensureSkill(state, skillId);
  if (skill.mode === 'lock' || skill.realValue >= skill.cap) return false;

  const value = skill.realValue;
  const difficulty = Math.max(0, Math.min(120, context.difficulty));
  const gap = Math.abs(difficulty - value);
  const usefulDifficulty = difficulty >= value - 25 && difficulty <= value + 45;
  const successFactor = context.success ? 1 : 0.28;
  const difficultyFactor = usefulDifficulty ? Math.max(0.08, 1 - gap / 70) : 0.02;
  const chance = Math.max(0.015, Math.min(0.42, (0.04 + difficultyFactor * 0.24) * successFactor));

  skill.gainProgress = Math.min(1, skill.gainProgress + (context.success ? 0.08 : 0.025));
  if (context.success) {
    skill.lastSuccessfulUseAt = state.clock;
    skill.ggsTimer += 1;
  }

  const ggsThreshold = Math.max(8, Math.round(36 - Math.min(24, value / 4)));
  const gained = Math.random() < chance || (context.success && skill.ggsTimer >= ggsThreshold);
  if (!gained) {
    trainRelatedSkills(state, context, difficulty, false);
    return false;
  }

  const amount = context.success ? 0.1 : 0.05;
  const applied = applySkillGain(state, skill, amount);
  if (applied) {
    skill.gainProgress = 0;
    skill.ggsTimer = 0;
    skill.lastGainAt = state.clock;
    trainStatsFromSkill(state, skillId);
  }
  trainRelatedSkills(state, context, difficulty, applied);
  return applied;
}

export function gainSkill(state: GameState, skillName: SkillName, amount: number): void {
  const skill = ensureSkill(state, skillName);
  const tenthSteps = Math.max(1, Math.round(amount));
  for (let i = 0; i < tenthSteps; i += 1) {
    applySkillGain(state, skill, 0.1);
  }
}

export function gainPlayerXp(state: GameState, amount: number): void {
  state.player.xp += amount;
  while (state.player.xp >= state.player.xpToNext) {
    state.player.xp -= state.player.xpToNext;
    state.player.level += 1;
    state.player.xpToNext = Math.round(state.player.xpToNext * 1.24);
    state.player.health += 10;
    state.player.mana += 4;
    state.player.stamina += 2;
    addSystemMessage(state, `Valen reached level ${state.player.level}.`);
  }
}

function ensureSkill(state: GameState, skillId: SkillId): SkillState {
  const existing = state.player.skills[skillId];
  if (existing) {
    existing.id ??= skillId;
    existing.name ??= skillDefinitionById[skillId]?.displayName ?? skillId;
    existing.realValue ??= existing.value;
    existing.bonusValue ??= 0;
    existing.gainProgress ??= existing.xp ?? 0;
    existing.cap ??= skillDefinitionById[skillId]?.cap ?? 100;
    existing.mode ??= skillDefinitionById[skillId]?.gainMode ?? 'raise';
    existing.lastGainAt ??= 0;
    existing.lastSuccessfulUseAt ??= 0;
    existing.ggsTimer ??= 0;
    existing.value = Number((existing.realValue + existing.bonusValue).toFixed(1));
    return existing;
  }
  const definition = skillDefinitionById[skillId];
  const created = definition ? createSkillState(definition) : createFallbackSkill(skillId);
  state.player.skills[skillId] = created;
  return created;
}

function createFallbackSkill(skillId: SkillId): SkillState {
  return {
    id: skillId,
    name: skillId,
    value: 0,
    realValue: 0,
    bonusValue: 0,
    xp: 0,
    gainProgress: 0,
    cap: 100,
    mode: 'raise',
    lastGainAt: 0,
    lastSuccessfulUseAt: 0,
    ggsTimer: 0
  };
}

function applySkillGain(state: GameState, skill: SkillState, amount: number): boolean {
  if (skill.mode === 'lock' || skill.realValue >= skill.cap) return false;
  const cappedAmount = Math.min(amount, skill.cap - skill.realValue);
  if (cappedAmount <= 0) return false;
  if (!freeSkillCap(state, cappedAmount, skill.id)) return false;

  skill.realValue = Number((skill.realValue + cappedAmount).toFixed(1));
  skill.value = Number((skill.realValue + skill.bonusValue).toFixed(1));
  skill.xp = skill.gainProgress;
  recordSkillGainTelemetry(state, skill.id, cappedAmount);
  addSystemMessage(state, `${skill.name} increased to ${skill.value.toFixed(1)}.`);
  emitAudioHook('skill_gain', { id: skill.id, intensity: cappedAmount });
  return true;
}

function freeSkillCap(state: GameState, needed: number, raisingSkillId: SkillId): boolean {
  const cap = state.player.skillCap ?? 700;
  let total = usedSkillTotal(state);
  if (total + needed <= cap + 0.001) return true;

  const lowerable = Object.values(state.player.skills)
    .filter((skill) => skill.id !== raisingSkillId && skill.mode === 'lower' && skill.realValue > 0)
    .sort((a, b) => b.realValue - a.realValue);

  for (const skill of lowerable) {
    const excess = total + needed - cap;
    if (excess <= 0.001) return true;
    const drop = Math.min(skill.realValue, Math.max(0.1, Number(excess.toFixed(1))));
    skill.realValue = Number((skill.realValue - drop).toFixed(1));
    skill.value = Number((skill.realValue + skill.bonusValue).toFixed(1));
    total -= drop;
  }
  return total + needed <= cap + 0.001;
}

function trainRelatedSkills(state: GameState, context: SkillUseContext, difficulty: number, parentGained: boolean): void {
  for (const relatedSkill of context.relatedSkills ?? []) {
    const skill = ensureSkill(state, relatedSkill);
    if (skill.mode !== 'raise' || skill.realValue >= skill.cap) continue;
    const chance = parentGained ? 0.32 : 0.08;
    if (Math.random() > chance) continue;
    applySkillGain(state, skill, difficulty > skill.realValue + 35 ? 0.05 : 0.1);
  }
}

function trainStatsFromSkill(state: GameState, skillId: SkillId): void {
  const definition = skillDefinitionById[skillId];
  if (!definition) return;
  maybeRaiseStat(state, definition.primaryStat, 0.16);
  maybeRaiseStat(state, definition.secondaryStat, 0.06);
}

function maybeRaiseStat(state: GameState, stat: AttributeName, chance: number): void {
  const mapped = stat === 'Agility' ? 'Dexterity' : stat;
  if ((state.player.statModes?.[mapped] ?? 'raise') !== 'raise') return;
  if (Math.random() > chance) return;
  const next = Number((Math.min(100, (state.player.attributes[mapped] ?? 0) + 0.1)).toFixed(1));
  state.player.attributes[mapped] = next;
  if (mapped === 'Dexterity') state.player.attributes.Agility = next;
  addSystemMessage(state, `${mapped} increased to ${next.toFixed(1)}.`);
}

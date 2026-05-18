import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { deriveFirstHourDirector, FIRST_HOUR_SKILL_TARGET } from './FirstHourDirector';

function completeObjective(state: ReturnType<typeof createInitialGameState>, questId: string, type: string, labelIncludes?: string): void {
  const objective = state.quests[questId]?.objectives.find((candidate) => candidate.type === type && (!labelIncludes || candidate.label.includes(labelIncludes)));
  if (!objective) throw new Error(`Missing objective ${questId}:${type}:${labelIncludes ?? '*'}`);
  objective.progress = objective.required;
}

function touchSkill(state: ReturnType<typeof createInitialGameState>, skillId: string, at: number): void {
  const skill = state.player.skills[skillId];
  if (!skill) throw new Error(`Missing skill ${skillId}`);
  skill.lastSuccessfulUseAt = at;
  skill.lastGainAt = at;
  state.dev.telemetry.skillGains[skillId] = Number((state.dev.telemetry.skillGains[skillId] ?? 0.1).toFixed(2));
}

describe('first-hour director', () => {
  it('starts with the guide conversation and a twelve-skill target', () => {
    const state = createInitialGameState();

    const director = deriveFirstHourDirector(state);

    expect(director.progress.done).toBe(0);
    expect(director.nextStep?.label).toBe('Talk to Mira at the fountain');
    expect(director.skills.target).toBe(FIRST_HOUR_SKILL_TARGET);
    expect(director.skills.touchedCount).toBe(0);
    expect(director.skills.missingSuggestions.slice(0, 3)).toEqual(['Lumberjacking', 'Mining', 'Healing']);
    expect(director.systems.some((system) => system.id === 'tools' && system.done)).toBe(false);
  });

  it('recognizes a connected first-hour route across systems and skill events', () => {
    const state = createInitialGameState();
    state.clock = 35 * 60;
    state.world.discoveredAreas.push('bank', 'forest', 'road', 'crypt', 'housing');
    state.dev.telemetry.marketTransactions = 1;
    state.dev.telemetry.workOrdersCompleted = 1;
    state.dev.telemetry.damageTaken = 18;
    state.dev.telemetry.potionConsumption.health_potion = 1;
    state.world.treasure.secrets.chest_crypt_warded = { revealedUntil: state.clock + 60, disarmed: false, triggered: false, opened: true };

    completeObjective(state, 'prepare_for_road', 'talk');
    completeObjective(state, 'prepare_for_road', 'open_panel', 'Skills');
    completeObjective(state, 'prepare_for_road', 'gather');
    completeObjective(state, 'prepare_for_road', 'collect');
    completeObjective(state, 'prepare_for_road', 'bank');
    completeObjective(state, 'ore_for_brom', 'gather');
    completeObjective(state, 'mages_errand', 'cast', 'Magic Arrow');
    completeObjective(state, 'mages_errand', 'cast', 'Heal');
    completeObjective(state, 'patch_yourself_up', 'bandage');
    completeObjective(state, 'trouble_on_road', 'enter_area');
    completeObjective(state, 'trouble_on_road', 'kill', 'Highway Bandit');
    completeObjective(state, 'bones_beneath', 'enter_area');
    completeObjective(state, 'bones_beneath', 'cast', 'Detect Magic');
    completeObjective(state, 'bones_beneath', 'open_container');
    completeObjective(state, 'place_to_call_yours', 'enter_area');
    completeObjective(state, 'place_to_call_yours', 'build');

    [
      'Lumberjacking',
      'Mining',
      'Healing',
      'Anatomy',
      'Magery',
      'Meditation',
      'Swordsmanship',
      'Tactics',
      'Archery',
      'Peacemaking',
      'Lockpicking',
      'Carpentry'
    ].forEach((skillId, index) => touchSkill(state, skillId, 120 + index * 10));

    const director = deriveFirstHourDirector(state);

    expect(director.skills.touchedCount).toBeGreaterThanOrEqual(12);
    expect(director.skills.events.map((event) => event.skillId)).toContain('Carpentry');
    expect(Object.fromEntries(director.systems.map((system) => [system.id, system.done]))).toMatchObject({
      movement: true,
      tools: true,
      magic: true,
      combat: true,
      healing: true,
      economy: true,
      housing: true
    });
    expect(director.milestones.find((milestone) => milestone.id === 'secret')?.done).toBe(true);
    expect(director.milestones.find((milestone) => milestone.id === 'work_order')?.done).toBe(true);
    expect(director.nextStep).toBeNull();
  });
});

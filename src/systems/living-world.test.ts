import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { AreaManager } from '../world/AreaManager';
import { registerResourceHarvest, triggerWorldEvent, updateLivingWorld } from './LivingWorldSystem';

describe('living world simulation', () => {
  it('advances world time and applies NPC service schedules', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    const banker = state.entities.npc_eldon_bank;
    const townBanker = state.entities.npc_eldon_town;
    if (!banker || banker.kind !== 'npc') throw new Error('banker missing');
    if (!townBanker || townBanker.kind !== 'npc') throw new Error('town banker missing');

    state.clock = 40;
    updateLivingWorld(state, areaManager, 1);
    expect(state.world.time.hour).toBe(10);
    expect(state.world.time.phase).toBe('day');
    expect(banker.scheduleState?.available).toBe(true);
    expect(banker.dialogue.join(' ')).toContain('bank');
    expect(townBanker.scheduleState?.behavior).toBe('bank approach');
    expect(townBanker.serviceAvailable).toBe(false);

    state.clock = 88;
    updateLivingWorld(state, areaManager, 1);
    expect(state.world.time.hour).toBe(22);
    expect(state.world.time.phase).toBe('night');
    expect(banker.scheduleState?.available).toBe(false);
  });

  it('starts dynamic events that are announced through real rumors', () => {
    const state = createInitialGameState();

    const event = triggerWorldEvent(state, 'bandit_ambush');

    expect(event.type).toBe('bandit_ambush');
    expect(state.world.activeEvents.some((candidate) => candidate.id === event.id)).toBe(true);
    expect(Object.values(state.entities).some((entity) => entity.id.startsWith('event_bandit_') && entity.area === 'road')).toBe(true);
    expect(state.chat.some((message) => message.text.includes(event.title))).toBe(true);
  });

  it('expires time-limited events and cleans up event entities', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    const event = triggerWorldEvent(state, 'lost_traveler');
    expect(state.entities[`event_traveler_${event.id}`]).toBeTruthy();

    state.clock = event.endsAt + 1;
    updateLivingWorld(state, areaManager, 1);

    expect(state.world.activeEvents.some((candidate) => candidate.id === event.id)).toBe(false);
    expect(state.entities[`event_traveler_${event.id}`]).toBeUndefined();
  });

  it('tracks over-harvesting pressure for short-term yield scarcity', () => {
    const state = createInitialGameState();

    registerResourceHarvest(state, 'forest');
    registerResourceHarvest(state, 'forest');
    registerResourceHarvest(state, 'forest');
    registerResourceHarvest(state, 'forest');

    const pressure = state.world.resourcePressure.forest;
    expect(pressure?.harvests).toBe(4);
    expect(pressure?.yieldModifier).toBeLessThan(1);
  });
});

import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import type { WorldEventType } from '../game/types';
import { AreaManager } from '../world/AreaManager';
import { livingWorldEventDefinitions, registerResourceHarvest, triggerWorldEvent, updateLivingWorld } from './LivingWorldSystem';

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

  it('defines a gameplay-backed event director contract for all prompt events', () => {
    const required: WorldEventType[] = [
      'merchant_caravan',
      'bandit_ambush',
      'crypt_spill',
      'market_day',
      'rare_ore',
      'storm',
      'guard_patrol',
      'healer_shortage',
      'mage_reagent_request'
    ];

    expect(Object.keys(livingWorldEventDefinitions)).toEqual(expect.arrayContaining(required));
    for (const type of required) {
      const def = livingWorldEventDefinitions[type];
      expect(def.triggerConditions.length).toBeGreaterThan(0);
      expect(def.affectedLocations.length).toBeGreaterThan(0);
      expect(def.visibleChange.length).toBeGreaterThan(0);
      expect(def.rumor.length).toBeGreaterThan(0);
      expect(def.rumorTruth).toMatch(/^(true|partial)$/);
      expect(def.rumorSources.length).toBeGreaterThan(0);
      expect(def.gameplayHooks.length).toBeGreaterThan(0);
      expect(def.economyImpact.length).toBeGreaterThan(0);
      expect(def.cleanup.length).toBeGreaterThan(0);
    }
  });

  it('starts patrol and service request events with visible hooks, map rumors, and demand signals', () => {
    const state = createInitialGameState();

    const guard = triggerWorldEvent(state, 'guard_patrol');
    const healer = triggerWorldEvent(state, 'healer_shortage');
    const mage = triggerWorldEvent(state, 'mage_reagent_request');
    const rare = triggerWorldEvent(state, 'rare_ore');

    expect(Object.values(state.entities).some((entity) => entity.id.startsWith('event_guard_patrol_') && entity.area === 'road')).toBe(true);
    expect(Object.values(state.entities).some((entity) => entity.id.startsWith('event_healer_runner_') && entity.area === 'town')).toBe(true);
    expect(Object.values(state.entities).some((entity) => entity.id.startsWith('event_mage_apprentice_') && entity.area === 'town')).toBe(true);
    expect(state.world.discoveredRumorIds).toEqual(expect.arrayContaining([guard.id, healer.id, mage.id, rare.id]));
    expect(state.world.economy.demandSignals.map((signal) => signal.eventType)).toEqual(expect.arrayContaining(['guard_patrol', 'healer_shortage', 'mage_reagent_request', 'rare_ore']));
    expect(state.world.economy.localDemand.guard).toBeGreaterThan(1);
    expect(state.world.economy.localDemand.healer).toBeGreaterThan(1);
    expect(state.world.economy.localDemand.mage).toBeGreaterThan(1);
    expect(state.world.economy.localDemand.metal).toBeGreaterThan(1);
    expect(state.world.resourcePressure.forest?.yieldModifier).toBeGreaterThan(1);
    expect(state.chat.filter((message) => message.channel === 'Rumors').map((message) => message.text)).toEqual(
      expect.arrayContaining([expect.stringContaining(guard.title), expect.stringContaining(healer.title), expect.stringContaining(mage.title)])
    );
  });

  it('increases storm and night danger and records resolved combat pressure', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();

    state.clock = 88;
    triggerWorldEvent(state, 'storm');
    updateLivingWorld(state, areaManager, 1);

    expect(state.world.time.phase).toBe('night');
    expect(state.world.time.visibilityModifier).toBeLessThan(0.58);
    expect(state.world.time.stealthModifier).toBeGreaterThan(1.2);
    expect(state.world.time.dangerModifier).toBeGreaterThan(1);

    const event = triggerWorldEvent(state, 'bandit_ambush');
    for (const id of event.spawnedEntityIds) {
      const entity = state.entities[id];
      if (entity && entity.kind === 'enemy') entity.state = 'dead';
    }
    updateLivingWorld(state, areaManager, 1);

    expect(state.world.activeEvents.some((candidate) => candidate.id === event.id)).toBe(false);
    expect(state.world.resolvedEventLog.some((entry) => entry.includes(event.title))).toBe(true);
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
    expect(state.world.resolvedEventLog.some((entry) => entry.includes(event.title))).toBe(true);
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

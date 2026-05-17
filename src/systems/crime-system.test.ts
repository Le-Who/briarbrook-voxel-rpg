import { afterEach, describe, expect, it, vi } from 'vitest';
import { zoneForArea } from '../data/riskZones';
import { createInitialGameState } from '../game/GameState';
import type { ContainerEntity } from '../game/types';
import { attemptSnoopContainer, attemptStealFromContainer, handleInnocentAttack, updateReputation } from './CrimeSystem';
import { getItemCount } from './InventorySystem';
import { interactContainer } from './ContainerSystem';

function townState() {
  const state = createInitialGameState();
  state.player.currentArea = 'town';
  state.player.position = { x: -4, y: 0, z: 7 };
  return state;
}

describe('crime, reputation, guards and risk zones', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes safe and risky zone rules by area', () => {
    expect(zoneForArea('town')).toMatchObject({ id: 'guarded_town', canSteal: false, guardResponse: 'guarded' });
    expect(zoneForArea('crypt')).toMatchObject({ id: 'dungeon', riskLabel: 'High PvE Risk', canAttackPlayers: false });
    expect(zoneForArea('housing')).toMatchObject({ id: 'player_plot', lootRules: 'protected' });
  });

  it('prevents accidental theft from protected town containers', () => {
    const state = townState();
    const crate = state.entities.crate_town_guard_supplies as ContainerEntity;

    interactContainer(state, crate);

    expect(crate.opened).toBe(false);
    expect(state.world.crimeEvents).toHaveLength(0);
    expect(state.ui.prompt).toContain('protected town property');
  });

  it('warns before deliberate stealing, then applies witnessed guard consequences', () => {
    const state = townState();
    const crate = state.entities.crate_town_guard_supplies as ContainerEntity;
    const bandagesBefore = getItemCount(state.player.inventory, 'bandage');

    expect(attemptStealFromContainer(state, { kind: 'entity', entityId: crate.id })).toBe(false);
    expect(state.world.crimeEvents).toHaveLength(0);
    expect(state.player.reputation.warningAcknowledged.steal).toBe(true);

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(attemptStealFromContainer(state, { kind: 'entity', entityId: crate.id })).toBe(true);

    expect(getItemCount(state.player.inventory, 'bandage')).toBe(bandagesBefore + 1);
    expect(state.player.reputation.status).toBe('criminal');
    expect(state.player.reputation.recentCriminalUntil).toBeGreaterThan(state.clock);
    expect(state.world.crimeEvents.at(-1)).toMatchObject({ type: 'steal', detected: true, severity: 'minor' });
  });

  it('lets snooping inspect contents but flags witnessed protected snoops as suspicious', () => {
    const state = townState();
    const crate = state.entities.crate_town_guard_supplies as ContainerEntity;

    expect(attemptSnoopContainer(state, { kind: 'entity', entityId: crate.id })).toBe(false);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(attemptSnoopContainer(state, { kind: 'entity', entityId: crate.id })).toBe(true);

    expect(crate.opened).toBe(false);
    expect(state.player.reputation.status).toBe('suspicious');
    expect(state.ui.prompt).toContain('Bandage');
  });

  it('requires a repeated deliberate attack before innocent aggression is criminalized', () => {
    const state = townState();

    expect(handleInnocentAttack(state, 'npc_mira_town')).toBe(true);
    expect(state.world.crimeEvents).toHaveLength(0);
    expect(state.player.reputation.warningAcknowledged.attack_innocent).toBe(true);

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(handleInnocentAttack(state, 'npc_mira_town')).toBe(true);
    expect(state.player.reputation.status).toBe('criminal');
    expect(state.player.reputation.aggressionCount).toBe(1);
    expect(state.world.crimeEvents.at(-1)).toMatchObject({ type: 'attack_innocent', severity: 'major' });
  });

  it('fades temporary criminal status into standing-based reputation', () => {
    const state = townState();
    state.player.reputation.status = 'criminal';
    state.player.reputation.townStanding = 4;
    state.player.reputation.recentCriminalUntil = 2;
    state.clock = 3;

    updateReputation(state);

    expect(state.player.reputation.status).toBe('neutral');
    expect(state.player.reputation.recentCriminalUntil).toBe(0);
  });
});

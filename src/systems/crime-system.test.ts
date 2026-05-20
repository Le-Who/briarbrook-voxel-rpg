import { afterEach, describe, expect, it, vi } from 'vitest';
import { zoneForArea, zoneForState } from '../data/riskZones';
import { createInitialGameState } from '../game/GameState';
import type { ContainerEntity } from '../game/types';
import { Minimap } from '../ui/Minimap';
import {
  attemptSnoopContainer,
  attemptStealFromContainer,
  attemptTrespassRestrictedRoom,
  crimeConsequencePreview,
  crimeFeedbackSummary,
  handleInnocentAttack,
  updateReputation
} from './CrimeSystem';
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

  it('elevates active local danger events into an explicit event zone in HUD/minimap context', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'road';
    state.world.activeEvents.push({
      id: 'event-road-ambush',
      type: 'bandit_ambush',
      title: 'Bandit Ambush',
      area: 'road',
      startedAt: state.clock,
      endsAt: state.clock + 90,
      discovered: true,
      rumor: 'Bandits have blocked the road bend.',
      position: { x: 7, y: 0, z: 4 },
      spawnedEntityIds: []
    });

    expect(zoneForState(state)).toMatchObject({ id: 'event_zone', riskLabel: 'Event Risk', canAttackPlayers: false });
    const html = Minimap(state);
    expect(html).toContain('Event Risk');
    expect(html).toContain('Guard attention');
  });

  it('tracks relationship trust and exposes readable action consequences before crime commits', () => {
    const state = townState();
    const crate = state.entities.crate_town_guard_supplies as ContainerEntity;

    expect(state.player.reputation).toMatchObject({
      merchantTrust: 10,
      guardTrust: 10,
      mageTrust: 8,
      healerTrust: 8,
      smithTrust: 8,
      guardAttention: 0
    });
    expect(crimeConsequencePreview(state, 'steal', { kind: 'entity', entityId: crate.id })).toMatchObject({
      allowed: true,
      requiresConfirmation: true,
      reputationDelta: -8,
      guardResponse: 'guarded'
    });

    state.player.reputation.warningAcknowledged.steal = true;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(attemptStealFromContainer(state, { kind: 'entity', entityId: crate.id })).toBe(true);

    expect(state.player.reputation.guardAttention).toBeGreaterThan(0);
    expect(state.player.reputation.guardTrust).toBeLessThan(10);
    expect(state.player.reputation.merchantTrust).toBeLessThan(10);
    expect(crimeFeedbackSummary(state).criminalWarning).toContain('criminally flagged');
    expect(Minimap(state)).toContain('Guard attention');
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

  it('does not allow stealing from player-owned storage in the PvE slice', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'housing';
    const chest = state.entities.storage_plot_empty_chest as ContainerEntity;

    expect(crimeConsequencePreview(state, 'steal', { kind: 'entity', entityId: chest.id })).toMatchObject({
      allowed: false,
      requiresConfirmation: false,
      reputationDelta: 0
    });
    expect(attemptStealFromContainer(state, { kind: 'entity', entityId: chest.id })).toBe(false);

    expect(state.world.crimeEvents).toHaveLength(0);
    expect(state.ui.prompt).toContain('Player-owned stealing is disabled');
  });

  it('keeps rogue gameplay PvE-focused for enemy stashes without criminal flags', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'road';
    const stash = state.entities.cache_road_hidden as ContainerEntity;
    stash.ownerId = 'bandits';
    stash.locked = false;
    stash.hidden = false;
    const lockpicksBefore = getItemCount(state.player.inventory, 'lockpick');

    expect(crimeConsequencePreview(state, 'steal', { kind: 'entity', entityId: stash.id })).toMatchObject({
      allowed: true,
      requiresConfirmation: false,
      reputationDelta: 0,
      guardResponse: 'none'
    });
    expect(attemptSnoopContainer(state, { kind: 'entity', entityId: stash.id })).toBe(true);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(attemptStealFromContainer(state, { kind: 'entity', entityId: stash.id })).toBe(true);

    expect(getItemCount(state.player.inventory, 'lockpick')).toBe(lockpicksBefore + 1);
    expect(state.world.crimeEvents).toHaveLength(0);
    expect(state.player.reputation.status).toBe('lawful');
  });

  it('protects newcomer trespass mistakes with a confirmation before restricted-room consequences', () => {
    const state = townState();

    expect(attemptTrespassRestrictedRoom(state, 'bank records room')).toBe(false);
    expect(state.player.reputation.warningAcknowledged.trespass).toBe(true);
    expect(state.world.crimeEvents).toHaveLength(0);

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(attemptTrespassRestrictedRoom(state, 'bank records room')).toBe(true);
    expect(state.world.crimeEvents.at(-1)).toMatchObject({ type: 'trespass', severity: 'minor' });
    expect(state.player.reputation.guardAttention).toBeGreaterThan(0);
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

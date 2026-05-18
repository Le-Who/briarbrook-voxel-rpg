import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './GameState';
import { Simulation } from './Simulation';
import { AreaManager, resolveSafeSpawn } from '../world/AreaManager';

describe('transition and action state stability', () => {
  it('lets direct movement cancel a buffered approach action immediately', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'road';
    state.player.position = { x: -8, y: 0, z: 0 };
    state.player.activeTargetId = 'enemy_bandit_1';
    const simulation = new Simulation(state);

    simulation.dispatch({ type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' });
    simulation.update(1 / 30);

    expect(simulation.state.realtime.pendingAction?.action.type).toBe('ATTACK_ENTITY');

    simulation.dispatch({ type: 'MOVE_BY', dx: 1, dz: 0 });
    simulation.update(1 / 30);

    expect(simulation.state.realtime.pendingAction).toBeNull();
    expect(simulation.state.player.targetPosition).toBeNull();
    expect(simulation.state.player.movement.intent).toEqual({ x: 1, z: 0 });
    expect(simulation.state.dev.stability.lastActionCancellationReason).toBe('Movement command cancelled approach.');
  });

  it('watchdogs buffered approaches when the target leaves the current area', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'road';
    state.player.position = { x: -8, y: 0, z: 0 };
    state.player.activeTargetId = 'enemy_bandit_1';
    const simulation = new Simulation(state);

    simulation.dispatch({ type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' });
    simulation.update(1 / 30);

    const bandit = simulation.state.entities.enemy_bandit_1;
    if (!bandit || bandit.kind !== 'enemy') throw new Error('test enemy missing');
    bandit.area = 'town';
    simulation.update(1 / 30);

    expect(simulation.state.realtime.pendingAction).toBeNull();
    expect(simulation.state.player.targetPosition).toBeNull();
    expect(simulation.state.player.activeTargetId).toBeNull();
    expect(simulation.state.ui.prompt).toBe('Target is no longer available.');
    expect(simulation.state.dev.stability.lastActionCancellationReason).toBe('Target is no longer available.');
  });

  it('resolves safe portal spawns away from occupied portal trigger tiles', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    const requestedExit = { x: -8, y: 0, z: -2 };
    const resolved = resolveSafeSpawn(state, areaManager, 'town', requestedExit, 3, {
      avoidPortalIds: ['portal_bank']
    });

    expect(resolved.position).not.toEqual(requestedExit);
    expect(resolved.usedFallback).toBe(true);
    expect(areaManager.isBlockedInArea(state, 'town', resolved.position.x, resolved.position.z)).toBe(false);
    expect(Math.hypot(resolved.position.x - requestedExit.x, resolved.position.z - requestedExit.z)).toBeGreaterThanOrEqual(1);
  });

  it('clears transition state and avoids reverse portal overlap when exiting an interior', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'bank';
    state.player.position = { x: 0, y: 0, z: 5.5 };
    state.player.activeTargetId = 'enemy_bandit_1';
    state.ui.hoverTarget = { kind: 'entity', entityId: 'portal_town_bank' };
    state.realtime.pendingAction = {
      action: { type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' },
      target: { kind: 'entity', entityId: 'enemy_bandit_1' },
      range: 1.45,
      createdAt: 0,
      expiresAt: 8,
      label: 'Approaching to strike...'
    };
    const simulation = new Simulation(state);

    simulation.dispatch({ type: 'INTERACT_ENTITY', entityId: 'portal_town_bank' });
    simulation.update(1 / 30);

    expect(simulation.state.player.currentArea).toBe('town');
    expect(simulation.state.player.actionState.kind).toBe('idle');
    expect(simulation.state.realtime.pendingAction).toBeNull();
    expect(simulation.state.player.activeTargetId).toBeNull();
    expect(simulation.state.ui.hoverTarget).toBeNull();
    expect(simulation.state.player.position).not.toEqual({ x: -8, y: 0, z: -2 });
    expect(simulation.state.dev.stability.currentPortalId).toBe('portal_town_bank');
    expect(simulation.state.dev.stability.lastTransition).toMatchObject({ from: 'bank', to: 'town' });
    expect(simulation.state.dev.stability.safeSpawnFallbackCount).toBeGreaterThan(0);
  });

  it('survives repeated bank and smithy enter/exit cycles without stale action state', () => {
    const simulation = new Simulation(createInitialGameState());
    const cycles = [
      { enter: 'portal_bank', exit: 'portal_town_bank', area: 'bank' },
      { enter: 'portal_smith', exit: 'portal_town_smith', area: 'blacksmith' }
    ] as const;

    for (const cycle of cycles) {
      for (let count = 0; count < 20; count += 1) {
        const townPortal = simulation.state.entities[cycle.enter];
        if (!townPortal || townPortal.kind !== 'portal') throw new Error(`Missing ${cycle.enter}`);
        simulation.state.player.currentArea = 'town';
        simulation.state.player.position = { ...townPortal.position };

        simulation.dispatch({ type: 'INTERACT_ENTITY', entityId: cycle.enter });
        simulation.update(1 / 30);

        expect(simulation.state.player.currentArea).toBe(cycle.area);
        expect(simulation.state.realtime.pendingAction).toBeNull();
        expect(simulation.state.player.actionState.kind).toBe('idle');
        expect(simulation.areaManager.isBlockedInArea(simulation.state, cycle.area, simulation.state.player.position.x, simulation.state.player.position.z)).toBe(false);

        const exitPortal = simulation.state.entities[cycle.exit];
        if (!exitPortal || exitPortal.kind !== 'portal') throw new Error(`Missing ${cycle.exit}`);
        simulation.state.player.position = { ...exitPortal.position };
        simulation.state.ui.hoverTarget = { kind: 'entity', entityId: cycle.exit };
        simulation.state.realtime.pendingAction = {
          action: { type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' },
          target: { kind: 'entity', entityId: 'enemy_bandit_1' },
          range: 1.45,
          createdAt: simulation.state.clock,
          expiresAt: simulation.state.clock + 8,
          label: 'Approaching to strike...'
        };

        simulation.dispatch({ type: 'INTERACT_ENTITY', entityId: cycle.exit });
        simulation.update(1 / 30);

        expect(simulation.state.player.currentArea).toBe('town');
        expect(simulation.state.realtime.pendingAction).toBeNull();
        expect(simulation.state.player.activeTargetId).toBeNull();
        expect(simulation.state.ui.hoverTarget).toBeNull();
        expect(simulation.areaManager.isBlockedInArea(simulation.state, 'town', simulation.state.player.position.x, simulation.state.player.position.z)).toBe(false);
      }
    }
  });
});

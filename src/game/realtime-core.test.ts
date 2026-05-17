import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './GameState';
import { Simulation } from './Simulation';

function makeSimulation(): Simulation {
  return new Simulation(createInitialGameState());
}

describe('modern real-time simulation core', () => {
  it('queues dispatched gameplay actions and processes them on fixed ticks', () => {
    const simulation = makeSimulation();
    const startClock = simulation.state.clock;

    simulation.dispatch({ type: 'MOVE_TO', position: { x: 3.2, y: 0, z: 4.8 } });

    expect(simulation.state.player.targetPosition).toBeNull();
    expect(simulation.state.realtime.actionQueue).toHaveLength(1);

    simulation.update(0.005);
    expect(simulation.state.clock).toBe(startClock);
    expect(simulation.state.player.targetPosition).toBeNull();

    simulation.update(1 / 30);
    expect(simulation.state.clock).toBeCloseTo(startClock + 1 / 30, 5);
    expect(simulation.state.player.targetPosition).toEqual({ x: 3, y: 0, z: 5 });
    expect(simulation.state.realtime.actionHistory[0]).toMatchObject({
      type: 'MOVE_TO',
      createdAt: startClock,
      processedAt: startClock + 1 / 30
    });
  });

  it('tracks continuous movement velocity separately from grid-addressable target tiles', () => {
    const simulation = makeSimulation();
    const start = { ...simulation.state.player.position };

    simulation.dispatch({ type: 'MOVE_BY', dx: 1, dz: 0 });
    simulation.update(1 / 30);

    expect(simulation.state.player.position.x).toBeGreaterThan(start.x);
    expect(simulation.state.player.position.x - start.x).toBeLessThan(0.25);
    expect(simulation.state.player.movement.velocity.x).toBeGreaterThan(0);
    expect(simulation.state.player.movement.tile).toEqual({
      x: Math.round(simulation.state.player.position.x),
      z: Math.round(simulation.state.player.position.z)
    });
  });

  it('buffers one approach action and resolves it when the player reaches range', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'road';
    state.player.position = { x: -8, y: 0, z: 0 };
    state.player.activeTargetId = 'enemy_bandit_1';
    const simulation = new Simulation(state);

    simulation.dispatch({ type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' });
    simulation.update(1 / 30);

    expect(simulation.state.realtime.pendingAction?.action.type).toBe('ATTACK_ENTITY');
    expect(simulation.state.player.targetPosition).not.toBeNull();
    expect(simulation.state.player.actionState.kind).toBe('moving');

    const target = simulation.state.entities.enemy_bandit_1;
    if (!target || target.kind !== 'enemy') throw new Error('test enemy missing');
    simulation.state.player.position = { x: target.position.x - 0.9, y: 0, z: target.position.z };
    simulation.state.player.movement.velocity = { x: 0, z: 0 };
    simulation.update(1 / 30);

    expect(simulation.state.realtime.pendingAction).toBeNull();
    expect(simulation.state.combat.lastAttackAt).toBeGreaterThan(0);
    expect(simulation.state.player.actionState.kind).toBe('attacking');
  });
});

import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { Simulation } from '../game/Simulation';
import { meleeAttack } from './CombatSystem';
import { castSpellIntent } from './SpellSystem';
import { gatherResource } from './InteractionSystem';
import type { GameState } from '../game/types';

function facingOf(state: GameState) {
  return (state.player as unknown as { facing?: { facingYaw: number; desiredFacingYaw: number; lastFacingSource: string } }).facing;
}

function angleDelta(a: number, b: number): number {
  return ((((a - b) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

function expectAngle(actual: number | undefined, expected: number): void {
  expect(actual).toBeTypeOf('number');
  expect(Math.abs(angleDelta(actual ?? 0, expected))).toBeLessThan(0.001);
}

describe('facing state', () => {
  it('stores responsive movement facing and keeps the last yaw when stopping', () => {
    const simulation = new Simulation(createInitialGameState());

    simulation.dispatch({ type: 'MOVE_BY', dx: 1, dz: 0 });
    simulation.update(1 / 30);

    const moving = facingOf(simulation.state);
    expect(moving?.lastFacingSource).toBe('movement');
    expectAngle(moving?.desiredFacingYaw, Math.PI / 2);
    expect((moving?.facingYaw ?? 0)).toBeGreaterThan(0);

    simulation.dispatch({ type: 'STOP_MOVE' });
    simulation.update(1 / 30);

    const stopped = facingOf(simulation.state);
    expect(stopped?.lastFacingSource).toBe('movement');
    expect((stopped?.desiredFacingYaw ?? 0)).toBeGreaterThan(0);
  });

  it('faces combat and spell targets at action start', () => {
    const state = createInitialGameState();
    const enemy = state.entities.enemy_bandit_1;
    if (!enemy || enemy.kind !== 'enemy') throw new Error('Expected road enemy fixture.');
    state.player.currentArea = 'road';
    state.player.position = { x: 0, y: 0, z: 0 };
    enemy.position = { x: -1, y: 0, z: 0 };

    meleeAttack(state, enemy.id);
    expect(facingOf(state)?.lastFacingSource).toBe('target');
    expectAngle(facingOf(state)?.desiredFacingYaw, -Math.PI / 2);

    enemy.position = { x: 2, y: 0, z: 2 };
    castSpellIntent(state, 'magic_arrow', { kind: 'entity', entityId: enemy.id });
    expect(facingOf(state)?.lastFacingSource).toBe('cast');
    expectAngle(facingOf(state)?.desiredFacingYaw, Math.PI / 4);
  });

  it('faces resources while gathering', () => {
    const state = createInitialGameState();
    const resource = Object.values(state.entities).find((entity) => entity.kind === 'resource');
    if (!resource || resource.kind !== 'resource') throw new Error('Expected resource fixture.');
    state.player.currentArea = resource.area;
    state.player.position = { x: 0, y: 0, z: 0 };
    resource.position = { x: 0, y: 0, z: -1 };

    gatherResource(state, resource.id);

    expect(facingOf(state)?.lastFacingSource).toBe('gathering');
    expectAngle(facingOf(state)?.desiredFacingYaw, Math.PI);
  });
});

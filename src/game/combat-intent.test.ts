import { describe, expect, it } from 'vitest';
import { createInitialGameState, createStack } from './GameState';
import { Simulation } from './Simulation';

function roadCombatSimulation(): Simulation {
  const state = createInitialGameState();
  state.player.currentArea = 'road';
  state.player.position = { x: -8, y: 0, z: 0 };
  state.player.activeTargetId = 'enemy_bandit_1';
  return new Simulation(state);
}

describe('combat intent and auto-approach preferences', () => {
  it('defaults to assist mode without auto-attacking on target selection', () => {
    const state = createInitialGameState();

    expect(state.player.combatPreferences).toMatchObject({
      approachMode: 'assist',
      autoAttackOnTargetSelect: false,
      stopMovementWhenCasting: true
    });
  });

  it('selects hostile focus without starting movement or attack intent', () => {
    const simulation = roadCombatSimulation();

    simulation.dispatch({ type: 'SELECT_ENTITY', entityId: 'enemy_bandit_1' });
    simulation.update(1 / 30);

    expect(simulation.state.player.activeTargetId).toBe('enemy_bandit_1');
    expect(simulation.state.ui.selectedTarget).toEqual({ kind: 'entity', entityId: 'enemy_bandit_1' });
    expect(simulation.state.realtime.pendingAction).toBeNull();
    expect(simulation.state.player.targetPosition).toBeNull();
    expect(simulation.state.ui.prompt).toBe('Target selected.');
  });

  it('blocks auto-approach for manual combat mode', () => {
    const simulation = roadCombatSimulation();
    simulation.state.player.combatPreferences.approachMode = 'manual';

    simulation.dispatch({ type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' });
    simulation.update(1 / 30);

    expect(simulation.state.realtime.pendingAction).toBeNull();
    expect(simulation.state.player.targetPosition).toBeNull();
    expect(simulation.state.ui.prompt).toBe('Auto-approach is disabled.');
  });

  it('keeps assist mode convenient for melee attacks that need range', () => {
    const simulation = roadCombatSimulation();

    simulation.dispatch({ type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' });
    simulation.update(1 / 30);

    expect(simulation.state.realtime.pendingAction?.action.type).toBe('ATTACK_ENTITY');
    expect(simulation.state.player.targetPosition).not.toBeNull();
    expect(simulation.state.ui.prompt).toContain('Moving into range');
  });

  it('moves bow attacks only into preferred bow range, not melee range', () => {
    const simulation = roadCombatSimulation();
    simulation.state.player.equipment.weapon = createStack('simple_bow');
    const target = simulation.state.entities.enemy_bandit_1;
    if (!target || target.kind !== 'enemy') throw new Error('test enemy missing');

    simulation.dispatch({ type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' });
    simulation.update(1 / 30);

    expect(simulation.state.realtime.pendingAction?.range).toBeGreaterThanOrEqual(7.5);
    expect(simulation.state.player.targetPosition).not.toBeNull();
    expect(Math.hypot(simulation.state.player.targetPosition!.x - target.position.x, simulation.state.player.targetPosition!.z - target.position.z)).toBeGreaterThanOrEqual(5.5);
    expect(simulation.state.ui.prompt).toContain('Moving into bow range');
  });

  it('does not auto-approach out-of-range spells in assist mode', () => {
    const simulation = roadCombatSimulation();

    simulation.dispatch({ type: 'CAST_SPELL', spellId: 'magic_arrow', entityId: 'enemy_bandit_1' });
    simulation.update(1 / 30);

    expect(simulation.state.realtime.pendingAction).toBeNull();
    expect(simulation.state.player.targetPosition).toBeNull();
    expect(simulation.state.ui.prompt).toBe('Out of range.');
  });
});

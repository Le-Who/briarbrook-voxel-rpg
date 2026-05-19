import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './GameState';
import { Simulation } from './Simulation';

function makeSimulation(mode: 'keyboard' | 'mouse' | 'keyboardMouse' = 'keyboard'): Simulation {
  const state = createInitialGameState();
  state.ui.movementMode = mode;
  return new Simulation(state);
}

describe('movement mode input contract', () => {
  it('defaults to keyboard-only movement', () => {
    const state = createInitialGameState();

    expect(state.ui.movementMode).toBe('keyboard');
  });

  it('allows keyboard movement and blocks ground click movement in keyboard-only mode', () => {
    const simulation = makeSimulation('keyboard');
    const start = { ...simulation.state.player.position };

    simulation.dispatch({ type: 'MOVE_TO', position: { x: 3, y: 0, z: 5 } });
    simulation.update(1 / 30);

    expect(simulation.state.player.targetPosition).toBeNull();
    expect(simulation.state.ui.prompt).toBe('Mouse movement disabled in Keyboard Only mode.');

    simulation.dispatch({ type: 'MOVE_BY', dx: 1, dz: 0 });
    simulation.update(1 / 30);

    expect(simulation.state.player.position.x).toBeGreaterThan(start.x);
    expect(simulation.state.player.movement.intent).toMatchObject({ x: 1, z: 0 });
  });

  it('allows click-to-move and ignores WASD movement in mouse-only mode', () => {
    const simulation = makeSimulation('mouse');
    const start = { ...simulation.state.player.position };

    simulation.dispatch({ type: 'MOVE_BY', dx: 1, dz: 0 });
    simulation.update(1 / 30);

    expect(simulation.state.player.position.x).toBe(start.x);
    expect(simulation.state.player.movement.intent).toBeNull();
    expect(simulation.state.ui.prompt).toBe('Keyboard movement disabled in Mouse Only mode.');

    simulation.dispatch({ type: 'MOVE_TO', position: { x: 3, y: 0, z: 5 } });
    simulation.update(1 / 30);

    expect(simulation.state.player.targetPosition).toEqual({ x: 3, y: 0, z: 5 });
  });

  it('supports both input styles and lets keyboard input cancel click paths', () => {
    const simulation = makeSimulation('keyboardMouse');

    simulation.dispatch({ type: 'MOVE_TO', position: { x: 3, y: 0, z: 5 } });
    simulation.update(1 / 30);
    expect(simulation.state.player.targetPosition).toEqual({ x: 3, y: 0, z: 5 });

    simulation.dispatch({ type: 'MOVE_BY', dx: -1, dz: 0 });
    simulation.update(1 / 30);

    expect(simulation.state.player.targetPosition).toBeNull();
    expect(simulation.state.player.movement.path).toEqual([]);
    expect(simulation.state.player.movement.intent).toMatchObject({ x: -1, z: 0 });
  });

  it('applies movement mode changes immediately without canceling combat approach', () => {
    const simulation = makeSimulation('mouse');

    simulation.dispatch({ type: 'MOVE_TO', position: { x: 3, y: 0, z: 5 } });
    simulation.update(1 / 30);
    expect(simulation.state.player.targetPosition).not.toBeNull();

    simulation.dispatch({ type: 'SET_MOVEMENT_MODE', mode: 'keyboard' });
    simulation.update(1 / 30);

    expect(simulation.state.ui.movementMode).toBe('keyboard');
    expect(simulation.state.player.targetPosition).toBeNull();
    expect(simulation.state.ui.prompt).toBe('Movement mode: Keyboard Only.');

    simulation.state.player.currentArea = 'road';
    simulation.state.player.position = { x: -8, y: 0, z: 0 };
    simulation.state.player.activeTargetId = 'enemy_bandit_1';
    simulation.dispatch({ type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' });
    simulation.update(1 / 30);
    expect(simulation.state.realtime.pendingAction?.action.type).toBe('ATTACK_ENTITY');
    expect(simulation.state.player.targetPosition).not.toBeNull();

    simulation.dispatch({ type: 'SET_MOVEMENT_MODE', mode: 'keyboard' });
    simulation.update(1 / 30);
    expect(simulation.state.realtime.pendingAction?.action.type).toBe('ATTACK_ENTITY');
    expect(simulation.state.player.targetPosition).not.toBeNull();
  });

  it('keeps target selection separate from movement and exposes camera-relative movement', () => {
    const simulation = makeSimulation('keyboardMouse');
    simulation.state.player.currentArea = 'road';

    simulation.dispatch({ type: 'SELECT_ENTITY', entityId: 'enemy_bandit_1' });
    simulation.dispatch({ type: 'TOGGLE_CAMERA_RELATIVE_MOVEMENT' });
    simulation.update(1 / 30);

    expect(simulation.state.player.activeTargetId).toBe('enemy_bandit_1');
    expect(simulation.state.player.targetPosition).toBeNull();
    expect(simulation.state.ui.cameraRelativeMovement).toBe(false);
    expect(simulation.state.ui.prompt).toBe('World-axis movement enabled.');
  });
});

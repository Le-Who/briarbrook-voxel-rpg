import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './GameState';
import { CameraController } from './CameraController';

describe('camera usability controller', () => {
  it('clamps zoom and reports readable interior/dungeon zoom targets', () => {
    const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 1000);
    const controller = new CameraController(camera);
    const state = createInitialGameState();

    controller.setZoom(-100);
    expect(controller.getZoom()).toBe(11);

    state.player.currentArea = 'bank';
    controller.update(state, 1);
    expect(controller.getDebugState().desiredZoom).toBeLessThan(15);

    state.player.currentArea = 'crypt';
    controller.update(state, 1);
    expect(controller.getDebugState().desiredZoom).toBeLessThanOrEqual(15.5);

    controller.setZoom(100);
    expect(controller.getZoom()).toBe(24);
  });

  it('leads the camera in movement direction and frames selected combat target', () => {
    const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 1000);
    const controller = new CameraController(camera);
    const state = createInitialGameState();
    state.player.currentArea = 'road';
    state.player.position = { x: -4, y: 0, z: 0 };
    state.player.movement.velocity = { x: 4, z: 0 };
    state.player.activeTargetId = 'enemy_bandit_1';

    controller.update(state, 1);
    const debug = controller.getDebugState();

    expect(debug.focus.x).toBeGreaterThan(state.player.position.x);
    expect(debug.focus.x).toBeLessThan(state.entities.enemy_bandit_1.position.x);
    expect(camera.position.x).toBeCloseTo(debug.focus.x + debug.offset.x, 4);
  });
});

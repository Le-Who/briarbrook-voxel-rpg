import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { summarizeWorldDensity } from './WorldDensitySystem';

describe('world density without map bloat', () => {
  it('keeps density inside the existing Briarbrook loop', () => {
    const state = createInitialGameState();

    const density = summarizeWorldDensity(state);

    expect(Object.keys(density).sort()).toEqual(['crypt', 'forest', 'housing', 'road', 'town']);
    for (const area of Object.values(density)) {
      expect(area.meaningfulInteractions).toBeGreaterThanOrEqual(3);
      expect(area.landmarks.length).toBeGreaterThan(0);
      expect(area.servicesOrResources.length).toBeGreaterThan(0);
      expect(area.risksOrObstacles.length).toBeGreaterThan(0);
      expect(area.secretsOrSideInteractions.length).toBeGreaterThan(0);
      expect(area.revisitHooks.length).toBeGreaterThan(0);
    }

    expect(density.road.secretsOrSideInteractions).toEqual(expect.arrayContaining(['Roadside Shrine', 'Hidden Road Cache', 'Fresh Bandit Tracks']));
    expect(density.forest.servicesOrResources).toEqual(expect.arrayContaining(['Ancient Yew', 'Hunter Camp Supplies']));
    expect(density.crypt.risksOrObstacles).toEqual(expect.arrayContaining(['Crypt Bone Captain', 'Collapsed Mine Side Room']));
    expect(density.housing.revisitHooks).toEqual(expect.arrayContaining(['Starter Resource Crate', 'Workbench Frame', 'Trophy Hook']));
  });
});

import { describe, expect, it } from 'vitest';
import { areas } from '../data/areas';
import type { AreaId } from '../game/types';
import { areaDensityArtKits, densityClearanceZones, proceduralDensityProps, summarizeAreaDensity } from './AreaDensityArtKit';

const authoredAreas: AreaId[] = ['town', 'road', 'forest', 'crypt', 'housing'];

describe('world density art kit pass', () => {
  it('organizes the required modular kits for existing areas', () => {
    const kitIds = areaDensityArtKits.map((kit) => kit.id);

    expect(kitIds).toEqual(
      expect.arrayContaining([
        'town-stone-path',
        'timber-house-walls',
        'roof-variants',
        'market-props',
        'forest-vegetation',
        'mine-props',
        'crypt-props',
        'road-props',
        'housing-plot-props'
      ])
    );
    expect(new Set(areaDensityArtKits.map((kit) => kit.id)).size).toBe(areaDensityArtKits.length);
    areaDensityArtKits.forEach((kit) => {
      expect(kit.builders.length, kit.id).toBeGreaterThan(0);
      expect(kit.sharedMaterialKeys.length, kit.id).toBeGreaterThan(0);
      expect(kit.instancingStrategy, kit.id).toMatch(/instanced|batched/);
      expect(areas[kit.area], kit.id).toBeDefined();
    });
  });

  it('sets density targets for landmarks, affordances, path readability, and camera-safe space', () => {
    for (const area of authoredAreas) {
      const summary = summarizeAreaDensity(area);

      expect(summary.totalProps, area).toBeGreaterThanOrEqual(8);
      expect(summary.landmarkProps, area).toBeGreaterThanOrEqual(1);
      expect(summary.affordanceProps, area).toBeGreaterThanOrEqual(1);
      expect(summary.pathReadabilityProps, area).toBeGreaterThanOrEqual(2);
      expect(summary.cameraSafeProps, area).toBe(summary.totalProps);
    }
  });

  it('keeps procedural props batched, nonblocking, and outside gameplay clearance zones', () => {
    expect(proceduralDensityProps.length).toBeGreaterThanOrEqual(52);
    expect(new Set(proceduralDensityProps.map((prop) => prop.id)).size).toBe(proceduralDensityProps.length);

    for (const prop of proceduralDensityProps) {
      expect(prop.blocksMovement, prop.id).toBe(false);
      expect(prop.sharedBatch, prop.id).toBe(true);
      expect(prop.cameraSafe, prop.id).toBe(true);
      const bounds = areaBounds(prop.area);
      expect(prop.x, prop.id).toBeGreaterThanOrEqual(bounds.minX);
      expect(prop.x, prop.id).toBeLessThanOrEqual(bounds.maxX);
      expect(prop.z, prop.id).toBeGreaterThanOrEqual(bounds.minZ);
      expect(prop.z, prop.id).toBeLessThanOrEqual(bounds.maxZ);
      densityClearanceZones
        .filter((zone) => zone.area === prop.area)
        .forEach((zone) => {
          expect(Math.hypot(prop.x - zone.x, prop.z - zone.z), `${prop.id} overlaps ${zone.reason}`).toBeGreaterThanOrEqual(zone.radius);
        });
    }
  });

  it('limits unique procedural shapes while allowing rotation and material variants', () => {
    const kinds = new Set(proceduralDensityProps.map((prop) => prop.kind));
    const materialVariants = new Set(proceduralDensityProps.map((prop) => prop.materialVariant));
    const rotatedCount = proceduralDensityProps.filter((prop) => Math.abs(prop.rotation) > 0.01).length;

    expect(kinds.size).toBeLessThanOrEqual(12);
    expect(materialVariants.size).toBeGreaterThanOrEqual(8);
    expect(rotatedCount).toBeGreaterThanOrEqual(18);
  });
});

function areaBounds(area: AreaId): { minX: number; maxX: number; minZ: number; maxZ: number } {
  if (area === 'town') return { minX: -22, maxX: 22, minZ: -18, maxZ: 18 };
  if (area === 'forest') return { minX: -18, maxX: 18, minZ: -16, maxZ: 16 };
  if (area === 'crypt') return { minX: -15, maxX: 15, minZ: -12, maxZ: 12 };
  if (area === 'road') return { minX: -18, maxX: 18, minZ: -14, maxZ: 14 };
  if (area === 'housing') return { minX: -15, maxX: 15, minZ: -12, maxZ: 12 };
  return { minX: -7, maxX: 7, minZ: -5, maxZ: 7 };
}

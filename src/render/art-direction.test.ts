import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { areaAmbient } from './Materials';
import { createInitialRenderStats, estimateRenderFrameMs, renderPerformanceBudget, renderStatsWithinBudget } from './RenderBudgets';
import { VoxelKit, type VoxelBuilderOptions } from './VoxelKit';

describe('art direction consolidation', () => {
  it('keeps required procedural builders reusable and metadata-aware', () => {
    const kit = createTestKit();
    const builders: Record<string, (options: VoxelBuilderOptions) => THREE.Group> = {
      treeBuilder: (options) => kit.treeBuilder(options),
      rockBuilder: (options) => kit.rockBuilder(options),
      oreVeinBuilder: (options) => kit.oreVeinBuilder(options),
      timberHouseBuilder: (options) => kit.timberHouseBuilder({ ...options, width: 4, depth: 3 }),
      marketStallBuilder: (options) => kit.marketStallBuilder(options),
      lampPostBuilder: (options) => kit.lampPostBuilder(options),
      fenceBuilder: (options) => kit.fenceBuilder(options),
      bridgeBuilder: (options) => kit.bridgeBuilder(options),
      chestBuilder: (options) => kit.chestBuilder(options),
      dungeonColumnBuilder: (options) => kit.dungeonColumnBuilder(options),
      rubbleBuilder: (options) => kit.rubbleBuilder(options),
      forgeBuilder: (options) => kit.forgeBuilder(options),
      bannerBuilder: (options) => kit.bannerBuilder(options)
    };

    for (const [name, build] of Object.entries(builders)) {
      const group = build({
        seed: 41,
        variation: name,
        theme: 'crypt',
        wear: 0.35,
        damage: 0.45,
        colorVariation: 0.04,
        metadata: { source: 'art-direction-test' }
      });

      expect(meshCount(group), name).toBeGreaterThan(0);
      expect(group.userData.seed).toBe(41);
      expect(group.userData.variation).toBe(name);
      expect(group.userData.theme).toBe('crypt');
      expect(group.userData.metadata).toEqual({ source: 'art-direction-test' });
    }
  });

  it('keeps area ambient palettes distinct and mood-directed', () => {
    expect(areaAmbient.town.intensity).toBeGreaterThan(areaAmbient.crypt.intensity);
    expect(areaAmbient.forest.fog).not.toBe(areaAmbient.road.fog);
    expect(areaAmbient.housing.bg).not.toBe(areaAmbient.crypt.bg);
    expect(new Set(Object.values(areaAmbient).map((entry) => entry.bg)).size).toBeGreaterThan(4);
  });

  it('tracks render budget fields and flags over-budget scenes', () => {
    const initial = createInitialRenderStats();
    expect(initial.budget).toEqual(renderPerformanceBudget);
    expect(initial.memoryAfterTransitionMb).toBeNull();

    const heavierFrame = estimateRenderFrameMs({
      roughDrawCalls: 500,
      meshCount: 1400,
      triangles: 170000,
      raycastCandidateCount: 1000
    });
    expect(heavierFrame).toBeGreaterThan(renderPerformanceBudget.estimatedFrameMs);

    const result = renderStatsWithinBudget({
      ...initial,
      roughDrawCalls: renderPerformanceBudget.roughDrawCalls + 1,
      meshCount: renderPerformanceBudget.meshCount + 1,
      estimatedFrameMs: heavierFrame
    });

    expect(result.ok).toBe(false);
    expect(result.failures.some((failure) => failure.includes('draw calls'))).toBe(true);
    expect(result.failures.some((failure) => failure.includes('meshes'))).toBe(true);
  });
});

function createTestKit(): VoxelKit {
  const materials = new Map<string, THREE.Material>();
  return new VoxelKit({
    box(parent, x, y, z, sx, sy, sz, material, rotation = {}) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rotation.rx ?? 0, rotation.ry ?? 0, rotation.rz ?? 0);
      parent.add(mesh);
      return mesh;
    },
    material(name, color, options = {}) {
      const key = `${name}:${color}:${JSON.stringify(options)}`;
      const existing = materials.get(key);
      if (existing) return existing;
      const material = new THREE.MeshStandardMaterial({ color, ...options });
      materials.set(key, material);
      return material;
    }
  });
}

function meshCount(group: THREE.Group): number {
  let count = 0;
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) count += 1;
  });
  return count;
}

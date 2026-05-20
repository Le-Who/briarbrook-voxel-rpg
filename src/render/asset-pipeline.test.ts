import { describe, expect, it } from 'vitest';
import { itemDefs } from '../data/items';
import { visualPrefabs, visualPrefabById } from '../data/visualPrefabs';
import { validateContent } from '../tools/ContentValidation';
import { AssetManager } from './AssetManager';
import { createIconRenderRequest } from './IconPipeline';

describe('voxel asset pipeline registry', () => {
  it('defines high-value equipment prefabs with procedural fallbacks and icon camera presets', () => {
    const highValuePrefabIds = ['weapon:sword', 'weapon:bow', 'shield:round', 'armor:leather', 'pack:backpack'];

    highValuePrefabIds.forEach((id) => {
      const prefab = visualPrefabById[id];
      expect(prefab, id).toBeTruthy();
      expect(prefab.fallbackProceduralFactory, id).toBeTruthy();
      expect(prefab.iconCameraPreset, id).toBeTruthy();
      expect(prefab.attachPointDefaults.length, id).toBeGreaterThan(0);
    });
    expect(visualPrefabs.length).toBeGreaterThanOrEqual(5);
  });

  it('links starter equipment and tools to visual prefabs', () => {
    ['iron_sword', 'simple_bow', 'cracked_shield', 'leather_armor', 'backpack', 'axe', 'pickaxe'].forEach((itemId) => {
      const visualPrefabId = itemDefs[itemId]?.visualPrefabId;
      expect(visualPrefabId, itemId).toBeTruthy();
      expect(visualPrefabById[visualPrefabId!], itemId).toBeTruthy();
    });
  });

  it('keeps the torch registry entry honest about its procedural runtime source', () => {
    expect(visualPrefabById['tool:torch']).toMatchObject({
      sourceTool: 'procedural',
      sourcePath: null,
      fallbackProceduralFactory: 'torchBox',
      lodPolicy: 'procedural-only'
    });
  });

  it('fails gracefully when exported runtime models are not present yet', async () => {
    const manager = new AssetManager();

    await expect(manager.loadRuntimeModel('weapon:sword')).resolves.toBeNull();
    await expect(manager.loadRuntimeModel('missing:prefab')).resolves.toBeNull();
    expect(manager.getProceduralFallbackId('weapon:sword')).toBe('swordBox');
    manager.dispose();
  });

  it('creates icon render requests from visual prefab metadata', () => {
    const request = createIconRenderRequest('iron_sword');

    expect(request).toMatchObject({
      itemId: 'iron_sword',
      visualPrefabId: 'weapon:sword',
      cameraPreset: 'tall-tool',
      transparentBackground: true,
      rarityOverlay: 'separate-layer'
    });
  });

  it('includes visual prefab validation in the content gate', () => {
    const validation = validateContent();

    expect(validation.errors.filter((error) => error.includes('visual prefab'))).toEqual([]);
  });
});

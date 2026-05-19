import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { loadGame, saveGame } from '../game/SaveLoad';
import type { ResourceNodeEntity } from '../game/types';
import { resourceTileKey } from '../data/resourceMaps';
import { treeHarvestAuditCounts } from '../data/treeResources';
import { AreaManager } from '../world/AreaManager';
import { describeInteraction } from './InteractionAffordanceSystem';
import { resourceTileForEntity, useToolOnTarget } from './ResourceSystem';

describe('systemic tree harvestability', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key)
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('registers forest tree visuals as matching resource tiles', () => {
    const state = createInitialGameState();
    const forestTrees = resourceTrees(state).filter((entity) => entity.area === 'forest');
    const forestTreeTiles = Object.values(state.world.resourceTiles).filter((tile) => tile.areaId === 'forest' && tile.resourceKind === 'tree');

    expect(treeHarvestAuditCounts.forestVisualTrees).toBeGreaterThanOrEqual(45);
    expect(forestTreeTiles.length).toBeGreaterThanOrEqual(Math.floor(forestTrees.length * 0.9));
    for (const tree of forestTrees) {
      const tile = state.world.resourceTiles[resourceTileKey(tree.area, tree.position.x, tree.position.z, 'tree')];
      expect(tile, tree.id).toBeTruthy();
      expect(tile.entityId).toBe(tree.id);
      expect(tile.protected).toBe(false);
    }
  });

  it('keeps town trees protected with explicit affordance text', () => {
    const state = createInitialGameState();
    const tree = resourceTrees(state).find((entity) => entity.area === 'town' && entity.protected);
    if (!tree) throw new Error('expected protected town tree');

    const normal = describeInteraction(state, { kind: 'entity', entityId: tree.id });
    expect(normal?.valid).toBe(false);
    expect(normal?.prompt).toBe('Town Tree - Protected Tree');

    state.ui.targeting = { mode: 'tool', toolItemId: 'axe', prompt: 'Select a tree.' };
    const targeting = describeInteraction(state, { kind: 'entity', entityId: tree.id });
    expect(targeting?.valid).toBe(false);
    expect(targeting?.prompt).toBe('Town Tree - Protected Tree');

    state.player.currentArea = 'town';
    state.player.position = { x: tree.position.x + 1, y: 0, z: tree.position.z };
    useToolOnTarget(state, new AreaManager(), 'axe', { kind: 'entity', entityId: tree.id });
    expect(state.ui.prompt).toContain('Town tree is protected.');
  });

  it('syncs tree depletion between target entity and ResourceMap tile', () => {
    const state = createInitialGameState();
    const tree = resourceTrees(state).find((entity) => entity.area === 'road' && !entity.protected);
    if (!tree) throw new Error('expected roadside tree');
    const tile = resourceTileForEntity(state, tree);
    tile.harvestsRemaining = 1;
    state.clock = 100;
    state.player.currentArea = tree.area;
    state.player.position = { x: tree.position.x + 1, y: 0, z: tree.position.z };
    state.player.skills.Lumberjacking.value = 100;
    vi.spyOn(Math, 'random').mockReturnValue(0);

    useToolOnTarget(state, new AreaManager(), 'axe', { kind: 'entity', entityId: tree.id });

    expect(tree.depleted).toBe(true);
    expect(tree.blocksMovement).toBe(false);
    expect(tile.harvestsRemaining).toBe(0);
    expect(tile.depletedUntil).toBeGreaterThan(state.clock);
    expect(tile.visualState).toBe('stump');
  });

  it('preserves tree ResourceMap state across save/load while adding missing systemic trees', () => {
    const state = createInitialGameState();
    const tree = resourceTrees(state).find((entity) => entity.id.startsWith('res_tree_forest_'));
    if (!tree) throw new Error('expected systemic forest tree');
    const key = resourceTileKey(tree.area, tree.position.x, tree.position.z, 'tree');
    state.world.resourceTiles[key].depletedUntil = 250;
    state.world.resourceTiles[key].harvestsRemaining = 0;
    state.world.resourceTiles[key].visualState = 'stump';

    saveGame(state);
    const loaded = loadGame();

    expect(loaded.entities[tree.id]).toBeTruthy();
    expect(loaded.world.resourceTiles[key]).toMatchObject({
      depletedUntil: 250,
      harvestsRemaining: 0,
      visualState: 'stump',
      entityId: tree.id
    });
  });
});

function resourceTrees(state: ReturnType<typeof createInitialGameState>): ResourceNodeEntity[] {
  return Object.values(state.entities).filter((entity): entity is ResourceNodeEntity => entity.kind === 'resource' && entity.resourceType === 'tree');
}

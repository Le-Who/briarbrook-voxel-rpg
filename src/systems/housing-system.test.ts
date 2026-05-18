import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { AreaManager } from '../world/AreaManager';
import { beginMoveLastBuilding, placeBuilding, updateBuildGhost } from './BuildingSystem';
import { buildPieces } from '../data/items';
import { getHousingPieceDefinition } from '../data/housing';
import { addItem, getItemCount } from './InventorySystem';
import { claimStarterPlot, depositSelectedToHousingStorage, housingStorages, selectedHousingStorage, undoLastHousingPlacement, upgradeHousingTier, withdrawFromHousingStorage } from './HousingSystem';
import { startCraft } from './CraftingSystem';

function setupHousing() {
  const state = createInitialGameState();
  const areaManager = new AreaManager();
  state.player.currentArea = 'housing';
  state.player.position = { x: -4, y: 0, z: -3 };
  state.player.gold = 200;
  addItem(state.player.inventory, 'wood', 10);
  addItem(state.player.inventory, 'stone_block', 10);
  addItem(state.player.inventory, 'iron_bar', 3);
  addItem(state.player.inventory, 'logs', 6);
  claimStarterPlot(state);
  return { state, areaManager };
}

function placePiece(pieceId: string, x: number, z: number) {
  const { state, areaManager } = setupHousing();
  state.buildMode.selectedPieceId = pieceId;
  updateBuildGhost(state, areaManager, { x, y: 0, z });
  const placed = placeBuilding(state, areaManager);
  return { state, areaManager, placed };
}

describe('housing workshop progression', () => {
  it('defines tier 0 camp identity pieces and tier 1 workshop storage', () => {
    expect(getHousingPieceDefinition('crate')).toMatchObject({ minTier: 0, functionType: 'storage' });
    expect(getHousingPieceDefinition('crate').storage?.slots).toBeGreaterThanOrEqual(4);
    expect(buildPieces.some((piece) => piece.id === 'small_trophy_hook')).toBe(true);
    expect(getHousingPieceDefinition('small_trophy_hook')).toMatchObject({ minTier: 0, functionType: 'trophy' });

    expect(buildPieces.some((piece) => piece.id === 'reinforced_chest')).toBe(true);
    expect(getHousingPieceDefinition('reinforced_chest')).toMatchObject({ minTier: 1, functionType: 'storage' });
    expect(getHousingPieceDefinition('reinforced_chest').storage?.slots).toBeGreaterThan(getHousingPieceDefinition('small_chest').storage?.slots ?? 0);
  });

  it('claims the starter plot and places functional storage with stable storage state', () => {
    const { state, placed } = placePiece('small_chest', 0, 0);

    expect(placed).toBe(true);
    expect(state.world.housing.ownedPlotId).toBe('plot_briarbrook_starter');
    expect(state.world.placedBuildings).toHaveLength(1);
    const building = state.world.placedBuildings[0];
    expect(building.ownerId).toBe('player');
    expect(building.plotId).toBe('plot_briarbrook_starter');
    expect(building.storageId).toBe(`storage_${building.id}`);
    expect(state.world.housing.storages[building.storageId!].inventory.capacity).toBe(8);
    expect(getItemCount(state.player.inventory, 'wood')).toBe(6);
  });

  it('moves items into and out of home storage without duplication or loss', () => {
    const { state } = placePiece('small_chest', 0, 0);
    const storage = selectedHousingStorage(state);
    if (!storage) throw new Error('storage missing');
    const slot = state.player.inventory.slots.findIndex((stack) => stack?.itemId === 'logs');
    const totalBefore = getItemCount(state.player.inventory, 'logs') + getItemCount(storage.inventory, 'logs');

    expect(depositSelectedToHousingStorage(state, slot, storage.id)).toBe(true);
    expect(getItemCount(state.player.inventory, 'logs') + getItemCount(storage.inventory, 'logs')).toBe(totalBefore);
    expect(getItemCount(storage.inventory, 'logs')).toBeGreaterThan(0);

    const storageSlot = storage.inventory.slots.findIndex((stack) => stack?.itemId === 'logs');
    expect(withdrawFromHousingStorage(state, storage.id, storageSlot)).toBe(true);
    expect(getItemCount(state.player.inventory, 'logs') + getItemCount(storage.inventory, 'logs')).toBe(totalBefore);
    expect(getItemCount(storage.inventory, 'logs')).toBe(0);
  });

  it('enforces storage filters for resource crates', () => {
    const { state, areaManager } = setupHousing();
    state.player.completedQuestIds.push('prepare_for_road');
    addItem(state.player.inventory, 'wood', 12);
    expect(upgradeHousingTier(state)).toBe(true);
    state.buildMode.selectedPieceId = 'resource_crate';
    updateBuildGhost(state, areaManager, { x: 0, y: 0, z: 0 });
    expect(placeBuilding(state, areaManager)).toBe(true);
    const storage = housingStorages(state)[0];
    const swordSlot = state.player.inventory.slots.findIndex((stack) => stack?.itemId === 'iron_sword');
    const logsSlot = state.player.inventory.slots.findIndex((stack) => stack?.itemId === 'logs');

    expect(depositSelectedToHousingStorage(state, swordSlot, storage.id)).toBe(false);
    expect(depositSelectedToHousingStorage(state, logsSlot, storage.id)).toBe(true);
    expect(getItemCount(storage.inventory, 'logs')).toBeGreaterThan(0);
  });

  it('requires a placed home station before crafting on the plot', () => {
    const { state, areaManager } = setupHousing();
    startCraft(state, 'saw_boards', 1);
    expect(state.craftQueue).toHaveLength(0);
    expect(state.ui.prompt).toContain('Place a home');

    state.player.completedQuestIds.push('prepare_for_road');
    addItem(state.player.inventory, 'wood', 20);
    addItem(state.player.inventory, 'logs', 6);
    expect(upgradeHousingTier(state)).toBe(true);
    state.buildMode.selectedPieceId = 'basic_workbench';
    updateBuildGhost(state, areaManager, { x: 0, y: 0, z: 0 });
    expect(placeBuilding(state, areaManager)).toBe(true);

    startCraft(state, 'saw_boards', 1);
    expect(state.craftQueue).toHaveLength(1);
  });

  it('blocks undo while storage contains items, then safely refunds after emptying', () => {
    const { state } = placePiece('small_chest', 0, 0);
    const storage = selectedHousingStorage(state);
    if (!storage) throw new Error('storage missing');
    const logsSlot = state.player.inventory.slots.findIndex((stack) => stack?.itemId === 'logs');
    expect(depositSelectedToHousingStorage(state, logsSlot, storage.id)).toBe(true);

    expect(undoLastHousingPlacement(state)).toBe(false);
    expect(state.world.placedBuildings).toHaveLength(1);

    const storageSlot = storage.inventory.slots.findIndex((stack) => stack?.itemId === 'logs');
    expect(withdrawFromHousingStorage(state, storage.id, storageSlot)).toBe(true);
    expect(undoLastHousingPlacement(state)).toBe(true);
    expect(state.world.placedBuildings).toHaveLength(0);
    expect(state.world.housing.storages[storage.id]).toBeUndefined();
  });

  it('blocks moving storage while it contains items and allows moving after it is empty', () => {
    const { state, areaManager } = placePiece('small_chest', 0, 0);
    const storage = selectedHousingStorage(state);
    if (!storage) throw new Error('storage missing');
    const logsSlot = state.player.inventory.slots.findIndex((stack) => stack?.itemId === 'logs');
    expect(depositSelectedToHousingStorage(state, logsSlot, storage.id)).toBe(true);

    expect(beginMoveLastBuilding(state, areaManager)).toBe(false);
    expect(state.buildMode.moveBuildingId).toBeNull();
    expect(state.ui.prompt).toContain('Empty that storage');

    const storageSlot = storage.inventory.slots.findIndex((stack) => stack?.itemId === 'logs');
    expect(withdrawFromHousingStorage(state, storage.id, storageSlot)).toBe(true);
    expect(beginMoveLastBuilding(state, areaManager)).toBe(true);
    updateBuildGhost(state, areaManager, { x: 2, y: 0, z: 0 });
    expect(placeBuilding(state, areaManager)).toBe(true);
    expect(state.world.placedBuildings[0].position).toMatchObject({ x: 2, z: 0 });
  });
});

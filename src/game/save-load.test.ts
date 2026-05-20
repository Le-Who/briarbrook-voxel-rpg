import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState } from './GameState';
import { loadGame, saveGame } from './SaveLoad';
import type { EnemyEntity, ResourceNodeEntity } from './types';
import { AreaManager } from '../world/AreaManager';
import { placeBuilding, updateBuildGhost } from '../systems/BuildingSystem';
import { claimStarterPlot, depositSelectedToHousingStorage, selectedHousingStorage } from '../systems/HousingSystem';
import { addItem } from '../systems/InventorySystem';
import { hireCompanion, setCompanionCommand } from '../systems/CompanionSystem';
import { createContentRegistry } from '../tools/ContentRegistry';
import { validateContent } from '../tools/ContentValidation';

describe('save/load migrations', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key)
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes legacy entity references so loaded saves pass content validation', () => {
    const legacy = createInitialGameState();
    const tree = legacy.entities.res_tree_1 as ResourceNodeEntity;
    tree.skill = 'Woodcutting';
    const archer = legacy.entities.enemy_bandit_2 as EnemyEntity;
    archer.name = 'Road Archer';

    saveGame(legacy);
    const loaded = loadGame();
    const result = validateContent(createContentRegistry(loaded), loaded.clock);

    expect((loaded.entities.res_tree_1 as ResourceNodeEntity).skill).toBe('Lumberjacking');
    expect((loaded.entities.enemy_bandit_2 as EnemyEntity).name).toBe('Bandit Archer');
    expect(result.errors).toEqual([]);
  });

  it('preserves placed housing storage and item instances across save/load', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'housing';
    state.player.position = { x: -4, y: 0, z: -3 };
    addItem(state.player.inventory, 'wood', 8);
    addItem(state.player.inventory, 'iron_bar', 2);
    addItem(state.player.inventory, 'logs', 4);
    claimStarterPlot(state);
    state.buildMode.selectedPieceId = 'small_chest';
    updateBuildGhost(state, areaManager, { x: 0, y: 0, z: 0 });
    expect(placeBuilding(state, areaManager)).toBe(true);

    const storage = selectedHousingStorage(state);
    if (!storage) throw new Error('storage missing');
    const logsSlot = state.player.inventory.slots.findIndex((stack) => stack?.itemId === 'logs');
    expect(depositSelectedToHousingStorage(state, logsSlot, storage.id)).toBe(true);
    const storedStack = storage.inventory.slots.find((stack) => stack?.itemId === 'logs');
    const storedUid = storedStack?.uid;

    saveGame(state);
    const loaded = loadGame();
    const loadedBuilding = loaded.world.placedBuildings.find((building) => building.pieceId === 'small_chest');
    const loadedStorage = loadedBuilding?.storageId ? loaded.world.housing.storages[loadedBuilding.storageId] : null;
    const loadedStack = loadedStorage?.inventory.slots.find((stack) => stack?.itemId === 'logs');
    const result = validateContent(createContentRegistry(loaded), loaded.clock);

    expect(loadedBuilding).toBeTruthy();
    expect(loadedStorage?.inventory.capacity).toBe(8);
    expect(loadedStack?.quantity).toBe(storedStack?.quantity);
    expect(loadedStack?.uid).toBe(storedUid);
    expect(result.errors).toEqual([]);
  });

  it('preserves movement settings and migrates missing movement mode to keyboard', () => {
    const state = createInitialGameState();
    state.ui.movementMode = 'mouse';
    state.ui.cameraRelativeMovement = false;

    saveGame(state);
    const loaded = loadGame();

    expect(loaded.ui.movementMode).toBe('mouse');
    expect(loaded.ui.cameraRelativeMovement).toBe(false);

    const legacy = createInitialGameState() as unknown as { ui: { movementMode?: unknown; cameraRelativeMovement?: unknown } };
    delete legacy.ui.movementMode;
    delete legacy.ui.cameraRelativeMovement;
    saveGame(legacy as unknown as ReturnType<typeof createInitialGameState>);

    const migrated = loadGame();
    expect(migrated.ui.movementMode).toBe('keyboard');
    expect(migrated.ui.cameraRelativeMovement).toBe(true);
  });

  it('preserves active companion-lite state and migrates saves with no party list', () => {
    const state = createInitialGameState();
    hireCompanion(state, 'npc_liora_town', { role: 'guard' });
    setCompanionCommand(state, 'npc_liora_town', 'assist');

    saveGame(state);
    const loaded = loadGame();
    const loadedLiora = loaded.entities.npc_liora_town;

    expect(loaded.world.partyMemberIds).toEqual(['npc_liora_town']);
    expect(loadedLiora.kind).toBe('social');
    if (loadedLiora.kind !== 'social') throw new Error('Liora did not load as social NPC');
    expect(loadedLiora.blocksMovement).toBe(false);
    expect(loadedLiora.companion).toMatchObject({ role: 'guard', command: 'assist' });

    const legacy = createInitialGameState() as unknown as { world: { partyMemberIds?: unknown } };
    delete legacy.world.partyMemberIds;
    saveGame(legacy as unknown as ReturnType<typeof createInitialGameState>);

    expect(loadGame().world.partyMemberIds).toEqual([]);
  });
});

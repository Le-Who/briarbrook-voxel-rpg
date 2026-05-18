import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState, createStack } from './GameState';
import { loadGame, saveGame } from './SaveLoad';
import { updateBuildGhost, placeBuilding } from '../systems/BuildingSystem';
import { interactContainer } from '../systems/ContainerSystem';
import { addItem, getItemCount } from '../systems/InventorySystem';
import { claimStarterPlot, depositSelectedToHousingStorage, selectedHousingStorage } from '../systems/HousingSystem';
import { AreaManager } from '../world/AreaManager';

const SAVE_KEY = 'briarbrook.voxel-rpg.save.v1';

function installLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  });
  return store;
}

function savedRaw(store: Map<string, string>) {
  const raw = store.get(SAVE_KEY);
  if (!raw) throw new Error('save missing');
  return JSON.parse(raw);
}

describe('save/load regression matrix', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = installLocalStorage();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('roundtrips durable player/UI state while clearing transient interaction state', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'blacksmith';
    state.player.position = { x: 2, y: 0, z: 3 };
    state.player.inventory.slots[10] = createStack('iron_ore', 7);
    state.ui.hotbar[0] = { kind: 'spell', id: 'heal' };
    state.player.spellbook.knownSpellIds = Array.from(new Set([...state.player.spellbook.knownSpellIds, 'fireball']));
    state.ui.windowLayouts.spellbook = { x: 222, y: 111, width: 777, height: 444 };
    state.ui.windowFocusOrder = ['spellbook', 'help'];
    state.player.skills.Magery.realValue = 55;
    state.player.skills.Magery.value = 55;
    state.quests.prepare_for_road.objectives[0].progress = 1;
    state.player.activeQuestIds = ['prepare_for_road'];

    state.ui.hoverTarget = { kind: 'tile', areaId: 'town', position: { x: 99, y: 0, z: 99 } };
    state.ui.selectedTarget = { kind: 'entity', entityId: 'enemy_bandit_1' };
    state.ui.targeting = { mode: 'spell', spellId: 'heal', prompt: 'Pick a target.' };
    state.ui.contextMenu = { target: { kind: 'entity', entityId: 'enemy_bandit_1' }, x: 10, y: 20 };
    state.ui.hotbarAssignSpellId = 'heal';
    state.realtime.pendingAction = {
      action: { type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' },
      target: { kind: 'entity', entityId: 'enemy_bandit_1' },
      range: 1.5,
      createdAt: state.clock,
      expiresAt: state.clock + 5,
      label: 'Approaching to strike...'
    };

    saveGame(state);
    const loaded = loadGame();

    expect(loaded.player.currentArea).toBe('blacksmith');
    expect(loaded.player.position).toEqual({ x: 2, y: 0, z: 3 });
    expect(loaded.player.inventory.slots[10]).toMatchObject({ itemId: 'iron_ore', quantity: 7 });
    expect(loaded.ui.hotbar[0]).toEqual({ kind: 'spell', id: 'heal' });
    expect(loaded.player.spellbook.knownSpellIds).toContain('fireball');
    expect(loaded.ui.windowLayouts.spellbook).toEqual({ x: 222, y: 111, width: 777, height: 444 });
    expect(loaded.ui.windowFocusOrder).toEqual(['spellbook', 'help']);
    expect(loaded.player.skills.Magery.value).toBe(55);
    expect(loaded.quests.prepare_for_road.objectives[0].progress).toBe(1);

    expect(loaded.ui.hoverTarget).toBeNull();
    expect(loaded.ui.selectedTarget).toBeNull();
    expect(loaded.ui.targeting).toBeNull();
    expect(loaded.ui.contextMenu).toBeNull();
    expect(loaded.ui.hotbarAssignSpellId).toBeNull();
    expect(loaded.realtime.pendingAction).toBeNull();
    expect(loaded.realtime.actionQueue).toEqual([]);
  });

  it('does not write transient targeting, approach, motion, or debug render state into the save payload', () => {
    const state = createInitialGameState();
    state.dev.overlay = true;
    state.dev.telemetryExportJson = '{"debug":true}';
    state.dev.renderStats.visibleEntityCount = 99;
    state.dev.facingDebug.showFacingArrows = true;
    state.ui.hoverTarget = { kind: 'entity', entityId: 'enemy_bandit_1' };
    state.ui.selectedTarget = { kind: 'entity', entityId: 'enemy_bandit_1' };
    state.ui.targeting = { mode: 'tool', toolItemId: 'axe', prompt: 'Select a tree.' };
    state.ui.contextMenu = { target: { kind: 'entity', entityId: 'enemy_bandit_1' }, x: 12, y: 24 };
    state.player.activeTargetId = 'enemy_bandit_1';
    state.player.targetPosition = { x: 99, y: 0, z: 99 };
    state.player.movement.intent = { x: 1, z: 0 };
    state.player.movement.path = [{ x: 8, y: 0, z: 8 }];
    state.player.actionState = { kind: 'attacking', startedAt: 1, duration: 4, endsAt: 5, interruptible: true, visualHint: 'attack', source: 'enemy_bandit_1' };
    state.realtime.pendingAction = {
      action: { type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' },
      target: { kind: 'entity', entityId: 'enemy_bandit_1' },
      range: 1.5,
      createdAt: state.clock,
      expiresAt: state.clock + 5,
      label: 'Approaching to strike...'
    };

    saveGame(state);

    const raw = savedRaw(store);
    expect(raw.saveVersion).toBeGreaterThanOrEqual(3);
    expect(raw.ui.hoverTarget).toBeNull();
    expect(raw.ui.selectedTarget).toBeNull();
    expect(raw.ui.targeting).toBeNull();
    expect(raw.ui.contextMenu).toBeNull();
    expect(raw.player.activeTargetId).toBeNull();
    expect(raw.player.targetPosition).toBeNull();
    expect(raw.player.movement.intent).toBeNull();
    expect(raw.player.movement.path).toEqual([]);
    expect(raw.player.actionState.kind).toBe('idle');
    expect(raw.realtime.pendingAction).toBeNull();
    expect(raw.dev.overlay).toBe(false);
    expect(raw.dev.telemetryExportJson).toBe('');
    expect(raw.dev.renderStats.visibleEntityCount).toBe(0);
    expect(raw.dev.facingDebug.showFacingArrows).toBe(false);
  });

  it('roundtrips forest, portal, crypt, open chest, housing, storage, and window state', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'housing';
    state.player.position = { x: -4, y: 0, z: -3 };
    claimStarterPlot(state);
    addItem(state.player.inventory, 'wood', 4);
    addItem(state.player.inventory, 'iron_bar', 1);
    addItem(state.player.inventory, 'logs', 6);
    state.buildMode.selectedPieceId = 'small_chest';
    updateBuildGhost(state, areaManager, { x: 0, y: 0, z: 0 });
    expect(placeBuilding(state, areaManager)).toBe(true);
    const storage = selectedHousingStorage(state);
    if (!storage) throw new Error('storage missing');
    const logsSlot = state.player.inventory.slots.findIndex((stack) => stack?.itemId === 'logs');
    expect(depositSelectedToHousingStorage(state, logsSlot, storage.id)).toBe(true);
    state.player.currentArea = 'forest';
    state.player.position = { x: -3, y: 0, z: 0 };
    const tree = state.entities.res_tree_1;
    if (!tree || tree.kind !== 'resource') throw new Error('tree missing');
    tree.depleted = true;
    tree.respawnTimer = 11;
    state.player.currentArea = 'crypt';
    state.player.position = { x: 2, y: 0, z: 4 };
    const chest = state.entities.chest_crypt_warded;
    if (!chest || chest.kind !== 'container') throw new Error('chest missing');
    chest.locked = false;
    if (chest.trap) chest.trap.armed = false;
    interactContainer(state, chest);
    state.ui.panels.inventory = true;
    state.ui.panels.spellbook = true;
    state.ui.windowLayouts.inventory = { x: 20, y: 30, width: 320, height: 420 };

    saveGame(state);
    const loaded = loadGame();

    expect(loaded.player.currentArea).toBe('crypt');
    expect(loaded.player.position).toEqual({ x: 2, y: 0, z: 4 });
    expect(loaded.entities.res_tree_1).toMatchObject({ depleted: true, respawnTimer: 11 });
    expect(loaded.entities.chest_crypt_warded).toMatchObject({ opened: true });
    expect(loaded.world.placedBuildings).toHaveLength(1);
    const loadedStorage = Object.values(loaded.world.housing.storages)[0];
    expect(getItemCount(loadedStorage.inventory, 'logs')).toBeGreaterThan(0);
    expect(loaded.ui.panels.inventory).toBe(true);
    expect(loaded.ui.panels.spellbook).toBe(true);
    expect(loaded.ui.windowLayouts.inventory).toEqual({ x: 20, y: 30, width: 320, height: 420 });
  });

  it('migrates old saves with fallback defaults instead of dropping valid player progress', () => {
    const oldSave = createInitialGameState() as any;
    delete oldSave.saveVersion;
    delete oldSave.player.spellbook;
    delete oldSave.dev.telemetry.resourceOutflow;
    delete oldSave.dev.telemetry.actionCancellations;
    oldSave.player.skills.Magic = { ...oldSave.player.skills.Magery, id: 'Magic', realValue: 44, value: 44 };
    oldSave.player.inventory.slots[0] = createStack('iron_ore', 13);
    oldSave.ui.hoverTarget = { kind: 'entity', entityId: 'enemy_bandit_1' };
    localStorage.setItem(SAVE_KEY, JSON.stringify(oldSave));

    const loaded = loadGame();

    expect(loaded.saveVersion).toBeGreaterThanOrEqual(3);
    expect(loaded.player.inventory.slots[0]).toMatchObject({ itemId: 'iron_ore', quantity: 13 });
    expect(loaded.player.spellbook.knownSpellIds).toContain('magic_arrow');
    expect(loaded.player.skills.Magery.realValue).toBeGreaterThanOrEqual(44);
    expect(loaded.dev.telemetry.resourceOutflow).toEqual({});
    expect(loaded.dev.telemetry.actionCancellations).toEqual({});
    expect(loaded.ui.hoverTarget).toBeNull();
  });
});

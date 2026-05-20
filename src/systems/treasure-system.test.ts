import { afterEach, describe, expect, it, vi } from 'vitest';
import { secretDefinitions, treasureMapDefinitions } from '../data/treasure';
import { createInitialGameState } from '../game/GameState';
import { loadGame, saveGame } from '../game/SaveLoad';
import { masteryMilestonesForProfession, milestoneProgress } from '../data/professions';
import { AreaManager } from '../world/AreaManager';
import { interactContainer, revealMagicalContainers } from './ContainerSystem';
import { addItem, getItemCount } from './InventorySystem';
import { castSpellIntent, updateSpellCasting } from './SpellSystem';
import { combineMapFragments, decipherTreasureMap, detectHiddenPulse, digWithShovel, pinTreasureMap, removeTrapFromTarget, triggerTrapWithTelekinesis } from './TreasureSystem';

const SAVE_KEY = 'briarbrook.voxel-rpg.save.v1';

function setSkill(state: ReturnType<typeof createInitialGameState>, skillId: keyof ReturnType<typeof createInitialGameState>['player']['skills'], value: number): void {
  state.player.skills[skillId].realValue = value;
  state.player.skills[skillId].value = value;
}

function installLocalStorage(): void {
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
}

function prepareUtilityMage(state: ReturnType<typeof createInitialGameState>, spellIds: string[]): void {
  state.player.spellbook.knownSpellIds = Array.from(new Set([...state.player.spellbook.knownSpellIds, ...spellIds]));
  for (const reagent of ['blood_moss', 'sulfurous_ash', 'spider_silk', 'garlic', 'mandrake_root']) {
    addItem(state.player.inventory, reagent, 5);
  }
  state.player.mana = 200;
  setSkill(state, 'Magery', 90);
}

describe('treasure hunting pillar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defines three tiered treasure maps and the required existing-area cache sites', () => {
    expect(Object.keys(treasureMapDefinitions)).toEqual(expect.arrayContaining(['greymont_cache', 'old_river_bandit_stash', 'crypt_reliquary']));
    expect(Object.values(treasureMapDefinitions).map((map) => map.tier).sort()).toEqual([1, 2, 3]);

    expect(Object.keys(secretDefinitions)).toEqual(
      expect.arrayContaining(['town_fountain_cache', 'greymont_buried_cache', 'old_river_bandit_stash', 'crypt_loose_wall', 'crypt_reliquary', 'crypt_false_door'])
    );

    const hiddenCacheLocations = Object.values(secretDefinitions).filter((secret) => ['hidden_cache', 'sealed_alcove', 'treasure_room'].includes(secret.revealedState));
    expect(hiddenCacheLocations.length).toBeGreaterThanOrEqual(5);

    const state = createInitialGameState();
    const lockedTrapped = Object.values(state.entities).filter((entity) => entity.kind === 'container' && entity.locked && entity.trap?.armed);
    expect(lockedTrapped.map((entity) => entity.id)).toEqual(expect.arrayContaining(['cache_road_hidden', 'door_crypt_side_room', 'chest_crypt_warded']));
    expect(state.entities.cache_town_fountain_loose_stone).toMatchObject({ kind: 'container', hidden: true });
    expect(state.entities.cache_bank_ledger_niche).toMatchObject({ kind: 'container', hidden: true });
  });

  it('combines fragments, deciphers a map, and digs up a locked cache', () => {
    const state = createInitialGameState();
    state.player.inventory.slots[35] = null;
    addItem(state.player.inventory, 'map_fragment', 3);
    addItem(state.player.inventory, 'shovel', 1);

    expect(combineMapFragments(state)).toBe(true);
    expect(state.ui.panels.treasureMap).toBe(true);
    expect(state.player.inventory.slots.some((slot) => slot?.itemId === 'rough_treasure_map')).toBe(true);

    state.player.skills.Cartography.realValue = 65;
    state.player.skills.Cartography.value = 65;
    decipherTreasureMap(state, 'greymont_cache');
    expect(state.world.treasure.maps.greymont_cache.decipheredPrecision).toBeGreaterThan(0.7);

    state.player.currentArea = 'forest';
    expect(digWithShovel(state, new AreaManager(), { kind: 'tile', areaId: 'forest', position: { x: 9, y: 0, z: -7 } })).toBe(true);

    const cache = state.entities.treasure_greymont_cache;
    expect(cache?.kind).toBe('container');
    if (cache?.kind !== 'container') return;
    expect(cache.locked).toBe(true);
    expect(cache.trap?.armed).toBe(true);
    expect(cache.loot.some((entry) => entry.itemId === 'vendor_contract')).toBe(true);
  });

  it('uses Tracking with Cartography to narrow higher-tier map clues before pinning', () => {
    const state = createInitialGameState();
    addItem(state.player.inventory, 'rough_treasure_map', 1);
    state.world.treasure.maps.old_river_bandit_stash.fragmentCount = 3;
    setSkill(state, 'Cartography', 28);
    setSkill(state, 'Tracking', 78);

    decipherTreasureMap(state, 'old_river_bandit_stash');
    expect(state.world.treasure.maps.old_river_bandit_stash.decipheredPrecision).toBeGreaterThan(0.7);

    pinTreasureMap(state, 'old_river_bandit_stash');
    expect(state.world.treasure.maps.old_river_bandit_stash.pinned).toBe(true);
  });

  it('reveals dungeon secrets and trains trap handling without hard-locking the chest', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = createInitialGameState();
    state.player.currentArea = 'crypt';
    state.player.skills['Detect Hidden'].realValue = 80;
    state.player.skills['Detect Hidden'].value = 80;
    state.player.skills['Remove Trap'].realValue = 90;
    state.player.skills['Remove Trap'].value = 90;

    const revealed = detectHiddenPulse(state, { kind: 'tile', areaId: 'crypt', position: { x: 12, y: 0, z: -8 } });
    expect(revealed).toBeGreaterThan(0);
    const secret = state.entities.chest_crypt_secret_room;
    expect(secret?.kind).toBe('container');
    if (secret?.kind !== 'container') return;
    expect(secret.hidden).toBe(false);
    expect(secret.trap?.detected).toBe(true);

    expect(removeTrapFromTarget(state, { kind: 'entity', entityId: secret.id })).toBe(true);
    expect(secret.trap?.armed).toBe(false);
    expect(secret.locked).toBe(true);
    random.mockRestore();
  });

  it('tracks crypt secrets when they are revealed and opened', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'crypt';
    state.player.skills['Detect Hidden'].realValue = 75;
    state.player.skills['Detect Hidden'].value = 75;

    const revealed = detectHiddenPulse(state, { kind: 'tile', areaId: 'crypt', position: { x: -12, y: 0, z: 6 } });
    expect(revealed).toBeGreaterThan(0);
    expect(state.world.treasure.secrets.crypt_loose_wall.revealedUntil).toBeGreaterThan(state.clock);

    const wallCache = state.entities.secret_crypt_loose_wall_cache;
    expect(wallCache?.kind).toBe('container');
    if (!wallCache || wallCache.kind !== 'container') return;
    expect(wallCache.hidden).toBe(false);

    interactContainer(state, wallCache);
    expect(wallCache.opened).toBe(true);
    expect(state.world.treasure.secrets.crypt_loose_wall.opened).toBe(true);
    expect(state.player.inventory.slots.some((slot) => slot?.itemId === 'map_fragment')).toBe(true);
  });

  it('uses lockpicking as a visible timed action for treasure locks', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = createInitialGameState();
    state.player.currentArea = 'crypt';
    state.player.skills.Lockpicking.realValue = 95;
    state.player.skills.Lockpicking.value = 95;
    addItem(state.player.inventory, 'lockpick', 1);

    const chest = state.entities.chest_crypt_secret_room;
    expect(chest?.kind).toBe('container');
    if (!chest || chest.kind !== 'container') return;
    chest.hidden = false;
    if (chest.trap) {
      chest.trap.detected = true;
      chest.trap.armed = false;
    }

    interactContainer(state, chest);
    expect(chest.locked).toBe(false);
    expect(state.player.actionState.kind).toBe('interacting');
    expect(state.player.actionState.source).toBe(`lockpick:${chest.id}`);
    expect(state.ui.prompt).toContain('lock clicks open');
    random.mockRestore();
  });

  it('summarizes opened dungeon rewards with exact gold and item names', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'crypt';

    const chest = state.entities.chest_crypt_secret_room;
    expect(chest?.kind).toBe('container');
    if (!chest || chest.kind !== 'container') return;
    chest.hidden = false;
    chest.locked = false;
    if (chest.trap) {
      chest.trap.detected = true;
      chest.trap.armed = false;
    }

    interactContainer(state, chest);

    const rewardSummary = state.chat.map((message) => message.text).find((text) => text.includes('Ancient Treasure Chest opens.'));
    expect(rewardSummary).toBe('Ancient Treasure Chest opens. Reward: 70g, Rough Treasure Map x1, Vendor Contract x1, Repair Kit x1, Treasure Display Kit x1.');
    expect(state.ui.prompt).toBe('Ancient Treasure Chest opened. Reward: 70g, Rough Treasure Map x1, Vendor Contract x1, Repair Kit x1, Treasure Display Kit x1.');
  });

  it('lets magery utility reveal secrets and trap warnings without disarming them', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'crypt';
    const chest = state.entities.chest_crypt_secret_room;
    expect(chest?.kind).toBe('container');
    if (!chest || chest.kind !== 'container') return;

    const revealed = revealMagicalContainers(state);
    expect(revealed).toBeGreaterThan(0);
    expect(chest.hidden).toBe(false);
    expect(chest.trap?.detected).toBe(true);
    expect(chest.trap?.armed).toBe(true);
    expect(state.world.treasure.secrets.crypt_treasure_room.revealedUntil).toBeGreaterThan(state.clock);
    expect(state.world.treasure.secrets.crypt_treasure_room.disarmed).toBe(false);
  });

  it('lets Detect Magic identify a crypt seal and Dispel Field remove its barrier', () => {
    const state = createInitialGameState();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    state.player.currentArea = 'crypt';
    state.player.position = { x: -2, y: 0, z: 9 };
    prepareUtilityMage(state, ['detect_magic', 'dispel_field']);

    const sealedDoor = state.entities.secret_crypt_false_door;
    expect(sealedDoor?.kind).toBe('container');
    if (!sealedDoor || sealedDoor.kind !== 'container') return;
    expect(sealedDoor.hidden).toBe(true);
    expect(sealedDoor.requiredSpellId).toBe('dispel_field');

    castSpellIntent(state, 'detect_magic', { kind: 'self' });
    updateSpellCasting(state, 10);
    expect(sealedDoor.hidden).toBe(false);
    expect(state.world.treasure.secrets.crypt_false_door.revealedUntil).toBeGreaterThan(state.clock);

    castSpellIntent(state, 'dispel_field', { kind: 'entity', entityId: sealedDoor.id });
    updateSpellCasting(state, 10);
    expect(sealedDoor.requiredSpellId).toBeUndefined();
    expect(sealedDoor.locked).toBe(false);
  });

  it('supports and persists a non-combat treasure session across map, detection, traps, locks, loot, journal, and trophy rewards', () => {
    installLocalStorage();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = createInitialGameState();
    state.player.completedQuestIds = [];
    setSkill(state, 'Cartography', 75);
    setSkill(state, 'Tracking', 70);
    setSkill(state, 'Detect Hidden', 85);
    setSkill(state, 'Lockpicking', 95);
    setSkill(state, 'Remove Trap', 95);
    addItem(state.player.inventory, 'map_fragment', 6);
    addItem(state.player.inventory, 'rough_treasure_map', 1);
    addItem(state.player.inventory, 'shovel', 1);
    addItem(state.player.inventory, 'lockpick', 6);

    expect(combineMapFragments(state, 'greymont_cache')).toBe(true);
    decipherTreasureMap(state, 'greymont_cache');
    pinTreasureMap(state, 'greymont_cache');
    state.player.currentArea = 'forest';
    expect(digWithShovel(state, new AreaManager(), { kind: 'tile', areaId: 'forest', position: { x: 9, y: 0, z: -7 } })).toBe(true);
    const buriedCache = state.entities.treasure_greymont_cache;
    expect(buriedCache?.kind).toBe('container');
    if (!buriedCache || buriedCache.kind !== 'container') return;
    buriedCache.trap!.detected = true;
    expect(removeTrapFromTarget(state, { kind: 'entity', entityId: buriedCache.id })).toBe(true);
    interactContainer(state, buriedCache);
    interactContainer(state, buriedCache);
    expect(buriedCache.opened).toBe(true);
    expect(getItemCount(state.player.inventory, 'wall_tapestry')).toBeGreaterThan(0);

    state.world.treasure.maps.old_river_bandit_stash.fragmentCount = 3;
    decipherTreasureMap(state, 'old_river_bandit_stash');
    state.player.currentArea = 'road';
    state.player.position = { x: 8, y: 0, z: 4 };
    expect(detectHiddenPulse(state, { kind: 'tile', areaId: 'road', position: { x: 8, y: 0, z: 4 } })).toBeGreaterThan(0);
    const roadStash = state.entities.cache_road_hidden;
    expect(roadStash?.kind).toBe('container');
    if (!roadStash || roadStash.kind !== 'container') return;
    expect(triggerTrapWithTelekinesis(state, { kind: 'entity', entityId: roadStash.id })).toBe(true);
    interactContainer(state, roadStash);
    interactContainer(state, roadStash);
    expect(roadStash.opened).toBe(true);
    expect(getItemCount(state.player.inventory, 'vendor_contract')).toBeGreaterThan(0);

    state.player.currentArea = 'crypt';
    state.player.position = { x: 12, y: 0, z: -8 };
    expect(detectHiddenPulse(state, { kind: 'tile', areaId: 'crypt', position: { x: 12, y: 0, z: -8 } })).toBeGreaterThan(0);
    const cryptChest = state.entities.chest_crypt_secret_room;
    expect(cryptChest?.kind).toBe('container');
    if (!cryptChest || cryptChest.kind !== 'container') return;
    expect(removeTrapFromTarget(state, { kind: 'entity', entityId: cryptChest.id })).toBe(true);
    interactContainer(state, cryptChest);
    interactContainer(state, cryptChest);
    expect(cryptChest.opened).toBe(true);

    const milestone = masteryMilestonesForProfession('treasure_hunter').find((entry) => entry.id === 'treasure_hunter_initiate');
    expect(milestone && milestoneProgress(state, milestone).complete).toBe(true);

    saveGame(state);
    const loaded = loadGame();
    expect(loaded.world.treasure.maps.greymont_cache).toMatchObject({ found: true, pinned: true });
    expect(loaded.world.treasure.maps.old_river_bandit_stash.decipheredPrecision).toBeGreaterThan(0.7);
    expect(loaded.world.treasure.secrets.old_river_bandit_stash).toMatchObject({ triggered: true, opened: true });
    expect(loaded.world.treasure.secrets.crypt_treasure_room).toMatchObject({ disarmed: true, opened: true });
    expect(loaded.entities.treasure_greymont_cache).toMatchObject({ kind: 'container', opened: true, trap: { armed: false } });
    expect(loaded.entities.cache_road_hidden).toMatchObject({ opened: true, hidden: false, trap: { armed: false } });
    expect(loaded.entities.chest_crypt_secret_room).toMatchObject({ opened: true, trap: { armed: false } });
  });
});

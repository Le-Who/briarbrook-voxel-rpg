import { describe, expect, it, vi } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { AreaManager } from '../world/AreaManager';
import { interactContainer, revealMagicalContainers } from './ContainerSystem';
import { addItem } from './InventorySystem';
import { combineMapFragments, decipherTreasureMap, detectHiddenPulse, digWithShovel, removeTrapFromTarget } from './TreasureSystem';

describe('treasure hunting pillar', () => {
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
});

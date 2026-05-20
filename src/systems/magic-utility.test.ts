import { afterEach, describe, expect, it, vi } from 'vitest';
import { spellDefs } from '../data/spells';
import { createInitialGameState } from '../game/GameState';
import type { TargetRef } from '../game/types';
import { addItem } from './InventorySystem';
import { castSpellIntent, updateSpellCasting } from './SpellSystem';

function prepareUtilityMage(state: ReturnType<typeof createInitialGameState>, spellIds: string[]): void {
  state.player.spellbook.knownSpellIds = Array.from(new Set([...state.player.spellbook.knownSpellIds, ...spellIds]));
  for (const reagent of ['blood_moss', 'sulfurous_ash', 'spider_silk', 'garlic', 'mandrake_root', 'black_pearl', 'ginseng', 'recall_rune']) {
    addItem(state.player.inventory, reagent, 5);
  }
}

function castAndResolve(state: ReturnType<typeof createInitialGameState>, spellId: string, target: TargetRef = { kind: 'self' }): void {
  castSpellIntent(state, spellId, target);
  updateSpellCasting(state, 10);
}

describe('systemic utility magic', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines a broad spell toolset with targeting contracts and utility categories', () => {
    const spells = Object.values(spellDefs);
    const utilitySpells = spells.filter((spell) => spell.category !== 'Damage');

    expect(spells.length).toBeGreaterThanOrEqual(16);
    expect(utilitySpells.length).toBeGreaterThanOrEqual(8);
    for (const id of [
      'night_sight',
      'reveal',
      'telekinesis',
      'detect_magic',
      'dispel_field',
      'unlock_minor',
      'mark_minor_rune',
      'recall',
      'magic_lock',
      'protection',
      'cure',
      'create_food'
    ]) {
      expect(spellDefs[id]).toBeTruthy();
      expect(spellDefs[id].lineOfSight).toBeTypeOf('boolean');
      expect(spellDefs[id].targetFilters.length).toBeGreaterThan(0);
    }
  });

  it('lets reveal counter stealth and hidden actors', () => {
    const state = createInitialGameState();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    state.player.skills.Magery.value = 80;
    state.player.skills.Magery.realValue = 80;
    state.player.combatProfile.hidden = true;
    state.player.combatProfile.hiddenUntil = 99;
    state.player.mana = 200;
    prepareUtilityMage(state, ['reveal']);

    castAndResolve(state, 'reveal');

    expect(state.player.combatProfile.hidden).toBe(false);
    expect(state.spellEffects.some((effect) => effect.type === 'reveal')).toBe(true);
  });

  it('creates and dispels temporary magical world fields', () => {
    const state = createInitialGameState();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    state.player.skills.Magery.value = 80;
    state.player.skills.Magery.realValue = 80;
    state.player.mana = 200;
    prepareUtilityMage(state, ['magic_trap', 'dispel_field']);
    const tile = { kind: 'tile' as const, areaId: state.player.currentArea, position: { x: 2, y: 0, z: 2 } };

    castAndResolve(state, 'magic_trap', tile);

    expect(state.world.magicFields).toHaveLength(1);
    expect(state.world.magicFields[0]).toMatchObject({ kind: 'trap', area: state.player.currentArea });

    castAndResolve(state, 'dispel_field', tile);

    expect(state.world.magicFields).toHaveLength(0);
  });

  it('uses night sight as a light utility that hints subtle dungeon marks without replacing Reveal', () => {
    const state = createInitialGameState();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    state.player.currentArea = 'crypt';
    state.player.position = { x: -2, y: 0, z: 9 };
    state.player.skills.Magery.value = 80;
    state.player.skills.Magery.realValue = 80;
    state.player.mana = 200;
    prepareUtilityMage(state, ['night_sight']);

    castAndResolve(state, 'night_sight');

    expect(state.spellEffects.some((effect) => effect.type === 'night_sight')).toBe(true);
    expect(state.world.treasure.secrets.crypt_false_door.revealedUntil).toBeGreaterThan(state.clock);
    expect(state.entities.secret_crypt_false_door).toMatchObject({ hidden: true, requiredSpellId: 'dispel_field' });
  });

  it('lets telekinesis open safe containers at range while locks and traps keep profession value', () => {
    const state = createInitialGameState();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    state.player.currentArea = 'town';
    state.player.position = { x: -7, y: 0, z: 2 };
    state.player.skills.Magery.value = 80;
    state.player.skills.Magery.realValue = 80;
    state.player.mana = 200;
    prepareUtilityMage(state, ['telekinesis']);
    const cache = state.entities.cache_town_fountain_loose_stone;
    if (!cache || cache.kind !== 'container') throw new Error('Missing fountain cache fixture');
    cache.hidden = false;

    castAndResolve(state, 'telekinesis', { kind: 'entity', entityId: cache.id });

    expect(cache.opened).toBe(true);

    const roadStash = state.entities.cache_road_hidden;
    if (!roadStash || roadStash.kind !== 'container') throw new Error('Missing road stash fixture');
    state.player.currentArea = 'road';
    state.player.position = { x: 12, y: 0, z: 8 };
    roadStash.hidden = false;
    roadStash.trap!.detected = true;
    state.player.mana = 200;

    castAndResolve(state, 'telekinesis', { kind: 'entity', entityId: roadStash.id });

    expect(roadStash.opened).toBe(false);
    expect(roadStash.trap?.armed).toBe(false);
    expect(state.world.treasure.secrets.old_river_bandit_stash.triggered).toBe(true);
  });

  it('locks simple containers magically and keeps valuable locks in the Lockpicking lane', () => {
    const state = createInitialGameState();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    state.player.currentArea = 'town';
    state.player.position = { x: -1, y: 0, z: 2 };
    state.player.skills.Magery.value = 80;
    state.player.skills.Magery.realValue = 80;
    state.player.mana = 200;
    prepareUtilityMage(state, ['magic_lock', 'unlock_minor']);
    const cache = state.entities.cache_town_fountain_loose_stone;
    if (!cache || cache.kind !== 'container') throw new Error('Missing fountain cache fixture');
    cache.hidden = false;
    cache.locked = false;
    cache.lockDifficulty = 0;

    castAndResolve(state, 'magic_lock', { kind: 'entity', entityId: cache.id });

    expect(cache.locked).toBe(true);
    expect(cache.lockDifficulty).toBeGreaterThan(0);

    state.player.mana = 200;
    castAndResolve(state, 'unlock_minor', { kind: 'entity', entityId: cache.id });

    expect(cache.locked).toBe(false);

    const valuableChest = state.entities.chest_crypt_secret_room;
    if (!valuableChest || valuableChest.kind !== 'container') throw new Error('Missing crypt chest fixture');
    state.player.currentArea = 'crypt';
    state.player.position = { x: 12, y: 0, z: -8 };
    valuableChest.hidden = false;
    state.player.mana = 200;

    castAndResolve(state, 'unlock_minor', { kind: 'entity', entityId: valuableChest.id });

    expect(valuableChest.locked).toBe(true);
    expect(state.ui.prompt).toContain('too complex');
  });

  it('restricts Mark and Recall to marked safe points instead of debug teleporting', () => {
    const state = createInitialGameState();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    state.player.skills.Magery.value = 90;
    state.player.skills.Magery.realValue = 90;
    state.player.mana = 200;
    prepareUtilityMage(state, ['mark_minor_rune', 'recall']);

    state.player.currentArea = 'crypt';
    state.player.position = { x: 0, y: 0, z: 0 };
    castAndResolve(state, 'mark_minor_rune');

    expect(state.world.recallMark).toBeNull();
    expect(state.ui.prompt).toContain('safe');

    state.player.currentArea = 'town';
    state.player.position = { x: 1, y: 0, z: 1 };
    state.player.mana = 200;
    castAndResolve(state, 'mark_minor_rune');

    expect(state.world.recallMark).toMatchObject({ area: 'town', position: { x: 1, y: 0, z: 1 } });

    state.player.currentArea = 'road';
    state.player.position = { x: 8, y: 0, z: 4 };
    state.player.mana = 200;
    castAndResolve(state, 'recall');

    expect(state.player.currentArea).toBe('town');
    expect(state.player.position).toMatchObject({ x: 1, y: 0, z: 1 });

    const unmarked = createInitialGameState();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    unmarked.player.skills.Magery.value = 90;
    unmarked.player.skills.Magery.realValue = 90;
    unmarked.player.currentArea = 'road';
    unmarked.player.mana = 200;
    prepareUtilityMage(unmarked, ['recall']);

    castAndResolve(unmarked, 'recall');

    expect(unmarked.player.currentArea).toBe('road');
    expect(unmarked.ui.prompt).toContain('Mark');
  });
});

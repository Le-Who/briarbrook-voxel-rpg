import { afterEach, describe, expect, it, vi } from 'vitest';
import { spellDefs } from '../data/spells';
import { createInitialGameState } from '../game/GameState';
import { addItem } from './InventorySystem';
import { castSpellIntent, updateSpellCasting } from './SpellSystem';

function prepareUtilityMage(state: ReturnType<typeof createInitialGameState>, spellIds: string[]): void {
  state.player.spellbook.knownSpellIds = Array.from(new Set([...state.player.spellbook.knownSpellIds, ...spellIds]));
  for (const reagent of ['blood_moss', 'sulfurous_ash', 'spider_silk', 'garlic', 'mandrake_root']) {
    addItem(state.player.inventory, reagent, 3);
  }
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
    for (const id of ['detect_magic', 'unlock_minor', 'magic_trap', 'reveal', 'water_walk', 'dispel_field', 'mark_minor_rune']) {
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

    castSpellIntent(state, 'reveal', { kind: 'self' });
    updateSpellCasting(state, 10);

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

    castSpellIntent(state, 'magic_trap', tile);
    updateSpellCasting(state, 10);

    expect(state.world.magicFields).toHaveLength(1);
    expect(state.world.magicFields[0]).toMatchObject({ kind: 'trap', area: state.player.currentArea });

    castSpellIntent(state, 'dispel_field', tile);
    updateSpellCasting(state, 10);

    expect(state.world.magicFields).toHaveLength(0);
  });
});

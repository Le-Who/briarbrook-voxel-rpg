import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import {
  getActiveHotbarSlot,
  getEquippedItems,
  getHeldVisualItem,
  getInteractPrompt,
  getItemUseState,
  getSpellCastability,
  getTooltipContent,
  getWindowLayout,
  sanitizeUiStateReferences,
  validateUiConsistency
} from '../game/UIStateSelectors';
import { CharacterPanel } from './CharacterPanel';

describe('reactive UI state architecture', () => {
  it('derives equipment and paperdoll state from equipped item instances', () => {
    const state = createInitialGameState();
    state.ui.panels.character = true;
    const weapon = state.player.equipment.weapon;
    if (!weapon) throw new Error('starter weapon missing');

    const equipped = getEquippedItems(state.player);
    const useState = getItemUseState(state, weapon.uid);
    const html = CharacterPanel(state);

    expect(equipped.some((entry) => entry.slot === 'weapon' && entry.stack.uid === weapon.uid)).toBe(true);
    expect(getHeldVisualItem(state.player)?.uid).toBe(weapon.uid);
    expect(useState).toMatchObject({ owner: 'equipment', slot: 'weapon', equipped: true, exists: true });
    expect(html).toContain('data-equipment-slot="weapon"');
    expect(html).toContain('paperdoll-preview-gear');
  });

  it('centralizes hotbar and spell castability state', () => {
    const state = createInitialGameState();
    state.ui.activeHotbarSlot = 99;
    state.ui.hotbar[3] = { kind: 'spell', id: 'missing_spell' } as any;

    sanitizeUiStateReferences(state);

    expect(getActiveHotbarSlot(state.player, state.ui).index).toBe(9);
    expect(state.ui.hotbar[3]).toBeNull();
    expect(getSpellCastability(state, 'magic_arrow')).toMatchObject({ known: true, canCast: true, reason: '' });

    state.player.mana = 0;
    expect(getSpellCastability(state, 'magic_arrow')).toMatchObject({ canCast: false, reason: 'Not enough mana' });
  });

  it('resolves tooltip anchors and interaction prompts through selectors', () => {
    const state = createInitialGameState();
    state.ui.hoverTarget = { kind: 'entity', entityId: 'npc_mira_town' };

    expect(getTooltipContent(state, 'spell:magic_arrow')).toContain('Magic Arrow');
    expect(getTooltipContent(state, 'hotbar:2:spell:magic_arrow')).toContain('Magic Arrow');
    expect(getInteractPrompt(state)).toContain('Mira');
  });

  it('cleans stale selections and clamps managed window layouts', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'town';
    state.ui.hoverTarget = { kind: 'entity', entityId: 'enemy_bandit_1' };
    state.ui.selectedTarget = { kind: 'inventory', owner: 'inventory', slot: 0 };
    state.ui.selectedInventorySlot = 0;
    state.player.inventory.slots[0] = null;
    state.ui.windowLayouts.inventory = { x: -100, y: -100, width: 9999, height: 9999 };

    sanitizeUiStateReferences(state, { width: 420, height: 320 });
    const layout = getWindowLayout(state, 'inventory', { width: 420, height: 320 });

    expect(state.ui.hoverTarget).toBeNull();
    expect(state.ui.selectedTarget).toBeNull();
    expect(state.ui.selectedInventorySlot).toBeNull();
    expect(layout.x).toBeGreaterThanOrEqual(8);
    expect(layout.y).toBeGreaterThanOrEqual(8);
    expect(layout.x + layout.width).toBeLessThanOrEqual(420);
    expect(layout.y + layout.height).toBeLessThanOrEqual(320);
    expect(validateUiConsistency(state, { width: 420, height: 320 })).toEqual([]);
  });
});

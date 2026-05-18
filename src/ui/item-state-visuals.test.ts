import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { CharacterPanel } from './CharacterPanel';
import { Hotbar } from './Hotbar';
import { InventoryPanel } from './InventoryPanel';

describe('item and equipment visual state language', () => {
  it('marks inventory items that are equipped, hotbar-assigned, and damaged', () => {
    const state = createInitialGameState();
    state.ui.panels.inventory = true;
    state.ui.selectedInventorySlot = 0;
    state.player.inventory.slots[0]!.durability = 12;

    const html = InventoryPanel(state);

    expect(html).toContain('slot-badge equipped');
    expect(html).toContain('slot-badge hotbar-assigned');
    expect(html).toContain('slot-badge damaged');
    expect(html).toContain('item-compare');
  });

  it('separates equipped paperdoll state from active hand state', () => {
    const state = createInitialGameState();
    state.ui.panels.character = true;

    const html = CharacterPanel(state);

    expect(html).toContain('equip-slot equipped active-hand');
    expect(html).toContain('equip-badge hand');
  });

  it('shows assigned, active, equipped, quantity, and missing-requirement hotbar badges', () => {
    const state = createInitialGameState();
    state.ui.activeHotbarSlot = 2;
    state.player.mana = 0;

    const html = Hotbar(state);

    expect(html).toContain('hotbar-badge assigned');
    expect(html).toContain('hotbar-badge active-use');
    expect(html).toContain('hotbar-badge equipped-link');
    expect(html).toContain('hotbar-badge missing');
    expect(html).toContain('hotbar-badge quantity');
  });
});

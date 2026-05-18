import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './GameState';
import { deriveInputMode, hotbarSlotFromKeyboardCode, KEYBINDINGS } from './InputRouter';

describe('input router mode rules', () => {
  it('prioritizes focused text fields over gameplay hotkeys', () => {
    const state = createInitialGameState();

    expect(deriveInputMode(state, { tagName: 'INPUT', name: 'chat' })).toBe('chatFocused');
    expect(deriveInputMode(state, { tagName: 'INPUT', name: 'spell-search' })).toBe('chatFocused');
  });

  it('makes targeting, building, pause, and dev overlay explicit modes', () => {
    const state = createInitialGameState();

    expect(deriveInputMode(state, null)).toBe('normal');

    state.ui.targeting = { mode: 'spell', spellId: 'magic_arrow', prompt: 'Select a target.' };
    state.ui.panels.inventory = true;
    expect(deriveInputMode(state, null)).toBe('targeting');

    state.ui.targeting = null;
    state.buildMode.active = true;
    expect(deriveInputMode(state, null)).toBe('building');

    state.paused = true;
    expect(deriveInputMode(state, null)).toBe('paused');

    state.paused = false;
    state.dev.overlay = true;
    expect(deriveInputMode(state, null)).toBe('devOverlay');
  });

  it('separates UI, item, and spell dragging from gameplay movement', () => {
    const state = createInitialGameState();

    expect(deriveInputMode(state, null, 'ui:inventory')).toBe('uiDragging');
    expect(deriveInputMode(state, null, 'item:iron_sword')).toBe('itemDragging');
    expect(deriveInputMode(state, null, 'spell:magic_arrow')).toBe('spellDragging');
  });

  it('treats trade and merchant windows as modal UI interaction', () => {
    const state = createInitialGameState();

    state.ui.merchant = { partnerId: 'npc_blacksmith' };
    expect(deriveInputMode(state, null)).toBe('modalOpen');
  });

  it('centralizes panel and hotbar key definitions', () => {
    expect(KEYBINDINGS.panels.inventory.key).toBe('i');
    expect(KEYBINDINGS.panels.spellbook.intent).toBe('TOGGLE_PANEL');
    expect(KEYBINDINGS.actions.build.key).toBe('b');
    expect(hotbarSlotFromKeyboardCode('Digit1')).toBe(0);
    expect(hotbarSlotFromKeyboardCode('Digit0')).toBe(9);
  });
});

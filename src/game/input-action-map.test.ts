import { describe, expect, it } from 'vitest';
import {
  createDefaultInputBindings,
  findInputBindingConflicts,
  hotbarSlotForAction,
  inputActionDefinitions,
  inputContextsForMode,
  keyLabel,
  keyTokenFromEvent,
  rebindInputAction,
  resolveInputAction
} from './InputActionMap';

function keyboard(key: string, patch: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...patch
  } as KeyboardEvent;
}

describe('input action map', () => {
  it('defines core gameplay, UI, and hotbar actions centrally', () => {
    expect(inputActionDefinitions.interact.label).toBe('Interact');
    expect(inputActionDefinitions.openInventory.context).toBe('ui');
    expect(inputActionDefinitions.openMarket.label).toBe('Open Market');
    expect(inputActionDefinitions.openContextMenu.promptLabel).toBe('Context Menu');
    expect(hotbarSlotForAction('hotbar1')).toBe(0);
    expect(hotbarSlotForAction('hotbar10')).toBe(9);
  });

  it('keeps typing focus out of gameplay binding contexts', () => {
    expect(inputContextsForMode('chatFocused')).toEqual([]);

    const action = resolveInputAction(createDefaultInputBindings(), keyboard('1'), inputContextsForMode('chatFocused'));

    expect(action).toBeNull();
  });

  it('resolves default panel and gameplay bindings through the action map', () => {
    const bindings = createDefaultInputBindings();

    expect(resolveInputAction(bindings, keyboard('i'), inputContextsForMode('normal'))?.actionId).toBe('openInventory');
    expect(resolveInputAction(bindings, keyboard('w'), inputContextsForMode('normal'))?.actionId).toBe('moveUp');
    expect(resolveInputAction(bindings, keyboard('Tab', { shiftKey: true }), inputContextsForMode('normal'))?.actionId).toBe('targetNext');
    expect(keyTokenFromEvent(keyboard('F10', { shiftKey: true }))).toBe('shift+f10');
  });

  it('rebinding core actions works while preserving visible conflict warnings', () => {
    const rebound = rebindInputAction(createDefaultInputBindings(), 'openInventory', 'ui', 'k');

    expect(resolveInputAction(rebound, keyboard('k'), inputContextsForMode('normal'))?.actionId).toBe('openInventory');
    expect(findInputBindingConflicts(rebound)).toContainEqual(
      expect.objectContaining({
        context: 'ui',
        key: 'k',
        labels: expect.arrayContaining(['Open Inventory', 'Open Skills'])
      })
    );
    expect(keyLabel('shift+f10')).toBe('SHIFT+F10');
  });
});

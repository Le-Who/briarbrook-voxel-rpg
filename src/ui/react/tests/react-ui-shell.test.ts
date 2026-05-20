import { describe, expect, it, vi } from 'vitest';
import type { GameAction } from '../../../game/Actions';
import { createInitialGameState } from '../../../game/GameState';
import { createReactUIBridge } from '../bridge/ReactUIBridge';
import { getPanelOwner, isReactPanel, uiPanelRegistry } from '../bridge/uiPanelRegistry';

describe('React UI shell bridge', () => {
  it('keeps panel ownership explicit so coexistence cannot duplicate migrated panels', () => {
    expect(uiPanelRegistry.inventory).toBe('react');
    expect(uiPanelRegistry.bank).toBe('react');
    expect(uiPanelRegistry.hotbar).toBe('react');
    expect(uiPanelRegistry.spellbook).toBe('react');
    expect(uiPanelRegistry.crafting).toBe('react');
    expect(uiPanelRegistry.market).toBe('react');
    expect(uiPanelRegistry.journal).toBe('react');
    expect(uiPanelRegistry.build).toBe('react');
    expect(uiPanelRegistry.chat).toBe('react');
    expect(uiPanelRegistry.help).toBe('react');
    expect(uiPanelRegistry.settings).toBe('react');
    expect(getPanelOwner('inventory')).toBe('react');
    expect(isReactPanel('inventory')).toBe(true);
    expect(isReactPanel('spellbook')).toBe(true);
    expect(isReactPanel('build')).toBe(true);
  });

  it('delegates commands through the provided dispatch path and reads the latest state snapshot', () => {
    let state = createInitialGameState();
    const dispatched: GameAction[] = [];
    const listener = vi.fn();
    const unsubscribe = vi.fn();
    const sourceSubscribe = vi.fn((callback: () => void) => {
      callback();
      return unsubscribe;
    });
    const bridge = createReactUIBridge({
      getState: () => state,
      dispatch: (action) => dispatched.push(action),
      subscribe: sourceSubscribe
    });

    expect(bridge.getState()).toBe(state);
    bridge.dispatch({ type: 'TOGGLE_PANEL', panel: 'inventory', open: true });
    expect(dispatched).toEqual([{ type: 'TOGGLE_PANEL', panel: 'inventory', open: true }]);

    const nextState = createInitialGameState();
    nextState.ui.prompt = 'updated from simulation';
    state = nextState;
    expect(bridge.getState().ui.prompt).toBe('updated from simulation');

    expect(bridge.subscribe(listener)).toBe(unsubscribe);
    expect(sourceSubscribe).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();
  });
});

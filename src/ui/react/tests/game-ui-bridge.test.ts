import { describe, expect, it, vi } from 'vitest';
import { createInitialGameState } from '../../../game/GameState';
import type { GameAction } from '../../../game/Actions';
import { createGameUIBridge } from '../bridge/GameUIBridge';
import { selectInventorySlots, selectSpellCastability } from '../bridge/selectors';

describe('Game UI bridge selectors and commands', () => {
  it('exposes immutable inventory snapshots and dispatches item transfers as Simulation actions', () => {
    const state = createInitialGameState();
    const actions: GameAction[] = [];
    const bridge = createGameUIBridge({
      getState: () => state,
      dispatch: (action) => actions.push(action),
      subscribe: () => vi.fn()
    });

    const snapshot = bridge.getSnapshot();
    expect(Object.isFrozen(snapshot.inventory.slots)).toBe(true);
    expect(selectInventorySlots(state)[0]?.itemId).toBe('iron_sword');

    const result = bridge.commands.transferToBank(0);
    expect(result.accepted).toBe(true);
    expect(actions).toEqual([{ type: 'MOVE_ITEM', from: 'inventory', to: 'bank', slot: 0 }]);
  });

  it('dispatches hotbar assignment without mutating the hotbar array directly', () => {
    const state = createInitialGameState();
    const originalHotbar = [...state.ui.hotbar];
    const actions: GameAction[] = [];
    const bridge = createGameUIBridge({
      getState: () => state,
      dispatch: (action) => actions.push(action),
      subscribe: () => vi.fn()
    });

    bridge.commands.assignHotbar(4, { kind: 'spell', id: 'heal' });

    expect(state.ui.hotbar).toEqual(originalHotbar);
    expect(actions).toEqual([{ type: 'SET_HOTBAR_SLOT', slot: 4, binding: { kind: 'spell', id: 'heal' } }]);
  });

  it('centralizes spell castability for React without direct gameplay mutation', () => {
    const state = createInitialGameState();

    expect(selectSpellCastability(state, 'magic_arrow')).toMatchObject({
      known: true,
      canCast: true,
      reason: ''
    });

    state.player.mana = 0;
    expect(selectSpellCastability(state, 'magic_arrow')).toMatchObject({
      canCast: false,
      reason: 'Not enough mana'
    });
  });
});

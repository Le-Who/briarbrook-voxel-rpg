import { describe, expect, it } from 'vitest';
import { createInitialGameState, createStack } from '../game/GameState';
import { moveStackBetween } from './InventorySystem';

describe('inventory drag moves', () => {
  it('moves an item to a specific empty slot in the same inventory', () => {
    const state = createInitialGameState();
    const stack = state.player.inventory.slots[0];
    state.player.inventory.slots[30] = null;

    moveStackBetween(state, 'inventory', 'inventory', 0, 30);

    expect(state.player.inventory.slots[0]).toBeNull();
    expect(state.player.inventory.slots[30]).toBe(stack);
  });

  it('swaps non-stackable items when dropped onto an occupied pack slot', () => {
    const state = createInitialGameState();
    const sword = state.player.inventory.slots[0];
    const bow = state.player.inventory.slots[1];

    moveStackBetween(state, 'inventory', 'inventory', 0, 1);

    expect(state.player.inventory.slots[0]).toBe(bow);
    expect(state.player.inventory.slots[1]).toBe(sword);
  });

  it('merges stackable items into the target slot first', () => {
    const state = createInitialGameState();
    state.player.inventory.slots[0] = createStack('bandage', 5);
    state.player.inventory.slots[1] = createStack('bandage', 8);

    moveStackBetween(state, 'inventory', 'inventory', 0, 1);

    expect(state.player.inventory.slots[0]).toBeNull();
    expect(state.player.inventory.slots[1]?.quantity).toBe(13);
  });
});

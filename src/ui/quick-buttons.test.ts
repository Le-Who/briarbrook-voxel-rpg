import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { shouldShowMarketQuickButton } from './UIManager';

describe('quick button unlocks', () => {
  it('keeps market hidden on a fresh save until the player has tradable goods', () => {
    const state = createInitialGameState();

    expect(shouldShowMarketQuickButton(state)).toBe(false);

    state.dev.telemetry.resourceYields.logs = 8;

    expect(shouldShowMarketQuickButton(state)).toBe(true);
  });
});

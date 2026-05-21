import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { renderActionProgressForState, renderHudPromptForState } from './UIManager';

describe('HUD action progress policy', () => {
  it('does not duplicate active gathering progress outside the world label', () => {
    const state = createInitialGameState();

    state.gathering = {
      entityId: 'res_tree_5',
      actionLabel: 'Chop Oak Tree',
      startedAt: 1,
      duration: 5,
      remaining: 2
    };

    expect(renderActionProgressForState(state)).toBe('');
  });

  it('suppresses the bottom prompt when gathering progress already has a world label', () => {
    const state = createInitialGameState();

    state.gathering = {
      entityId: 'res_tree_5',
      actionLabel: 'Chopping Oak Tree',
      startedAt: 1,
      duration: 5,
      remaining: 2
    };
    state.ui.prompt = 'Chopping Oak Tree... 60%';

    expect(renderHudPromptForState(state)).toBe('');
  });
});

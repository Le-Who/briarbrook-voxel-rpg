import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { AMBIENT_CHAT_INTERVAL_SECONDS, updateAmbientChat } from './ChatSystem';

describe('release chat cadence', () => {
  it('keeps ambient local chatter moderate by default', () => {
    const state = createInitialGameState();
    const initialCount = state.chat.length;

    state.clock = AMBIENT_CHAT_INTERVAL_SECONDS - 0.1;
    updateAmbientChat(state, 0.1);
    expect(state.chat).toHaveLength(initialCount);

    state.clock = AMBIENT_CHAT_INTERVAL_SECONDS + 0.1;
    updateAmbientChat(state, 0.2);
    expect(state.chat).toHaveLength(initialCount + 1);
  });
});

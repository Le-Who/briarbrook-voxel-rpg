import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { AMBIENT_CHAT_INTERVAL_SECONDS, addChat, updateAmbientChat } from './ChatSystem';

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

  it('uses the configured retention cap for chat history', () => {
    const state = createInitialGameState();
    state.ui.chatMessageRetention = 40;
    state.chat = [];

    for (let index = 0; index < 45; index += 1) {
      state.clock = index;
      addChat(state, `Line ${index}`);
    }

    expect(state.chat).toHaveLength(40);
    expect(state.chat[0].text).toBe('Line 5');
  });
});

import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { ACTION_FEEDBACK_CHANNELS, invalidAction, pushActionFeedback, resourceGained } from './ActionFeedbackSystem';

describe('action feedback language', () => {
  it('keeps transient action results out of chat by default', () => {
    const state = createInitialGameState();
    const chatCount = state.chat.length;

    resourceGained(state, '+4 Logs', state.player.position);

    expect(state.ui.prompt).toBe('+4 Logs');
    expect(state.floatingTexts.at(-1)?.text).toBe('+4 Logs');
    expect(state.chat).toHaveLength(chatCount);
  });

  it('explains invalid actions and suppresses repeated floating spam', () => {
    const state = createInitialGameState();

    state.clock = 10;
    invalidAction(state, 'You need a tree to chop this.', 'Select a tree.', { position: state.player.position });
    expect(state.ui.prompt).toBe('You need a tree to chop this. Select a tree.');
    expect(state.floatingTexts).toHaveLength(1);

    state.clock = 10.5;
    invalidAction(state, 'You need a tree to chop this.', 'Select a tree.', { position: state.player.position });
    expect(state.ui.prompt).toBe('You need a tree to chop this. Select a tree.');
    expect(state.floatingTexts).toHaveLength(1);

    state.clock = 12;
    invalidAction(state, 'You need a tree to chop this.', 'Select a tree.', { position: state.player.position });
    expect(state.floatingTexts).toHaveLength(2);
  });

  it('uses chat only for persistent or explicitly logged feedback', () => {
    const state = createInitialGameState();
    const chatCount = state.chat.length;

    pushActionFeedback(state, {
      type: 'world-change',
      message: 'A stone wall rises.',
      detail: 'Wall of Stone changed the world.',
      chat: true
    });

    expect(state.ui.prompt).toBe('A stone wall rises.');
    expect(state.chat).toHaveLength(chatCount + 1);
    expect(state.chat.at(-1)?.text).toBe('Wall of Stone changed the world.');
  });

  it('defines the required channels for action readability', () => {
    expect(ACTION_FEEDBACK_CHANNELS['target-invalid']).toEqual(expect.arrayContaining(['cursor', 'floating-text', 'toast']));
    expect(ACTION_FEEDBACK_CHANNELS['action-start']).toEqual(expect.arrayContaining(['animation', 'progress']));
    expect(ACTION_FEEDBACK_CHANNELS['resource-gained']).toEqual(expect.arrayContaining(['floating-text', 'ui-badge']));
    expect(ACTION_FEEDBACK_CHANNELS['world-change']).toEqual(expect.arrayContaining(['journal', 'chat-log']));
    expect(ACTION_FEEDBACK_CHANNELS['action-success']).not.toContain('chat-log');
  });
});

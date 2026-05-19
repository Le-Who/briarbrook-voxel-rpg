import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import type { ChatMessage } from '../game/types';
import { ChatPanel } from './ChatPanel';

describe('ChatPanel', () => {
  it('renders as a managed first-class chat window with tabs, filters, and latest control', () => {
    const state = createInitialGameState();
    state.chat = makeMessages(6, 'Local');

    const html = ChatPanel(state);

    expect(html).toContain('class="panel chat-panel');
    expect(html).toContain('data-window-id="chat"');
    expect(html).toContain('data-window-id="chat"');
    expect(html).toContain('data-chat-tab="Local"');
    expect(html).toContain('data-chat-tab="Rumors"');
    expect(html).toContain('data-chat-channel-toggle="System"');
    expect(html).toContain('data-action="chat-opacity"');
    expect(html).toContain('data-action="chat-retention"');
    expect(html).toContain('data-chat-latest="1"');
  });

  it('collapses to a small gameplay-safe button with an important-message badge', () => {
    const state = createInitialGameState();
    state.ui.chatMode = 'collapsed';
    state.chat.push({ id: 'sys-1', channel: 'System', text: 'Bank box is full.', tone: 'system', createdAt: 1 });

    const html = ChatPanel(state);

    expect(html).toContain('chat-collapsed-button');
    expect(html).toContain('data-chat-mode="expanded"');
    expect(html).toContain('data-chat-unread="');
    expect(html).not.toContain('class="panel chat-panel');
    expect(html).not.toContain('data-window-id="chat"');
  });

  it('filters hidden channels and escapes chat content', () => {
    const state = createInitialGameState();
    state.ui.chatTab = 'Local';
    state.ui.chatHiddenChannels = ['Global'];
    state.chat = [
      { id: 'local', channel: 'Local', speaker: '<Scout>', text: 'A <tree> fell', tone: 'normal', createdAt: 1 },
      { id: 'global', channel: 'Global', speaker: 'Trader', text: 'WTS ore', tone: 'trade', createdAt: 2 }
    ];

    const html = ChatPanel(state);

    expect(html).toContain('&lt;Scout&gt;');
    expect(html).toContain('A &lt;tree&gt; fell');
    expect(html).not.toContain('WTS ore');
    expect(html).toContain('data-chat-channel-toggle="Global"');
  });

  it('uses compact virtualization for compact chat mode', () => {
    const state = createInitialGameState();
    state.ui.chatMode = 'compact';
    state.chat = makeMessages(50, 'Local');

    const html = ChatPanel(state);

    expect(html).toContain('chat-mode-compact');
    expect(html).toContain('data-total-rows="50"');
    expect(html).toContain('data-rendered-rows="32"');
    expect(html).not.toContain('Line 0');
    expect(html).toContain('Line 49');
  });
});

function makeMessages(count: number, channel: ChatMessage['channel']): ChatMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `chat-${index}`,
    channel,
    speaker: 'Scout',
    text: `Line ${index}`,
    createdAt: index
  }));
}

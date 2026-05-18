import type { ChatMessage, GameState } from '../game/types';

const tabs: ChatMessage['channel'][] = ['Local', 'Global', 'Party', 'Guild'];

export function ChatPanel(state: GameState): string {
  const visible = state.chat.filter((message) => message.channel === state.ui.chatTab || message.channel === 'System').slice(-8);
  return `<section class="panel chat-panel">
    <div class="chat-tabs">
      ${tabs.map((tab) => `<button class="${state.ui.chatTab === tab ? 'active' : ''}" data-chat-tab="${tab}">${tab}</button>`).join('')}
    </div>
    <div class="chat-log">
      ${visible
        .map((message) => `<div class="chat-line ${message.tone ?? ''}">${message.speaker ? `<span>${message.speaker}:</span> ` : ''}${message.text}</div>`)
        .join('')}
    </div>
    <form class="chat-input" data-action="send-chat"><label>Say:</label><input name="chat" autocomplete="off"/><button>↵</button></form>
  </section>`;
}

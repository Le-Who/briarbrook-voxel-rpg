import type { ChatMessage, GameState } from '../game/types';

const tabs: ChatMessage['channel'][] = ['Local', 'Party', 'Guild', 'Global', 'System', 'Rumors'];
const retentionOptions = [40, 80, 120, 180, 240];

export function ChatPanel(state: GameState): string {
  const inCombat = Boolean(state.player.activeTargetId || state.combat.meleeCooldown > 0 || state.combat.rangedCooldown > 0 || state.combat.magicCooldown > 0);
  const effectiveMode = state.ui.chatMode === 'combatHidden' && inCombat ? 'collapsed' : state.ui.chatMode;
  const hiddenChannels = new Set(state.ui.chatHiddenChannels ?? []);
  const importantCount = state.chat.slice(-12).filter((message) => message.channel === 'System' || message.channel === 'Rumors' || message.tone === 'danger').length;

  if (effectiveMode === 'collapsed') {
    return `<button class="chat-collapsed-button ui-contained-window ${importantCount > 0 ? 'has-unread' : ''}" data-chat-mode="expanded" data-chat-unread="${importantCount}" aria-label="Open chat">
      <span>Chat</span>${importantCount > 0 ? `<b>${importantCount}</b>` : ''}
    </button>`;
  }

  const mode = effectiveMode === 'combatHidden' ? 'compact' : effectiveMode;
  const retention = clampNumber(state.ui.chatMessageRetention, 40, 240, 120);
  const opacity = clampNumber(state.ui.chatOpacity, 0.45, 1, 0.96);
  const retained = state.chat.slice(-retention);
  const matching = retained.filter((message) => !hiddenChannels.has(message.channel) && message.channel === state.ui.chatTab);
  const windowRows = mode === 'compact' ? 32 : 80;
  const visible = matching.slice(-windowRows);

  return `<section class="panel chat-panel ui-contained-window chat-mode-${mode}" data-window-id="chat" data-chat-mode="${state.ui.chatMode}" style="--chat-opacity:${opacity.toFixed(2)}">
    <header>
      <span>Chat</span>
      <div class="chat-window-controls" data-no-window-drag="true">
        ${chatModeButton('expanded', '▣', state.ui.chatMode)}
        ${chatModeButton('compact', '▤', state.ui.chatMode)}
        ${chatModeButton('combatHidden', '◇', state.ui.chatMode)}
        ${chatModeButton('collapsed', '−', state.ui.chatMode)}
      </div>
    </header>
    <div class="chat-tabs ${state.ui.showChatTabs ? '' : 'hidden'}">
      ${tabs.map((tab) => `<button class="${state.ui.chatTab === tab ? 'active' : ''} ${hiddenChannels.has(tab) ? 'muted' : ''}" data-chat-tab="${tab}" data-no-window-drag="true">${tab}</button>`).join('')}
    </div>
    <div class="chat-filter-strip" data-no-window-drag="true">
      ${tabs.map((tab) => `<button class="${hiddenChannels.has(tab) ? 'muted' : 'active'}" data-chat-channel-toggle="${tab}" title="${hiddenChannels.has(tab) ? 'Show' : 'Hide'} ${tab}">${tab.slice(0, 1)}</button>`).join('')}
      <input class="chat-opacity" type="range" min="0.45" max="1" step="0.05" value="${opacity.toFixed(2)}" data-action="chat-opacity" aria-label="Chat opacity"/>
      <select class="chat-retention" data-action="chat-retention" aria-label="Chat message cap">
        ${retentionOptions.map((option) => `<option value="${option}" ${retention === option ? 'selected' : ''}>${option}</option>`).join('')}
      </select>
    </div>
    <div class="chat-log" data-virtualized-list="chat" data-total-rows="${matching.length}" data-rendered-rows="${visible.length}">
      ${visible.map(chatLine).join('')}
    </div>
    <button class="chat-jump-latest" data-chat-latest="1" data-no-window-drag="true">Latest</button>
    <form class="chat-input" data-action="send-chat"><label>Say:</label><input name="chat" autocomplete="off"/><button>↵</button></form>
  </section>`;
}

function chatModeButton(mode: GameState['ui']['chatMode'], label: string, activeMode: GameState['ui']['chatMode']): string {
  return `<button class="${activeMode === mode ? 'active' : ''}" data-chat-mode="${mode}" data-no-window-drag="true" title="${mode}">${label}</button>`;
}

function chatLine(message: ChatMessage): string {
  return `<div class="chat-line ${attr(message.tone ?? '')}" data-chat-channel="${attr(message.channel)}">${message.speaker ? `<span>${attr(message.speaker)}:</span> ` : ''}${attr(message.text)}</div>`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

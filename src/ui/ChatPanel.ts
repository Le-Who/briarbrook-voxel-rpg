import type { ChatMessage, GameState } from '../game/types';

const playerTabs: ChatMessage['channel'][] = ['Local', 'Party', 'Guild', 'Global', 'System'];
const tabLabels: Record<ChatMessage['channel'], string> = {
  Local: 'Local',
  Party: 'Party',
  Guild: 'Guild',
  Global: 'Trade',
  System: 'System',
  Rumors: 'System'
};

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
  const matching = retained.filter((message) => chatMessageMatchesTab(message, state.ui.chatTab, hiddenChannels));
  const windowRows = mode === 'compact' ? 32 : 80;
  const visible = matching.slice(-windowRows);
  const activeTab = playerTabs.includes(state.ui.chatTab) ? state.ui.chatTab : 'System';

  return `<section class="panel chat-panel ui-contained-window chat-mode-${mode}" data-window-id="chat" data-chat-layout="player-chat" data-chat-mode="${state.ui.chatMode}" style="--chat-opacity:${opacity.toFixed(2)}">
    <header>
      <span>Chat${importantCount > 0 ? ` <b class="chat-unread-badge">${importantCount}</b>` : ''}</span>
      <div class="chat-window-controls" data-no-window-drag="true">
        ${chatModeButton(mode === 'expanded' ? 'compact' : 'expanded', mode === 'expanded' ? 'Compact' : 'Expand', state.ui.chatMode)}
        ${chatModeButton('collapsed', '-', state.ui.chatMode, 'Collapse chat')}
      </div>
    </header>
    <div class="chat-tabs ${state.ui.showChatTabs ? '' : 'hidden'}">
      ${playerTabs.map((tab) => `<button class="${activeTab === tab ? 'active' : ''}" data-chat-tab="${tab}" data-no-window-drag="true">${tabLabels[tab]}</button>`).join('')}
    </div>
    <div class="chat-log" data-chat-scroll="true" data-virtualized-list="chat" data-total-rows="${matching.length}" data-rendered-rows="${visible.length}">
      ${visible.map(chatLine).join('')}
    </div>
    <form class="chat-input" data-action="send-chat" data-chat-input="true"><input name="chat" autocomplete="off" aria-label="Chat message" placeholder="Say something..."/><button>Send</button></form>
  </section>`;
}

function chatModeButton(mode: GameState['ui']['chatMode'], label: string, activeMode: GameState['ui']['chatMode'], ariaLabel = label): string {
  return `<button class="${activeMode === mode ? 'active' : ''}" data-chat-mode="${mode}" data-no-window-drag="true" title="${attr(ariaLabel)}" aria-label="${attr(ariaLabel)}">${label}</button>`;
}

function chatLine(message: ChatMessage): string {
  const tone = chatMessageTone(message);
  return `<div class="chat-line ${attr(tone)}" data-chat-channel="${attr(message.channel)}" data-chat-message-channel="${attr(message.channel)}" data-chat-message-tone="${attr(tone)}"><time>${chatTimestamp(message.createdAt)}</time><span>${message.speaker ? `${attr(message.speaker)}:` : tabLabels[message.channel]}</span><p>${attr(message.text)}</p></div>`;
}

function chatMessageMatchesTab(message: ChatMessage, tab: ChatMessage['channel'], hiddenChannels: Set<ChatMessage['channel']>): boolean {
  if (hiddenChannels.has(message.channel)) return false;
  if (tab === 'Local') return message.channel === 'Local' || message.channel === 'System' || message.channel === 'Rumors';
  if (tab === 'System') return message.channel === 'System' || message.channel === 'Rumors';
  if (tab === 'Rumors') return message.channel === 'Rumors' || message.channel === 'System';
  return message.channel === tab;
}

function chatMessageTone(message: ChatMessage): NonNullable<ChatMessage['tone']> {
  if (message.tone) return message.tone;
  if (message.channel === 'Global') return 'trade';
  if (message.channel === 'Party' || message.channel === 'Guild') return 'party';
  if (message.channel === 'System' || message.channel === 'Rumors') return 'system';
  return 'normal';
}

function chatTimestamp(createdAt: number): string {
  const totalSeconds = Math.max(0, Math.floor(createdAt));
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

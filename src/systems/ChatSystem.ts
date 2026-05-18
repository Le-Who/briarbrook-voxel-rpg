import { areas } from '../data/areas';
import { createId } from '../game/GameState';
import type { ChatMessage, GameState } from '../game/types';

const socialLines = [
  { speaker: 'Zeddo', text: 'WTB Iron Ore 20g each', tone: 'trade' as const },
  { speaker: 'Liora', text: 'WTS [Health Potion] x5 15g', tone: 'trade' as const },
  { speaker: 'Gornak', text: 'LF1M Healer - Mossdeep Crypt', tone: 'normal' as const },
  { speaker: 'Kippa', text: 'WTS [Mana Potion] x5 25g', tone: 'trade' as const },
  { speaker: 'Thallor', text: 'LF2M DPS - Goblin Caves', tone: 'normal' as const },
  { speaker: 'Pyrel', text: 'WTB Bread x20', tone: 'trade' as const },
  { speaker: 'Aric', text: 'anyone up for some kobolds?', tone: 'normal' as const },
  { speaker: 'Durnok', text: 'need a healer?', tone: 'party' as const },
  { speaker: 'Marshal Torren', text: 'Fresh bread and wares!', tone: 'trade' as const },
  { speaker: 'Mira', text: 'crypt turn-in at the fountain', tone: 'normal' as const },
  { speaker: 'Kippa', text: 'WTS [Iron Sword] 50g', tone: 'trade' as const }
];

export const AMBIENT_CHAT_INTERVAL_SECONDS = 24;
let socialCursor = 0;

export function addChat(
  state: GameState,
  text: string,
  options: Partial<Pick<ChatMessage, 'speaker' | 'channel' | 'tone'>> = {}
): void {
  state.chat.push({
    id: createId('chat'),
    channel: options.channel ?? 'Local',
    speaker: options.speaker,
    text,
    tone: options.tone ?? 'normal',
    createdAt: state.clock
  });
  if (state.chat.length > 80) {
    state.chat.splice(0, state.chat.length - 80);
  }
}

export function addSystemMessage(state: GameState, text: string): void {
  addChat(state, text, { channel: 'System', tone: 'system' });
}

export function addAreaWelcome(state: GameState): void {
  addSystemMessage(state, `Welcome to ${areas[state.player.currentArea].name}!`);
}

export function updateAmbientChat(state: GameState, dt: number): void {
  if (!state.ui.panels.trade && Math.floor((state.clock - dt) / AMBIENT_CHAT_INTERVAL_SECONDS) !== Math.floor(state.clock / AMBIENT_CHAT_INTERVAL_SECONDS)) {
    const activeEvent = state.world.activeEvents?.find((event) => event.discovered) ?? null;
    if (activeEvent) {
      addChat(state, activeEvent.rumor, { speaker: activeEvent.type === 'market_day' ? 'Town Crier' : 'Rumor', tone: activeEvent.type === 'bandit_ambush' || activeEvent.type === 'crypt_spill' ? 'danger' : 'normal' });
      return;
    }
    const line = socialLines[socialCursor % socialLines.length];
    socialCursor += 1;
    addChat(state, line.text, { speaker: line.speaker, tone: line.tone });
  }
}

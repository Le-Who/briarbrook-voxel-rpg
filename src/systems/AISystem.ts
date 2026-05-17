import type { GameState } from '../game/types';
import { addChat } from './ChatSystem';

export function updateSocialNpcs(state: GameState, dt: number): void {
  if (state.player.currentArea !== 'town') return;
  for (const entity of Object.values(state.entities)) {
    if (entity.kind !== 'social' || entity.area !== 'town') continue;
    const phase = state.clock * 0.35 + entity.id.length;
    entity.position.x += Math.sin(phase) * dt * 0.08;
    entity.position.z += Math.cos(phase * 0.8) * dt * 0.08;
  }
  if (Math.floor((state.clock - dt) / 21) !== Math.floor(state.clock / 21)) {
    addChat(state, 'WTT [Silver Ring] for [Iron Sword]', { speaker: 'Valen', tone: 'trade' });
  }
}

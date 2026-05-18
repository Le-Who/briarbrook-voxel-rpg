import type { AreaId, Vec3 } from '../game/types';

export type AudioCueType =
  | 'ui_click'
  | 'window_open'
  | 'window_close'
  | 'item_pickup'
  | 'skill_gain'
  | 'spell_cast'
  | 'spell_fizzle'
  | 'hit'
  | 'block'
  | 'parry'
  | 'tree_chop'
  | 'mining_hit'
  | 'chest_unlock'
  | 'chest_open'
  | 'trap_trigger'
  | 'market_transaction';

export interface AudioCueDetail {
  type: AudioCueType;
  id?: string;
  area?: AreaId;
  position?: Vec3;
  intensity?: number;
  createdAt: number;
}

export const audioCueTypes: AudioCueType[] = [
  'ui_click',
  'window_open',
  'window_close',
  'item_pickup',
  'skill_gain',
  'spell_cast',
  'spell_fizzle',
  'hit',
  'block',
  'parry',
  'tree_chop',
  'mining_hit',
  'chest_unlock',
  'chest_open',
  'trap_trigger',
  'market_transaction'
];

export function emitAudioHook(type: AudioCueType, detail: Partial<Omit<AudioCueDetail, 'type' | 'createdAt'>> = {}): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  const createdAt = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
  window.dispatchEvent(new CustomEvent<AudioCueDetail>('briarbrook:audio-cue', { detail: { type, createdAt, ...detail } }));
}

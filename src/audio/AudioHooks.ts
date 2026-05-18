import type { AreaId, Vec3 } from '../game/types';

export type AudioCueType =
  | 'ui_click'
  | 'ui_confirm'
  | 'ui_cancel'
  | 'window_open'
  | 'window_close'
  | 'invalid_action'
  | 'item_pickup'
  | 'equip'
  | 'unequip'
  | 'skill_gain'
  | 'weapon_swing'
  | 'weapon_hit'
  | 'weapon_block'
  | 'bow_draw'
  | 'bow_release'
  | 'spell_cast'
  | 'spell_fizzle'
  | 'spell_impact'
  | 'hit'
  | 'block'
  | 'parry'
  | 'tree_chop'
  | 'mining_hit'
  | 'gather_chop'
  | 'gather_mine'
  | 'gather_fish'
  | 'chest_unlock'
  | 'chest_open'
  | 'trap_trigger'
  | 'door_portal'
  | 'craft_station'
  | 'market_transaction'
  | 'ambient_town'
  | 'ambient_forest'
  | 'ambient_crypt'
  | 'danger_warning';

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
  'ui_confirm',
  'ui_cancel',
  'window_open',
  'window_close',
  'invalid_action',
  'item_pickup',
  'equip',
  'unequip',
  'skill_gain',
  'weapon_swing',
  'weapon_hit',
  'weapon_block',
  'bow_draw',
  'bow_release',
  'spell_cast',
  'spell_fizzle',
  'spell_impact',
  'hit',
  'block',
  'parry',
  'tree_chop',
  'mining_hit',
  'gather_chop',
  'gather_mine',
  'gather_fish',
  'chest_unlock',
  'chest_open',
  'trap_trigger',
  'door_portal',
  'craft_station',
  'market_transaction',
  'ambient_town',
  'ambient_forest',
  'ambient_crypt',
  'danger_warning'
];

export function emitAudioHook(type: AudioCueType, detail: Partial<Omit<AudioCueDetail, 'type' | 'createdAt'>> = {}): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  const createdAt = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
  window.dispatchEvent(new CustomEvent<AudioCueDetail>('briarbrook:audio-cue', { detail: { type, createdAt, ...detail } }));
}

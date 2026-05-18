import type { AreaId, AudioSettingsState, AudioVolumeCategory } from '../game/types';
import type { AudioCueDetail, AudioCueType } from './AudioHooks';
import { createDefaultAudioSettings } from './AudioSettings';

export type AudioCueCategory = Exclude<AudioVolumeCategory, 'master' | 'music'>;

export interface AudioCueSpec {
  type: AudioCueType;
  category: AudioCueCategory;
  label: string;
  frequency: number;
  duration: number;
  wave: OscillatorType;
  cooldownMs: number;
  poolSize: number;
  visualSubstitute: string;
  critical?: boolean;
}

export interface AudioPlaybackResult {
  type: AudioCueType;
  played: boolean;
  reason?: 'cooldown' | 'muted' | 'unfocused' | 'unavailable';
  volume: number;
  visualSubstitute: string | null;
}

type AudioSink = (spec: AudioCueSpec, volume: number, cue: AudioCueDetail) => void;

const cue = (type: AudioCueType, category: AudioCueCategory, label: string, frequency: number, duration: number, wave: OscillatorType, cooldownMs: number, visualSubstitute: string, critical = false): AudioCueSpec => ({
  type,
  category,
  label,
  frequency,
  duration,
  wave,
  cooldownMs,
  poolSize: category === 'ambient' ? 1 : 4,
  visualSubstitute,
  critical
});

export const audioCueCatalog: Record<AudioCueType, AudioCueSpec> = {
  ui_click: cue('ui_click', 'ui', 'UI click', 520, 0.035, 'triangle', 45, 'Button press'),
  ui_confirm: cue('ui_confirm', 'ui', 'UI confirm', 660, 0.055, 'triangle', 70, 'Confirmed'),
  ui_cancel: cue('ui_cancel', 'ui', 'UI cancel', 220, 0.05, 'sine', 80, 'Cancelled'),
  window_open: cue('window_open', 'ui', 'Window open', 430, 0.06, 'sine', 90, 'Window opened'),
  window_close: cue('window_close', 'ui', 'Window close', 260, 0.055, 'sine', 90, 'Window closed'),
  invalid_action: cue('invalid_action', 'ui', 'Invalid action', 150, 0.09, 'square', 360, 'Invalid action', true),
  item_pickup: cue('item_pickup', 'sfx', 'Item pickup', 740, 0.07, 'triangle', 90, 'Item gained'),
  equip: cue('equip', 'sfx', 'Equip', 360, 0.07, 'triangle', 130, 'Equipped item'),
  unequip: cue('unequip', 'sfx', 'Unequip', 240, 0.06, 'triangle', 130, 'Unequipped item'),
  skill_gain: cue('skill_gain', 'ui', 'Skill gain', 880, 0.08, 'sine', 180, 'Skill gain'),
  weapon_swing: cue('weapon_swing', 'sfx', 'Weapon swing', 210, 0.055, 'sawtooth', 105, 'Weapon swing'),
  weapon_hit: cue('weapon_hit', 'sfx', 'Weapon hit', 105, 0.08, 'square', 80, 'Hit'),
  weapon_block: cue('weapon_block', 'combatAlert', 'Block', 185, 0.09, 'square', 120, 'Blocked', true),
  bow_draw: cue('bow_draw', 'sfx', 'Bow draw', 300, 0.07, 'triangle', 150, 'Bow drawn'),
  bow_release: cue('bow_release', 'sfx', 'Bow release', 520, 0.055, 'triangle', 90, 'Arrow released'),
  spell_cast: cue('spell_cast', 'sfx', 'Spell cast', 620, 0.11, 'sine', 130, 'Spell cast'),
  spell_fizzle: cue('spell_fizzle', 'sfx', 'Spell fizzle', 190, 0.12, 'sawtooth', 180, 'Spell fizzled', true),
  spell_impact: cue('spell_impact', 'sfx', 'Spell impact', 780, 0.08, 'triangle', 90, 'Spell impact'),
  hit: cue('hit', 'sfx', 'Hit', 105, 0.08, 'square', 80, 'Hit'),
  block: cue('block', 'combatAlert', 'Block', 185, 0.09, 'square', 120, 'Blocked', true),
  parry: cue('parry', 'combatAlert', 'Parry', 420, 0.08, 'triangle', 120, 'Parry', true),
  tree_chop: cue('tree_chop', 'sfx', 'Tree chop', 170, 0.075, 'triangle', 110, 'Chop'),
  mining_hit: cue('mining_hit', 'sfx', 'Mining hit', 260, 0.075, 'square', 110, 'Mine'),
  gather_chop: cue('gather_chop', 'sfx', 'Gather chop', 170, 0.075, 'triangle', 110, 'Chop'),
  gather_mine: cue('gather_mine', 'sfx', 'Gather mine', 260, 0.075, 'square', 110, 'Mine'),
  gather_fish: cue('gather_fish', 'sfx', 'Gather fish', 410, 0.085, 'sine', 150, 'Fish'),
  chest_unlock: cue('chest_unlock', 'sfx', 'Chest unlock', 500, 0.07, 'triangle', 160, 'Unlocked'),
  chest_open: cue('chest_open', 'sfx', 'Chest open', 330, 0.09, 'sine', 160, 'Opened'),
  trap_trigger: cue('trap_trigger', 'combatAlert', 'Trap triggered', 120, 0.16, 'sawtooth', 260, 'Trap!', true),
  door_portal: cue('door_portal', 'sfx', 'Door or portal', 260, 0.11, 'sine', 220, 'Entered area'),
  craft_station: cue('craft_station', 'sfx', 'Crafting station', 320, 0.1, 'triangle', 220, 'Crafting'),
  market_transaction: cue('market_transaction', 'ui', 'Market transaction', 700, 0.08, 'triangle', 120, 'Transaction'),
  ambient_town: cue('ambient_town', 'ambient', 'Town ambience', 220, 0.22, 'sine', 7000, 'Town ambience'),
  ambient_forest: cue('ambient_forest', 'ambient', 'Forest ambience', 330, 0.24, 'sine', 7000, 'Forest ambience'),
  ambient_crypt: cue('ambient_crypt', 'ambient', 'Crypt ambience', 95, 0.26, 'sine', 7500, 'Crypt ambience'),
  danger_warning: cue('danger_warning', 'combatAlert', 'Danger warning', 180, 0.12, 'square', 900, 'Danger warning', true)
};

export function audioCueForArea(areaId: AreaId): AudioCueType | null {
  if (areaId === 'town' || areaId === 'bank' || areaId === 'blacksmith' || areaId === 'housing') return 'ambient_town';
  if (areaId === 'forest' || areaId === 'road') return 'ambient_forest';
  if (areaId === 'crypt') return 'ambient_crypt';
  return null;
}

export class AudioManager {
  private settings: AudioSettingsState;
  private context: AudioContext | null = null;
  private readonly lastPlayed = new Map<string, number>();
  private readonly preloaded = new Set<AudioCueType>();
  private detachListener: (() => void) | null = null;
  private focused = true;

  constructor(settings: AudioSettingsState = createDefaultAudioSettings(), private readonly sink?: AudioSink) {
    this.settings = settings;
  }

  setSettings(settings: AudioSettingsState): void {
    this.settings = settings;
  }

  preloadCommonCues(types: AudioCueType[] = Object.keys(audioCueCatalog) as AudioCueType[]): number {
    types.forEach((type) => this.preloaded.add(type));
    return this.preloaded.size;
  }

  attach(target: Window = window): void {
    if (this.detachListener) return;
    this.preloadCommonCues();
    const listener = (event: Event) => {
      const cueEvent = event as CustomEvent<AudioCueDetail>;
      if (cueEvent.detail) this.handleCue(cueEvent.detail);
    };
    const visibility = () => {
      this.focused = typeof document === 'undefined' ? true : document.visibilityState !== 'hidden';
    };
    target.addEventListener('briarbrook:audio-cue', listener as EventListener);
    target.document?.addEventListener('visibilitychange', visibility);
    this.detachListener = () => {
      target.removeEventListener('briarbrook:audio-cue', listener as EventListener);
      target.document?.removeEventListener('visibilitychange', visibility);
    };
  }

  detach(): void {
    this.detachListener?.();
    this.detachListener = null;
  }

  updateAmbient(areaId: AreaId, now: number): AudioPlaybackResult | null {
    const type = audioCueForArea(areaId);
    if (!type) return null;
    return this.handleCue({ type, area: areaId, createdAt: now });
  }

  handleCue(cueDetail: AudioCueDetail, now = cueDetail.createdAt): AudioPlaybackResult {
    const spec = audioCueCatalog[cueDetail.type];
    const volume = this.effectiveVolume(spec.category);
    const visualSubstitute = spec.critical && this.settings.visualAudioCues ? spec.visualSubstitute : null;
    if (this.settings.muteWhenUnfocused && !this.focused) return { type: cueDetail.type, played: false, reason: 'unfocused', volume, visualSubstitute };
    if (volume <= 0) return { type: cueDetail.type, played: false, reason: 'muted', volume, visualSubstitute };
    const key = `${spec.type}:${cueDetail.id ?? spec.category}`;
    const previous = this.lastPlayed.get(key) ?? -Infinity;
    if (now - previous < spec.cooldownMs) return { type: cueDetail.type, played: false, reason: 'cooldown', volume, visualSubstitute };
    this.lastPlayed.set(key, now);
    if (this.sink) {
      this.sink(spec, volume, cueDetail);
      return { type: cueDetail.type, played: true, volume, visualSubstitute };
    }
    if (!this.playSynth(spec, volume)) return { type: cueDetail.type, played: false, reason: 'unavailable', volume, visualSubstitute };
    return { type: cueDetail.type, played: true, volume, visualSubstitute };
  }

  setFocusedForTests(focused: boolean): void {
    this.focused = focused;
  }

  private effectiveVolume(category: AudioCueCategory): number {
    return this.settings.volumes.master * this.settings.volumes[category];
  }

  private playSynth(spec: AudioCueSpec, volume: number): boolean {
    const context = this.ensureContext();
    if (!context) return false;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    osc.type = spec.wave;
    osc.frequency.setValueAtTime(spec.frequency, now);
    gain.gain.setValueAtTime(Math.max(0.0001, volume * 0.18), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + spec.duration);
    return true;
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    const globalAudio = globalThis as typeof globalThis & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AudioContextCtor = globalAudio.AudioContext ?? globalAudio.webkitAudioContext;
    if (!AudioContextCtor) return null;
    this.context = new AudioContextCtor();
    return this.context;
  }
}

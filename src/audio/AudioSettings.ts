import type { AudioSettingsState, AudioVolumeCategory } from '../game/types';

export const audioVolumeCategories: AudioVolumeCategory[] = ['master', 'music', 'sfx', 'ui', 'ambient', 'combatAlert'];

export const defaultAudioVolumes: Record<AudioVolumeCategory, number> = {
  master: 0.7,
  music: 0,
  sfx: 0.72,
  ui: 0.55,
  ambient: 0.38,
  combatAlert: 0.72
};

export function clampAudioVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

export function createDefaultAudioSettings(): AudioSettingsState {
  return {
    volumes: { ...defaultAudioVolumes },
    muteWhenUnfocused: true,
    visualAudioCues: true
  };
}

export function sanitizeAudioSettings(value: unknown): AudioSettingsState {
  const defaults = createDefaultAudioSettings();
  if (!value || typeof value !== 'object') return defaults;
  const record = value as Partial<AudioSettingsState> & { volumes?: Partial<Record<AudioVolumeCategory, unknown>> };
  const volumes = { ...defaults.volumes };
  for (const category of audioVolumeCategories) {
    const candidate = record.volumes?.[category];
    if (typeof candidate === 'number') volumes[category] = clampAudioVolume(candidate);
  }
  return {
    volumes,
    muteWhenUnfocused: typeof record.muteWhenUnfocused === 'boolean' ? record.muteWhenUnfocused : defaults.muteWhenUnfocused,
    visualAudioCues: typeof record.visualAudioCues === 'boolean' ? record.visualAudioCues : defaults.visualAudioCues
  };
}

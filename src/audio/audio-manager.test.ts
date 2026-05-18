import { describe, expect, it } from 'vitest';
import { audioCueTypes } from './AudioHooks';
import { AudioManager, audioCueCatalog } from './AudioManager';
import { createDefaultAudioSettings } from './AudioSettings';

describe('audio manager and accessibility settings', () => {
  it('defines the required gameplay, UI, ambience, and alert cue families', () => {
    expect(audioCueTypes).toEqual(
      expect.arrayContaining([
        'ui_click',
        'ui_confirm',
        'ui_cancel',
        'invalid_action',
        'item_pickup',
        'equip',
        'unequip',
        'weapon_swing',
        'weapon_hit',
        'weapon_block',
        'bow_draw',
        'bow_release',
        'spell_cast',
        'spell_fizzle',
        'spell_impact',
        'gather_chop',
        'gather_mine',
        'gather_fish',
        'door_portal',
        'craft_station',
        'ambient_town',
        'ambient_forest',
        'ambient_crypt',
        'danger_warning'
      ])
    );
    expect(audioCueCatalog.danger_warning.category).toBe('combatAlert');
    expect(audioCueCatalog.ambient_crypt.category).toBe('ambient');
  });

  it('throttles repeated invalid cues but keeps a visual substitute for critical cues', () => {
    const played: string[] = [];
    const manager = new AudioManager(createDefaultAudioSettings(), (spec) => played.push(spec.type));

    const first = manager.handleCue({ type: 'invalid_action', createdAt: 100 });
    const repeated = manager.handleCue({ type: 'invalid_action', createdAt: 200 });
    const later = manager.handleCue({ type: 'invalid_action', createdAt: 600 });

    expect(first.played).toBe(true);
    expect(first.visualSubstitute).toBe('Invalid action');
    expect(repeated.played).toBe(false);
    expect(repeated.reason).toBe('cooldown');
    expect(later.played).toBe(true);
    expect(played).toEqual(['invalid_action', 'invalid_action']);
  });

  it('respects category volume and mute-when-unfocused settings', () => {
    const settings = createDefaultAudioSettings();
    settings.volumes.master = 0;
    const manager = new AudioManager(settings, () => undefined);

    expect(manager.handleCue({ type: 'weapon_hit', createdAt: 100 }).reason).toBe('muted');

    settings.volumes.master = 1;
    settings.muteWhenUnfocused = true;
    manager.setSettings(settings);
    manager.setFocusedForTests(false);

    const result = manager.handleCue({ type: 'danger_warning', createdAt: 1000 });
    expect(result.played).toBe(false);
    expect(result.reason).toBe('unfocused');
    expect(result.visualSubstitute).toBe('Danger warning');
  });
});

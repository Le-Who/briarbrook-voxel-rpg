import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { Simulation } from '../game/Simulation';
import { HelpPanel } from './HelpPanel';
import { applyWindowPreset } from './WindowManager';
import { uiLayoutPresets } from './UILayoutPresets';

describe('UI customization, presets, and accessibility options', () => {
  it('defines the expected layout presets with accessibility settings', () => {
    expect(Object.keys(uiLayoutPresets)).toEqual(['default', 'compact', 'large', 'combat', 'crafting', 'exploration', 'stream']);
    expect(uiLayoutPresets.large.uiScale).toBeGreaterThan(uiLayoutPresets.default.uiScale);
    expect(uiLayoutPresets.large.fontScale).toBeGreaterThan(uiLayoutPresets.default.fontScale);
    expect(uiLayoutPresets.combat.visiblePanels.combatActions).toBe(true);
    expect(uiLayoutPresets.combat.chatMode).toBe('combatHidden');
    expect(uiLayoutPresets.combat.minimapMode).toBe('compact');
    expect(uiLayoutPresets.exploration.hudDensity).toBe('minimal');
    expect(uiLayoutPresets.exploration.chatMode).toBe('collapsed');
    expect(uiLayoutPresets.exploration.minimapMode).toBe('compact');
  });

  it('applies presets to scale, tooltip mode, panels, and layout memory safely', () => {
    const simulation = new Simulation(createInitialGameState());
    simulation.state.ui.windowLayouts.inventory = { x: 22, y: 33, width: 300, height: 330 };

    simulation.dispatch({ type: 'APPLY_UI_LAYOUT_PRESET', preset: 'crafting' });
    simulation.update(1 / 30);

    expect(simulation.state.ui.windowLayoutPreset).toBe('crafting');
    expect(simulation.state.ui.windowLayouts).toEqual({});
    expect(simulation.state.ui.panels.inventory).toBe(true);
    expect(simulation.state.ui.panels.crafting).toBe(true);
    expect(simulation.state.ui.panels.market).toBe(true);
    expect(simulation.state.ui.marketView).toBe('work');
    expect(simulation.state.ui.tooltipMode).toBe('advanced');
    expect(simulation.state.ui.chatMode).toBe('compact');
    expect(simulation.state.ui.minimapMode).toBe('standard');
  });

  it('keeps large text and exploration presets inside managed-window bounds', () => {
    const viewport = { width: 1280, height: 720 };
    const large = applyWindowPreset('large', viewport);
    const exploration = applyWindowPreset('exploration', viewport);

    expect(large.spellbook.width).toBeGreaterThan(applyWindowPreset('compact', viewport).spellbook.width);
    expect(exploration.inventory.height).toBeLessThanOrEqual(large.inventory.height);
    expect(exploration.chat.x).toBe(8);
  });

  it('updates audio accessibility settings through simulation actions', () => {
    const simulation = new Simulation(createInitialGameState());

    simulation.dispatch({ type: 'SET_AUDIO_VOLUME', category: 'combatAlert', volume: 0.33 });
    simulation.dispatch({ type: 'TOGGLE_MUTE_WHEN_UNFOCUSED' });
    simulation.dispatch({ type: 'TOGGLE_VISUAL_AUDIO_CUES' });
    simulation.update(1 / 30);

    expect(simulation.state.ui.audio.volumes.combatAlert).toBe(0.33);
    expect(simulation.state.ui.audio.muteWhenUnfocused).toBe(false);
    expect(simulation.state.ui.audio.visualAudioCues).toBe(false);
  });

  it('renders help controls for presets, lock layout, and accessibility toggles', () => {
    const state = createInitialGameState();
    state.ui.panels.help = true;

    const html = HelpPanel(state);

    expect(html).toContain('data-layout-preset="large"');
    expect(html).toContain('data-layout-preset="crafting"');
    expect(html).toContain('data-action="toggle-lock-ui-layout"');
    expect(html).toContain('data-action="toggle-colorblind-status"');
    expect(html).toContain('data-action="toggle-damage-numbers"');
    expect(html).toContain('data-audio-volume="master"');
    expect(html).toContain('data-audio-volume="combatAlert"');
    expect(html).toContain('data-action="toggle-mute-unfocused"');
    expect(html).toContain('data-action="toggle-visual-audio-cues"');
    expect(html).toContain('data-action="capture-keybinding"');
    expect(html).toContain('data-action="reset-keybindings"');
    expect(html).toContain('data-movement-mode="keyboard"');
    expect(html).toContain('Keyboard Only');
    expect(html).toContain('Move by mouse</span><b>Disabled');
    expect(html).toContain('data-action="toggle-camera-relative-movement"');
  });

  it('renders movement help text from the selected movement mode', () => {
    const state = createInitialGameState();
    state.ui.panels.help = true;
    state.ui.movementMode = 'mouse';

    const html = HelpPanel(state);

    expect(html).toContain('Mouse Only');
    expect(html).toContain('Move</span><b>Click ground');
    expect(html).toContain('Keyboard movement</span><b>Disabled');
    expect(html).toContain('data-movement-mode="keyboardMouse"');
  });
});

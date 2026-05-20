import type { GameState } from '../game/types';
import { bindingSummary, findInputBindingConflicts, keyLabel } from '../game/InputActionMap';
import { audioVolumeCategories } from '../audio/AudioSettings';
import { uiLayoutPresets } from './UILayoutPresets';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

export function HelpPanel(state: GameState): string {
  if (!state.ui.panels.help) return '';
  const approachMode = state.player.combatPreferences.approachMode;
  const approachLabel = approachMode === 'melee_only' ? 'Melee Only' : approachMode[0].toUpperCase() + approachMode.slice(1);
  const approachHint = 'Manual never moves for combat actions. Assist moves only for action range. Aggressive allows attack approach. Melee Only limits approach to melee swings.';
  const movementMode = state.ui.movementMode ?? 'keyboard';
  const movementLabel = movementModeLabel(movementMode);
  const movementRows = movementHelpRows(movementMode)
    .map((row) => `<div><span>${row.label}</span><b>${row.value}</b></div>`)
    .join('');
  const cameraSmoothing = state.ui.cameraSmoothing ?? 'medium';
  const cameraLabel = cameraSmoothing[0].toUpperCase() + cameraSmoothing.slice(1);
  const frameRateMode = state.ui.frameRateCapMode ?? '60';
  const customFrameRateCap = customFrameRateCapValue(state);
  const frameRateLabel = frameRateMode === 'custom' ? `${customFrameRateCap} FPS` : `${frameRateMode} FPS`;
  const layoutButtons = Object.values(uiLayoutPresets)
    .map((preset) => `<button class="${state.ui.windowLayoutPreset === preset.id ? 'active' : ''}" data-layout-preset="${preset.id}">${preset.label}</button>`)
    .join('');
  const keybindings = keybindingEditor(state);
  return `<section class="panel help-panel ${state.paused ? 'paused' : ''}" data-window-id="help">
    <header><span>${state.paused ? 'Paused / Help' : 'Help'}</span><button data-action="toggle-panel" data-panel="help">x</button></header>
    <div class="help-body">
      <b>First Ten Minutes</b>
      <p>Talk to Mira, open Skills, use one tool, check your pack, then bank or buy before taking the road.</p>
      ${movementRows}
      <div><span>Hotbar</span><b>1-0</b></div>
      <div><span>Inventory</span><b>I</b></div>
      <div><span>Skills</span><b>K</b></div>
      <div><span>Spellbook</span><b>M</b></div>
      <div><span>Journal</span><b>J</b></div>
      <div><span>Pause / Help</span><b>Esc</b></div>
      <div class="help-setting"><span>UI Scale</span><b>${Math.round((state.ui.uiScale ?? 1) * 100)}%</b><button data-action="ui-scale-down">-</button><button data-action="ui-scale-up">+</button></div>
      <div class="help-setting"><span>Font Size</span><b>${Math.round((state.ui.fontScale ?? 1) * 100)}%</b><button data-action="font-scale-down">-</button><button data-action="font-scale-up">+</button></div>
      <div class="help-setting"><span>Tooltips</span><b>${state.ui.tooltipMode}</b><button data-action="toggle-tooltip-mode">${state.ui.tooltipMode === 'advanced' ? 'Compact' : 'Advanced'}</button><button data-action="tooltip-delay-down">-</button><button data-action="tooltip-delay-up">+</button></div>
      <div class="help-setting"><span>Reduced Motion</span><b>${state.ui.reducedMotion ? 'On' : 'Off'}</b><button data-action="toggle-reduced-motion">${state.ui.reducedMotion ? 'Disable' : 'Enable'}</button></div>
      <div class="help-setting"><span>Color Status</span><b>${state.ui.colorblindStatusColors ? 'Accessible' : 'Default'}</b><button data-action="toggle-colorblind-status">${state.ui.colorblindStatusColors ? 'Default' : 'Accessible'}</button></div>
      <div class="help-setting"><span>Damage Numbers</span><b>${state.ui.showDamageNumbers ? 'On' : 'Off'}</b><button data-action="toggle-damage-numbers">${state.ui.showDamageNumbers ? 'Hide' : 'Show'}</button></div>
      <div class="help-setting"><span>Skill Toasts</span><b>${state.ui.showSkillGainToasts ? 'On' : 'Off'}</b><button data-action="toggle-skill-gain-toasts">${state.ui.showSkillGainToasts ? 'Hide' : 'Show'}</button></div>
      <div class="help-setting"><span>Chat Tabs</span><b>${state.ui.showChatTabs ? 'On' : 'Off'}</b><button data-action="toggle-chat-tabs">${state.ui.showChatTabs ? 'Hide' : 'Show'}</button></div>
      <div class="help-setting frame-rate-setting"><span>FPS Cap</span><b>${frameRateLabel}</b>
        ${(['60', '120', 'custom'] as const).map((mode) => `<button class="${frameRateMode === mode ? 'active' : ''}" data-frame-rate-cap="${mode}">${mode === 'custom' ? 'Custom' : mode}</button>`).join('')}
        <input class="fps-custom-input" type="number" min="30" max="240" step="5" value="${customFrameRateCap}" data-action="custom-frame-rate-cap" aria-label="Custom FPS cap">
      </div>
      <div class="help-setting"><span>Minimap</span><b>${state.ui.minimapMode}</b>
        ${(['compact', 'standard', 'expanded', 'hidden'] as const).map((mode) => `<button class="${state.ui.minimapMode === mode ? 'active' : ''}" data-minimap-mode="${mode}">${mode === 'expanded' ? 'Map' : mode[0].toUpperCase()}</button>`).join('')}
      </div>
      ${audioSettingsEditor(state)}
      <div class="help-setting"><span>Lock Layout</span><b>${state.ui.lockUILayout ? 'On' : 'Off'}</b><button data-action="toggle-lock-ui-layout">${state.ui.lockUILayout ? 'Unlock' : 'Lock'}</button></div>
      <div class="help-actions"><button data-action="save-game">Save</button><button data-action="reset-ui-layout">Reset Layout</button><button data-action="toggle-pause" class="primary">${state.paused ? 'Resume' : 'Pause'}</button><button data-action="toggle-panel" data-panel="journal">Journal</button></div>
      <div class="help-setting"><span>Camera smoothing</span><b>${cameraLabel}</b>
        ${(['low', 'medium', 'high'] as const).map((mode) => `<button class="${cameraSmoothing === mode ? 'active' : ''}" data-camera-smoothing="${mode}">${mode[0].toUpperCase()}</button>`).join('')}
      </div>
      <div class="help-setting layout-setting"><span>UI Layout</span><b>${state.ui.windowLayoutPreset}</b><button data-action="reset-ui-layout">Reset</button>${layoutButtons}</div>
      <div class="help-setting movement-setting"><span>Movement Mode</span><b>${movementLabel}</b>
        ${(['keyboard', 'mouse', 'keyboardMouse'] as const).map((mode) => `<button class="${movementMode === mode ? 'active' : ''}" data-movement-mode="${mode}">${movementModeButtonLabel(mode)}</button>`).join('')}
      </div>
      <div class="help-setting combat-setting" data-tooltip-id="settings:combat-approach" data-tooltip-source="settings" data-tooltip="${attr(approachHint)}">
        <span>Auto-approach</span><b>${approachLabel}</b>
        ${(['manual', 'assist', 'aggressive', 'melee_only'] as const).map((mode) => `<button class="${approachMode === mode ? 'active' : ''}" data-combat-approach-mode="${mode}">${mode === 'melee_only' ? 'Melee' : mode[0].toUpperCase() + mode.slice(1)}</button>`).join('')}
      </div>
      ${keybindings}
      <div class="help-setting"><span>Auto-attack on select</span><b>${state.player.combatPreferences.autoAttackOnTargetSelect ? 'On' : 'Off'}</b><button data-action="toggle-auto-attack-on-select">${state.player.combatPreferences.autoAttackOnTargetSelect ? 'Disable' : 'Enable'}</button></div>
      <div class="help-setting"><span>Stop movement when casting</span><b>${state.player.combatPreferences.stopMovementWhenCasting ? 'On' : 'Off'}</b><button data-action="toggle-stop-movement-when-casting">${state.player.combatPreferences.stopMovementWhenCasting ? 'Disable' : 'Enable'}</button></div>
      <div class="help-setting"><span>Camera-relative movement</span><b>${state.ui.cameraRelativeMovement ? 'On' : 'Off'}</b><button data-action="toggle-camera-relative-movement">${state.ui.cameraRelativeMovement ? 'Disable' : 'Enable'}</button></div>
      <b>Systems</b>
      <div><span>Skills</span><b>Rise by use; future skills are labeled in Skills.</b></div>
      <div><span>Gathering</span><b>Axe trees, pickaxe rock faces, scissors herbs.</b></div>
      <div><span>Reagents</span><b>Spells spend mana and listed items from your pack.</b></div>
      <div><span>Weight / Bank</span><b>Bank spare goods with Eldon before long trips.</b></div>
      <div><span>Repair</span><b>Brom repairs damaged gear; tools wear down too.</b></div>
      <div><span>Work Orders</span><b>Market board shows exact item counts and rewards.</b></div>
      <div><span>Housing</span><b>Travel to your plot, then build inside the fenced area.</b></div>
    </div>
  </section>`;
}

function movementModeLabel(mode: GameState['ui']['movementMode']): string {
  if (mode === 'keyboard') return 'Keyboard Only';
  if (mode === 'mouse') return 'Mouse Only';
  return 'Keyboard + Mouse';
}

function movementModeButtonLabel(mode: GameState['ui']['movementMode']): string {
  if (mode === 'keyboard') return 'Keyboard';
  if (mode === 'mouse') return 'Mouse';
  return 'Both';
}

function customFrameRateCapValue(state: GameState): number {
  const value = Math.round(Number(state.ui.customFrameRateCap));
  if (!Number.isFinite(value)) return 90;
  return Math.max(30, Math.min(240, value));
}

function movementHelpRows(mode: GameState['ui']['movementMode']): Array<{ label: string; value: string }> {
  if (mode === 'mouse') {
    return [
      { label: 'Move', value: 'Click ground' },
      { label: 'Interact', value: 'Click target' },
      { label: 'Keyboard movement', value: 'Disabled' }
    ];
  }
  if (mode === 'keyboardMouse') {
    return [
      { label: 'Move', value: 'WASD / Arrows / Click ground' },
      { label: 'Interact', value: 'E / Click target' },
      { label: 'Move by mouse', value: 'Enabled' }
    ];
  }
  return [
    { label: 'Move', value: 'WASD / Arrows' },
    { label: 'Interact', value: 'E / Click target' },
    { label: 'Move by mouse', value: 'Disabled' }
  ];
}

function audioSettingsEditor(state: GameState): string {
  const labels: Record<(typeof audioVolumeCategories)[number], string> = {
    master: 'Master Audio',
    music: 'Music',
    sfx: 'SFX',
    ui: 'UI Audio',
    ambient: 'Ambient',
    combatAlert: 'Combat Alerts'
  };
  const rows = audioVolumeCategories
    .map((category) => {
      const value = state.ui.audio.volumes[category];
      return `<div class="help-setting audio-setting"><span>${labels[category]}</span><b>${Math.round(value * 100)}%</b><button data-audio-volume="${category}" data-audio-delta="-0.1">-</button><button data-audio-volume="${category}" data-audio-delta="0.1">+</button></div>`;
    })
    .join('');
  return `<div class="audio-settings">
    <b>Audio</b>
    ${rows}
    <div class="help-setting"><span>Mute Unfocused</span><b>${state.ui.audio.muteWhenUnfocused ? 'On' : 'Off'}</b><button data-action="toggle-mute-unfocused">${state.ui.audio.muteWhenUnfocused ? 'Disable' : 'Enable'}</button></div>
    <div class="help-setting"><span>Visual Audio Cues</span><b>${state.ui.audio.visualAudioCues ? 'On' : 'Off'}</b><button data-action="toggle-visual-audio-cues">${state.ui.audio.visualAudioCues ? 'Hide' : 'Show'}</button></div>
  </div>`;
}

function keybindingEditor(state: GameState): string {
  const conflicts = findInputBindingConflicts(state.ui.inputBindings);
  const conflictText = conflicts
    .filter((conflict) => conflict.context === 'gameplay' || conflict.context === 'ui')
    .map((conflict) => `${conflict.context}: ${keyLabel(conflict.key)} -> ${conflict.labels.join(' / ')}`)
    .join('; ');
  const capture = state.ui.keybindingCapture;
  const rows = state.ui.inputBindings
    .filter((binding) => binding.context === 'gameplay' || binding.context === 'ui')
    .filter((binding) => !binding.actionId.startsWith('move') || binding.actionId === 'moveUp')
    .map((binding) => {
      const isCapture = capture?.actionId === binding.actionId && capture.context === binding.context;
      const label = binding.actionId === 'moveUp' ? 'Move' : binding.label;
      const summary = binding.actionId === 'moveUp' ? 'WASD / Arrows' : bindingSummary(binding) || 'Unbound';
      return `<div class="keybinding-row" data-keybinding-context="${binding.context}">
        <span>${attr(label)}</span>
        <b>${attr(summary)}</b>
        <button class="${isCapture ? 'active' : ''}" data-action="capture-keybinding" data-keybinding-action="${binding.actionId}" data-keybinding-context="${binding.context}">${isCapture ? 'Press key' : 'Rebind'}</button>
      </div>`;
    })
    .join('');
  return `<div class="keybinding-editor">
    <div class="keybinding-heading"><span>Keybindings</span><button data-action="reset-keybindings">Reset Defaults</button></div>
    ${conflictText ? `<div class="keybinding-conflict">${attr(conflictText)}</div>` : ''}
    ${rows}
  </div>`;
}

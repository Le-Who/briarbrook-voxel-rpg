import type { GameState } from '../game/types';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

export function HelpPanel(state: GameState): string {
  if (!state.ui.panels.help) return '';
  const approachMode = state.player.combatPreferences.approachMode;
  const approachLabel = approachMode === 'melee_only' ? 'Melee Only' : approachMode[0].toUpperCase() + approachMode.slice(1);
  const approachHint = 'Manual never moves for combat actions. Assist moves only for action range. Aggressive allows attack approach. Melee Only limits approach to melee swings.';
  const cameraSmoothing = state.ui.cameraSmoothing ?? 'medium';
  const cameraLabel = cameraSmoothing[0].toUpperCase() + cameraSmoothing.slice(1);
  return `<section class="panel help-panel ${state.paused ? 'paused' : ''}" data-window-id="help">
    <header><span>${state.paused ? 'Paused / Help' : 'Help'}</span><button data-action="toggle-panel" data-panel="help">x</button></header>
    <div class="help-body">
      <b>First Ten Minutes</b>
      <p>Talk to Mira, open Skills, use one tool, check your pack, then bank or buy before taking the road.</p>
      <div><span>Move</span><b>WASD / Click</b></div>
      <div><span>Interact</span><b>E / Click</b></div>
      <div><span>Hotbar</span><b>1-0</b></div>
      <div><span>Inventory</span><b>I</b></div>
      <div><span>Skills</span><b>K</b></div>
      <div><span>Spellbook</span><b>M</b></div>
      <div><span>Journal</span><b>J</b></div>
      <div><span>Pause / Help</span><b>Esc</b></div>
      <div class="help-setting"><span>UI Scale</span><b>${Math.round((state.ui.uiScale ?? 1) * 100)}%</b><button data-action="ui-scale-down">-</button><button data-action="ui-scale-up">+</button></div>
      <div class="help-setting"><span>Reduced Motion</span><b>${state.ui.reducedMotion ? 'On' : 'Off'}</b><button data-action="toggle-reduced-motion">${state.ui.reducedMotion ? 'Disable' : 'Enable'}</button></div>
      <div class="help-actions"><button data-action="save-game">Save</button><button data-action="reset-ui-layout">Reset Layout</button><button data-action="toggle-pause" class="primary">${state.paused ? 'Resume' : 'Pause'}</button><button data-action="toggle-panel" data-panel="journal">Journal</button></div>
      <div class="help-setting"><span>Camera smoothing</span><b>${cameraLabel}</b>
        ${(['low', 'medium', 'high'] as const).map((mode) => `<button class="${cameraSmoothing === mode ? 'active' : ''}" data-camera-smoothing="${mode}">${mode[0].toUpperCase()}</button>`).join('')}
      </div>
      <div class="help-setting layout-setting"><span>UI Layout</span><b>${state.ui.windowLayoutPreset}</b><button data-action="reset-ui-layout">Reset</button><button data-action="compact-ui-layout">Compact</button><button data-action="large-ui-layout">Large</button><button data-action="combat-ui-layout">Combat</button></div>
      <div class="help-setting combat-setting" data-tooltip-id="settings:combat-approach" data-tooltip-source="settings" data-tooltip="${attr(approachHint)}">
        <span>Auto-approach</span><b>${approachLabel}</b>
        ${(['manual', 'assist', 'aggressive', 'melee_only'] as const).map((mode) => `<button class="${approachMode === mode ? 'active' : ''}" data-combat-approach-mode="${mode}">${mode === 'melee_only' ? 'Melee' : mode[0].toUpperCase() + mode.slice(1)}</button>`).join('')}
      </div>
      <div class="help-setting"><span>Auto-attack on select</span><b>${state.player.combatPreferences.autoAttackOnTargetSelect ? 'On' : 'Off'}</b><button data-action="toggle-auto-attack-on-select">${state.player.combatPreferences.autoAttackOnTargetSelect ? 'Disable' : 'Enable'}</button></div>
      <div class="help-setting"><span>Stop movement when casting</span><b>${state.player.combatPreferences.stopMovementWhenCasting ? 'On' : 'Off'}</b><button data-action="toggle-stop-movement-when-casting">${state.player.combatPreferences.stopMovementWhenCasting ? 'Disable' : 'Enable'}</button></div>
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

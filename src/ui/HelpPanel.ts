import type { GameState } from '../game/types';

export function HelpPanel(state: GameState): string {
  if (!state.ui.panels.help) return '';
  return `<section class="panel help-panel ${state.paused ? 'paused' : ''}">
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
      <div class="help-actions"><button data-action="save-game">Save</button><button data-action="toggle-pause" class="primary">${state.paused ? 'Resume' : 'Pause'}</button><button data-action="toggle-panel" data-panel="journal">Journal</button></div>
    </div>
  </section>`;
}

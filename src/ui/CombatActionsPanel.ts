import type { GameState } from '../game/types';

export function CombatActionsPanel(state: GameState): string {
  if (!state.ui.panels.combatActions) return '';
  const hidden = state.player.combatProfile.hidden;
  const bandaging = Boolean(state.bandage);
  const cooldown = (skill: string) => Math.max(0, Math.ceil(((state.player.combatProfile.bardCooldowns[skill] ?? 0) - state.clock)));
  return `<section class="panel combat-actions-panel">
    <header><span>Combat</span><button data-action="toggle-panel" data-panel="combatActions">x</button></header>
    <div class="combat-actions-grid">
      <button data-action="hide">${hidden ? 'Hidden' : 'Hide'}</button>
      <button data-action="defensive-action">Defend</button>
      <button data-weapon-ability="quick_slash">Quick Slash</button>
      <button data-weapon-ability="cleave">Cleave</button>
      <button data-action="bandage">${bandaging ? 'Bandaging' : 'Bandage'}</button>
      <button data-action="apply-poison">Poison Blade</button>
      <button data-bard-skill="Peacemaking">Peace${cooldown('Peacemaking') ? ` ${cooldown('Peacemaking')}` : ''}</button>
      <button data-bard-skill="Provocation">Provoke${cooldown('Provocation') ? ` ${cooldown('Provocation')}` : ''}</button>
      <button data-bard-skill="Discordance">Discord${cooldown('Discordance') ? ` ${cooldown('Discordance')}` : ''}</button>
    </div>
  </section>`;
}

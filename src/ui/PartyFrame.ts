import type { CompanionCommand, CompanionRole, GameState, NpcEntity } from '../game/types';
import { activeCompanions, companionRoleSpecs } from '../systems/CompanionSystem';

const commandLabels: Record<CompanionCommand, string> = {
  follow: 'Follow',
  hold: 'Hold',
  assist: 'Assist',
  passive: 'Passive'
};

const roleBadges: Record<CompanionRole, string> = {
  guard: 'G',
  archer: 'A',
  healer: 'H',
  scout: 'S'
};

export function PartyFrame(state: GameState): string {
  const companions = activeCompanions(state);
  if (!companions.length) return '';
  return `<section class="party-frame" aria-label="Party">
    ${companions.map((entity) => PartyMemberFrame(entity)).join('')}
  </section>`;
}

function PartyMemberFrame(entity: NpcEntity): string {
  const companion = entity.companion;
  if (!companion) return '';
  const hp = pct(companion.health, companion.maxHealth);
  const mana = pct(companion.mana, companion.maxMana);
  const spec = companionRoleSpecs[companion.role];
  return `<article class="party-member role-${companion.role}" data-party-member="${attr(entity.id)}">
    <div class="party-role" aria-label="${attr(spec.label)}">${roleBadges[companion.role]}</div>
    <div class="party-vitals">
      <div class="party-title"><strong>${attr(entity.name)}</strong><span>${attr(spec.label)}</span></div>
      <div class="bar hp party-bar" aria-label="Health"><i style="width:${hp}%"></i><span>${Math.round(companion.health)}/${companion.maxHealth}</span></div>
      <div class="bar mana party-bar" aria-label="Mana"><i style="width:${mana}%"></i><span>Mana ${Math.round(companion.mana)}/${companion.maxMana}</span></div>
      <div class="party-controls">
        <select data-action="companion-command" data-companion-command="${attr(entity.id)}" aria-label="${attr(`${entity.name} command`)}">
          ${commandOptions(companion.command)}
        </select>
        <button data-action="dismiss-companion" data-companion-id="${attr(entity.id)}">Dismiss</button>
      </div>
    </div>
  </article>`;
}

function commandOptions(selected: CompanionCommand): string {
  return (Object.keys(commandLabels) as CompanionCommand[])
    .map((command) => `<option value="${command}"${command === selected ? ' selected' : ''}>${commandLabels[command]}</option>`)
    .join('');
}

function pct(value: number, max: number): number {
  return Math.round(Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100)));
}

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    if (char === '"') return '&quot;';
    return '&#39;';
  });
}

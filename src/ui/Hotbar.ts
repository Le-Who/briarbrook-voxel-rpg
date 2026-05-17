import { itemDefs } from '../data/items';
import { skillDefinitions } from '../data/skillDefinitions';
import { spellDefs } from '../data/spells';
import type { GameState, HotbarBinding, IconDescriptor } from '../game/types';
import { renderIcon } from '../render/IconRenderer';
import { getItemCount, hasItems } from '../systems/InventorySystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

const actionIcons: Record<string, { label: string; icon: IconDescriptor; hint: string }> = {
  attack: { label: 'Attack', icon: { shape: 'blade', primary: '#d8d4c7', secondary: '#8f6a39' }, hint: 'Strike your selected hostile target.' },
  ranged: { label: 'Bow', icon: { shape: 'bow', primary: '#7a4b25', secondary: '#d8d4c7' }, hint: 'Fire at your selected hostile target.' },
  utility: { label: 'Pack / Build', icon: { shape: 'bag', primary: '#8c4d24', secondary: '#ca8a4a' }, hint: 'Open your pack, or build when you are on your plot.' },
  hide: { label: 'Hide', icon: { shape: 'shield', primary: '#203446', secondary: '#8bd9ff' }, hint: 'Attempt to hide from nearby enemies.' },
  defend: { label: 'Defend', icon: { shape: 'shield', primary: '#343a42', secondary: '#d8d4c7' }, hint: 'Brace for incoming hits.' },
  interact: { label: 'Interact', icon: { shape: 'bag', primary: '#d9bd89', secondary: '#6b3b1d' }, hint: 'Use the nearest interactable.' },
  build: { label: 'Build', icon: { shape: 'block', primary: '#8f8d84', secondary: '#5b5b59' }, hint: 'Toggle housing build mode.' }
};

function cooldownFor(state: GameState, binding: HotbarBinding): { remaining: number; total: number } {
  if (binding.kind === 'action' && binding.id === 'attack') return { remaining: state.combat.meleeCooldown, total: 1.6 };
  if (binding.kind === 'action' && binding.id === 'ranged') return { remaining: state.combat.rangedCooldown, total: 1.1 };
  if (binding.kind === 'spell') return { remaining: state.combat.magicCooldown, total: spellDefs[binding.id]?.cooldown ?? 1.2 };
  return { remaining: 0, total: 1 };
}

function bindingView(state: GameState, binding: HotbarBinding): { label: string; icon: IconDescriptor; qty?: number; cost?: string; invalid?: string; tooltip: string } {
  if (binding.kind === 'action') {
    const action = actionIcons[binding.id] ?? actionIcons.utility;
    const label = binding.id === 'utility' && state.player.currentArea === 'housing' ? 'Build / Pack' : action.label;
    return { label, icon: action.icon, tooltip: `${label}\n${action.hint}` };
  }
  if (binding.kind === 'spell') {
    const spell = spellDefs[binding.id] ?? spellDefs.magic_arrow;
    const known = state.player.spellbook.knownSpellIds.includes(spell.id);
    const missingReagents = !hasItems(state.player.inventory, spell.reagents);
    const invalid = !known ? 'Not learned' : state.player.mana < spell.manaCost ? 'No mana' : missingReagents ? 'Missing reagents' : undefined;
    return {
      label: spell.displayName,
      icon: spell.iconDescriptor,
      cost: `${spell.manaCost}m`,
      invalid,
      tooltip: `${spell.displayName}\nMana ${spell.manaCost} · Circle ${spell.circle}\n${spell.description}${invalid ? `\n${invalid}` : ''}`
    };
  }
  if (binding.kind === 'skill') {
    const definition = skillDefinitions.find((candidate) => candidate.id === binding.id);
    if (!definition) return { label: binding.id, icon: actionIcons.utility.icon, invalid: 'Unknown skill', tooltip: binding.id };
    const skill = state.player.skills[definition.id];
    return {
      label: definition.displayName,
      icon: definition.icon,
      cost: skill ? skill.value.toFixed(0) : undefined,
      tooltip: `${definition.displayName}\n${definition.description}\nTrained by: ${definition.verbs.join(', ')}`
    };
  }
  const itemId = binding.id;
  const def = itemDefs[itemId];
  if (!def) return { label: itemId, icon: actionIcons.utility.icon, invalid: 'Missing item', tooltip: itemId };
  const qty = getItemCount(state.player.inventory, itemId) + Object.values(state.player.equipment).filter((stack) => stack?.itemId === itemId).length;
  const invalid = qty <= 0 ? 'Not in pack' : undefined;
  const toolHint = binding.kind === 'tool' ? '\nSelect a world target after pressing this.' : '';
  return {
    label: def.name,
    icon: def.icon,
    qty: def.stackable ? qty : undefined,
    invalid,
    tooltip: `${def.name}\n${def.type}${toolHint}${invalid ? `\n${invalid}` : ''}`
  };
}

export function Hotbar(state: GameState): string {
  const bindings = state.ui.hotbar;
  return `<section class="hotbar" aria-label="Hotbar">
    ${bindings
      .map((binding, index) => {
        const key = index === 9 ? '0' : String(index + 1);
        const view = bindingView(state, binding);
        const cooldown = cooldownFor(state, binding);
        const cooldownPct = cooldown.remaining > 0 ? Math.max(0, Math.min(100, (cooldown.remaining / cooldown.total) * 100)) : 0;
        const active = state.ui.activeHotbarSlot === index ? ' active' : '';
        const invalid = view.invalid ? ' invalid' : '';
        return `<button class="hotbar-slot${active}${invalid}" data-hotbar="${index}" data-hotbar-drop="${index}" data-tooltip="${attr(view.tooltip)}" title="${attr(view.tooltip)}">
          <span>${key}</span>
          ${renderIcon(view.icon, view.label)}
          ${view.qty ? `<b>${view.qty}</b>` : ''}
          ${view.cost ? `<em class="hotbar-cost">${view.cost}</em>` : ''}
          ${view.invalid ? `<small>!</small>` : ''}
          ${cooldownPct ? `<i class="cooldown" style="height:${cooldownPct}%"></i>` : ''}
        </button>`;
      })
      .join('')}
  </section>`;
}

import { itemDefs } from '../data/items';
import { skillDefinitions } from '../data/skillDefinitions';
import { spellDefs } from '../data/spells';
import type { GameState, HotbarBinding, IconDescriptor } from '../game/types';
import { getActiveHotbarSlot, getSpellCastability } from '../game/UIStateSelectors';
import { renderIcon } from '../render/IconRenderer';
import { getItemCount } from '../systems/InventorySystem';
import { buildItemTooltip, buildSkillTooltip, buildSpellTooltip, itemIconCategory, skillIconCategory, spellIconCategory, type IconVisualCategory } from './IconVisualSystem';

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

function cooldownFor(state: GameState, binding: HotbarBinding | null): { remaining: number; total: number } {
  if (!binding) return { remaining: 0, total: 1 };
  if (binding.kind === 'action' && binding.id === 'attack') return { remaining: state.combat.meleeCooldown, total: 1.6 };
  if (binding.kind === 'action' && binding.id === 'ranged') return { remaining: state.combat.rangedCooldown, total: 1.1 };
  if (binding.kind === 'spell') return { remaining: state.combat.magicCooldown, total: spellDefs[binding.id]?.cooldown ?? 1.2 };
  return { remaining: 0, total: 1 };
}

function bindingView(state: GameState, binding: HotbarBinding | null): { label: string; icon: IconDescriptor; category: IconVisualCategory; qty?: number; cost?: string; invalid?: string; tooltip: string; tooltipAdvanced?: string } {
  if (!binding) {
    return {
      label: 'Empty',
      icon: actionIcons.utility.icon,
      category: 'container',
      tooltip: 'Empty slot\nDrop an item, spell, skill, or tool here.'
    };
  }
  if (binding.kind === 'action') {
    const action = actionIcons[binding.id] ?? actionIcons.utility;
    const label = binding.id === 'utility' && state.player.currentArea === 'housing' ? 'Build / Pack' : action.label;
    const category: IconVisualCategory = binding.id === 'attack' || binding.id === 'ranged' ? 'weapon' : binding.id === 'defend' ? 'armor' : binding.id === 'build' ? 'housing-item' : 'tool';
    return { label, icon: action.icon, category, tooltip: `${label}\nAction · ${action.hint}` };
  }
  if (binding.kind === 'spell') {
    const spell = spellDefs[binding.id] ?? spellDefs.magic_arrow;
    const castability = getSpellCastability(state, spell.id);
    const invalid = castability.canCast ? undefined : castability.reason === 'Not enough mana' ? 'No mana' : castability.reason;
    return {
      label: spell.displayName,
      icon: spell.iconDescriptor,
      category: spellIconCategory(spell),
      cost: `${spell.manaCost}m`,
      invalid,
      tooltip: `${buildSpellTooltip(spell, state, castability.known, 'compact')}${invalid ? `\n${invalid}` : ''}`,
      tooltipAdvanced: buildSpellTooltip(spell, state, castability.known, 'advanced')
    };
  }
  if (binding.kind === 'skill') {
    const definition = skillDefinitions.find((candidate) => candidate.id === binding.id);
    if (!definition) return { label: binding.id, icon: actionIcons.utility.icon, category: 'skill-profession', invalid: 'Unknown skill', tooltip: binding.id };
    const skill = state.player.skills[definition.id];
    return {
      label: definition.displayName,
      icon: definition.icon,
      category: skillIconCategory(definition),
      cost: skill ? skill.value.toFixed(0) : undefined,
      tooltip: buildSkillTooltip(definition, state, 'compact'),
      tooltipAdvanced: buildSkillTooltip(definition, state, 'advanced')
    };
  }
  const itemId = binding.id;
  const def = itemDefs[itemId];
  if (!def) return { label: itemId, icon: actionIcons.utility.icon, category: 'resource', invalid: 'Missing item', tooltip: itemId };
  const qty = getItemCount(state.player.inventory, itemId) + Object.values(state.player.equipment).filter((stack) => stack?.itemId === itemId).length;
  const invalid = qty <= 0 ? 'Not in pack' : undefined;
  const stack = state.player.inventory.slots.find((candidate) => candidate?.itemId === itemId)
    ?? Object.values(state.player.equipment).find((candidate) => candidate?.itemId === itemId)
    ?? { uid: `hotbar:${itemId}`, itemId, quantity: Math.max(1, qty) };
  return {
    label: def.name,
    icon: def.icon,
    category: itemIconCategory(def),
    qty: def.stackable ? qty : undefined,
    invalid,
    tooltip: `${buildItemTooltip(stack, state, 'compact')}${binding.kind === 'tool' ? '\nSelects a world target.' : ''}${invalid ? `\n${invalid}` : ''}`,
    tooltipAdvanced: buildItemTooltip(stack, state, 'advanced')
  };
}

function bindingLinksEquipped(state: GameState, binding: HotbarBinding | null): boolean {
  if (!binding) return false;
  if (binding.kind === 'action' && (binding.id === 'attack' || binding.id === 'ranged')) return Boolean(state.player.equipment.weapon);
  if (binding.kind !== 'item' && binding.kind !== 'tool') return false;
  return Object.values(state.player.equipment).some((stack) => stack?.itemId === binding.id);
}

function hotbarBadges(state: GameState, binding: HotbarBinding | null, index: number, view: ReturnType<typeof bindingView>, cooldownPct: number): string {
  if (!binding) return '';
  const badges: Array<{ cls: string; title: string; label: string }> = [{ cls: 'assigned', title: 'Assigned', label: 'H' }];
  if (getActiveHotbarSlot(state.player, state.ui).index === index) badges.push({ cls: 'active-use', title: 'Active', label: 'hand' });
  if (bindingLinksEquipped(state, binding)) badges.push({ cls: 'equipped-link', title: 'Linked to equipped gear', label: 'E' });
  if (view.invalid) badges.push({ cls: 'missing', title: 'Missing requirement', label: '!' });
  if (view.qty != null) badges.push({ cls: 'quantity', title: 'Quantity', label: String(view.qty) });
  if (cooldownPct > 0) badges.push({ cls: 'cooldown-mark', title: 'Cooling down', label: 'cd' });
  if (state.ui.targeting && state.ui.activeHotbarSlot === index) badges.push({ cls: 'targeting', title: 'Targeting', label: 'T' });
  const visible = badges.length > 3 ? [...badges.slice(0, 2), { cls: 'summary', title: `${badges.length - 2} more states`, label: `+${badges.length - 2}` }] : badges;
  return `<span class="hotbar-badges">${visible.map((badge) => `<i class="hotbar-badge ${badge.cls}" title="${attr(badge.title)}">${badge.label}</i>`).join('')}</span>`;
}

function hotbarTooltipVersion(state: GameState, binding: HotbarBinding | null, index: number, view: ReturnType<typeof bindingView>): string {
  return [
    state.ui.tooltipMode,
    index,
    binding ? `${binding.kind}:${binding.id}` : 'empty',
    view.qty ?? '',
    view.cost ?? '',
    view.invalid ?? '',
    state.ui.activeHotbarSlot,
    state.player.mana.toFixed(0)
  ].join(':');
}

export function Hotbar(state: GameState): string {
  const bindings = state.ui.hotbar;
  const activeHotbar = getActiveHotbarSlot(state.player, state.ui);
  return `<section class="hotbar" aria-label="Hotbar">
    ${bindings
      .map((binding, index) => {
        const key = index === 9 ? '0' : String(index + 1);
        const view = bindingView(state, binding);
        const cooldown = cooldownFor(state, binding);
        const cooldownPct = cooldown.remaining > 0 ? Math.max(0, Math.min(100, (cooldown.remaining / cooldown.total) * 100)) : 0;
        const active = activeHotbar.index === index ? ' active' : '';
        const invalid = view.invalid ? ' invalid' : '';
        const source = binding ? ` data-hotbar-source="hotbarSlot:${index}" data-drag-kind="hotbarSlot" data-source-window-id="hotbar" data-source-slot-id="${index}"` : '';
        const tooltipId = binding ? `hotbar:${index}:${binding.kind}:${attr(binding.id)}` : `hotbar:${index}:empty`;
        return `<button class="hotbar-slot${active}${invalid}${binding ? '' : ' empty'}" data-hotbar="${index}" data-hotbar-drop="${index}"${source} data-tooltip-id="${tooltipId}" data-tooltip-source="hotbar" data-tooltip-version="${attr(hotbarTooltipVersion(state, binding, index, view))}" data-tooltip="${attr(view.tooltip)}" data-tooltip-advanced="${attr(view.tooltipAdvanced ?? view.tooltip)}" title="${attr(view.tooltip)}">
          <span>${key}</span>
          ${renderIcon(view.icon, view.label, view.category)}
          ${view.qty ? `<b>${view.qty}</b>` : ''}
          ${view.cost ? `<em class="hotbar-cost">${view.cost}</em>` : ''}
          ${view.invalid ? `<small>!</small>` : ''}
          ${cooldownPct ? `<i class="cooldown" style="height:${cooldownPct}%"></i>` : ''}
          ${hotbarBadges(state, binding, index, view, cooldownPct)}
        </button>`;
      })
      .join('')}
  </section>`;
}

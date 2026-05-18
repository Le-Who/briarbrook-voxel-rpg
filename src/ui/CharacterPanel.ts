import type { GameState } from '../game/types';
import { getEquippedItems, getHeldVisualItem } from '../game/UIStateSelectors';
import { calculateDerivedStats } from '../systems/EquipmentSystem';
import { calculateWeight } from '../systems/InventorySystem';
import { renderIcon } from '../render/IconRenderer';
import { resolveEquipmentVisuals } from '../render/EquipmentVisuals';
import { itemDefs } from '../data/items';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

function durabilityState(stack: NonNullable<GameState['player']['equipment'][keyof GameState['player']['equipment']]> | null): 'broken' | 'damaged' | 'worn' | null {
  if (!stack?.maxDurability) return null;
  const ratio = (stack.durability ?? stack.maxDurability) / stack.maxDurability;
  if (ratio <= 0) return 'broken';
  if (ratio <= 0.25) return 'damaged';
  if (ratio <= 0.55) return 'worn';
  return null;
}

export function CharacterPanel(state: GameState): string {
  if (!state.ui.panels.character) return '';
  const stats = calculateDerivedStats(state);
  const attrs = state.player.attributes;
  const equipment = state.player.equipment;
  const equippedBySlot = new Map(getEquippedItems(state.player).map(({ slot, stack }) => [slot, stack]));
  const heldVisualItem = getHeldVisualItem(state.player);
  const gearPreview = resolveEquipmentVisuals(state)
    .filter((visual) => visual.showOnPaperdoll)
    .map((visual) => `<span class="paperdoll-gear ${visual.paperdollClass}" data-attach-point="${visual.attachPoint}" title="${attr(visual.label)}"></span>`)
    .join('');
  const slot = (name: keyof typeof equipment) => {
    const stack = equippedBySlot.get(name) ?? null;
    const def = stack ? itemDefs[stack.itemId] : null;
    const wear = durabilityState(stack ?? null);
    const activeHand = Boolean(stack && heldVisualItem?.uid === stack.uid);
    const tooltip = def ? `${def.name}${stack?.maxDurability ? `\nDurability: ${stack.durability ?? stack.maxDurability}/${stack.maxDurability}` : ''}` : `${name} slot`;
    return `<div class="equip-slot ${def ? 'equipped' : 'empty'} ${activeHand ? 'active-hand' : ''} ${wear ?? ''}" data-equipment-slot="${name}" data-tooltip="${attr(tooltip)}" title="${attr(tooltip)}">
      ${def ? renderIcon(def.icon, def.name) : `<span class="equip-silhouette">${String(name).slice(0, 1).toUpperCase()}</span>`}
      <small>${name}</small>
      <span class="equip-badges">
        ${def ? '<i class="equip-badge equipped">E</i>' : ''}
        ${activeHand ? '<i class="equip-badge hand">hand</i>' : ''}
        ${wear ? `<i class="equip-badge ${wear}">${wear === 'broken' ? '!' : 'cr'}</i>` : ''}
      </span>
    </div>`;
  };
  return `<section class="panel character-panel">
    <header><span>Character</span><button data-action="toggle-panel" data-panel="character">x</button></header>
    <div class="character-body">
      <div class="paperdoll">
        ${slot('helmet')}${slot('armor')}${slot('weapon')}${slot('shield')}${slot('backpack')}${slot('boots')}${slot('accessory')}
        <div class="paperdoll-preview-gear">
          <div class="voxel-portrait large">${gearPreview}</div>
        </div>
      </div>
      <div class="attr-list">
        ${Object.entries(attrs).map(([name, value]) => `<div><span>${name}</span><b>${value}</b></div>`).join('')}
      </div>
    </div>
    <div class="stat-list">
      <div><span>Health</span><b>${Math.round(state.player.health)}/${stats.maxHealth}</b></div>
      <div><span>Mana</span><b>${Math.round(state.player.mana)}/${stats.maxMana}</b></div>
      <div><span>Stamina</span><b>${Math.round(state.player.stamina)}/${stats.maxStamina}</b></div>
      <div><span>Damage</span><b>${stats.minDamage} - ${stats.maxDamage}</b></div>
      <div><span>Attack Speed</span><b>${stats.attackSpeed}s</b></div>
      <div><span>Armor</span><b>${stats.armor}</b></div>
      <div><span>Magic Resist</span><b>${stats.magicResist}</b></div>
      <div><span>Crit Chance</span><b>${stats.critChance}%</b></div>
      <div><span>Dodge Chance</span><b>${stats.dodgeChance}%</b></div>
      <div><span>Weight</span><b>${calculateWeight(state).toFixed(0)}/${stats.carryCapacity.toFixed(0)}</b></div>
    </div>
  </section>`;
}

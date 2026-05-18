import { itemDefs } from '../data/items';
import type { GameState, InventoryState, ItemStack } from '../game/types';
import { calculateWeight } from '../systems/InventorySystem';
import { calculateDerivedStats } from '../systems/EquipmentSystem';
import { renderIcon } from '../render/IconRenderer';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

function tooltip(stack: ItemStack | null): string {
  if (!stack) return 'Empty';
  const def = itemDefs[stack.itemId];
  if (!def) return 'Unknown item';
  const weapon = def.weaponClass ? `\nWeapon: ${def.weaponClass} · ${def.skillUsed ?? 'Wrestling'}\nDamage: ${def.baseDamageMin ?? 0}-${def.baseDamageMax ?? 0} · Speed: ${def.swingSpeed ?? 1}s` : '';
  const durability = stack.maxDurability ? `\nDurability: ${stack.durability ?? stack.maxDurability}/${stack.maxDurability}` : '';
  const provenance = [stack.quality, stack.materialType, stack.makerName ? `by ${stack.makerName}` : '', stack.trait].filter(Boolean).join(' · ');
  const crafted = provenance ? `\nCrafted: ${provenance}` : '';
  const poison = stack.poisonCharges ? `\nPoison: ${stack.poisonCharges} hits` : '';
  return `${def.name}\nType: ${def.type}\nQty: ${stack.quantity}\nWeight: ${(def.weight * stack.quantity).toFixed(1)}\nValue: ${def.value}g${weapon}${durability}${crafted}${poison}`;
}

export function renderSlots(inventory: InventoryState | Array<ItemStack | null>, kind: string, selected: number | null = null): string {
  const slots = Array.isArray(inventory) ? inventory : inventory.slots;
  const container = kind === 'inv' ? 'inventory' : kind === 'trade' ? 'trade-player' : kind;
  const validDropContainer = container === 'inventory' || container === 'bank' || container === 'trade-player';
  return `<div class="slot-grid ${kind}-grid">${slots
    .map((stack, index) => {
      const def = stack ? itemDefs[stack.itemId] : null;
      const selectedClass = selected === index ? ' selected' : '';
      const source = validDropContainer && stack && def ? `${def.type === 'tool' ? 'tool' : 'item'}:${stack.itemId}` : '';
      const dragAttrs =
        validDropContainer && stack && def
          ? ` data-hotbar-source="${attr(source)}" data-drag-kind="item" data-source-window-id="${attr(container)}" data-source-slot-id="${index}" data-item-instance-id="${attr(stack.uid)}" data-item-definition-id="${attr(stack.itemId)}" data-quantity="${stack.quantity}" data-display-name="${attr(def.name)}"`
          : '';
      const dropAttr = validDropContainer ? ` data-item-drop-target="${attr(container)}:${index}"` : '';
      return `<button class="slot${selectedClass}" data-${kind}-slot="${index}"${dropAttr}${dragAttrs} data-tooltip="${attr(tooltip(stack))}" title="${attr(def?.name ?? 'Empty')}">
        ${def ? renderIcon(def.icon, def.name) : ''}
        ${stack && stack.quantity > 1 ? `<span class="qty">${stack.quantity}</span>` : ''}
      </button>`;
    })
    .join('')}</div>`;
}

export function InventoryPanel(state: GameState): string {
  if (!state.ui.panels.inventory) return '';
  const selected = state.ui.selectedInventorySlot;
  const stack = selected == null ? null : state.player.inventory.slots[selected];
  const def = stack ? itemDefs[stack.itemId] : null;
  const stats = calculateDerivedStats(state);
  return `<section class="panel inventory-panel">
    <header><span>Inventory</span><button data-action="toggle-panel" data-panel="inventory">x</button></header>
    ${renderSlots(state.player.inventory, 'inv', selected)}
    <footer class="panel-footer">
      <span class="gold">●</span><span>${state.player.gold}</span>
      <span class="spacer"></span><span>${calculateWeight(state).toFixed(0)}/${stats.carryCapacity.toFixed(0)}</span>
    </footer>
    ${
      def
        ? `<div class="item-actions">
            <div class="item-actions-title"><strong>${def.name}</strong><button data-action="clear-selected-item" title="Close">x</button></div>
            <button data-action="use-selected">Use</button>
            <button data-action="equip-selected">Equip</button>
            ${stack && stack.quantity > 1 ? '<button data-action="split-selected">Split</button>' : ''}
            ${state.ui.trade ? '<button data-action="offer-selected">Offer</button>' : ''}
            ${state.ui.merchant ? '<button data-action="sell-selected">Sell</button>' : ''}
            ${state.ui.panels.bank ? '<button data-action="deposit-selected">Bank</button>' : ''}
          </div>`
        : ''
    }
  </section>`;
}

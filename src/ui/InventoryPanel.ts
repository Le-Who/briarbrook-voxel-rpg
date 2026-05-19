import { itemDefs } from '../data/items';
import type { EquipmentSlot, GameState, InventoryState, ItemDef, ItemStack } from '../game/types';
import { calculateWeight } from '../systems/InventorySystem';
import { calculateDerivedStats } from '../systems/EquipmentSystem';
import { renderIcon } from '../render/IconRenderer';
import { buildItemTooltip, itemIconCategory } from './IconVisualSystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

function durabilityState(stack: ItemStack | null): 'broken' | 'damaged' | 'worn' | null {
  if (!stack?.maxDurability) return null;
  const ratio = (stack.durability ?? stack.maxDurability) / stack.maxDurability;
  if (ratio <= 0) return 'broken';
  if (ratio <= 0.25) return 'damaged';
  if (ratio <= 0.55) return 'worn';
  return null;
}

function equippedSlotForItem(state: GameState | undefined, itemId: string): EquipmentSlot | null {
  if (!state) return null;
  const entry = Object.entries(state.player.equipment).find(([, stack]) => stack?.itemId === itemId);
  return (entry?.[0] as EquipmentSlot | undefined) ?? null;
}

function hotbarSlotForItem(state: GameState | undefined, itemId: string): number | null {
  if (!state) return null;
  const index = state.ui.hotbar.findIndex((binding) => (binding?.kind === 'item' || binding?.kind === 'tool') && binding.id === itemId);
  return index >= 0 ? index : null;
}

function slotBadges(stack: ItemStack | null, state: GameState | undefined): string {
  if (!stack) return '';
  const badges: Array<{ cls: string; title: string; label: string }> = [];
  const equippedSlot = equippedSlotForItem(state, stack.itemId);
  const hotbarSlot = hotbarSlotForItem(state, stack.itemId);
  const wear = durabilityState(stack);
  if (equippedSlot) badges.push({ cls: 'equipped', title: `Equipped in ${equippedSlot}`, label: 'E' });
  if (hotbarSlot != null) badges.push({ cls: 'hotbar-assigned', title: `Assigned to hotbar ${hotbarSlot === 9 ? 0 : hotbarSlot + 1}`, label: 'H' });
  if (wear === 'broken') badges.push({ cls: 'broken', title: 'Broken', label: '!' });
  else if (wear === 'damaged' || wear === 'worn') badges.push({ cls: wear, title: wear === 'damaged' ? 'Damaged' : 'Worn', label: 'cr' });
  if (stack.quality === 'exceptional' || stack.exceptional) badges.push({ cls: 'exceptional', title: 'Exceptional quality', label: '*' });
  const visible = badges.length > 3 ? [...badges.slice(0, 2), { cls: 'summary', title: `${badges.length - 2} more states`, label: `+${badges.length - 2}` }] : badges;
  return visible.length ? `<span class="slot-badges">${visible.map((badge) => `<i class="slot-badge ${badge.cls}" title="${attr(badge.title)}">${badge.label}</i>`).join('')}</span>` : '';
}

function statValue(def: ItemDef | undefined, stack: ItemStack | null, key: 'armor' | 'minDamage' | 'maxDamage'): number {
  if (!def) return 0;
  if (key === 'minDamage') return def.baseDamageMin ?? 0;
  if (key === 'maxDamage') return def.baseDamageMax ?? 0;
  return Number(stack?.statModifiers?.[key] ?? def.statModifiers?.[key] ?? 0);
}

function deltaRow(label: string, next: number, current: number, lowerIsBetter = false): string {
  const delta = Number((next - current).toFixed(2));
  const good = lowerIsBetter ? delta < 0 : delta > 0;
  const bad = lowerIsBetter ? delta > 0 : delta < 0;
  const cls = good ? 'up' : bad ? 'down' : 'same';
  const marker = good ? '+' : bad ? '-' : '=';
  return `<span class="${cls}"><i>${marker}</i><b>${label}</b><em>${next || '-'}</em></span>`;
}

function itemComparison(state: GameState, stack: ItemStack | null, def: ItemDef | null): string {
  if (!stack || !def?.equipmentSlot) return '';
  const current = state.player.equipment[def.equipmentSlot];
  const currentDef = current ? itemDefs[current.itemId] : undefined;
  const nextDamage = statValue(def, stack, 'minDamage') + statValue(def, stack, 'maxDamage');
  const currentDamage = statValue(currentDef, current ?? null, 'minDamage') + statValue(currentDef, current ?? null, 'maxDamage');
  const nextArmor = statValue(def, stack, 'armor');
  const currentArmor = statValue(currentDef, current ?? null, 'armor');
  const nextSpeed = def.swingSpeed ?? 0;
  const currentSpeed = currentDef?.swingSpeed ?? 0;
  const nextDurability = stack.maxDurability ? Math.round(((stack.durability ?? stack.maxDurability) / stack.maxDurability) * 100) : 0;
  const currentDurability = current?.maxDurability ? Math.round(((current.durability ?? current.maxDurability) / current.maxDurability) * 100) : 0;
  return `<div class="item-compare">
    <b>Compare ${def.equipmentSlot}</b>
    <div>
      ${deltaRow('Damage', nextDamage, currentDamage)}
      ${deltaRow('Armor', nextArmor, currentArmor)}
      ${deltaRow('Speed', nextSpeed, currentSpeed, true)}
      ${deltaRow('Durability', nextDurability, currentDurability)}
    </div>
  </div>`;
}

function itemTooltipVersion(stack: ItemStack, state: GameState | undefined): string {
  return [
    state?.ui.tooltipMode ?? 'compact',
    stack.uid,
    stack.itemId,
    stack.quantity,
    stack.durability ?? '',
    stack.maxDurability ?? '',
    stack.quality ?? '',
    stack.exceptional ? 'exceptional' : '',
    equippedSlotForItem(state, stack.itemId) ?? '',
    hotbarSlotForItem(state, stack.itemId) ?? ''
  ].join(':');
}

function itemInspector(stack: ItemStack, state: GameState): string {
  const details = buildItemTooltip(stack, state, 'pinned')
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!details.length) return '';
  return `<div class="item-inspector" data-item-inspector="true">${details.map((line) => `<span>${attr(line)}</span>`).join('')}</div>`;
}

export function renderSlots(inventory: InventoryState | Array<ItemStack | null>, kind: string, selected: number | null = null, state?: GameState): string {
  const slots = Array.isArray(inventory) ? inventory : inventory.slots;
  const container = kind === 'inv' ? 'inventory' : kind === 'trade' ? 'trade-player' : kind;
  const validDropContainer = container === 'inventory' || container === 'bank' || container === 'trade-player';
  const inventoryAttrs = kind === 'inv' ? ' data-inventory-grid="true" data-slot-size-token="48"' : '';
  return `<div class="slot-grid ${kind}-grid"${inventoryAttrs}>${slots
    .map((stack, index) => {
      const def = stack ? itemDefs[stack.itemId] : null;
      const selectedClass = selected === index ? ' selected' : '';
      const wearClass = durabilityState(stack);
      const source = validDropContainer && stack && def ? `${def.type === 'tool' ? 'tool' : 'item'}:${stack.itemId}` : '';
      const dragAttrs =
        validDropContainer && stack && def
          ? ` data-hotbar-source="${attr(source)}" draggable="true" data-drag-kind="item" data-source-window-id="${attr(container)}" data-source-slot-id="${index}" data-item-instance-id="${attr(stack.uid)}" data-item-definition-id="${attr(stack.itemId)}" data-quantity="${stack.quantity}" data-display-name="${attr(def.name)}"`
          : '';
      const dropAttr = validDropContainer ? ` data-item-drop-target="${attr(container)}:${index}"` : '';
      const tooltipAttrs =
        stack && def
          ? ` data-tooltip-id="${attr(`${kind}:${index}:${stack.itemId}`)}" data-tooltip-source="${attr(kind)}" data-tooltip-version="${attr(itemTooltipVersion(stack, state))}" data-tooltip="${attr(buildItemTooltip(stack, state, 'compact'))}" data-tooltip-advanced="${attr(buildItemTooltip(stack, state, 'advanced'))}" title="${attr(def.name)}"`
          : '';
      return `<button class="slot${selectedClass}${wearClass ? ` ${wearClass}` : ''}" data-${kind}-slot="${index}"${dropAttr}${dragAttrs}${tooltipAttrs}>
        ${def ? renderIcon(def.icon, def.name, itemIconCategory(def)) : ''}
        ${stack && stack.quantity > 1 ? `<span class="qty">${stack.quantity}</span>` : ''}
        ${slotBadges(stack, state)}
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
  return `<section class="panel inventory-panel ui-contained-window" data-window-id="inventory" data-inventory-layout="resizable-grid">
    <header><span>Inventory</span><button data-action="toggle-panel" data-panel="inventory">x</button></header>
    <div class="inventory-grid-body" data-inventory-grid-body="true">${renderSlots(state.player.inventory, 'inv', selected, state)}</div>
    ${
      def
        ? `<div class="item-actions">
            <div class="item-actions-title"><strong>${def.name}</strong><button data-action="clear-selected-item" aria-label="Close">x</button></div>
            ${stack ? itemInspector(stack, state) : ''}
            <button data-action="use-selected">Use</button>
            <button data-action="equip-selected">Equip</button>
            ${stack && stack.quantity > 1 ? '<button data-action="split-selected">Split</button>' : ''}
            ${state.ui.trade ? '<button data-action="offer-selected">Offer</button>' : ''}
            ${state.ui.merchant ? '<button data-action="sell-selected">Sell</button>' : ''}
            ${state.ui.panels.bank ? '<button data-action="deposit-selected">Bank</button>' : ''}
            ${itemComparison(state, stack, def)}
          </div>`
        : ''
    }
    <footer class="panel-footer" data-inventory-footer="true">
      <span class="gold">●</span><span>${state.player.gold}</span>
      <span class="spacer"></span><span>${calculateWeight(state).toFixed(0)}/${stats.carryCapacity.toFixed(0)}</span>
    </footer>
  </section>`;
}

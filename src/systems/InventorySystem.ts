import { itemDefs } from '../data/items';
import { emitAudioHook } from '../audio/AudioHooks';
import { createId, createStack } from '../game/GameState';
import type { GameState, InventoryState, ItemStack } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { calculateDerivedStats } from './EquipmentSystem';
import { recordPotionConsumed } from './TelemetrySystem';

export function getInventoryByName(state: GameState, name: 'inventory' | 'bank' | 'trade-player'): InventoryState | Array<ItemStack | null> {
  if (name === 'inventory') return state.player.inventory;
  if (name === 'bank') return state.player.bank;
  return state.ui.trade?.playerSlots ?? [];
}

export function calculateWeight(state: GameState): number {
  const invWeight = state.player.inventory.slots.reduce((total, stack) => total + stackWeight(stack), 0);
  const equipWeight = Object.values(state.player.equipment).reduce((total, stack) => total + stackWeight(stack ?? null), 0);
  return Math.round((invWeight + equipWeight) * 10) / 10;
}

export function stackWeight(stack: ItemStack | null): number {
  if (!stack) return 0;
  return (itemDefs[stack.itemId]?.weight ?? 0) * stack.quantity;
}

export function getItemCount(inventory: InventoryState, itemId: string): number {
  return inventory.slots.reduce((count, stack) => count + (stack?.itemId === itemId ? stack.quantity : 0), 0);
}

export function countPlayerItem(state: GameState, itemId: string): number {
  return getItemCount(state.player.inventory, itemId);
}

export function hasItems(inventory: InventoryState, costs: Array<{ itemId: string; quantity: number }>): boolean {
  return costs.every((cost) => getItemCount(inventory, cost.itemId) >= cost.quantity);
}

export function removeItems(inventory: InventoryState, itemId: string, quantity: number): boolean {
  if (getItemCount(inventory, itemId) < quantity) return false;
  let remaining = quantity;
  for (const stack of inventory.slots) {
    if (!stack || stack.itemId !== itemId || remaining <= 0) continue;
    const take = Math.min(remaining, stack.quantity);
    stack.quantity -= take;
    remaining -= take;
  }
  for (let i = 0; i < inventory.slots.length; i += 1) {
    const stack = inventory.slots[i];
    if (stack && stack.quantity <= 0) inventory.slots[i] = null;
  }
  return true;
}

export function addItem(inventory: InventoryState, itemId: string, quantity = 1): boolean {
  const def = itemDefs[itemId];
  if (!def) return false;

  if (def.stackable) {
    for (const stack of inventory.slots) {
      if (!stack || stack.itemId !== itemId || stack.quantity >= def.maxStack) continue;
      const room = def.maxStack - stack.quantity;
      const moved = Math.min(room, quantity);
      stack.quantity += moved;
      quantity -= moved;
      if (quantity <= 0) return true;
    }
  }

  while (quantity > 0) {
    const emptyIndex = inventory.slots.findIndex((slot) => !slot);
    if (emptyIndex === -1) return false;
    const stackQuantity = def.stackable ? Math.min(quantity, def.maxStack) : 1;
    inventory.slots[emptyIndex] = createStack(itemId, stackQuantity);
    quantity -= stackQuantity;
  }

  return true;
}

export function addStack(inventory: InventoryState, stack: ItemStack): boolean {
  return addItem(inventory, stack.itemId, stack.quantity);
}

export function moveStackBetween(
  state: GameState,
  from: 'inventory' | 'bank' | 'trade-player',
  to: 'inventory' | 'bank' | 'trade-player',
  slot: number,
  targetSlot?: number
): void {
  const fromContainer = getInventoryByName(state, from);
  const toContainer = getInventoryByName(state, to);
  const fromSlots = Array.isArray(fromContainer) ? fromContainer : fromContainer.slots;
  const toSlots = Array.isArray(toContainer) ? toContainer : toContainer.slots;
  const stack = fromSlots[slot];
  if (!stack) return;

  if (typeof targetSlot === 'number' && targetSlot >= 0 && targetSlot < toSlots.length) {
    if (fromSlots === toSlots && slot === targetSlot) return;
    const targetStack = toSlots[targetSlot];
    if (!targetStack) {
      toSlots[targetSlot] = stack;
      fromSlots[slot] = null;
      return;
    }
    const def = itemDefs[stack.itemId];
    if (def?.stackable && targetStack.itemId === stack.itemId && targetStack.quantity < def.maxStack) {
      const moved = Math.min(def.maxStack - targetStack.quantity, stack.quantity);
      targetStack.quantity += moved;
      stack.quantity -= moved;
      if (stack.quantity <= 0) fromSlots[slot] = null;
      return;
    }
    toSlots[targetSlot] = stack;
    fromSlots[slot] = targetStack;
    return;
  }

  if (addStack({ capacity: toSlots.length, slots: toSlots }, stack)) {
    fromSlots[slot] = null;
  }
}

export function splitStack(inventory: InventoryState, slot: number): boolean {
  const stack = inventory.slots[slot];
  if (!stack || stack.quantity < 2) return false;
  const emptyIndex = inventory.slots.findIndex((candidate) => !candidate);
  if (emptyIndex === -1) return false;
  const splitQuantity = Math.floor(stack.quantity / 2);
  stack.quantity -= splitQuantity;
  inventory.slots[emptyIndex] = createStack(stack.itemId, splitQuantity);
  return true;
}

export function offerTradeItem(state: GameState, inventorySlot: number, targetSlot?: number): void {
  const trade = state.ui.trade;
  const stack = state.player.inventory.slots[inventorySlot];
  if (!trade || !stack) return;
  const requestedSlot = typeof targetSlot === 'number' && targetSlot >= 0 && targetSlot < trade.playerSlots.length ? targetSlot : null;
  const emptyIndex = requestedSlot != null && !trade.playerSlots[requestedSlot] ? requestedSlot : trade.playerSlots.findIndex((slot) => !slot);
  if (emptyIndex === -1) {
    addSystemMessage(state, 'Your trade offer is full.');
    return;
  }
  trade.playerSlots[emptyIndex] = { ...stack, uid: createId('offer') };
  trade.playerLocked = false;
  trade.partnerLocked = false;
}

export function removeTradeOffer(state: GameState, offerSlot: number): void {
  const trade = state.ui.trade;
  if (!trade) return;
  trade.playerSlots[offerSlot] = null;
  trade.playerLocked = false;
  trade.partnerLocked = false;
}

export function useItem(state: GameState, slot: number): void {
  const stack = state.player.inventory.slots[slot];
  if (!stack) return;
  const def = itemDefs[stack.itemId];
  if (!def?.useEffect) return;
  const stats = calculateDerivedStats(state);
  if (stack.itemId.includes('potion')) recordPotionConsumed(state, stack.itemId);

  if (def.useEffect === 'heal') {
    const before = state.player.health;
    state.player.health = Math.min(stats.maxHealth, state.player.health + (def.power ?? 0));
    addPlayerFloatingText(state, `+${Math.round(state.player.health - before)}`, '#55e676');
    addSystemMessage(state, `You drink ${def.name}.`);
  } else if (def.useEffect === 'mana') {
    const before = state.player.mana;
    state.player.mana = Math.min(stats.maxMana, state.player.mana + (def.power ?? 0));
    addPlayerFloatingText(state, `+${Math.round(state.player.mana - before)} Mana`, '#58b7ff');
    addSystemMessage(state, `You drink ${def.name}.`);
  } else if (def.useEffect === 'stamina' || def.useEffect === 'food') {
    const before = state.player.stamina;
    state.player.stamina = Math.min(stats.maxStamina, state.player.stamina + (def.power ?? 0));
    addPlayerFloatingText(state, `+${Math.round(state.player.stamina - before)}`, '#77e894');
    addSystemMessage(state, `You eat ${def.name}.`);
  } else if (def.useEffect === 'cure') {
    state.player.combatProfile.poison = null;
    addPlayerFloatingText(state, 'Cured', '#b8ffdf');
    addSystemMessage(state, `You drink ${def.name}.`);
  }

  stack.quantity -= 1;
  if (stack.quantity <= 0) state.player.inventory.slots[slot] = null;
}

function addPlayerFloatingText(state: GameState, text: string, color: string): void {
  state.floatingTexts.push({
    id: createId('float'),
    text,
    position: { ...state.player.position, y: state.player.position.y + 1.6 },
    color,
    age: 0,
    lifetime: 1.2
  });
}

export function equipItem(state: GameState, slot: number): void {
  const stack = state.player.inventory.slots[slot];
  if (!stack) return;
  const def = itemDefs[stack.itemId];
  if (!def?.equipmentSlot) return;
  const equipSlot = def.equipmentSlot;
  const previous = state.player.equipment[equipSlot];
  state.player.equipment[equipSlot] = stack;
  state.player.inventory.slots[slot] = previous ?? null;
  addSystemMessage(state, `Equipped ${def.name}.`);
  emitAudioHook('equip', { id: stack.itemId, area: state.player.currentArea, position: state.player.position });
  if (previous) emitAudioHook('unequip', { id: previous.itemId, area: state.player.currentArea, position: state.player.position });

  const stats = calculateDerivedStats(state);
  state.player.health = Math.min(state.player.health, stats.maxHealth);
  state.player.mana = Math.min(state.player.mana, stats.maxMana);
  state.player.stamina = Math.min(state.player.stamina, stats.maxStamina);
}

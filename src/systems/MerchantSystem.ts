import { itemDefs } from '../data/items';
import { emitAudioHook } from '../audio/AudioHooks';
import type { GameState, InventoryState, ItemStack } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { addItem, removeItems } from './InventorySystem';
import { recordQuestEvent, refreshQuestProgress } from './QuestSystem';
import { getSkillValue } from './SkillSystem';
import { recordGoldDelta } from './TelemetrySystem';
import { calculateLocalPrice } from './EconomySystem';

function stackValue(state: GameState, stack: ItemStack, mode: 'vendor_buy' | 'vendor_sell', vendorId: string | null): number {
  return calculateLocalPrice(state, stack.itemId, { quantity: stack.quantity, stack, mode, vendorId });
}

function getMerchantInventory(state: GameState): InventoryState | null {
  const merchant = state.ui.merchant ? state.entities[state.ui.merchant.partnerId] : null;
  if (!merchant || (merchant.kind !== 'npc' && merchant.kind !== 'social')) return null;
  return merchant.tradeInventory ?? null;
}

export function openMerchant(state: GameState, partnerId: string): void {
  const merchant = state.entities[partnerId];
  if (!merchant || merchant.kind !== 'npc' || (merchant.role !== 'merchant' && !merchant.training && !merchant.tradeInventory)) return;
  if (merchant.serviceAvailable === false) {
    state.ui.prompt = `${merchant.name} is not selling right now.`;
    addSystemMessage(state, state.ui.prompt);
    return;
  }
  state.ui.merchant = { partnerId };
  state.ui.trade = null;
  state.ui.panels.trade = false;
  state.ui.panels.merchant = true;
  state.ui.panels.inventory = true;
  state.ui.prompt = `Browsing ${merchant.name}'s wares.`;
  addSystemMessage(state, `${merchant.name} opens a price ledger.`);
}

export function closeMerchant(state: GameState): void {
  state.ui.merchant = null;
  state.ui.panels.merchant = false;
}

export function buyMerchantItem(state: GameState, slot: number): void {
  const inventory = getMerchantInventory(state);
  const stack = inventory?.slots[slot];
  if (!inventory || !stack) return;
  const itemId = stack.itemId;
  const quantity = stack.quantity;
  const itemName = itemDefs[itemId]?.name ?? itemId;
  const merchant = state.ui.merchant ? state.entities[state.ui.merchant.partnerId] : null;
  const cost = stackValue(state, stack, 'vendor_buy', merchant?.id ?? null);
  if (state.player.gold < cost) {
    addSystemMessage(state, 'You do not have enough gold.');
    return;
  }
  if (!addItem(state.player.inventory, stack.itemId, stack.quantity)) {
    addSystemMessage(state, 'Your pack is full.');
    return;
  }
  removeItems(inventory, itemId, quantity);
  state.player.gold -= cost;
  recordGoldDelta(state, -cost);
  if (merchant && (merchant.kind === 'npc' || merchant.kind === 'social')) merchant.tradeGold = (merchant.tradeGold ?? 0) + cost;
  recordQuestEvent(state, { type: 'buy', itemId, quantity });
  refreshQuestProgress(state);
  addSystemMessage(state, `Bought ${itemName} x${quantity} for ${cost}g.`);
  emitAudioHook('market_transaction', { id: itemId, area: state.player.currentArea, intensity: cost });
}

export function sellMerchantItem(state: GameState, slot: number): void {
  const stack = state.player.inventory.slots[slot];
  const inventory = getMerchantInventory(state);
  if (!stack || !inventory) return;
  const itemId = stack.itemId;
  const quantity = stack.quantity;
  const itemName = itemDefs[itemId]?.name ?? itemId;
  const merchant = state.ui.merchant ? state.entities[state.ui.merchant.partnerId] : null;
  const value = stackValue(state, stack, 'vendor_sell', merchant?.id ?? null);
  if (merchant && (merchant.kind === 'npc' || merchant.kind === 'social') && (merchant.tradeGold ?? 0) < value) {
    addSystemMessage(state, 'The merchant cannot afford that.');
    return;
  }
  if (!addItem(inventory, itemId, quantity)) {
    addSystemMessage(state, 'The merchant has no room for that.');
    return;
  }
  removeItems(state.player.inventory, itemId, quantity);
  state.player.gold += value;
  recordGoldDelta(state, value);
  if (merchant && (merchant.kind === 'npc' || merchant.kind === 'social')) merchant.tradeGold = Math.max(0, (merchant.tradeGold ?? 0) - value);
  addSystemMessage(state, `Sold ${itemName} x${quantity} for ${value}g.`);
  emitAudioHook('market_transaction', { id: itemId, area: state.player.currentArea, intensity: value });
}

export function trainSkill(state: GameState, skillId: string): void {
  const merchant = state.ui.merchant ? state.entities[state.ui.merchant.partnerId] : null;
  if (!merchant || (merchant.kind !== 'npc' && merchant.kind !== 'social')) return;
  const offer = merchant.training?.find((candidate) => candidate.skillId === skillId);
  if (!offer) return;
  const current = getSkillValue(state, skillId);
  if (current >= offer.maxSkill) {
    addSystemMessage(state, `${merchant.name} cannot train ${skillId} beyond ${offer.maxSkill}.`);
    return;
  }
  const cost = Math.max(1, Math.round((Math.floor(current) + 1) * offer.costPerPoint));
  if (state.player.gold < cost) {
    addSystemMessage(state, `Training ${skillId} costs ${cost}g.`);
    return;
  }
  const skill = state.player.skills[skillId];
  if (!skill) return;
  state.player.gold -= cost;
  recordGoldDelta(state, -cost);
  merchant.tradeGold = (merchant.tradeGold ?? 0) + cost;
  skill.realValue = Number(Math.min(offer.maxSkill, skill.realValue + 1).toFixed(1));
  skill.value = Number((skill.realValue + skill.bonusValue).toFixed(1));
  skill.lastGainAt = state.clock;
  addSystemMessage(state, `${merchant.name} trains ${skillId} to ${skill.value.toFixed(1)} for ${cost}g.`);
  emitAudioHook('market_transaction', { id: skillId, area: state.player.currentArea, intensity: cost });
}

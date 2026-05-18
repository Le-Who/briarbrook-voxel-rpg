import { itemDefs } from '../data/items';
import { createInitialEconomyState, localDemandDefaults, marketOrderTemplates, vendorProfiles, workOrderTemplates } from '../data/economy';
import { emitAudioHook } from '../audio/AudioHooks';
import { createId, createStack } from '../game/GameState';
import type { EconomyOrderCategory, EconomyTransactionState, EquipmentSlot, GameState, InventoryState, ItemStack, RecipeRequirement, StationType } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { adjustTownStanding } from './CrimeSystem';
import { addItem, getItemCount, hasItems, removeItems } from './InventorySystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';
import { recordGoldDelta, recordItemConsumed, recordItemSold, recordMarketTransaction, recordPriceTrend, recordResourceOutflow, recordWorkOrderCompleted } from './TelemetrySystem';

export function isBroken(stack: ItemStack | null | undefined): boolean {
  return Boolean(stack?.maxDurability && (stack.durability ?? stack.maxDurability) <= 0);
}

export function durabilityScale(stack: ItemStack | null | undefined): number {
  if (!stack?.maxDurability) return 1;
  const ratio = Math.max(0, Math.min(1, (stack.durability ?? stack.maxDurability) / stack.maxDurability));
  if (ratio <= 0) return 0;
  return Math.max(0.52, 0.72 + ratio * 0.28);
}

export function economyCategoryForItem(itemId: string): EconomyOrderCategory {
  if (['iron_ore', 'copper_ore', 'dull_copper_ore', 'bronze_ore', 'shadow_iron_ore', 'gold_ore', 'iron_bar', 'copper_bar'].includes(itemId)) return 'metal';
  if (['wood', 'logs', 'boards', 'oak_logs', 'ash_logs', 'yew_logs', 'bark_fragment'].includes(itemId)) return 'wood';
  if (['bandage', 'health_potion', 'mana_potion', 'refresh_potion', 'cure_potion', 'clean_cloth'].includes(itemId)) return 'healing';
  if (['black_pearl', 'blood_moss', 'garlic', 'ginseng', 'mandrake_root', 'nightshade', 'spider_silk', 'sulfurous_ash'].includes(itemId)) return 'reagents';
  if (['fresh_bread', 'raw_fish', 'carrot', 'kindling'].includes(itemId)) return 'food';
  if (['arrow', 'bolt', 'torch', 'lockpick'].includes(itemId)) return 'combat';
  if (['repair_kit', 'gear', 'sealed_crate'].includes(itemId)) return 'banking';
  if (['stone_block', 'crate_kit', 'storage_chest', 'wood_door_kit', 'wall_tapestry'].includes(itemId)) return 'building';
  if (['map_fragment', 'rough_treasure_map', 'crypt_lore_clue', 'vendor_contract'].includes(itemId)) return 'treasure';
  return itemDefs[itemId]?.type === 'building' ? 'housing' : 'misc';
}

export function calculateLocalPrice(
  state: GameState,
  itemId: string,
  options: {
    quantity?: number;
    stack?: ItemStack | null;
    mode?: 'market' | 'vendor_buy' | 'vendor_sell' | 'work_order';
    vendorId?: string | null;
    demandMultiplier?: number;
    quality?: ItemStack['quality'];
    condition?: number;
  } = {}
): number {
  const def = itemDefs[itemId];
  const quantity = Math.max(1, Math.floor(options.quantity ?? 1));
  const category = economyCategoryForItem(itemId);
  const demand = options.demandMultiplier ?? state.world.economy.localDemand[itemId] ?? state.world.economy.localDemand[category] ?? localDemandDefaults[category] ?? 1;
  const scarcity = scarcityMultiplier(state, itemId);
  const quality = qualityMultiplier(options.quality ?? options.stack?.quality);
  const condition = options.condition ?? durabilityScale(options.stack);
  const vendor = vendorModifier(options.vendorId, category, options.mode ?? 'market');
  const reputation = reputationPriceModifier(state, options.mode ?? 'market');
  const margin = options.mode === 'vendor_buy' ? 1.18 : options.mode === 'vendor_sell' ? 0.55 : 1;
  const unit = Math.max(1, Math.round((def?.value ?? 1) * demand * scarcity * quality * condition * vendor * reputation * margin));
  return unit * quantity;
}

function scarcityMultiplier(state: GameState, itemId: string): number {
  const playerSupply = getItemCount(state.player.inventory, itemId) + getItemCount(state.player.bank, itemId);
  if (playerSupply <= 2) return 1.08;
  if (playerSupply >= 40) return 0.94;
  return 1;
}

function qualityMultiplier(quality: ItemStack['quality'] | undefined): number {
  if (quality === 'exceptional') return 1.32;
  if (quality === 'crude') return 0.82;
  return 1;
}

function vendorModifier(vendorId: string | null | undefined, category: EconomyOrderCategory, mode: 'market' | 'vendor_buy' | 'vendor_sell' | 'work_order'): number {
  const profile = vendorId ? vendorProfiles[vendorId] : null;
  if (!profile) return 1;
  if (mode === 'vendor_sell') return profile.buys.includes(category) ? profile.buyModifier : 0.88;
  if (mode === 'vendor_buy') return profile.sells.includes(category) ? profile.sellModifier : 1.18;
  return 1;
}

function reputationPriceModifier(state: GameState, mode: 'market' | 'vendor_buy' | 'vendor_sell' | 'work_order'): number {
  if (mode !== 'vendor_buy' && mode !== 'vendor_sell') return 1;
  const status = state.player.reputation.status;
  if (status === 'criminal' || status === 'outlaw') return mode === 'vendor_buy' ? 1.22 : 0.68;
  if (status === 'suspicious') return mode === 'vendor_buy' ? 1.08 : 0.88;
  if (status === 'lawful') return mode === 'vendor_buy' ? 0.98 : 1.04;
  return 1;
}

export function degradeItemStack(stack: ItemStack | null | undefined, amount: number): boolean {
  if (!stack?.maxDurability) return false;
  stack.durability = Math.max(0, (stack.durability ?? stack.maxDurability) - amount);
  return stack.durability <= 0;
}

export function degradeEquippedItem(state: GameState, slot: EquipmentSlot, amount: number): void {
  const stack = state.player.equipment[slot];
  if (!stack) return;
  const broke = degradeItemStack(stack, amount);
  if (broke) addSystemMessage(state, `${itemDefs[stack.itemId]?.name ?? stack.itemId} is broken and needs repair.`);
}

export function degradeArmorFromHit(state: GameState, amount = 1): void {
  const order: EquipmentSlot[] = ['armor', 'shield', 'helmet', 'boots'];
  const slot = order.find((candidate) => state.player.equipment[candidate]?.maxDurability);
  if (slot) degradeEquippedItem(state, slot, amount);
}

export function findUsableTool(state: GameState, toolItemId: string): ItemStack | null {
  const equipped = Object.values(state.player.equipment).find((stack) => stack?.itemId === toolItemId) ?? null;
  if (equipped) return isBroken(equipped) ? null : equipped;
  const inventoryStack = state.player.inventory.slots.find((stack) => stack?.itemId === toolItemId) ?? null;
  return inventoryStack && !isBroken(inventoryStack) ? inventoryStack : null;
}

export function degradeToolForGathering(state: GameState, toolItemId: string): void {
  const tool = findUsableTool(state, toolItemId);
  if (!tool) return;
  const broke = degradeItemStack(tool, 1);
  if (broke) addSystemMessage(state, `${itemDefs[tool.itemId]?.name ?? tool.itemId} breaks from heavy use.`);
}

export function repairEquippedItem(state: GameState, slot: EquipmentSlot): boolean {
  const stack = state.player.equipment[slot];
  if (!stack?.maxDurability) {
    state.ui.prompt = 'Nothing repairable is equipped there.';
    return false;
  }
  const missing = stack.maxDurability - (stack.durability ?? stack.maxDurability);
  if (missing <= 0) {
    state.ui.prompt = `${itemDefs[stack.itemId]?.name ?? stack.itemId} is already repaired.`;
    return false;
  }
  const repair = repairProfile(stack);
  if (!stationMatches(state.ui.selectedStationType, repair.station)) {
    state.ui.prompt = `Use a ${repair.station} station to repair ${itemDefs[stack.itemId]?.name ?? stack.itemId}.`;
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  const skill = getSkillValue(state, repair.skill);
  const baseCost = Math.max(1, Math.ceil((missing / stack.maxDurability) * 4));
  const materialCost = Math.max(1, Math.ceil(baseCost * (1 - Math.min(80, skill) / 260)));
  const costs = [{ itemId: repair.material, quantity: materialCost }];
  if (!hasItems(state.player.inventory, costs)) {
    state.ui.prompt = `Repair needs ${itemDefs[repair.material]?.name ?? repair.material} x${materialCost}.`;
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  removeItems(state.player.inventory, repair.material, materialCost);
  recordItemConsumed(state, repair.material, materialCost);
  recordResourceOutflow(state, repair.material, materialCost);
  const failure = Math.random() > Math.max(0.08, Math.min(0.96, 0.58 + (skill - 20) * 0.01));
  attemptSkillUse(state, repair.skill, { verb: 'repair', difficulty: 20 + materialCost * 8, success: !failure, itemId: stack.itemId, relatedSkills: ['Arms Lore', 'Item Identification'] });
  if (failure) {
    stack.maxDurability = Math.max(1, stack.maxDurability - 1);
    stack.durability = Math.min(stack.maxDurability, (stack.durability ?? 0) + Math.ceil(missing * 0.35));
    addSystemMessage(state, `${itemDefs[stack.itemId]?.name ?? stack.itemId} repair is rough and loses a little max durability.`);
  } else {
    stack.durability = stack.maxDurability;
    addSystemMessage(state, `${itemDefs[stack.itemId]?.name ?? stack.itemId} repaired.`);
  }
  pushTransaction(state, { kind: 'repair', itemId: stack.itemId, quantity: materialCost, gold: 0, actor: 'Valen' });
  return !failure;
}

export function completeWorkOrder(state: GameState, orderId: string): boolean {
  const order = state.world.economy.workOrders.find((candidate) => candidate.id === orderId);
  if (!order || order.status !== 'open') return false;
  const requiredItems = order.requiredItems?.length ? order.requiredItems : [{ itemId: order.itemId, quantity: order.quantity }];
  if (!hasItems(state.player.inventory, requiredItems)) {
    state.ui.prompt = `${order.requester} needs ${formatRequirements(requiredItems)}.`;
    return false;
  }
  if (order.requiredQuality && !hasQualityItems(state.player.inventory, requiredItems, order.requiredQuality)) {
    state.ui.prompt = `${order.title ?? order.requester} requires ${order.requiredQuality} quality.`;
    return false;
  }
  if (order.rewardItems?.length && !canAddRewards(state, order.rewardItems)) {
    state.ui.prompt = 'Make room in your pack before claiming this order.';
    return false;
  }
  requiredItems.forEach((requirement) => removeItems(state.player.inventory, requirement.itemId, requirement.quantity));
  order.rewardItems?.forEach((reward) => addItem(state.player.inventory, reward.itemId, reward.quantity));
  order.delivered = order.quantity;
  order.status = 'complete';
  state.player.gold += order.rewardGold;
  recordGoldDelta(state, order.rewardGold);
  requiredItems.forEach((requirement) => {
    recordItemConsumed(state, requirement.itemId, requirement.quantity);
    recordResourceOutflow(state, requirement.itemId, requirement.quantity);
  });
  recordWorkOrderCompleted(state);
  adjustTownStanding(state, order.reputationGain ?? 1);
  attemptSkillUse(state, order.skill, { verb: 'work-order', difficulty: 24, success: true, itemId: order.itemId });
  pushTransaction(state, { kind: 'work_order', category: order.category, itemId: order.itemId, quantity: order.quantity, gold: order.rewardGold, actor: order.requester });
  addSystemMessage(state, `${order.requester} accepts ${formatRequirements(requiredItems)} and pays ${order.rewardGold}g.`);
  emitAudioHook('market_transaction', { id: order.id, area: state.player.currentArea, intensity: order.rewardGold });
  return true;
}

export function fulfillMarketOrder(state: GameState, orderId: string): boolean {
  const order = state.world.economy.marketOrders.find((candidate) => candidate.id === orderId);
  if (!order || order.status !== 'open') return false;
  order.unitPrice = calculateLocalPrice(state, order.itemId, {
    mode: 'market',
    demandMultiplier: order.demandMultiplier,
    quality: order.quality,
    condition: order.condition
  });
  const total = order.quantity * order.unitPrice;
  if (order.kind === 'buy') {
    if (getItemCount(state.player.inventory, order.itemId) < order.quantity) {
      state.ui.prompt = `${order.poster} is buying ${itemDefs[order.itemId]?.name ?? order.itemId} x${order.quantity}.`;
      return false;
    }
    removeItems(state.player.inventory, order.itemId, order.quantity);
    state.player.gold += total;
    recordGoldDelta(state, total);
    recordItemSold(state, order.itemId, order.quantity);
    recordResourceOutflow(state, order.itemId, order.quantity);
  } else {
    if (state.player.gold < total) {
      state.ui.prompt = `That order costs ${total}g.`;
      return false;
    }
    if (!addItem(state.player.inventory, order.itemId, order.quantity)) {
      state.ui.prompt = 'Your pack is full.';
      return false;
    }
    state.player.gold -= total;
    recordGoldDelta(state, -total);
  }
  order.status = 'filled';
  recordMarketTransaction(state);
  recordPriceTrend(state, order.itemId, order.unitPrice);
  state.world.economy.priceTrends[order.itemId] = [...(state.world.economy.priceTrends[order.itemId] ?? []), order.unitPrice].slice(-12);
  pushTransaction(state, { kind: 'market', category: order.category, itemId: order.itemId, quantity: order.quantity, gold: order.kind === 'buy' ? total : -total, actor: order.poster });
  addSystemMessage(state, `Market order filled with ${order.poster}: ${itemDefs[order.itemId]?.name ?? order.itemId} x${order.quantity}.`);
  emitAudioHook('market_transaction', { id: order.id, area: state.player.currentArea, intensity: total });
  return true;
}

export function updateEconomy(state: GameState): void {
  const day = state.world.time?.day ?? 0;
  if (!state.world.economy) state.world.economy = createInitialEconomyState();
  state.world.economy.localDemand ??= { ...localDemandDefaults };
  state.world.economy.priceTrends ??= {};
  if (state.world.economy.lastDailySeed !== day) {
    state.world.economy.workOrders = workOrderTemplates.map((order, index) => ({
      ...order,
      id: `${order.id}_d${day}`,
      requiredItems: order.requiredItems?.map((item) => ({ ...item })),
      rewardItems: order.rewardItems?.map((item) => ({ ...item })),
      expiresAt: state.clock + 96 + index
    }));
    state.world.economy.marketOrders = marketOrderTemplates.map((order, index) => ({
      ...order,
      id: `${order.id}_d${day}`,
      unitPrice: calculateLocalPrice(state, order.itemId, { mode: 'market', demandMultiplier: order.demandMultiplier, quality: order.quality, condition: order.condition }),
      expiresAt: state.clock + 60 + index * 3
    }));
    state.world.economy.lastDailySeed = day;
    addSystemMessage(state, 'Briarbrook market board refreshes: metal, boards, bandages, and rations are in demand.');
  }
  for (const order of state.world.economy.marketOrders) {
    if (order.status !== 'open') continue;
    if (order.expiresAt <= state.clock) order.status = 'expired';
    const pressure = state.world.resourcePressure.forest?.yieldModifier ?? 1;
    if ((order.itemId === 'logs' || order.itemId === 'iron_ore') && pressure < 1) {
      const template = marketOrderTemplates.find((candidate) => order.id.startsWith(candidate.id));
      if (template) order.unitPrice = Math.round(template.unitPrice * (1 + (1 - pressure) * 0.7));
    } else {
      order.unitPrice = calculateLocalPrice(state, order.itemId, { mode: 'market', demandMultiplier: order.demandMultiplier, quality: order.quality, condition: order.condition });
    }
    state.world.economy.priceTrends[order.itemId] = [...(state.world.economy.priceTrends[order.itemId] ?? []), order.unitPrice].slice(-12);
  }
  for (const order of state.world.economy.workOrders) {
    if (order.status === 'open' && order.expiresAt <= state.clock) order.status = 'expired';
  }
}

function repairProfile(stack: ItemStack): { material: string; skill: string; station: StationType } {
  const itemId = stack.itemId;
  const material = stack.materialType ?? '';
  if (material.includes('wood') || itemId.includes('bow')) return { material: 'boards', skill: 'Carpentry', station: 'carpentry' };
  if (material.includes('leather') || material.includes('cloth') || itemId.includes('robe') || itemId.includes('leather')) return { material: material.includes('cloth') ? 'clean_cloth' : 'leather', skill: 'Tailoring', station: 'tailor' };
  return { material: 'iron_bar', skill: 'Blacksmithing', station: 'forge' };
}

function stationMatches(current: StationType | 'all', required: StationType): boolean {
  return current === required || current === 'all';
}

function formatRequirements(requirements: RecipeRequirement[]): string {
  return requirements.map((requirement) => `${itemDefs[requirement.itemId]?.name ?? requirement.itemId} x${requirement.quantity}`).join(', ');
}

function hasQualityItems(inventory: InventoryState, requirements: RecipeRequirement[], quality: ItemStack['quality']): boolean {
  return requirements.every((requirement) => {
    const matching = inventory.slots
      .filter((stack) => stack?.itemId === requirement.itemId && stack.quality === quality)
      .reduce((sum, stack) => sum + (stack?.quantity ?? 0), 0);
    return matching >= requirement.quantity;
  });
}

function canAddRewards(state: GameState, rewards: RecipeRequirement[]): boolean {
  const simulated: InventoryState = {
    capacity: state.player.inventory.capacity,
    slots: state.player.inventory.slots.map((slot) => (slot ? { ...slot } : null))
  };
  return rewards.every((reward) => addItem(simulated, reward.itemId, reward.quantity));
}

function pushTransaction(state: GameState, entry: Omit<EconomyTransactionState, 'id' | 'createdAt'>): void {
  state.world.economy.transactionLog.push({ id: createId('txn'), createdAt: state.clock, ...entry });
  state.world.economy.transactionLog = state.world.economy.transactionLog.slice(-40);
}

export function createExceptionalTrait(stack: ItemStack): void {
  if (stack.quality !== 'exceptional') return;
  stack.exceptional = true;
  stack.trait = stack.trait ?? (stack.materialType?.includes('iron') ? 'steady' : stack.materialType?.includes('wood') ? 'balanced' : 'well-made');
}

export function createMarketStack(itemId: string, quantity: number): ItemStack {
  return createStack(itemId, quantity);
}

import { itemDefs } from '../data/items';
import { createInitialEconomyState, localDemandDefaults, marketOrderTemplates, vendorProfiles, workOrderTemplates } from '../data/economy';
import { emitAudioHook } from '../audio/AudioHooks';
import { createId, createStack } from '../game/GameState';
import type { EconomyOrderCategory, EconomyTransactionState, EquipmentSlot, GameState, InventoryState, ItemStack, RecipeRequirement, StationType, WorldEventType } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { adjustTownStanding } from './CrimeSystem';
import { addItem, getItemCount, hasItems, removeItems } from './InventorySystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';
import { recordDurabilityLoss, recordGoldDelta, recordItemConsumed, recordItemSold, recordMarketTransaction, recordPriceTrend, recordRepairCompleted, recordResourceOutflow, recordWorkOrderCompleted, recordWorkOrderCompletionTime } from './TelemetrySystem';

interface EconomyDemandCycle {
  label: string;
  duration: number;
  affected: Array<EconomyOrderCategory | string>;
  multipliers: Record<string, number>;
}

const economyDemandCycles: Partial<Record<WorldEventType, EconomyDemandCycle>> = {
  bandit_ambush: {
    label: 'Bandit raids',
    duration: 72,
    affected: ['guard', 'combat', 'arrow', 'shield', 'bandage', 'fresh_bread', 'torch'],
    multipliers: {
      guard: 1.24,
      combat: 1.22,
      arrow: 1.38,
      shield: 1.18,
      bandage: 1.16,
      fresh_bread: 1.1,
      torch: 1.14
    }
  },
  crypt_spill: {
    label: 'Crypt activity',
    duration: 80,
    affected: ['mage', 'healer', 'reagents', 'sulfurous_ash', 'garlic', 'ginseng', 'mana_potion', 'cure_potion'],
    multipliers: {
      mage: 1.18,
      healer: 1.12,
      reagents: 1.18,
      sulfurous_ash: 1.32,
      garlic: 1.24,
      ginseng: 1.2,
      mana_potion: 1.16,
      cure_potion: 1.18
    }
  },
  storm: {
    label: 'River storm',
    duration: 64,
    affected: ['guard', 'banker', 'combat', 'building', 'torch', 'repair_kit', 'raw_fish'],
    multipliers: {
      guard: 1.1,
      banker: 1.08,
      combat: 1.12,
      building: 1.1,
      torch: 1.34,
      repair_kit: 1.24,
      raw_fish: 1.16
    }
  },
  merchant_caravan: {
    label: 'Caravan arrived',
    duration: 70,
    affected: ['banker', 'banking', 'food', 'treasure', 'sealed_crate', 'vendor_contract'],
    multipliers: {
      banker: 1.18,
      banking: 1.16,
      food: 1.1,
      treasure: 1.12,
      sealed_crate: 1.24,
      vendor_contract: 1.2
    }
  },
  rare_ore: {
    label: 'Rare ore rumor',
    duration: 90,
    affected: ['smithy', 'metal', 'iron_ore', 'copper_ore', 'glimmer_gem'],
    multipliers: {
      smithy: 1.12,
      metal: 1.16,
      iron_ore: 1.14,
      copper_ore: 1.12,
      glimmer_gem: 1.18
    }
  },
  market_day: {
    label: 'Market day',
    duration: 96,
    affected: ['smithy', 'healer', 'mage', 'guard', 'carpenter', 'tavern', 'banker', 'food', 'wood', 'metal'],
    multipliers: {
      smithy: 1.1,
      healer: 1.1,
      mage: 1.1,
      guard: 1.08,
      carpenter: 1.1,
      tavern: 1.12,
      banker: 1.1,
      food: 1.12,
      wood: 1.08,
      metal: 1.08
    }
  },
  guard_patrol: {
    label: 'Guard patrol',
    duration: 72,
    affected: ['guard', 'combat', 'arrow', 'fresh_bread', 'bandage', 'torch'],
    multipliers: {
      guard: 1.16,
      combat: 1.1,
      arrow: 1.18,
      fresh_bread: 1.08,
      bandage: 1.08,
      torch: 1.08
    }
  },
  healer_shortage: {
    label: 'Healer shortage',
    duration: 84,
    affected: ['healer', 'healing', 'bandage', 'health_potion', 'cure_potion', 'ginseng'],
    multipliers: {
      healer: 1.22,
      healing: 1.2,
      bandage: 1.24,
      health_potion: 1.18,
      cure_potion: 1.14,
      ginseng: 1.14
    }
  },
  mage_reagent_request: {
    label: 'Mage reagent request',
    duration: 84,
    affected: ['mage', 'reagents', 'sulfurous_ash', 'black_pearl', 'mandrake_root', 'ginseng'],
    multipliers: {
      mage: 1.2,
      reagents: 1.22,
      sulfurous_ash: 1.24,
      black_pearl: 1.18,
      mandrake_root: 1.14,
      ginseng: 1.1
    }
  }
};

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
  const categoryDemand = state.world.economy.localDemand[category] ?? localDemandDefaults[category] ?? 1;
  const itemDemand = state.world.economy.localDemand[itemId];
  const categoryBaseline = localDemandDefaults[category] ?? 1;
  const categoryShift = options.demandMultiplier != null ? categoryDemand / categoryBaseline : 1;
  const itemShift = itemDemand != null ? itemDemand : 1;
  const demand = options.demandMultiplier != null ? options.demandMultiplier * categoryShift * itemShift : itemDemand ?? categoryDemand;
  const scarcity = scarcityMultiplier(state, itemId);
  const quality = qualityMultiplier(options.quality ?? options.stack?.quality);
  const condition = options.condition ?? durabilityScale(options.stack);
  const vendor = vendorModifier(options.vendorId, category, options.mode ?? 'market');
  const reputation = reputationPriceModifier(state, options.mode ?? 'market');
  const margin = options.mode === 'vendor_buy' ? 1.18 : options.mode === 'vendor_sell' ? 0.55 : 1;
  const rawUnit = (def?.value ?? 1) * demand * scarcity * quality * condition * vendor * reputation * margin;
  if (options.mode === 'vendor_buy') return Math.max(quantity, Math.ceil(rawUnit * quantity));
  if (options.mode === 'vendor_sell') return Math.max(1, Math.floor(rawUnit * quantity));
  const unit = Math.max(1, Math.round(rawUnit));
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
  const before = stack.durability ?? stack.maxDurability ?? 0;
  const broke = degradeItemStack(stack, amount);
  recordDurabilityLoss(state, stack.itemId, before - (stack.durability ?? 0));
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
  const before = tool.durability ?? tool.maxDurability ?? 0;
  const broke = degradeItemStack(tool, 1);
  recordDurabilityLoss(state, tool.itemId, before - (tool.durability ?? 0));
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
  recordRepairCompleted(state);
  pushTransaction(state, { kind: 'repair', itemId: stack.itemId, quantity: materialCost, gold: 0, actor: 'Valen' });
  return !failure;
}

export function hasBankOrderAccess(state: GameState): boolean {
  return state.player.currentArea === 'bank' || state.player.currentArea === 'town' || state.ui.panels.bank;
}

export function getAccessibleItemCount(state: GameState, itemId: string): number {
  return getItemCount(state.player.inventory, itemId) + (hasBankOrderAccess(state) ? getItemCount(state.player.bank, itemId) : 0);
}

export function completeWorkOrder(state: GameState, orderId: string): boolean {
  ensureEconomyRuntimeState(state);
  const order = state.world.economy.workOrders.find((candidate) => candidate.id === orderId);
  if (!order || order.status !== 'open') return false;
  const requiredItems = order.requiredItems?.length ? order.requiredItems : [{ itemId: order.itemId, quantity: order.quantity }];
  if (!hasAccessibleItems(state, requiredItems)) {
    state.ui.prompt = `${order.requester} needs ${formatRequirements(requiredItems)}.`;
    return false;
  }
  if (order.requiredQuality && !hasAccessibleQualityItems(state, requiredItems, order.requiredQuality)) {
    state.ui.prompt = `${order.title ?? order.requester} requires ${order.requiredQuality} quality.`;
    return false;
  }
  const rewards = [...(order.rewardItems ?? []), ...(order.rewardVoucherItems ?? [])];
  if (rewards.length && !canAddRewards(state, rewards)) {
    state.ui.prompt = 'Make room in your pack before claiming this order.';
    return false;
  }
  requiredItems.forEach((requirement) => removeAccessibleItems(state, requirement.itemId, requirement.quantity));
  rewards.forEach((reward) => addItem(state.player.inventory, reward.itemId, reward.quantity));
  order.delivered = order.quantity;
  order.status = 'complete';
  state.player.gold += order.rewardGold;
  if (order.rewardRecipeIds?.length) {
    state.world.economy.unlockedRecipeIds = Array.from(new Set([...state.world.economy.unlockedRecipeIds, ...order.rewardRecipeIds]));
  }
  if (order.rewardDiscount) {
    state.world.economy.activeDiscounts.push({
      id: `${order.id}_discount_${Math.floor(state.clock)}`,
      label: order.rewardDiscount.label,
      category: order.rewardDiscount.category,
      percent: order.rewardDiscount.percent,
      startedAt: state.clock,
      expiresAt: state.clock + order.rewardDiscount.duration
    });
  }
  recordGoldDelta(state, order.rewardGold);
  requiredItems.forEach((requirement) => {
    recordItemConsumed(state, requirement.itemId, requirement.quantity);
    recordResourceOutflow(state, requirement.itemId, requirement.quantity);
  });
  recordWorkOrderCompleted(state);
  recordWorkOrderCompletionTime(state, order.id);
  adjustTownStanding(state, order.reputationGain ?? 1);
  attemptSkillUse(state, order.skill, { verb: 'work-order', difficulty: 24, success: true, itemId: order.itemId });
  pushTransaction(state, { kind: 'work_order', category: order.category, itemId: order.itemId, quantity: order.quantity, gold: order.rewardGold, actor: order.requester });
  addSystemMessage(state, `${order.requester} accepts ${formatRequirements(requiredItems)} and pays ${order.rewardGold}g.`);
  emitAudioHook('market_transaction', { id: order.id, area: state.player.currentArea, intensity: order.rewardGold });
  return true;
}

export function fulfillMarketOrder(state: GameState, orderId: string): boolean {
  ensureEconomyRuntimeState(state);
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
    if (getAccessibleItemCount(state, order.itemId) < order.quantity) {
      state.ui.prompt = `${order.poster} is buying ${itemDefs[order.itemId]?.name ?? order.itemId} x${order.quantity}.`;
      return false;
    }
    removeAccessibleItems(state, order.itemId, order.quantity);
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

export function applyEconomyEventDemand(state: GameState, type: WorldEventType): void {
  ensureEconomyRuntimeState(state);
  const cycle = economyDemandCycles[type];
  if (!cycle) return;
  for (const [key, multiplier] of Object.entries(cycle.multipliers)) {
    const current = state.world.economy.localDemand[key] ?? 1;
    state.world.economy.localDemand[key] = Math.max(current, multiplier);
  }
  const id = `demand_${type}`;
  const signal = {
    id,
    eventType: type,
    label: cycle.label,
    startedAt: state.clock,
    endsAt: state.clock + cycle.duration,
    affected: [...cycle.affected]
  };
  const index = state.world.economy.demandSignals.findIndex((candidate) => candidate.id === id);
  if (index >= 0) state.world.economy.demandSignals[index] = signal;
  else state.world.economy.demandSignals.push(signal);
  refreshOpenMarketPrices(state);
  addSystemMessage(state, `Market demand shifts: ${cycle.label}.`);
}

export function updateEconomy(state: GameState): void {
  const day = state.world.time?.day ?? 0;
  if (!state.world.economy) state.world.economy = createInitialEconomyState();
  ensureEconomyRuntimeState(state);
  const signalCountBefore = state.world.economy.demandSignals.length;
  state.world.economy.demandSignals = state.world.economy.demandSignals.filter((signal) => signal.endsAt > state.clock);
  state.world.economy.activeDiscounts = state.world.economy.activeDiscounts.filter((discount) => discount.expiresAt > state.clock);
  if (state.world.economy.demandSignals.length || state.world.economy.demandSignals.length !== signalCountBefore) rebuildLocalDemandFromSignals(state);
  if (state.world.economy.lastDailySeed !== day) {
    state.world.economy.workOrders = workOrderTemplates.map((order, index) => ({
      ...order,
      id: `${order.id}_d${day}`,
      requiredItems: order.requiredItems?.map((item) => ({ ...item })),
      rewardItems: order.rewardItems?.map((item) => ({ ...item })),
      rewardVoucherItems: order.rewardVoucherItems?.map((item) => ({ ...item })),
      rewardRecipeIds: order.rewardRecipeIds ? [...order.rewardRecipeIds] : undefined,
      rewardDiscount: order.rewardDiscount ? { ...order.rewardDiscount } : undefined,
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

function hasAccessibleItems(state: GameState, requirements: RecipeRequirement[]): boolean {
  return requirements.every((requirement) => getAccessibleItemCount(state, requirement.itemId) >= requirement.quantity);
}

function hasAccessibleQualityItems(state: GameState, requirements: RecipeRequirement[], quality: ItemStack['quality']): boolean {
  return requirements.every((requirement) => qualityItemCount(state.player.inventory, requirement.itemId, quality) + (hasBankOrderAccess(state) ? qualityItemCount(state.player.bank, requirement.itemId, quality) : 0) >= requirement.quantity);
}

function qualityItemCount(inventory: InventoryState, itemId: string, quality: ItemStack['quality']): number {
  return inventory.slots
    .filter((stack) => stack?.itemId === itemId && stack.quality === quality)
    .reduce((sum, stack) => sum + (stack?.quantity ?? 0), 0);
}

function removeAccessibleItems(state: GameState, itemId: string, quantity: number): boolean {
  let remaining = quantity;
  if (hasBankOrderAccess(state)) {
    const fromBank = Math.min(getItemCount(state.player.bank, itemId), remaining);
    if (fromBank > 0) {
      removeItems(state.player.bank, itemId, fromBank);
      remaining -= fromBank;
    }
  }
  const fromInventory = Math.min(getItemCount(state.player.inventory, itemId), remaining);
  if (fromInventory > 0) {
    removeItems(state.player.inventory, itemId, fromInventory);
    remaining -= fromInventory;
  }
  return remaining <= 0;
}

function canAddRewards(state: GameState, rewards: RecipeRequirement[]): boolean {
  const simulated: InventoryState = {
    capacity: state.player.inventory.capacity,
    slots: state.player.inventory.slots.map((slot) => (slot ? { ...slot } : null))
  };
  return rewards.every((reward) => addItem(simulated, reward.itemId, reward.quantity));
}

function pushTransaction(state: GameState, entry: Omit<EconomyTransactionState, 'id' | 'createdAt'>): void {
  ensureEconomyRuntimeState(state);
  state.world.economy.transactionLog.push({ id: createId('txn'), createdAt: state.clock, ...entry });
  state.world.economy.transactionLog = state.world.economy.transactionLog.slice(-40);
}

function refreshOpenMarketPrices(state: GameState): void {
  for (const order of state.world.economy.marketOrders) {
    if (order.status !== 'open') continue;
    order.unitPrice = calculateLocalPrice(state, order.itemId, {
      mode: 'market',
      demandMultiplier: order.demandMultiplier,
      quality: order.quality,
      condition: order.condition
    });
  }
}

function ensureEconomyRuntimeState(state: GameState): void {
  if (!state.world.economy) state.world.economy = createInitialEconomyState();
  state.world.economy.localDemand ??= { ...localDemandDefaults };
  state.world.economy.priceTrends ??= {};
  state.world.economy.demandSignals ??= [];
  state.world.economy.unlockedRecipeIds ??= [];
  state.world.economy.activeDiscounts ??= [];
}

function rebuildLocalDemandFromSignals(state: GameState): void {
  state.world.economy.localDemand = { ...localDemandDefaults };
  for (const signal of state.world.economy.demandSignals) {
    const cycle = economyDemandCycles[signal.eventType];
    if (!cycle) continue;
    for (const [key, multiplier] of Object.entries(cycle.multipliers)) {
      state.world.economy.localDemand[key] = Math.max(state.world.economy.localDemand[key] ?? 1, multiplier);
    }
  }
  refreshOpenMarketPrices(state);
}

export function createExceptionalTrait(stack: ItemStack): void {
  if (stack.quality !== 'exceptional') return;
  stack.exceptional = true;
  stack.trait = stack.trait ?? (stack.materialType?.includes('iron') ? 'steady' : stack.materialType?.includes('wood') ? 'balanced' : 'well-made');
}

export function createMarketStack(itemId: string, quantity: number): ItemStack {
  return createStack(itemId, quantity);
}

import { getHousingPieceDefinition, housingTierDefinitions, starterPlotId } from '../data/housing';
import { buildPieces, itemDefs } from '../data/items';
import { createInventory } from '../game/GameState';
import type { BuildingEntity, GameState, HousingPlotState, HousingStorageState, ItemStack, RecipeRequirement, StationType } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { calculateDerivedStats } from './EquipmentSystem';
import { addItem, getItemCount, removeItems, stackWeight } from './InventorySystem';

export interface HomePreparationSummary {
  tierName: string;
  storageSlots: number;
  storageWeightLimit: number;
  stationTypes: StationType[];
  hasRestPoint: boolean;
  hasRecallAnchor: boolean;
  gardenCount: number;
  trophyCount: number;
  lightingCount: number;
  stationBonusPercent: number;
  reasons: string[];
}

export function getOwnedHousingPlot(state: GameState): HousingPlotState | null {
  const plotId = state.world.housing.ownedPlotId;
  return plotId ? state.world.housing.plots[plotId] ?? null : null;
}

export function getStarterHousingPlot(state: GameState): HousingPlotState {
  return state.world.housing.plots[starterPlotId];
}

export function claimStarterPlot(state: GameState): boolean {
  const plot = getStarterHousingPlot(state);
  if (plot.ownerId === state.player.id) {
    state.world.housing.ownedPlotId = plot.id;
    return false;
  }
  if (plot.ownerId && plot.ownerId !== state.player.id) {
    state.ui.prompt = 'That plot already belongs to someone else.';
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  plot.ownerId = state.player.id;
  plot.claimedAt = state.clock;
  plot.name ||= `${state.player.name}'s Camp`;
  state.world.housing.ownedPlotId = plot.id;
  state.ui.prompt = `${plot.name} claimed. Build inside the marked boundary.`;
  addSystemMessage(state, state.ui.prompt);
  return true;
}

export function canBuildOnOwnedPlot(state: GameState): { ok: boolean; message: string; plot: HousingPlotState | null } {
  const plot = getOwnedHousingPlot(state);
  if (!plot || plot.ownerId !== state.player.id) return { ok: false, message: 'Claim the starter plot before placing objects.', plot };
  if (!plot.permissions.ownerCanBuild) return { ok: false, message: 'You do not have build permission on this plot.', plot };
  return { ok: true, message: 'Build permission confirmed.', plot };
}

export function currentHousingTier(state: GameState): (typeof housingTierDefinitions)[number] {
  const tier = getOwnedHousingPlot(state)?.tier ?? 0;
  return housingTierDefinitions.find((definition) => definition.tier === tier) ?? housingTierDefinitions[0];
}

export function nextHousingTier(state: GameState): (typeof housingTierDefinitions)[number] | null {
  const current = currentHousingTier(state).tier;
  return housingTierDefinitions.find((definition) => definition.tier === current + 1) ?? null;
}

export function canUpgradeHousing(state: GameState): { ok: boolean; message: string; next: ReturnType<typeof nextHousingTier> } {
  const plot = getOwnedHousingPlot(state);
  if (!plot) return { ok: false, message: 'Claim the starter plot first.', next: null };
  const next = nextHousingTier(state);
  if (!next) return { ok: false, message: 'This is the highest planned tier for now.', next };
  if (state.player.gold < next.requirements.gold) return { ok: false, message: `Upgrade needs ${next.requirements.gold} gold.`, next };
  if (!hasRequirementItems(state, next.requirements.items)) return { ok: false, message: `Upgrade needs ${formatRequirements(next.requirements.items)}.`, next };
  if (next.requirements.completedQuestId && !state.player.completedQuestIds.includes(next.requirements.completedQuestId)) {
    return { ok: false, message: `Upgrade requires quest milestone: ${next.requirements.completedQuestId}.`, next };
  }
  if ((next.requirements.completedWorkOrders ?? 0) > completedWorkOrderCount(state)) {
    return { ok: false, message: `Upgrade requires ${next.requirements.completedWorkOrders} completed work order.`, next };
  }
  return { ok: true, message: `Ready to upgrade to ${next.name}.`, next };
}

export function upgradeHousingTier(state: GameState): boolean {
  const result = canUpgradeHousing(state);
  if (!result.ok || !result.next) {
    state.ui.prompt = result.message;
    addSystemMessage(state, result.message);
    return false;
  }
  const plot = getOwnedHousingPlot(state);
  if (!plot) return false;
  result.next.requirements.items.forEach((cost) => removeItems(state.player.inventory, cost.itemId, cost.quantity));
  state.player.gold -= result.next.requirements.gold;
  plot.tier = result.next.tier;
  state.ui.prompt = `${plot.name} upgraded to ${result.next.name}.`;
  addSystemMessage(state, state.ui.prompt);
  return true;
}

export function createStorageForBuilding(state: GameState, building: BuildingEntity): HousingStorageState | null {
  const definition = getHousingPieceDefinition(building.pieceId).storage;
  if (!definition) return null;
  const storageId = building.storageId ?? `storage_${building.id}`;
  building.storageId = storageId;
  const existing = state.world.housing.storages[storageId];
  if (existing) return existing;
  const storage: HousingStorageState = {
    id: storageId,
    buildingId: building.id,
    name: building.name,
    inventory: createInventory(definition.slots),
    acceptedItemTypes: definition.acceptedItemTypes,
    acceptedItemIds: definition.acceptedItemIds,
    maxWeight: definition.maxWeight,
    upgradeLevel: 0
  };
  state.world.housing.storages[storage.id] = storage;
  state.ui.selectedHousingStorageId = storage.id;
  return storage;
}

export function registerHousingBuilding(state: GameState, building: BuildingEntity): void {
  const plot = getOwnedHousingPlot(state);
  const definition = getHousingPieceDefinition(building.pieceId);
  building.plotId = plot?.id ?? starterPlotId;
  building.ownerId = state.player.id;
  building.functionType = definition.functionType;
  building.placedAt = state.clock;
  if (plot) plot.lastPlacementId = building.id;
  if (definition.storage) createStorageForBuilding(state, building);
  if (definition.utility === 'home_anchor' && plot) {
    plot.homeAnchor = { ...building.position };
    state.world.recallMark = { area: 'housing', position: { ...building.position }, markedAt: state.clock };
  }
  if (definition.garden) {
    state.world.housing.gardens[building.id] = {
      buildingId: building.id,
      yieldItemId: definition.garden.yieldItemId,
      quantity: definition.garden.quantity,
      readyAt: state.clock + definition.garden.cooldown,
      cooldown: definition.garden.cooldown
    };
  }
}

export function hasHomeCraftStation(state: GameState, stationType: StationType): boolean {
  if (state.player.currentArea !== 'housing') return true;
  return state.world.placedBuildings.some((building) => {
    if (building.area !== 'housing') return false;
    const definition = getHousingPieceDefinition(building.pieceId);
    return definition.stationTypes?.includes(stationType);
  });
}

export function homeCraftStations(state: GameState): StationType[] {
  const stations = new Set<StationType>();
  state.world.placedBuildings.forEach((building) => {
    if (building.area !== 'housing') return;
    getHousingPieceDefinition(building.pieceId).stationTypes?.forEach((station) => stations.add(station));
  });
  return Array.from(stations);
}

export function homePreparationSummary(state: GameState): HomePreparationSummary {
  const tier = currentHousingTier(state);
  const storages = housingStorages(state);
  const stationTypes = homeCraftStations(state);
  const placed = state.world.placedBuildings.filter((building) => building.area === 'housing');
  const definitions = placed.map((building) => getHousingPieceDefinition(building.pieceId));
  const hasRestPoint = definitions.some((definition) => definition.utility === 'rest');
  const plot = getOwnedHousingPlot(state);
  const hasRecallAnchor = Boolean(plot?.homeAnchor) || definitions.some((definition) => definition.utility === 'home_anchor');
  const gardenCount = definitions.filter((definition) => definition.functionType === 'garden').length;
  const trophyCount = definitions.filter((definition) => definition.functionType === 'trophy').length;
  const lightingCount = placed.filter((building) => ['torch', 'lamp_post_home', 'lantern_chandelier_home', 'campfire_home'].includes(building.pieceId)).length;
  const storageSlots = storages.reduce((sum, storage) => sum + storage.inventory.capacity, 0);
  const storageWeightLimit = storages.reduce((sum, storage) => sum + storage.maxWeight, 0);
  const stagingPieceCount = placed.filter((building) => ['resource_crate', 'reagent_shelf', 'weapon_rack', 'tool_rack_home', 'armor_stand'].includes(building.pieceId)).length;
  const stationBonusPercent = Math.min(8, (stationTypes.length ? 2 : 0) + Math.min(3, stagingPieceCount) + (lightingCount ? 1 : 0) + (trophyCount ? 1 : 0));
  const reasons: string[] = [];
  if (hasRestPoint) reasons.push('Rest before next trip');
  if (stationTypes.length) reasons.push('Craft and repair at home');
  if (storageSlots > 0 || stagingPieceCount > 0) reasons.push('Stage resources and tools');
  if (gardenCount) reasons.push('Harvest modest garden supplies');
  if (hasRecallAnchor) reasons.push('Recall to home anchor');
  if (trophyCount) reasons.push('Display trophies');
  if (lightingCount) reasons.push('Keep the workshop lit');
  return {
    tierName: tier.name,
    storageSlots,
    storageWeightLimit,
    stationTypes,
    hasRestPoint,
    hasRecallAnchor,
    gardenCount,
    trophyCount,
    lightingCount,
    stationBonusPercent,
    reasons
  };
}

export function homeCraftDurationMultiplier(state: GameState, stationType: StationType): number {
  if (state.player.currentArea !== 'housing') return 1;
  if (!homeCraftStations(state).includes(stationType)) return 1;
  const bonus = homePreparationSummary(state).stationBonusPercent;
  return Math.max(0.92, Number((1 - bonus / 100).toFixed(2)));
}

export function housingStorages(state: GameState): HousingStorageState[] {
  const storageIds = new Set(state.world.placedBuildings.map((building) => building.storageId).filter(Boolean) as string[]);
  return Object.values(state.world.housing.storages).filter((storage) => storageIds.has(storage.id));
}

export function selectedHousingStorage(state: GameState): HousingStorageState | null {
  const storages = housingStorages(state);
  const selected = state.ui.selectedHousingStorageId ? state.world.housing.storages[state.ui.selectedHousingStorageId] : null;
  return selected && storages.some((storage) => storage.id === selected.id) ? selected : storages[0] ?? null;
}

export function selectHousingStorage(state: GameState, storageId: string): void {
  if (!state.world.housing.storages[storageId]) return;
  state.ui.selectedHousingStorageId = storageId;
}

export function depositSelectedToHousingStorage(state: GameState, slot: number, storageId = state.ui.selectedHousingStorageId ?? selectedHousingStorage(state)?.id): boolean {
  const storage = storageId ? state.world.housing.storages[storageId] : null;
  const stack = state.player.inventory.slots[slot];
  if (!storage || !stack) return false;
  const result = canMoveStackToStorage(storage, stack);
  if (!result.ok) {
    state.ui.prompt = result.message;
    addSystemMessage(state, result.message);
    return false;
  }
  moveStackIntoInventory(state.player.inventory.slots, slot, storage.inventory);
  state.ui.selectedInventorySlot = null;
  state.ui.prompt = `Stored ${itemDefs[stack.itemId]?.name ?? stack.itemId} in ${storage.name}.`;
  addSystemMessage(state, state.ui.prompt);
  return true;
}

export function withdrawFromHousingStorage(state: GameState, storageId: string, slot: number): boolean {
  const storage = state.world.housing.storages[storageId];
  const stack = storage?.inventory.slots[slot];
  if (!storage || !stack) return false;
  if (!canMoveStackIntoInventory(stack, state.player.inventory)) {
    state.ui.prompt = 'Your pack has no room for that item.';
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  moveStackIntoInventory(storage.inventory.slots, slot, state.player.inventory);
  state.ui.prompt = `Withdrew ${itemDefs[stack.itemId]?.name ?? stack.itemId} from ${storage.name}.`;
  addSystemMessage(state, state.ui.prompt);
  return true;
}

export function upgradeHousingStorage(state: GameState, storageId: string): boolean {
  const storage = state.world.housing.storages[storageId];
  if (!storage) return false;
  if (storage.upgradeLevel >= 2) {
    state.ui.prompt = 'That storage is already fully reinforced.';
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  const cost: RecipeRequirement[] = [
    { itemId: 'boards', quantity: 4 + storage.upgradeLevel * 2 },
    { itemId: 'iron_bar', quantity: 1 + storage.upgradeLevel }
  ];
  if (!hasRequirementItems(state, cost)) {
    state.ui.prompt = `Storage upgrade needs ${formatRequirements(cost)}.`;
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  cost.forEach((requirement) => removeItems(state.player.inventory, requirement.itemId, requirement.quantity));
  storage.upgradeLevel += 1;
  storage.maxWeight = Math.round(storage.maxWeight * 1.35);
  storage.inventory.capacity += 4;
  while (storage.inventory.slots.length < storage.inventory.capacity) storage.inventory.slots.push(null);
  state.ui.prompt = `${storage.name} reinforced: ${storage.inventory.capacity} slots, ${storage.maxWeight} weight.`;
  addSystemMessage(state, state.ui.prompt);
  return true;
}

export function canUndoHousingPlacement(state: GameState, building: BuildingEntity): { ok: boolean; message: string } {
  const storage = building.storageId ? state.world.housing.storages[building.storageId] : null;
  if (storage && storage.inventory.slots.some(Boolean)) return { ok: false, message: 'Empty that storage before undoing or moving it.' };
  const pieceCost = pieceRefundCost(building.pieceId);
  if (pieceCost.length && !canAddRequirements(state, pieceCost)) return { ok: false, message: 'Make room in your pack before refunding the materials.' };
  return { ok: true, message: 'Safe to undo.' };
}

export function undoLastHousingPlacement(state: GameState): boolean {
  const plot = getOwnedHousingPlot(state);
  const lastId = plot?.lastPlacementId ?? state.world.placedBuildings.at(-1)?.id;
  const building = lastId ? state.world.placedBuildings.find((candidate) => candidate.id === lastId) : null;
  if (!building) {
    state.ui.prompt = 'There is no recent placement to undo.';
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  const check = canUndoHousingPlacement(state, building);
  if (!check.ok) {
    state.ui.prompt = check.message;
    addSystemMessage(state, check.message);
    return false;
  }
  state.world.placedBuildings = state.world.placedBuildings.filter((candidate) => candidate.id !== building.id);
  delete state.entities[building.id];
  if (building.storageId) delete state.world.housing.storages[building.storageId];
  delete state.world.housing.gardens[building.id];
  pieceRefundCost(building.pieceId).forEach((refund) => addItem(state.player.inventory, refund.itemId, refund.quantity));
  if (plot) plot.lastPlacementId = state.world.placedBuildings.at(-1)?.id ?? null;
  state.ui.prompt = `Undid ${building.name}. Materials returned.`;
  addSystemMessage(state, state.ui.prompt);
  return true;
}

export function restAtHome(state: GameState): boolean {
  const hasBedroll = state.world.placedBuildings.some((building) => building.pieceId === 'bedroll_home' && building.area === 'housing');
  if (state.player.currentArea !== 'housing' || !hasBedroll) {
    state.ui.prompt = 'Place a bedroll on your plot before resting at home.';
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  if (state.clock - state.world.housing.lastRestedAt < 45) {
    state.ui.prompt = 'You recently rested. Give the bedroll a little time.';
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  const stats = calculateDerivedStats(state);
  state.player.health = Math.min(stats.maxHealth, state.player.health + stats.maxHealth * 0.35);
  state.player.mana = Math.min(stats.maxMana, state.player.mana + stats.maxMana * 0.35);
  state.player.stamina = Math.min(stats.maxStamina, state.player.stamina + stats.maxStamina * 0.55);
  state.world.housing.lastRestedAt = state.clock;
  state.ui.prompt = 'You rest at home and recover before the next run.';
  addSystemMessage(state, state.ui.prompt);
  return true;
}

export function harvestHousingGarden(state: GameState, buildingId: string): boolean {
  const garden = state.world.housing.gardens[buildingId];
  if (!garden) return false;
  if (state.clock < garden.readyAt) {
    state.ui.prompt = `Garden yield ready in ${Math.ceil(garden.readyAt - state.clock)}s.`;
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  if (!addItem(state.player.inventory, garden.yieldItemId, garden.quantity)) {
    state.ui.prompt = 'Your pack has no room for the garden yield.';
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  garden.readyAt = state.clock + garden.cooldown;
  state.ui.prompt = `Harvested ${itemDefs[garden.yieldItemId]?.name ?? garden.yieldItemId} x${garden.quantity}.`;
  addSystemMessage(state, state.ui.prompt);
  return true;
}

export function storageWeight(storage: HousingStorageState): number {
  return Math.round(storage.inventory.slots.reduce((sum, stack) => sum + stackWeight(stack), 0) * 10) / 10;
}

function completedWorkOrderCount(state: GameState): number {
  return state.world.economy.workOrders.filter((order) => order.status === 'complete').length;
}

function hasRequirementItems(state: GameState, requirements: RecipeRequirement[]): boolean {
  return requirements.every((requirement) => getItemCount(state.player.inventory, requirement.itemId) >= requirement.quantity);
}

function formatRequirements(requirements: RecipeRequirement[]): string {
  return requirements.map((requirement) => `${requirement.quantity} ${itemDefs[requirement.itemId]?.name ?? requirement.itemId}`).join(', ');
}

function canMoveStackToStorage(storage: HousingStorageState, stack: ItemStack): { ok: boolean; message: string } {
  if (!storageAcceptsStack(storage, stack)) return { ok: false, message: `${storage.name} does not accept ${itemDefs[stack.itemId]?.name ?? stack.itemId}.` };
  if (storageWeight(storage) + stackWeight(stack) > storage.maxWeight) return { ok: false, message: `${storage.name} is too heavy for that stack.` };
  if (!canMoveStackIntoInventory(stack, storage.inventory)) return { ok: false, message: `${storage.name} has no room.` };
  return { ok: true, message: 'Can store.' };
}

function storageAcceptsStack(storage: HousingStorageState, stack: ItemStack): boolean {
  if (storage.acceptedItemIds?.length) return storage.acceptedItemIds.includes(stack.itemId);
  if (storage.acceptedItemTypes?.length) {
    const type = itemDefs[stack.itemId]?.type;
    return Boolean(type && storage.acceptedItemTypes.includes(type));
  }
  return true;
}

function canMoveStackIntoInventory(stack: ItemStack, inventory: { slots: Array<ItemStack | null>; capacity: number }): boolean {
  const def = itemDefs[stack.itemId];
  if (!def) return false;
  if (!def.stackable) return inventory.slots.some((slot) => !slot);
  let remaining = stack.quantity;
  for (const target of inventory.slots) {
    if (!target || target.itemId !== stack.itemId) continue;
    remaining -= Math.max(0, def.maxStack - target.quantity);
    if (remaining <= 0) return true;
  }
  const emptySlots = inventory.slots.filter((slot) => !slot).length;
  return emptySlots * def.maxStack >= remaining;
}

function moveStackIntoInventory(fromSlots: Array<ItemStack | null>, fromSlot: number, targetInventory: { slots: Array<ItemStack | null>; capacity: number }): void {
  const stack = fromSlots[fromSlot];
  if (!stack) return;
  const def = itemDefs[stack.itemId];
  if (def?.stackable) {
    let remaining = stack.quantity;
    for (const target of targetInventory.slots) {
      if (!target || target.itemId !== stack.itemId || remaining <= 0) continue;
      const moved = Math.min(remaining, def.maxStack - target.quantity);
      target.quantity += moved;
      remaining -= moved;
    }
    if (remaining <= 0) {
      fromSlots[fromSlot] = null;
      return;
    }
    stack.quantity = remaining;
  }
  const empty = targetInventory.slots.findIndex((slot) => !slot);
  if (empty >= 0) {
    targetInventory.slots[empty] = stack;
    fromSlots[fromSlot] = null;
  }
}

function pieceRefundCost(pieceId: string): RecipeRequirement[] {
  return buildPieces.find((piece) => piece.id === pieceId)?.cost ?? [];
}

function canAddRequirements(state: GameState, requirements: RecipeRequirement[]): boolean {
  const simulated = {
    capacity: state.player.inventory.capacity,
    slots: state.player.inventory.slots.map((slot) => (slot ? { ...slot } : null))
  };
  return requirements.every((requirement) => addItem(simulated, requirement.itemId, requirement.quantity));
}

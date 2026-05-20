import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { addItem, getItemCount } from './InventorySystem';
import { meleeAttack } from './CombatSystem';
import { applyEconomyEventDemand, calculateLocalPrice, repairEquippedItem, completeWorkOrder, fulfillMarketOrder } from './EconomySystem';
import { startCraft, updateCrafting } from './CraftingSystem';
import { gatherResource, updateGathering } from './InteractionSystem';
import { MarketBoardPanel } from '../ui/MarketBoardPanel';
import { JournalPanel } from '../ui/JournalPanel';
import type { EconomyOrderCategory } from '../game/types';

describe('modern economy and item sinks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('degrades weapons and blocks broken gear use', () => {
    const state = createInitialGameState();
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99)
      .mockReturnValue(0);
    state.player.currentArea = 'road';
    state.player.position = { x: 1.2, y: 0, z: -2 };
    state.player.activeTargetId = 'enemy_bandit_1';
    const weapon = state.player.equipment.weapon;
    const enemy = state.entities.enemy_bandit_1;
    if (!weapon || !enemy || enemy.kind !== 'enemy') throw new Error('setup failed');
    weapon.durability = 1;
    enemy.position = { x: 2, y: 0, z: -2 };
    const healthAfterSetup = enemy.health;

    meleeAttack(state, enemy.id);
    expect(weapon.durability).toBe(0);
    expect(enemy.health).toBeLessThan(healthAfterSetup);

    const healthAfterBreak = enemy.health;
    meleeAttack(state, enemy.id);
    expect(enemy.health).toBe(healthAfterBreak);
    expect(state.ui.prompt).toContain('broken');
  });

  it('repairs equipped gear by consuming profession materials', () => {
    const state = createInitialGameState();
    const weapon = state.player.equipment.weapon;
    if (!weapon) throw new Error('weapon missing');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    state.player.skills.Blacksmithing.value = 80;
    state.player.skills.Blacksmithing.realValue = 80;
    weapon.durability = 10;
    addItem(state.player.inventory, 'iron_bar', 4);
    const barsBefore = getItemCount(state.player.inventory, 'iron_bar');

    repairEquippedItem(state, 'weapon');

    expect(weapon.durability).toBe(weapon.maxDurability);
    expect(getItemCount(state.player.inventory, 'iron_bar')).toBeLessThan(barsBefore);
    expect(state.chat.some((message) => message.text.includes('repaired'))).toBe(true);
  });

  it('ships work orders and market orders as solo economy loops', () => {
    const state = createInitialGameState();
    expect(state.world.economy.workOrders.length).toBeGreaterThanOrEqual(10);
    expect(state.world.economy.marketOrders.length).toBeGreaterThan(0);

    const order = state.world.economy.workOrders.find((candidate) => candidate.itemId === 'bandage');
    if (!order) throw new Error('bandage order missing');
    addItem(state.player.inventory, 'bandage', order.quantity);
    const goldBefore = state.player.gold;
    completeWorkOrder(state, order.id);

    expect(order.status).toBe('complete');
    expect(state.player.gold).toBeGreaterThan(goldBefore);
    expect(state.world.economy.transactionLog.at(-1)?.kind).toBe('work_order');

    const marketOrder = state.world.economy.marketOrders.find((candidate) => candidate.kind === 'buy' && candidate.itemId === 'logs');
    if (!marketOrder) throw new Error('logs buy order missing');
    addItem(state.player.inventory, 'logs', marketOrder.quantity);
    const marketGoldBefore = state.player.gold;
    fulfillMarketOrder(state, marketOrder.id);

    expect(marketOrder.status).toBe('filled');
    expect(state.player.gold).toBeGreaterThan(marketGoldBefore);
    expect(state.world.economy.transactionLog.at(-1)?.kind).toBe('market');
  });

  it('guarantees one first-hour work order after the first tree harvest', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const state = createInitialGameState();
    const tree = state.entities.res_tree_1;
    if (!tree || tree.kind !== 'resource') throw new Error('starter tree missing');
    state.player.currentArea = tree.area;
    state.player.position = { ...tree.position };
    gatherResource(state, tree.id);
    updateGathering(state, 10);

    const order = state.world.economy.workOrders.find((candidate) => candidate.id === 'wo_mira_road_logs');
    expect(order).toBeDefined();
    expect(order?.difficultyTier).toBe(0);
    expect(order?.requiredItems).toEqual([{ itemId: 'logs', quantity: 6 }]);
    expect(order?.rewardGold).toBeLessThanOrEqual(70);

    const logsBefore = getItemCount(state.player.inventory, 'logs');
    const goldBefore = state.player.gold;
    state.player.currentArea = 'town';

    expect(completeWorkOrder(state, order!.id)).toBe(true);
    expect(getItemCount(state.player.inventory, 'logs')).toBe(logsBefore - 6);
    expect(state.player.gold).toBeGreaterThan(goldBefore);
    expect(state.world.economy.transactionLog.at(-1)?.kind).toBe('work_order');
  });

  it('ships at least five fulfillable work orders that remove resources from the economy', () => {
    const fulfillableOrderIds = ['wo_sela_bandages', 'wo_guard_arrows', 'wo_corrin_boards', 'wo_builder_stone', 'wo_explorer_maps'];

    for (const orderId of fulfillableOrderIds) {
      const state = createInitialGameState();
      const order = state.world.economy.workOrders.find((candidate) => candidate.id === orderId);
      if (!order?.requiredItems) throw new Error(`${orderId} missing`);
      const beforeCounts = new Map(order.requiredItems.map((requirement) => [requirement.itemId, getItemCount(state.player.inventory, requirement.itemId)]));
      order.requiredItems.forEach((requirement) => addItem(state.player.inventory, requirement.itemId, requirement.quantity));

      expect(completeWorkOrder(state, order.id)).toBe(true);
      expect(order.status).toBe('complete');
      for (const requirement of order.requiredItems) {
        expect(getItemCount(state.player.inventory, requirement.itemId)).toBe(beforeCounts.get(requirement.itemId));
        expect(state.dev.telemetry.resourceOutflow[requirement.itemId]).toBe(requirement.quantity);
      }
    }
  });

  it('keeps work order fulfillment atomic when requirements are incomplete', () => {
    const state = createInitialGameState();
    const order = state.world.economy.workOrders.find((candidate) => candidate.id === 'wo_orren_reagents');
    if (!order?.requiredItems) throw new Error('reagent order missing');
    addItem(state.player.inventory, 'sulfurous_ash', 10);
    const ashBefore = getItemCount(state.player.inventory, 'sulfurous_ash');
    const goldBefore = state.player.gold;

    expect(completeWorkOrder(state, order.id)).toBe(false);
    expect(order.status).toBe('open');
    expect(state.player.gold).toBe(goldBefore);
    expect(getItemCount(state.player.inventory, 'sulfurous_ash')).toBe(ashBefore);
    expect(state.dev.telemetry.workOrdersCompleted).toBe(0);
    expect(state.world.economy.transactionLog).toHaveLength(0);
  });

  it('uses sell market orders as solo gold sinks', () => {
    const state = createInitialGameState();
    const sellOrder = state.world.economy.marketOrders.find((candidate) => candidate.kind === 'sell' && candidate.itemId === 'health_potion');
    if (!sellOrder) throw new Error('health potion sell order missing');
    const goldBefore = state.player.gold;
    const potionsBefore = getItemCount(state.player.inventory, 'health_potion');

    expect(fulfillMarketOrder(state, sellOrder.id)).toBe(true);
    expect(sellOrder.status).toBe('filled');
    expect(state.player.gold).toBeLessThan(goldBefore);
    expect(getItemCount(state.player.inventory, 'health_potion')).toBe(potionsBefore + sellOrder.quantity);
    expect(state.world.economy.transactionLog.at(-1)?.gold).toBeLessThan(0);
  });

  it('degrades gathering tools so resource loops create repair demand', () => {
    const state = createInitialGameState();
    const tree = Object.values(state.entities).find((entity) => entity.kind === 'resource' && entity.toolItemId === 'axe');
    if (!tree || tree.kind !== 'resource') throw new Error('tree missing');
    const axe = state.player.inventory.slots.find((stack) => stack?.itemId === 'axe');
    if (!axe?.maxDurability) throw new Error('axe missing durability');
    const durabilityBefore = axe.durability ?? axe.maxDurability;
    state.player.currentArea = tree.area;
    state.player.position = { ...tree.position, x: tree.position.x - 1 };

    gatherResource(state, tree.id);
    updateGathering(state, 20);

    expect(axe.durability).toBe(durabilityBefore - 1);
  });

  it('uses rich local orders, atomic rewards, and price modifiers', () => {
    const state = createInitialGameState();
    const richOrders = state.world.economy.workOrders.filter((order) => order.requiredItems?.length && order.title && order.category);
    expect(richOrders.length).toBeGreaterThanOrEqual(10);
    expect(state.world.economy.workOrders.some((order) => order.id === 'wo_ysolda_herbs')).toBe(true);
    expect(state.world.economy.marketOrders.some((order) => order.source === 'simulated_player')).toBe(true);

    const order = state.world.economy.workOrders.find((candidate) => candidate.id === 'wo_sela_bandages');
    if (!order) throw new Error('healer order missing');
    addItem(state.player.inventory, 'bandage', order.quantity);
    const potionsBefore = getItemCount(state.player.inventory, 'health_potion');
    expect(completeWorkOrder(state, order.id)).toBe(true);
    expect(getItemCount(state.player.inventory, 'health_potion')).toBe(potionsBefore + 1);
    expect(state.dev.telemetry.workOrdersCompleted).toBe(1);
    expect(state.dev.telemetry.resourceOutflow.bandage).toBe(order.quantity);

    const normal = calculateLocalPrice(state, 'iron_sword', { quality: 'normal', condition: 1 });
    const exceptional = calculateLocalPrice(state, 'iron_sword', { quality: 'exceptional', condition: 1 });
    const damaged = calculateLocalPrice(state, 'iron_sword', { quality: 'normal', condition: 0.55 });
    expect(exceptional).toBeGreaterThan(normal);
    expect(damaged).toBeLessThan(normal);
  });

  it('creates crafted item instances with material, quality, crafter and exceptional metadata', () => {
    const state = createInitialGameState();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    state.player.skills.Blacksmithing.value = 95;
    state.player.skills.Blacksmithing.realValue = 95;
    state.player.inventory.slots[0] = null;
    addItem(state.player.inventory, 'iron_bar', 20);
    addItem(state.player.inventory, 'leather', 4);

    startCraft(state, 'iron_sword', 1);
    updateCrafting(state, 20);

    const crafted = state.player.inventory.slots.find((stack) => stack?.itemId === 'iron_sword' && stack.makerName === state.player.name);
    expect(crafted).toMatchObject({
      itemId: 'iron_sword',
      materialType: 'iron',
      quality: 'exceptional',
      makerName: state.player.name,
      exceptional: true
    });
    expect(crafted?.maxDurability).toBeGreaterThan(75);
  });

  it('covers local service categories and reward types without raw gold inflation', () => {
    const state = createInitialGameState();
    const requiredCategories: EconomyOrderCategory[] = ['smithy', 'healer', 'mage', 'guard', 'carpenter', 'tavern', 'banker'];
    const categories = new Set(state.world.economy.workOrders.map((order) => order.category));

    for (const category of requiredCategories) {
      expect(categories.has(category)).toBe(true);
    }

    expect(state.world.economy.workOrders.some((order) => order.rewardRecipeIds?.length)).toBe(true);
    expect(state.world.economy.workOrders.some((order) => order.rewardVoucherItems?.length)).toBe(true);
    expect(state.world.economy.workOrders.some((order) => order.rewardDiscount)).toBe(true);
    expect(Math.max(...state.world.economy.workOrders.map((order) => order.rewardGold))).toBeLessThanOrEqual(190);
  });

  it('applies local demand cycles from world events to board prices and demand signals', () => {
    const state = createInitialGameState();
    const arrowBefore = state.world.economy.localDemand.arrow ?? 1;
    const reagentBefore = state.world.economy.localDemand.sulfurous_ash ?? 1;
    const torchBefore = state.world.economy.localDemand.torch ?? 1;

    applyEconomyEventDemand(state, 'bandit_ambush');
    applyEconomyEventDemand(state, 'crypt_spill');
    applyEconomyEventDemand(state, 'storm');
    applyEconomyEventDemand(state, 'merchant_caravan');
    applyEconomyEventDemand(state, 'market_day');

    expect(state.world.economy.localDemand.arrow).toBeGreaterThan(arrowBefore);
    expect(state.world.economy.localDemand.sulfurous_ash).toBeGreaterThan(reagentBefore);
    expect(state.world.economy.localDemand.torch).toBeGreaterThan(torchBefore);
    expect(state.world.economy.demandSignals.map((signal) => signal.eventType)).toEqual(expect.arrayContaining(['bandit_ambush', 'crypt_spill', 'storm', 'merchant_caravan', 'market_day']));

    const arrowOrder = state.world.economy.marketOrders.find((order) => order.itemId === 'arrow' || order.itemId === 'torch');
    if (!arrowOrder) throw new Error('combat market order missing');
    const priceBefore = arrowOrder.unitPrice;
    state.clock += 1;
    applyEconomyEventDemand(state, 'bandit_ambush');
    expect(arrowOrder.unitPrice).toBeGreaterThanOrEqual(priceBefore);
  });

  it('fulfills work orders and market buy orders from bank only when the board is nearby', () => {
    const state = createInitialGameState();
    const order = state.world.economy.workOrders.find((candidate) => candidate.id === 'wo_guard_arrows');
    if (!order?.requiredItems) throw new Error('guard order missing');
    state.player.currentArea = 'forest';
    addItem(state.player.bank, 'arrow', order.quantity);

    expect(completeWorkOrder(state, order.id)).toBe(false);
    expect(order.status).toBe('open');
    expect(getItemCount(state.player.bank, 'arrow')).toBe(order.quantity);

    state.player.currentArea = 'bank';
    expect(completeWorkOrder(state, order.id)).toBe(true);
    expect(order.status).toBe('complete');
    expect(getItemCount(state.player.bank, 'arrow')).toBe(0);

    const marketOrder = state.world.economy.marketOrders.find((candidate) => candidate.kind === 'buy' && candidate.itemId === 'logs');
    if (!marketOrder) throw new Error('logs buy order missing');
    addItem(state.player.bank, 'logs', marketOrder.quantity);
    expect(fulfillMarketOrder(state, marketOrder.id)).toBe(true);
    expect(marketOrder.status).toBe('filled');
    expect(getItemCount(state.player.bank, 'logs')).toBe(0);
  });

  it('surfaces demand, rewards, bank access and work-order pinning in market and journal UI', () => {
    const state = createInitialGameState();
    state.ui.panels.market = true;
    state.ui.panels.journal = true;
    state.player.currentArea = 'bank';
    state.world.economy.demandSignals.push({
      id: 'signal_test',
      eventType: 'bandit_ambush',
      label: 'Bandit raids',
      startedAt: state.clock,
      endsAt: state.clock + 60,
      affected: ['guard', 'combat', 'arrow', 'torch']
    });
    const order = state.world.economy.workOrders.find((candidate) => candidate.id === 'wo_guard_arrows');
    if (!order) throw new Error('guard order missing');
    state.ui.pinnedWorkOrderId = order.id;

    const marketHtml = MarketBoardPanel(state);
    const journalHtml = JournalPanel(state);

    for (const label of ['Smithy', 'Healer', 'Mage', 'Guard', 'Carpenter', 'Tavern', 'Banker']) {
      expect(marketHtml).toContain(label);
    }
    expect(marketHtml).toContain('Bandit raids');
    expect(marketHtml).toContain('Reward');
    expect(marketHtml).toContain('Time');
    expect(marketHtml).toContain('Bank access');
    expect(marketHtml).toContain('data-pin-work-order');
    expect(journalHtml).toContain(order.title);
    expect(journalHtml).toContain('Pinned Work Order');
  });
});

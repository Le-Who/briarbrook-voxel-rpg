import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { addItem, getItemCount } from './InventorySystem';
import { meleeAttack } from './CombatSystem';
import { calculateLocalPrice, repairEquippedItem, completeWorkOrder, fulfillMarketOrder } from './EconomySystem';
import { startCraft, updateCrafting } from './CraftingSystem';

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

  it('uses rich local orders, atomic rewards, and price modifiers', () => {
    const state = createInitialGameState();
    const richOrders = state.world.economy.workOrders.filter((order) => order.requiredItems?.length && order.title && order.category);
    expect(richOrders.length).toBeGreaterThanOrEqual(10);
    expect(state.world.economy.marketOrders.some((order) => order.source === 'simulated_player')).toBe(true);

    const order = state.world.economy.workOrders.find((candidate) => candidate.id === 'wo_sela_bandages');
    if (!order) throw new Error('healer order missing');
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
});

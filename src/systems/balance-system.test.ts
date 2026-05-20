import { afterEach, describe, expect, it, vi } from 'vitest';
import { workOrderTemplates } from '../data/economy';
import { resourceNodeDefs } from '../data/resources';
import { createInitialGameState, createStack } from '../game/GameState';
import { DevOverlay } from '../ui/DevOverlay';
import { castSpellIntent } from './SpellSystem';
import { auditEconomyExploits, createProgressionBalanceReport } from './BalanceSystem';
import { calculateLocalPrice, degradeEquippedItem, completeWorkOrder } from './EconomySystem';
import { gatherResource, updateGathering } from './InteractionSystem';
import { addItem, getItemCount } from './InventorySystem';
import { recordCombatEngagementStart, recordCombatTimeToKill } from './TelemetrySystem';

describe('first-hour balance and economy tuning', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('direct tree gathering feeds the log-based first-hour route', () => {
    const state = createInitialGameState();
    const tree = state.entities.res_tree_1;
    if (!tree || tree.kind !== 'resource') throw new Error('tree fixture missing');
    state.player.currentArea = tree.area;
    state.player.position = { x: tree.position.x + 0.5, y: 0, z: tree.position.z };
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const logsBefore = getItemCount(state.player.inventory, 'logs');

    gatherResource(state, tree.id);
    updateGathering(state, 10);

    expect(getItemCount(state.player.inventory, 'logs')).toBeGreaterThan(logsBefore);
    expect(state.dev.telemetry.resourceYields.logs).toBeGreaterThan(0);
    expect(state.quests.prepare_for_road.objectives.find((objective) => objective.itemId === 'logs')?.progress).toBe(10);
  });

  it('surfaces first-hour balance metrics in the dev overlay', () => {
    const state = createInitialGameState();
    state.dev.overlay = true;
    state.clock = 180;
    state.dev.telemetry.skillGains.Swordsmanship = 0.4;
    state.dev.telemetry.goldEarned = 35;
    state.dev.telemetry.goldSpent = 12;
    state.dev.telemetry.damageTaken = 18;
    state.dev.telemetry.bandagesApplied = 1;
    state.dev.telemetry.combatBandagesApplied = 1;
    state.dev.telemetry.repairsCompleted = 1;

    const html = DevOverlay(state);

    expect(html).toContain('First Hour Balance');
    expect(html).toContain('Skill/min');
    expect(html).toContain('Bandages');
    expect(html).toContain('Repairs');
    expect(html).toContain('Experiment casts');
  });

  it('keeps early work orders useful without relying on inflated raw gold only', () => {
    const firstHourOrders = workOrderTemplates.filter((order) => order.difficultyTier === 1);
    const hybridRewards = firstHourOrders.filter((order) => (order.rewardItems?.length ?? 0) > 0);
    const maxRawGold = Math.max(...firstHourOrders.map((order) => order.rewardGold));

    expect(hybridRewards.length).toBeGreaterThanOrEqual(4);
    expect(maxRawGold).toBeLessThanOrEqual(150);
  });

  it('keeps vendor round trips loss-making even for cheap stacked goods', () => {
    const state = createInitialGameState();
    const merchant = state.entities.npc_torren_town;
    if (!merchant || (merchant.kind !== 'npc' && merchant.kind !== 'social') || !merchant.tradeInventory) throw new Error('merchant fixture missing');
    const stack = merchant.tradeInventory.slots.find((candidate) => candidate?.itemId === 'kindling');
    if (!stack) throw new Error('cheap vendor stack fixture missing');

    const buyPrice = calculateLocalPrice(state, stack.itemId, { quantity: stack.quantity, stack, mode: 'vendor_buy', vendorId: merchant.id });
    const sellPrice = calculateLocalPrice(state, stack.itemId, { quantity: stack.quantity, stack, mode: 'vendor_sell', vendorId: merchant.id });

    expect(sellPrice).toBeLessThan(buyPrice);
  });

  it('gives first-hour gathering tools durable but finite wear budgets', () => {
    expect(createStack('axe').maxDurability).toBeGreaterThanOrEqual(60);
    expect(createStack('pickaxe').maxDurability).toBeGreaterThanOrEqual(65);
  });

  it('keeps resource respawns fast enough for onboarding without enabling tight loops', () => {
    const fastestRespawn = Math.min(...Object.values(resourceNodeDefs).map((node) => node.respawnSeconds));

    expect(fastestRespawn).toBeGreaterThanOrEqual(18);
  });

  it('measures prompt-required progression and economy rates for the first hour', () => {
    const state = createInitialGameState();
    state.dev.telemetry.startedAt = 0;
    state.clock = 3600;
    state.dev.telemetry.goldEarned = 180;
    state.dev.telemetry.goldSpent = 45;
    state.dev.telemetry.resourceYields.logs = 36;
    state.dev.telemetry.resourceYields.iron_ore = 18;
    state.dev.telemetry.resourceYields.wood = 12;
    state.dev.telemetry.skillGains.Swordsmanship = 1.2;
    state.dev.telemetry.skillGains.Magery = 0.8;
    state.dev.telemetry.skillGains.Lumberjacking = 1.1;
    state.dev.telemetry.itemsConsumed.sulfurous_ash = 8;
    state.dev.telemetry.itemsConsumed.ginseng = 4;
    state.dev.telemetry.potionConsumption.health_potion = 2;
    state.dev.telemetry.bandagesApplied = 3;
    state.dev.telemetry.deathCount = 1;
    state.dev.telemetry.durabilityLossByItem.iron_sword = 6;
    state.dev.telemetry.durabilityLossByItem.axe = 4;
    state.dev.telemetry.durabilityLossByItem.leather_armor = 2;
    state.dev.telemetry.workOrderCompletionSeconds.wo_corrin_boards = 900;
    state.dev.telemetry.workOrderCompletionSeconds.wo_sela_bandages = 720;
    state.dev.telemetry.combatTimeToKillSeconds.bandit_1 = 18;
    state.dev.telemetry.combatTimeToKillSeconds.skeleton_1 = 28;
    state.player.completedQuestIds.push('prepare_for_road');
    state.player.gold = 35;
    addItem(state.player.inventory, 'wood', 4);
    addItem(state.player.inventory, 'stone_block', 2);

    const report = createProgressionBalanceReport(state);

    expect(report.metrics.goldPerHour).toBe(135);
    expect(report.metrics.resourcePerHour).toBe(66);
    expect(report.metrics.skillGainPerHour).toBeCloseTo(3.1, 1);
    expect(report.metrics.durabilityLossPerHour).toBe(12);
    expect(report.metrics.reagentConsumptionPerHour).toBe(12);
    expect(report.metrics.deathRatePerHour).toBe(1);
    expect(report.metrics.healingConsumptionPerHour).toBe(5);
    expect(report.metrics.averageWorkOrderCompletionMinutes).toBeCloseTo(13.5, 1);
    expect(report.metrics.averageCombatTimeToKillSeconds).toBeCloseTo(23, 1);
    expect(report.metrics.housingTierOneMaterialMinutes).toBeLessThan(10);
    expect(report.targetChecks.find((check) => check.id === 'housing_tier_1_reachable')?.status).toBe('pass');
    expect(report.targetChecks.find((check) => check.id === 'magic_experimentation')?.status).not.toBe('fail');
  });

  it('records durability loss, work-order timing, combat time-to-kill, and reagent spend from gameplay systems', () => {
    const state = createInitialGameState();
    state.dev.telemetry.startedAt = 0;
    state.clock = 30;
    const weapon = state.player.equipment.weapon;
    if (!weapon?.maxDurability) throw new Error('starter weapon fixture missing');
    const durabilityBefore = weapon.durability ?? weapon.maxDurability;

    degradeEquippedItem(state, 'weapon', 2);

    expect((weapon.durability ?? 0)).toBe(durabilityBefore - 2);
    expect(state.dev.telemetry.durabilityLossByItem.iron_sword).toBe(2);

    const order = state.world.economy.workOrders.find((candidate) => candidate.id === 'wo_sela_bandages');
    if (!order) throw new Error('work order fixture missing');
    addItem(state.player.inventory, 'bandage', 2);
    state.clock = 900;

    expect(completeWorkOrder(state, order.id)).toBe(true);
    expect(state.dev.telemetry.workOrderCompletionSeconds[order.id]).toBe(900);

    state.clock = 5;
    recordCombatEngagementStart(state, 'bandit_ttk');
    state.clock = 19;
    recordCombatTimeToKill(state, 'bandit_ttk');
    expect(state.dev.telemetry.combatTimeToKillSeconds.bandit_ttk).toBe(14);

    castSpellIntent(state, 'heal');
    expect(state.dev.telemetry.itemsConsumed.ginseng).toBe(1);
    expect(state.dev.telemetry.itemsConsumed.garlic).toBe(1);
  });

  it('audits shipped economy loops while catching injected arbitrage exploits', () => {
    const state = createInitialGameState();
    const baseline = auditEconomyExploits(state);

    expect(baseline.criticalCount).toBe(0);

    state.world.economy.marketOrders.push(
      { id: 'exploit_sell_logs', kind: 'sell', poster: 'Bad Seller', source: 'npc', itemId: 'logs', quantity: 6, unitPrice: 2, expiresAt: 60, status: 'open' },
      { id: 'exploit_buy_logs', kind: 'buy', poster: 'Bad Buyer', source: 'npc', itemId: 'logs', quantity: 6, unitPrice: 9, expiresAt: 60, status: 'open' }
    );

    const exploited = auditEconomyExploits(state);

    expect(exploited.criticalCount).toBeGreaterThan(0);
    expect(exploited.findings.some((finding) => finding.id === 'market_arbitrage' && finding.severity === 'critical')).toBe(true);
  });
});

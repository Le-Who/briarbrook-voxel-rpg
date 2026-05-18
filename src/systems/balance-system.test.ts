import { afterEach, describe, expect, it, vi } from 'vitest';
import { workOrderTemplates } from '../data/economy';
import { createInitialGameState, createStack } from '../game/GameState';
import { DevOverlay } from '../ui/DevOverlay';
import { gatherResource, updateGathering } from './InteractionSystem';
import { getItemCount } from './InventorySystem';

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

  it('gives first-hour gathering tools durable but finite wear budgets', () => {
    expect(createStack('axe').maxDurability).toBeGreaterThanOrEqual(60);
    expect(createStack('pickaxe').maxDurability).toBeGreaterThanOrEqual(65);
  });
});

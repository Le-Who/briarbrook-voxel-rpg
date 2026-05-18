import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { Simulation } from '../game/Simulation';
import { DevOverlay } from '../ui/DevOverlay';
import { AreaManager } from '../world/AreaManager';
import { completeQuest } from './QuestSystem';
import { attemptSkillUse } from './SkillSystem';
import { transitionPlayerToArea } from './TransitionSystem';

describe('telemetry health counters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records action cancellation reasons and transition fallback counts through real systems', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'bank';
    state.player.position = { x: 0, y: 0, z: 5.5 };
    state.realtime.pendingAction = {
      action: { type: 'ATTACK_ENTITY', entityId: 'enemy_bandit_1' },
      target: { kind: 'entity', entityId: 'enemy_bandit_1' },
      range: 1.45,
      createdAt: 0,
      expiresAt: 8,
      label: 'Approaching to strike...'
    };

    transitionPlayerToArea(state, new AreaManager(), 'town', {
      portalId: 'portal_town_bank',
      requestedSpawn: { x: -8, y: 0, z: -2 },
      avoidPortalIds: ['portal_bank']
    });

    expect(state.dev.telemetry.actionCancellations['Area transition cancelled approach.']).toBe(1);
    expect(state.dev.telemetry.transitionFallbacks).toBeGreaterThan(0);
  });

  it('records UI reset usage through the simulation reducer', () => {
    const simulation = new Simulation(createInitialGameState());
    simulation.state.ui.windowLayouts.inventory = { x: 20, y: 20, width: 300, height: 300 };

    simulation.dispatch({ type: 'RESET_UI_LAYOUT' });
    simulation.update(1 / 30);

    expect(simulation.state.ui.windowLayouts).toEqual({});
    expect(simulation.state.dev.telemetry.uiResetUsage).toBe(1);
  });

  it('records skill use events even when no visible gain lands', () => {
    const state = createInitialGameState();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    attemptSkillUse(state, 'Swordsmanship', { verb: 'attack', difficulty: 24, success: true });

    expect(state.dev.telemetry.skillEvents.Swordsmanship).toBe(1);
    expect(state.dev.telemetry.skillGains.Swordsmanship ?? 0).toBe(0);
  });

  it('records first-hour path completion when the road route is turned in', () => {
    const state = createInitialGameState();
    state.clock = 420;
    state.player.activeQuestIds = ['trouble_on_road'];
    state.quests.trouble_on_road.status = 'ready';

    completeQuest(state, 'trouble_on_road');

    expect(state.dev.telemetry.firstHourPathCompletionTime).toBe(420);
  });

  it('surfaces friction telemetry in the dev overlay', () => {
    const state = createInitialGameState();
    state.dev.overlay = true;
    state.dev.telemetry.firstHourPathCompletionTime = 420;
    state.dev.telemetry.stuckRecoveryEvents = 1;
    state.dev.telemetry.transitionFallbacks = 2;
    state.dev.telemetry.tooltipRemounts = 3;
    state.dev.telemetry.uiResetUsage = 4;
    state.dev.telemetry.actionCancellations['Path blocked.'] = 5;
    state.dev.telemetry.skillEvents.Mining = 6;

    const html = DevOverlay(state);

    expect(html).toContain('Friction');
    expect(html).toContain('First-hour path');
    expect(html).toContain('Transition fallbacks');
    expect(html).toContain('UI resets');
    expect(html).toContain('Path blocked.');
    expect(html).toContain('Mining events');
  });
});

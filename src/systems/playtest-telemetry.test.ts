import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { Simulation } from '../game/Simulation';
import { invalidAction } from './ActionFeedbackSystem';
import { exportTelemetryJson, playtestTelemetrySummary, recordTooltipRemounts } from './TelemetrySystem';

describe('playtest telemetry loop', () => {
  it('records first movement, window opens, equipment surface and hotbar assignment timings', () => {
    const state = createInitialGameState();
    const simulation = new Simulation(state);
    state.clock = 2.5;

    simulation.dispatch({ type: 'MOVE_BY', dx: 1, dz: 0 });
    simulation.dispatch({ type: 'TOGGLE_PANEL', panel: 'inventory', open: true });
    simulation.dispatch({ type: 'SET_HOTBAR_SLOT', slot: 2, binding: { kind: 'spell', id: 'magic_arrow' } });
    simulation.update(1 / 30);

    expect(state.dev.telemetry.playtest.timeToFirstMovement).toBe(2.5);
    expect(state.dev.telemetry.playtest.timeToIdentifyEquippedItem).toBe(2.5);
    expect(state.dev.telemetry.playtest.timeToAssignHotbar).toBe(2.5);
    expect(state.dev.telemetry.playtest.windowsOpened.inventory).toBe(1);
  });

  it('counts invalid actions and tooltip reliance for usability triage', () => {
    const state = createInitialGameState();

    invalidAction(state, 'Too far away.', 'Move closer.', { position: state.player.position });
    recordTooltipRemounts(state, 3);

    const summary = playtestTelemetrySummary(state);

    expect(state.dev.telemetry.playtest.invalidActionCount).toBe(1);
    expect(state.dev.telemetry.playtest.tooltipRelianceCount).toBe(3);
    expect(summary).toMatchObject({ invalidActionCount: 1, tooltipRelianceCount: 3 });
  });

  it('exports playtest summary with telemetry JSON', () => {
    const state = createInitialGameState();
    state.dev.telemetry.playtest.windowsOpened.journal = 2;

    const exported = JSON.parse(exportTelemetryJson(state));

    expect(exported.playtestSummary.windowsOpened.journal).toBe(2);
    expect(exported.playtestSummary.timings).toHaveProperty('firstMovement');
  });
});

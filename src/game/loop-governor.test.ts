import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './GameState';
import { LoopGovernor } from './LoopGovernor';

describe('LoopGovernor', () => {
  it('keeps active gameplay responsive while capping repeated clean frames', () => {
    const state = createInitialGameState();
    closePanels(state);
    const governor = new LoopGovernor();

    const first = governor.decide(0, state, { pendingActions: false, documentHidden: false });
    governor.markRan('input', 0);
    governor.markRan('simulation', 0);
    governor.markRan('render', 0);
    governor.markRan('ui', 0);
    governor.markRan('minimap', 0);

    const clean = governor.decide(5, state, { pendingActions: false, documentHidden: false });

    expect(first.mode).toBe('ActiveGameplay');
    expect(first.runRender).toBe(true);
    expect(clean.runSimulation).toBe(false);
    expect(clean.runRender).toBe(false);
    expect(clean.runUi).toBe(false);
  });

  it('switches planning panels to reduced cadences and marks minimap dirty on tile changes', () => {
    const state = createInitialGameState();
    closePanels(state);
    const governor = new LoopGovernor();
    governor.decide(0, state, { pendingActions: false, documentHidden: false });

    state.ui.panels.inventory = true;
    const inventory = governor.decide(100, state, { pendingActions: false, documentHidden: false });

    expect(inventory.mode).toBe('InventoryOnly/Planning');
    expect(inventory.cadence.renderHz).toBeLessThan(60);
    expect(inventory.runUi).toBe(true);
    expect(inventory.dirtyFlags.windowLayoutDirty).toBe(true);

    governor.markRan('minimap', 100);
    state.player.position.x += 1;
    const moved = governor.decide(120, state, { pendingActions: false, documentHidden: false });

    expect(moved.minimapDirty).toBe(true);
    expect(moved.dirtyFlags.minimapDirty).toBe(true);
  });

  it('marks UI dirty when a context menu opens over a React panel', () => {
    const state = createInitialGameState();
    closePanels(state);
    const governor = new LoopGovernor();
    governor.decide(0, state, { pendingActions: false, documentHidden: false });

    state.ui.contextMenu = { target: { kind: 'inventory', owner: 'inventory', slot: 0 }, x: 100, y: 120 };
    const decision = governor.decide(50, state, { pendingActions: false, documentHidden: false });

    expect(decision.runUi).toBe(true);
    expect(decision.dirtyFlags.tooltipDirty).toBe(true);
  });

  it('treats active player movement as gameplay even with helper panels open', () => {
    const state = createInitialGameState();
    state.ui.panels.inventory = true;
    state.player.actionState.kind = 'moving';
    state.player.movement.velocity = { x: 1, z: 0 };
    const governor = new LoopGovernor();

    const decision = governor.decide(0, state, { pendingActions: false, documentHidden: false });

    expect(decision.mode).toBe('ActiveGameplay');
    expect(decision.cadence.renderHz).toBe(60);
  });

  it('allows the player to raise active render cadence without changing simulation cadence', () => {
    const state = createInitialGameState();
    closePanels(state);
    (state.ui as unknown as { frameRateCapMode: string; customFrameRateCap: number }).frameRateCapMode = '120';
    const governor = new LoopGovernor();

    const decision = governor.decide(0, state, { pendingActions: false, documentHidden: false });

    expect(decision.mode).toBe('ActiveGameplay');
    expect(decision.cadence.renderHz).toBe(120);
    expect(decision.cadence.simulationHz).toBe(60);
  });

  it('uses custom fps caps for active play while preserving reduced planning cadences', () => {
    const state = createInitialGameState();
    closePanels(state);
    (state.ui as unknown as { frameRateCapMode: string; customFrameRateCap: number }).frameRateCapMode = 'custom';
    (state.ui as unknown as { frameRateCapMode: string; customFrameRateCap: number }).customFrameRateCap = 144;
    const governor = new LoopGovernor();

    const active = governor.decide(0, state, { pendingActions: false, documentHidden: false });
    state.ui.panels.inventory = true;
    const planning = governor.decide(100, state, { pendingActions: false, documentHidden: false });

    expect(active.cadence.renderHz).toBe(144);
    expect(active.cadence.simulationHz).toBe(60);
    expect(planning.mode).toBe('InventoryOnly/Planning');
    expect(planning.cadence.renderHz).toBe(15);
  });

  it('pauses simulation work unless a queued action needs processing', () => {
    const state = createInitialGameState();
    state.paused = true;
    const governor = new LoopGovernor();

    const idlePause = governor.decide(0, state, { pendingActions: false, documentHidden: false });
    const actionPause = governor.decide(20, state, { pendingActions: true, documentHidden: false });

    expect(idlePause.mode).toBe('Paused');
    expect(idlePause.runSimulation).toBe(false);
    expect(actionPause.runSimulation).toBe(true);
  });

  it('uses the background tab cadence when the document is hidden', () => {
    const state = createInitialGameState();
    closePanels(state);
    const governor = new LoopGovernor();
    const decision = governor.decide(0, state, { pendingActions: false, documentHidden: true });

    expect(decision.mode).toBe('BackgroundTab');
    expect(decision.cadence.renderHz).toBe(1);
    expect(decision.snapshot.backgrounded).toBe(true);
  });

  it('does not redraw compact minimap on cadence-only frames', () => {
    const state = createInitialGameState();
    closePanels(state);
    state.ui.minimapMode = 'compact';
    const governor = new LoopGovernor();
    governor.decide(0, state, { pendingActions: false, documentHidden: false });
    governor.markRan('minimap', 0);

    const compact = governor.decide(400, state, { pendingActions: false, documentHidden: false });
    state.ui.minimapMode = 'standard';
    const standard = governor.decide(800, state, { pendingActions: false, documentHidden: false });

    expect(compact.minimapDirty).toBe(false);
    expect(standard.minimapDirty).toBe(true);
  });
});

function closePanels(state: ReturnType<typeof createInitialGameState>): void {
  Object.keys(state.ui.panels).forEach((panel) => {
    state.ui.panels[panel] = false;
  });
}

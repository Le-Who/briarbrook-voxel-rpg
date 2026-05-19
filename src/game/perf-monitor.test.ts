import { describe, expect, it } from 'vitest';
import { consumeRuntimePerfCounters, PerfMonitor, recordPathfindingCall, recordRaycastCall } from './PerfMonitor';

describe('PerfMonitor', () => {
  it('rolls subsystem timings and gameplay counters into a per-second snapshot', () => {
    const monitor = new PerfMonitor(1000, 0);

    monitor.beginFrame(16);
    monitor.beginFrame(20);
    monitor.recordSubsystem('simulation', 2);
    monitor.recordSubsystem('simulation', 6);
    monitor.recordSubsystem('ui', 3);
    monitor.addCounters({
      uiRenderPerSecond: 2,
      hudReplacementPerSecond: 1,
      minimapUpdatePerSecond: 2,
      tooltipSyncPerSecond: 7,
      raycastPerSecond: 4,
      pathfindingPerSecond: 1,
      activeTimers: 2,
      windowRenderCounts: {
        inventory: 2
      },
      tooltip: {
        mountCount: 1,
        unmountCount: 0,
        contentUpdateCount: 0,
        positionUpdateCount: 1,
        currentAnchorId: 'inv:0:iron_sword',
        lastHideReason: 'none',
        lastShowReason: 'show delay elapsed'
      }
    });
    monitor.markDirty({ hudChanged: true, minimapChanged: true });

    const snapshot = monitor.sample(1000);

    expect(snapshot.fps).toBe(2);
    expect(snapshot.avgFrameMs).toBe(18);
    expect(snapshot.worstFrameMs).toBe(20);
    expect(snapshot.longFramesPerSecond).toBe(1);
    expect(snapshot.subsystem.simulation.callsPerSecond).toBe(2);
    expect(snapshot.subsystem.simulation.avgMs).toBe(4);
    expect(snapshot.subsystem.simulation.overBudgetPerSecond).toBe(1);
    expect(snapshot.counters.uiRenderPerSecond).toBe(2);
    expect(snapshot.counters.tooltipSyncPerSecond).toBe(7);
    expect(snapshot.windowRenderPerSecond.inventory).toBe(2);
    expect(snapshot.tooltip.currentAnchorId).toBe('inv:0:iron_sword');
    expect(snapshot.tooltip.mountCount).toBe(1);
    expect(snapshot.dirty.hudChanged).toBe(true);
  });

  it('collects raycast and pathfinding counters without coupling callers to the monitor', () => {
    consumeRuntimePerfCounters();
    recordRaycastCall();
    recordRaycastCall(2);
    recordPathfindingCall();

    expect(consumeRuntimePerfCounters()).toEqual({ raycastCalls: 3, pathfindingCalls: 1 });
    expect(consumeRuntimePerfCounters()).toEqual({ raycastCalls: 0, pathfindingCalls: 0 });
  });
});

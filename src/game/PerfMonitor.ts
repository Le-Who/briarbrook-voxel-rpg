export type PerfSubsystemId = 'input' | 'simulation' | 'audio' | 'renderer' | 'renderStats' | 'ui';

export interface PerfSubsystemSnapshot {
  callsPerSecond: number;
  avgMs: number;
  worstMs: number;
  budgetMs: number;
  overBudgetPerSecond: number;
}

export interface PerfCounterSnapshot {
  uiRenderPerSecond: number;
  hudReplacementPerSecond: number;
  hudQueuedPerSecond: number;
  labelWritePerSecond: number;
  minimapUpdatePerSecond: number;
  tooltipSyncPerSecond: number;
  raycastPerSecond: number;
  pathfindingPerSecond: number;
  activeTimers: number;
  activeIntervals: number;
}

export interface PerfDirtySnapshot {
  hudChanged: boolean;
  labelsChanged: boolean;
  minimapChanged: boolean;
  tooltipSyncChanged: boolean;
  anyWindowChanged: boolean;
}

export interface PerfTooltipSnapshot {
  mountCount: number;
  unmountCount: number;
  contentUpdateCount: number;
  positionUpdateCount: number;
  currentAnchorId: string | null;
  lastHideReason: string;
  lastShowReason: string;
}

export interface PerfMonitorSnapshot {
  sampleWindowMs: number;
  fps: number;
  avgFrameMs: number;
  worstFrameMs: number;
  longFramesPerSecond: number;
  subsystem: Record<PerfSubsystemId, PerfSubsystemSnapshot>;
  counters: PerfCounterSnapshot;
  windowRenderPerSecond: Record<string, number>;
  dirty: PerfDirtySnapshot;
  tooltip: PerfTooltipSnapshot;
  lastSampleAt: number;
}

export interface UiPerfCounters {
  uiRenderCount: number;
  hudReplacementCount: number;
  hudQueuedCount: number;
  labelWriteCount: number;
  minimapUpdateCount: number;
  tooltipSyncCount: number;
  activeTimers: number;
  activeIntervals: number;
  dirty: PerfDirtySnapshot;
  windowRenderCounts: Record<string, number>;
  tooltip: PerfTooltipSnapshot;
}

export interface RuntimePerfCounters {
  raycastCalls: number;
  pathfindingCalls: number;
}

export interface PerfCounterDelta extends Partial<Omit<PerfCounterSnapshot, 'activeTimers' | 'activeIntervals'>> {
  activeTimers?: number;
  activeIntervals?: number;
  windowRenderCounts?: Record<string, number>;
  tooltip?: PerfTooltipSnapshot;
}

const subsystemIds: PerfSubsystemId[] = ['input', 'simulation', 'audio', 'renderer', 'renderStats', 'ui'];

const subsystemBudgets: Record<PerfSubsystemId, number> = {
  input: 1,
  simulation: 4,
  audio: 0.8,
  renderer: 8,
  renderStats: 1.5,
  ui: 4
};

const runtimeCounters: RuntimePerfCounters = {
  raycastCalls: 0,
  pathfindingCalls: 0
};

interface PerfSubsystemAccumulator {
  calls: number;
  totalMs: number;
  worstMs: number;
  overBudget: number;
}

export function createInitialPerfSnapshot(): PerfMonitorSnapshot {
  return {
    sampleWindowMs: 1000,
    fps: 0,
    avgFrameMs: 0,
    worstFrameMs: 0,
    longFramesPerSecond: 0,
    subsystem: Object.fromEntries(subsystemIds.map((id) => [id, createSubsystemSnapshot(id)])) as Record<PerfSubsystemId, PerfSubsystemSnapshot>,
    counters: {
      uiRenderPerSecond: 0,
      hudReplacementPerSecond: 0,
      hudQueuedPerSecond: 0,
      labelWritePerSecond: 0,
      minimapUpdatePerSecond: 0,
      tooltipSyncPerSecond: 0,
      raycastPerSecond: 0,
      pathfindingPerSecond: 0,
      activeTimers: 0,
      activeIntervals: 0
    },
    windowRenderPerSecond: {},
    dirty: createCleanDirtySnapshot(),
    tooltip: createEmptyTooltipSnapshot(),
    lastSampleAt: 0
  };
}

export function mergePerfSnapshot(snapshot?: Partial<PerfMonitorSnapshot>): PerfMonitorSnapshot {
  const initial = createInitialPerfSnapshot();
  if (!snapshot) return initial;
  return {
    ...initial,
    ...snapshot,
    subsystem: { ...initial.subsystem, ...(snapshot.subsystem ?? {}) },
    counters: { ...initial.counters, ...(snapshot.counters ?? {}) },
    windowRenderPerSecond: { ...(snapshot.windowRenderPerSecond ?? {}) },
    dirty: { ...initial.dirty, ...(snapshot.dirty ?? {}) },
    tooltip: { ...initial.tooltip, ...(snapshot.tooltip ?? {}) }
  };
}

export function recordRaycastCall(count = 1): void {
  runtimeCounters.raycastCalls += count;
}

export function recordPathfindingCall(count = 1): void {
  runtimeCounters.pathfindingCalls += count;
}

export function consumeRuntimePerfCounters(): RuntimePerfCounters {
  const snapshot = { ...runtimeCounters };
  runtimeCounters.raycastCalls = 0;
  runtimeCounters.pathfindingCalls = 0;
  return snapshot;
}

export function createCleanDirtySnapshot(): PerfDirtySnapshot {
  return {
    hudChanged: false,
    labelsChanged: false,
    minimapChanged: false,
    tooltipSyncChanged: false,
    anyWindowChanged: false
  };
}

export function createEmptyTooltipSnapshot(): PerfTooltipSnapshot {
  return {
    mountCount: 0,
    unmountCount: 0,
    contentUpdateCount: 0,
    positionUpdateCount: 0,
    currentAnchorId: null,
    lastHideReason: 'none',
    lastShowReason: 'none'
  };
}

export function createEmptyUiPerfCounters(): UiPerfCounters {
  return {
    uiRenderCount: 0,
    hudReplacementCount: 0,
    hudQueuedCount: 0,
    labelWriteCount: 0,
    minimapUpdateCount: 0,
    tooltipSyncCount: 0,
    activeTimers: 0,
    activeIntervals: 0,
    dirty: createCleanDirtySnapshot(),
    windowRenderCounts: {},
    tooltip: createEmptyTooltipSnapshot()
  };
}

export class PerfMonitor {
  private sampleStart: number;
  private frameCount = 0;
  private totalFrameMs = 0;
  private worstFrameMs = 0;
  private longFrames = 0;
  private subsystem = Object.fromEntries(subsystemIds.map((id) => [id, createAccumulator()])) as Record<PerfSubsystemId, PerfSubsystemAccumulator>;
  private counters: PerfCounterSnapshot = { ...createInitialPerfSnapshot().counters };
  private windowRenderCounts: Record<string, number> = {};
  private dirty = createCleanDirtySnapshot();
  private tooltip = createEmptyTooltipSnapshot();
  private latest = createInitialPerfSnapshot();

  constructor(private readonly sampleWindowMs = 1000, now = performance.now()) {
    this.sampleStart = now;
    this.latest.sampleWindowMs = sampleWindowMs;
  }

  beginFrame(frameTimeMs: number): void {
    this.frameCount += 1;
    this.totalFrameMs += frameTimeMs;
    this.worstFrameMs = Math.max(this.worstFrameMs, frameTimeMs);
    if (frameTimeMs > 16.7) this.longFrames += 1;
  }

  measure<T>(id: PerfSubsystemId, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      this.recordSubsystem(id, performance.now() - start);
    }
  }

  recordSubsystem(id: PerfSubsystemId, elapsedMs: number): void {
    const entry = this.subsystem[id];
    entry.calls += 1;
    entry.totalMs += elapsedMs;
    entry.worstMs = Math.max(entry.worstMs, elapsedMs);
    if (elapsedMs > subsystemBudgets[id]) entry.overBudget += 1;
  }

  addCounters(delta: PerfCounterDelta): void {
    this.counters.uiRenderPerSecond += delta.uiRenderPerSecond ?? 0;
    this.counters.hudReplacementPerSecond += delta.hudReplacementPerSecond ?? 0;
    this.counters.hudQueuedPerSecond += delta.hudQueuedPerSecond ?? 0;
    this.counters.labelWritePerSecond += delta.labelWritePerSecond ?? 0;
    this.counters.minimapUpdatePerSecond += delta.minimapUpdatePerSecond ?? 0;
    this.counters.tooltipSyncPerSecond += delta.tooltipSyncPerSecond ?? 0;
    this.counters.raycastPerSecond += delta.raycastPerSecond ?? 0;
    this.counters.pathfindingPerSecond += delta.pathfindingPerSecond ?? 0;
    this.counters.activeTimers = Math.max(this.counters.activeTimers, delta.activeTimers ?? 0);
    this.counters.activeIntervals = Math.max(this.counters.activeIntervals, delta.activeIntervals ?? 0);
    Object.entries(delta.windowRenderCounts ?? {}).forEach(([id, count]) => {
      this.windowRenderCounts[id] = (this.windowRenderCounts[id] ?? 0) + count;
    });
    if (delta.tooltip) this.tooltip = { ...delta.tooltip };
  }

  markDirty(dirty: Partial<PerfDirtySnapshot>): void {
    this.dirty.hudChanged ||= Boolean(dirty.hudChanged);
    this.dirty.labelsChanged ||= Boolean(dirty.labelsChanged);
    this.dirty.minimapChanged ||= Boolean(dirty.minimapChanged);
    this.dirty.tooltipSyncChanged ||= Boolean(dirty.tooltipSyncChanged);
    this.dirty.anyWindowChanged ||= Boolean(dirty.anyWindowChanged);
  }

  sample(now = performance.now()): PerfMonitorSnapshot {
    const elapsedMs = now - this.sampleStart;
    if (elapsedMs < this.sampleWindowMs) return this.latest;
    const seconds = Math.max(0.001, elapsedMs / 1000);
    this.latest = {
      sampleWindowMs: Math.round(elapsedMs),
      fps: round(this.frameCount / seconds),
      avgFrameMs: round(this.frameCount ? this.totalFrameMs / this.frameCount : 0),
      worstFrameMs: round(this.worstFrameMs),
      longFramesPerSecond: round(this.longFrames / seconds),
      subsystem: Object.fromEntries(subsystemIds.map((id) => [id, subsystemSnapshot(id, this.subsystem[id], seconds)])) as Record<PerfSubsystemId, PerfSubsystemSnapshot>,
      counters: {
        uiRenderPerSecond: round(this.counters.uiRenderPerSecond / seconds),
        hudReplacementPerSecond: round(this.counters.hudReplacementPerSecond / seconds),
        hudQueuedPerSecond: round(this.counters.hudQueuedPerSecond / seconds),
        labelWritePerSecond: round(this.counters.labelWritePerSecond / seconds),
        minimapUpdatePerSecond: round(this.counters.minimapUpdatePerSecond / seconds),
        tooltipSyncPerSecond: round(this.counters.tooltipSyncPerSecond / seconds),
        raycastPerSecond: round(this.counters.raycastPerSecond / seconds),
        pathfindingPerSecond: round(this.counters.pathfindingPerSecond / seconds),
        activeTimers: this.counters.activeTimers,
        activeIntervals: this.counters.activeIntervals
      },
      windowRenderPerSecond: Object.fromEntries(Object.entries(this.windowRenderCounts).map(([id, count]) => [id, round(count / seconds)])),
      dirty: { ...this.dirty },
      tooltip: { ...this.tooltip },
      lastSampleAt: Math.round(now)
    };
    this.reset(now);
    return this.latest;
  }

  private reset(now: number): void {
    this.sampleStart = now;
    this.frameCount = 0;
    this.totalFrameMs = 0;
    this.worstFrameMs = 0;
    this.longFrames = 0;
    this.subsystem = Object.fromEntries(subsystemIds.map((id) => [id, createAccumulator()])) as Record<PerfSubsystemId, PerfSubsystemAccumulator>;
    this.counters = { ...createInitialPerfSnapshot().counters };
    this.windowRenderCounts = {};
    this.dirty = createCleanDirtySnapshot();
  }
}

function createAccumulator(): PerfSubsystemAccumulator {
  return {
    calls: 0,
    totalMs: 0,
    worstMs: 0,
    overBudget: 0
  };
}

function createSubsystemSnapshot(id: PerfSubsystemId): PerfSubsystemSnapshot {
  return {
    callsPerSecond: 0,
    avgMs: 0,
    worstMs: 0,
    budgetMs: subsystemBudgets[id],
    overBudgetPerSecond: 0
  };
}

function subsystemSnapshot(id: PerfSubsystemId, accumulator: PerfSubsystemAccumulator, seconds: number): PerfSubsystemSnapshot {
  return {
    callsPerSecond: round(accumulator.calls / seconds),
    avgMs: round(accumulator.calls ? accumulator.totalMs / accumulator.calls : 0),
    worstMs: round(accumulator.worstMs),
    budgetMs: subsystemBudgets[id],
    overBudgetPerSecond: round(accumulator.overBudget / seconds)
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

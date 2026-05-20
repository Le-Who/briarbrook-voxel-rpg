import { VoxelRenderer } from '../render/VoxelRenderer';
import { UIManager } from '../ui/UIManager';
import { AudioManager } from '../audio/AudioManager';
import { loadGame } from './SaveLoad';
import { Simulation } from './Simulation';
import { Input } from './Input';
import { LoopGovernor } from './LoopGovernor';
import { consumeRuntimePerfCounters, PerfMonitor } from './PerfMonitor';
import { validateRuntimeContent } from '../tools/runtimeContentValidation';
import { createGameUIBridge, type GameUIBridge } from '../ui/react/bridge/GameUIBridge';
import { consumeReactRenderCounts } from '../ui/react/components/renderMetrics';

export const UI_PERFORMANCE_STATS_SAMPLE_MS = 1000;

export function shouldSampleUiPerformanceStats(time: number, lastSampleAt: number | null, sampleMs = UI_PERFORMANCE_STATS_SAMPLE_MS): boolean {
  return lastSampleAt == null || time - lastSampleAt >= sampleMs;
}

type UiPerformanceStats = Pick<
  ReturnType<UIManager['getPerformanceStats']>,
  'domNodeCount' | 'visibleWindowCount' | 'iconRenderRequestCount' | 'cachedIconCount' | 'eventListenerCount'
>;

export class Game {
  private simulation = new Simulation(loadGame());
  private renderer: VoxelRenderer;
  private ui: UIManager;
  private input: Input;
  private audio = new AudioManager(this.simulation.state.ui.audio);
  private governor = new LoopGovernor();
  private perf = new PerfMonitor();
  private readonly reactUIBridge: GameUIBridge;
  private lastFrame = performance.now();
  private lastSimulation = performance.now();
  private lastUiPerformanceStatsAt: number | null = null;
  private lastUiPerformanceStats: UiPerformanceStats = {
    domNodeCount: 0,
    visibleWindowCount: 0,
    iconRenderRequestCount: 0,
    cachedIconCount: 0,
    eventListenerCount: 0
  };
  private running = false;

  constructor(private canvas: HTMLCanvasElement, uiRoot: HTMLDivElement) {
    this.reactUIBridge = createGameUIBridge({
      getState: () => this.simulation.state,
      dispatch: (action) => this.simulation.dispatch(action),
      subscribe: (listener) => this.simulation.subscribe(listener),
      getGame: () => this
    });
    this.renderer = new VoxelRenderer(canvas, this.simulation.areaManager);
    this.ui = new UIManager(uiRoot, (action) => this.simulation.dispatch(action));
    this.input = new Input(canvas, this.renderer, this.simulation.areaManager, () => this.simulation.state, (action) => this.simulation.dispatch(action));
    this.audio.attach();
    this.validateStartupContent();
    window.addEventListener('resize', () => this.renderer.resize());
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.lastSimulation = this.lastFrame;
    requestAnimationFrame((time) => this.tick(time));
  }

  stop(): void {
    this.running = false;
  }

  getReactUIBridge(): GameUIBridge {
    return this.reactUIBridge;
  }

  private tick(time: number): void {
    if (!this.running) return;
    const frameDt = Math.min(0.1, (time - this.lastFrame) / 1000);
    this.lastFrame = time;
    const decision = this.governor.decide(time, this.simulation.state, {
      pendingActions: this.simulation.state.realtime.actionQueue.length > 0,
      documentHidden: typeof document !== 'undefined' ? document.hidden : false
    });
    this.perf.beginFrame(frameDt * 1000);

    if (decision.runInput) {
      this.perf.measure('input', () => this.input.update());
      this.governor.markRan('input', time);
    }

    if (decision.runSimulation) {
      const simulationDt = Math.min(0.1, (time - this.lastSimulation) / 1000);
      this.lastSimulation = time;
      this.perf.measure('simulation', () => this.simulation.update(simulationDt));
      this.governor.markRan('simulation', time);
    } else if (decision.mode === 'Paused' || decision.mode === 'BackgroundTab') {
      this.lastSimulation = time;
    }

    if (decision.runRender || decision.runSimulation) {
      this.perf.measure('audio', () => {
        this.audio.setSettings(this.simulation.state.ui.audio);
        this.audio.updateAmbient(this.simulation.state.player.currentArea, time);
      });
    }

    let renderStats = this.simulation.state.dev.renderStats;
    if (decision.runRender) {
      this.perf.measure('renderer', () => this.renderer.render(this.simulation.state));
      this.governor.markRan('render', time);
      renderStats = this.perf.measure('renderStats', () => this.renderer.getRenderStats(this.simulation.state));
    }

    if (decision.runUi) {
      this.perf.measure('ui', () =>
        this.ui.render(this.simulation.state, this.renderer, {
          minimapDirty: decision.minimapDirty,
          tooltipDirty: decision.tooltipDirty,
          dirtyFlags: decision.dirtyFlags
        })
      );
      this.governor.markRan('ui', time);
      if (decision.minimapDirty) this.governor.markRan('minimap', time);
    }

    const uiPerf = this.ui.consumePerfCounters();
    const reactRenderCounts = consumeReactRenderCounts();
    const runtimePerf = consumeRuntimePerfCounters();
    this.perf.addCounters({
      uiRenderPerSecond: uiPerf.uiRenderCount,
      hudReplacementPerSecond: uiPerf.hudReplacementCount,
      hudQueuedPerSecond: uiPerf.hudQueuedCount,
      labelWritePerSecond: uiPerf.labelWriteCount,
      minimapUpdatePerSecond: uiPerf.minimapUpdateCount,
      tooltipSyncPerSecond: uiPerf.tooltipSyncCount,
      raycastPerSecond: runtimePerf.raycastCalls,
      pathfindingPerSecond: runtimePerf.pathfindingCalls,
      activeTimers: uiPerf.activeTimers + 1,
      activeIntervals: uiPerf.activeIntervals,
      windowRenderCounts: { ...uiPerf.windowRenderCounts, ...reactRenderCounts },
      tooltip: uiPerf.tooltip
    });
    this.perf.markDirty(uiPerf.dirty);
    if (shouldSampleUiPerformanceStats(time, this.lastUiPerformanceStatsAt)) {
      this.lastUiPerformanceStats = this.ui.getPerformanceStats();
      this.lastUiPerformanceStatsAt = time;
    }
    this.simulation.state.dev.renderStats = {
      ...renderStats,
      fps: frameDt > 0 ? Math.round(1 / frameDt) : 0,
      frameTimeMs: Number((frameDt * 1000).toFixed(1)),
      ...this.lastUiPerformanceStats,
      perf: this.perf.sample(time),
      loop: decision.snapshot
    };
    this.scheduleNextTick(decision.cadence);
  }

  private scheduleNextTick(cadence: { simulationHz: number; renderHz: number; uiHz: number }): void {
    const maxHz = Math.max(1, cadence.simulationHz, cadence.renderHz, cadence.uiHz);
    const delay = Math.max(0, 1000 / maxHz - 1);
    if (delay > 8) {
      window.setTimeout(() => requestAnimationFrame((next) => this.tick(next)), Math.min(250, delay));
      return;
    }
    requestAnimationFrame((next) => this.tick(next));
  }

  private validateStartupContent(): void {
    void validateRuntimeContent(this.simulation.state).catch((error: unknown) => {
      this.simulation.state.dev.contentValidation = {
        ...this.simulation.state.dev.contentValidation,
        ok: false,
        checkedAt: this.simulation.state.clock,
        errors: ['Runtime content validation failed to load.'],
        warnings: []
      };
      console.error('[content] runtime validation failed to load', error);
    });
  }
}

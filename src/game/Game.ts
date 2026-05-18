import { VoxelRenderer } from '../render/VoxelRenderer';
import { UIManager } from '../ui/UIManager';
import { AudioManager } from '../audio/AudioManager';
import { loadGame } from './SaveLoad';
import { Simulation } from './Simulation';
import { Input } from './Input';
import { createContentRegistry } from '../tools/ContentRegistry';
import { logContentValidation, validateContent } from '../tools/ContentValidation';

export class Game {
  private simulation = new Simulation(loadGame());
  private renderer: VoxelRenderer;
  private ui: UIManager;
  private input: Input;
  private audio = new AudioManager(this.simulation.state.ui.audio);
  private last = performance.now();
  private running = false;

  constructor(private canvas: HTMLCanvasElement, uiRoot: HTMLDivElement) {
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
    this.last = performance.now();
    requestAnimationFrame((time) => this.tick(time));
  }

  stop(): void {
    this.running = false;
  }

  private tick(time: number): void {
    if (!this.running) return;
    const dt = Math.min(0.05, (time - this.last) / 1000);
    this.last = time;
    this.input.update();
    this.simulation.update(dt);
    this.audio.setSettings(this.simulation.state.ui.audio);
    this.audio.updateAmbient(this.simulation.state.player.currentArea, time);
    this.renderer.render(this.simulation.state);
    const renderStats = this.renderer.getRenderStats(this.simulation.state);
    this.ui.render(this.simulation.state, this.renderer);
    this.simulation.state.dev.renderStats = {
      ...renderStats,
      fps: dt > 0 ? Math.round(1 / dt) : 0,
      frameTimeMs: Number((dt * 1000).toFixed(1)),
      ...this.ui.getPerformanceStats()
    };
    requestAnimationFrame((next) => this.tick(next));
  }

  private validateStartupContent(): void {
    const validation = validateContent(createContentRegistry(this.simulation.state), this.simulation.state.clock);
    this.simulation.state.dev.contentValidation = validation;
    logContentValidation(validation);
  }
}

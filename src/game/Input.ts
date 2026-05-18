import type { GameAction } from './Actions';
import type { GameState } from './types';
import type { VoxelRenderer } from '../render/VoxelRenderer';
import type { AreaManager } from '../world/AreaManager';
import { InputRouter } from './InputRouter';

type Dispatch = (action: GameAction) => void;

export class Input {
  private router: InputRouter;

  constructor(
    private canvas: HTMLCanvasElement,
    renderer: VoxelRenderer,
    areaManager: AreaManager,
    getState: () => GameState,
    dispatch: Dispatch
  ) {
    this.router = new InputRouter(canvas, renderer, areaManager, getState, dispatch);
    window.addEventListener('keydown', (event) => this.router.keyDown(event));
    window.addEventListener('keyup', (event) => this.router.keyUp(event));
    window.addEventListener('blur', () => this.router.blur());
    window.addEventListener('focus', () => this.router.focus());
    document.addEventListener('visibilitychange', () => this.router.visibilityChange());
    canvas.addEventListener('click', (event) => this.router.click(event));
    canvas.addEventListener('pointermove', (event) => this.router.pointerMove(event));
    canvas.addEventListener('pointerleave', () => this.router.pointerLeave());
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button === 2) this.router.contextMenu(event);
    });
    canvas.addEventListener('auxclick', (event) => {
      if (event.button === 2) this.router.contextMenu(event);
    });
    canvas.addEventListener('contextmenu', (event) => this.router.contextMenu(event));
    canvas.addEventListener('wheel', (event) => this.router.wheel(event), { passive: false });
  }

  update(): void {
    this.router.updateMovement();
  }
}

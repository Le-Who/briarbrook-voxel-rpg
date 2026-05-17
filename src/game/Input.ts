import type { GameAction } from './Actions';
import type { GameState, TargetRef } from './types';
import type { VoxelRenderer } from '../render/VoxelRenderer';
import type { AreaManager } from '../world/AreaManager';

type Dispatch = (action: GameAction) => void;

export class Input {
  private keys = new Set<string>();
  private lastHoverKey = '';

  constructor(
    private canvas: HTMLCanvasElement,
    private renderer: VoxelRenderer,
    private areaManager: AreaManager,
    private getState: () => GameState,
    private dispatch: Dispatch
  ) {
    window.addEventListener('keydown', (event) => this.keyDown(event));
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
    canvas.addEventListener('click', (event) => this.click(event));
    canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
    canvas.addEventListener('pointerleave', () => {
      this.canvas.style.cursor = 'default';
      this.setHoverTarget(null);
    });
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button === 2) this.openContextMenu(event);
    });
    canvas.addEventListener('auxclick', (event) => {
      if (event.button === 2) this.openContextMenu(event);
    });
    canvas.addEventListener('contextmenu', (event) => this.openContextMenu(event));
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.renderer.cameraController.setZoom(event.deltaY > 0 ? 1 : -1);
      this.renderer.resize();
    });
  }

  update(): void {
    if (this.isTyping()) return;
    let dx = 0;
    let dz = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dz -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dz += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    if (dx || dz) {
      const len = Math.hypot(dx, dz);
      const world = this.renderer.cameraController.screenMoveToWorldVector(dx / len, dz / len);
      this.dispatch({ type: 'MOVE_BY', dx: world.x, dz: world.z });
    }
  }

  private keyDown(event: KeyboardEvent): void {
    if (this.isTyping()) return;
    const key = event.key.toLowerCase();
    this.keys.add(key);
    if (key === 'f10' && event.shiftKey) {
      event.preventDefault();
      this.openKeyboardContextMenu();
      return;
    }
    if (key === 'f10') {
      event.preventDefault();
      this.dispatch({ type: 'TOGGLE_DEV_TRAVEL' });
      return;
    }
    if (key === '`' || key === 'f9') {
      event.preventDefault();
      this.dispatch({ type: 'TOGGLE_DEV_OVERLAY' });
      return;
    }
    if (key === 'tab') {
      event.preventDefault();
      this.dispatch({ type: 'CYCLE_TARGET', direction: event.shiftKey ? -1 : 1 });
      return;
    }
    if (key === 'escape') {
      event.preventDefault();
      const state = this.getState();
      if (state.ui.targeting) this.dispatch({ type: 'CANCEL_TARGETING' });
      else if (state.ui.contextMenu) this.dispatch({ type: 'CLOSE_CONTEXT_MENU' });
      else if (state.ui.selectedInventorySlot != null || state.ui.selectedBankSlot != null || state.ui.hoverTarget) {
        this.dispatch({ type: 'SELECT_INVENTORY_SLOT', slot: null });
        this.dispatch({ type: 'SELECT_BANK_SLOT', slot: null });
        this.dispatch({ type: 'HOVER_TARGET', target: null });
      } else {
        this.dispatch({ type: 'TOGGLE_PAUSE' });
      }
      return;
    }
    if (/^[1-9]$/.test(key)) this.dispatch({ type: 'USE_HOTBAR', slot: Number(key) - 1 });
    if (key === '0') this.dispatch({ type: 'USE_HOTBAR', slot: 9 });
    if (key === 'e') {
      const nearby = this.areaManager.nearestInteractable(this.getState(), 2.2);
      if (nearby) this.dispatch({ type: 'INTERACT_ENTITY', entityId: nearby });
    }
    if (key === 'q') this.dispatch({ type: 'DEFENSIVE_ACTION' });
    if (key === 'r') this.dispatch({ type: 'USE_WEAPON_ABILITY', abilityId: 'quick_slash' });
    if (key === 'i') this.dispatch({ type: 'TOGGLE_PANEL', panel: 'inventory' });
    if (key === 'j') this.dispatch({ type: 'TOGGLE_PANEL', panel: 'journal' });
    if (key === 'm') this.dispatch({ type: 'TOGGLE_PANEL', panel: 'spellbook' });
    if (key === 'c' && !this.getState().buildMode.active) this.dispatch({ type: 'TOGGLE_PANEL', panel: 'character' });
    if (key === 'k') this.dispatch({ type: 'TOGGLE_PANEL', panel: 'skills' });
    if (key === 'b') this.dispatch({ type: 'OPEN_BANK' });
    if (key === 'f') this.dispatch({ type: 'TOGGLE_PANEL', panel: 'crafting' });
    if (key === 'h') this.dispatch({ type: 'TOGGLE_BUILD_MODE' });
    if (key === 'x') this.dispatch({ type: 'TOGGLE_BUILD_MODE', active: false });
    if (key === 'v') this.dispatch({ type: 'TOGGLE_BUILD_SNAP' });
    if (key === 'z') this.dispatch({ type: 'ROTATE_BUILDING', delta: -90 });
    if (key === 'c' && this.getState().buildMode.active) this.dispatch({ type: 'ROTATE_BUILDING', delta: 90 });
    if (key === ' ') this.dispatch({ type: 'ATTACK_ENTITY' });
  }

  private click(event: MouseEvent): void {
    const state = this.getState();
    const world = this.renderer.screenToWorld(event.clientX, event.clientY);
    const entityId = this.renderer.pickEntity(event.clientX, event.clientY);
    if (state.ui.contextMenu) this.dispatch({ type: 'CLOSE_CONTEXT_MENU' });
    if (state.ui.targeting) {
      if (entityId) {
        this.dispatch({ type: 'TARGET_ENTITY', entityId });
      } else {
        this.dispatch({ type: 'TARGET_TILE', areaId: state.player.currentArea, position: world });
      }
      return;
    }
    if (state.buildMode.active && state.player.currentArea === 'housing') {
      this.dispatch({ type: 'SET_BUILD_GHOST', position: world });
      this.dispatch({ type: 'PLACE_BUILDING' });
      return;
    }
    if (entityId) {
      const entity = state.entities[entityId];
      this.dispatch({ type: 'SELECT_TARGET', target: { kind: 'entity', entityId } });
      if (entity?.kind === 'enemy') {
        this.dispatch({ type: 'SELECT_ENTITY', entityId });
        this.dispatch({ type: 'ATTACK_ENTITY', entityId });
      } else {
        this.dispatch({ type: 'INTERACT_ENTITY', entityId });
      }
      return;
    }
    this.dispatch({ type: 'SELECT_TARGET', target: { kind: 'tile', areaId: state.player.currentArea, position: world } });
    this.dispatch({ type: 'MOVE_TO', position: world });
  }

  private pointerMove(event: MouseEvent): void {
    const state = this.getState();
    const entityId = this.renderer.pickEntity(event.clientX, event.clientY);
    this.updateCursor(state, entityId);
    if (entityId) {
      this.setHoverTarget({ kind: 'entity', entityId });
    } else if (state.ui.targeting) {
      this.setHoverTarget({ kind: 'tile', areaId: state.player.currentArea, position: this.renderer.screenToWorld(event.clientX, event.clientY) });
    } else {
      this.setHoverTarget(null);
    }
    if (!state.buildMode.active) return;
    this.dispatch({ type: 'SET_BUILD_GHOST', position: this.renderer.screenToWorld(event.clientX, event.clientY) });
  }

  private openContextMenu(event: MouseEvent): void {
    event.preventDefault();
    const state = this.getState();
    if (state.buildMode.active) {
      this.dispatch({ type: 'ROTATE_BUILDING', delta: 90 });
      return;
    }
    const entityId = this.renderer.pickEntity(event.clientX, event.clientY);
    const target = entityId
      ? ({ kind: 'entity', entityId } as const)
      : ({ kind: 'tile', areaId: state.player.currentArea, position: this.renderer.screenToWorld(event.clientX, event.clientY) } as const);
    this.dispatch({ type: 'OPEN_CONTEXT_MENU', target, x: event.clientX, y: event.clientY });
  }

  private openKeyboardContextMenu(): void {
    const state = this.getState();
    const target = state.ui.hoverTarget ?? state.ui.selectedTarget ?? { kind: 'tile' as const, areaId: state.player.currentArea, position: state.player.position };
    this.dispatch({ type: 'OPEN_CONTEXT_MENU', target, x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) });
  }

  private setHoverTarget(target: TargetRef): void {
    const key =
      target?.kind === 'entity'
        ? `entity:${target.entityId}`
        : target?.kind === 'tile'
          ? `tile:${target.areaId}:${Math.round(target.position.x)},${Math.round(target.position.z)}`
          : target?.kind === 'inventory'
            ? `inventory:${target.owner}:${target.slot}`
            : 'none';
    if (key === this.lastHoverKey) return;
    this.lastHoverKey = key;
    this.dispatch({ type: 'HOVER_TARGET', target });
  }

  private updateCursor(state: GameState, entityId: string | null): void {
    if (state.ui.targeting) {
      if (!entityId && state.ui.targeting.mode !== 'tool') {
        this.canvas.style.cursor = 'not-allowed';
        return;
      }
      if (state.ui.targeting.mode === 'spell') {
        const entity = entityId ? state.entities[entityId] : null;
        this.canvas.style.cursor = entity?.kind === 'enemy' ? 'crosshair' : state.ui.targeting.spellId ? 'cell' : 'not-allowed';
        return;
      }
      this.canvas.style.cursor = entityId ? 'cell' : state.ui.targeting.mode === 'tool' ? 'cell' : 'not-allowed';
      return;
    }
    if (!entityId) {
      this.canvas.style.cursor = state.buildMode.active ? 'cell' : 'default';
      return;
    }
    const entity = state.entities[entityId];
    if (!entity) {
      this.canvas.style.cursor = 'default';
      return;
    }
    if (entity.kind === 'enemy') {
      this.canvas.style.cursor = 'crosshair';
    } else if (entity.kind === 'resource') {
      this.canvas.style.cursor = 'cell';
    } else if (entity.kind === 'loot' || entity.kind === 'container') {
      this.canvas.style.cursor = 'grab';
    } else if (entity.kind === 'portal' || entity.kind === 'npc' || entity.kind === 'social') {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  private isTyping(): boolean {
    const active = document.activeElement;
    return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
  }
}

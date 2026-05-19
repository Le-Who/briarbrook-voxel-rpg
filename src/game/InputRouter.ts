import type { GameAction } from './Actions';
import type { GameState, InputMode, ResourceKind, TargetRef } from './types';
import type { VoxelRenderer } from '../render/VoxelRenderer';
import type { AreaManager } from '../world/AreaManager';
import { resourceTileAtPosition } from '../systems/ResourceSystem';
import { cursorCssForKind, selectedToolItemId, toolTargetsResourceKind, worldCursorKindForHover } from './WorldFeedback';
import {
  hotbarSlotForAction,
  inputContextsForMode,
  isActionPressed,
  keyTokenFromEvent,
  LEGACY_KEYBINDINGS,
  resolveInputAction,
  sanitizeInputBindings
} from './InputActionMap';
import type { InputActionId } from './types';

type Dispatch = (action: GameAction) => void;

export interface FocusDescriptor {
  tagName: string;
  name?: string | null;
  isContentEditable?: boolean;
}

export const KEYBINDINGS = LEGACY_KEYBINDINGS;

export function focusDescriptorFromElement(element: Element | null): FocusDescriptor | null {
  if (!element) return null;
  const input = element as HTMLInputElement;
  return {
    tagName: element.tagName,
    name: 'name' in input ? input.name : null,
    isContentEditable: element instanceof HTMLElement ? element.isContentEditable : false
  };
}

export function deriveInputMode(state: GameState, focus: FocusDescriptor | null = focusDescriptorFromElement(document.activeElement), dragPayload = state.dev.input?.dragPayload ?? null): InputMode {
  if (dragPayload) {
    if (dragPayload.startsWith('spell:')) return 'spellDragging';
    if (dragPayload.startsWith('ui:')) return 'uiDragging';
    return 'itemDragging';
  }
  if (state.paused) return 'paused';
  if (state.dev.overlay) return 'devOverlay';
  if (isEditableFocus(focus)) return 'chatFocused';
  if (state.ui.trade || state.ui.merchant) return 'modalOpen';
  if (state.ui.targeting) return 'targeting';
  if (state.buildMode.active) return 'building';
  return 'normal';
}

export function hotbarSlotFromKeyboardCode(code: string): number | null {
  if (!/^Digit[0-9]$/.test(code)) return null;
  const digit = Number(code.slice('Digit'.length));
  return digit === 0 ? 9 : digit - 1;
}

function isEditableFocus(focus: FocusDescriptor | null): boolean {
  if (!focus) return false;
  const tag = focus.tagName.toUpperCase();
  return focus.isContentEditable === true || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export class InputRouter {
  private keys = new Set<string>();
  private lastHoverKey = '';

  constructor(
    private canvas: HTMLCanvasElement,
    private renderer: VoxelRenderer,
    private areaManager: AreaManager,
    private getState: () => GameState,
    private dispatch: Dispatch
  ) {}

  updateMovement(): void {
    const mode = this.currentMode();
    if (mode !== 'normal' && mode !== 'building') return;
    if (this.getState().ui.movementMode === 'mouse') return;
    const bindings = this.bindings();
    let dx = 0;
    let dz = 0;
    if (isActionPressed(bindings, this.keys, 'moveUp')) dz -= 1;
    if (isActionPressed(bindings, this.keys, 'moveDown')) dz += 1;
    if (isActionPressed(bindings, this.keys, 'moveLeft')) dx -= 1;
    if (isActionPressed(bindings, this.keys, 'moveRight')) dx += 1;
    if (dx || dz) {
      const len = Math.hypot(dx, dz);
      const world = this.getState().ui.cameraRelativeMovement === false
        ? { x: dx / len, z: dz / len }
        : this.renderer.cameraController.screenMoveToWorldVector(dx / len, dz / len);
      this.intent('WORLD_MOVE_TO');
      this.dispatch({ type: 'MOVE_BY', dx: world.x, dz: world.z });
    }
  }

  keyDown(event: KeyboardEvent): void {
    this.raw(`keydown:${event.key}`);
    const capture = this.getState().ui.keybindingCapture;
    if (capture) {
      const key = keyTokenFromEvent(event);
      if (key) {
        this.preventBrowserDefault(event, 'keydown:keybind-capture');
        this.intent(`UI_KEYBIND:${capture.actionId}`);
        this.dispatch({ type: 'SET_INPUT_BINDING', actionId: capture.actionId, context: capture.context, key });
      }
      return;
    }
    const mode = this.currentMode();
    const key = normalizedKey(event);
    const action = this.inputAction(event, mode);
    if (key === 'escape' || action?.actionId === 'cancel' || action?.actionId === 'back') {
      this.preventBrowserDefault(event, 'keydown:escape');
      this.cancel(mode);
      return;
    }
    if (mode === 'chatFocused' || mode === 'uiDragging' || mode === 'itemDragging' || mode === 'spellDragging') return;
    if (this.getState().ui.contextMenu && action?.actionId !== 'openContextMenu') return;
    this.keys.add(keyTokenFromEvent(event) || key);

    if (!action) return;
    if (this.handleDebugAction(action.actionId, event)) return;
    if (mode === 'devOverlay') return;
    if (action.actionId === 'targetNext') {
      this.preventBrowserDefault(event, 'keydown:target-next');
      this.intent('TARGET_SELECT');
      this.dispatch({ type: 'CYCLE_TARGET', direction: event.shiftKey ? -1 : 1 });
      return;
    }
    if (mode === 'targeting' && action.actionId !== 'openContextMenu') return;

    const hotbarSlot = hotbarSlotForAction(action.actionId);
    const hotbarAssignSpellId = this.getState().ui.hotbarAssignSpellId;
    if (hotbarSlot != null && hotbarAssignSpellId) {
      this.preventBrowserDefault(event, `keydown:hotbar-assign-${hotbarSlot}`);
      this.intent(`HOTBAR_ASSIGN:${hotbarSlot}`);
      this.dispatch({ type: 'SET_HOTBAR_SLOT', slot: hotbarSlot, binding: { kind: 'spell', id: hotbarAssignSpellId } });
      return;
    }
    if (hotbarSlot != null && event.shiftKey && this.getState().ui.panels.spellbook) {
      this.preventBrowserDefault(event, `keydown:shift-hotbar-${hotbarSlot}`);
      this.intent(`HOTBAR_ASSIGN:${hotbarSlot}`);
      this.dispatch({ type: 'SET_HOTBAR_SLOT', slot: hotbarSlot, binding: { kind: 'spell', id: this.getState().ui.selectedSpellId } });
      return;
    }
    if (hotbarSlot != null) {
      this.preventBrowserDefault(event, `keydown:hotbar-${hotbarSlot}`);
      this.intent(`HOTBAR_USE:${hotbarSlot}`);
      this.dispatch({ type: 'USE_HOTBAR', slot: hotbarSlot });
      return;
    }
    if (action.actionId === 'hotbarPrevious' || action.actionId === 'hotbarNext') {
      const current = this.getState().ui.activeHotbarSlot ?? 0;
      const delta = action.actionId === 'hotbarNext' ? 1 : -1;
      const slot = (current + delta + this.getState().ui.hotbar.length) % this.getState().ui.hotbar.length;
      this.preventBrowserDefault(event, `keydown:${action.actionId}`);
      this.intent(`HOTBAR_SELECT:${slot}`);
      this.dispatch({ type: 'SET_ACTIVE_HOTBAR_SLOT', slot });
      return;
    }

    if (this.handlePanelAction(action.actionId)) return;
    this.handleGameplayAction(action.actionId, event);
  }

  keyUp(event: KeyboardEvent): void {
    this.raw(`keyup:${event.key}`);
    this.keys.delete(keyTokenFromEvent(event));
    this.keys.delete(normalizedKey(event));
  }

  blur(): void {
    this.keys.clear();
    this.raw('blur');
    this.intent('CANCEL_KEYS');
  }

  focus(): void {
    this.raw('focus');
    this.updateDebug();
  }

  visibilityChange(): void {
    this.keys.clear();
    this.raw(document.visibilityState === 'hidden' ? 'visibility:hidden' : 'visibility:visible');
  }

  pointerMove(event: MouseEvent): void {
    this.raw('pointermove');
    const state = this.getState();
    const mode = this.currentMode();
    if (mode === 'paused' || mode === 'modalOpen' || mode === 'devOverlay') {
      this.canvas.style.cursor = 'default';
      this.setHoverTarget(null);
      return;
    }
    const entityId = this.renderer.pickEntity(event.clientX, event.clientY);
    const world = this.renderer.screenToWorld(event.clientX, event.clientY);
    const tile = entityId ? null : resourceTileAtPosition(state, world, undefined, 0);
    this.updateCursor(state, entityId, tile?.resourceKind ?? null);
    if (entityId) {
      this.setHoverTarget({ kind: 'entity', entityId });
    } else if (state.ui.targeting || (tile && toolTargetsResourceKind(selectedToolItemId(state), tile.resourceKind))) {
      this.setHoverTarget({ kind: 'tile', areaId: state.player.currentArea, position: world });
    } else {
      this.setHoverTarget(null);
    }
    if (state.buildMode.active) {
      this.intent('UI_DRAG_MOVE:build-ghost');
      this.dispatch({ type: 'SET_BUILD_GHOST', position: world });
    }
  }

  pointerLeave(): void {
    this.raw('pointerleave');
    this.canvas.style.cursor = 'default';
    this.setHoverTarget(null);
  }

  click(event: MouseEvent): void {
    this.raw('pointerup:left');
    const mode = this.currentMode();
    if (mode === 'paused' || mode === 'modalOpen' || mode === 'devOverlay') return;
    const state = this.getState();
    const world = this.renderer.screenToWorld(event.clientX, event.clientY);
    const entityId = this.renderer.pickEntity(event.clientX, event.clientY);
    if (state.ui.contextMenu) this.dispatch({ type: 'CLOSE_CONTEXT_MENU' });
    if (state.ui.targeting) {
      this.intent('TARGET_SELECT');
      if (entityId) this.dispatch({ type: 'TARGET_ENTITY', entityId });
      else this.dispatch({ type: 'TARGET_TILE', areaId: state.player.currentArea, position: world });
      return;
    }
    if (state.buildMode.active && state.player.currentArea === 'housing') {
      this.intent('CONFIRM:place-building');
      this.dispatch({ type: 'SET_BUILD_GHOST', position: world });
      this.dispatch({ type: 'PLACE_BUILDING' });
      return;
    }
    if (entityId) {
      const entity = state.entities[entityId];
      this.dispatch({ type: 'SELECT_TARGET', target: { kind: 'entity', entityId } });
      if (entity?.kind === 'enemy') {
        this.intent('WORLD_ATTACK');
        this.dispatch({ type: 'SELECT_ENTITY', entityId });
        this.dispatch({ type: 'ATTACK_ENTITY', entityId });
      } else {
        this.intent('WORLD_INTERACT');
        this.dispatch({ type: 'INTERACT_ENTITY', entityId });
      }
      return;
    }
    this.dispatch({ type: 'SELECT_TARGET', target: { kind: 'tile', areaId: state.player.currentArea, position: world } });
    if (state.ui.movementMode === 'keyboard') {
      this.intent('WORLD_SELECT_TILE');
      this.dispatch({ type: 'SHOW_PROMPT', message: 'Mouse movement disabled in Keyboard Only mode.' });
      return;
    }
    this.intent('WORLD_MOVE_TO');
    this.dispatch({ type: 'MOVE_TO', position: world });
  }

  contextMenu(event: MouseEvent): void {
    this.raw('contextmenu');
    this.preventBrowserDefault(event, 'canvas:contextmenu');
    const mode = this.currentMode();
    if (mode === 'paused' || mode === 'modalOpen' || mode === 'devOverlay' || mode === 'chatFocused') {
      this.intent('CANCEL_BROWSER_MENU');
      return;
    }
    const state = this.getState();
    if (state.buildMode.active) {
      this.intent('CONFIRM:rotate-building');
      this.dispatch({ type: 'ROTATE_BUILDING', delta: 90 });
      return;
    }
    const entityId = this.renderer.pickEntity(event.clientX, event.clientY);
    const target = entityId
      ? ({ kind: 'entity', entityId } as const)
      : ({ kind: 'tile', areaId: state.player.currentArea, position: this.renderer.screenToWorld(event.clientX, event.clientY) } as const);
    this.intent('UI_CLICK:context-menu');
    this.dispatch({ type: 'OPEN_CONTEXT_MENU', target, x: event.clientX, y: event.clientY });
  }

  wheel(event: WheelEvent): void {
    this.raw('wheel');
    const mode = this.currentMode();
    if (mode === 'paused' || mode === 'modalOpen' || mode === 'chatFocused') return;
    this.preventBrowserDefault(event, 'canvas:wheel');
    this.intent('CONFIRM:camera-zoom');
    this.renderer.cameraController.setZoom(event.deltaY > 0 ? 1 : -1);
    this.renderer.resize();
  }

  private bindings(): GameState['ui']['inputBindings'] {
    return sanitizeInputBindings(this.getState().ui.inputBindings);
  }

  private inputAction(event: KeyboardEvent, mode: InputMode): GameState['ui']['inputBindings'][number] | null {
    return resolveInputAction(this.bindings(), event, inputContextsForMode(mode));
  }

  private handleDebugAction(actionId: InputActionId, event: KeyboardEvent): boolean {
    if (actionId === 'openDevTravel') {
      this.preventBrowserDefault(event, 'keydown:dev-travel');
      this.intent('OPEN_PANEL:dev-travel');
      this.dispatch({ type: 'TOGGLE_DEV_TRAVEL' });
      return true;
    }
    if (actionId === 'toggleDevOverlay') {
      this.preventBrowserDefault(event, 'keydown:dev-overlay');
      this.intent('OPEN_PANEL:dev-overlay');
      this.dispatch({ type: 'TOGGLE_DEV_OVERLAY' });
      return true;
    }
    return false;
  }

  private handlePanelAction(actionId: InputActionId): boolean {
    const panels: Partial<Record<InputActionId, string>> = {
      openInventory: 'inventory',
      openSkills: 'skills',
      openSpellbook: 'spellbook',
      openJournal: 'journal',
      openMarket: 'market',
      openCharacter: 'character',
      openHelp: 'help',
      openCrafting: 'crafting'
    };
    if (actionId === 'openBuild') {
      this.intent('TOGGLE_PANEL:build');
      this.dispatch({ type: 'TOGGLE_BUILD_MODE' });
      return true;
    }
    const panel = panels[actionId];
    if (!panel) return false;
    if (panel === 'character' && this.getState().buildMode.active) return false;
    this.intent(`TOGGLE_PANEL:${panel}`);
    this.dispatch({ type: 'TOGGLE_PANEL', panel });
    return true;
  }

  private handleGameplayAction(actionId: InputActionId, event: KeyboardEvent): void {
    if (actionId === 'interact') {
      const nearby = this.areaManager.nearestInteractable(this.getState(), 2.2);
      this.intent('WORLD_INTERACT');
      if (nearby) this.dispatch({ type: 'INTERACT_ENTITY', entityId: nearby });
    } else if (actionId === 'secondaryAction' || actionId === 'defend') {
      this.intent('CONFIRM:defend');
      this.dispatch({ type: 'DEFENSIVE_ACTION' });
    } else if (actionId === 'weaponAbility') {
      this.intent('CONFIRM:weapon-ability');
      this.dispatch({ type: 'USE_WEAPON_ABILITY', abilityId: 'quick_slash' });
    } else if (actionId === 'cancelBuild') {
      this.intent('CANCEL:build');
      this.dispatch({ type: 'TOGGLE_BUILD_MODE', active: false });
    } else if (actionId === 'buildSnap' || actionId === 'toggleCursorCamera') {
      this.intent('CONFIRM:build-snap');
      this.dispatch({ type: 'TOGGLE_BUILD_SNAP' });
    } else if (actionId === 'rotateBuildLeft') {
      this.intent('CONFIRM:rotate-left');
      this.dispatch({ type: 'ROTATE_BUILDING', delta: -90 });
    } else if (actionId === 'rotateBuildRight' && this.getState().buildMode.active) {
      this.intent('CONFIRM:rotate-right');
      this.dispatch({ type: 'ROTATE_BUILDING', delta: 90 });
    } else if (actionId === 'openContextMenu') {
      this.preventBrowserDefault(event, 'keydown:context-menu');
      this.openKeyboardContextMenu();
    } else if (actionId === 'confirm') {
      this.preventBrowserDefault(event, 'keydown:confirm');
      this.dispatch({ type: 'USE_HOTBAR', slot: this.getState().ui.activeHotbarSlot ?? 0 });
    } else if (actionId === 'primaryAction') {
      this.intent('WORLD_ATTACK');
      this.dispatch({ type: 'ATTACK_ENTITY' });
    }
  }

  private cancel(mode: InputMode): void {
    this.intent('CANCEL');
    const active = document.activeElement;
    if (mode === 'chatFocused' && active instanceof HTMLElement) {
      active.blur();
      return;
    }
    const state = this.getState();
    if (state.ui.hotbarAssignSpellId) this.dispatch({ type: 'CANCEL_HOTBAR_ASSIGNMENT' });
    else if (state.ui.targeting) this.dispatch({ type: 'CANCEL_TARGETING' });
    else if (state.ui.contextMenu) this.dispatch({ type: 'CLOSE_CONTEXT_MENU' });
    else if (state.buildMode.active) this.dispatch({ type: 'TOGGLE_BUILD_MODE', active: false });
    else if (state.ui.selectedInventorySlot != null || state.ui.selectedBankSlot != null || state.ui.hoverTarget) {
      this.dispatch({ type: 'SELECT_INVENTORY_SLOT', slot: null });
      this.dispatch({ type: 'SELECT_BANK_SLOT', slot: null });
      this.dispatch({ type: 'HOVER_TARGET', target: null });
    } else {
      this.dispatch({ type: 'TOGGLE_PAUSE' });
    }
  }

  private openKeyboardContextMenu(): void {
    const state = this.getState();
    const target = state.ui.hoverTarget ?? state.ui.selectedTarget ?? { kind: 'tile' as const, areaId: state.player.currentArea, position: state.player.position };
    this.intent('UI_CLICK:keyboard-context-menu');
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

  private updateCursor(state: GameState, entityId: string | null, tileKind: ResourceKind | null): void {
    const entity = entityId ? state.entities[entityId] : null;
    this.canvas.style.cursor = cursorCssForKind(worldCursorKindForHover(state, { entity, tileKind }));
  }

  private currentMode(): InputMode {
    const mode = deriveInputMode(this.getState());
    this.updateDebug({ mode });
    return mode;
  }

  private raw(lastRawInput: string): void {
    this.updateDebug({ lastRawInput });
  }

  private intent(lastIntent: string): void {
    this.updateDebug({ lastIntent });
  }

  private preventBrowserDefault(event: Event, reason: string): void {
    if (event.cancelable) {
      event.preventDefault();
      this.updateDebug({ lastPreventedDefault: reason });
    }
  }

  private updateDebug(patch: Partial<GameState['dev']['input']> = {}): void {
    const state = this.getState();
    const focusedWindow = focusedWindowKey();
    this.dispatch({
      type: 'UPDATE_INPUT_DEBUG',
      patch: {
        mode: patch.mode ?? deriveInputMode(state),
        focusedWindow: patch.focusedWindow ?? focusedWindow,
        focusedElement: patch.focusedElement ?? focusedElementDescriptor(),
        topmostWindow: patch.topmostWindow ?? focusedWindow,
        targetMode: patch.targetMode ?? (state.ui.targeting ? state.ui.targeting.mode : null),
        viewport: patch.viewport ?? `${window.innerWidth}x${window.innerHeight}`,
        uiScale: patch.uiScale ?? state.ui.uiScale ?? 1,
        ...patch
      }
    });
  }
}

function normalizedKey(event: KeyboardEvent): string {
  if (event.key === '?') return '?';
  if (event.key === ' ') return ' ';
  return event.key.toLowerCase();
}

function focusedWindowKey(): string {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.managed-window[data-window-key]'));
  let focused = 'none';
  let highest = Number.NEGATIVE_INFINITY;
  for (const panel of panels) {
    const z = Number(window.getComputedStyle(panel).zIndex);
    if (Number.isFinite(z) && z >= highest) {
      highest = z;
      focused = panel.dataset.windowKey ?? focused;
    }
  }
  return focused;
}

function focusedElementDescriptor(): string {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return 'none';
  const tag = active.tagName.toLowerCase();
  const name = active.getAttribute('name') || active.getAttribute('aria-label') || active.id || active.dataset.windowKey || '';
  return name ? `${tag}:${name}` : tag;
}

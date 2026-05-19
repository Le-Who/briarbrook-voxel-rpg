import type { HotbarBinding } from '../game/types';

export interface ViewportSize {
  width: number;
  height: number;
}

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type WindowAnchorPreset = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-center' | 'right-side' | 'center' | 'center-left' | 'center-right' | 'left-side';

export interface WindowRegistration {
  id: string;
  title: string;
  isModal: boolean;
  anchorPreset: WindowAnchorPreset;
  canDrag: boolean;
  canResize: boolean;
  canClose: boolean;
  rememberPosition: boolean;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  contentScrollMode: 'panel' | 'body' | 'none';
}

export interface ManagedWindowState extends WindowRect {
  id: string;
  title: string;
  isOpen: boolean;
  isModal: boolean;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  zIndex: number;
  anchorPreset: WindowAnchorPreset;
  canDrag: boolean;
  canResize: boolean;
  canClose: boolean;
  rememberPosition: boolean;
  lastFocusedAt: number;
  contentScrollMode: 'panel' | 'body' | 'none';
}

export type StoredWindowLayout = Record<string, WindowRect>;

export interface ManagedWindowQaObservation {
  id: string;
  rect: WindowRect;
  headerRect: WindowRect;
  zIndex: number;
  isModal: boolean;
  contentScrollMode: 'panel' | 'body' | 'none';
  hasMaxHeight: boolean;
  needsScroll: boolean;
  hasInternalScrollRegion: boolean;
}

export interface ManagedScrollSnapshot {
  windowKey: string;
  path: number[];
  scrollTop: number;
  scrollLeft: number;
}

export interface WindowQaContext {
  viewport: ViewportSize;
  hotbarTop: number;
}

export interface ClampOptions {
  margin?: number;
  safeBottom?: number;
  titlebarHeight?: number;
}

export interface EditableTargetDescriptor {
  tagName: string;
  isContentEditable?: boolean;
}

const DEFAULT_MARGIN = 8;
const DEFAULT_SAFE_BOTTOM = 96;
const DEFAULT_TITLEBAR_HEIGHT = 34;
const SMALL_VIEWPORT_WIDTH = 760;
const WINDOW_LAYOUT_STORAGE_KEY = 'briarbrook.ui.window-layout.v1';
type ActionBindingId = Extract<HotbarBinding, { kind: 'action' }>['id'];

const ACTION_BINDINGS = new Set<ActionBindingId>(['attack', 'ranged', 'utility', 'hide', 'defend', 'interact', 'build']);

const panelKeyByClass: Array<[string, string]> = [
  ['inventory-panel', 'inventory'],
  ['spellbook-panel', 'spellbook'],
  ['skills-panel', 'skills'],
  ['journal-panel', 'journal'],
  ['market-panel', 'market'],
  ['chat-panel', 'chat'],
  ['map-panel', 'map'],
  ['bank-panel', 'bank'],
  ['crafting-panel', 'crafting'],
  ['character-panel', 'character'],
  ['help-panel', 'help'],
  ['build-panel', 'build'],
  ['treasure-map-panel', 'treasureMap'],
  ['trade-panel', 'trade'],
  ['merchant-panel', 'merchant']
];

const windowRegistry: Record<string, WindowRegistration> = {
  inventory: windowRegistration('inventory', 'Inventory', 'right-side', { minWidth: 232, minHeight: 280, maxWidth: 520, canResize: true }),
  spellbook: windowRegistration('spellbook', 'Spellbook', 'center', { minWidth: 360, minHeight: 360 }),
  skills: windowRegistration('skills', 'Skills', 'center-left', { minWidth: 320, minHeight: 360 }),
  journal: windowRegistration('journal', 'Journal', 'center', { minWidth: 420, minHeight: 360 }),
  market: windowRegistration('market', 'Market', 'center-right', { minWidth: 520, minHeight: 340 }),
  chat: windowRegistration('chat', 'Chat', 'bottom-left', { minWidth: 280, minHeight: 150, canResize: true }),
  map: windowRegistration('map', 'Map', 'center', { minWidth: 520, minHeight: 360, canResize: true }),
  bank: windowRegistration('bank', 'Bank', 'center', { minWidth: 250 }),
  crafting: windowRegistration('crafting', 'Crafting', 'center', { minWidth: 520, minHeight: 420 }),
  character: windowRegistration('character', 'Character', 'center-left', { minWidth: 360 }),
  help: windowRegistration('help', 'Help', 'center', { minWidth: 320, isModal: true }),
  build: windowRegistration('build', 'Build', 'left-side', { minWidth: 360, minHeight: 360 }),
  treasureMap: windowRegistration('treasureMap', 'Treasure Map', 'center', { minWidth: 420, minHeight: 320 }),
  trade: windowRegistration('trade', 'Trade', 'center', { minWidth: 420, isModal: true }),
  merchant: windowRegistration('merchant', 'Merchant', 'center', { minWidth: 420, isModal: true })
};

const largeWindowKeys = new Set(['spellbook', 'journal', 'market', 'map', 'crafting', 'treasureMap', 'trade', 'merchant', 'help']);

function windowRegistration(
  id: string,
  title: string,
  anchorPreset: WindowAnchorPreset,
  options: Partial<Omit<WindowRegistration, 'id' | 'title' | 'anchorPreset'>> = {}
): WindowRegistration {
  return {
    id,
    title,
    anchorPreset,
    isModal: options.isModal ?? false,
    canDrag: options.canDrag ?? true,
    canResize: options.canResize ?? false,
    canClose: options.canClose ?? true,
    rememberPosition: options.rememberPosition ?? true,
    minWidth: options.minWidth ?? 260,
    minHeight: options.minHeight ?? DEFAULT_TITLEBAR_HEIGHT,
    maxWidth: options.maxWidth,
    maxHeight: options.maxHeight,
    contentScrollMode: options.contentScrollMode ?? 'body'
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function viewportFromWindow(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight };
}

function isFiniteRect(rect: Partial<WindowRect>): rect is WindowRect {
  return [rect.x, rect.y, rect.width, rect.height].every((value) => typeof value === 'number' && Number.isFinite(value)) && Number(rect.width) > 0 && Number(rect.height) > 0;
}

export function windowLayerFor(key: string, focusOrder: number): number {
  const registration = windowRegistry[key];
  return (registration?.isModal ? 1000 : 100) + focusOrder;
}

export function sanitizeStoredLayout(raw: unknown, viewport: ViewportSize): StoredWindowLayout {
  if (!raw || typeof raw !== 'object') return {};
  const source = 'windows' in raw && typeof (raw as { windows?: unknown }).windows === 'object' ? (raw as { windows: unknown }).windows : raw;
  if (!source || typeof source !== 'object') return {};
  const layout: StoredWindowLayout = {};
  Object.entries(source as Record<string, unknown>).forEach(([key, value]) => {
    if (!windowRegistry[key] || !value || typeof value !== 'object') return;
    const rect = value as Partial<WindowRect>;
    if (!isFiniteRect(rect)) return;
    layout[key] = clampWindowRect(rect, viewport);
  });
  return layout;
}

export function parseHotbarSourceText(source: string): HotbarBinding | null {
  const [kind, id] = source.split(':');
  if (!kind || !id) return null;
  if (kind === 'item') return { kind, id };
  if (kind === 'tool') return { kind, id };
  if (kind === 'spell') return { kind, id };
  if (kind === 'skill') return { kind, id };
  if (kind === 'action' && ACTION_BINDINGS.has(id as ActionBindingId)) return { kind, id: id as ActionBindingId };
  return null;
}

export function isEditableTargetDescriptor(target: EditableTargetDescriptor): boolean {
  const tag = target.tagName.toUpperCase();
  return target.isContentEditable === true || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (isEditableTargetDescriptor({ tagName: target.tagName, isContentEditable: target.isContentEditable })) return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [data-allow-text-select="true"]'));
}

export function isScrollableTarget(target: EventTarget | null): boolean {
  let element = target instanceof HTMLElement ? target : null;
  while (element) {
    const style = window.getComputedStyle(element);
    const scrollableY = /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
    const scrollableX = /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth;
    if (scrollableY || scrollableX) return true;
    element = element.parentElement;
  }
  return false;
}

export function clampWindowRect(rect: WindowRect, viewport: ViewportSize, options: ClampOptions = {}): WindowRect {
  const margin = options.margin ?? DEFAULT_MARGIN;
  const safeBottom = options.safeBottom ?? DEFAULT_SAFE_BOTTOM;
  const titlebarHeight = options.titlebarHeight ?? DEFAULT_TITLEBAR_HEIGHT;
  const maxWidth = Math.max(260, viewport.width - margin * 2);
  const maxHeight = Math.max(titlebarHeight, viewport.height - safeBottom - margin * 2);
  const width = Math.min(rect.width, maxWidth);
  const height = Math.min(rect.height, maxHeight);
  const maxX = Math.max(margin, viewport.width - margin - width);
  const maxY = Math.max(margin, viewport.height - safeBottom - margin - height);
  return {
    x: Math.round(clamp(rect.x, margin, maxX)),
    y: Math.round(clamp(rect.y, margin, maxY)),
    width: Math.round(width),
    height: Math.round(height)
  };
}

export function defaultWindowRect(key: string, size: Pick<WindowRect, 'width' | 'height'>, viewport: ViewportSize): WindowRect {
  const width = key === 'chat' ? 380 : Math.max(260, size.width);
  const height = key === 'chat' ? 260 : Math.max(DEFAULT_TITLEBAR_HEIGHT, size.height);
  const centerX = Math.round((viewport.width - width) / 2);
  const bottomY = viewport.height - DEFAULT_SAFE_BOTTOM - DEFAULT_MARGIN - height;
  const rightX = viewport.width - DEFAULT_MARGIN - width;
  const positions: Record<string, { x: number; y: number }> = {
    inventory: { x: rightX - 10, y: Math.min(372, bottomY) },
    bank: { x: rightX - 252, y: Math.min(420, bottomY) },
    spellbook: { x: centerX, y: Math.min(118, bottomY) },
    skills: { x: Math.round(viewport.width * 0.52), y: 76 },
    journal: { x: centerX, y: Math.min(72, bottomY) },
    market: { x: centerX, y: Math.min(86, bottomY) },
    crafting: { x: Math.max(DEFAULT_MARGIN, rightX - 270), y: Math.min(90, bottomY) },
    character: { x: 46, y: Math.min(166, bottomY) },
    help: { x: 344, y: 14 },
    build: { x: 12, y: Math.min(184, bottomY) },
    chat: { x: 12, y: Math.max(DEFAULT_MARGIN, bottomY) },
    map: { x: centerX, y: Math.min(74, bottomY) },
    treasureMap: { x: centerX, y: Math.min(104, bottomY) },
    trade: { x: centerX, y: Math.min(Math.round(viewport.height * 0.22), bottomY) },
    merchant: { x: centerX, y: Math.min(Math.round(viewport.height * 0.22), bottomY) }
  };
  const preferred = positions[key] ?? { x: centerX, y: Math.min(96, bottomY) };
  return clampWindowRect({ x: preferred.x, y: preferred.y, width, height }, viewport);
}

export function windowKeyForPanel(panel: HTMLElement): string | null {
  for (const [className, key] of panelKeyByClass) {
    if (panel.classList.contains(className)) return key;
  }
  return null;
}

export function windowQaWarningsForManagedWindows(observations: ManagedWindowQaObservation[], context: WindowQaContext): string[] {
  const warnings: string[] = [];
  const zIndexOwners = new Map<number, string[]>();
  observations.forEach((window) => {
    const headerRight = window.headerRect.x + window.headerRect.width;
    const headerBottom = window.headerRect.y + window.headerRect.height;
    const panelBottom = window.rect.y + window.rect.height;
    if (window.headerRect.x < 0 || window.headerRect.y < 0 || headerRight > context.viewport.width || headerBottom > context.viewport.height) {
      warnings.push(`${window.id} title bar is outside the viewport`);
    }
    if (panelBottom > context.hotbarTop + 1) {
      warnings.push(`${window.id} overlaps the hotbar safe area`);
    }
    if (!window.hasMaxHeight) {
      warnings.push(`${window.id} is managed without a max-height constraint`);
    }
    if (window.needsScroll && window.contentScrollMode !== 'none' && !window.hasInternalScrollRegion) {
      warnings.push(`${window.id} content overflows without an internal scroll region`);
    }
    zIndexOwners.set(window.zIndex, [...(zIndexOwners.get(window.zIndex) ?? []), window.id]);
  });
  zIndexOwners.forEach((owners, zIndex) => {
    if (owners.length > 1) warnings.push(`duplicate z-index ${zIndex} for ${owners.join(', ')}`);
  });
  return warnings;
}

export function collectWindowQaWarnings(container: HTMLElement, viewport: ViewportSize = viewportFromWindow()): string[] {
  const hotbarTop = container.querySelector<HTMLElement>('.hotbar')?.getBoundingClientRect().top ?? viewport.height - DEFAULT_SAFE_BOTTOM;
  const observations = Array.from(container.querySelectorAll<HTMLElement>('.managed-window')).map((panel) => {
    const key = panel.dataset.windowKey ?? windowKeyForPanel(panel) ?? 'unknown';
    const registration = windowRegistry[key];
    const header = panel.querySelector<HTMLElement>('header');
    const panelRect = panel.getBoundingClientRect();
    const headerRect = header?.getBoundingClientRect() ?? panelRect;
    const computed = window.getComputedStyle(panel);
    const hasInternalScrollRegion = hasScrollableRegion(panel);
    return {
      id: key,
      rect: rectFromDom(panelRect),
      headerRect: rectFromDom(headerRect),
      zIndex: Number(computed.zIndex || panel.style.zIndex || 0),
      isModal: registration?.isModal ?? panel.dataset.windowModal === 'true',
      contentScrollMode: registration?.contentScrollMode ?? 'body',
      hasMaxHeight: computed.maxHeight !== 'none' || Boolean(panel.style.maxHeight),
      needsScroll: panel.scrollHeight > panel.clientHeight + 1,
      hasInternalScrollRegion
    };
  });
  return windowQaWarningsForManagedWindows(observations, { viewport, hotbarTop });
}

export function captureManagedScrollPositions(container: HTMLElement): ManagedScrollSnapshot[] {
  const snapshot: ManagedScrollSnapshot[] = [];
  const panels = Array.from(container.querySelectorAll<HTMLElement>('.managed-window'));
  panels.forEach((panel) => {
    const windowKey = panel.dataset.windowKey ?? windowKeyForPanel(panel);
    if (!windowKey) return;
    const candidates = [panel, ...Array.from(panel.querySelectorAll<HTMLElement>('*'))];
    candidates.forEach((element) => {
      if (element.scrollTop <= 0 && element.scrollLeft <= 0) return;
      if (!canElementScroll(element)) return;
      const path = elementPathWithin(panel, element);
      if (!path) return;
      snapshot.push({ windowKey, path, scrollTop: element.scrollTop, scrollLeft: element.scrollLeft });
    });
  });
  return snapshot;
}

export function restoreManagedScrollPositions(container: HTMLElement, snapshot: ManagedScrollSnapshot[]): void {
  snapshot.forEach((entry) => {
    const panel = container.querySelector<HTMLElement>(`.managed-window[data-window-key="${cssEscape(entry.windowKey)}"]`);
    if (!panel) return;
    const element = elementFromPath(panel, entry.path);
    if (!element || !canElementScroll(element)) return;
    element.scrollTop = Math.max(0, Math.min(entry.scrollTop, element.scrollHeight - element.clientHeight));
    element.scrollLeft = Math.max(0, Math.min(entry.scrollLeft, element.scrollWidth - element.clientWidth));
  });
}

interface ActiveWindowDrag {
  pointerId: number;
  panel: HTMLElement;
  key: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

export class WindowManager {
  private windows = new Map<string, ManagedWindowState>();
  private savedLayout: StoredWindowLayout;
  private activeDrag: ActiveWindowDrag | null = null;
  private focusCounter = 0;
  private reportedQaWarnings = new Set<string>();
  private resizeObserver: ResizeObserver | null = null;

  constructor(private root: HTMLElement) {
    this.savedLayout = this.loadSavedLayout();
  }

  decorate(container: HTMLElement = this.root): void {
    const viewport = viewportFromWindow();
    this.resizeObserver?.disconnect();
    this.resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => this.handleResizeEntries(entries)) : null;
    const panels = Array.from(container.querySelectorAll<HTMLElement>('.panel'));
    panels.forEach((panel) => {
      const key = windowKeyForPanel(panel);
      if (!key) return;
      const registration = windowRegistry[key];
      if (!registration) return;
      const header = panel.querySelector<HTMLElement>('header');
      if (!header) return;
      const measured = panel.getBoundingClientRect();
      const size = {
        width: Math.max(registration.minWidth, measured.width || panel.offsetWidth || registration.minWidth),
        height: Math.max(registration.minHeight, measured.height || panel.offsetHeight || registration.minHeight)
      };
      const current = this.windows.get(key);
      const persisted = this.savedLayout[key];
      const seed = current ? { x: current.x, y: current.y, width: current.width, height: current.height } : persisted ?? null;
      const seedSize = seed ? { width: Math.max(registration.minWidth, seed.width), height: Math.max(registration.minHeight, seed.height) } : size;
      const rect = seed ? clampWindowRect({ ...seed, ...seedSize }, viewport) : defaultWindowRect(key, size, viewport);
      const state: ManagedWindowState = {
        id: key,
        title: registration.title,
        isOpen: true,
        isModal: registration.isModal,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        minWidth: registration.minWidth,
        minHeight: registration.minHeight,
        maxWidth: registration.maxWidth ?? viewport.width - DEFAULT_MARGIN * 2,
        maxHeight: registration.maxHeight ?? viewport.height - DEFAULT_SAFE_BOTTOM - DEFAULT_MARGIN * 2,
        zIndex: current?.zIndex ?? windowLayerFor(key, ++this.focusCounter),
        anchorPreset: registration.anchorPreset,
        canDrag: registration.canDrag,
        canResize: registration.canResize,
        canClose: registration.canClose,
        rememberPosition: registration.rememberPosition,
        lastFocusedAt: current?.lastFocusedAt ?? performance.now(),
        contentScrollMode: registration.contentScrollMode
      };
      this.windows.set(key, state);
      panel.dataset.windowKey = key;
      panel.dataset.windowModal = String(registration.isModal);
      panel.classList.add('managed-window');
      panel.classList.toggle('window-modal', registration.isModal);
      panel.classList.toggle('window-resizable', registration.canResize);
      panel.classList.toggle('window-fullscreen-fallback', viewport.width < SMALL_VIEWPORT_WIDTH && largeWindowKeys.has(key));
      if (registration.canDrag) {
        header.dataset.windowDragHandle = 'true';
        header.title = 'Drag window';
      } else {
        delete header.dataset.windowDragHandle;
        header.removeAttribute('title');
      }
      this.applyPanelRect(panel, state);
      if (registration.canResize) this.resizeObserver?.observe(panel);
    });
    this.assertWindowHealth(container, viewport);
  }

  resetLayout(container: HTMLElement = this.root): void {
    this.windows.clear();
    this.savedLayout = {};
    this.focusCounter = 0;
    this.clearSavedLayout();
    this.decorate(container);
  }

  handlePointerDown(event: PointerEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (!target || isEditableTarget(target)) return false;
    const panel = target.closest<HTMLElement>('.managed-window');
    if (panel) this.bringPanelToFront(panel);
    const handle = target.closest<HTMLElement>('[data-window-drag-handle="true"]');
    if (!handle || !panel || target.closest('button, input, textarea, select, a, [data-no-window-drag="true"]')) return false;
    const key = panel.dataset.windowKey;
    const state = key ? this.windows.get(key) : null;
    if (!key || !state || !state.canDrag) return false;
    if (event.cancelable) event.preventDefault();
    handle.setPointerCapture?.(event.pointerId);
    panel.classList.add('window-dragging');
    this.activeDrag = {
      pointerId: event.pointerId,
      panel,
      key,
      startX: event.clientX,
      startY: event.clientY,
      originX: state.x,
      originY: state.y
    };
    return true;
  }

  handlePointerMove(event: PointerEvent): boolean {
    if (!this.activeDrag || this.activeDrag.pointerId !== event.pointerId) return false;
    const viewport = viewportFromWindow();
    const current = this.windows.get(this.activeDrag.key);
    if (!current) return false;
    const rect = clampWindowRect(
      {
        ...current,
        x: this.activeDrag.originX + event.clientX - this.activeDrag.startX,
        y: this.activeDrag.originY + event.clientY - this.activeDrag.startY
      },
      viewport
    );
    const next = { ...current, ...rect };
    this.windows.set(this.activeDrag.key, next);
    this.applyPanelRect(this.activeDrag.panel, next);
    if (event.cancelable) event.preventDefault();
    return true;
  }

  handlePointerEnd(event: PointerEvent): boolean {
    if (!this.activeDrag || this.activeDrag.pointerId !== event.pointerId) return false;
    this.activeDrag.panel.classList.remove('window-dragging');
    (event.target as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
    this.persistLayout();
    this.activeDrag = null;
    if (event.cancelable) event.preventDefault();
    return true;
  }

  cancelDrag(): boolean {
    if (!this.activeDrag) return false;
    this.activeDrag.panel.classList.remove('window-dragging');
    this.activeDrag = null;
    return true;
  }

  hasActiveDrag(): boolean {
    return this.activeDrag != null;
  }

  pointerCaptureStatus(): string | null {
    return this.activeDrag ? `window:${this.activeDrag.key}:${this.activeDrag.pointerId}` : null;
  }

  debugState(container: HTMLElement = this.root): { topmostWindow: string; pointerCapture: string | null } {
    return {
      topmostWindow: this.topmostWindowKey(container) ?? 'none',
      pointerCapture: this.pointerCaptureStatus()
    };
  }

  topmostWindowKey(container: HTMLElement = this.root): string | null {
    const panels = Array.from(container.querySelectorAll<HTMLElement>('.managed-window'));
    let topKey: string | null = null;
    let topZ = -Infinity;
    panels.forEach((panel) => {
      const key = panel.dataset.windowKey;
      if (!key) return;
      const z = Number(panel.style.zIndex || this.windows.get(key)?.zIndex || 0);
      if (z > topZ) {
        topKey = key;
        topZ = z;
      }
    });
    return topKey;
  }

  private bringPanelToFront(panel: HTMLElement): void {
    const key = panel.dataset.windowKey;
    if (!key) return;
    const current = this.windows.get(key);
    if (!current) return;
    const zIndex = windowLayerFor(key, ++this.focusCounter);
    const next = { ...current, zIndex, lastFocusedAt: performance.now() };
    this.windows.set(key, next);
    this.applyPanelRect(panel, next);
  }

  private loadSavedLayout(): StoredWindowLayout {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY);
      if (!raw) return {};
      return sanitizeStoredLayout(JSON.parse(raw), viewportFromWindow());
    } catch {
      this.clearSavedLayout();
      return {};
    }
  }

  private persistLayout(): void {
    if (typeof localStorage === 'undefined') return;
    const windows: StoredWindowLayout = {};
    this.windows.forEach((state, key) => {
      if (!state.rememberPosition) return;
      windows[key] = { x: state.x, y: state.y, width: state.width, height: state.height };
    });
    localStorage.setItem(WINDOW_LAYOUT_STORAGE_KEY, JSON.stringify({ version: 1, windows }));
  }

  private clearSavedLayout(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(WINDOW_LAYOUT_STORAGE_KEY);
  }

  private applyPanelRect(panel: HTMLElement, rect: ManagedWindowState): void {
    panel.style.left = `${rect.x}px`;
    panel.style.top = `${rect.y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.transform = 'none';
    panel.style.minWidth = `${rect.minWidth}px`;
    panel.style.minHeight = `${rect.minHeight}px`;
    panel.style.width = `${rect.width}px`;
    panel.style.height = `${rect.height}px`;
    panel.style.maxWidth = `${rect.canResize ? rect.maxWidth : rect.width}px`;
    panel.style.maxHeight = `${rect.canResize ? rect.maxHeight : rect.height}px`;
    panel.style.zIndex = String(rect.zIndex);
    if (rect.canResize) panel.dataset.windowResize = 'true';
    else delete panel.dataset.windowResize;
  }

  private handleResizeEntries(entries: ResizeObserverEntry[]): void {
    const viewport = viewportFromWindow();
    for (const entry of entries) {
      const panel = entry.target instanceof HTMLElement ? entry.target : null;
      const key = panel?.dataset.windowKey;
      const current = key ? this.windows.get(key) : null;
      if (!panel || !key || !current?.canResize) continue;
      const domRect = panel.getBoundingClientRect();
      const measuredWidth = Math.round(domRect.width || entry.contentRect.width || panel.offsetWidth || current.width);
      const measuredHeight = Math.round(domRect.height || entry.contentRect.height || panel.offsetHeight || current.height);
      const rect = clampWindowRect({ ...current, width: Math.max(current.minWidth, measuredWidth), height: Math.max(current.minHeight, measuredHeight) }, viewport);
      if (Math.abs(rect.width - current.width) < 2 && Math.abs(rect.height - current.height) < 2) continue;
      const next = { ...current, ...rect };
      this.windows.set(key, next);
      this.applyPanelRect(panel, next);
      this.persistLayout();
    }
  }

  private assertWindowHealth(container: HTMLElement, viewport: ViewportSize): void {
    if (!isDevRuntime()) return;
    const warnings = collectWindowQaWarnings(container, viewport);
    warnings.forEach((warning) => {
      if (this.reportedQaWarnings.has(warning)) return;
      this.reportedQaWarnings.add(warning);
      console.warn(`[ui-window-qa] ${warning}`);
    });
  }
}

function rectFromDom(rect: DOMRect): WindowRect {
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

function hasScrollableRegion(panel: HTMLElement): boolean {
  const candidates = [panel, ...Array.from(panel.querySelectorAll<HTMLElement>('*'))];
  return candidates.some((element) => canElementScroll(element));
}

function canElementScroll(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const overflowY = `${style.overflowY} ${style.overflow}`;
  const overflowX = `${style.overflowX} ${style.overflow}`;
  const canScrollY = /(auto|scroll)/.test(overflowY) && element.scrollHeight > element.clientHeight + 1;
  const canScrollX = /(auto|scroll)/.test(overflowX) && element.scrollWidth > element.clientWidth + 1;
  return canScrollY || canScrollX;
}

function elementPathWithin(root: HTMLElement, element: HTMLElement): number[] | null {
  const path: number[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== root) {
    const parentElement: HTMLElement | null = current.parentElement;
    if (!parentElement) return null;
    path.unshift(Array.prototype.indexOf.call(parentElement.children, current));
    current = parentElement;
  }
  return current === root ? path : null;
}

function elementFromPath(root: HTMLElement, path: number[]): HTMLElement | null {
  let current: HTMLElement = root;
  for (const index of path) {
    const next = current.children.item(index);
    if (!(next instanceof HTMLElement)) return null;
    current = next;
  }
  return current;
}

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
}

function isDevRuntime(): boolean {
  return Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
}

export type WindowId = 'inventory' | 'spellbook' | 'skills' | 'journal' | 'market' | 'help' | 'chat' | 'map';
export type WindowLayout = WindowRect;
export type ResizeMode = 'none' | 'horizontal' | 'vertical' | 'both';
export type WindowPreset = 'default' | 'compact' | 'large' | 'combat' | 'crafting' | 'exploration' | 'stream';

export interface WindowDefinition {
  id: WindowId;
  title: string;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  resizable: ResizeMode;
  zIndex: number;
  safeAreaBehavior: 'avoid-hotbar' | 'free';
}

export interface WindowLayoutDelta {
  dx: number;
  dy: number;
  mode: 'move' | 'resize';
}

const EDGE = 8;
const HOTBAR_SAFE = 96;

export const windowDefinitions: Record<WindowId, WindowDefinition> = {
  inventory: { id: 'inventory', title: 'Inventory', minWidth: 232, minHeight: 280, maxWidth: 520, maxHeight: 620, resizable: 'both', zIndex: 32, safeAreaBehavior: 'avoid-hotbar' },
  spellbook: { id: 'spellbook', title: 'Spellbook', minWidth: 620, minHeight: 400, maxWidth: 980, maxHeight: 720, resizable: 'both', zIndex: 48, safeAreaBehavior: 'avoid-hotbar' },
  skills: { id: 'skills', title: 'Skills', minWidth: 360, minHeight: 360, maxWidth: 900, maxHeight: 720, resizable: 'both', zIndex: 44, safeAreaBehavior: 'avoid-hotbar' },
  journal: { id: 'journal', title: 'Journal', minWidth: 560, minHeight: 360, maxWidth: 940, maxHeight: 720, resizable: 'both', zIndex: 45, safeAreaBehavior: 'avoid-hotbar' },
  market: { id: 'market', title: 'Market', minWidth: 620, minHeight: 360, maxWidth: 1080, maxHeight: 720, resizable: 'both', zIndex: 46, safeAreaBehavior: 'avoid-hotbar' },
  help: { id: 'help', title: 'Help', minWidth: 380, minHeight: 300, maxWidth: 620, maxHeight: 620, resizable: 'both', zIndex: 42, safeAreaBehavior: 'avoid-hotbar' },
  chat: { id: 'chat', title: 'Chat', minWidth: 280, minHeight: 150, maxWidth: 640, maxHeight: 480, resizable: 'both', zIndex: 38, safeAreaBehavior: 'avoid-hotbar' },
  map: { id: 'map', title: 'Map', minWidth: 520, minHeight: 360, maxWidth: 1040, maxHeight: 760, resizable: 'both', zIndex: 47, safeAreaBehavior: 'avoid-hotbar' }
};

export const managedWindowIds = Object.keys(windowDefinitions) as WindowId[];

export function resolveWindowLayout(id: WindowId, saved: Partial<WindowLayout> | undefined, viewport: ViewportSize, preset: WindowPreset = 'default'): WindowLayout {
  const base = { ...presetLayout(id, viewport, preset), ...saved };
  return clampLayout(id, base, viewport);
}

export function updateWindowLayout(id: WindowId, current: WindowLayout, delta: WindowLayoutDelta, viewport: ViewportSize): WindowLayout {
  if (delta.mode === 'move') {
    return clampLayout(id, { ...current, x: current.x + delta.dx, y: current.y + delta.dy }, viewport);
  }
  const def = windowDefinitions[id];
  const width = def.resizable === 'horizontal' || def.resizable === 'both' ? current.width + delta.dx : current.width;
  const height = def.resizable === 'vertical' || def.resizable === 'both' ? current.height + delta.dy : current.height;
  return clampLayout(id, { ...current, width, height }, viewport);
}

export function resolveWindowZIndex(id: WindowId, focusOrder: WindowId[] = []): number {
  const focusIndex = focusOrder.indexOf(id);
  if (focusIndex < 0) return windowDefinitions[id].zIndex;
  return 1000 + focusIndex;
}

export function updateWindowFocusOrder(focusOrder: WindowId[], id: WindowId): WindowId[] {
  return [...focusOrder.filter((windowId) => windowId !== id), id];
}

export function applyWindowPreset(preset: WindowPreset, viewport: ViewportSize): Record<WindowId, WindowLayout> {
  return Object.fromEntries(managedWindowIds.map((id) => [id, resolveWindowLayout(id, undefined, viewport, preset)])) as Record<WindowId, WindowLayout>;
}

function presetLayout(id: WindowId, viewport: ViewportSize, preset: WindowPreset): WindowLayout {
  const usableWidth = Math.max(320, viewport.width - EDGE * 2);
  const usableHeight = Math.max(260, viewport.height - HOTBAR_SAFE - EDGE * 2);
  const scale = preset === 'compact' || preset === 'exploration' ? 0.78 : preset === 'large' ? 1.12 : preset === 'stream' ? 0.92 : 1;
  const size = (width: number, height: number) => ({
    width: Math.min(usableWidth, Math.round(width * scale)),
    height: Math.min(usableHeight, Math.round(height * scale))
  });
  const safeLarge = (width: number, height: number, y = 74): WindowLayout => {
    const safeLeft = viewport.width >= 980 ? 344 : EDGE;
    const clampedWidth = Math.min(width, Math.max(windowDefinitions.spellbook.minWidth, viewport.width - safeLeft - EDGE));
    const centeredX = Math.round((viewport.width - clampedWidth) / 2);
    return {
      x: safeLeft + clampedWidth <= viewport.width - EDGE ? Math.max(centeredX, safeLeft) : centeredX,
      y,
      width: clampedWidth,
      height
    };
  };

  if (preset === 'combat') {
    if (id === 'inventory') return { x: viewport.width - 286, y: 300, width: 270, height: 360 };
    if (id === 'skills') return { x: 16, y: 170, width: 380, height: 440 };
    if (id === 'help') return { x: 344, y: 14, width: 420, height: 560 };
    if (id === 'chat') return { x: EDGE, y: viewport.height - HOTBAR_SAFE - 178, width: 300, height: 170 };
    if (id === 'map') return safeLarge(size(820, 540).width, size(820, 540).height, 66);
  }
  if (preset === 'crafting') {
    if (id === 'inventory') return { x: viewport.width - 304, y: 222, width: 286, height: 440 };
    if (id === 'market') return safeLarge(size(920, 560).width, size(920, 560).height, 76);
    if (id === 'skills') return { x: EDGE, y: 126, width: 390, height: 430 };
    if (id === 'chat') return { x: EDGE, y: viewport.height - HOTBAR_SAFE - 208, width: 340, height: 200 };
    if (id === 'map') return safeLarge(size(860, 540).width, size(860, 540).height, 70);
  }
  if (preset === 'exploration' || preset === 'stream') {
    if (id === 'inventory') return { x: viewport.width - 248, y: viewport.height - HOTBAR_SAFE - 288, width: 232, height: 280 };
    if (id === 'help') return { x: EDGE, y: EDGE, width: 390, height: 430 };
    if (id === 'chat') return { x: EDGE, y: viewport.height - HOTBAR_SAFE - 158, width: 292, height: 150 };
    if (id === 'map') return safeLarge(size(760, 500).width, size(760, 500).height, 56);
  }

  if (id === 'inventory') return { x: viewport.width - 288, y: 372, width: 270, height: Math.min(380, usableHeight - 364) };
  if (id === 'chat') return { x: EDGE, y: viewport.height - HOTBAR_SAFE - 268, width: 380, height: 260 };
  if (id === 'help') return { x: 344, y: 14, ...size(420, 616) };
  if (id === 'map') return safeLarge(size(860, 560).width, size(860, 560).height, 74);
  if (id === 'skills') {
    const width = viewport.width >= 980 ? Math.min(760, viewport.width - 600) : Math.min(usableWidth, Math.round(420 * scale));
    return { x: viewport.width >= 980 ? Math.max(344, Math.round((viewport.width - width) / 2)) : EDGE, y: 88, width, height: Math.min(usableHeight, Math.round(560 * scale)) };
  }
  if (id === 'journal') return safeLarge(size(820, 560).width, size(820, 560).height, 72);
  if (id === 'market') return safeLarge(size(940, 560).width, size(940, 560).height, 86);
  return safeLarge(size(840, 560).width, size(840, 560).height, 78);
}

function clampLayout(id: WindowId, layout: Partial<WindowLayout>, viewport: ViewportSize): WindowLayout {
  const def = windowDefinitions[id];
  const maxWidth = Math.min(def.maxWidth, Math.max(def.minWidth, viewport.width - EDGE * 2));
  const safeBottom = def.safeAreaBehavior === 'avoid-hotbar' ? HOTBAR_SAFE : EDGE;
  const maxHeight = Math.min(def.maxHeight, Math.max(def.minHeight, viewport.height - safeBottom - EDGE));
  const width = clamp(layout.width ?? def.minWidth, def.minWidth, maxWidth);
  const height = clamp(layout.height ?? def.minHeight, def.minHeight, maxHeight);
  const x = clamp(layout.x ?? EDGE, EDGE, Math.max(EDGE, viewport.width - width - EDGE));
  const y = clamp(layout.y ?? EDGE, EDGE, Math.max(EDGE, viewport.height - safeBottom - height));
  return { x, y, width, height };
}

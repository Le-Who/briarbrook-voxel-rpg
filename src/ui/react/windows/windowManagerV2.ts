export const REACT_WINDOW_LAYOUT_VERSION = 2;

export type ReactWindowId =
  | 'status'
  | 'target'
  | 'inventory'
  | 'bank'
  | 'hotbar'
  | 'spellbook'
  | 'crafting'
  | 'market'
  | 'journal'
  | 'professionAtlas'
  | 'adventureMap'
  | 'build'
  | 'chat'
  | 'help'
  | 'settings'
  | 'tooltip'
  | 'toast';

export type ReactWindowType = 'docked' | 'floating' | 'modal' | 'workspace' | 'overlay';
export type ReactUIMode = 'Exploration' | 'Combat' | 'Crafting' | 'Build' | 'Planning' | 'MenuPause';
export type ReactLayoutPreset = 'RestoreDefault' | 'Combat' | 'Build' | 'Planning' | 'Crafting';
export type ReactWindowDock = 'none' | 'left' | 'right' | 'bottom' | 'top' | 'center';

export interface ReactViewport {
  width: number;
  height: number;
}

export interface ReactWindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReactWindowDefinition {
  id: ReactWindowId;
  title: string;
  type: ReactWindowType;
  defaultRect: ReactWindowRect;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  resizable: boolean;
  draggable: boolean;
  collapsible: boolean;
  closeBehavior: 'close' | 'collapse' | 'hide' | 'disabled';
  escBehavior: 'close' | 'collapse' | 'ignore';
  safeAreaPolicy: 'avoid-hotbar' | 'viewport' | 'free';
  hiddenInCombat: boolean;
  hiddenInPlanning: boolean;
  persistsLayout: boolean;
  zLayer: number;
}

export interface ReactWindowLayoutState {
  rect: ReactWindowRect;
  open: boolean;
  collapsed: boolean;
  dock: ReactWindowDock;
}

export interface ReactWindowPersistenceEntry {
  rect: ReactWindowRect;
  collapsed: boolean;
  advanced: boolean;
}

export interface ReactWindowPersistence {
  version: typeof REACT_WINDOW_LAYOUT_VERSION;
  windows: Partial<Record<ReactWindowId, ReactWindowPersistenceEntry>>;
  pinnedWindows: ReactWindowId[];
  layoutPreset: ReactLayoutPreset;
  uiScale: number;
  compactMode: boolean;
}

export interface WorkspacePolicyRequest {
  openPanels: ReactWindowId[];
  pinnedPanels: ReactWindowId[];
}

export interface WorkspacePolicy {
  mode: ReactUIMode;
  workspaceId: ReactWindowId | null;
  visiblePanels: ReactWindowId[];
  collapsedPanels: ReactWindowId[];
  hiddenPanels: ReactWindowId[];
  focusTrap: boolean;
}

const EDGE = 8;
const HOTBAR_SAFE_BOTTOM = 96;

export const reactWindowDefinitions: Record<ReactWindowId, ReactWindowDefinition> = {
  status: contract('status', 'Status', 'docked', { x: 12, y: 12, width: 320, height: 180 }, { persistsLayout: false, resizable: false, draggable: false, collapsible: false, closeBehavior: 'disabled', escBehavior: 'ignore', zLayer: 80 }),
  target: contract('target', 'Target', 'docked', { x: 1032, y: 16, width: 320, height: 140 }, { persistsLayout: false, resizable: false, draggable: false, collapsible: false, closeBehavior: 'disabled', escBehavior: 'ignore', zLayer: 82 }),
  inventory: contract('inventory', 'Inventory', 'floating', { x: 1078, y: 260, width: 270, height: 410 }, { minWidth: 232, minHeight: 280, maxWidth: 520, maxHeight: 620, resizable: true, hiddenInCombat: true }),
  bank: contract('bank', 'Bank', 'floating', { x: 690, y: 238, width: 290, height: 390 }, { minWidth: 250, minHeight: 260, maxWidth: 560, maxHeight: 620, resizable: true, hiddenInCombat: true, hiddenInPlanning: true }),
  hotbar: contract('hotbar', 'Hotbar', 'docked', { x: 344, y: 634, width: 590, height: 54 }, { persistsLayout: false, resizable: false, draggable: false, collapsible: false, closeBehavior: 'disabled', escBehavior: 'ignore', safeAreaPolicy: 'viewport', zLayer: 90 }),
  spellbook: contract('spellbook', 'Spellbook', 'floating', { x: 304, y: 68, width: 760, height: 596 }, { minWidth: 620, minHeight: 420, maxWidth: 980, maxHeight: 680, resizable: true }),
  crafting: contract('crafting', 'Crafting', 'floating', { x: 356, y: 96, width: 700, height: 530 }, { minWidth: 520, minHeight: 420, maxWidth: 980, maxHeight: 680, resizable: true, hiddenInCombat: true, hiddenInPlanning: true }),
  market: contract('market', 'Market', 'floating', { x: 350, y: 100, width: 730, height: 510 }, { minWidth: 560, minHeight: 360, maxWidth: 1040, maxHeight: 680, resizable: true, hiddenInCombat: true, hiddenInPlanning: true }),
  journal: contract('journal', 'Journal', 'floating', { x: 330, y: 84, width: 720, height: 540 }, { minWidth: 520, minHeight: 360, maxWidth: 980, maxHeight: 680, resizable: true }),
  professionAtlas: contract('professionAtlas', 'Profession Atlas', 'workspace', { x: 96, y: 56, width: 1160, height: 600 }, { minWidth: 720, minHeight: 460, maxWidth: 1280, maxHeight: 760, draggable: false, resizable: true, closeBehavior: 'close', escBehavior: 'close', hiddenInCombat: true, zLayer: 1200 }),
  adventureMap: contract('adventureMap', 'Adventure Map', 'workspace', { x: 110, y: 58, width: 1120, height: 590 }, { minWidth: 700, minHeight: 440, maxWidth: 1240, maxHeight: 740, draggable: false, resizable: true, closeBehavior: 'close', escBehavior: 'close', hiddenInCombat: true, zLayer: 1190 }),
  build: contract('build', 'Build', 'floating', { x: 12, y: 116, width: 370, height: 540 }, { minWidth: 340, minHeight: 380, maxWidth: 520, maxHeight: 680, resizable: true, hiddenInCombat: true, hiddenInPlanning: true }),
  chat: contract('chat', 'Chat', 'floating', { x: 12, y: 410, width: 430, height: 310 }, { minWidth: 320, minHeight: 180, maxWidth: 640, maxHeight: 500, resizable: true }),
  help: contract('help', 'Help', 'modal', { x: 420, y: 78, width: 460, height: 520 }, { minWidth: 360, minHeight: 320, maxWidth: 680, maxHeight: 680, resizable: true, zLayer: 1300 }),
  settings: contract('settings', 'Settings', 'modal', { x: 430, y: 84, width: 500, height: 560 }, { minWidth: 380, minHeight: 360, maxWidth: 720, maxHeight: 680, resizable: true, zLayer: 1310 }),
  tooltip: contract('tooltip', 'Tooltip', 'overlay', { x: 0, y: 0, width: 320, height: 160 }, { persistsLayout: false, resizable: false, draggable: false, collapsible: false, closeBehavior: 'hide', escBehavior: 'ignore', safeAreaPolicy: 'viewport', zLayer: 1800 }),
  toast: contract('toast', 'Toast', 'overlay', { x: 960, y: 96, width: 360, height: 240 }, { persistsLayout: false, resizable: false, draggable: false, collapsible: false, closeBehavior: 'hide', escBehavior: 'ignore', safeAreaPolicy: 'viewport', zLayer: 1700 })
};

export function resolveReactWindowLayout(id: ReactWindowId, saved: Partial<ReactWindowRect> | null | undefined, viewport: ReactViewport): ReactWindowRect {
  const definition = reactWindowDefinitions[id];
  const base = saved ? { ...definition.defaultRect, ...saved } : defaultRectFor(id, viewport);
  return clampReactWindowRect(definition, base, viewport);
}

export function resolveWorkspacePolicy(mode: ReactUIMode, request: WorkspacePolicyRequest): WorkspacePolicy {
  const open = new Set(request.openPanels);
  const pinned = new Set(request.pinnedPanels);
  const workspaceId = pickWorkspace(mode, request.openPanels);
  const visible = new Set<ReactWindowId>();
  const collapsed = new Set<ReactWindowId>();
  const hidden = new Set<ReactWindowId>();

  if (mode === 'Combat') {
    ['status', 'target', 'hotbar', 'chat'].forEach((id) => visible.add(id as ReactWindowId));
    if (open.has('inventory')) (pinned.has('inventory') ? visible : collapsed).add('inventory');
    for (const id of open) if (reactWindowDefinitions[id].hiddenInCombat && !visible.has(id)) hidden.add(id);
  } else if (mode === 'Build') {
    ['status', 'hotbar', 'build', 'inventory', 'chat'].forEach((id) => visible.add(id as ReactWindowId));
    for (const id of open) if (!visible.has(id) && !pinned.has(id)) collapsed.add(id);
  } else if (mode === 'Crafting') {
    ['status', 'hotbar', 'crafting', 'inventory', 'bank', 'chat'].forEach((id) => visible.add(id as ReactWindowId));
    for (const id of open) if (!visible.has(id) && !pinned.has(id)) collapsed.add(id);
  } else if (mode === 'Planning') {
    if (workspaceId) visible.add(workspaceId);
    ['journal', 'hotbar', 'status'].forEach((id) => visible.add(id as ReactWindowId));
    request.pinnedPanels.forEach((id) => visible.add(id));
    for (const id of open) {
      if (visible.has(id)) continue;
      if (reactWindowDefinitions[id].hiddenInPlanning || id === 'inventory' || id === 'chat') collapsed.add(id);
      else visible.add(id);
    }
  } else if (mode === 'MenuPause') {
    ['help', 'settings'].forEach((id) => {
      if (open.has(id as ReactWindowId)) visible.add(id as ReactWindowId);
    });
    ['hotbar', 'status'].forEach((id) => visible.add(id as ReactWindowId));
    for (const id of open) if (!visible.has(id) && !pinned.has(id)) collapsed.add(id);
  } else {
    request.openPanels.forEach((id) => visible.add(id));
    ['status', 'hotbar', 'target'].forEach((id) => visible.add(id as ReactWindowId));
  }

  return {
    mode,
    workspaceId,
    visiblePanels: sortWindows([...visible]),
    collapsedPanels: sortWindows([...collapsed]),
    hiddenPanels: sortWindows([...hidden]),
    focusTrap: Boolean(workspaceId) || mode === 'MenuPause'
  };
}

export function createReactLayoutPreset(preset: ReactLayoutPreset, viewport: ReactViewport): Record<ReactWindowId, ReactWindowLayoutState> {
  const entries = Object.keys(reactWindowDefinitions).map((key) => {
    const id = key as ReactWindowId;
    const rect = resolveReactWindowLayout(id, presetRect(id, preset, viewport), viewport);
    return [id, { rect, ...presetState(id, preset) }];
  });
  return Object.fromEntries(entries) as Record<ReactWindowId, ReactWindowLayoutState>;
}

export function resetReactWindowLayout(id: ReactWindowId, viewport: ReactViewport): ReactWindowLayoutState {
  return {
    rect: resolveReactWindowLayout(id, null, viewport),
    open: defaultOpen(id),
    collapsed: false,
    dock: defaultDock(id)
  };
}

export function migrateReactWindowPersistence(raw: unknown, viewport: ReactViewport): ReactWindowPersistence {
  const fallback = defaultReactWindowPersistence(viewport);
  if (!raw || typeof raw !== 'object') return fallback;
  const source = raw as { version?: unknown; windows?: unknown; pinnedWindows?: unknown; layoutPreset?: unknown; uiScale?: unknown; compactMode?: unknown };
  const rawWindows = source.windows && typeof source.windows === 'object' ? (source.windows as Record<string, unknown>) : {};
  const windows: ReactWindowPersistence['windows'] = {};

  for (const [key, value] of Object.entries(rawWindows)) {
    if (!isReactWindowId(key) || !value || typeof value !== 'object') continue;
    const maybeEntry = value as Partial<ReactWindowPersistenceEntry & ReactWindowRect>;
    const rectSource = isRect(maybeEntry.rect) ? maybeEntry.rect : isRect(maybeEntry) ? maybeEntry : null;
    if (!rectSource) continue;
    windows[key] = {
      rect: resolveReactWindowLayout(key, rectSource, viewport),
      collapsed: Boolean(maybeEntry.collapsed),
      advanced: Boolean(maybeEntry.advanced)
    };
  }

  return {
    version: REACT_WINDOW_LAYOUT_VERSION,
    windows,
    pinnedWindows: Array.isArray(source.pinnedWindows) ? source.pinnedWindows.filter(isReactWindowId) : [],
    layoutPreset: isReactLayoutPreset(source.layoutPreset) ? source.layoutPreset : 'RestoreDefault',
    uiScale: typeof source.uiScale === 'number' && Number.isFinite(source.uiScale) ? clamp(source.uiScale, 0.8, 1.25) : fallback.uiScale,
    compactMode: typeof source.compactMode === 'boolean' ? source.compactMode : fallback.compactMode
  };
}

export function defaultReactWindowPersistence(_viewport: ReactViewport): ReactWindowPersistence {
  return {
    version: REACT_WINDOW_LAYOUT_VERSION,
    windows: {},
    pinnedWindows: [],
    layoutPreset: 'RestoreDefault',
    uiScale: 1,
    compactMode: false
  };
}

function contract(
  id: ReactWindowId,
  title: string,
  type: ReactWindowType,
  defaultRect: ReactWindowRect,
  overrides: Partial<Omit<ReactWindowDefinition, 'id' | 'title' | 'type' | 'defaultRect'>> = {}
): ReactWindowDefinition {
  return {
    id,
    title,
    type,
    defaultRect,
    minWidth: overrides.minWidth ?? Math.min(defaultRect.width, 260),
    minHeight: overrides.minHeight ?? Math.min(defaultRect.height, 160),
    maxWidth: overrides.maxWidth ?? Math.max(defaultRect.width, 640),
    maxHeight: overrides.maxHeight ?? Math.max(defaultRect.height, 520),
    resizable: overrides.resizable ?? (type === 'floating' || type === 'workspace' || type === 'modal'),
    draggable: overrides.draggable ?? (type === 'floating' || type === 'modal'),
    collapsible: overrides.collapsible ?? type === 'floating',
    closeBehavior: overrides.closeBehavior ?? (type === 'docked' ? 'disabled' : 'close'),
    escBehavior: overrides.escBehavior ?? (type === 'modal' || type === 'workspace' ? 'close' : 'ignore'),
    safeAreaPolicy: overrides.safeAreaPolicy ?? 'avoid-hotbar',
    hiddenInCombat: overrides.hiddenInCombat ?? false,
    hiddenInPlanning: overrides.hiddenInPlanning ?? false,
    persistsLayout: overrides.persistsLayout ?? (type === 'floating' || type === 'workspace' || type === 'modal'),
    zLayer: overrides.zLayer ?? (type === 'workspace' ? 1100 : type === 'modal' ? 1200 : type === 'overlay' ? 1700 : 300)
  };
}

function defaultRectFor(id: ReactWindowId, viewport: ReactViewport): ReactWindowRect {
  const def = reactWindowDefinitions[id];
  if (def.type === 'workspace') {
    const width = Math.min(def.maxWidth, Math.max(def.minWidth, viewport.width - 96));
    const height = Math.min(def.maxHeight, Math.max(def.minHeight, viewport.height - HOTBAR_SAFE_BOTTOM - 64));
    return { x: Math.round((viewport.width - width) / 2), y: 40, width, height };
  }
  if (id === 'hotbar') return { x: Math.round((viewport.width - def.defaultRect.width) / 2), y: viewport.height - 78, width: def.defaultRect.width, height: def.defaultRect.height };
  if (id === 'inventory') return { ...def.defaultRect, x: viewport.width - def.defaultRect.width - 18, y: viewport.height - HOTBAR_SAFE_BOTTOM - def.defaultRect.height - 10 };
  if (id === 'chat') return { ...def.defaultRect, y: viewport.height - HOTBAR_SAFE_BOTTOM - def.defaultRect.height - 10 };
  return { ...def.defaultRect };
}

function clampReactWindowRect(definition: ReactWindowDefinition, rect: Partial<ReactWindowRect>, viewport: ReactViewport): ReactWindowRect {
  const safeBottom = definition.safeAreaPolicy === 'avoid-hotbar' ? HOTBAR_SAFE_BOTTOM : EDGE;
  const maxWidth = Math.min(definition.maxWidth, Math.max(definition.minWidth, viewport.width - EDGE * 2));
  const maxHeight = Math.min(definition.maxHeight, Math.max(definition.minHeight, viewport.height - safeBottom - EDGE * 2));
  const width = clamp(rect.width ?? definition.defaultRect.width, definition.minWidth, maxWidth);
  const height = clamp(rect.height ?? definition.defaultRect.height, definition.minHeight, maxHeight);
  const x = clamp(rect.x ?? definition.defaultRect.x, EDGE, Math.max(EDGE, viewport.width - width - EDGE));
  const y = clamp(rect.y ?? definition.defaultRect.y, EDGE, Math.max(EDGE, viewport.height - safeBottom - height));
  return { x, y, width, height };
}

function presetRect(id: ReactWindowId, preset: ReactLayoutPreset, viewport: ReactViewport): Partial<ReactWindowRect> | null {
  if (preset === 'Combat') {
    if (id === 'inventory') return { x: viewport.width - 286, y: viewport.height - HOTBAR_SAFE_BOTTOM - 360, width: 270, height: 360 };
    if (id === 'chat') return { x: EDGE, y: viewport.height - HOTBAR_SAFE_BOTTOM - 224, width: 300, height: 170 };
  }
  if (preset === 'Build') {
    if (id === 'build') return { x: EDGE, y: 106, width: 380, height: viewport.height - HOTBAR_SAFE_BOTTOM - 124 };
    if (id === 'inventory') return { x: viewport.width - 306, y: 126, width: 288, height: viewport.height - HOTBAR_SAFE_BOTTOM - 144 };
    if (id === 'chat') return { x: EDGE, y: viewport.height - HOTBAR_SAFE_BOTTOM - 214, width: 320, height: 150 };
  }
  if (preset === 'Planning') {
    if (id === 'professionAtlas' || id === 'adventureMap') return defaultRectFor(id, viewport);
    if (id === 'journal') return { x: 54, y: 80, width: 360, height: viewport.height - HOTBAR_SAFE_BOTTOM - 118 };
  }
  if (preset === 'Crafting') {
    if (id === 'crafting') return { x: 330, y: 90, width: 720, height: 540 };
    if (id === 'inventory') return { x: viewport.width - 304, y: 220, width: 286, height: 440 };
    if (id === 'bank') return { x: 18, y: 210, width: 290, height: 420 };
  }
  return null;
}

function presetState(id: ReactWindowId, preset: ReactLayoutPreset): Omit<ReactWindowLayoutState, 'rect'> {
  const state = { open: defaultOpen(id), collapsed: false, dock: defaultDock(id) };
  if (preset === 'Combat') {
    if (id === 'inventory') return { ...state, open: true, collapsed: true, dock: 'right' };
    if (id === 'hotbar' || id === 'status' || id === 'target') return { ...state, open: true };
  }
  if (preset === 'Build') {
    if (id === 'build') return { ...state, open: true, dock: 'left' };
    if (id === 'inventory') return { ...state, open: true, dock: 'right' };
  }
  if (preset === 'Planning') {
    if (id === 'professionAtlas') return { ...state, open: true, dock: 'center' };
    if (id === 'journal') return { ...state, open: true, dock: 'left' };
    if (id === 'chat' || id === 'inventory') return { ...state, open: true, collapsed: true };
  }
  if (preset === 'Crafting') {
    if (id === 'crafting') return { ...state, open: true, dock: 'center' };
    if (id === 'inventory') return { ...state, open: true, dock: 'right' };
    if (id === 'bank') return { ...state, open: true, dock: 'left' };
  }
  return state;
}

function pickWorkspace(mode: ReactUIMode, openPanels: ReactWindowId[]): ReactWindowId | null {
  if (mode !== 'Planning') return null;
  if (openPanels.includes('professionAtlas')) return 'professionAtlas';
  if (openPanels.includes('adventureMap')) return 'adventureMap';
  return null;
}

function defaultOpen(id: ReactWindowId): boolean {
  return id === 'status' || id === 'hotbar' || id === 'target';
}

function defaultDock(id: ReactWindowId): ReactWindowDock {
  if (id === 'status') return 'left';
  if (id === 'target') return 'right';
  if (id === 'hotbar') return 'bottom';
  if (reactWindowDefinitions[id].type === 'workspace') return 'center';
  return 'none';
}

function sortWindows(ids: ReactWindowId[]): ReactWindowId[] {
  return ids.sort((a, b) => reactWindowDefinitions[a].zLayer - reactWindowDefinitions[b].zLayer);
}

function isReactWindowId(value: unknown): value is ReactWindowId {
  return typeof value === 'string' && value in reactWindowDefinitions;
}

function isReactLayoutPreset(value: unknown): value is ReactLayoutPreset {
  return value === 'RestoreDefault' || value === 'Combat' || value === 'Build' || value === 'Planning' || value === 'Crafting';
}

function isRect(value: unknown): value is ReactWindowRect {
  if (!value || typeof value !== 'object') return false;
  const rect = value as Partial<ReactWindowRect>;
  return [rect.x, rect.y, rect.width, rect.height].every((part) => typeof part === 'number' && Number.isFinite(part));
}

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, value)));
}

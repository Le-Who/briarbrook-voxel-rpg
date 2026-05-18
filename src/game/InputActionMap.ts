import type { InputActionId, InputBindingContext, InputBindingState, InputMode } from './types';

export interface InputActionDefinition {
  id: InputActionId;
  label: string;
  context: InputBindingContext;
  group: 'Movement' | 'World' | 'Panels' | 'Hotbar' | 'Build' | 'UI' | 'Debug';
  promptLabel: string;
}

export interface InputBindingConflict {
  context: InputBindingContext;
  key: string;
  actionIds: InputActionId[];
  labels: string[];
}

const hotbarActionIds = ['hotbar1', 'hotbar2', 'hotbar3', 'hotbar4', 'hotbar5', 'hotbar6', 'hotbar7', 'hotbar8', 'hotbar9', 'hotbar10'] as const;

export const inputActionDefinitions: Record<InputActionId, InputActionDefinition> = {
  moveUp: action('moveUp', 'Move Up', 'gameplay', 'Movement', 'Move'),
  moveDown: action('moveDown', 'Move Down', 'gameplay', 'Movement', 'Move'),
  moveLeft: action('moveLeft', 'Move Left', 'gameplay', 'Movement', 'Move'),
  moveRight: action('moveRight', 'Move Right', 'gameplay', 'Movement', 'Move'),
  interact: action('interact', 'Interact', 'gameplay', 'World', 'Interact'),
  cancel: action('cancel', 'Cancel', 'gameplay', 'UI', 'Cancel'),
  primaryAction: action('primaryAction', 'Primary Action', 'gameplay', 'World', 'Primary'),
  secondaryAction: action('secondaryAction', 'Secondary Action', 'gameplay', 'World', 'Secondary'),
  targetNext: action('targetNext', 'Target Next', 'gameplay', 'World', 'Target Next'),
  openInventory: action('openInventory', 'Open Inventory', 'ui', 'Panels', 'Inventory'),
  openSkills: action('openSkills', 'Open Skills', 'ui', 'Panels', 'Skills'),
  openSpellbook: action('openSpellbook', 'Open Spellbook', 'ui', 'Panels', 'Spellbook'),
  openJournal: action('openJournal', 'Open Journal', 'ui', 'Panels', 'Journal'),
  openMarket: action('openMarket', 'Open Market', 'ui', 'Panels', 'Market'),
  openBuild: action('openBuild', 'Open Build', 'ui', 'Panels', 'Build'),
  openCharacter: action('openCharacter', 'Open Character', 'ui', 'Panels', 'Character'),
  openHelp: action('openHelp', 'Open Help', 'ui', 'Panels', 'Help'),
  openCrafting: action('openCrafting', 'Open Crafting', 'ui', 'Panels', 'Crafting'),
  openContextMenu: action('openContextMenu', 'Open Context Menu', 'ui', 'UI', 'Context Menu'),
  confirm: action('confirm', 'Confirm', 'ui', 'UI', 'Confirm'),
  back: action('back', 'Back', 'ui', 'UI', 'Back'),
  toggleCursorCamera: action('toggleCursorCamera', 'Toggle Cursor/Camera', 'ui', 'UI', 'Cursor/Camera'),
  hotbar1: action('hotbar1', 'Hotbar 1', 'gameplay', 'Hotbar', 'Hotbar 1'),
  hotbar2: action('hotbar2', 'Hotbar 2', 'gameplay', 'Hotbar', 'Hotbar 2'),
  hotbar3: action('hotbar3', 'Hotbar 3', 'gameplay', 'Hotbar', 'Hotbar 3'),
  hotbar4: action('hotbar4', 'Hotbar 4', 'gameplay', 'Hotbar', 'Hotbar 4'),
  hotbar5: action('hotbar5', 'Hotbar 5', 'gameplay', 'Hotbar', 'Hotbar 5'),
  hotbar6: action('hotbar6', 'Hotbar 6', 'gameplay', 'Hotbar', 'Hotbar 6'),
  hotbar7: action('hotbar7', 'Hotbar 7', 'gameplay', 'Hotbar', 'Hotbar 7'),
  hotbar8: action('hotbar8', 'Hotbar 8', 'gameplay', 'Hotbar', 'Hotbar 8'),
  hotbar9: action('hotbar9', 'Hotbar 9', 'gameplay', 'Hotbar', 'Hotbar 9'),
  hotbar10: action('hotbar10', 'Hotbar 10', 'gameplay', 'Hotbar', 'Hotbar 10'),
  hotbarPrevious: action('hotbarPrevious', 'Hotbar Previous', 'gameplay', 'Hotbar', 'Previous Slot'),
  hotbarNext: action('hotbarNext', 'Hotbar Next', 'gameplay', 'Hotbar', 'Next Slot'),
  defend: action('defend', 'Defend', 'gameplay', 'World', 'Defend'),
  weaponAbility: action('weaponAbility', 'Weapon Ability', 'gameplay', 'World', 'Ability'),
  cancelBuild: action('cancelBuild', 'Cancel Build', 'gameplay', 'Build', 'Cancel Build'),
  buildSnap: action('buildSnap', 'Toggle Build Snap', 'gameplay', 'Build', 'Snap'),
  rotateBuildLeft: action('rotateBuildLeft', 'Rotate Build Left', 'gameplay', 'Build', 'Rotate Left'),
  rotateBuildRight: action('rotateBuildRight', 'Rotate Build Right', 'gameplay', 'Build', 'Rotate Right'),
  openDevTravel: action('openDevTravel', 'Open Dev Travel', 'debug', 'Debug', 'Dev Travel'),
  toggleDevOverlay: action('toggleDevOverlay', 'Toggle Dev Overlay', 'debug', 'Debug', 'Dev Overlay')
};

const defaultInputBindings: InputBindingState[] = [
  binding('moveUp', ['w', 'arrowup']),
  binding('moveDown', ['s', 'arrowdown']),
  binding('moveLeft', ['a', 'arrowleft']),
  binding('moveRight', ['d', 'arrowright']),
  binding('interact', ['e']),
  binding('cancel', ['escape']),
  binding('primaryAction', ['space']),
  binding('secondaryAction', []),
  binding('targetNext', ['tab', 'shift+tab']),
  binding('openInventory', ['i']),
  binding('openSkills', ['k']),
  binding('openSpellbook', ['m']),
  binding('openJournal', ['j']),
  binding('openMarket', ['o']),
  binding('openBuild', ['b']),
  binding('openCharacter', ['c']),
  binding('openHelp', ['?']),
  binding('openCrafting', ['f']),
  binding('openContextMenu', ['shift+f10']),
  binding('confirm', ['enter']),
  binding('back', ['escape']),
  binding('toggleCursorCamera', []),
  ...hotbarActionIds.map((id, index) => binding(id, [index === 9 ? '0' : String(index + 1)])),
  binding('hotbarPrevious', ['[']),
  binding('hotbarNext', [']']),
  binding('defend', ['q']),
  binding('weaponAbility', ['r']),
  binding('cancelBuild', ['x']),
  binding('buildSnap', ['v']),
  binding('rotateBuildLeft', ['z']),
  binding('rotateBuildRight', ['c']),
  binding('openDevTravel', ['f10']),
  binding('toggleDevOverlay', ['`', 'f9'])
];

export const LEGACY_KEYBINDINGS = {
  panels: {
    inventory: { key: 'i', intent: 'TOGGLE_PANEL', panel: 'inventory' },
    skills: { key: 'k', intent: 'TOGGLE_PANEL', panel: 'skills' },
    spellbook: { key: 'm', intent: 'TOGGLE_PANEL', panel: 'spellbook' },
    journal: { key: 'j', intent: 'TOGGLE_PANEL', panel: 'journal' },
    character: { key: 'c', intent: 'TOGGLE_PANEL', panel: 'character' },
    help: { key: '?', intent: 'TOGGLE_PANEL', panel: 'help' }
  },
  actions: {
    interact: { key: 'e', intent: 'WORLD_INTERACT' },
    build: { key: 'b', intent: 'TOGGLE_PANEL', panel: 'build' },
    defend: { key: 'q', intent: 'CONFIRM' },
    weaponAbility: { key: 'r', intent: 'CONFIRM' },
    attack: { key: ' ', intent: 'WORLD_ATTACK' },
    crafting: { key: 'f', intent: 'TOGGLE_PANEL', panel: 'crafting' },
    cancelBuild: { key: 'x', intent: 'CANCEL' },
    buildSnap: { key: 'v', intent: 'CONFIRM' },
    rotateLeft: { key: 'z', intent: 'CONFIRM' }
  }
} as const;

function action(id: InputActionId, label: string, context: InputBindingContext, group: InputActionDefinition['group'], promptLabel: string): InputActionDefinition {
  return { id, label, context, group, promptLabel };
}

function binding(actionId: InputActionId, keys: string[]): InputBindingState {
  const definition = inputActionDefinitions[actionId];
  return {
    actionId,
    label: definition.label,
    context: definition.context,
    keys: keys.map(canonicalKeyToken).filter(Boolean)
  };
}

export function createDefaultInputBindings(): InputBindingState[] {
  return defaultInputBindings.map(cloneBinding);
}

export function sanitizeInputBindings(bindings: unknown): InputBindingState[] {
  const defaults = createDefaultInputBindings();
  if (!Array.isArray(bindings)) return defaults;
  const sanitizedById = new Map<string, InputBindingState>();
  for (const candidate of bindings) {
    if (!candidate || typeof candidate !== 'object') continue;
    const raw = candidate as Partial<InputBindingState>;
    if (!raw.actionId || !inputActionDefinitions[raw.actionId]) continue;
    const definition = inputActionDefinitions[raw.actionId];
    const context = raw.context ?? definition.context;
    if (context !== definition.context) continue;
    const keys = Array.isArray(raw.keys) ? raw.keys.map(canonicalKeyToken).filter(Boolean) : [];
    if (!keys.length) continue;
    sanitizedById.set(bindingKey(raw.actionId, context), {
      actionId: raw.actionId,
      label: definition.label,
      context,
      keys: unique(keys).slice(0, 3),
      custom: Boolean(raw.custom),
      locked: Boolean(raw.locked)
    });
  }
  return defaults.map((fallback) => sanitizedById.get(bindingKey(fallback.actionId, fallback.context)) ?? fallback);
}

export function keyTokenFromEvent(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>): string {
  const base = canonicalKeyToken(event.key);
  if (!base) return '';
  if (base === 'shift' || base === 'ctrl' || base === 'control' || base === 'alt' || base === 'meta') return base === 'control' ? 'ctrl' : base;
  const includeModifiers = base.length > 1 && base !== 'space' && base !== 'escape';
  if (!includeModifiers) return base;
  const modifiers = [
    event.ctrlKey ? 'ctrl' : '',
    event.altKey ? 'alt' : '',
    event.shiftKey ? 'shift' : '',
    event.metaKey ? 'meta' : ''
  ].filter(Boolean);
  return modifiers.length ? `${modifiers.join('+')}+${base}` : base;
}

export function canonicalKeyToken(key: string): string {
  if (!key) return '';
  const lower = key.toLowerCase();
  if (lower === ' ') return 'space';
  if (lower === 'esc') return 'escape';
  if (lower === 'arrowup' || lower === 'up') return 'arrowup';
  if (lower === 'arrowdown' || lower === 'down') return 'arrowdown';
  if (lower === 'arrowleft' || lower === 'left') return 'arrowleft';
  if (lower === 'arrowright' || lower === 'right') return 'arrowright';
  return lower.replace(/\s+/g, '');
}

export function keyLabel(token: string): string {
  const normalized = canonicalKeyToken(token);
  const labels: Record<string, string> = {
    space: 'Space',
    escape: 'Esc',
    enter: 'Enter',
    tab: 'Tab',
    arrowup: 'Up',
    arrowdown: 'Down',
    arrowleft: 'Left',
    arrowright: 'Right',
    '[': '[',
    ']': ']',
    '`': '`'
  };
  return normalized
    .split('+')
    .map((part) => labels[part] ?? (part.length === 1 ? part.toUpperCase() : part.toUpperCase()))
    .join('+');
}

export function bindingSummary(binding: InputBindingState): string {
  return binding.keys.map(keyLabel).join(' / ');
}

export function inputContextsForMode(mode: InputMode): InputBindingContext[] {
  if (mode === 'chatFocused') return [];
  if (mode === 'paused' || mode === 'modalOpen') return ['ui'];
  if (mode === 'devOverlay') return ['debug', 'ui'];
  if (mode === 'uiDragging' || mode === 'itemDragging' || mode === 'spellDragging') return [];
  if (mode === 'building' || mode === 'targeting') return ['gameplay', 'ui', 'debug'];
  return ['ui', 'gameplay', 'debug'];
}

export function resolveInputAction(bindings: InputBindingState[], event: KeyboardEvent, contexts: InputBindingContext[]): InputBindingState | null {
  const token = keyTokenFromEvent(event);
  if (!token) return null;
  const matches = sanitizeInputBindings(bindings).filter((binding) => contexts.includes(binding.context) && binding.keys.includes(token));
  if (!matches.length) return null;
  for (const context of contexts) {
    const contextMatches = matches.filter((binding) => binding.context === context);
    if (contextMatches.length) return contextMatches.find((binding) => binding.custom) ?? contextMatches[0];
  }
  return matches.find((binding) => binding.custom) ?? matches[0];
}

export function isActionPressed(bindings: InputBindingState[], pressedKeys: Set<string>, actionId: InputActionId): boolean {
  const binding = sanitizeInputBindings(bindings).find((candidate) => candidate.actionId === actionId);
  return Boolean(binding?.keys.some((key) => pressedKeys.has(key)));
}

export function rebindInputAction(bindings: InputBindingState[], actionId: InputActionId, context: InputBindingContext, key: string): InputBindingState[] {
  const token = canonicalKeyToken(key);
  const definition = inputActionDefinitions[actionId];
  const sanitized = sanitizeInputBindings(bindings);
  if (!definition || definition.context !== context || !token) return sanitized;
  return sanitized.map((binding) => {
    if (binding.actionId !== actionId || binding.context !== context) return binding;
    const rest = binding.keys.filter((candidate) => candidate !== token);
    return { ...binding, label: definition.label, keys: unique([token, ...rest]).slice(0, 3), custom: true };
  });
}

export function findInputBindingConflicts(bindings: InputBindingState[]): InputBindingConflict[] {
  const byContextKey = new Map<string, Map<InputActionId, string>>();
  for (const binding of sanitizeInputBindings(bindings)) {
    for (const key of binding.keys) {
      const mapKey = `${binding.context}:${key}`;
      const bucket = byContextKey.get(mapKey) ?? new Map<InputActionId, string>();
      bucket.set(binding.actionId, binding.label);
      byContextKey.set(mapKey, bucket);
    }
  }
  return Array.from(byContextKey.entries())
    .filter(([, actions]) => actions.size > 1)
    .map(([mapKey, actions]) => {
      const [context, key] = mapKey.split(':') as [InputBindingContext, string];
      return {
        context,
        key,
        actionIds: Array.from(actions.keys()),
        labels: Array.from(actions.values())
      };
    });
}

export function hotbarSlotForAction(actionId: InputActionId): number | null {
  const index = hotbarActionIds.indexOf(actionId as (typeof hotbarActionIds)[number]);
  return index >= 0 ? index : null;
}

export function actionLabelForId(actionId: InputActionId): string {
  return inputActionDefinitions[actionId]?.label ?? actionId;
}

export function promptLabelForAction(actionId: InputActionId): string {
  return inputActionDefinitions[actionId]?.promptLabel ?? actionLabelForId(actionId);
}

function bindingKey(actionId: InputActionId, context: InputBindingContext): string {
  return `${context}:${actionId}`;
}

function cloneBinding(binding: InputBindingState): InputBindingState {
  return { ...binding, keys: [...binding.keys] };
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

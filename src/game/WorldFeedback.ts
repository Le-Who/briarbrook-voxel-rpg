import { itemDefs } from '../data/items';
import type { ContainerEntity, Entity, GameState, ResourceKind, ResourceNodeEntity } from './types';

export type WorldCursorKind = 'default' | 'move' | 'harvest' | 'mine' | 'fish' | 'attack' | 'talk' | 'inspect' | 'loot' | 'danger' | 'build';

export interface WorldLabelDecision {
  title: string;
  detail?: string;
  className: string;
  healthPercent?: number;
}

export interface HoverRingStyle {
  color: string;
  inner: number;
  outer: number;
  opacity: number;
}

const toolToResourceKind: Record<string, ResourceKind> = {
  axe: 'tree',
  pickaxe: 'ore',
  fishing_pole: 'water',
  scissors: 'herb'
};

const resourceCursor: Record<ResourceKind, WorldCursorKind> = {
  tree: 'harvest',
  ore: 'mine',
  water: 'fish',
  herb: 'harvest'
};

export function selectedToolItemId(state: GameState): string | null {
  if (state.ui.targeting?.toolItemId) return state.ui.targeting.toolItemId;
  const active = state.ui.hotbar[state.ui.activeHotbarSlot];
  if (active?.kind === 'tool') return active.id;
  const selectedSlot = state.ui.selectedInventorySlot;
  const selectedStack = selectedSlot == null ? null : state.player.inventory.slots[selectedSlot];
  if (selectedStack && itemDefs[selectedStack.itemId]?.type === 'tool') return selectedStack.itemId;
  return null;
}

export function toolTargetsResourceKind(toolItemId: string | null | undefined, kind: ResourceKind | null | undefined): boolean {
  return Boolean(toolItemId && kind && toolToResourceKind[toolItemId] === kind);
}

export function worldCursorKindForHover(state: GameState, hover: { entity?: Entity | null; tileKind?: ResourceKind | null }): WorldCursorKind {
  if (state.buildMode.active) return 'build';
  const toolItemId = selectedToolItemId(state);
  const entity = hover.entity ?? null;

  if (state.ui.targeting) {
    if (state.ui.targeting.mode === 'spell') {
      if (!entity) return 'inspect';
      return entity.kind === 'enemy' ? 'attack' : 'inspect';
    }
    if (state.ui.targeting.mode === 'skill') {
      if (entity?.kind === 'container' && isDangerousContainer(entity)) return 'danger';
      return entity ? 'inspect' : 'default';
    }
  }

  if (!entity) {
    if (toolTargetsResourceKind(toolItemId, hover.tileKind)) return resourceCursor[hover.tileKind as ResourceKind];
    return 'default';
  }

  if (entity.kind === 'enemy') return 'attack';
  if (entity.kind === 'npc' || entity.kind === 'social' || entity.kind === 'portal') return 'talk';
  if (entity.kind === 'loot') return 'loot';
  if (entity.kind === 'container') return isDangerousContainer(entity) ? 'danger' : 'inspect';
  if (entity.kind === 'resource') {
    const kind = resourceKindForNode(entity.resourceType);
    if (toolTargetsResourceKind(toolItemId, kind)) return resourceCursor[kind];
    return 'inspect';
  }
  return 'default';
}

export function cursorCssForKind(kind: WorldCursorKind): string {
  return cursorMap[kind] ?? 'default';
}

export function worldLabelForEntity(
  state: GameState,
  entity: Entity,
  options: { hoveredEntityId: string | null; distanceToPlayer: number }
): WorldLabelDecision | null {
  const hovered = options.hoveredEntityId === entity.id;
  if (entity.kind === 'enemy') {
    if (entity.state === 'dead') return null;
    const selected = entity.id === state.player.activeTargetId;
    if (!selected && !hovered) return null;
    return {
      title: entity.name,
      detail: selected ? `Lv. ${entity.level}` : undefined,
      className: `enemy-label ${selected ? 'selected-enemy-label' : 'hover-enemy-label'}`,
      healthPercent: Math.max(0, Math.min(100, (entity.health / entity.maxHealth) * 100))
    };
  }

  if (entity.kind === 'npc' || entity.kind === 'social') {
    if (options.distanceToPlayer > (hovered ? 9 : 6.8)) return null;
    return {
      title: entity.name,
      detail: entity.kind === 'npc' ? roleLabel(entity.role) : undefined,
      className: entity.kind === 'npc' ? 'npc-label' : 'social-label'
    };
  }

  if (entity.kind === 'loot') {
    if (!hovered && options.distanceToPlayer > 4.8) return null;
    return { title: entity.name, className: 'loot-label' };
  }

  if (entity.kind === 'portal') {
    if (!hovered && options.distanceToPlayer > 4.5) return null;
    return { title: entity.name, detail: 'Click or press E', className: 'portal-label inspector-label' };
  }

  if (entity.kind === 'container') {
    if (entity.hidden || entity.opened || (!hovered && options.distanceToPlayer > 5.2)) return null;
    return { title: entity.name, detail: containerStateLabel(entity), className: `loot-label inspector-label ${isDangerousContainer(entity) ? 'danger-label' : ''}` };
  }

  if (entity.kind === 'resource') {
    const action = resourceActionLabel(state, entity);
    if (state.gathering?.entityId === entity.id) return { title: state.gathering.actionLabel, detail: 'Working...', className: 'resource-label inspector-label action-label' };
    if (!hovered || !action) return null;
    return { title: action.title, detail: action.detail, className: 'resource-label inspector-label action-label' };
  }

  return null;
}

export function hoverRingStyleForEntity(state: GameState, entity: Entity): HoverRingStyle | null {
  if (entity.kind === 'enemy') {
    return entity.id === state.player.activeTargetId
      ? { color: '#ff3333', inner: 0.6, outer: 0.78, opacity: 0.92 }
      : { color: '#ff8a33', inner: 0.48, outer: 0.62, opacity: 0.8 };
  }
  if (entity.kind === 'resource') {
    const tool = selectedToolItemId(state);
    const kind = resourceKindForNode(entity.resourceType);
    if (!toolTargetsResourceKind(tool, kind) && state.gathering?.entityId !== entity.id) return { color: '#7f8a73', inner: 0.42, outer: 0.54, opacity: 0.36 };
    if (entity.resourceType === 'ore') return { color: '#8bd9ff', inner: 0.48, outer: 0.64, opacity: 0.68 };
    if (entity.resourceType === 'herb') return { color: '#d8f28a', inner: 0.42, outer: 0.56, opacity: 0.62 };
    return { color: '#79d66f', inner: 0.48, outer: 0.64, opacity: 0.66 };
  }
  if (entity.kind === 'container') {
    return isDangerousContainer(entity) ? { color: '#ff5a35', inner: 0.5, outer: 0.66, opacity: 0.78 } : { color: '#f0c957', inner: 0.46, outer: 0.62, opacity: 0.62 };
  }
  if (entity.kind === 'loot') return { color: '#f0c957', inner: 0.42, outer: 0.56, opacity: 0.58 };
  if (entity.kind === 'npc' || entity.kind === 'social' || entity.kind === 'portal') return { color: '#8bd9ff', inner: 0.44, outer: 0.58, opacity: 0.54 };
  return null;
}

export function resourceActionLabel(state: GameState, entity: ResourceNodeEntity): { title: string; detail: string } | null {
  const tool = selectedToolItemId(state);
  if (!toolTargetsResourceKind(tool, resourceKindForNode(entity.resourceType))) return null;
  const toolName = itemDefs[tool as string]?.name ?? tool;
  if (entity.resourceType === 'tree') return { title: 'Chop tree', detail: `${toolName} ready` };
  if (entity.resourceType === 'ore') return { title: 'Mine rock face', detail: `${toolName} ready` };
  if (entity.resourceType === 'herb') return { title: 'Forage herbs', detail: `${toolName} ready` };
  return { title: 'Use tool', detail: `${toolName} ready` };
}

function resourceKindForNode(kind: ResourceNodeEntity['resourceType']): ResourceKind {
  return kind === 'fish' ? 'water' : kind;
}

function isDangerousContainer(entity: ContainerEntity): boolean {
  return Boolean(entity.trap?.armed && entity.trap.detected);
}

function containerStateLabel(entity: ContainerEntity): string {
  if (entity.trap?.armed && entity.trap.detected) return 'Trap revealed';
  if (entity.locked) return 'Locked';
  if (entity.trap?.armed) return 'Warded';
  return 'Open';
}

function roleLabel(role: string): string {
  if (role === 'quest') return 'Quest';
  if (role === 'player') return 'Traveler';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function svgCursor(svg: string, hotspotX: number, hotspotY: number, fallback: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}, ${fallback}`;
}

const cursorMap: Record<WorldCursorKind, string> = {
  default: 'default',
  move: 'default',
  build: 'cell',
  harvest: svgCursor('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M6 18 18 6" stroke="#f4e5ad" stroke-width="3" stroke-linecap="round"/><path d="M11 5h7v7" fill="none" stroke="#76d06f" stroke-width="2.5" stroke-linejoin="round"/></svg>', 6, 18, 'cell'),
  mine: svgCursor('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M5 18 18 5" stroke="#cfd4d6" stroke-width="3" stroke-linecap="round"/><path d="M9 5c4-2 8-1 11 2" fill="none" stroke="#8bd9ff" stroke-width="2.5" stroke-linecap="round"/></svg>', 5, 18, 'cell'),
  fish: svgCursor('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M6 4c7 5 9 9 7 15" fill="none" stroke="#9ad8ff" stroke-width="2.5" stroke-linecap="round"/><path d="M13 19c3 0 4-2 3-4" fill="none" stroke="#e9edf3" stroke-width="2"/></svg>', 7, 6, 'cell'),
  attack: svgCursor('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M4 20 19 5" stroke="#ff6a3a" stroke-width="3" stroke-linecap="round"/><path d="M14 4h6v6" fill="none" stroke="#ffd968" stroke-width="2.5"/></svg>', 6, 18, 'crosshair'),
  talk: svgCursor('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M5 6h14v9H9l-4 4z" fill="#8bd9ff" stroke="#102332" stroke-width="1.5"/></svg>', 6, 6, 'pointer'),
  inspect: svgCursor('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="10" cy="10" r="6" fill="none" stroke="#f0c957" stroke-width="2.5"/><path d="m14 14 5 5" stroke="#f0c957" stroke-width="3" stroke-linecap="round"/></svg>', 10, 10, 'help'),
  loot: svgCursor('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M6 9h12v9H6z" fill="#d9a840" stroke="#3a2a13" stroke-width="1.5"/><path d="M9 9c0-4 6-4 6 0" fill="none" stroke="#f7e5bc" stroke-width="2"/></svg>', 9, 9, 'grab'),
  danger: svgCursor('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M12 3 22 20H2z" fill="#ff5a35" stroke="#1c0805" stroke-width="1.5"/><path d="M12 8v6M12 17v1" stroke="#fff4d0" stroke-width="2.5" stroke-linecap="round"/></svg>', 12, 12, 'not-allowed')
};

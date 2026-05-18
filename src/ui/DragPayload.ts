import { itemDefs } from '../data/items';
import { skillDefinitions } from '../data/skillDefinitions';
import { spellDefs } from '../data/spells';
import type { EquipmentSlot, GameState, HotbarBinding, IconDescriptor } from '../game/types';
import { parseHotbarSourceText } from './WindowManager';

export type DragPayloadKind = 'item' | 'spell' | 'skill' | 'macro' | 'equipment' | 'hotbarSlot';
export type DropTargetKind = 'hotbarSlot' | 'containerSlot' | 'equipmentSlot' | 'tradeOffer';
export type ItemContainerId = 'inventory' | 'bank' | 'trade-player';

export interface DragPayload {
  kind: DragPayloadKind;
  sourceWindowId: string;
  sourceSlotId?: number;
  itemInstanceId?: string;
  itemDefinitionId?: string;
  spellId?: string;
  skillId?: string;
  macroId?: string;
  equipmentSlot?: EquipmentSlot;
  quantity?: number;
  iconDescriptor: IconDescriptor;
  displayName: string;
  allowedDropTargets: DropTargetKind[];
  hotbarBinding?: HotbarBinding | null;
}

export type DropTarget =
  | { kind: 'hotbarSlot'; slot: number; element?: HTMLElement }
  | { kind: 'containerSlot'; container: ItemContainerId; slot: number; element?: HTMLElement }
  | { kind: 'equipmentSlot'; slot: EquipmentSlot; element?: HTMLElement }
  | { kind: 'tradeOffer'; slot?: number; element?: HTMLElement };

export interface DropEvaluation {
  ok: boolean;
  reason?: string;
}

const fallbackIcon: IconDescriptor = { shape: 'bag', primary: '#8c4d24', secondary: '#ca8a4a' };
const actionIcons: Record<string, IconDescriptor> = {
  attack: { shape: 'blade', primary: '#d8d4c7', secondary: '#8f6a39' },
  ranged: { shape: 'bow', primary: '#7a4b25', secondary: '#d8d4c7' },
  utility: fallbackIcon,
  hide: { shape: 'shield', primary: '#203446', secondary: '#8bd9ff' },
  defend: { shape: 'shield', primary: '#343a42', secondary: '#d8d4c7' },
  interact: { shape: 'bag', primary: '#d9bd89', secondary: '#6b3b1d' },
  build: { shape: 'block', primary: '#8f8d84', secondary: '#5b5b59' }
};

const actionLabels: Record<string, string> = {
  attack: 'Attack',
  ranged: 'Bow',
  utility: 'Pack / Build',
  hide: 'Hide',
  defend: 'Defend',
  interact: 'Interact',
  build: 'Build'
};

export function payloadFromHotbarSource(source: string, state?: GameState): DragPayload | null {
  const [kind, rawId] = source.split(':');
  if (!rawId) return null;
  const id = rawId.trim();
  if (kind === 'hotbarSlot') {
    const slot = Number(id);
    if (!Number.isInteger(slot) || slot < 0) return null;
    const binding = state?.ui.hotbar[slot] ?? null;
    const view = binding ? hotbarBindingView(binding) : { displayName: `Hotbar ${slot + 1}`, iconDescriptor: fallbackIcon };
    return {
      kind: 'hotbarSlot',
      sourceWindowId: 'hotbar',
      sourceSlotId: slot,
      displayName: view.displayName,
      iconDescriptor: view.iconDescriptor,
      allowedDropTargets: ['hotbarSlot'],
      hotbarBinding: binding
    };
  }

  const binding = parseHotbarSourceText(source);
  if (!binding) return null;
  return payloadFromHotbarBinding(binding, 'source');
}

export function payloadFromElement(element: HTMLElement, state?: GameState): DragPayload | null {
  const dragKind = element.dataset.dragKind as DragPayloadKind | undefined;
  if (dragKind === 'item' && element.dataset.itemDefinitionId) {
    const itemId = element.dataset.itemDefinitionId;
    const def = itemDefs[itemId];
    return {
      kind: 'item',
      sourceWindowId: normalizeContainerId(element.dataset.sourceWindowId) ?? 'inventory',
      sourceSlotId: parseOptionalNumber(element.dataset.sourceSlotId),
      itemInstanceId: element.dataset.itemInstanceId,
      itemDefinitionId: itemId,
      quantity: parseOptionalNumber(element.dataset.quantity),
      displayName: element.dataset.displayName ?? def?.name ?? itemId,
      iconDescriptor: def?.icon ?? fallbackIcon,
      allowedDropTargets: ['hotbarSlot', 'containerSlot', 'equipmentSlot', 'tradeOffer']
    };
  }
  if (dragKind === 'spell' && element.dataset.spellId) {
    const spell = spellDefs[element.dataset.spellId];
    if (!spell) return null;
    return payloadFromHotbarBinding({ kind: 'spell', id: spell.id }, element.dataset.sourceWindowId ?? 'spellbook');
  }
  if (dragKind === 'skill' && element.dataset.skillId) {
    return payloadFromHotbarBinding({ kind: 'skill', id: element.dataset.skillId }, element.dataset.sourceWindowId ?? 'skills');
  }

  const source = element.dataset.hotbarSource;
  return source ? payloadFromHotbarSource(source, state) : null;
}

export function hotbarBindingFromPayload(payload: DragPayload): HotbarBinding | null {
  if (payload.kind === 'hotbarSlot') return payload.hotbarBinding ?? null;
  if (payload.kind === 'spell' && payload.spellId) return { kind: 'spell', id: payload.spellId };
  if (payload.kind === 'skill' && payload.skillId) return { kind: 'skill', id: payload.skillId };
  if (payload.kind === 'item' && payload.itemDefinitionId) {
    const def = itemDefs[payload.itemDefinitionId];
    if (!def) return null;
    return { kind: def.type === 'tool' ? 'tool' : 'item', id: payload.itemDefinitionId };
  }
  return payload.hotbarBinding ?? null;
}

export function evaluateDrop(payload: DragPayload, target: DropTarget | null, state?: GameState): DropEvaluation {
  if (!target) return { ok: false, reason: 'Drop on a hotbar, inventory, bank, trade, or equipment slot.' };
  if (target.kind === 'hotbarSlot') {
    if (!payload.allowedDropTargets.includes('hotbarSlot')) return { ok: false, reason: 'That cannot go on the hotbar.' };
    if (payload.kind === 'hotbarSlot' && payload.sourceSlotId === target.slot) return { ok: false, reason: 'That hotbar slot is already there.' };
    return hotbarBindingFromPayload(payload) ? { ok: true } : { ok: false, reason: 'This cannot be assigned to a hotbar slot yet.' };
  }
  if (target.kind === 'containerSlot') {
    if (payload.kind !== 'item') return { ok: false, reason: 'Only inventory items can move into containers.' };
    if (payload.sourceWindowId === target.container && payload.sourceSlotId === target.slot) return { ok: false, reason: 'That item is already in this slot.' };
    if (!isItemContainer(payload.sourceWindowId)) return { ok: false, reason: 'Only pack, bank, and trade items can move between slots.' };
    if (target.container === 'trade-player' && payload.sourceWindowId !== 'inventory') return { ok: false, reason: 'Only pack items can be offered in trade.' };
    return { ok: true };
  }
  if (target.kind === 'tradeOffer') {
    if (payload.kind !== 'item') return { ok: false, reason: 'Only pack items can be offered in trade.' };
    if (payload.sourceWindowId !== 'inventory') return { ok: false, reason: 'Only pack items can be offered in trade.' };
    return state?.ui.trade ? { ok: true } : { ok: false, reason: 'Open a trade before offering items.' };
  }
  if (target.kind === 'equipmentSlot') {
    if (payload.kind !== 'item' || !payload.itemDefinitionId) return { ok: false, reason: 'Only equipment can be dropped there.' };
    if (payload.sourceWindowId !== 'inventory') return { ok: false, reason: 'Move the item to your pack before equipping it.' };
    const def = itemDefs[payload.itemDefinitionId];
    if (!def?.equipmentSlot) return { ok: false, reason: `${payload.displayName} is not equipment.` };
    if (def.equipmentSlot !== target.slot) return { ok: false, reason: `${payload.displayName} fits the ${def.equipmentSlot} slot.` };
    return { ok: true };
  }
  return { ok: false, reason: 'Invalid drop target.' };
}

export function parseContainerDropTarget(value: string | undefined): { container: ItemContainerId; slot: number } | null {
  if (!value) return null;
  const [container, rawSlot] = value.split(':');
  if (!isItemContainer(container)) return null;
  const slot = Number(rawSlot);
  return Number.isInteger(slot) && slot >= 0 ? { container, slot } : null;
}

function payloadFromHotbarBinding(binding: HotbarBinding, sourceWindowId: string): DragPayload | null {
  const view = hotbarBindingView(binding);
  if (binding.kind === 'spell') {
    return {
      kind: 'spell',
      sourceWindowId,
      spellId: binding.id,
      displayName: view.displayName,
      iconDescriptor: view.iconDescriptor,
      allowedDropTargets: ['hotbarSlot'],
      hotbarBinding: binding
    };
  }
  if (binding.kind === 'skill') {
    return {
      kind: 'skill',
      sourceWindowId,
      skillId: binding.id,
      displayName: view.displayName,
      iconDescriptor: view.iconDescriptor,
      allowedDropTargets: ['hotbarSlot'],
      hotbarBinding: binding
    };
  }
  if (binding.kind === 'item' || binding.kind === 'tool') {
    return {
      kind: 'item',
      sourceWindowId,
      itemDefinitionId: binding.id,
      displayName: view.displayName,
      iconDescriptor: view.iconDescriptor,
      allowedDropTargets: ['hotbarSlot'],
      hotbarBinding: binding
    };
  }
  return {
    kind: 'macro',
    sourceWindowId,
    macroId: binding.id,
    displayName: view.displayName,
    iconDescriptor: view.iconDescriptor,
    allowedDropTargets: ['hotbarSlot'],
    hotbarBinding: binding
  };
}

function hotbarBindingView(binding: HotbarBinding): { displayName: string; iconDescriptor: IconDescriptor } {
  if (binding.kind === 'spell') {
    const spell = spellDefs[binding.id];
    return { displayName: spell?.displayName ?? binding.id, iconDescriptor: spell?.iconDescriptor ?? fallbackIcon };
  }
  if (binding.kind === 'skill') {
    const skill = skillDefinitions.find((candidate) => candidate.id === binding.id);
    return { displayName: skill?.displayName ?? binding.id, iconDescriptor: skill?.icon ?? fallbackIcon };
  }
  if (binding.kind === 'item' || binding.kind === 'tool') {
    const item = itemDefs[binding.id];
    return { displayName: item?.name ?? binding.id, iconDescriptor: item?.icon ?? fallbackIcon };
  }
  return { displayName: actionLabels[binding.id] ?? binding.id, iconDescriptor: actionIcons[binding.id] ?? fallbackIcon };
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeContainerId(value: string | undefined): ItemContainerId | null {
  if (value === 'inv') return 'inventory';
  if (value === 'trade') return 'trade-player';
  return isItemContainer(value) ? value : null;
}

function isItemContainer(value: string | undefined): value is ItemContainerId {
  return value === 'inventory' || value === 'bank' || value === 'trade-player';
}

import { itemDefs } from '../data/items';
import { skillDefinitions } from '../data/skillDefinitions';
import { spellDefs } from '../data/spells';
import { getItemCount, hasItems } from '../systems/InventorySystem';
import { interactionPrompt } from '../systems/InteractionAffordanceSystem';
import type { EquipmentSlot, GameState, HotbarBinding, ItemStack, ManagedWindowId, PlayerState, TargetRef, UIState, UIWindowLayout } from './types';

export interface SpellCastability {
  spellId: string;
  known: boolean;
  canCast: boolean;
  reason: string;
  missingReagents: string[];
  manaReady: boolean;
  skillReady: boolean;
}

export interface ItemUseState {
  stack: ItemStack | null;
  owner: 'inventory' | 'equipment' | 'bank' | 'trade-player' | null;
  slot: number | EquipmentSlot | null;
  equipped: boolean;
  assignedHotbarSlots: number[];
  exists: boolean;
}

export interface UiConsistencyIssue {
  code: string;
  message: string;
}

const managedWindowIds: ManagedWindowId[] = ['inventory', 'spellbook', 'skills', 'journal', 'market', 'help', 'chat', 'map'];
const actionBindingIds = new Set(['attack', 'ranged', 'utility', 'hide', 'defend', 'interact', 'build']);

const defaultWindowLayouts: Record<ManagedWindowId, UIWindowLayout> = {
  inventory: { x: 900, y: 88, width: 270, height: 520 },
  spellbook: { x: 420, y: 94, width: 560, height: 520 },
  skills: { x: 84, y: 90, width: 470, height: 520 },
  journal: { x: 330, y: 96, width: 620, height: 500 },
  market: { x: 300, y: 110, width: 720, height: 480 },
  help: { x: 420, y: 120, width: 440, height: 420 },
  chat: { x: 12, y: 372, width: 380, height: 260 },
  map: { x: 260, y: 82, width: 760, height: 560 }
};

export function getEquippedItems(player: PlayerState): Array<{ slot: EquipmentSlot; stack: ItemStack }> {
  return (Object.entries(player.equipment) as Array<[EquipmentSlot, ItemStack | null | undefined]>)
    .filter((entry): entry is [EquipmentSlot, ItemStack] => Boolean(entry[1]))
    .map(([slot, stack]) => ({ slot, stack }));
}

export function getActiveHotbarSlot(_player: PlayerState, uiState: UIState): { index: number; binding: HotbarBinding | null; valid: boolean } {
  const index = clampIndex(uiState.activeHotbarSlot, uiState.hotbar.length);
  const binding = uiState.hotbar[index] ?? null;
  return { index, binding, valid: isHotbarBindingDefinitionValid(binding) };
}

export function getHeldVisualItem(player: PlayerState): ItemStack | null {
  return player.equipment.weapon ?? player.equipment.shield ?? getEquippedItems(player)[0]?.stack ?? null;
}

export function getItemUseState(state: GameState, itemInstanceId: string): ItemUseState {
  const inventorySlot = state.player.inventory.slots.findIndex((stack) => stack?.uid === itemInstanceId);
  if (inventorySlot >= 0) return itemUseState(state, state.player.inventory.slots[inventorySlot], 'inventory', inventorySlot);

  for (const [slot, stack] of Object.entries(state.player.equipment) as Array<[EquipmentSlot, ItemStack | null | undefined]>) {
    if (stack?.uid === itemInstanceId) return itemUseState(state, stack, 'equipment', slot);
  }

  const bankSlot = state.player.bank.slots.findIndex((stack) => stack?.uid === itemInstanceId);
  if (bankSlot >= 0) return itemUseState(state, state.player.bank.slots[bankSlot], 'bank', bankSlot);

  const tradeSlot = state.ui.trade?.playerSlots.findIndex((stack) => stack?.uid === itemInstanceId) ?? -1;
  if (tradeSlot >= 0) return itemUseState(state, state.ui.trade?.playerSlots[tradeSlot] ?? null, 'trade-player', tradeSlot);

  return { stack: null, owner: null, slot: null, equipped: false, assignedHotbarSlots: [], exists: false };
}

export function getSpellCastability(state: GameState, spellId: string): SpellCastability {
  const spell = spellDefs[spellId];
  if (!spell) {
    return { spellId, known: false, canCast: false, reason: 'Unknown spell', missingReagents: [], manaReady: false, skillReady: false };
  }
  const known = state.player.spellbook.knownSpellIds.includes(spell.id);
  const magery = state.player.skills.Magery?.value ?? 0;
  const missingReagents = spell.reagents.filter((req) => getItemCount(state.player.inventory, req.itemId) < req.quantity).map((req) => req.itemId);
  const manaReady = state.player.mana >= spell.manaCost;
  const skillReady = magery >= spell.minSkill;
  const reason = !known ? 'Not learned' : !manaReady ? 'Not enough mana' : !skillReady ? 'Magery too low' : missingReagents.length ? 'Missing reagents' : '';
  return {
    spellId: spell.id,
    known,
    canCast: known && manaReady && skillReady && missingReagents.length === 0,
    reason,
    missingReagents,
    manaReady,
    skillReady
  };
}

export function getTooltipContent(state: GameState, anchorId: string): string | null {
  const parts = anchorId.split(':');
  if (parts[0] === 'spell') {
    const spell = spellDefs[parts[1]];
    return spell ? `${spell.displayName}\nCircle ${spell.circle} · Mana ${spell.manaCost}` : null;
  }
  if (parts[0] === 'hotbar') {
    const index = Number(parts[1]);
    const binding = Number.isInteger(index) ? state.ui.hotbar[index] : null;
    return binding ? hotbarTooltipLabel(binding) : 'Empty hotbar slot';
  }
  if (parts[0] === 'inv' || parts[0] === 'bank' || parts[0] === 'trade') {
    const slot = Number(parts[1]);
    const stack = parts[0] === 'bank' ? state.player.bank.slots[slot] : parts[0] === 'trade' ? state.ui.trade?.playerSlots[slot] : state.player.inventory.slots[slot];
    return stack ? `${itemDefs[stack.itemId]?.name ?? stack.itemId}\nQty: ${stack.quantity}` : 'Empty slot';
  }
  if (parts[0] === 'equipment') {
    const slot = parts[1] as EquipmentSlot;
    const stack = state.player.equipment[slot];
    return stack ? itemDefs[stack.itemId]?.name ?? stack.itemId : `${slot} slot`;
  }
  return null;
}

export function getWindowLayout(state: GameState, windowId: ManagedWindowId, viewport = { width: 1280, height: 720 }): UIWindowLayout {
  const layout = state.ui.windowLayouts[windowId] ?? defaultWindowLayouts[windowId];
  return clampWindowLayout(layout, viewport);
}

export function getInteractPrompt(state: GameState, target: TargetRef = state.ui.hoverTarget ?? state.ui.selectedTarget): string | null {
  return interactionPrompt(state, target);
}

export function sanitizeUiStateReferences(state: GameState, viewport = { width: 1280, height: 720 }): void {
  state.ui.activeHotbarSlot = clampIndex(state.ui.activeHotbarSlot, state.ui.hotbar.length);
  state.ui.hotbar = state.ui.hotbar.map((binding) => (isHotbarBindingDefinitionValid(binding) ? binding : null));
  if (state.ui.hotbarAssignSpellId && !state.player.spellbook.knownSpellIds.includes(state.ui.hotbarAssignSpellId)) state.ui.hotbarAssignSpellId = null;
  if (state.ui.pinnedRumorId && !state.world.activeEvents.some((event) => event.id === state.ui.pinnedRumorId)) state.ui.pinnedRumorId = null;
  if (!spellDefs[state.ui.selectedSpellId]) state.ui.selectedSpellId = state.player.spellbook.knownSpellIds.find((id) => spellDefs[id]) ?? 'magic_arrow';

  if (!state.player.inventory.slots[state.ui.selectedInventorySlot ?? -1]) {
    if (state.ui.selectedTarget?.kind === 'inventory' && state.ui.selectedTarget.owner === 'inventory') state.ui.selectedTarget = null;
    state.ui.selectedInventorySlot = null;
  }
  if (!state.player.bank.slots[state.ui.selectedBankSlot ?? -1]) {
    if (state.ui.selectedTarget?.kind === 'inventory' && state.ui.selectedTarget.owner === 'bank') state.ui.selectedTarget = null;
    state.ui.selectedBankSlot = null;
  }
  if (!isTargetValid(state, state.ui.hoverTarget)) state.ui.hoverTarget = null;
  if (!isTargetValid(state, state.ui.selectedTarget)) state.ui.selectedTarget = null;
  if (!isTargetValid(state, state.ui.contextMenu?.target ?? null)) state.ui.contextMenu = null;

  for (const key of Object.keys(state.ui.windowLayouts)) {
    if (!managedWindowIds.includes(key as ManagedWindowId)) {
      delete state.ui.windowLayouts[key as ManagedWindowId];
      continue;
    }
    state.ui.windowLayouts[key as ManagedWindowId] = getWindowLayout(state, key as ManagedWindowId, viewport);
  }
}

export function validateUiConsistency(state: GameState, viewport = { width: 1280, height: 720 }): UiConsistencyIssue[] {
  const issues: UiConsistencyIssue[] = [];
  state.ui.hotbar.forEach((binding, index) => {
    if (!isHotbarBindingDefinitionValid(binding)) issues.push({ code: 'invalid-hotbar-binding', message: `Hotbar ${index + 1} references missing ${binding?.kind ?? 'empty'}:${binding?.id ?? 'empty'}.` });
  });
  if (state.ui.selectedTarget && !isTargetValid(state, state.ui.selectedTarget)) issues.push({ code: 'invalid-selected-target', message: 'Selected target is missing or outside the current area.' });
  if (state.ui.hoverTarget && !isTargetValid(state, state.ui.hoverTarget)) issues.push({ code: 'invalid-hover-target', message: 'Hover target is stale.' });
  for (const id of managedWindowIds) {
    const layout = getWindowLayout(state, id, viewport);
    if (layout.x < 0 || layout.y < 0 || layout.x + layout.width > viewport.width || layout.y + layout.height > viewport.height) issues.push({ code: 'window-out-of-viewport', message: `${id} layout is outside the viewport.` });
  }
  getEquippedItems(state.player).forEach(({ stack }) => {
    const useState = getItemUseState(state, stack.uid);
    if (!useState.equipped) issues.push({ code: 'paperdoll-equipment-mismatch', message: `${stack.itemId} is equipped but not resolved as equipment.` });
  });
  return issues;
}

function itemUseState(state: GameState, stack: ItemStack | null | undefined, owner: ItemUseState['owner'], slot: ItemUseState['slot']): ItemUseState {
  const assignedHotbarSlots = stack ? state.ui.hotbar.flatMap((binding, index) => ((binding?.kind === 'item' || binding?.kind === 'tool') && binding.id === stack.itemId ? [index] : [])) : [];
  return {
    stack: stack ?? null,
    owner,
    slot,
    equipped: owner === 'equipment',
    assignedHotbarSlots,
    exists: Boolean(stack)
  };
}

function isHotbarBindingDefinitionValid(binding: HotbarBinding | null): boolean {
  if (!binding) return true;
  if (binding.kind === 'action') return actionBindingIds.has(binding.id);
  if (binding.kind === 'spell') return Boolean(spellDefs[binding.id]);
  if (binding.kind === 'skill') return skillDefinitions.some((skill) => skill.id === binding.id);
  return Boolean(itemDefs[binding.id]);
}

function isTargetValid(state: GameState, target: TargetRef): boolean {
  if (!target) return true;
  if (target.kind === 'self') return true;
  if (target.kind === 'tile') return target.areaId === state.player.currentArea;
  if (target.kind === 'inventory') {
    if (target.owner === 'inventory') return Boolean(state.player.inventory.slots[target.slot]);
    if (target.owner === 'bank') return Boolean(state.player.bank.slots[target.slot]);
    return Boolean(state.ui.trade?.playerSlots[target.slot]);
  }
  const entity = state.entities[target.entityId];
  if (!entity || entity.area !== state.player.currentArea) return false;
  if ('state' in entity && entity.state === 'dead') return false;
  return true;
}

function hotbarTooltipLabel(binding: HotbarBinding): string {
  if (binding.kind === 'action') return `Action: ${binding.id}`;
  if (binding.kind === 'spell') return spellDefs[binding.id]?.displayName ?? binding.id;
  if (binding.kind === 'skill') return skillDefinitions.find((skill) => skill.id === binding.id)?.displayName ?? binding.id;
  return itemDefs[binding.id]?.name ?? binding.id;
}

function clampWindowLayout(layout: UIWindowLayout, viewport: { width: number; height: number }): UIWindowLayout {
  const width = Math.min(Math.max(180, layout.width), Math.max(180, viewport.width - 16));
  const height = Math.min(Math.max(120, layout.height), Math.max(120, viewport.height - 16));
  return {
    width,
    height,
    x: Math.max(8, Math.min(layout.x, viewport.width - width - 8)),
    y: Math.max(8, Math.min(layout.y, viewport.height - height - 8))
  };
}

function clampIndex(value: number, length: number): number {
  if (!length) return 0;
  return Math.max(0, Math.min(length - 1, Number.isFinite(value) ? Math.floor(value) : 0));
}

import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type ReactElement } from 'react';
import { itemDefs } from '../../../data/items';
import { skillDefinitions } from '../../../data/skillDefinitions';
import { spellDefs } from '../../../data/spells';
import type { GameAction } from '../../../game/Actions';
import type { HotbarBinding, IconDescriptor } from '../../../game/types';
import { renderIcon } from '../../../render/IconRenderer';
import { itemIconCategory, skillIconCategory, spellIconCategory, type IconVisualCategory } from '../../IconVisualSystem';
import { useGameCommand, useGameSnapshot } from '../hooks/useGameSnapshot';
import type { GameUICommandResult } from '../bridge/commands';
import type { GameUISnapshot, ReadonlyItemStack } from '../bridge/selectors';
import { useReactPanelRender } from '../components/renderMetrics';
import { ActionFooter, GameWindow, IconButton, PanelToolbar, ScrollArea, SlotGrid, Text } from '../components/primitives';
import { reactWindowDefinitions, resolveReactWindowLayout, type ReactWindowId } from './windowManagerV2';

type DispatchAction = (action: GameAction) => GameUICommandResult;
type ItemContainerId = 'inventory' | 'bank';

interface ItemSlotView {
  equipped: boolean;
  assignedHotbarSlot: number | null;
  active: boolean;
  durability: 'broken' | 'damaged' | 'worn' | null;
}

interface HotbarView {
  label: string;
  icon: IconDescriptor;
  category: IconVisualCategory;
  quantity?: number;
  cost?: string;
  invalid?: string;
  cooldownPct: number;
  linkedEquipped: boolean;
  tooltip: string;
}

const fallbackIcon: IconDescriptor = { shape: 'bag', primary: '#8c4d24', secondary: '#ca8a4a' };
const actionIcons: Record<string, { label: string; icon: IconDescriptor; hint: string; category: IconVisualCategory }> = {
  attack: { label: 'Attack', icon: { shape: 'blade', primary: '#d8d4c7', secondary: '#8f6a39' }, hint: 'Strike your selected hostile target.', category: 'weapon' },
  ranged: { label: 'Bow', icon: { shape: 'bow', primary: '#7a4b25', secondary: '#d8d4c7' }, hint: 'Fire at your selected hostile target.', category: 'weapon' },
  utility: { label: 'Pack / Build', icon: fallbackIcon, hint: 'Open your pack, or build when you are on your plot.', category: 'container' },
  hide: { label: 'Hide', icon: { shape: 'shield', primary: '#203446', secondary: '#8bd9ff' }, hint: 'Attempt to hide from nearby enemies.', category: 'skill-profession' },
  defend: { label: 'Defend', icon: { shape: 'shield', primary: '#343a42', secondary: '#d8d4c7' }, hint: 'Brace for incoming hits.', category: 'armor' },
  interact: { label: 'Interact', icon: { shape: 'bag', primary: '#d9bd89', secondary: '#6b3b1d' }, hint: 'Use the nearest interactable.', category: 'tool' },
  build: { label: 'Build', icon: { shape: 'block', primary: '#8f8d84', secondary: '#5b5b59' }, hint: 'Toggle housing build mode.', category: 'housing-item' }
};

export function InventoryBankHotbar({ hideContainers = false }: { hideContainers?: boolean }): ReactElement {
  const snapshot = useGameSnapshot((next) => next);
  const commands = useGameCommand();
  return <InventoryBankHotbarSurfaces snapshot={snapshot} dispatchAction={commands.dispatchAction} hideContainers={hideContainers} />;
}

export function InventoryBankHotbarSurfaces({ snapshot, dispatchAction, hideContainers = false }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction; hideContainers?: boolean }): ReactElement {
  return (
    <>
      {!hideContainers && snapshot.windows.panels.inventory ? <InventoryWindow snapshot={snapshot} dispatchAction={dispatchAction} /> : null}
      {!hideContainers && snapshot.bank.open ? <BankWindow snapshot={snapshot} dispatchAction={dispatchAction} /> : null}
      <ReactHotbar snapshot={snapshot} dispatchAction={dispatchAction} />
    </>
  );
}

function InventoryWindow({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('inventory');
  const [search, setSearch] = useState('');
  const selectedStack = snapshot.inventory.selectedSlot == null ? null : snapshot.inventory.slots[snapshot.inventory.selectedSlot] ?? null;
  const selectedName = selectedStack ? itemDefs[selectedStack.itemId]?.name ?? selectedStack.itemId : 'No item selected';
  const slots = filterSlots(snapshot.inventory.slots, search);

  return (
    <GameWindow
      className="bb-react-inventory bb-react-floating-window"
      data-react-panel="inventory"
      style={windowStyle('inventory')}
      title="Inventory"
      subtitle={`${snapshot.inventory.used}/${snapshot.inventory.capacity} slots`}
      actions={<IconButton label="Close inventory" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_PANEL', panel: 'inventory', open: false })}>x</IconButton>}
      footer={
        <ActionFooter data-inventory-footer="true">
          <Text tone="accent">Gold {snapshot.inventory.gold}</Text>
          <Text tone="muted">Weight {snapshot.inventory.weight.toFixed(0)}/{snapshot.inventory.carryCapacity.toFixed(0)}</Text>
          <span className="bb-react-footer-spacer" />
          <Text tone={selectedStack ? 'default' : 'muted'}>{selectedName}</Text>
          <button type="button" disabled={!selectedStack} onClick={(event) => selectedStack && dispatchClick(event, dispatchAction, { type: 'USE_ITEM', slot: snapshot.inventory.selectedSlot ?? 0 })}>Use</button>
          <button type="button" disabled={!selectedStack} onClick={(event) => selectedStack && dispatchClick(event, dispatchAction, { type: 'EQUIP_ITEM', slot: snapshot.inventory.selectedSlot ?? 0 })}>Equip</button>
          <button type="button" disabled={!selectedStack || selectedStack.quantity <= 1} onClick={(event) => selectedStack && dispatchClick(event, dispatchAction, { type: 'SPLIT_STACK', slot: snapshot.inventory.selectedSlot ?? 0 })}>Split</button>
          <button type="button" disabled={!selectedStack || !snapshot.bank.open} onClick={(event) => selectedStack && dispatchClick(event, dispatchAction, { type: 'MOVE_ITEM', from: 'inventory', to: 'bank', slot: snapshot.inventory.selectedSlot ?? 0 })}>Bank</button>
        </ActionFooter>
      }
    >
      <PanelToolbar>
        <input className="bb-react-search" aria-label="Search inventory" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Text tone="muted">Slots show icon, count, and state only.</Text>
      </PanelToolbar>
      <ScrollArea className="bb-react-slot-scroll">
        <SlotGrid>
          {slots.map(({ stack, slot }) => (
            <ItemSlotButton key={`inventory:${slot}`} container="inventory" slot={slot} stack={stack} selected={snapshot.inventory.selectedSlot === slot} snapshot={snapshot} dispatchAction={dispatchAction} />
          ))}
        </SlotGrid>
      </ScrollArea>
    </GameWindow>
  );
}

function BankWindow({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('bank');
  const [search, setSearch] = useState('');
  const selectedStack = snapshot.bank.selectedSlot == null ? null : snapshot.bank.slots[snapshot.bank.selectedSlot] ?? null;
  const slots = filterSlots(snapshot.bank.slots, search);

  return (
    <GameWindow
      className="bb-react-bank bb-react-floating-window"
      data-react-panel="bank"
      data-service-panel="bank"
      style={windowStyle('bank')}
      title="Bank Storage"
      subtitle={`${snapshot.bank.used}/${snapshot.bank.capacity} slots`}
      actions={<IconButton label="Close bank" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_PANEL', panel: 'bank', open: false })}>x</IconButton>}
      footer={
        <ActionFooter>
          <Text tone="accent">Bank Gold {snapshot.bank.gold}</Text>
          <span className="bb-react-footer-spacer" />
          <button type="button" disabled={!selectedStack} onClick={(event) => selectedStack && dispatchClick(event, dispatchAction, { type: 'MOVE_ITEM', from: 'bank', to: 'inventory', slot: snapshot.bank.selectedSlot ?? 0 })}>Withdraw</button>
          <button type="button" onClick={(event) => dispatchTakeAll(event, snapshot, dispatchAction)}>Take All</button>
        </ActionFooter>
      }
    >
      <PanelToolbar>
        <button type="button" onClick={(event) => dispatchDepositResources(event, snapshot, dispatchAction)}>Deposit Resources</button>
        <input className="bb-react-search" aria-label="Search bank" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </PanelToolbar>
      <ScrollArea className="bb-react-slot-scroll">
        <SlotGrid>
          {slots.map(({ stack, slot }) => (
            <ItemSlotButton key={`bank:${slot}`} container="bank" slot={slot} stack={stack} selected={snapshot.bank.selectedSlot === slot} snapshot={snapshot} dispatchAction={dispatchAction} />
          ))}
        </SlotGrid>
      </ScrollArea>
    </GameWindow>
  );
}

function ReactHotbar({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('hotbar');
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditingElement(event.target) || isEditingElement(document.activeElement)) return;
      if (event.key !== '[' && event.key !== ']') return;
      event.preventDefault();
      const delta = event.key === '[' ? -1 : 1;
      const current = snapshot.hotbar.activeSlot.index;
      dispatchAction({ type: 'SET_ACTIVE_HOTBAR_SLOT', slot: (current + delta + 10) % 10 });
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [dispatchAction, snapshot.hotbar.activeSlot.index]);

  return (
    <section className="bb-react-hotbar" data-react-panel="hotbar" data-ui-hotbar="true" aria-label="Hotbar" style={windowStyle('hotbar')}>
      {snapshot.hotbar.slots.map((slot) => {
        const key = slot.slot === 9 ? '0' : String(slot.slot + 1);
        const view = hotbarView(snapshot, slot.binding, slot.slot);
        const active = snapshot.hotbar.activeSlot.index === slot.slot;
        const sourceAttrs = slot.binding ? { 'data-hotbar-source': `hotbarSlot:${slot.slot}`, 'data-drag-kind': 'hotbarSlot', 'data-source-window-id': 'hotbar', 'data-source-slot-id': slot.slot } : {};
        return (
          <button
            key={`hotbar:${slot.slot}`}
            className={`bb-react-hotbar-slot ${active ? 'is-active' : ''} ${view.invalid ? 'is-invalid' : ''} ${slot.binding ? '' : 'is-empty'}`.trim()}
            type="button"
            aria-label={`${key}: ${view.label}`}
            data-hotbar={slot.slot}
            data-hotbar-drop={slot.slot}
            data-hotbar-key={key}
            data-tooltip-id={`react-hotbar:${slot.slot}:${slot.binding ? `${slot.binding.kind}:${slot.binding.id}` : 'empty'}`}
            data-tooltip-source="react-hotbar"
            data-tooltip-version={`${slot.binding ? `${slot.binding.kind}:${slot.binding.id}` : 'empty'}:${view.quantity ?? ''}:${view.cost ?? ''}:${view.invalid ?? ''}:${active}:${view.cooldownPct.toFixed(0)}`}
            data-tooltip={view.tooltip}
            title={view.label}
            onClick={(event) => dispatchClick(event, dispatchAction, { type: 'USE_HOTBAR', slot: slot.slot })}
            {...sourceAttrs}
          >
            <span className="bb-react-hotbar-key">{key}</span>
            <IconGlyph icon={view.icon} label={view.label} category={view.category} />
            {view.quantity != null ? <b className="bb-react-hotbar-qty">{view.quantity}</b> : null}
            {view.cost ? <em className="bb-react-hotbar-cost">{view.cost}</em> : null}
            {view.invalid ? <small className="bb-react-hotbar-invalid">!</small> : null}
            {view.cooldownPct > 0 ? <i className="bb-react-cooldown" style={{ height: `${view.cooldownPct}%` }} /> : null}
            <span className="bb-react-hotbar-states">
              {active ? <i title="Active">A</i> : null}
              {view.linkedEquipped ? <i title="Equipped">E</i> : null}
              {view.invalid ? <i title={view.invalid}>!</i> : null}
            </span>
          </button>
        );
      })}
    </section>
  );
}

function ItemSlotButton({ container, slot, stack, selected, snapshot, dispatchAction }: { container: ItemContainerId; slot: number; stack: ReadonlyItemStack | null; selected: boolean; snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  const def = stack ? itemDefs[stack.itemId] : undefined;
  const view = itemSlotView(snapshot, stack);
  const tooltip = stack && def ? itemTooltip(stack, view) : '';
  const source = stack && def ? `${def.type === 'tool' ? 'tool' : 'item'}:${stack.itemId}` : undefined;

  return (
    <button
      className={`bb-react-item-slot ${selected ? 'is-selected' : ''} ${view.equipped ? 'is-equipped' : ''} ${view.assignedHotbarSlot != null ? 'is-hotbar-assigned' : ''} ${view.active ? 'is-active-item' : ''} ${view.durability ? `is-${view.durability}` : ''}`.trim()}
      type="button"
      aria-label={def ? `${def.name}${stack && stack.quantity > 1 ? ` x${stack.quantity}` : ''}` : `${container} slot ${slot + 1}`}
      data-inv-slot={container === 'inventory' ? slot : undefined}
      data-bank-slot={container === 'bank' ? slot : undefined}
      data-item-drop-target={`${container}:${slot}`}
      data-hotbar-source={source}
      data-drag-kind={stack ? 'item' : undefined}
      data-source-window-id={stack ? container : undefined}
      data-source-slot-id={stack ? slot : undefined}
      data-item-instance-id={stack?.uid}
      data-item-definition-id={stack?.itemId}
      data-quantity={stack?.quantity}
      data-display-name={def?.name}
      data-tooltip-id={stack ? `react-${container}:${slot}:${stack.itemId}` : undefined}
      data-tooltip-source={`react-${container}`}
      data-tooltip-version={stack ? `${stack.uid}:${stack.quantity}:${stack.durability ?? ''}:${view.equipped}:${view.assignedHotbarSlot ?? ''}` : undefined}
      data-tooltip={tooltip || undefined}
      title={def?.name}
      draggable={Boolean(stack)}
      onClick={(event) => dispatchClick(event, dispatchAction, { type: container === 'inventory' ? 'SELECT_INVENTORY_SLOT' : 'SELECT_BANK_SLOT', slot: selected ? null : slot })}
    >
      {def ? <IconGlyph icon={def.icon} label={def.name} category={itemIconCategory(def)} /> : null}
      {stack && stack.quantity > 1 ? <span className="bb-react-slot-qty">{stack.quantity}</span> : null}
      {stack ? <SlotBadges view={view} /> : null}
    </button>
  );
}

function SlotBadges({ view }: { view: ItemSlotView }): ReactElement | null {
  const badges: Array<{ label: string; title: string }> = [];
  if (view.equipped) badges.push({ label: 'E', title: 'Equipped' });
  if (view.assignedHotbarSlot != null) badges.push({ label: 'H', title: `Hotbar ${view.assignedHotbarSlot === 9 ? 0 : view.assignedHotbarSlot + 1}` });
  if (view.active) badges.push({ label: 'A', title: 'Active' });
  if (view.durability === 'broken') badges.push({ label: '!', title: 'Broken' });
  else if (view.durability) badges.push({ label: 'D', title: view.durability });
  if (!badges.length) return null;
  return (
    <span className="bb-react-slot-badges">
      {badges.slice(0, 3).map((badge) => (
        <i key={`${badge.title}:${badge.label}`} title={badge.title}>{badge.label}</i>
      ))}
    </span>
  );
}

function IconGlyph({ icon, label, category }: { icon: IconDescriptor; label: string; category: IconVisualCategory }): ReactElement {
  return <span className="bb-react-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: renderIcon(icon, label, category) }} />;
}

function filterSlots(slots: ReadonlyArray<ReadonlyItemStack | null>, search: string): Array<{ slot: number; stack: ReadonlyItemStack | null }> {
  const term = search.trim().toLowerCase();
  return slots
    .map((stack, slot) => ({ slot, stack }))
    .filter(({ stack }) => {
      if (!term || !stack) return true;
      const def = itemDefs[stack.itemId];
      return (def?.name ?? stack.itemId).toLowerCase().includes(term);
    });
}

function itemSlotView(snapshot: GameUISnapshot, stack: ReadonlyItemStack | null): ItemSlotView {
  if (!stack) return { equipped: false, assignedHotbarSlot: null, active: false, durability: null };
  const equipped = Object.values(snapshot.equipment).some((candidate) => candidate?.itemId === stack.itemId);
  const assignedHotbarSlot = snapshot.hotbar.slots.find((slot) => (slot.binding?.kind === 'item' || slot.binding?.kind === 'tool') && slot.binding.id === stack.itemId)?.slot ?? null;
  const activeBinding = snapshot.hotbar.activeSlot.binding;
  return {
    equipped,
    assignedHotbarSlot,
    active: Boolean(activeBinding && (activeBinding.kind === 'item' || activeBinding.kind === 'tool') && activeBinding.id === stack.itemId),
    durability: durabilityState(stack)
  };
}

function itemTooltip(stack: ReadonlyItemStack, view: ItemSlotView): string {
  const def = itemDefs[stack.itemId];
  const lines = [def?.name ?? stack.itemId, `${def?.type ?? 'item'} x${stack.quantity}`];
  if (view.equipped) lines.push('Equipped');
  if (view.assignedHotbarSlot != null) lines.push(`Assigned to hotbar ${view.assignedHotbarSlot === 9 ? 0 : view.assignedHotbarSlot + 1}`);
  if (view.durability) lines.push(view.durability);
  return lines.join('\n');
}

function durabilityState(stack: ReadonlyItemStack): ItemSlotView['durability'] {
  if (!stack.maxDurability) return null;
  const ratio = (stack.durability ?? stack.maxDurability) / stack.maxDurability;
  if (ratio <= 0) return 'broken';
  if (ratio <= 0.25) return 'damaged';
  if (ratio <= 0.55) return 'worn';
  return null;
}

function hotbarView(snapshot: GameUISnapshot, binding: HotbarBinding | null, slot: number): HotbarView {
  if (!binding) {
    return { label: 'Empty', icon: fallbackIcon, category: 'container', cooldownPct: 0, linkedEquipped: false, tooltip: 'Empty slot\nDrop an item, spell, skill, or tool here.' };
  }

  if (binding.kind === 'action') {
    const action = actionIcons[binding.id] ?? actionIcons.utility;
    const invalid = binding.id === 'ranged' ? missingRangedAmmo(snapshot) : undefined;
    return {
      label: binding.id === 'utility' && snapshot.player.currentArea === 'housing' ? 'Build / Pack' : action.label,
      icon: action.icon,
      category: action.category,
      invalid,
      cooldownPct: binding.id === 'attack' ? cooldownPct(snapshot.hotbar.cooldowns.melee, 1.6) : binding.id === 'ranged' ? cooldownPct(snapshot.hotbar.cooldowns.ranged, 1.1) : 0,
      linkedEquipped: (binding.id === 'attack' || binding.id === 'ranged') && Boolean(snapshot.equipment.weapon),
      tooltip: `${action.label}\nAction - ${action.hint}${invalid ? `\n${invalid}` : ''}`
    };
  }

  if (binding.kind === 'spell') {
    const spell = spellDefs[binding.id] ?? spellDefs.magic_arrow;
    const missingReagent = spell.reagents.find((reagent) => inventoryCount(snapshot, reagent.itemId) < reagent.quantity);
    const invalid = snapshot.vitals.mana < spell.manaCost ? 'No mana' : missingReagent ? 'Missing reagent' : undefined;
    return {
      label: spell.displayName,
      icon: spell.iconDescriptor,
      category: spellIconCategory(spell),
      cost: `${spell.manaCost}m`,
      invalid,
      cooldownPct: cooldownPct(snapshot.hotbar.cooldowns.magic, spell.cooldown ?? 1.2),
      linkedEquipped: false,
      tooltip: `${spell.displayName}\nSpell circle ${spell.circle} - ${spell.category}${invalid ? `\n${invalid}` : ''}`
    };
  }

  if (binding.kind === 'skill') {
    const definition = skillDefinitions.find((candidate) => candidate.id === binding.id);
    return {
      label: definition?.displayName ?? binding.id,
      icon: definition?.icon ?? fallbackIcon,
      category: definition ? skillIconCategory(definition) : 'skill-profession',
      cooldownPct: 0,
      linkedEquipped: false,
      tooltip: `${definition?.displayName ?? binding.id}\nSkill`
    };
  }

  const def = itemDefs[binding.id];
  const quantity = inventoryCount(snapshot, binding.id) + Object.values(snapshot.equipment).filter((stack) => stack?.itemId === binding.id).length;
  const invalid = quantity <= 0 ? 'Not in pack' : undefined;
  return {
    label: def?.name ?? binding.id,
    icon: def?.icon ?? fallbackIcon,
    category: def ? itemIconCategory(def) : 'resource',
    quantity: def?.stackable ? quantity : undefined,
    invalid,
    cooldownPct: 0,
    linkedEquipped: Object.values(snapshot.equipment).some((stack) => stack?.itemId === binding.id),
    tooltip: `${def?.name ?? binding.id}\n${binding.kind === 'tool' ? 'Tool' : 'Item'}${invalid ? `\n${invalid}` : ''}`
  };
}

function inventoryCount(snapshot: GameUISnapshot, itemId: string): number {
  return snapshot.inventory.slots.reduce((sum, stack) => sum + (stack?.itemId === itemId ? stack.quantity : 0), 0);
}

function missingRangedAmmo(snapshot: GameUISnapshot): string | undefined {
  const weapon = snapshot.equipment.weapon;
  const def = weapon ? itemDefs[weapon.itemId] : null;
  if (!def?.requiredAmmo) return undefined;
  return inventoryCount(snapshot, def.requiredAmmo) <= 0 ? 'No ammo' : undefined;
}

function cooldownPct(remaining: number, total: number): number {
  return remaining > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
}

function windowStyle(id: ReactWindowId): CSSProperties {
  const viewport = typeof window === 'undefined' ? { width: 1366, height: 768 } : { width: window.innerWidth, height: window.innerHeight };
  const rect = resolveReactWindowLayout(id, null, viewport);
  return {
    position: 'fixed',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    zIndex: reactWindowDefinitions[id].zLayer
  };
}

function dispatchClick(event: MouseEvent<HTMLElement>, dispatchAction: DispatchAction, action: GameAction): void {
  event.preventDefault();
  event.stopPropagation();
  dispatchAction(action);
}

function dispatchDepositResources(event: MouseEvent<HTMLElement>, snapshot: GameUISnapshot, dispatchAction: DispatchAction): void {
  event.preventDefault();
  event.stopPropagation();
  snapshot.inventory.slots.forEach((stack, slot) => {
    if (stack && itemDefs[stack.itemId]?.type === 'resource') {
      dispatchAction({ type: 'MOVE_ITEM', from: 'inventory', to: 'bank', slot });
    }
  });
}

function dispatchTakeAll(event: MouseEvent<HTMLElement>, snapshot: GameUISnapshot, dispatchAction: DispatchAction): void {
  event.preventDefault();
  event.stopPropagation();
  snapshot.bank.slots.forEach((stack, slot) => {
    if (stack) dispatchAction({ type: 'MOVE_ITEM', from: 'bank', to: 'inventory', slot });
  });
}

function isEditingElement(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

import { useMemo, useState, type ChangeEvent, type MouseEvent, type ReactElement } from 'react';
import { economyCategoryLabels, marketCategories } from '../../../data/economy';
import { itemDefs } from '../../../data/items';
import { recipes, stationLabels } from '../../../data/recipes';
import { spellCircles, spellDefs, type SpellDefinition } from '../../../data/spells';
import type { GameAction } from '../../../game/Actions';
import type { IconDescriptor, RecipeRequirement, SpellbookKnowledgeFilter, SpellbookRoleFilter } from '../../../game/types';
import { renderIcon } from '../../../render/IconRenderer';
import { itemIconCategory, spellIconCategory, type IconVisualCategory } from '../../IconVisualSystem';
import { ActionFooter, Badge, DataList, DetailPane, EmptyState, GameWindow, IconButton, PanelTabs, PanelToolbar, ScrollArea, SplitPane, StatusRow, Text } from '../components/primitives';
import type { GameUICommandResult } from '../bridge/commands';
import type { GameUISnapshot } from '../bridge/selectors';
import { useReactPanelRender } from '../components/renderMetrics';
import { useGameCommand, useGameSnapshot } from '../hooks/useGameSnapshot';
import { useDraggableReactWindow } from './draggableWindow';

type DispatchAction = (action: GameAction) => GameUICommandResult;
type SpellRole = Exclude<SpellbookRoleFilter, 'all'>;

const spellRoles: SpellbookRoleFilter[] = ['all', 'Damage', 'Healing', 'Utility', 'Travel', 'Support', 'Control', 'Debuff'];
const knowledgeTabs: Array<{ id: SpellbookKnowledgeFilter; label: string }> = [
  { id: 'known', label: 'Known' },
  { id: 'all', label: 'All' },
  { id: 'unknown', label: 'Unknown' }
];

export function KnowledgePanels(): ReactElement {
  const snapshot = useGameSnapshot((next) => next);
  const commands = useGameCommand();
  return <KnowledgePanelsSurfaces snapshot={snapshot} dispatchAction={commands.dispatchAction} />;
}

export function KnowledgePanelsSurfaces({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  return (
    <>
      {snapshot.windows.panels.spellbook ? <SpellbookWindow snapshot={snapshot} dispatchAction={dispatchAction} /> : null}
      {snapshot.crafting.open ? <CraftingWindow snapshot={snapshot} dispatchAction={dispatchAction} /> : null}
      {snapshot.market.open ? <MarketWindow snapshot={snapshot} dispatchAction={dispatchAction} /> : null}
      {snapshot.windows.panels.journal ? <JournalWindow snapshot={snapshot} dispatchAction={dispatchAction} /> : null}
    </>
  );
}

function SpellbookWindow({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('spellbook');
  const known = useMemo(() => new Set(snapshot.spells.knownSpellIds), [snapshot.spells.knownSpellIds]);
  const savedLayout = snapshot.windows.layouts.find((layout) => layout.id === 'spellbook')?.layout;
  const drag = useDraggableReactWindow('spellbook', dispatchAction, savedLayout);
  const visible = Object.values(spellDefs).filter((spell) => spellVisible(spell, known, snapshot));
  const selected = visible.find((spell) => spell.id === snapshot.spells.selectedSpellId) ?? visible[0] ?? Object.values(spellDefs)[0];
  const selectedKnown = known.has(selected.id);

  return (
    <GameWindow
      className="bb-knowledge-window bb-react-spellbook"
      data-react-panel="spellbook"
      data-dense-menu-layout="spellbook"
      style={drag.style}
      headerProps={drag.headerProps}
      {...drag.windowProps}
      title="Spellbook"
      subtitle={`${visible.length} spells`}
      actions={<IconButton label="Close spellbook" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_PANEL', panel: 'spellbook', open: false })}>x</IconButton>}
      footer={
        <ActionFooter>
          <button type="button" disabled={!selectedKnown} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'BEGIN_HOTBAR_ASSIGNMENT', spellId: selected.id })}>Assign to Hotbar</button>
          <button type="button" disabled={!selectedKnown} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'CAST_SPELL', spellId: selected.id })}>{selected.targetType === 'entity' || selected.targetType === 'tile' ? 'Target' : 'Cast'}</button>
          <Text tone="muted">Track reagents in detail pane.</Text>
        </ActionFooter>
      }
    >
      <SplitPane
        className="bb-split-pane--two bb-spellbook-split"
        data-bb-layout="split-pane"
        start={
          <ScrollArea className="bb-knowledge-list bb-spellbook-sidebar">
            <div className="bb-spellbook-controls" data-bb-fixed="toolbar" data-spellbook-controls="left">
              <input className="bb-react-search" aria-label="Search spellbook" value={snapshot.spells.search} placeholder="Search spells" onChange={(event) => dispatchChange(event, dispatchAction, (value) => ({ type: 'SET_SPELLBOOK_SEARCH', search: value }))} />
              <div className="bb-spellbook-filter-row">
                <select className="bb-react-select" aria-label="Spell circle" value={snapshot.spells.circleFilter} onChange={(event) => dispatchAction({ type: 'SET_SPELLBOOK_CIRCLE_FILTER', circle: event.target.value === 'all' ? 'all' : Number(event.target.value) })}>
                  <option value="all">All circles</option>
                  {spellCircles.map((circle) => <option value={circle} key={circle}>Circle {circle}</option>)}
                </select>
                <select className="bb-react-select" aria-label="Spell role" value={snapshot.spells.roleFilter} onChange={(event) => dispatchAction({ type: 'SET_SPELLBOOK_ROLE_FILTER', role: event.target.value as SpellbookRoleFilter })}>
                  {spellRoles.map((role) => <option value={role} key={role}>{role}</option>)}
                </select>
              </div>
              <PanelTabs className="bb-spellbook-knowledge-tabs" tabs={knowledgeTabs} activeId={snapshot.spells.knowledgeFilter} onSelect={(id) => dispatchAction({ type: 'SET_SPELLBOOK_KNOWLEDGE_FILTER', filter: id as SpellbookKnowledgeFilter })} />
              <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_TOOLTIP_MODE', mode: snapshot.settings.tooltipMode === 'advanced' ? 'compact' : 'advanced' })}>{snapshot.settings.tooltipMode === 'advanced' ? 'Compact detail' : 'Advanced detail'}</button>
            </div>
            <div className="bb-spell-list" data-spell-list="compact-rows">
              {visible.map((spell) => <SpellCard key={spell.id} spell={spell} selected={spell.id === selected.id} known={known.has(spell.id)} dispatchAction={dispatchAction} />)}
            </div>
          </ScrollArea>
        }
      >
        <SpellDetail spell={selected} known={selectedKnown} snapshot={snapshot} />
      </SplitPane>
    </GameWindow>
  );
}

function SpellCard({ spell, selected, known, dispatchAction }: { spell: SpellDefinition; selected: boolean; known: boolean; dispatchAction: DispatchAction }): ReactElement {
  const role = roleForSpell(spell);
  return (
    <button
      type="button"
      className={`bb-spell-card ${selected ? 'is-selected' : ''} ${known ? 'is-known' : 'is-unknown'}`.trim()}
      data-spell-card={spell.id}
      data-spell-row="summary"
      data-hotbar-source={known ? `spell:${spell.id}` : undefined}
      data-drag-kind={known ? 'spell' : undefined}
      data-source-window-id={known ? 'spellbook' : undefined}
      data-spell-id={known ? spell.id : undefined}
      draggable={known}
      onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SELECT_SPELL', spellId: spell.id })}
    >
      {known ? <IconGlyph icon={spell.iconDescriptor} label={spell.displayName} category={spellIconCategory(spell)} /> : <span className="bb-locked-glyph">?</span>}
      <span className="bb-spell-card__main">
        <span className="bb-spell-card__name">{known ? spell.displayName : 'Unknown Spell'}</span>
        <small>{role} - Circle {spell.circle} - {known ? 'Known' : 'Unknown'}</small>
      </span>
      <span className="bb-spell-card__stat">{known ? `${spell.castTime.toFixed(1)}s` : '--'}</span>
    </button>
  );
}

function SpellDetail({ spell, known, snapshot }: { spell: SpellDefinition; known: boolean; snapshot: GameUISnapshot }): ReactElement {
  return (
    <DetailPane title={known ? spell.displayName : 'Unknown Spell'} className="bb-spell-detail-pane" data-spell-detail={spell.id}>
      <ScrollArea className="bb-detail-stack">
        <div className="bb-detail-title-row" data-spell-detail-section="summary">
          {known ? <IconGlyph icon={spell.iconDescriptor} label={spell.displayName} category={spellIconCategory(spell)} /> : <span className="bb-locked-glyph">?</span>}
          <Text as="p" tone="muted">{known ? spell.description : 'This spell is not written in your spellbook yet.'}</Text>
        </div>
        <div className="bb-spell-stat-grid" data-spell-detail-section="stats">
          <StatusRow label="Circle" value={spell.circle} />
          <StatusRow label="Role" value={roleForSpell(spell)} />
          <StatusRow label="Mana" value={`${snapshot.vitals.mana.toFixed(0)}/${spell.manaCost}`} />
          <StatusRow label="Cast" value={`${spell.castTime.toFixed(1)}s`} />
          <StatusRow label="Cooldown" value={`${spell.cooldown.toFixed(1)}s`} />
          <StatusRow label="Range" value={spell.range > 0 ? `${spell.range} blocks` : 'Self'} />
          <StatusRow label="Target" value={spell.targetType} />
        </div>
        <section className="bb-detail-section" data-spell-detail-section="reagents">
          <Text as="strong" tone="accent">Reagents</Text>
          <div className="bb-requirement-list">
            {spell.reagents.length ? spell.reagents.map((req) => <RequirementRow key={req.itemId} requirement={req} have={inventoryCount(snapshot, req.itemId)} multiplier={1} />) : <Text tone="success">No reagents</Text>}
          </div>
        </section>
      </ScrollArea>
    </DetailPane>
  );
}

function CraftingWindow({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('crafting');
  const drag = useDraggableReactWindow('crafting', dispatchAction);
  const station = snapshot.crafting.selectedStationType ?? 'all';
  const visible = recipes.filter((recipe) => station === 'all' || recipe.stationType === station);
  const selected = visible.find((recipe) => recipe.id === snapshot.crafting.selectedRecipeId) ?? visible[0] ?? recipes[0];
  const canCraft = selected.inputs.every((req) => inventoryCount(snapshot, req.itemId) >= req.quantity * snapshot.crafting.quantity);
  const outputDef = itemDefs[selected.outputItemId];

  return (
    <GameWindow
      className="bb-knowledge-window bb-react-crafting"
      data-react-panel="crafting"
      data-dense-menu-layout="crafting"
      style={drag.style}
      headerProps={drag.headerProps}
      {...drag.windowProps}
      title={station === 'forge' ? 'Blacksmithing' : 'Crafting'}
      subtitle={`${visible.length} recipes`}
      actions={<IconButton label="Close crafting" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_PANEL', panel: 'crafting', open: false })}>x</IconButton>}
      footer={
        <ActionFooter data-crafting-footer="true">
          <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_CRAFT_QUANTITY', quantity: snapshot.crafting.quantity - 1 })}>-</button>
          <Text tone="accent">Qty {snapshot.crafting.quantity}</Text>
          <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_CRAFT_QUANTITY', quantity: snapshot.crafting.quantity + 1 })}>+</button>
          <span className="bb-react-footer-spacer" />
          <Text tone={canCraft ? 'success' : 'warning'}>{canCraft ? 'Ready' : 'Missing materials'}</Text>
          <button type="button" disabled={!canCraft} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'START_CRAFT', recipeId: selected.id, quantity: snapshot.crafting.quantity })}>Craft</button>
        </ActionFooter>
      }
    >
      <PanelToolbar>
        <select className="bb-react-select" aria-label="Crafting station" value={station} onChange={(event) => dispatchAction({ type: 'SET_CRAFT_STATION', stationType: event.target.value as GameAction extends { type: 'SET_CRAFT_STATION'; stationType: infer T } ? T : never })}>
          <option value="all">All stations</option>
          {Object.entries(stationLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
        </select>
      </PanelToolbar>
      <SplitPane
        className="bb-split-pane--two"
        data-bb-layout="split-pane"
        start={
          <ScrollArea className="bb-knowledge-list">
            <DataList items={visible.map((recipe) => ({ id: recipe.id, label: recipe.name, meta: stationLabels[recipe.stationType] }))} renderItem={(item) => (
              <button className={item.id === selected.id ? 'is-selected bb-list-button' : 'bb-list-button'} type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SELECT_RECIPE', recipeId: item.id })}>
                <span>{item.label}</span><small>{item.meta}</small>
              </button>
            )} />
          </ScrollArea>
        }
      >
        <CraftingDetail selected={selected} outputIcon={outputDef?.icon ?? fallbackIcon} outputLabel={outputDef?.name ?? selected.outputItemId} snapshot={snapshot} dispatchAction={dispatchAction} />
      </SplitPane>
    </GameWindow>
  );
}

function CraftingDetail({ selected, outputIcon, outputLabel, snapshot, dispatchAction }: { selected: (typeof recipes)[number]; outputIcon: IconDescriptor; outputLabel: string; snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  const openWorkOrders = snapshot.market.workOrders.filter((order) => order.status === 'open').slice(0, 4);
  return (
    <DetailPane title={selected.name} data-crafting-detail="true">
      <ScrollArea className="bb-detail-stack">
        <div className="bb-detail-title-row">
          <IconGlyph icon={outputIcon} label={outputLabel} category={itemDefs[selected.outputItemId] ? itemIconCategory(itemDefs[selected.outputItemId]) : 'resource'} />
          <Text tone="muted">{outputLabel} - {selected.skill} {selected.minSkill}+</Text>
        </div>
        <section className="bb-detail-section" data-crafting-detail-section="requirements">
          <Text as="strong" tone="accent">Requirements</Text>
          <div className="bb-requirement-list">
            {selected.inputs.map((req) => <RequirementRow key={req.itemId} requirement={req} have={inventoryCount(snapshot, req.itemId)} multiplier={snapshot.crafting.quantity} />)}
          </div>
        </section>
        <section className="bb-detail-section" data-crafting-detail-section="output">
          <Text as="strong" tone="accent">Output</Text>
          {selected.outputs.map((output) => <StatusRow key={output.itemId} label={itemDefs[output.itemId]?.name ?? output.itemId} value={`x${output.quantity * snapshot.crafting.quantity}`} />)}
        </section>
        <section className="bb-detail-section" data-crafting-detail-section="queue">
          <Text as="strong" tone="accent">Queue</Text>
          {snapshot.crafting.queue.length ? snapshot.crafting.queue.map((job) => <StatusRow key={job.id} label={recipes.find((recipe) => recipe.id === job.recipeId)?.name ?? job.recipeId} value={`${Math.ceil(job.remaining)}s`} />) : <Text tone="muted">No active jobs</Text>}
        </section>
        <section className="bb-detail-section" data-crafting-detail-section="repairs">
          <Text as="strong" tone="accent">Repairs</Text>
          {Object.entries(snapshot.equipment).filter(([, stack]) => stack?.maxDurability).map(([slot, stack]) => (
            <button type="button" className="bb-list-button" key={slot} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'REPAIR_EQUIPPED_ITEM', slot: slot as GameAction extends { type: 'REPAIR_EQUIPPED_ITEM'; slot: infer S } ? S : never })}>
              <span>{itemDefs[stack!.itemId]?.name ?? stack!.itemId}</span><small>{stack!.durability ?? stack!.maxDurability}/{stack!.maxDurability}</small>
            </button>
          ))}
        </section>
        <section className="bb-detail-section" data-crafting-detail-section="work-orders">
          <Text as="strong" tone="accent">Work order delivery</Text>
          {openWorkOrders.length ? openWorkOrders.map((order) => {
            const required = order.requiredItems ?? [{ itemId: order.itemId, quantity: order.quantity }];
            const ready = required.every((req) => accessibleCount(snapshot, req.itemId) >= req.quantity);
            return <button type="button" className="bb-list-button" key={order.id} disabled={!ready} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'COMPLETE_WORK_ORDER', orderId: order.id })}><span>{order.title ?? order.requester}</span><small>{ready ? 'Ready' : 'Missing items'}</small></button>;
          }) : <Text tone="muted">No open work orders</Text>}
        </section>
      </ScrollArea>
    </DetailPane>
  );
}

function MarketWindow({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('market');
  const savedLayout = snapshot.windows.layouts.find((layout) => layout.id === 'market')?.layout;
  const drag = useDraggableReactWindow('market', dispatchAction, savedLayout);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const workOrders = snapshot.market.workOrders.filter((order) => order.status === 'open');
  const marketOrders = snapshot.market.marketOrders.filter((order) => order.status === 'open');
  const selectedWork = workOrders.find((order) => order.id === selectedWorkOrderId) ?? workOrders[0] ?? null;

  return (
    <GameWindow className="bb-knowledge-window bb-react-market" data-react-panel="market" data-dense-menu-layout="market" style={drag.style} headerProps={drag.headerProps} {...drag.windowProps} title="Briarbrook Market Board" subtitle={`${workOrders.length} work orders`} actions={<IconButton label="Close market" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_PANEL', panel: 'market', open: false })}>x</IconButton>}>
      <PanelToolbar>
        <PanelTabs tabs={[{ id: 'work', label: 'Work Orders' }, { id: 'trade', label: 'Trade' }, { id: 'all', label: 'All' }]} activeId={snapshot.market.view} onSelect={(id) => dispatchAction({ type: 'SET_MARKET_VIEW', view: id as GameAction extends { type: 'SET_MARKET_VIEW'; view: infer V } ? V : never })} />
        <input className="bb-react-search" aria-label="Search market" value={snapshot.market.search} placeholder="Search market" onChange={(event) => dispatchChange(event, dispatchAction, (value) => ({ type: 'SET_MARKET_SEARCH', search: value }))} />
        <select className="bb-react-select" aria-label="Market category" value={snapshot.market.category} onChange={(event) => dispatchAction({ type: 'SET_MARKET_FILTER', category: event.target.value as GameAction extends { type: 'SET_MARKET_FILTER'; category: infer C } ? C : never })}>
          {marketCategories.map((category) => <option value={category} key={category}>{economyCategoryLabels[category]}</option>)}
        </select>
      </PanelToolbar>
      <SplitPane
        className="bb-split-pane--two"
        data-bb-layout="split-pane"
        start={
          <ScrollArea className="bb-knowledge-list">
            {workOrders.map((order) => {
              const required = order.requiredItems ?? [{ itemId: order.itemId, quantity: order.quantity }];
              const ready = required.every((req) => accessibleCount(snapshot, req.itemId) >= req.quantity);
              return (
                <button className={`bb-market-row ${selectedWork?.id === order.id ? 'is-selected' : ''}`.trim()} type="button" key={order.id} data-market-order={order.id} aria-pressed={selectedWork?.id === order.id} onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedWorkOrderId(order.id);
                }}>
                  <span>{order.title ?? order.requester}</span>
                  <Badge tone={ready ? 'success' : 'warning'}>{ready ? 'Ready' : 'Missing'}</Badge>
                  <small>{rewardLabel(order.rewardGold)}</small>
                </button>
              );
            })}
            {snapshot.market.view !== 'work' ? marketOrders.slice(0, 20).map((order) => <StatusRow key={order.id} label={`${order.kind} ${itemDefs[order.itemId]?.name ?? order.itemId}`} value={`${order.unitPrice}g`} />) : null}
          </ScrollArea>
        }
      >
        <DetailPane title={selectedWork?.title ?? selectedWork?.requester ?? 'Work Orders'} data-market-detail="true">
          <ScrollArea>
            {selectedWork ? <WorkOrderDetail order={selectedWork} snapshot={snapshot} dispatchAction={dispatchAction} /> : <EmptyState title="No open work orders" description="Trade and work order details will appear here." />}
          </ScrollArea>
        </DetailPane>
      </SplitPane>
    </GameWindow>
  );
}

function WorkOrderDetail({ order, snapshot, dispatchAction }: { order: GameUISnapshot['market']['workOrders'][number]; snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  const required = order.requiredItems ?? [{ itemId: order.itemId, quantity: order.quantity }];
  const ready = required.every((req) => accessibleCount(snapshot, req.itemId) >= req.quantity);
  return (
    <div className="bb-detail-stack">
      <StatusRow label="Requester" value={order.requester} />
      <StatusRow label="Reward" value={rewardLabel(order.rewardGold)} />
      <section className="bb-detail-section" data-market-detail-section="requirements">
        <Text as="strong" tone="accent">Requirements</Text>
        {required.map((req) => <RequirementRow key={req.itemId} requirement={req} have={accessibleCount(snapshot, req.itemId)} multiplier={1} />)}
      </section>
      <div className="bb-detail-actions" data-market-detail-section="actions">
        <button type="button" disabled={!ready} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'COMPLETE_WORK_ORDER', orderId: order.id })}>Deliver</button>
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'PIN_WORK_ORDER', orderId: snapshot.journal.pinnedWorkOrderId === order.id ? null : order.id })}>{snapshot.journal.pinnedWorkOrderId === order.id ? 'Unpin' : 'Pin to Journal'}</button>
      </div>
    </div>
  );
}

function JournalWindow({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('journal');
  const savedLayout = snapshot.windows.layouts.find((layout) => layout.id === 'journal')?.layout;
  const drag = useDraggableReactWindow('journal', dispatchAction, savedLayout);
  const entries = journalEntries(snapshot);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const selected = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0] ?? null;
  const tabs = [
    { id: 'quests', label: 'Quests' },
    { id: 'rumors', label: 'Rumors' },
    { id: 'locations', label: 'Locations' },
    { id: 'spells', label: 'Spells' },
    { id: 'workOrders', label: 'Work Orders' }
  ];

  return (
    <GameWindow className="bb-knowledge-window bb-react-journal" data-react-panel="journal" data-dense-menu-layout="journal" data-journal-layout="split" style={drag.style} headerProps={drag.headerProps} {...drag.windowProps} title="Journal" subtitle={snapshot.journal.tab} actions={<IconButton label="Close journal" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_PANEL', panel: 'journal', open: false })}>x</IconButton>}>
      <SplitPane
        data-bb-layout="split-pane"
        start={
          <div className="bb-journal-sections">
            {tabs.map((tab) => (
              <button className={snapshot.journal.tab === tab.id ? 'is-selected' : ''} type="button" key={tab.id} onClick={() => dispatchAction({ type: 'SET_JOURNAL_TAB', tab: tab.id as GameAction extends { type: 'SET_JOURNAL_TAB'; tab: infer T } ? T : never })}>
                {tab.label}
              </button>
            ))}
          </div>
        }
        end={
          <DetailPane title={selected?.title ?? 'Journal'} data-journal-detail="true">
            <ScrollArea>
              {selected ? <Text as="p" tone="muted">{selected.detail}</Text> : <EmptyState title="No journal entries" description="Discovered objectives and mechanics will appear here." />}
            </ScrollArea>
          </DetailPane>
        }
      >
        <ScrollArea className="bb-knowledge-list" data-journal-entry-list="true">
          <DataList items={entries.map((entry) => ({ id: entry.id, label: entry.title, meta: entry.meta }))} renderItem={(item) => (
            <button className={item.id === selected?.id ? 'is-selected bb-list-button' : 'bb-list-button'} type="button" onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSelectedEntryId(item.id);
            }}>
              <span>{item.label}</span>
              {item.meta ? <small>{item.meta}</small> : null}
            </button>
          )} />
        </ScrollArea>
      </SplitPane>
    </GameWindow>
  );
}

function RequirementRow({ requirement, have, multiplier }: { requirement: RecipeRequirement; have: number; multiplier: number }): ReactElement {
  const needed = requirement.quantity * multiplier;
  const item = itemDefs[requirement.itemId];
  return (
    <div className={`bb-requirement-row ${have >= needed ? 'is-ready' : 'is-missing'}`.trim()}>
      <IconGlyph icon={item?.icon ?? fallbackIcon} label={item?.name ?? requirement.itemId} category={item ? itemIconCategory(item) : 'resource'} />
      <span>{item?.name ?? requirement.itemId}</span>
      <b>{have}/{needed}</b>
    </div>
  );
}

function IconGlyph({ icon, label, category }: { icon: IconDescriptor; label: string; category: IconVisualCategory }): ReactElement {
  return <span className="bb-react-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: renderIcon(icon, label, category) }} />;
}

function spellVisible(spell: SpellDefinition, known: Set<string>, snapshot: GameUISnapshot): boolean {
  const isKnown = known.has(spell.id);
  if (snapshot.spells.knowledgeFilter === 'known' && !isKnown) return false;
  if (snapshot.spells.knowledgeFilter === 'unknown' && isKnown) return false;
  if (snapshot.spells.circleFilter !== 'all' && spell.circle !== snapshot.spells.circleFilter) return false;
  if (snapshot.spells.roleFilter !== 'all' && roleForSpell(spell) !== snapshot.spells.roleFilter) return false;
  const search = snapshot.spells.search.trim().toLowerCase();
  return !search || `${spell.displayName} ${spell.description} ${roleForSpell(spell)} ${spell.reagents.map((req) => itemDefs[req.itemId]?.name ?? req.itemId).join(' ')}`.toLowerCase().includes(search);
}

function roleForSpell(spell: SpellDefinition): SpellRole {
  if (spell.effectType === 'damage') return 'Damage';
  if (spell.effectType === 'heal' || spell.effectType === 'cure') return 'Healing';
  if (spell.effectType === 'recall' || spell.effectType === 'mark_rune') return 'Travel';
  if (spell.effectType === 'wall' || spell.effectType === 'magic_trap' || spell.effectType === 'dispel_field') return 'Control';
  if (spell.effectType === 'debuff' || spell.effectType === 'poison') return 'Debuff';
  if (spell.effectType === 'protection' || spell.effectType === 'strength' || spell.effectType === 'night_sight' || spell.effectType === 'create_food' || spell.effectType === 'water_walk') return 'Support';
  return 'Utility';
}

function journalEntries(snapshot: GameUISnapshot): Array<{ id: string; title: string; meta: string; detail: string }> {
  if (snapshot.journal.tab === 'rumors') return snapshot.journal.rumors.map((rumor) => ({ id: rumor.id, title: rumor.title, meta: rumor.area, detail: rumor.rumor }));
  if (snapshot.journal.tab === 'locations') return snapshot.journal.discoveredAreas.map((area) => ({ id: area, title: area, meta: 'Discovered', detail: `Known location: ${area}.` }));
  if (snapshot.journal.tab === 'spells') return snapshot.spells.knownSpellIds.map((id) => ({ id, title: spellDefs[id]?.displayName ?? id, meta: `Circle ${spellDefs[id]?.circle ?? '-'}`, detail: spellDefs[id]?.description ?? id }));
  if (snapshot.journal.tab === 'workOrders') return snapshot.market.workOrders.filter((order) => order.status === 'open').map((order) => ({ id: order.id, title: order.title ?? order.requester, meta: `${order.rewardGold}g`, detail: `Needs ${(order.requiredItems ?? [{ itemId: order.itemId, quantity: order.quantity }]).map((req) => `${itemDefs[req.itemId]?.name ?? req.itemId} ${accessibleCount(snapshot, req.itemId)}/${req.quantity}`).join(', ')}.` }));
  return snapshot.journal.activeQuests.map((quest) => ({ id: quest.id, title: quest.title, meta: quest.objectives.find((objective) => objective.progress < objective.required)?.label ?? 'Active', detail: quest.description }));
}

function inventoryCount(snapshot: GameUISnapshot, itemId: string): number {
  return snapshot.inventory.slots.reduce((sum, stack) => sum + (stack?.itemId === itemId ? stack.quantity : 0), 0);
}

function accessibleCount(snapshot: GameUISnapshot, itemId: string): number {
  return inventoryCount(snapshot, itemId) + snapshot.bank.slots.reduce((sum, stack) => sum + (stack?.itemId === itemId ? stack.quantity : 0), 0);
}

function rewardLabel(gold: number): string {
  return `${gold}g`;
}

const fallbackIcon: IconDescriptor = { shape: 'bag', primary: '#8c4d24', secondary: '#ca8a4a' };

function dispatchClick(event: MouseEvent<HTMLElement>, dispatchAction: DispatchAction, action: GameAction): void {
  event.preventDefault();
  event.stopPropagation();
  dispatchAction(action);
}

function dispatchChange(event: ChangeEvent<HTMLInputElement>, dispatchAction: DispatchAction, actionForValue: (value: string) => GameAction): void {
  dispatchAction(actionForValue(event.target.value));
}

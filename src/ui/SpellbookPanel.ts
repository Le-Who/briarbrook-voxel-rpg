import { itemDefs } from '../data/items';
import { spellCircles, spellDefs, type SpellDefinition } from '../data/spells';
import type { GameState, RecipeRequirement, SpellbookKnowledgeFilter, SpellbookRoleFilter, SpellbookViewMode } from '../game/types';
import { getSpellCastability } from '../game/UIStateSelectors';
import { renderIcon } from '../render/IconRenderer';
import { getItemCount } from '../systems/InventorySystem';
import { buildSpellTooltip, itemIconCategory, spellIconCategory } from './IconVisualSystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

const roles: SpellbookRoleFilter[] = ['all', 'Damage', 'Healing', 'Utility', 'Control', 'Travel', 'Buff', 'Debuff'];
const views: SpellbookViewMode[] = ['grid', 'list', 'circle'];
const SPELLBOOK_WINDOW_ROWS = 96;

function reagentText(state: GameState, reagents: RecipeRequirement[]): string {
  if (!reagents.length) return '<span class="ready">No reagents</span>';
  return reagents
    .map((req) => {
      const item = itemDefs[req.itemId];
      const have = getItemCount(state.player.inventory, req.itemId);
      return `<span class="${have >= req.quantity ? 'ready' : 'missing'}">${renderIcon(item?.icon, item?.name ?? req.itemId, item ? itemIconCategory(item) : 'reagent')}${item?.name ?? req.itemId} ${have}/${req.quantity}</span>`;
    })
    .join('');
}

function targetLabel(targetType: string): string {
  if (targetType === 'entity') return 'Creature';
  if (targetType === 'tile') return 'Ground';
  if (targetType === 'area') return 'Area';
  if (targetType === 'self') return 'Self';
  if (targetType === 'none') return 'Instant';
  return targetType[0].toUpperCase() + targetType.slice(1);
}

function roleForSpell(spell: SpellDefinition): Exclude<SpellbookRoleFilter, 'all'> {
  if (spell.effectType === 'damage') return 'Damage';
  if (spell.effectType === 'heal' || spell.effectType === 'cure') return 'Healing';
  if (spell.effectType === 'wall' || spell.effectType === 'magic_trap' || spell.effectType === 'dispel_field') return 'Control';
  if (spell.effectType === 'recall' || spell.effectType === 'mark_rune') return 'Travel';
  if (spell.effectType === 'debuff' || spell.effectType === 'poison') return 'Debuff';
  if (spell.effectType === 'protection' || spell.effectType === 'strength' || spell.effectType === 'night_sight') return 'Buff';
  return 'Utility';
}

function spellSearchText(spell: SpellDefinition): string {
  const reagents = spell.reagents.map((req) => itemDefs[req.itemId]?.name ?? req.itemId).join(' ');
  return `${spell.displayName} ${roleForSpell(spell)} circle ${spell.circle} c${spell.circle} ${spell.wordsOfPower ?? ''} ${spell.description} ${reagents}`.toLowerCase();
}

function assignedSlot(state: GameState, spellId: string): string {
  const index = state.ui.hotbar.findIndex((binding) => binding?.kind === 'spell' && binding.id === spellId);
  if (index < 0) return 'Not assigned';
  return `Hotbar ${index === 9 ? 0 : index + 1}`;
}

function spellTooltipVersion(state: GameState, spell: SpellDefinition, isKnown: boolean): string {
  return [
    state.ui.tooltipMode,
    spell.id,
    isKnown ? 'known' : 'unknown',
    state.player.mana.toFixed(0),
    assignedSlot(state, spell.id),
    spell.reagents.map((req) => `${req.itemId}:${getItemCount(state.player.inventory, req.itemId)}`).join('|')
  ].join(':');
}

export function SpellbookPanel(state: GameState): string {
  if (!state.ui.panels.spellbook) return '';
  const known = new Set(state.player.spellbook.knownSpellIds);
  const knowledge = state.ui.spellbookKnowledgeFilter ?? 'known';
  const view = state.ui.spellbookViewMode ?? 'grid';
  const circle = state.ui.spellbookCircleFilter ?? 'all';
  const role = state.ui.spellbookRoleFilter ?? 'all';
  const search = (state.ui.spellbookSearch ?? '').trim().toLowerCase();
  const allSpells = Object.values(spellDefs);
  const visible = allSpells.filter((spell) => {
    const isKnown = known.has(spell.id);
    if (knowledge === 'known' && !isKnown) return false;
    if (knowledge === 'unknown' && isKnown) return false;
    if (circle !== 'all' && spell.circle !== circle) return false;
    if (role !== 'all' && roleForSpell(spell) !== role) return false;
    if (search && !spellSearchText(spell).includes(search)) return false;
    return true;
  });
  const selected = visible.find((spell) => spell.id === state.ui.selectedSpellId) ?? visible[0];
  const selectedKnown = selected ? known.has(selected.id) : false;

  return `<section class="panel spellbook-panel ui-contained-window" data-window-id="spellbook">
    <header><span>Spellbook</span><button data-action="toggle-panel" data-panel="spellbook">x</button></header>
    <div class="spellbook-filters" data-spellbook-filter="${knowledge}">
      <input class="spellbook-search" data-action="spellbook-search" value="${attr(state.ui.spellbookSearch ?? '')}" placeholder="Search spells, words, reagents" />
      <div class="spellbook-filter-row">
        ${(['known', 'all', 'unknown'] as SpellbookKnowledgeFilter[]).map((entry) => `<button class="${knowledge === entry ? 'active' : ''}" data-spellbook-knowledge="${entry}">${entry === 'known' ? 'Known' : entry === 'all' ? 'All' : 'Unknown'}</button>`).join('')}
      </div>
      <div class="spellbook-filter-row spellbook-circles-filter">
        ${(['all', ...spellCircles] as Array<number | 'all'>).map((entry) => `<button class="${circle === entry ? 'active' : ''}" data-spellbook-circle="${entry}">${entry === 'all' ? 'All circles' : `C${entry}`}</button>`).join('')}
      </div>
      <div class="spellbook-filter-row">
        ${roles.map((entry) => `<button class="${role === entry ? 'active' : ''}" data-spellbook-role="${entry}">${entry}</button>`).join('')}
      </div>
      <div class="spellbook-filter-row">
        ${views.map((entry) => `<button class="${view === entry ? 'active' : ''}" data-spellbook-view="${entry}">${entry === 'grid' ? 'Compact Grid' : entry === 'list' ? 'List' : 'Circle'}</button>`).join('')}
      </div>
    </div>
    <div class="spellbook-body spellbook-view-${view}">
      ${renderSpellList(state, visible, selected?.id ?? '', known, view, knowledge)}
      ${selected ? renderSpellDetail(state, selected, selectedKnown) : renderEmptySpellDetail()}
    </div>
  </section>`;
}

function renderSpellList(state: GameState, spells: SpellDefinition[], selectedId: string, known: Set<string>, view: SpellbookViewMode, knowledge: SpellbookKnowledgeFilter): string {
  if (!spells.length) return '<div class="spell-list empty-state">No spells match.</div>';
  const renderedSpells = spells.slice(0, SPELLBOOK_WINDOW_ROWS);
  if (view === 'circle') {
    return `<div class="spell-list spell-circle-view" data-virtualized-list="spells" data-total-rows="${spells.length}" data-rendered-rows="${renderedSpells.length}">${spellCircles
      .map((circle) => {
        const circleSpells = renderedSpells.filter((spell) => spell.circle === circle);
        if (!circleSpells.length) return '';
        return `<section class="spell-circle-group"><h3>Circle ${circle}</h3><div class="spell-card-grid">${circleSpells.map((spell) => renderSpellCard(state, spell, selectedId, known.has(spell.id), knowledge)).join('')}</div></section>`;
      })
      .join('')}</div>`;
  }
  if (view === 'list') {
    return `<div class="spell-list spell-list-view" data-virtualized-list="spells" data-total-rows="${spells.length}" data-rendered-rows="${renderedSpells.length}">${renderedSpells.map((spell) => renderSpellRow(state, spell, selectedId, known.has(spell.id), knowledge)).join('')}</div>`;
  }
  return `<div class="spell-list spell-card-grid" data-virtualized-list="spells" data-total-rows="${spells.length}" data-rendered-rows="${renderedSpells.length}">${renderedSpells.map((spell) => renderSpellCard(state, spell, selectedId, known.has(spell.id), knowledge)).join('')}</div>`;
}

function renderSpellCard(state: GameState, spell: SpellDefinition, selectedId: string, isKnown: boolean, knowledge: SpellbookKnowledgeFilter): string {
  const role = roleForSpell(spell);
  const name = isKnown || knowledge !== 'unknown' ? spell.displayName : 'Unknown Spell';
  const hotbarSource = isKnown ? `data-hotbar-source="spell:${attr(spell.id)}" draggable="true"` : '';
  const tooltip = buildSpellTooltip(spell, state, isKnown, 'compact');
  const advancedTooltip = buildSpellTooltip(spell, state, isKnown, 'advanced');
  return `<button class="spell-card ${selectedId === spell.id ? 'active' : ''} ${isKnown ? 'known' : 'unknown'} role-${role.toLowerCase()}" data-spell="${attr(spell.id)}" data-spell-role="${attr(role)}" ${hotbarSource} data-tooltip-id="spell:${attr(spell.id)}" data-tooltip-source="spellbook" data-tooltip-version="${attr(spellTooltipVersion(state, spell, isKnown))}" data-tooltip="${attr(tooltip)}" data-tooltip-advanced="${attr(advancedTooltip)}">
    ${isKnown ? renderIcon(spell.iconDescriptor, spell.displayName, spellIconCategory(spell)) : '<span class="locked-spell-icon">?</span>'}
    <span class="spell-card-name">${name}</span>
    <span class="spell-card-meta"><b>C${spell.circle}</b><i>${role}</i><em>${isKnown ? 'Known' : 'Locked'}</em>${isKnown ? `<small>${spell.manaCost}m</small>` : ''}</span>
  </button>`;
}

function renderSpellRow(state: GameState, spell: SpellDefinition, selectedId: string, isKnown: boolean, knowledge: SpellbookKnowledgeFilter): string {
  const role = roleForSpell(spell);
  const name = isKnown || knowledge !== 'unknown' ? spell.displayName : 'Unknown Spell';
  const hotbarSource = isKnown ? `data-hotbar-source="spell:${attr(spell.id)}" draggable="true"` : '';
  return `<button class="spell-row ${selectedId === spell.id ? 'active' : ''} ${isKnown ? 'known' : 'unknown'}" data-spell="${attr(spell.id)}" ${hotbarSource}>
    <span>${name}</span><b>C${spell.circle}</b><i>${role}</i><em>${isKnown ? `${spell.manaCost}m` : '-'}</em><small>${isKnown ? `${spell.castTime.toFixed(1)}s / ${spell.range}` : 'Locked'}</small>
  </button>`;
}

function renderEmptySpellDetail(): string {
  return `<div class="spell-detail empty-state">
    <div class="spell-detail-scroll">
      <div class="spell-title"><div><h3>No spell selected</h3><p>Adjust filters or search to show matching spells.</p></div></div>
    </div>
    <div class="spell-detail-actions"><button class="primary disabled" disabled>No spell available</button></div>
  </div>`;
}

function renderSpellDetail(state: GameState, spell: SpellDefinition, isKnown: boolean): string {
  if (!isKnown) {
    return `<div class="spell-detail">
      <div class="spell-detail-scroll">
        <div class="spell-title"><span class="locked-spell-icon large">?</span><div><h3>Unknown Spell</h3><p>Circle ${spell.circle} · ${roleForSpell(spell)}</p></div></div>
        <p>This spell is not written in your spellbook yet. Switch to Known for normal casting or keep Unknown open for collection planning.</p>
      </div>
      <div class="spell-detail-actions"><button class="primary disabled" disabled>Unknown spell</button></div>
    </div>`;
  }
  const magery = state.player.skills.Magery?.value ?? 0;
  const castability = getSpellCastability(state, spell.id);
  return `<div class="spell-detail">
    <div class="spell-detail-scroll">
      <div class="spell-title" data-hotbar-source="spell:${attr(spell.id)}" draggable="true">
        ${renderIcon(spell.iconDescriptor, spell.displayName)}
        <div><h3>${spell.displayName}</h3><p>Circle ${spell.circle} · ${roleForSpell(spell)} · ${targetLabel(spell.targetType)}</p></div>
      </div>
      <p class="spell-words">${spell.wordsOfPower ?? 'Silent working'}</p>
      <p>${spell.description}</p>
      <div class="spell-metrics">
        <span>Mana <b>${Math.round(state.player.mana)}/${spell.manaCost}</b></span>
        <span>Magery <b>${magery.toFixed(1)}/${spell.minSkill.toFixed(1)}</b></span>
        <span>Range <b>${spell.range}</b></span>
        <span>LoS <b>${spell.lineOfSight ? 'Yes' : 'No'}</b></span>
        <span>Cast / Cooldown <b>${spell.castTime.toFixed(1)}s / ${spell.cooldown.toFixed(1)}s</b></span>
        <span>Assigned <b>${assignedSlot(state, spell.id)}</b></span>
      </div>
      <h4>Reagents</h4>
      <div class="spell-reagents">${reagentText(state, spell.reagents)}</div>
    </div>
    <div class="spell-detail-actions">
      <button class="secondary-action" data-action="assign-selected-spell">Assign to Hotbar</button>
      <button class="primary ${castability.canCast ? '' : 'disabled'}" data-action="cast-selected-spell" ${castability.canCast ? '' : 'disabled'}>${castability.canCast ? (spell.targetType === 'entity' || spell.targetType === 'tile' ? 'Target Spell' : 'Cast Spell') : castability.reason}</button>
      <button class="secondary-action" data-action="meditate">Meditate</button>
      ${state.ui.hotbarAssignSpellId === spell.id ? '<p class="spell-assign-hint">Press 1-0 to choose a hotbar slot.</p>' : ''}
    </div>
  </div>`;
}

import { itemDefs } from '../data/items';
import { spellCircles, spellDefs } from '../data/spells';
import type { GameState, RecipeRequirement } from '../game/types';
import { renderIcon } from '../render/IconRenderer';
import { getItemCount } from '../systems/InventorySystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

function reagentText(state: GameState, reagents: RecipeRequirement[]): string {
  if (!reagents.length) return 'No reagents';
  return reagents
    .map((req) => {
      const item = itemDefs[req.itemId];
      const have = getItemCount(state.player.inventory, req.itemId);
      return `<span class="${have >= req.quantity ? 'ready' : 'missing'}">${renderIcon(item?.icon, item?.name ?? req.itemId)}${item?.name ?? req.itemId} ${have}/${req.quantity}</span>`;
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

export function SpellbookPanel(state: GameState): string {
  if (!state.ui.panels.spellbook) return '';
  const selected = spellDefs[state.ui.selectedSpellId] ?? spellDefs.magic_arrow;
  const known = new Set(state.player.spellbook.knownSpellIds);
  const magery = state.player.skills.Magery?.value ?? 0;
  const canCast = known.has(selected.id) && magery >= selected.minSkill && state.player.mana >= selected.manaCost && selected.reagents.every((req) => getItemCount(state.player.inventory, req.itemId) >= req.quantity);
  const search = (state.ui.spellSearch ?? '').trim().toLowerCase();
  const activeCircle = state.ui.spellbookCircle ?? 'all';
  const activeFilter = state.ui.spellbookFilter ?? 'known';
  const view = state.ui.spellbookView ?? 'grid';
  const visibleSpells = Object.values(spellDefs).filter((spell) => {
    if (activeCircle !== 'all' && spell.circle !== activeCircle) return false;
    if (activeFilter === 'known' && !known.has(spell.id)) return false;
    if (activeFilter === 'unknown' && known.has(spell.id)) return false;
    if (search && !`${spell.displayName} ${spell.category} ${spell.description} ${spell.wordsOfPower ?? ''}`.toLowerCase().includes(search)) return false;
    return true;
  });
  const reagentSummary = (spell: typeof selected) =>
    spell.reagents.length
      ? spell.reagents
          .map((req) => {
            const item = itemDefs[req.itemId];
            const have = getItemCount(state.player.inventory, req.itemId);
            return `${item?.name ?? req.itemId} ${have}/${req.quantity}`;
          })
          .join(', ')
      : 'No reagents';

  return `<section class="panel spellbook-panel">
    <header><span>Spellbook</span><button data-action="toggle-panel" data-panel="spellbook">x</button></header>
    <div class="spellbook-body">
      <div class="spell-browser">
        <div class="spell-toolbar">
          <input class="spell-search" name="spell-search" data-action="spell-search" value="${attr(state.ui.spellSearch ?? '')}" placeholder="Search spells" />
          <div class="spell-view-toggle">
            <button class="${view === 'grid' ? 'active' : ''}" data-spellbook-view="grid">Grid</button>
            <button class="${view === 'list' ? 'active' : ''}" data-spellbook-view="list">List</button>
          </div>
        </div>
        <div class="spell-filter-tabs">
          ${(['known', 'all', 'unknown'] as const).map((filter) => `<button class="${activeFilter === filter ? 'active' : ''}" data-spellbook-filter="${filter}">${filter === 'known' ? 'Known' : filter === 'unknown' ? 'Unknown' : 'All'}</button>`).join('')}
        </div>
        <div class="spell-circle-tabs">
          <button class="${activeCircle === 'all' ? 'active' : ''}" data-spell-circle="all">All</button>
          ${spellCircles.map((circle) => `<button class="${activeCircle === circle ? 'active' : ''}" data-spell-circle="${circle}">C${circle}</button>`).join('')}
        </div>
        <div class="spell-list ${view === 'list' ? 'list-view' : 'grid-view'}">
          ${
            visibleSpells
              .map((spell) => {
                const isKnown = known.has(spell.id);
                const ready = isKnown && magery >= spell.minSkill;
                const tooltip = `${spell.description}\n${spell.category} · ${targetLabel(spell.targetType)}\nCircle ${spell.circle}\nMana: ${spell.manaCost}\nCast: ${spell.castTime.toFixed(1)}s · Cooldown: ${spell.cooldown.toFixed(1)}s\nReagents: ${reagentSummary(spell)}\nMin Magery: ${spell.minSkill.toFixed(1)}`;
                return `<button class="spell-entry ${selected.id === spell.id ? 'active' : ''} ${isKnown ? 'known' : 'unknown'}" data-spell="${attr(spell.id)}" data-hotbar-source="spell:${attr(spell.id)}" data-drag-kind="spell" data-source-window-id="spellbook" data-spell-id="${attr(spell.id)}" data-display-name="${attr(spell.displayName)}" data-tooltip="${attr(tooltip)}" title="${attr(spell.description)}">
                  ${renderIcon(spell.iconDescriptor, spell.displayName)}
                  <span>${spell.displayName}<small>C${spell.circle} · ${spell.category} · ${targetLabel(spell.targetType)}</small></span>
                  <b>${spell.manaCost}m</b>
                  <em>${spell.castTime.toFixed(1)}s</em>
                  <small class="${ready ? 'ready' : 'missing'}">${isKnown ? (ready ? 'Ready' : `Magery ${spell.minSkill.toFixed(1)}`) : 'Unknown'}</small>
                </button>`;
              })
              .join('') || '<p class="empty-state">No spells match.</p>'
          }
        </div>
      </div>
      <div class="spell-detail">
        <div class="spell-title">
          ${renderIcon(selected.iconDescriptor, selected.displayName)}
          <div><h3>${selected.displayName}</h3><p>Circle ${selected.circle} · ${selected.category} · ${targetLabel(selected.targetType)} · ${selected.castTime.toFixed(1)}s</p></div>
        </div>
        <p class="spell-words">${selected.wordsOfPower ?? 'Silent working'}</p>
        <p>${selected.description}</p>
        <div class="spell-metrics">
          <span>Mana <b>${Math.round(state.player.mana)}/${selected.manaCost}</b></span>
          <span>Magery <b>${magery.toFixed(1)}/${selected.minSkill.toFixed(1)}</b></span>
          <span>Range <b>${selected.range}</b></span>
          <span>LoS <b>${selected.lineOfSight ? 'Yes' : 'No'}</b></span>
          <span>Mode <b>${selected.friendlyMode}</b></span>
        </div>
        <h4>Reagents</h4>
        <div class="spell-reagents">${reagentText(state, selected.reagents)}</div>
        <button class="secondary-action" data-action="assign-selected-spell" data-hotbar-source="spell:${attr(selected.id)}" data-drag-kind="spell" data-source-window-id="spellbook" data-spell-id="${attr(selected.id)}" data-display-name="${attr(selected.displayName)}">Assign to Hotbar</button>
        <button class="primary ${canCast ? '' : 'disabled'}" data-action="cast-selected-spell">${selected.targetType === 'entity' || selected.targetType === 'tile' ? 'Target Spell' : 'Cast Spell'}</button>
        <button class="secondary-action" data-action="meditate">Meditate</button>
      </div>
    </div>
  </section>`;
}

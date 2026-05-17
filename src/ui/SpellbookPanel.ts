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

  return `<section class="panel spellbook-panel">
    <header><span>Spellbook</span><button data-action="toggle-panel" data-panel="spellbook">x</button></header>
    <div class="spellbook-body">
      <div class="spell-circles">
        ${spellCircles
          .map((circle) => {
            const spells = Object.values(spellDefs).filter((spell) => spell.circle === circle);
            return `<div class="spell-circle">
              <h3>Circle ${circle}</h3>
              ${spells
                .map((spell) => {
                  const isKnown = known.has(spell.id);
                  const ready = isKnown && magery >= spell.minSkill;
                  const tooltip = `${spell.description}\n${spell.category} · ${targetLabel(spell.targetType)}\nCircle ${spell.circle}\nMana: ${spell.manaCost}\nMin Magery: ${spell.minSkill.toFixed(1)}`;
                  return `<button class="spell-entry ${selected.id === spell.id ? 'active' : ''} ${isKnown ? 'known' : 'unknown'}" data-spell="${attr(spell.id)}" data-hotbar-source="spell:${attr(spell.id)}" draggable="true" data-tooltip="${attr(tooltip)}" title="${attr(spell.description)}">
                    ${renderIcon(spell.iconDescriptor, spell.displayName)}
                    <span>${spell.displayName}<small>${spell.category} · ${ready ? `${spell.manaCost} mana` : `Magery ${spell.minSkill.toFixed(1)}`}</small></span>
                  </button>`;
                })
                .join('')}
            </div>`;
          })
          .join('')}
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
        <button class="primary ${canCast ? '' : 'disabled'}" data-action="cast-selected-spell">${selected.targetType === 'entity' || selected.targetType === 'tile' ? 'Target Spell' : 'Cast Spell'}</button>
        <button class="secondary-action" data-action="meditate">Meditate</button>
      </div>
    </div>
  </section>`;
}

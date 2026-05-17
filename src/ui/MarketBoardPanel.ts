import { marketCategories } from '../data/economy';
import { itemDefs } from '../data/items';
import type { GameState, RecipeRequirement } from '../game/types';
import { renderIcon } from '../render/IconRenderer';
import { getItemCount } from '../systems/InventorySystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

function requirementsLabel(requirements: RecipeRequirement[]): string {
  return requirements.map((requirement) => `${itemDefs[requirement.itemId]?.name ?? requirement.itemId} ${requirement.quantity}`).join(' + ');
}

export function MarketBoardPanel(state: GameState): string {
  if (!state.ui.panels.market) return '';
  const category = state.ui.marketCategory ?? 'all';
  const search = (state.ui.marketSearch ?? '').trim().toLowerCase();
  const matches = (itemId: string, itemCategory = 'misc', extra = '') => {
    const item = itemDefs[itemId];
    if (category !== 'all' && itemCategory !== category) return false;
    if (!search) return true;
    return `${item?.name ?? itemId} ${itemId} ${extra}`.toLowerCase().includes(search);
  };
  const buyOrders = state.world.economy.marketOrders.filter((order) => order.status === 'open' && order.kind === 'buy' && matches(order.itemId, order.category, order.poster));
  const sellOrders = state.world.economy.marketOrders.filter((order) => order.status === 'open' && order.kind === 'sell' && matches(order.itemId, order.category, order.poster));
  const workOrders = state.world.economy.workOrders.filter((order) => {
    if (order.status !== 'open') return false;
    if (category !== 'all' && order.category !== category) return false;
    if (!search) return true;
    return `${order.title ?? ''} ${order.requester} ${requirementsLabel(order.requiredItems ?? [{ itemId: order.itemId, quantity: order.quantity }])}`.toLowerCase().includes(search);
  });

  return `<section class="panel market-panel">
    <header><span>Briarbrook Market Board</span><button data-action="toggle-panel" data-panel="market">x</button></header>
    <div class="market-controls">
      <input class="market-search" data-action="market-search" value="${attr(state.ui.marketSearch ?? '')}" placeholder="Search item or issuer" />
      <div class="market-categories">
        ${marketCategories.map((entry) => `<button class="${category === entry ? 'active' : ''}" data-market-category="${entry}">${entry}</button>`).join('')}
      </div>
    </div>
    <div class="market-columns">
      <div>
        <h3>Buy Orders</h3>
        ${buyOrders
          .map((order) => {
            const def = itemDefs[order.itemId];
            const have = getItemCount(state.player.inventory, order.itemId);
            return `<article class="market-order demand">
              ${renderIcon(def.icon, def.name)}
              <span><b>${def.name} x${order.quantity}</b><small>${order.poster} · ${order.source ?? 'npc'} · have ${have}/${order.quantity}</small></span>
              <strong>${order.unitPrice}g ea</strong>
              <button data-market-order="${order.id}">Fulfill</button>
            </article>`;
          })
          .join('') || '<small>No matching buy orders.</small>'}
      </div>
      <div>
        <h3>Sell Orders</h3>
        ${sellOrders
          .map((order) => {
            const def = itemDefs[order.itemId];
            return `<article class="market-order supply">
              ${renderIcon(def.icon, def.name)}
              <span><b>${def.name} x${order.quantity}</b><small>${order.poster} · ${order.source ?? 'npc'} · expires ${Math.max(0, Math.ceil(order.expiresAt - state.clock))}s</small></span>
              <strong>${order.unitPrice}g ea</strong>
              <button data-market-order="${order.id}">Buy</button>
            </article>`;
          })
          .join('') || '<small>No matching sell orders.</small>'}
      </div>
      <div>
        <h3>Work Orders</h3>
        ${workOrders
          .map((order) => {
            const required = order.requiredItems ?? [{ itemId: order.itemId, quantity: order.quantity }];
            const ready = required.every((requirement) => getItemCount(state.player.inventory, requirement.itemId) >= requirement.quantity);
            return `<article class="market-order work ${ready ? 'ready' : ''}">
              ${renderIcon(itemDefs[order.itemId].icon, itemDefs[order.itemId].name)}
              <span><b>${order.title ?? order.requester}</b><small>${order.requester} · ${requirementsLabel(required)} · ${order.rewardSkillHints?.slice(0, 2).join(', ') ?? order.skill}</small></span>
              <strong>${order.rewardGold}g</strong>
              <button data-work-order="${order.id}">Deliver</button>
            </article>`;
          })
          .join('') || '<small>No matching work orders.</small>'}
      </div>
    </div>
  </section>`;
}

import { economyCategoryLabels, marketCategories } from '../data/economy';
import { itemDefs } from '../data/items';
import type { GameState, RecipeRequirement, WorkOrderState } from '../game/types';
import { renderIcon } from '../render/IconRenderer';
import { getAccessibleItemCount, hasBankOrderAccess } from '../systems/EconomySystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

const MARKET_ORDER_WINDOW_ROWS = 60;

function requirementsLabel(requirements: RecipeRequirement[]): string {
  return requirements.map((requirement) => `${itemDefs[requirement.itemId]?.name ?? requirement.itemId} ${requirement.quantity}`).join(' + ');
}

function requirementProgressLabel(state: GameState, requirements: RecipeRequirement[]): string {
  return requirements.map((requirement) => `${itemDefs[requirement.itemId]?.name ?? requirement.itemId} ${getAccessibleItemCount(state, requirement.itemId)}/${requirement.quantity}`).join(' + ');
}

function rewardLabel(order: WorkOrderState): string {
  const parts = [`${order.rewardGold}g`];
  if (order.rewardItems?.length) parts.push(...order.rewardItems.map((item) => `${itemDefs[item.itemId]?.name ?? item.itemId} x${item.quantity}`));
  if (order.rewardVoucherItems?.length) parts.push(...order.rewardVoucherItems.map((item) => `${itemDefs[item.itemId]?.name ?? item.itemId} voucher x${item.quantity}`));
  if (order.rewardRecipeIds?.length) parts.push(`recipe ${order.rewardRecipeIds.length}`);
  if (order.rewardDiscount) parts.push(`${order.rewardDiscount.percent}% ${order.rewardDiscount.label}`);
  return parts.join(' · ');
}

export function MarketBoardPanel(state: GameState): string {
  if (!state.ui.panels.market) return '';
  const category = state.ui.marketCategory ?? 'all';
  const view = state.ui.marketView ?? 'work';
  const search = (state.ui.marketSearch ?? '').trim().toLowerCase();
  const bankAccess = hasBankOrderAccess(state);
  const demandSignals = (state.world.economy.demandSignals ?? []).filter((signal) => signal.endsAt > state.clock);
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

  const workOrdersHtml = `<div class="market-work-column">
        <h3>Available Work Orders</h3>
        ${workOrders.slice(0, MARKET_ORDER_WINDOW_ROWS)
          .map((order) => {
            const required = order.requiredItems ?? [{ itemId: order.itemId, quantity: order.quantity }];
            const ready = required.every((requirement) => getAccessibleItemCount(state, requirement.itemId) >= requirement.quantity);
            const def = itemDefs[order.itemId];
            const categoryLabel = economyCategoryLabels[order.category ?? 'misc'] ?? order.category ?? 'Misc';
            const pinned = state.ui.pinnedWorkOrderId === order.id;
            return `<article class="market-order work ${ready ? 'ready' : ''}">
              ${renderIcon(def.icon, def.name)}
              <span>
                <b>${order.title ?? order.requester}</b>
                <small>${categoryLabel} · ${order.requester} · Needs ${requirementProgressLabel(state, required)}</small>
                <small>Reward: ${rewardLabel(order)}</small>
                <small>Time ${Math.max(0, Math.ceil(order.expiresAt - state.clock))}s · Bank access ${bankAccess ? 'nearby' : 'inventory only'} · ${order.rewardSkillHints?.slice(0, 2).join(', ') ?? order.skill}</small>
              </span>
              <strong>${ready ? 'Ready' : 'Open'}</strong>
              <button data-pin-work-order="${order.id}">${pinned ? 'Unpin' : 'Pin'}</button>
              <button data-work-order="${order.id}">Deliver</button>
            </article>`;
          })
          .join('') || '<small>No matching work orders.</small>'}
      </div>`;
  const buyOrdersHtml = `<div>
        <h3>Buy Orders</h3>
        ${buyOrders.slice(0, MARKET_ORDER_WINDOW_ROWS)
          .map((order) => {
            const def = itemDefs[order.itemId];
            const have = getAccessibleItemCount(state, order.itemId);
            return `<article class="market-order demand">
              ${renderIcon(def.icon, def.name)}
              <span><b>${def.name} x${order.quantity}</b><small>${order.poster} · ${order.source ?? 'npc'} · have ${have}/${order.quantity} · Bank access ${bankAccess ? 'nearby' : 'inventory only'}</small></span>
              <strong>${order.unitPrice}g ea</strong>
              <button data-market-order="${order.id}">Fulfill</button>
            </article>`;
          })
          .join('') || '<small>No matching buy orders.</small>'}
      </div>`;
  const sellOrdersHtml = `<div>
        <h3>Sell Orders</h3>
        ${sellOrders.slice(0, MARKET_ORDER_WINDOW_ROWS)
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
      </div>`;
  const columns = view === 'work' ? workOrdersHtml : view === 'trade' ? `${buyOrdersHtml}${sellOrdersHtml}` : `${workOrdersHtml}${buyOrdersHtml}${sellOrdersHtml}`;

  return `<section class="panel market-panel market-mode-${view} ui-contained-window" data-window-id="market">
    <header><span>Briarbrook Market Board</span><button data-action="toggle-panel" data-panel="market">x</button></header>
    <div class="market-controls">
      <div class="market-view-tabs">
        ${(['work', 'trade', 'all'] as const).map((entry) => `<button class="${view === entry ? 'active' : ''}" data-market-view="${entry}">${entry === 'work' ? 'Work Orders' : entry === 'trade' ? 'Trade' : 'Advanced'}</button>`).join('')}
      </div>
      <input class="market-search" data-action="market-search" value="${attr(state.ui.marketSearch ?? '')}" placeholder="Search item or issuer" />
      <div class="market-categories">
        ${marketCategories.map((entry) => `<button class="${category === entry ? 'active' : ''}" data-market-category="${entry}">${economyCategoryLabels[entry]}</button>`).join('')}
      </div>
    </div>
    ${
      demandSignals.length
        ? `<div class="market-demand-signals">
            ${demandSignals
              .slice(0, 4)
              .map((signal) => `<span><b>${attr(signal.label)}</b><small>${signal.affected.slice(0, 4).join(', ')} · ${Math.max(0, Math.ceil(signal.endsAt - state.clock))}s</small></span>`)
              .join('')}
          </div>`
        : ''
    }
    <div class="market-columns" data-virtualized-list="market" data-total-rows="${workOrders.length + buyOrders.length + sellOrders.length}" data-rendered-rows="${Math.min(workOrders.length, MARKET_ORDER_WINDOW_ROWS) + Math.min(buyOrders.length, MARKET_ORDER_WINDOW_ROWS) + Math.min(sellOrders.length, MARKET_ORDER_WINDOW_ROWS)}">
      ${columns}
    </div>
  </section>`;
}

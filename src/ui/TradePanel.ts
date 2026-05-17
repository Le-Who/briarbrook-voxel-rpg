import type { GameState } from '../game/types';
import { renderSlots } from './InventoryPanel';

export function TradePanel(state: GameState): string {
  const trade = state.ui.trade;
  if (!state.ui.panels.trade || !trade) return '';
  const partner = state.entities[trade.partnerId];
  return `<section class="panel trade-panel">
    <header><span>Trade</span><button data-action="cancel-trade">x</button></header>
    <div class="trade-head">
      <strong>Valen <small>(You)</small></strong>
      <span class="lock ${trade.playerLocked ? 'locked' : ''}">lock</span>
      <strong>${partner?.name ?? 'Trader'} <small>(Player)</small></strong>
    </div>
    <div class="trade-sides">
      <div><label>Gold</label><input data-action="trade-gold" type="number" min="0" max="${state.player.gold}" value="${trade.playerGold}"/>${renderSlots(trade.playerSlots, 'trade', null)}</div>
      <div><label>Gold</label><b class="trade-gold">${trade.partnerGold}</b>${renderSlots(trade.partnerSlots, 'partner', null)}</div>
    </div>
    <footer><button data-action="lock-trade">${trade.playerLocked ? 'Locked' : 'Lock Trade'}</button><button data-action="cancel-trade">Cancel</button></footer>
  </section>`;
}

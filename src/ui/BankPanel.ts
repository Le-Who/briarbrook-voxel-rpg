import type { GameState } from '../game/types';
import { renderSlots } from './InventoryPanel';

export function BankPanel(state: GameState): string {
  if (!state.ui.panels.bank) return '';
  const used = state.player.bank.slots.filter(Boolean).length;
  return `<section class="panel bank-panel ui-contained-window" data-window-id="bank" data-service-panel="bank">
    <header><span>Bank Storage</span><button data-action="toggle-panel" data-panel="bank">x</button></header>
    <div class="service-summary">
      <span><b>Storage</b>${used}/${state.player.bank.capacity}</span>
      <span><b>Gold</b>${state.player.bankGold}</span>
    </div>
    ${renderSlots(state.player.bank, 'bank', state.ui.selectedBankSlot, state)}
    <footer class="panel-footer"><span class="gold">●</span><span>${state.player.bankGold}</span><span class="spacer"></span><button data-action="withdraw-selected">Withdraw</button><button data-action="take-all-bank">Take All</button></footer>
  </section>`;
}

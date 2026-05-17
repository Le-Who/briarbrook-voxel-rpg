import type { GameState } from '../game/types';
import { renderSlots } from './InventoryPanel';

export function BankPanel(state: GameState): string {
  if (!state.ui.panels.bank) return '';
  return `<section class="panel bank-panel">
    <header><span>Bank Chest</span><button data-action="toggle-panel" data-panel="bank">x</button></header>
    ${renderSlots(state.player.bank, 'bank', state.ui.selectedBankSlot)}
    <footer class="panel-footer"><span class="gold">●</span><span>${state.player.bankGold}</span><span class="spacer"></span><button data-action="withdraw-selected">Withdraw</button><button data-action="take-all-bank">Take All</button></footer>
  </section>`;
}

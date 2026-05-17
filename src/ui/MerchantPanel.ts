import { itemDefs } from '../data/items';
import type { GameState, ItemStack } from '../game/types';
import { renderIcon } from '../render/IconRenderer';

function price(stack: ItemStack, multiplier = 1): number {
  return Math.max(1, Math.round((itemDefs[stack.itemId]?.value ?? 1) * stack.quantity * multiplier));
}

export function MerchantPanel(state: GameState): string {
  const merchantState = state.ui.merchant;
  if (!state.ui.panels.merchant || !merchantState) return '';
  const merchant = state.entities[merchantState.partnerId];
  if (!merchant || (merchant.kind !== 'npc' && merchant.kind !== 'social')) return '';
  const stock = merchant.tradeInventory?.slots ?? [];
  const selectedSlot = state.ui.selectedInventorySlot;
  const selected = selectedSlot != null ? state.player.inventory.slots[selectedSlot] : null;
  const training = merchant.training ?? [];
  return `<section class="panel merchant-panel">
    <header><span>${merchant.name}'s Wares</span><button data-action="close-merchant">x</button></header>
    <div class="merchant-body">
      <div class="merchant-stock">
        <h4>Buy</h4>
        ${stock
          .map((stack, slot) => {
            if (!stack) return '';
            const def = itemDefs[stack.itemId];
            return `<div class="merchant-row">${renderIcon(def.icon, def.name)}<span>${def.name}<small>x${stack.quantity}</small></span><b>${price(stack)}g</b><button data-buy-slot="${slot}">Buy</button></div>`;
          })
          .join('') || '<small>No stock available</small>'}
      </div>
      <div class="merchant-sell">
        <h4>Sell</h4>
        ${
          selected
            ? `<div class="merchant-row selected">${renderIcon(itemDefs[selected.itemId].icon, itemDefs[selected.itemId].name)}<span>${itemDefs[selected.itemId].name}<small>x${selected.quantity}</small></span><b>${price(selected, 0.55)}g</b><button data-action="sell-selected">Sell</button></div>`
            : '<small>Select an inventory item to sell.</small>'
        }
        <p>Merchant gold: ${merchant.tradeGold ?? 0}g</p>
        ${
          training.length
            ? `<h4>Training</h4>${training
                .map((offer) => {
                  const skill = state.player.skills[offer.skillId];
                  const current = skill?.value ?? 0;
                  const cost = Math.max(1, Math.round((Math.floor(current) + 1) * offer.costPerPoint));
                  const capped = current >= offer.maxSkill;
                  return `<div class="merchant-row training-row"><span>${offer.skillId}<small>${current.toFixed(1)} / ${offer.maxSkill}</small></span><b>${capped ? 'Max' : `${cost}g`}</b><button ${capped ? 'disabled' : ''} data-action="train-skill" data-skill-id="${offer.skillId}">Train</button></div>`;
                })
                .join('')}`
            : ''
        }
      </div>
    </div>
  </section>`;
}

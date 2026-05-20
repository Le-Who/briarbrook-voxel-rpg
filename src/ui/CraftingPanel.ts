import { itemDefs } from '../data/items';
import { recipes, stationLabels } from '../data/recipes';
import type { GameState } from '../game/types';
import { getItemCount } from '../systems/InventorySystem';
import { renderIcon } from '../render/IconRenderer';

export function CraftingPanel(state: GameState): string {
  if (!state.ui.panels.crafting) return '';
  const station = state.ui.selectedStationType ?? 'forge';
  const visibleRecipes = recipes.filter((recipe) => station === 'all' || recipe.stationType === station);
  const selectedCandidate = recipes.find((recipe) => recipe.id === state.ui.selectedRecipeId);
  const selected = selectedCandidate && (station === 'all' || selectedCandidate.stationType === station) ? selectedCandidate : visibleRecipes[0] ?? recipes[0];
  const quantity = state.ui.craftQuantity;
  const selectedDef = itemDefs[selected.outputItemId];
  const stations = Object.entries(stationLabels) as Array<[keyof typeof stationLabels, string]>;
  const marketUnlocked = hasMarketAccess(state);
  const title = station === 'forge' ? 'Blacksmithing' : 'Crafting Network';
  const canCraft = selected.inputs.every((req) => getItemCount(state.player.inventory, req.itemId) >= req.quantity * quantity);
  return `<section class="panel crafting-panel" data-service-panel="smithy">
    <header><span>${title}</span><button data-action="toggle-panel" data-panel="crafting">x</button></header>
    <div class="craft-stations">
      <button class="${station === 'all' ? 'active' : ''}" data-craft-station="all">All</button>
      ${stations.map(([id, label]) => `<button class="${station === id ? 'active' : ''}" data-craft-station="${id}">${label}</button>`).join('')}
    </div>
    <div class="craft-body">
      <div class="recipe-list">
        ${visibleRecipes
          .map((recipe) => {
            const def = itemDefs[recipe.outputItemId];
            return `<button class="${recipe.id === selected.id ? 'active' : ''}" data-recipe="${recipe.id}">
              ${renderIcon(def.icon, def.name)}<span>${recipe.name}<small>${recipe.skill} ${recipe.minSkill}+ · ${stationLabels[recipe.stationType]}</small></span>
            </button>`;
          })
          .join('')}
      </div>
      <div class="recipe-detail">
        <div class="recipe-title">
          ${renderIcon(selectedDef.icon, selectedDef.name)}
          <div><h3>${selected.name}</h3><p>${selectedDef?.name ?? selected.outputItemId} · ${selected.duration}s each · ${selected.skill} · Difficulty ${selected.difficulty}</p></div>
        </div>
        <div class="recipe-meta"><span>${stationLabels[selected.stationType]}</span><span>Quality: ${selected.qualityTier}</span><span>Failure: ${selected.failureMode}</span></div>
        <h4>Requirements:</h4>
        ${selected.inputs
          .map((req) => {
            const needed = req.quantity * quantity;
            const have = getItemCount(state.player.inventory, req.itemId);
            const def = itemDefs[req.itemId];
            return `<div class="requirement">${renderIcon(def.icon, def.name)}<span>${def.name}</span><b>${have}/${needed}</b><i>${have >= needed ? '✓' : '×'}</i></div>`;
          })
          .join('')}
        <h4>Outputs:</h4>
        ${selected.outputs
          .map((output) => {
            const def = itemDefs[output.itemId];
            return `<div class="requirement output">${renderIcon(def.icon, def.name)}<span>${def.name}</span><b>x${output.quantity * quantity}</b><i>${output.materialType ?? ''}</i></div>`;
          })
          .join('')}
        <div class="recipe-actions-sticky">
          <div class="quantity-stepper">
            <span>Quantity</span>
            <button data-action="craft-qty-down">-</button>
            <b>${quantity}</b>
            <button data-action="craft-qty-up">+</button>
          </div>
          <span class="craft-readiness ${canCraft ? 'ready' : 'blocked'}">${canCraft ? 'Ready' : 'Missing Materials'}</span>
          <button class="primary" data-action="craft-selected"${canCraft ? '' : ' disabled'}>Craft x${quantity}</button>
        </div>
        <h4>Crafting Queue</h4>
        <div class="queue">
          ${state.craftQueue
            .map((job) => {
              const recipe = recipes.find((candidate) => candidate.id === job.recipeId);
              const pct = 100 - (job.remaining / job.total) * 100;
              return `<div class="queue-job"><span>${recipe?.name ?? job.recipeId}</span><b>${Math.ceil(job.remaining)}s</b><i style="width:${pct}%"></i></div>`;
            })
            .join('') || '<small>No active jobs</small>'}
        </div>
        <h4>Repairs</h4>
        <div class="repair-actions">
          ${(['weapon', 'armor', 'shield', 'helmet', 'boots'] as const)
            .map((slot) => {
              const stack = state.player.equipment[slot];
              if (!stack?.maxDurability) return '';
              const def = itemDefs[stack.itemId];
              return `<button data-repair-slot="${slot}">${def.name}<small>${stack.durability ?? stack.maxDurability}/${stack.maxDurability}</small></button>`;
            })
            .join('') || '<small>No equipped gear needs a repair profile.</small>'}
        </div>
        <h4>Work Orders</h4>
        <p class="economy-hint">Reward preview is shown before delivery. Brom pays extra for ingots when the board is active.</p>
        <div class="economy-list">
          ${state.world.economy.workOrders
            .filter((order) => order.status === 'open')
            .slice(0, 5)
            .map((order) => {
              const def = itemDefs[order.itemId];
              const have = getItemCount(state.player.inventory, order.itemId);
              return `<div class="merchant-row economy-row">${renderIcon(def.icon, def.name)}<span>${order.requester}<small>${def.name} ${have}/${order.quantity}</small></span><b>${order.rewardGold}g</b><button data-work-order="${order.id}">Deliver</button></div>`;
            })
            .join('') || '<small>No open work orders.</small>'}
        </div>
        <h4>Market Board</h4>
        <div class="economy-list">
          ${
            marketUnlocked
              ? state.world.economy.marketOrders
                  .filter((order) => order.status === 'open')
                  .slice(0, 5)
                  .map((order) => {
                    const def = itemDefs[order.itemId];
                    const verb = order.kind === 'buy' ? 'Sell' : 'Buy';
                    return `<div class="merchant-row economy-row">${renderIcon(def.icon, def.name)}<span>${order.poster}<small>${order.kind.toUpperCase()} ${def.name} x${order.quantity}</small></span><b>${order.unitPrice}g ea</b><button data-market-order="${order.id}">${verb}</button></div>`;
                  })
                  .join('') || '<small>No open market orders.</small>'
              : '<small>Gather or craft your first tradable goods to unlock the market board.</small>'
          }
        </div>
      </div>
    </div>
  </section>`;
}

function hasMarketAccess(state: GameState): boolean {
  return (
    state.world.economy.transactionLog.some((entry) => entry.kind === 'market' || entry.kind === 'work_order') ||
    (state.player.skills.Lumberjacking?.lastGainAt ?? 0) > 0 ||
    (state.player.skills.Mining?.lastGainAt ?? 0) > 0 ||
    state.quests.ore_for_brom?.objectives.some((objective) => objective.type === 'craft' && objective.progress > 0) ||
    state.player.completedQuestIds.includes('prepare_for_road')
  );
}

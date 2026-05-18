import { buildPieces, itemDefs } from '../data/items';
import type { BuildPieceDef, GameState } from '../game/types';
import { getItemCount } from '../systems/InventorySystem';
import { canUpgradeHousing, currentHousingTier, getOwnedHousingPlot, homeCraftStations, housingStorages, nextHousingTier, selectedHousingStorage, storageWeight } from '../systems/HousingSystem';
import { renderIcon } from '../render/IconRenderer';
import { stationLabels } from '../data/recipes';

const categories = Array.from(new Set(buildPieces.map((piece) => piece.category))) as BuildPieceDef['category'][];

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

export function BuildPanel(state: GameState): string {
  if (!state.ui.panels.build) return '';
  const category = categories.includes(state.ui.selectedBuildCategory) ? state.ui.selectedBuildCategory : categories[0];
  const pieces = buildPieces.filter((piece) => piece.category === category);
  const selected = buildPieces.find((piece) => piece.id === state.buildMode.selectedPieceId) ?? buildPieces[0];
  const plot = getOwnedHousingPlot(state);
  const tier = currentHousingTier(state);
  const nextTier = nextHousingTier(state);
  const upgrade = canUpgradeHousing(state);
  const storages = housingStorages(state);
  const activeStorage = selectedHousingStorage(state);
  const stations = homeCraftStations(state);
  const selectedInventoryStack = state.ui.selectedInventorySlot == null ? null : state.player.inventory.slots[state.ui.selectedInventorySlot];
  const placed = state.world.placedBuildings.filter((piece) => piece.area === 'housing');
  const gardens = Object.values(state.world.housing.gardens);
  return `<section class="panel build-panel">
    <header><span>${plot?.name ?? 'Starter Plot'}</span><button data-action="toggle-build">x</button></header>
    <div class="plot-summary">
      <div><b>${plot ? tier.name : 'Unclaimed Plot'}</b><span>${plot ? `${placed.length}/${tier.placementLimit} objects` : 'Claim before placing'}</span></div>
      <button data-action="claim-plot">${plot ? 'Claimed' : 'Claim Plot'}</button>
      ${nextTier ? `<button data-action="upgrade-housing" class="${upgrade.ok ? 'primary' : ''}" data-tooltip-id="housing:upgrade" data-tooltip-source="build" data-tooltip="${attr(upgrade.message)}">Upgrade: ${nextTier.name}</button>` : ''}
    </div>
    <div class="build-tabs">${categories.map((tab) => `<button class="${category === tab ? 'active' : ''}" data-build-category="${tab}">${tab}</button>`).join('')}</div>
    <div class="build-grid">
      ${pieces
        .map((piece) => `<button class="build-piece ${piece.id === selected.id ? 'selected' : ''}" data-build-piece="${piece.id}" data-tooltip-id="build-piece:${attr(piece.id)}" data-tooltip-source="build" data-tooltip="${attr(`${piece.name}\n${piece.description}`)}">${renderIcon(piece.icon, piece.name)}</button>`)
        .join('')}
    </div>
    <div class="build-detail">
      <strong>${selected.name}</strong><p>${selected.description}</p>
      <span class="placed-count">${state.buildMode.moveBuildingId ? 'Move mode active' : `Selected: ${selected.category}`}</span>
      <div>${selected.cost
        .map((cost) => {
          const def = itemDefs[cost.itemId];
          const have = getItemCount(state.player.inventory, cost.itemId);
          const message = have < cost.quantity ? `Missing ${cost.quantity - have} ${def.name}` : def.name;
          return `<span class="cost ${have < cost.quantity ? 'missing' : ''}" data-tooltip-id="build-cost:${attr(cost.itemId)}" data-tooltip-source="build" data-tooltip="${attr(message)}">${renderIcon(def.icon, def.name)} ${have}/${cost.quantity}</span>`;
        })
        .join('')}</div>
      <button data-action="place-building" class="primary">Place</button>
      <button data-action="undo-building">Undo</button>
      <button data-action="move-last-building">Move Last</button>
    </div>
    <div class="housing-tools">
      <div class="storage-list">
        <b>Home Storage</b>
        ${
          storages.length
            ? storages
                .map((storage) => `<button class="${activeStorage?.id === storage.id ? 'active' : ''}" data-housing-storage="${storage.id}"><span>${storage.name}</span><small>${storage.inventory.slots.filter(Boolean).length}/${storage.inventory.capacity} · ${storageWeight(storage)}/${storage.maxWeight}</small></button>`)
                .join('')
            : '<small>Place a small chest to store supplies.</small>'
        }
      </div>
      ${
        activeStorage
          ? `<div class="storage-detail">
              <div class="storage-head"><b>${activeStorage.name}</b><button data-housing-storage-upgrade="${activeStorage.id}">Reinforce</button></div>
              <div class="storage-slots">
                ${activeStorage.inventory.slots
                  .map((stack, index) => {
                    if (!stack) return `<button class="empty" disabled></button>`;
                    const def = itemDefs[stack.itemId];
                    return `<button data-housing-withdraw="${activeStorage.id}:${index}" data-tooltip-id="housing-storage:${attr(activeStorage.id)}:${index}:${attr(stack.itemId)}" data-tooltip-source="housing-storage" data-tooltip="${attr(`${def.name}\nQty: ${stack.quantity}`)}">${renderIcon(def.icon, def.name)}<b>${stack.quantity}</b></button>`;
                  })
                  .join('')}
              </div>
              <button data-action="deposit-housing-selected" class="${selectedInventoryStack ? 'primary' : ''}">Deposit Selected${selectedInventoryStack ? `: ${itemDefs[selectedInventoryStack.itemId]?.name ?? selectedInventoryStack.itemId}` : ''}</button>
            </div>`
          : ''
      }
      <div class="home-services">
        <b>Home Services</b>
        <button data-action="rest-at-home">Rest</button>
        ${stations.map((station) => `<button data-home-craft-station="${station}">${stationLabels[station]}</button>`).join('') || '<small>Place a station to craft at home.</small>'}
        ${
          gardens.length
            ? gardens.map((garden) => `<button data-housing-garden="${garden.buildingId}">${itemDefs[garden.yieldItemId]?.name ?? garden.yieldItemId}<small>${state.clock >= garden.readyAt ? 'Ready' : `${Math.ceil(garden.readyAt - state.clock)}s`}</small></button>`).join('')
            : ''
        }
      </div>
    </div>
    <div class="placement-help">
      <b>Building Placement</b><span>LMB: Place</span><span>RMB / Z / C: Rotate</span><span>X: Cancel</span><span>V: Snap ${state.buildMode.snapToGrid ? 'On' : 'Off'}</span><em class="${state.buildMode.valid ? 'valid' : 'invalid'}">${state.buildMode.message}</em>
    </div>
  </section>`;
}

import { buildPieces, itemDefs } from '../data/items';
import type { BuildPieceDef, GameState } from '../game/types';
import { getItemCount } from '../systems/InventorySystem';
import { canUpgradeHousing, currentHousingTier, getOwnedHousingPlot, homeCraftStations, homePreparationSummary, housingStorages, nextHousingTier, selectedHousingStorage, storageWeight } from '../systems/HousingSystem';
import { renderIcon } from '../render/IconRenderer';
import { stationLabels } from '../data/recipes';

const buildTabGroups: Array<{ label: string; primary: BuildPieceDef['category']; categories: BuildPieceDef['category'][] }> = [
  { label: 'Walls', primary: 'Walls', categories: ['Walls', 'Fences'] },
  { label: 'Floors', primary: 'Floors', categories: ['Floors'] },
  { label: 'Doors', primary: 'Doors', categories: ['Doors'] },
  { label: 'Roofs', primary: 'Roofs', categories: ['Roofs'] },
  { label: 'Decor', primary: 'Decor', categories: ['Decor'] },
  { label: 'Utility/Storage', primary: 'Storage', categories: ['Storage', 'Crafting', 'Utility', 'Garden', 'Trophies'] }
];

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

export function BuildPanel(state: GameState): string {
  if (!state.ui.panels.build) return '';
  const activeGroup = buildTabGroups.find((group) => group.categories.includes(state.ui.selectedBuildCategory)) ?? buildTabGroups[0];
  const pieces = buildPieces.filter((piece) => activeGroup.categories.includes(piece.category));
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
  const prep = homePreparationSummary(state);
  const placementState = placementFeedbackState(state, selected);
  const footprint = `${selected.size.x}x${selected.size.z}`;
  return `<section class="panel build-panel">
    <header><span>${plot?.name ?? 'Starter Plot'}</span><button data-action="toggle-build">x</button></header>
    <div class="plot-summary">
      <div><b>${plot ? tier.name : 'Unclaimed Plot'}</b><span>${plot ? `${placed.length}/${tier.placementLimit} objects` : 'Claim before placing'}</span></div>
      <button data-action="claim-plot">${plot ? 'Claimed' : 'Claim Plot'}</button>
      ${nextTier ? `<button data-action="upgrade-housing" class="${upgrade.ok ? 'primary' : ''}" data-tooltip-id="housing:upgrade" data-tooltip-source="build" data-tooltip="${attr(upgrade.message)}">Upgrade: ${nextTier.name}</button>` : ''}
    </div>
    <div class="build-tabs">${buildTabGroups.map((tab) => `<button class="${activeGroup.label === tab.label ? 'active' : ''}" data-build-category="${tab.primary}">${tab.label}</button>`).join('')}</div>
    <div class="build-grid">
      ${pieces
        .map((piece) => `<button class="build-piece ${piece.id === selected.id ? 'selected' : ''}" data-build-piece="${piece.id}" data-tooltip-id="build-piece:${attr(piece.id)}" data-tooltip-source="build" data-tooltip="${attr(`${piece.name}\n${piece.description}`)}">${renderIcon(piece.icon, piece.name)}</button>`)
        .join('')}
    </div>
    <div class="build-detail">
      <strong>${selected.name}</strong><p>${selected.description}</p>
      <span class="placed-count">${state.buildMode.moveBuildingId ? 'Move mode active' : `Selected: ${activeGroup.label}`}</span>
      <div>${selected.cost
        .map((cost) => {
          const def = itemDefs[cost.itemId];
          const have = getItemCount(state.player.inventory, cost.itemId);
          const message = have < cost.quantity ? `Missing ${cost.quantity - have} ${def.name}` : def.name;
          return `<span class="cost ${have < cost.quantity ? 'missing' : ''}" data-tooltip-id="build-cost:${attr(cost.itemId)}" data-tooltip-source="build" data-tooltip="${attr(message)}">${renderIcon(def.icon, def.name)} ${have}/${cost.quantity}</span>`;
        })
        .join('')}</div>
      <div class="build-actions">
        <button data-action="place-building" class="primary">Place</button>
        <button data-action="rotate-building">Rotate</button>
        <button data-action="cancel-build-placement">Cancel</button>
      </div>
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
      <div class="home-prep-summary">
        <b>Next Trip Prep</b>
        <span>${prep.reasons.slice(0, 4).join(' · ') || 'Place storage, rest, station, garden, or trophy pieces.'}</span>
        <small>${prep.storageSlots} storage slots · ${prep.stationBonusPercent}% station bonus · ${prep.gardenCount} garden · ${prep.trophyCount} trophies</small>
      </div>
    </div>
    <div class="placement-help">
      <b>Building Placement</b><span>LMB: Place</span><span>RMB / Z / C: Rotate</span><span>X: Cancel</span><span>V: Snap ${state.buildMode.snapToGrid ? 'On' : 'Off'}</span>
      <div class="placement-state ${placementState}" data-placement-state="${placementState}" data-placement-footprint="${footprint}">
        <span>Footprint ${footprint}</span><span>Rotation ${state.buildMode.rotation}°</span><em class="${state.buildMode.valid ? 'valid' : 'invalid'}">${state.buildMode.message}</em>
      </div>
    </div>
  </section>`;
}

function placementFeedbackState(state: GameState, selected: BuildPieceDef): 'valid' | 'shortage' | 'blocked' | 'invalid' {
  if (state.buildMode.valid) return 'valid';
  if (selected.cost.some((cost) => getItemCount(state.player.inventory, cost.itemId) < cost.quantity)) return 'shortage';
  if (/blocked|occupies|way out|Move Valen/i.test(state.buildMode.message)) return 'blocked';
  return 'invalid';
}

import { areas } from '../data/areas';
import { treasureMapDefinitions } from '../data/treasure';
import type { GameState } from '../game/types';
import { getItemCount } from '../systems/InventorySystem';

export function TreasureMapPanel(state: GameState): string {
  if (!state.ui.panels.treasureMap) return '';
  const mapId = state.ui.selectedTreasureMapId;
  const definition = treasureMapDefinitions[mapId] ?? treasureMapDefinitions.greymont_cache;
  const runtime = state.world.treasure.maps[definition.id];
  const precision = runtime?.decipheredPrecision ?? 0;
  const radius = Math.max(1.2, definition.searchRadius - precision * 2.2);
  const fragments = getItemCount(state.player.inventory, 'map_fragment');
  const hasMap = getItemCount(state.player.inventory, 'rough_treasure_map') > 0;
  return `<section class="panel treasure-map-panel">
    <header><span>Treasure Map</span><button data-action="toggle-panel" data-panel="treasureMap">x</button></header>
    <div class="parchment">
      <div class="map-sketch">
        <i class="sketch-road"></i>
        <i class="sketch-mark" style="left:${50 + definition.approximateLocation.x * 1.8}%;top:${50 + definition.approximateLocation.z * 1.8}%"></i>
      </div>
      <div class="map-copy">
        <b>${areas[definition.regionHint].name}</b>
        <p>${definition.clueText}</p>
        <div><span>Fragments</span><strong>${fragments}/3</strong></div>
        <div><span>Cartography</span><strong>${precision ? `${Math.round(precision * 100)}% precision` : 'undeciphered'}</strong></div>
        <div><span>Search Radius</span><strong>${hasMap ? `${radius.toFixed(1)} tiles` : 'needs map'}</strong></div>
        <div><span>Tool</span><strong>${definition.requiredTool}</strong></div>
        <div><span>Pin</span><strong>${runtime?.pinned ? 'on minimap' : 'off'}</strong></div>
        <div class="map-actions">
          <button data-action="decipher-map" class="primary">Decipher</button>
          <button data-action="pin-map">${runtime?.pinned ? 'Unpin' : 'Pin'}</button>
          <button data-action="toggle-panel" data-panel="journal">Journal</button>
        </div>
      </div>
    </div>
  </section>`;
}

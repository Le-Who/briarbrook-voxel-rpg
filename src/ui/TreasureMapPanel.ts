import { areas } from '../data/areas';
import { treasureMapDefinitions } from '../data/treasure';
import type { GameState } from '../game/types';
import { getItemCount } from '../systems/InventorySystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

export function TreasureMapPanel(state: GameState): string {
  if (!state.ui.panels.treasureMap) return '';
  const mapId = state.ui.selectedTreasureMapId;
  const definition = treasureMapDefinitions[mapId] ?? treasureMapDefinitions.greymont_cache;
  const runtime = state.world.treasure.maps[definition.id];
  const precision = runtime?.decipheredPrecision ?? 0;
  const radius = Math.max(1.2, definition.searchRadius - precision * 2.2);
  const fragments = getItemCount(state.player.inventory, 'map_fragment');
  const hasMap = getItemCount(state.player.inventory, 'rough_treasure_map') > 0;
  const knownMaps = Object.values(treasureMapDefinitions).filter((map) => {
    const mapRuntime = state.world.treasure.maps[map.id];
    return hasMap || fragments > 0 || mapRuntime?.fragmentCount > 0 || mapRuntime?.decipheredPrecision > 0 || mapRuntime?.found || mapRuntime?.pinned;
  });
  return `<section class="panel treasure-map-panel">
    <header><span>Treasure Map</span><button data-action="toggle-panel" data-panel="treasureMap">x</button></header>
    <div class="map-tier-tabs">
      ${knownMaps
        .map((map) => {
          const mapRuntime = state.world.treasure.maps[map.id];
          const active = map.id === definition.id ? 'active' : '';
          const status = mapRuntime?.found ? 'Found' : mapRuntime?.pinned ? 'Pinned' : mapRuntime?.decipheredPrecision ? `${Math.round(mapRuntime.decipheredPrecision * 100)}%` : `T${map.tier}`;
          return `<button class="${active}" data-treasure-map-id="${attr(map.id)}"><span>Tier ${map.tier}</span><b>${attr(areas[map.regionHint].name)}</b><small>${status}</small></button>`;
        })
        .join('')}
    </div>
    <div class="parchment">
      <div class="map-sketch">
        <i class="sketch-road"></i>
        <i class="sketch-mark" style="left:${50 + definition.approximateLocation.x * 1.8}%;top:${50 + definition.approximateLocation.z * 1.8}%"></i>
      </div>
      <div class="map-copy">
        <b>${areas[definition.regionHint].name}</b>
        <p>${definition.clueText}</p>
        <div><span>Fragments</span><strong>${fragments}/3</strong></div>
        <div><span>Tier</span><strong>${definition.tier}</strong></div>
        <div><span>Cartography</span><strong>${precision ? `${Math.round(precision * 100)}% precision` : 'undeciphered'}</strong></div>
        <div><span>Search Radius</span><strong>${hasMap ? `${radius.toFixed(1)} tiles` : 'needs map'}</strong></div>
        <div><span>Tool</span><strong>${definition.requiredTool}</strong></div>
        <div><span>Pin</span><strong>${runtime?.pinned ? 'on minimap' : 'off'}</strong></div>
        <div class="map-actions">
          <button data-action="decipher-map" class="primary">Decipher</button>
          <button data-action="pin-map">${runtime?.pinned ? 'Unpin' : 'Pin'}</button>
          <button data-map-waypoint-area="${definition.regionHint}" data-map-waypoint-x="${Math.round(definition.approximateCoordinate.x)}" data-map-waypoint-z="${Math.round(definition.approximateCoordinate.z)}" data-map-waypoint-label="${attr(`${areas[definition.regionHint].name} treasure clue`)}" data-map-waypoint-source="treasure">Waypoint</button>
          <button data-action="toggle-panel" data-panel="journal">Journal</button>
        </div>
      </div>
    </div>
  </section>`;
}

import { areas, travelOrder } from '../data/areas';
import { treasureMapDefinitions } from '../data/treasure';
import type { AreaId, GameState, MapLayerId, Vec3 } from '../game/types';
import { deriveFirstHourDirector } from '../systems/FirstHourDirector';
import { getItemCount } from '../systems/InventorySystem';
import { deriveSpatialContext, type SpatialLayer, type SpatialMarker } from './SpatialUX';

const mapLayerOrder: MapLayerId[] = ['terrain', 'player', 'companions', 'services', 'objective', 'pinned', 'danger', 'entrances', 'housing'];
const adventurePositions: Record<string, Vec3> = {
  town: { x: 0, y: 0, z: 0 },
  bank: { x: -3, y: 0, z: -1 },
  blacksmith: { x: 4, y: 0, z: -1 },
  forest: { x: -4, y: 0, z: -11 },
  mine: { x: 4, y: 0, z: -14 },
  crypt: { x: 9, y: 0, z: -15 },
  road: { x: 12, y: 0, z: -4 },
  bridge: { x: 7, y: 0, z: -4 },
  housing: { x: -12, y: 0, z: 6 }
};

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

function pct(value: number): number {
  return Math.max(7, Math.min(93, Math.round(value)));
}

function markerDot(marker: SpatialMarker): string {
  const x = pct(50 + marker.position.x * 2.5);
  const y = pct(50 + marker.position.z * 2.5);
  const waypointAttrs = marker.canWaypoint
    ? ` data-map-waypoint-area="${marker.areaId}" data-map-waypoint-x="${Math.round(marker.position.x)}" data-map-waypoint-z="${Math.round(marker.position.z)}" data-map-waypoint-label="${attr(marker.label)}" data-map-waypoint-source="${marker.source ?? 'manual'}"`
    : '';
  const tag = marker.canWaypoint ? 'button' : 'span';
  return `<${tag} class="map-dot ${attr(marker.className)}" data-map-marker="${attr(marker.id)}"${waypointAttrs} title="${attr(`${marker.label} - ${marker.detail}`)}" style="left:${x}%;top:${y}%"><span class="map-dot-label">${attr(marker.label)}</span></${tag}>`;
}

function areaKnown(state: GameState, areaId: AreaId): boolean {
  return state.player.currentArea === areaId || state.world.discoveredAreas.includes(areaId);
}

function adventureMarker(
  id: string,
  layer: MapLayerId,
  areaId: AreaId,
  position: Vec3,
  label: string,
  detail: string,
  className: string,
  canWaypoint = true,
  source: SpatialMarker['source'] = 'manual'
): SpatialMarker {
  return { id, layer, areaId, position, label, detail, className, canWaypoint, source };
}

function pushAdventureMarker(markers: SpatialMarker[], marker: SpatialMarker): void {
  if (markers.some((entry) => entry.id === marker.id)) return;
  markers.push(marker);
}

function hasTreasureMapKnowledge(state: GameState): boolean {
  return getItemCount(state.player.inventory, 'rough_treasure_map') > 0 || getItemCount(state.player.inventory, 'map_fragment') > 0;
}

function deriveAdventureMapLayers(state: GameState): SpatialLayer[] {
  const markers: SpatialMarker[] = [];
  const townKnown = areaKnown(state, 'town');
  const forestKnown = areaKnown(state, 'forest');
  const roadKnown = areaKnown(state, 'road');
  const cryptKnown = areaKnown(state, 'crypt');
  const housingKnown = areaKnown(state, 'housing') || state.world.placedBuildings.some((building) => building.area === 'housing');

  if (townKnown) {
    pushAdventureMarker(markers, adventureMarker('region:town', 'terrain', 'town', adventurePositions.town, 'Briarbrook', 'Central town hub and safe services.', 'landmark town'));
    pushAdventureMarker(markers, adventureMarker('service:bank-region', 'services', 'bank', adventurePositions.bank, 'Briarbrook Bank', 'Discovered storage service in town.', 'service bank'));
    pushAdventureMarker(markers, adventureMarker('service:smithy-region', 'services', 'blacksmith', adventurePositions.blacksmith, "Brom's Smithy", 'Discovered crafting and repair service.', 'service smithy'));
  }
  if (forestKnown) {
    pushAdventureMarker(markers, adventureMarker('region:forest', 'terrain', 'forest', adventurePositions.forest, 'Greymont Forest', 'Discovered gathering and mine approach.', 'landmark forest'));
    pushAdventureMarker(markers, adventureMarker('entrance:mine', 'entrances', 'forest', adventurePositions.mine, 'Mine Entrance', 'Mine trail toward the crypt route.', 'portal'));
  }
  if (roadKnown) {
    pushAdventureMarker(markers, adventureMarker('region:road', 'terrain', 'road', adventurePositions.road, 'Old River Road', 'Discovered road combat route.', 'landmark road'));
    pushAdventureMarker(markers, adventureMarker('landmark:old-river-bridge', 'terrain', 'road', adventurePositions.bridge, 'Old River Bridge', 'Bridge crossing on the road route.', 'landmark bridge'));
  }
  if (cryptKnown) {
    pushAdventureMarker(markers, adventureMarker('region:crypt', 'danger', 'crypt', adventurePositions.crypt, 'Forgotten Crypt', 'Discovered dungeon and high-risk route.', 'danger portal'));
  }
  if (housingKnown) {
    pushAdventureMarker(markers, adventureMarker('region:housing', 'housing', 'housing', adventurePositions.housing, 'Player Plot', 'Owned buildable parcel near Briarbrook.', 'housing'));
  }

  pushAdventureMarker(markers, adventureMarker('player', 'player', state.player.currentArea, state.player.position, 'You', 'Current position.', 'player', false));

  const objective = deriveFirstHourDirector(state).objective;
  if (objective && (areaKnown(state, objective.areaId) || objective.source === 'objective')) {
    pushAdventureMarker(markers, adventureMarker(`objective:${objective.id}`, 'objective', objective.areaId, adventurePositionForArea(objective.areaId, objective.position), objective.label, objective.detail, objective.className, true, objective.source));
  }

  if (state.ui.mapWaypoint) {
    pushAdventureMarker(markers, adventureMarker('waypoint:manual', 'objective', state.ui.mapWaypoint.areaId, adventurePositionForArea(state.ui.mapWaypoint.areaId, state.ui.mapWaypoint.position), state.ui.mapWaypoint.label, 'Pinned map waypoint.', `waypoint ${state.ui.mapWaypoint.source}`, false, state.ui.mapWaypoint.source));
  }

  state.world.activeEvents
    .filter((event) => event.position && (event.discovered || state.world.discoveredRumorIds.includes(event.id) || event.id === state.ui.pinnedRumorId))
    .forEach((event) => {
      pushAdventureMarker(markers, adventureMarker(`event:${event.id}`, event.type === 'bandit_ambush' || event.type === 'crypt_spill' || event.type === 'storm' ? 'danger' : 'pinned', event.area, adventurePositionForArea(event.area, event.position!), event.title, event.rumor, event.type === 'bandit_ambush' || event.type === 'crypt_spill' || event.type === 'storm' ? 'event danger' : 'event', true, 'rumor'));
    });

  Object.entries(treasureMapDefinitions).forEach(([id, definition]) => {
    const runtime = state.world.treasure.maps[id];
    if (runtime?.found) return;
    if (!runtime?.pinned && !(hasTreasureMapKnowledge(state) && runtime?.decipheredPrecision > 0)) return;
    pushAdventureMarker(markers, adventureMarker(`treasure:${id}`, 'pinned', definition.regionHint, adventurePositionForArea(definition.regionHint, definition.approximateCoordinate), `${areas[definition.regionHint].name} treasure clue`, definition.clueText, 'treasure', true, 'treasure'));
  });

  return mapLayerOrder.map((id) => ({
    id,
    label: layerById(deriveSpatialContext(state).layers, id).label,
    markers: markers.filter((marker) => marker.layer === id)
  }));
}

function adventurePositionForArea(areaId: AreaId, localPosition: Vec3): Vec3 {
  const base = adventurePositions[areaId] ?? { x: 0, y: 0, z: 0 };
  return {
    x: base.x + localPosition.x * 0.12,
    y: 0,
    z: base.z + localPosition.z * 0.12
  };
}

function layerFilter(layer: SpatialLayer, hidden: Set<MapLayerId>): string {
  return `<button class="${hidden.has(layer.id) ? 'muted' : 'active'}" data-map-layer-toggle="${layer.id}">${layer.label.split(/[ /]/)[0]}</button>`;
}

function markerRows(layer: SpatialLayer): string {
  if (!layer.markers.length) return '<p>None discovered.</p>';
  return layer.markers
    .map(
      (marker) =>
        `<button class="map-intel-row" data-map-waypoint-area="${marker.areaId}" data-map-waypoint-x="${Math.round(marker.position.x)}" data-map-waypoint-z="${Math.round(marker.position.z)}" data-map-waypoint-label="${attr(marker.label)}" data-map-waypoint-source="${marker.source ?? 'manual'}">
          <span>${attr(marker.label)}</span><b>${attr(areas[marker.areaId].name)}</b>
        </button>`
    )
    .join('');
}

function layerById(layers: SpatialLayer[], id: MapLayerId): SpatialLayer {
  return layers.find((layer) => layer.id === id) ?? { id, label: id, markers: [] };
}

export function MapPanel(state: GameState): string {
  if (state.ui.minimapMode !== 'expanded' && !state.ui.panels.map) return '';
  const spatial = deriveSpatialContext(state);
  const hidden = new Set(state.ui.mapHiddenLayers);
  const adventureLayers = deriveAdventureMapLayers(state);
  const visibleLayers = adventureLayers.filter((layer) => !hidden.has(layer.id));
  const routeHint = state.ui.mapWaypoint ? `Pinned route: ${state.ui.mapWaypoint.label}` : (spatial.returnGuidance ?? spatial.roadSignPrompt);
  const devTravel = state.dev.overlay && state.ui.devTravel
    ? `<div class="map-dev-travel">
      ${travelOrder.map((id) => `<button class="${id === state.player.currentArea ? 'active' : ''}" data-area="${id}">${areas[id].name.replace('Briarbrook ', '')}</button>`).join('')}
    </div>`
    : '';

  return `<section class="panel map-panel ui-contained-window" data-window-id="map">
    <header><span>Adventure Map</span><button data-minimap-mode="standard">x</button></header>
    <div class="map-panel-body">
      <div class="map-panel-toolbar">
        ${adventureLayers.map((layer) => layerFilter(layer, hidden)).join('')}
      </div>
      <div class="map-panel-main">
        <div class="map-expanded-canvas" style="--map-tint:${areas[state.player.currentArea].minimapTint}">
          <span class="route-line"></span><span class="map-region-road map-region-road-town-forest"></span><span class="map-region-road map-region-road-town-road"></span><span class="map-region-road map-region-road-town-plot"></span>
          <b class="north">N</b>
          ${visibleLayers
            .map(
              (layer) =>
                `<div class="map-layer map-layer-${layer.id}" data-map-layer="${layer.id}" aria-label="${attr(layer.label)}">${
                  layer.id === 'terrain' ? '<span class="map-terrain road-primary"></span><span class="map-terrain water-pocket"></span><span class="map-terrain building-cluster"></span>' : ''
                }${layer.markers.map(markerDot).join('')}</div>`
            )
            .join('')}
        </div>
        <div class="map-panel-intel">
          <div><span>Area</span><b>${attr(spatial.currentAreaLabel)}</b></div>
          <div><span>Time</span><b>${attr(spatial.timeLabel)}</b></div>
          <div><span>Risk</span><b>${attr(spatial.riskLabel)}</b></div>
          <div><span>Guard</span><b>${attr(spatial.guardAttentionLabel)}</b></div>
          <div><span>Position</span><b>${attr(spatial.coordinateLabel)}</b></div>
          <div class="route-hint"><span>Route</span><b>${attr(routeHint)}</b></div>
          <div><span>Objective</span><b>${attr(spatial.breadcrumb)}</b></div>
          <button class="map-center-player" data-map-waypoint-area="${state.player.currentArea}" data-map-waypoint-x="${Math.round(state.player.position.x)}" data-map-waypoint-z="${Math.round(state.player.position.z)}" data-map-waypoint-label="Current position" data-map-waypoint-source="manual">Center on Player</button>
          ${state.ui.mapWaypoint ? '<button class="clear-waypoint" data-clear-map-waypoint="true">Unpin waypoint</button>' : ''}
          ${devTravel}
        </div>
      </div>
      <div class="map-legend">
        ${mapLayerOrder.map((id) => `<span class="legend-${id}">${attr(layerById(adventureLayers, id).label)}</span>`).join('')}
      </div>
      <div class="map-intel-grid">
        <section><h3>Services</h3>${markerRows(layerById(adventureLayers, 'services'))}</section>
        <section><h3>Objectives</h3>${markerRows(layerById(adventureLayers, 'objective'))}</section>
        <section><h3>Rumors</h3>${markerRows(layerById(adventureLayers, 'pinned'))}</section>
        <section><h3>Entrances</h3>${markerRows(layerById(adventureLayers, 'entrances'))}</section>
        <section><h3>Danger</h3>${markerRows(layerById(adventureLayers, 'danger'))}</section>
        <section><h3>Housing</h3>${markerRows(layerById(adventureLayers, 'housing'))}</section>
      </div>
    </div>
  </section>`;
}

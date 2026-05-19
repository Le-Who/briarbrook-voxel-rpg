import { areas, travelOrder } from '../data/areas';
import type { GameState, MapLayerId } from '../game/types';
import { deriveSpatialContext, type SpatialLayer, type SpatialMarker } from './SpatialUX';

const mapLayerOrder: MapLayerId[] = ['terrain', 'player', 'companions', 'services', 'objective', 'pinned', 'danger', 'entrances', 'housing'];

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
  return `<${tag} class="map-dot ${attr(marker.className)}" data-map-marker="${attr(marker.id)}"${waypointAttrs} title="${attr(`${marker.label} - ${marker.detail}`)}" style="left:${x}%;top:${y}%"></${tag}>`;
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
  const visibleLayers = spatial.layers.filter((layer) => !hidden.has(layer.id));
  const devTravel = state.dev.overlay && state.ui.devTravel
    ? `<div class="map-dev-travel">
      ${travelOrder.map((id) => `<button class="${id === state.player.currentArea ? 'active' : ''}" data-area="${id}">${areas[id].name.replace('Briarbrook ', '')}</button>`).join('')}
    </div>`
    : '';

  return `<section class="panel map-panel ui-contained-window" data-window-id="map">
    <header><span>Map</span><button data-minimap-mode="standard">x</button></header>
    <div class="map-panel-body">
      <div class="map-panel-toolbar">
        ${spatial.layers.map((layer) => layerFilter(layer, hidden)).join('')}
      </div>
      <div class="map-panel-main">
        <div class="map-expanded-canvas" style="--map-tint:${areas[state.player.currentArea].minimapTint}">
          <span class="route-line"></span>
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
          <div><span>Position</span><b>${attr(spatial.coordinateLabel)}</b></div>
          <div><span>Route</span><b>${attr(spatial.returnGuidance ?? spatial.roadSignPrompt)}</b></div>
          <div><span>Objective</span><b>${attr(spatial.breadcrumb)}</b></div>
          ${state.ui.mapWaypoint ? '<button class="clear-waypoint" data-clear-map-waypoint="true">Clear waypoint</button>' : ''}
          ${devTravel}
        </div>
      </div>
      <div class="map-legend">
        ${mapLayerOrder.map((id) => `<span class="legend-${id}">${attr(layerById(spatial.layers, id).label)}</span>`).join('')}
      </div>
      <div class="map-intel-grid">
        <section><h3>Services</h3>${markerRows(layerById(spatial.layers, 'services'))}</section>
        <section><h3>Objectives</h3>${markerRows(layerById(spatial.layers, 'objective'))}</section>
        <section><h3>Rumors</h3>${markerRows(layerById(spatial.layers, 'pinned'))}</section>
        <section><h3>Entrances</h3>${markerRows(layerById(spatial.layers, 'entrances'))}</section>
        <section><h3>Danger</h3>${markerRows(layerById(spatial.layers, 'danger'))}</section>
        <section><h3>Housing</h3>${markerRows(layerById(spatial.layers, 'housing'))}</section>
      </div>
    </div>
  </section>`;
}

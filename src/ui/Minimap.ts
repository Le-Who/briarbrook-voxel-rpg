import { areas, travelOrder } from '../data/areas';
import type { GameState } from '../game/types';
import { deriveSpatialContext, type SpatialMarker } from './SpatialUX';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

function pct(value: number): number {
  return Math.max(10, Math.min(90, Math.round(value)));
}

function renderMarker(marker: SpatialMarker): string {
  const x = pct(50 + marker.position.x * 3.2);
  const y = pct(50 + marker.position.z * 3.2);
  const tooltip = `${marker.label} - ${marker.detail}`;
  const waypointAttrs = marker.canWaypoint
    ? ` data-map-waypoint-area="${marker.areaId}" data-map-waypoint-x="${Math.round(marker.position.x)}" data-map-waypoint-z="${Math.round(marker.position.z)}" data-map-waypoint-label="${attr(marker.label)}" data-map-waypoint-source="${marker.source ?? 'manual'}"`
    : '';
  if (marker.layer === 'player') {
    return `<span class="player-dot" data-map-marker="${attr(marker.id)}" data-tooltip-id="${attr(marker.id)}" data-tooltip-source="minimap" data-tooltip="${attr(tooltip)}" style="left:${x}%;top:${y}%"></span>`;
  }
  const tag = marker.canWaypoint ? 'button' : 'span';
  return `<${tag} class="map-dot ${attr(marker.className)}" data-map-marker="${attr(marker.id)}" data-tooltip-id="${attr(marker.id)}" data-tooltip-source="minimap" data-tooltip="${attr(tooltip)}"${waypointAttrs} style="left:${x}%;top:${y}%"></${tag}>`;
}

export function Minimap(state: GameState): string {
  const area = areas[state.player.currentArea];
  const spatial = deriveSpatialContext(state);
  const layers = spatial.layers
    .map(
      (layer) =>
        `<div class="map-layer map-layer-${layer.id}" data-map-layer="${layer.id}" aria-label="${attr(layer.label)}">${
          layer.id === 'terrain' ? '<span class="map-terrain road-primary"></span><span class="map-terrain water-pocket"></span><span class="map-terrain building-cluster"></span>' : ''
        }${layer.markers.map(renderMarker).join('')}</div>`
    )
    .join('');
  const devTravel = state.dev.overlay && state.ui.devTravel
    ? `<div class="travel dev-travel">
      ${travelOrder.map((id) => `<button class="${id === state.player.currentArea ? 'active' : ''}" data-area="${id}">${areas[id].name.replace('Briarbrook ', '')}</button>`).join('')}
    </div>`
    : `<div class="route-hint"><b>${attr(spatial.breadcrumb)}</b><span>${attr(spatial.returnGuidance ?? spatial.roadSignPrompt)}</span></div>`;
  return `<section class="minimap-wrap">
    <div class="minimap" style="--map-tint:${area.minimapTint}">
      <span class="route-line"></span>
      <b class="north">N</b><b class="south">S</b><b class="west">W</b><b class="east">E</b>
      ${layers}
    </div>
    <div class="area-name">${attr(spatial.currentAreaLabel)}</div>
    <div class="world-time">${attr(spatial.timeLabel)}</div>
    <div class="zone-status ${attr(spatial.riskClass)}">${attr(spatial.riskLabel)}</div>
    ${spatial.localEvent ? `<div class="local-event">${attr(spatial.localEvent)}</div>` : ''}
    <div class="coords">${attr(spatial.coordinateLabel)}</div>
    ${state.ui.mapWaypoint ? '<button class="clear-waypoint" data-clear-map-waypoint="true">Clear waypoint</button>' : ''}
    ${devTravel}
  </section>`;
}

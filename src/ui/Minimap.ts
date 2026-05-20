import { areas } from '../data/areas';
import type { GameState, MapLayerId } from '../game/types';
import { deriveSpatialContext, type SpatialMarker } from './SpatialUX';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

function pct(value: number): number {
  return Math.max(10, Math.min(90, Math.round(value)));
}

function renderMarker(marker: SpatialMarker, interactive = true): string {
  const x = pct(50 + marker.position.x * 3.2);
  const y = pct(50 + marker.position.z * 3.2);
  const tooltip = `${marker.label} - ${marker.detail}`;
  const waypointAttrs = marker.canWaypoint && interactive
    ? ` data-map-waypoint-area="${marker.areaId}" data-map-waypoint-x="${Math.round(marker.position.x)}" data-map-waypoint-z="${Math.round(marker.position.z)}" data-map-waypoint-label="${attr(marker.label)}" data-map-waypoint-source="${marker.source ?? 'manual'}"`
    : '';
  if (marker.layer === 'player') {
    return `<span class="player-dot" data-map-marker="${attr(marker.id)}" data-tooltip-id="${attr(marker.id)}" data-tooltip-source="minimap" data-tooltip="${attr(tooltip)}" style="left:${x}%;top:${y}%"></span>`;
  }
  const tag = marker.canWaypoint && interactive ? 'button' : 'span';
  return `<${tag} class="map-dot ${attr(marker.className)}" data-map-marker="${attr(marker.id)}" data-tooltip-id="${attr(marker.id)}" data-tooltip-source="minimap" data-tooltip="${attr(tooltip)}"${waypointAttrs} style="left:${x}%;top:${y}%"></${tag}>`;
}

function renderMapLayers(state: GameState, compact: boolean): string {
  const spatial = deriveSpatialContext(state);
  const hidden = new Set(state.ui.mapHiddenLayers);
  const compactLayers = new Set<MapLayerId>(['terrain', 'player', 'objective', 'pinned', 'danger']);
  return spatial.layers
    .filter((layer) => !hidden.has(layer.id))
    .filter((layer) => !compact || compactLayers.has(layer.id))
    .map((layer) => {
      const markers = compact && layer.id !== 'player' ? layer.markers.slice(0, 1) : layer.markers;
      return `<div class="map-layer map-layer-${layer.id}" data-map-layer="${layer.id}" aria-label="${attr(layer.label)}">${
        layer.id === 'terrain' ? '<span class="map-terrain road-primary"></span><span class="map-terrain water-pocket"></span><span class="map-terrain building-cluster"></span>' : ''
      }${markers.map((marker) => renderMarker(marker, !compact)).join('')}</div>`;
    })
    .join('');
}

function modeButton(mode: GameState['ui']['minimapMode'], label: string, activeMode: GameState['ui']['minimapMode']): string {
  return `<button class="${activeMode === mode ? 'active' : ''}" data-minimap-mode="${mode}" title="${mode}">${label}</button>`;
}

export function Minimap(state: GameState): string {
  if (state.ui.minimapMode === 'hidden') return '';
  const area = areas[state.player.currentArea];
  const spatial = deriveSpatialContext(state);
  const mode = state.ui.minimapMode === 'expanded' ? 'compact' : state.ui.minimapMode;
  const combatPulse = state.player.activeTargetId || state.combat.meleeCooldown > 0 || state.combat.rangedCooldown > 0 || state.combat.magicCooldown > 0;
  const layers = renderMapLayers(state, mode === 'compact');
  if (mode === 'compact') {
    return `<section class="minimap-wrap minimap-mode-compact ${combatPulse ? 'danger-pulse' : ''}" data-minimap-mode="${state.ui.minimapMode}">
      <div class="minimap" style="--map-tint:${area.minimapTint}">
        <b class="north">N</b>
        ${layers}
      </div>
    </section>`;
  }
  return `<section class="minimap-wrap minimap-mode-standard" data-minimap-mode="${state.ui.minimapMode}">
    <div class="minimap" style="--map-tint:${area.minimapTint}">
      <span class="route-line"></span>
      <b class="north">N</b><b class="south">S</b><b class="west">W</b><b class="east">E</b>
      ${layers}
    </div>
    <div class="minimap-mode-controls">
      ${modeButton('compact', '◐', state.ui.minimapMode)}
      ${modeButton('standard', '□', state.ui.minimapMode)}
      ${modeButton('expanded', '▣', state.ui.minimapMode)}
    </div>
    <div class="area-name">${attr(spatial.currentAreaLabel)}</div>
    <div class="world-time">${attr(spatial.timeLabel)}</div>
    <div class="zone-status ${attr(spatial.riskClass)}">${attr(spatial.riskLabel)}</div>
    <div class="guard-attention ${attr(spatial.riskClass)}">${attr(spatial.guardAttentionLabel)}</div>
    ${spatial.criminalWarning ? `<div class="criminal-warning">${attr(spatial.criminalWarning)}</div>` : ''}
    ${spatial.localEvent ? `<div class="local-event">${attr(spatial.localEvent)}</div>` : ''}
    <div class="coords">${attr(spatial.coordinateLabel)}</div>
    ${spatial.breadcrumb ? `<div class="minimap-objective">${attr(spatial.breadcrumb)}</div>` : ''}
    ${state.ui.mapWaypoint ? '<button class="clear-waypoint" data-clear-map-waypoint="true">Clear waypoint</button>' : ''}
  </section>`;
}

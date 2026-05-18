import { areas, travelOrder } from '../data/areas';
import { zoneForArea } from '../data/riskZones';
import { treasureMapDefinitions } from '../data/treasure';
import type { GameState } from '../game/types';

function displayAreaName(state: GameState): string {
  if (state.player.currentArea === 'town' && state.player.position.z > 11 && state.player.position.x < -8) return 'Briarbrook Docks';
  if (state.player.currentArea === 'town' && state.player.position.z > 9) return 'North Gate';
  if (state.player.currentArea === 'road') return 'Old Road';
  if (state.player.currentArea === 'housing') return 'Player Plot';
  return areas[state.player.currentArea].name;
}

export function Minimap(state: GameState): string {
  const area = areas[state.player.currentArea];
  const zone = zoneForArea(state.player.currentArea);
  const cx = area.coordinateOffset.x + Math.round(state.player.position.x);
  const cz = area.coordinateOffset.z + Math.round(state.player.position.z);
  const portals = Object.values(state.entities).filter((entity) => entity.area === state.player.currentArea && entity.kind === 'portal');
  const nearestPortal = portals
    .map((portal) => ({ portal, dist: Math.hypot(portal.position.x - state.player.position.x, portal.position.z - state.player.position.z) }))
    .sort((a, b) => a.dist - b.dist)[0];
  const localEntities = Object.values(state.entities).filter((entity) => entity.area === state.player.currentArea && (entity.kind !== 'container' || (!entity.hidden && !entity.opened)));
  const markerEntities = [
    ...localEntities.filter((entity) => entity.kind === 'portal'),
    ...localEntities.filter((entity) => entity.kind !== 'portal').slice(0, 22)
  ];
  const markers = markerEntities
    .map((entity) => {
      const x = Math.max(10, Math.min(90, Math.round(50 + entity.position.x * 3.2)));
      const y = Math.max(10, Math.min(90, Math.round(50 + entity.position.z * 3.2)));
      const cls = entity.kind === 'enemy' ? 'enemy' : entity.kind === 'resource' ? 'resource' : entity.kind === 'portal' ? 'portal' : entity.kind === 'container' ? 'loot' : 'npc';
      return `<span class="map-dot ${cls}" style="left:${x}%;top:${y}%"></span>`;
    })
    .join('');
  const eventMarkers = state.world.activeEvents
    .filter((event) => event.discovered && event.area === state.player.currentArea && event.position)
    .map((event) => {
      const position = event.position!;
      const x = Math.max(10, Math.min(90, Math.round(50 + position.x * 3.2)));
      const y = Math.max(10, Math.min(90, Math.round(50 + position.z * 3.2)));
      return `<span class="map-dot event" title="${event.title}" style="left:${x}%;top:${y}%"></span>`;
    })
    .join('');
  const treasureMarkers = Object.entries(treasureMapDefinitions)
    .filter(([id, definition]) => state.world.treasure.maps[id]?.pinned && definition.regionHint === state.player.currentArea && !state.world.treasure.maps[id]?.found)
    .map(([, definition]) => {
      const x = Math.max(10, Math.min(90, Math.round(50 + definition.approximateCoordinate.x * 3.2)));
      const y = Math.max(10, Math.min(90, Math.round(50 + definition.approximateCoordinate.z * 3.2)));
      return `<span class="map-dot treasure" title="Treasure clue" style="left:${x}%;top:${y}%"></span>`;
    })
    .join('');
  const devTravel = state.dev.overlay && state.ui.devTravel
    ? `<div class="travel dev-travel">
      ${travelOrder.map((id) => `<button class="${id === state.player.currentArea ? 'active' : ''}" data-area="${id}">${areas[id].name.replace('Briarbrook ', '')}</button>`).join('')}
    </div>`
    : `<div class="route-hint"><b>${nearestPortal?.portal.name ?? areas[state.player.currentArea].name}</b><span>${nearestPortal ? `${Math.max(0, nearestPortal.dist).toFixed(1)}m` : 'local map'}</span></div>`;
  return `<section class="minimap-wrap">
    <div class="minimap" style="--map-tint:${area.minimapTint}">
      <span class="route-line"></span>
      <b class="north">N</b><b class="south">S</b><b class="west">W</b><b class="east">E</b>
      <span class="player-dot"></span>${markers}${eventMarkers}${treasureMarkers}
    </div>
    <div class="area-name">${displayAreaName(state)}</div>
    <div class="world-time">${state.world.time.hour.toString().padStart(2, '0')}:${state.world.time.minute.toString().padStart(2, '0')} · ${state.world.time.phase}</div>
    <div class="zone-status ${state.player.reputation.status}">${zone.riskLabel} · ${state.player.reputation.status}</div>
    <div class="coords">Map ${cx}:${cz}</div>
    ${devTravel}
  </section>`;
}

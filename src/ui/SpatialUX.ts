import { areas } from '../data/areas';
import { zoneForState } from '../data/riskZones';
import { treasureMapDefinitions } from '../data/treasure';
import type { AreaId, Entity, GameState, MapLayerId, MapWaypointSource, Vec3 } from '../game/types';
import { crimeFeedbackSummary } from '../systems/CrimeSystem';
import { deriveFirstHourDirector } from '../systems/FirstHourDirector';
import { getItemCount } from '../systems/InventorySystem';

export interface SpatialMarker {
  id: string;
  layer: MapLayerId;
  areaId: AreaId;
  position: Vec3;
  label: string;
  detail: string;
  className: string;
  source?: MapWaypointSource;
  canWaypoint?: boolean;
}

export interface SpatialLayer {
  id: MapLayerId;
  label: string;
  markers: SpatialMarker[];
}

export interface SpatialContext {
  layers: SpatialLayer[];
  breadcrumb: string;
  roadSignPrompt: string;
  returnGuidance: string | null;
  localEvent: string | null;
  currentAreaLabel: string;
  riskLabel: string;
  riskClass: string;
  reputationLabel: string;
  guardAttentionLabel: string;
  criminalWarning: string | null;
  coordinateLabel: string;
  timeLabel: string;
}

const layerLabels: Record<MapLayerId, string> = {
  terrain: 'Terrain, roads, water, buildings',
  player: 'Player',
  companions: 'Party / companions',
  services: 'Discovered NPC and service markers',
  objective: 'Current objective and waypoint',
  pinned: 'Pinned rumors and treasure clues',
  danger: 'Danger and risk',
  entrances: 'Discovered entrances and exits',
  housing: 'Player housing plot'
};

const staticLandmarks: SpatialMarker[] = [
  marker('landmark:fountain', 'terrain', 'town', { x: 0, y: 0, z: 0 }, 'Town Fountain', 'Mira starts the road-kit route here.', 'landmark fountain'),
  marker('landmark:bank-sign', 'services', 'town', { x: -8, y: 0, z: -2 }, 'Bank Sign', 'Safe storage entrance.', 'service bank'),
  marker('landmark:smith-smoke', 'services', 'town', { x: 6, y: 0, z: -3 }, 'Smithy Smoke', 'Forge and metal work entrance.', 'service smithy'),
  marker('landmark:market-sign', 'services', 'town', { x: 7, y: 0, z: 5 }, 'Market Sign', 'Work orders and merchant wares.', 'service market'),
  marker('landmark:north-gate', 'entrances', 'town', { x: 0, y: 0, z: 14 }, 'North Gate Sign', 'Forest route.', 'portal'),
  marker('landmark:road-sign', 'entrances', 'town', { x: 13, y: 0, z: 4 }, 'Old Road Sign', 'Road and combat route.', 'portal'),
  marker('landmark:ferry-sign', 'entrances', 'town', { x: -15, y: 0, z: 13 }, 'Ferry Sign', 'Housing plot route.', 'portal'),
  marker('landmark:mine-mouth', 'entrances', 'forest', { x: 7, y: 0, z: -6 }, 'Mine Entrance', 'Crypt route beyond the forest.', 'portal danger'),
  marker('landmark:crypt-door', 'danger', 'crypt', { x: -9, y: 0, z: 4 }, 'Crypt Door', 'Dungeon return route and danger threshold.', 'danger portal'),
  marker('landmark:plot-marker', 'housing', 'housing', { x: 0, y: 0, z: 0 }, 'Player Plot', 'Owned buildable space.', 'housing')
];

function marker(id: string, layer: MapLayerId, areaId: AreaId, position: Vec3, label: string, detail: string, className: string, canWaypoint = false, source?: MapWaypointSource): SpatialMarker {
  return { id, layer, areaId, position, label, detail, className, canWaypoint, source };
}

function knownArea(state: GameState, areaId: AreaId): boolean {
  return state.player.currentArea === areaId || state.world.discoveredAreas.includes(areaId);
}

function serviceEntity(entity: Entity): boolean {
  if (entity.kind === 'npc') return ['banker', 'blacksmith', 'merchant', 'quest', 'guard'].includes(entity.role) || Boolean(entity.training || entity.craftStation);
  if (entity.kind === 'container') return entity.id.includes('board') || entity.name.includes('Board') || entity.name.includes('Supply');
  return false;
}

function isDangerEvent(type: string): boolean {
  return type === 'bandit_ambush' || type === 'crypt_spill' || type === 'storm';
}

function objectiveMarker(state: GameState): SpatialMarker | null {
  const objective = deriveFirstHourDirector(state).objective;
  if (!objective) return null;
  return marker(`objective:${objective.id}`, 'objective', objective.areaId, objective.position, objective.label, objective.detail, objective.className, true, objective.source);
}

function roadSignPrompt(areaId: AreaId): string {
  switch (areaId) {
    case 'town':
      return 'Signs: Bank west, Smithy east, Forest north, Old Road east, Ferry northwest.';
    case 'forest':
      return 'Signposts: Briarbrook north, mine trail southeast. The mine mouth leads to the crypt.';
    case 'road':
      return 'Road signs point west to town; warning posts mark the ambush bend.';
    case 'crypt':
      return 'Exit labels point back to Forest Exit, then Town Road north.';
    case 'housing':
      return 'Plot marker: build only inside the fenced parcel; ferry returns to town.';
    case 'bank':
    case 'blacksmith':
      return 'Interior door labels return to Briarbrook.';
  }
}

function returnGuidance(state: GameState): string | null {
  if (state.player.currentArea === 'crypt') return 'Return route: Forest Exit -> Town Road -> Briarbrook.';
  if (state.player.currentArea === 'forest' && state.world.discoveredAreas.includes('crypt')) return 'Return route: Town Road sign north of the mine trail.';
  if (state.player.currentArea === 'road') return 'Return route: follow the Town Gate marker west.';
  return null;
}

function displayAreaName(state: GameState): string {
  if (state.player.currentArea === 'town' && state.player.position.z > 11 && state.player.position.x < -8) return 'Briarbrook Docks';
  if (state.player.currentArea === 'town' && state.player.position.z > 9) return 'North Gate';
  if (state.player.currentArea === 'road') return 'Old Road';
  if (state.player.currentArea === 'housing') return 'Player Plot';
  return areas[state.player.currentArea].name;
}

export function deriveSpatialContext(state: GameState): SpatialContext {
  const areaId = state.player.currentArea;
  const area = areas[areaId];
  const zone = zoneForState(state, areaId);
  const crimeFeedback = crimeFeedbackSummary(state);
  const currentAreaKnown = knownArea(state, areaId);
  const localEntities = Object.values(state.entities).filter((entity) => entity.area === areaId);
  const objective = objectiveMarker(state);
  const waypoint = state.ui.mapWaypoint && state.ui.mapWaypoint.areaId === areaId
    ? marker('waypoint:manual', 'objective', areaId, state.ui.mapWaypoint.position, state.ui.mapWaypoint.label, 'Pinned map waypoint.', `waypoint ${state.ui.mapWaypoint.source}`, false, state.ui.mapWaypoint.source)
    : null;
  const activePinnedRumor = state.ui.pinnedRumorId ? state.world.activeEvents.find((event) => event.id === state.ui.pinnedRumorId && event.position) : null;
  const hasRoughMap = getItemCount(state.player.inventory, 'rough_treasure_map') > 0;
  const localEvent = state.world.activeEvents.find((event) => event.area === areaId && (event.discovered || state.world.discoveredRumorIds.includes(event.id)));
  const markers: SpatialMarker[] = [
    ...staticLandmarks.filter((entry) => entry.areaId === areaId && currentAreaKnown),
    marker('player', 'player', areaId, state.player.position, 'You', 'Current position.', 'player')
  ];

  for (const entity of localEntities) {
    if (entity.kind === 'portal' && currentAreaKnown) {
      markers.push(marker(`portal:${entity.id}`, 'entrances', areaId, entity.position, entity.name, `Entrance to ${areas[entity.destination].name}.`, 'portal', true, 'manual'));
      continue;
    }
    if (serviceEntity(entity) && currentAreaKnown) {
      markers.push(marker(`service:${entity.id}`, 'services', areaId, stableMapPosition(entity.position), entity.name, entity.kind === 'npc' ? entity.role : 'Service landmark.', 'service', true, 'manual'));
      continue;
    }
    if (entity.kind === 'social' && currentAreaKnown) {
      markers.push(marker(`companion:${entity.id}`, 'companions', areaId, stableMapPosition(entity.position), entity.name, 'Nearby companion or player-like character.', 'companion'));
      continue;
    }
    if (entity.kind === 'enemy' && currentAreaKnown) {
      markers.push(marker(`danger:${entity.id}`, 'danger', areaId, entity.position, entity.name, `${zone.riskLabel} encounter.`, 'danger'));
    }
  }

  state.world.activeEvents
    .filter((event) => event.area === areaId && event.position && (event.discovered || state.world.discoveredRumorIds.includes(event.id) || event.id === state.ui.pinnedRumorId))
    .forEach((event) => {
      markers.push(marker(`event:${event.id}`, isDangerEvent(event.type) ? 'danger' : 'pinned', areaId, event.position!, event.title, event.rumor, isDangerEvent(event.type) ? 'event danger' : 'event', true, 'rumor'));
    });

  if (activePinnedRumor && activePinnedRumor.area === areaId) {
    markers.push(marker(`pinned-rumor:${activePinnedRumor.id}`, 'pinned', areaId, activePinnedRumor.position!, activePinnedRumor.title, activePinnedRumor.rumor, 'pinned rumor', true, 'rumor'));
  }

  Object.entries(treasureMapDefinitions).forEach(([id, definition]) => {
    const runtime = state.world.treasure.maps[id];
    if (definition.regionHint !== areaId || runtime?.found) return;
    if (!runtime?.pinned && !(hasRoughMap && runtime?.decipheredPrecision > 0)) return;
    markers.push(marker(`treasure:${id}`, 'pinned', areaId, definition.approximateCoordinate, `${areas[definition.regionHint].name} treasure clue`, definition.clueText, 'treasure', true, 'treasure'));
  });

  if (objective && objective.areaId === areaId) markers.push(objective);
  if (waypoint) markers.push(waypoint);

  const layers = (Object.keys(layerLabels) as MapLayerId[]).map((id) => ({
    id,
    label: layerLabels[id],
    markers: markers.filter((entry) => entry.layer === id)
  }));
  const breadcrumb = state.ui.mapWaypoint
    ? `Waypoint: ${state.ui.mapWaypoint.label} (${areas[state.ui.mapWaypoint.areaId].name})`
    : objective
      ? `Next: ${objective.label}`
      : 'Explore discovered roads and entrances.';
  const cx = area.coordinateOffset.x + Math.round(state.player.position.x);
  const cz = area.coordinateOffset.z + Math.round(state.player.position.z);

  return {
    layers,
    breadcrumb,
    roadSignPrompt: roadSignPrompt(areaId),
    returnGuidance: returnGuidance(state),
    localEvent: localEvent ? localEvent.title : null,
    currentAreaLabel: displayAreaName(state),
    riskLabel: `${zone.riskLabel} · ${state.player.reputation.status}`,
    riskClass: `${zone.id} ${state.player.reputation.status}`,
    reputationLabel: crimeFeedback.reputationLabel,
    guardAttentionLabel: crimeFeedback.guardAttentionLabel,
    criminalWarning: crimeFeedback.criminalWarning,
    coordinateLabel: `Map ${cx}:${cz}`,
    timeLabel: formatMapTime(state.world.time.hour, state.world.time.minute, state.world.time.phase)
  };
}

function formatMapTime(hour: number, minute: number, phase: string): string {
  const roundedMinute = Math.floor(minute / 30) * 30;
  return `${hour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')} · ${phase}`;
}

function stableMapPosition(position: Vec3): Vec3 {
  return {
    x: Math.round(position.x / 4) * 4,
    y: 0,
    z: Math.round(position.z / 4) * 4
  };
}

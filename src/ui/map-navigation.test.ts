import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { Simulation } from '../game/Simulation';
import { triggerWorldEvent } from '../systems/LivingWorldSystem';
import { deriveSpatialContext } from './SpatialUX';
import { MapPanel } from './MapPanel';
import { Minimap } from './Minimap';

describe('map navigation and spatial UX', () => {
  it('renders explicit map layers, discovered services, and the first-hour objective without resource clutter', () => {
    const state = createInitialGameState();

    const html = Minimap(state);

    for (const layer of ['terrain', 'player', 'companions', 'services', 'objective', 'pinned', 'danger', 'entrances', 'housing']) {
      expect(html).toContain(`data-map-layer="${layer}"`);
    }
    expect(html).toContain('Town Fountain');
    expect(html).toContain('Bank Door');
    expect(html).toContain('data-map-waypoint-area="town"');
    expect(html).toContain('Next: Talk to Mira at the fountain');
    expect(html).toContain('Safe / Guarded');
    expect(html).toContain('Local Map');
    expect(html).not.toMatch(/Map -?\d+:-?\d+/);
    expect(html).not.toContain('map-dot resource');
    expect(html).not.toContain('dev-travel');
  });

  it('renders compact minimap as a clean minimap-only HUD surface', () => {
    const state = createInitialGameState();
    state.ui.minimapMode = 'compact';

    const html = Minimap(state);

    expect(html).toContain('data-minimap-mode="compact"');
    expect(html).toContain('data-map-layer="terrain"');
    expect(html).toContain('data-map-layer="player"');
    expect(html).not.toContain('area-name');
    expect(html).not.toContain('coords');
    expect(html).not.toContain('data-minimap-mode="expanded"');
    expect(html).not.toContain('data-map-waypoint-area=');
    expect(html).not.toContain('data-map-layer="services"');
  });

  it('moves route details, filters, legend, rumors, and entrances into the expanded map panel', () => {
    const state = createInitialGameState();
    const event = triggerWorldEvent(state, 'merchant_caravan');
    state.ui.pinnedRumorId = event.id;
    state.ui.minimapMode = 'expanded';
    state.ui.panels.map = true;

    const hudHtml = Minimap(state);
    const mapHtml = MapPanel(state);

    expect(hudHtml).toContain('data-minimap-mode="expanded"');
    expect(mapHtml).toContain('data-window-id="map"');
    expect(mapHtml).toContain('data-map-layer-toggle="services"');
    expect(mapHtml).toContain('data-map-layer-toggle="entrances"');
    expect(mapHtml).toContain('Terrain, roads, water, buildings');
    expect(mapHtml).toContain('Signs: Bank west');
    expect(mapHtml).toContain('Rumors');
    expect(mapHtml).toContain(`event:${event.id}`);
  });

  it('renders R9 as a discovery-gated regional Adventure Map with compact companion minimap', () => {
    const state = createInitialGameState();
    const event = triggerWorldEvent(state, 'merchant_caravan');
    state.player.currentArea = 'forest';
    state.player.position = { x: 0, y: 0, z: 4 };
    state.world.discoveredAreas = ['town', 'bank', 'blacksmith', 'forest', 'road', 'crypt', 'housing'];
    state.world.discoveredRumorIds.push(event.id);
    state.ui.pinnedRumorId = event.id;
    state.world.treasure.maps.greymont_cache.pinned = true;
    state.ui.minimapMode = 'expanded';
    state.ui.panels.map = true;

    const hudHtml = Minimap(state);
    const mapHtml = MapPanel(state);

    expect(hudHtml).toContain('data-minimap-mode="expanded"');
    expect(hudHtml).toContain('minimap-mode-compact');
    expect(hudHtml).not.toContain('area-name');
    expect(mapHtml).toContain('Adventure Map');
    for (const label of ['Briarbrook', 'Old River Road', 'Greymont Forest', 'Mine Entrance', 'Forgotten Crypt', 'Briarbrook Bank', 'Brom&#039;s Smithy', 'Player Plot', 'Old River Bridge']) {
      expect(mapHtml).toContain(label);
    }
    expect(mapHtml).toContain('data-map-marker="region:town"');
    expect(mapHtml).toContain('data-map-marker="region:road"');
    expect(mapHtml).toContain('data-map-marker="region:forest"');
    expect(mapHtml).toContain('data-map-marker="region:crypt"');
    expect(mapHtml).toContain('data-map-marker="region:housing"');
    expect(mapHtml).toContain('data-map-waypoint-source="rumor"');
    expect(mapHtml).toContain('data-map-waypoint-source="treasure"');
    expect(mapHtml).toContain('route-hint');
    expect(mapHtml).not.toContain('data-area=');
  });

  it('does not reveal undiscovered regional destinations on the expanded map by default', () => {
    const state = createInitialGameState();
    state.ui.minimapMode = 'expanded';
    state.ui.panels.map = true;

    const html = MapPanel(state);

    expect(html).toContain('Briarbrook');
    expect(html).toContain('Briarbrook Bank');
    expect(html).toContain('Brom&#039;s Smithy');
    expect(html).not.toContain('Old River Road');
    expect(html).not.toContain('Forgotten Crypt');
    expect(html).not.toContain('Player Plot');
    expect(html).not.toContain('Greymont Forest treasure clue');
  });

  it('applies expanded map layer filters without hiding the player marker by default', () => {
    const state = createInitialGameState();
    state.ui.minimapMode = 'expanded';
    state.ui.panels.map = true;
    state.ui.mapHiddenLayers = ['services'];

    const html = MapPanel(state);

    expect(html).toContain('data-map-layer="player"');
    expect(html).not.toContain('data-map-layer="services"');
    expect(html).toContain('data-map-layer-toggle="services"');
  });

  it('shows pinned rumors and treasure clues only when they are learned or pinned', () => {
    const state = createInitialGameState();
    const event = triggerWorldEvent(state, 'merchant_caravan');
    state.ui.pinnedRumorId = event.id;

    let html = Minimap(state);
    expect(html).toContain(`data-map-marker="event:${event.id}"`);
    expect(html).toContain('data-map-waypoint-source="rumor"');

    state.player.currentArea = 'forest';
    state.player.position = { x: 0, y: 0, z: 4 };
    state.world.discoveredAreas.push('forest');
    state.world.treasure.maps.greymont_cache.pinned = true;
    html = Minimap(state);

    expect(html).toContain('data-map-marker="treasure:greymont_cache"');
    expect(html).toContain('data-map-waypoint-source="treasure"');
  });

  it('communicates dungeon risk and return guidance without enabling normal debug travel', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'crypt';
    state.player.position = { x: -5, y: 0, z: 3 };
    state.world.discoveredAreas.push('forest', 'crypt');

    const context = deriveSpatialContext(state);
    const dangerLayer = context.layers.find((layer) => layer.id === 'danger');
    const html = Minimap(state);

    expect(context.riskLabel).toContain('High PvE Risk');
    expect(context.returnGuidance).toContain('Forest Exit');
    expect(dangerLayer?.markers.some((marker) => marker.label.includes('Skeletal'))).toBe(true);
    expect(html).not.toContain('data-area="town"');
  });

  it('rounds persistent map time so HUD click targets are not replaced every frame', () => {
    const state = createInitialGameState();
    state.world.time.hour = 12;
    state.world.time.minute = 44;
    state.world.time.phase = 'day';

    expect(deriveSpatialContext(state).timeLabel).toBe('12:30 · day');
  });

  it('keeps service marker positions stable across small NPC idle drift', () => {
    const state = createInitialGameState();
    const eldon = state.entities.npc_eldon_town;
    if (!eldon) throw new Error('expected banker NPC in town');

    eldon.position = { x: -7.1, y: 0, z: -3.2 };
    const first = deriveSpatialContext(state).layers.flatMap((layer) => layer.markers).find((marker) => marker.id === 'service:npc_eldon_town')?.position;
    eldon.position = { x: -7.9, y: 0, z: -3.1 };
    const second = deriveSpatialContext(state).layers.flatMap((layer) => layer.markers).find((marker) => marker.id === 'service:npc_eldon_town')?.position;

    expect(first).toEqual(second);
  });

  it('sets and clears non-teleport map waypoints from UI actions', () => {
    const state = createInitialGameState();
    const simulation = new Simulation(state);

    simulation.dispatch({ type: 'SET_MAP_WAYPOINT', areaId: 'forest', position: { x: 7, y: 0, z: -6 }, label: 'Mine trail', source: 'objective' });
    simulation.update(1 / 30);

    expect(state.ui.mapWaypoint).toMatchObject({ areaId: 'forest', label: 'Mine trail', source: 'objective' });
    expect(state.player.currentArea).toBe('town');
    expect(state.player.position).toMatchObject({ x: 2, z: 0 });
    expect(Minimap(state)).toContain('Waypoint: Mine trail (Greymont Forest)');

    simulation.dispatch({ type: 'CLEAR_MAP_WAYPOINT' });
    simulation.update(1 / 30);

    expect(state.ui.mapWaypoint).toBeNull();
  });

  it('switches minimap modes and map layer filters through simulation actions', () => {
    const state = createInitialGameState();
    const simulation = new Simulation(state);

    simulation.dispatch({ type: 'SET_MINIMAP_MODE', mode: 'expanded' });
    simulation.dispatch({ type: 'TOGGLE_MAP_LAYER', layerId: 'services' });
    simulation.update(1 / 30);

    expect(state.ui.minimapMode).toBe('expanded');
    expect(state.ui.panels.map).toBe(true);
    expect(state.ui.mapHiddenLayers).toContain('services');

    simulation.dispatch({ type: 'SET_MINIMAP_MODE', mode: 'compact' });
    simulation.update(1 / 30);

    expect(state.ui.minimapMode).toBe('compact');
    expect(state.ui.panels.map).toBe(false);
  });
});

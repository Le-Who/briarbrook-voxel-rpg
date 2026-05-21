import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import type { AreaId, GameState } from '../game/types';
import { AreaManager, resolveSafeSpawn } from './AreaManager';

interface RouteCheck {
  area: AreaId;
  label: string;
  from: { x: number; z: number };
  to: { x: number; z: number };
}

const qaRoutes: RouteCheck[] = [
  { area: 'town', label: 'town spawn to road gate', from: { x: 2, z: 0 }, to: { x: 13, z: 4 } },
  { area: 'town', label: 'town spawn to bank door', from: { x: 2, z: 0 }, to: { x: -8, z: -2 } },
  { area: 'bank', label: 'bank counter to town door', from: { x: 0, z: 4 }, to: { x: 0, z: 6 } },
  { area: 'blacksmith', label: 'smithy anvil to town door', from: { x: -1, z: 3 }, to: { x: -5, z: 5 } },
  { area: 'forest', label: 'forest spawn to town road over visible bridge', from: { x: 0, z: 4 }, to: { x: 0, z: 11 } },
  { area: 'forest', label: 'forest spawn to mine mouth', from: { x: 0, z: 4 }, to: { x: 7, z: -5 } },
  { area: 'road', label: 'road town gate to old bridge lane', from: { x: -8, z: 0 }, to: { x: 9, z: -4 } },
  { area: 'crypt', label: 'crypt spawn to forest exit', from: { x: -5, z: 3 }, to: { x: -9, z: 4 } },
  { area: 'crypt', label: 'crypt spawn to combat chamber', from: { x: -5, z: 3 }, to: { x: 1, z: 0 } },
  { area: 'crypt', label: 'crypt spawn to altar niche', from: { x: -5, z: 3 }, to: { x: 0, z: -8 } },
  { area: 'crypt', label: 'crypt spawn to secret wall', from: { x: -5, z: 3 }, to: { x: -12, z: 6 } },
  { area: 'crypt', label: 'crypt spawn to warded reliquary', from: { x: -5, z: 3 }, to: { x: 7, z: 7 } },
  { area: 'housing', label: 'plot spawn to build footprint', from: { x: -4, z: 2 }, to: { x: 0, z: 0 } },
  { area: 'housing', label: 'plot spawn to ferry opening', from: { x: -4, z: 2 }, to: { x: -8, z: 5 } }
];

describe('traversability collision contract', () => {
  it('keeps prompt-140 QA routes walkable through visible lanes and portals', () => {
    const areaManager = new AreaManager();
    const state = staticOnlyState();

    for (const route of qaRoutes) {
      expect(routeReachable(state, areaManager, route), route.label).toBe(true);
    }
  });

  it('keeps every portal origin and destination on reachable walkable tiles', () => {
    const areaManager = new AreaManager();
    const state = staticOnlyState();
    const portals = Object.values(state.entities).filter((entity) => entity.kind === 'portal');

    expect(portals.map((portal) => portal.id)).toEqual(
      expect.arrayContaining([
        'portal_bank',
        'portal_smith',
        'portal_forest',
        'portal_road',
        'portal_plot',
        'portal_crypt',
        'portal_town_bank',
        'portal_town_smith',
        'portal_town_forest',
        'portal_town_road',
        'portal_town_plot',
        'portal_forest_crypt'
      ])
    );

    for (const portal of portals) {
      const origin = { x: Math.round(portal.position.x), z: Math.round(portal.position.z) };
      const destinationSpawn = portal.spawn ?? areaManager.getSpawn(portal.destination);
      const destination = { x: Math.round(destinationSpawn.x), z: Math.round(destinationSpawn.z) };
      const spawn = areaManager.getSpawn(portal.area);
      const destinationPortals = portals.filter((candidate) => candidate.area === portal.destination);

      expect(areaManager.isBlockedInArea(state, portal.area, origin.x, origin.z), `${portal.id} origin blocked`).toBe(false);
      expect(areaManager.hasMoveExitInArea(state, portal.area, origin.x, origin.z), `${portal.id} origin trapped`).toBe(true);
      expect(
        routeReachable(state, areaManager, {
          area: portal.area,
          label: `${portal.id} spawn route`,
          from: { x: Math.round(spawn.x), z: Math.round(spawn.z) },
          to: origin
        }),
        `${portal.id} spawn route`
      ).toBe(true);
      expect(areaManager.isBlockedInArea(state, portal.destination, destination.x, destination.z), `${portal.id} destination blocked`).toBe(false);
      expect(areaManager.hasMoveExitInArea(state, portal.destination, destination.x, destination.z), `${portal.id} destination trapped`).toBe(true);
      expect(
        destinationPortals.some((candidate) => Math.round(candidate.position.x) === destination.x && Math.round(candidate.position.z) === destination.z),
        `${portal.id} destination overlaps another portal and would force a safe-spawn fallback`
      ).toBe(false);
      const resolved = resolveSafeSpawn(
        state,
        areaManager,
        portal.destination,
        { x: destination.x, y: 0, z: destination.z },
        4,
        { avoidPortalIds: destinationPortals.map((candidate) => candidate.id) }
      );
      expect(resolved.usedFallback, `${portal.id} should not need spawn fallback`).toBe(false);
    }
  });

  it('does not block the visible Greymont Forest bridge route', () => {
    const areaManager = new AreaManager();
    const state = staticOnlyState();

    for (const point of [
      { x: -1, z: 6 },
      { x: 0, z: 6 },
      { x: 1, z: 6 }
    ]) {
      expect(areaManager.isBlockedInArea(state, 'forest', point.x, point.z), `forest bridge ${point.x},${point.z}`).toBe(false);
    }
  });

  it('removes the legacy Old River Road cabin blocker from the rebuilt combat lane', () => {
    const areaManager = new AreaManager();
    const state = staticOnlyState();

    for (const point of [
      { x: -12, z: -5 },
      { x: -10, z: -4 },
      { x: -8, z: -3 }
    ]) {
      expect(areaManager.isBlockedInArea(state, 'road', point.x, point.z), `legacy cabin blocker ${point.x},${point.z}`).toBe(false);
      expect(areaManager.getBlockerExplanation('road', point.x, point.z), `legacy cabin explanation ${point.x},${point.z}`).toBe('walkable ground');
    }
  });

  it('explains representative blockers with visible environmental causes', () => {
    const areaManager = new AreaManager();

    expect(areaManager.getBlockerExplanation('forest', -2, 6)).toContain('stream');
    expect(areaManager.getBlockerExplanation('road', 10, 9)).toContain('fence');
    expect(areaManager.getBlockerExplanation('crypt', 0, 0)).toContain('pillar');
    expect(areaManager.getBlockerExplanation('housing', 0, 9)).toContain('water');
  });
});

function staticOnlyState(): GameState {
  const state = createInitialGameState();
  for (const entity of Object.values(state.entities)) entity.blocksMovement = false;
  state.world.placedBuildings = [];
  return state;
}

function routeReachable(state: GameState, areaManager: AreaManager, route: RouteCheck): boolean {
  if (areaManager.isBlockedInArea(state, route.area, route.from.x, route.from.z)) return false;
  if (areaManager.isBlockedInArea(state, route.area, route.to.x, route.to.z)) return false;
  const queue = [route.from];
  const seen = new Set([key(route.from.x, route.from.z)]);
  const dirs = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 }
  ];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.x === route.to.x && current.z === route.to.z) return true;
    for (const dir of dirs) {
      const next = { x: current.x + dir.x, z: current.z + dir.z };
      const nextKey = key(next.x, next.z);
      if (seen.has(nextKey)) continue;
      if (areaManager.isBlockedInArea(state, route.area, next.x, next.z)) continue;
      seen.add(nextKey);
      queue.push(next);
    }
  }
  return false;
}

function key(x: number, z: number): string {
  return `${x},${z}`;
}

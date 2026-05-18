import { areas } from '../data/areas';
import type { AreaId, GameState, Vec3 } from '../game/types';

export interface BuildPlot {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ResolveSafeSpawnOptions {
  avoidPortalIds?: string[];
}

export interface SafeSpawnResolution {
  position: Vec3;
  requested: Vec3;
  usedFallback: boolean;
  attempts: number;
}

export class AreaManager {
  private staticBlocked = new Map<AreaId, Set<string>>();

  constructor() {
    this.staticBlocked.set('town', this.buildTownBlocked());
    this.staticBlocked.set('bank', this.rectWalls(-7, 7, -5, 7, [[-1, 6], [0, 6], [1, 6]]));
    this.staticBlocked.set('blacksmith', this.rectWalls(-7, 7, -5, 6, [[-6, 5], [-5, 5], [-4, 5]]));
    this.staticBlocked.set('forest', this.buildForestBlocked());
    this.staticBlocked.set('crypt', this.buildCryptBlocked());
    this.staticBlocked.set('road', this.buildRoadBlocked());
    this.staticBlocked.set('housing', this.buildHousingBlocked());
  }

  getSpawn(areaId: AreaId): Vec3 {
    return { ...areas[areaId].spawn };
  }

  getBuildPlot(): BuildPlot {
    return { minX: -5, maxX: 5, minZ: -4, maxZ: 5 };
  }

  getAreaBounds(areaId: AreaId): { minX: number; maxX: number; minZ: number; maxZ: number } {
    if (areaId === 'bank' || areaId === 'blacksmith') {
      return { minX: -7, maxX: 7, minZ: -5, maxZ: 7 };
    }
    if (areaId === 'town') return { minX: -22, maxX: 22, minZ: -18, maxZ: 18 };
    if (areaId === 'forest') return { minX: -18, maxX: 18, minZ: -16, maxZ: 16 };
    if (areaId === 'crypt') return { minX: -15, maxX: 15, minZ: -12, maxZ: 12 };
    if (areaId === 'road') return { minX: -18, maxX: 18, minZ: -14, maxZ: 14 };
    if (areaId === 'housing') return { minX: -15, maxX: 15, minZ: -12, maxZ: 12 };
    return { minX: -13, maxX: 13, minZ: -11, maxZ: 11 };
  }

  isInsideBounds(areaId: AreaId, x: number, z: number): boolean {
    const bounds = this.getAreaBounds(areaId);
    return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
  }

  isBlocked(state: GameState, x: number, z: number, ignoreEntityId?: string): boolean {
    return this.isBlockedInArea(state, state.player.currentArea, x, z, ignoreEntityId);
  }

  isBlockedInArea(state: GameState, areaId: AreaId, x: number, z: number, ignoreEntityId?: string): boolean {
    const gx = Math.round(x);
    const gz = Math.round(z);
    if (!this.isInsideBounds(areaId, gx, gz)) return true;
    const key = this.key(gx, gz);
    if (this.staticBlocked.get(areaId)?.has(key)) return true;

    for (const entity of Object.values(state.entities)) {
      if (entity.id === ignoreEntityId || entity.area !== areaId || !entity.blocksMovement) continue;
      if ('state' in entity && entity.state === 'dead') continue;
      if (Math.round(entity.position.x) === gx && Math.round(entity.position.z) === gz) return true;
    }
    for (const building of state.world.placedBuildings) {
      if (building.area !== areaId || !building.blocksMovement) continue;
      if (Math.round(building.position.x) === gx && Math.round(building.position.z) === gz) return true;
    }
    return false;
  }

  hasMoveExitInArea(state: GameState, areaId: AreaId, x: number, z: number): boolean {
    return [
      { x: 1, z: 0 },
      { x: -1, z: 0 },
      { x: 0, z: 1 },
      { x: 0, z: -1 }
    ].some((dir) => !this.isBlockedInArea(state, areaId, x + dir.x, z + dir.z));
  }

  getHeight(areaId: AreaId, x: number, z: number): number {
    if (areaId === 'forest') {
      return Math.max(0, Math.floor((Math.sin(x * 0.55) + Math.cos(z * 0.45)) * 0.45));
    }
    if (areaId === 'housing' && z > 6) return -0.35;
    return 0;
  }

  nearestInteractable(state: GameState, radius = 1.6): string | null {
    let best: { id: string; dist: number } | null = null;
    const player = state.player.position;
    for (const entity of Object.values(state.entities)) {
      if (entity.area !== state.player.currentArea) continue;
      if ('state' in entity && entity.state === 'dead') continue;
      const dist = Math.hypot(entity.position.x - player.x, entity.position.z - player.z);
      if (dist > radius) continue;
      if (!best || dist < best.dist) best = { id: entity.id, dist };
    }
    return best?.id ?? null;
  }

  getBlockingSet(areaId: AreaId): Set<string> {
    return new Set(this.staticBlocked.get(areaId) ?? []);
  }

  private key(x: number, z: number): string {
    return `${x},${z}`;
  }

  private rectWalls(minX: number, maxX: number, minZ: number, maxZ: number, openings: number[][] = []): Set<string> {
    const set = new Set<string>();
    const isOpening = (x: number, z: number) => openings.some(([ox, oz]) => ox === x && oz === z);
    for (let x = minX; x <= maxX; x += 1) {
      for (const z of [minZ, maxZ]) {
        if (!isOpening(x, z)) set.add(this.key(x, z));
      }
    }
    for (let z = minZ; z <= maxZ; z += 1) {
      for (const x of [minX, maxX]) {
        if (!isOpening(x, z)) set.add(this.key(x, z));
      }
    }
    return set;
  }

  private buildTownBlocked(): Set<string> {
    const set = new Set<string>();
    const blockRect = (minX: number, maxX: number, minZ: number, maxZ: number) => {
      for (let x = minX; x <= maxX; x += 1) {
        for (let z = minZ; z <= maxZ; z += 1) set.add(this.key(x, z));
      }
    };
    for (let x = -13; x <= -10; x += 1) {
      for (let z = 5; z <= 11; z += 1) set.add(this.key(x, z));
    }
    for (let x = 9; x <= 13; x += 1) {
      for (let z = -11; z <= -6; z += 1) set.add(this.key(x, z));
    }
    for (let x = -9; x <= -6; x += 1) {
      for (let z = -6; z <= -3; z += 1) set.add(this.key(x, z));
    }
    for (let x = 4; x <= 8; x += 1) {
      for (let z = -7; z <= -4; z += 1) set.add(this.key(x, z));
    }
    for (let x = 8; x <= 12; x += 1) {
      for (let z = 1; z <= 4; z += 1) set.add(this.key(x, z));
    }
    for (let x = -1; x <= 1; x += 1) {
      for (let z = -1; z <= 1; z += 1) set.add(this.key(x, z));
    }
    blockRect(-20, -16, -9, -5);
    blockRect(-18, -14, -3, 1);
    blockRect(14, 18, -10, -6);
    blockRect(15, 19, 6, 10);
    blockRect(17, 20, 12, 14);
    return set;
  }

  private buildForestBlocked(): Set<string> {
    const set = new Set<string>();
    for (let x = -2; x <= 3; x += 1) set.add(this.key(x, 6));
    for (let z = -8; z <= -5; z += 1) {
      for (let x = 6; x <= 10; x += 1) set.add(this.key(x, z));
    }
    set.delete(this.key(7, -5));
    set.delete(this.key(7, -4));
    for (let x = -18; x <= 18; x += 1) {
      if (x < -3 || x > 3) set.add(this.key(x, -15));
    }
    for (let z = -13; z <= -9; z += 1) {
      if (z !== -11) set.add(this.key(12, z));
    }
    return set;
  }

  private buildCryptBlocked(): Set<string> {
    const set = this.rectWalls(-15, 15, -12, 12, [[-10, 4], [-9, 4], [-8, 4], [0, 12], [1, 12]]);
    [
      [-4, -4],
      [-3, -4],
      [2, -5],
      [6, -3],
      [-6, 4],
      [4, 4],
      [0, 0],
      [-10, -4],
      [-9, -4],
      [-8, -4],
      [9, 2],
      [10, 2],
      [11, 2],
      [3, 8],
      [4, 8],
      [5, 8]
    ].forEach(([x, z]) => set.add(this.key(x, z)));
    return set;
  }

  private buildRoadBlocked(): Set<string> {
    const set = new Set<string>();
    for (let x = -13; x <= 13; x += 1) {
      if (x < -4 || x > 4) set.add(this.key(x, 8));
      set.add(this.key(x, 11));
    }
    for (let z = -11; z <= 11; z += 1) {
      if (z > 5) set.add(this.key(-13, z));
      if (z > 5) set.add(this.key(13, z));
    }
    for (let x = -12; x <= -8; x += 1) {
      for (let z = -6; z <= -3; z += 1) set.add(this.key(x, z));
    }
    return set;
  }

  private buildHousingBlocked(): Set<string> {
    const set = new Set<string>();
    for (let x = -13; x <= 13; x += 1) {
      for (let z = 8; z <= 11; z += 1) set.add(this.key(x, z));
    }
    for (let x = -7; x <= 7; x += 1) {
      set.add(this.key(x, -6));
      set.add(this.key(x, 6));
    }
    for (let z = -6; z <= 6; z += 1) {
      set.add(this.key(-7, z));
      set.add(this.key(7, z));
    }
    set.delete(this.key(-7, 1));
    set.delete(this.key(-7, 2));
    return set;
  }
}

export function resolveSafeSpawn(
  state: GameState,
  areaManager: AreaManager,
  areaId: AreaId,
  desiredPosition: Vec3,
  radius = 4,
  options: ResolveSafeSpawnOptions = {}
): SafeSpawnResolution {
  const requested = { x: Math.round(desiredPosition.x), y: 0, z: Math.round(desiredPosition.z) };
  const candidates = [requested];
  for (let ring = 1; ring <= radius; ring += 1) {
    const ringCandidates: Vec3[] = [];
    for (let ox = -ring; ox <= ring; ox += 1) {
      for (let oz = -ring; oz <= ring; oz += 1) {
        if (Math.abs(ox) !== ring && Math.abs(oz) !== ring) continue;
        ringCandidates.push({ x: requested.x + ox, y: 0, z: requested.z + oz });
      }
    }
    candidates.push(...sortSpawnRing(ringCandidates, state, areaId, options));
  }

  let attempts = 0;
  for (const candidate of candidates) {
    attempts += 1;
    if (!isSafeSpawnCandidate(state, areaManager, areaId, candidate, options)) continue;
    const usedFallback = candidate.x !== requested.x || candidate.z !== requested.z;
    if (usedFallback) {
      console.warn(`[transition] Safe spawn fallback in ${areaId}: requested ${requested.x},${requested.z}; resolved ${candidate.x},${candidate.z}.`);
    }
    return { position: candidate, requested, usedFallback, attempts };
  }

  console.warn(`[transition] No safe spawn found in ${areaId}; using requested ${requested.x},${requested.z}.`);
  return { position: requested, requested, usedFallback: true, attempts };
}

function sortSpawnRing(candidates: Vec3[], state: GameState, areaId: AreaId, options: ResolveSafeSpawnOptions): Vec3[] {
  const portals = avoidedPortals(state, areaId, options);
  return candidates.sort((a, b) => {
    const portalDistA = nearestPortalDistance(a, portals);
    const portalDistB = nearestPortalDistance(b, portals);
    if (portalDistA !== portalDistB) return portalDistB - portalDistA;
    if (a.z !== b.z) return b.z - a.z;
    return Math.abs(a.x) - Math.abs(b.x);
  });
}

function isSafeSpawnCandidate(state: GameState, areaManager: AreaManager, areaId: AreaId, candidate: Vec3, options: ResolveSafeSpawnOptions): boolean {
  if (areaManager.isBlockedInArea(state, areaId, candidate.x, candidate.z)) return false;
  if (isOnAvoidedPortal(state, areaId, candidate, options)) return false;
  return areaManager.hasMoveExitInArea(state, areaId, candidate.x, candidate.z);
}

function isOnAvoidedPortal(state: GameState, areaId: AreaId, candidate: Vec3, options: ResolveSafeSpawnOptions): boolean {
  return avoidedPortals(state, areaId, options).some(
    (portal) => Math.round(portal.position.x) === Math.round(candidate.x) && Math.round(portal.position.z) === Math.round(candidate.z)
  );
}

function avoidedPortals(state: GameState, areaId: AreaId, options: ResolveSafeSpawnOptions) {
  const explicit = new Set(options.avoidPortalIds ?? []);
  return Object.values(state.entities).filter((entity) => entity.kind === 'portal' && entity.area === areaId && (!explicit.size || explicit.has(entity.id)));
}

function nearestPortalDistance(candidate: Vec3, portals: ReturnType<typeof avoidedPortals>): number {
  if (!portals.length) return 0;
  return portals.reduce((best, portal) => Math.min(best, Math.hypot(candidate.x - portal.position.x, candidate.z - portal.position.z)), Number.POSITIVE_INFINITY);
}

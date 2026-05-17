import { areas } from '../data/areas';
import type { AreaId, GameState, Vec3 } from '../game/types';

export interface BuildPlot {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
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
    const gx = Math.round(x);
    const gz = Math.round(z);
    const areaId = state.player.currentArea;
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

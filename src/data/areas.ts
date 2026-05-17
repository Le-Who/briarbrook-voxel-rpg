import type { AreaId, Vec3 } from '../game/types';

export interface AreaDefinition {
  id: AreaId;
  name: string;
  spawn: Vec3;
  palette: 'town' | 'interior' | 'forest' | 'dungeon' | 'road' | 'housing';
  safeZone: boolean;
  minimapTint: string;
  coordinateOffset: { x: number; z: number };
}

export const areas: Record<AreaId, AreaDefinition> = {
  town: {
    id: 'town',
    name: 'Briarbrook',
    spawn: { x: 2, y: 0, z: 0 },
    palette: 'town',
    safeZone: true,
    minimapTint: '#5f8f48',
    coordinateOffset: { x: 142, z: -211 }
  },
  bank: {
    id: 'bank',
    name: 'Briarbrook Bank',
    spawn: { x: 0, y: 0, z: 4 },
    palette: 'interior',
    safeZone: true,
    minimapTint: '#7c6746',
    coordinateOffset: { x: 134, z: -215 }
  },
  blacksmith: {
    id: 'blacksmith',
    name: 'Brom\'s Smithy',
    spawn: { x: -1, y: 0, z: 3 },
    palette: 'interior',
    safeZone: true,
    minimapTint: '#77523a',
    coordinateOffset: { x: 148, z: -216 }
  },
  forest: {
    id: 'forest',
    name: 'Greymont Forest',
    spawn: { x: 0, y: 0, z: 4 },
    palette: 'forest',
    safeZone: false,
    minimapTint: '#43773d',
    coordinateOffset: { x: 132, z: -184 }
  },
  crypt: {
    id: 'crypt',
    name: 'Forgotten Crypt',
    spawn: { x: -5, y: 0, z: 3 },
    palette: 'dungeon',
    safeZone: false,
    minimapTint: '#4e4540',
    coordinateOffset: { x: 138, z: -170 }
  },
  road: {
    id: 'road',
    name: 'Old River Road',
    spawn: { x: -4, y: 0, z: 1 },
    palette: 'road',
    safeZone: false,
    minimapTint: '#6c7048',
    coordinateOffset: { x: 166, z: -193 }
  },
  housing: {
    id: 'housing',
    name: 'Briarbrook Plot',
    spawn: { x: -4, y: 0, z: 2 },
    palette: 'housing',
    safeZone: true,
    minimapTint: '#60894b',
    coordinateOffset: { x: 126, z: -198 }
  }
};

export const travelOrder: AreaId[] = ['town', 'bank', 'blacksmith', 'forest', 'crypt', 'road', 'housing'];

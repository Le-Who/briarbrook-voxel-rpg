import type { AreaId, ResourceKind, ResourceTile, ResourceYieldEntry } from '../game/types';

const key = (areaId: AreaId, x: number, z: number, kind: ResourceKind) => `${areaId}:${Math.round(x)},${Math.round(z)}:${kind}`;

function tile(
  areaId: AreaId,
  x: number,
  z: number,
  resourceKind: ResourceKind,
  name: string,
  difficulty: number,
  yields: ResourceYieldEntry[],
  visualVariant = 0,
  maxHarvests = 3
): ResourceTile {
  return {
    areaId,
    x: Math.round(x),
    z: Math.round(z),
    resourceKind,
    name,
    depletedUntil: 0,
    currentYieldTable: yields,
    hiddenQuality: 0.75 + ((Math.abs(x * 17 + z * 31) % 30) / 100),
    lastHarvestedAt: 0,
    visualVariant,
    difficulty,
    harvestsRemaining: maxHarvests,
    maxHarvests
  };
}

const commonTreeYields: ResourceYieldEntry[] = [
  { itemId: 'logs', min: 4, max: 9, chance: 1 },
  { itemId: 'bark_fragment', min: 1, max: 2, chance: 0.2 },
  { itemId: 'kindling', min: 1, max: 3, chance: 0.25 },
  { itemId: 'oak_logs', min: 1, max: 3, chance: 0.2, minSkill: 35 },
  { itemId: 'ash_logs', min: 1, max: 2, chance: 0.13, minSkill: 55 },
  { itemId: 'yew_logs', min: 1, max: 1, chance: 0.08, minSkill: 75 }
];

const oreYields: ResourceYieldEntry[] = [
  { itemId: 'iron_ore', min: 3, max: 7, chance: 1 },
  { itemId: 'dull_copper_ore', min: 2, max: 5, chance: 0.45, minSkill: 45 },
  { itemId: 'copper_ore', min: 3, max: 6, chance: 0.35, minSkill: 55 },
  { itemId: 'bronze_ore', min: 2, max: 5, chance: 0.26, minSkill: 65 },
  { itemId: 'shadow_iron_ore', min: 1, max: 4, chance: 0.18, minSkill: 75 },
  { itemId: 'gold_ore', min: 1, max: 3, chance: 0.12, minSkill: 85 },
  { itemId: 'glimmer_gem', min: 1, max: 1, chance: 0.08, minSkill: 80 },
  { itemId: 'stone_block', min: 1, max: 3, chance: 0.65 }
];

const fishYields: ResourceYieldEntry[] = [
  { itemId: 'raw_fish', min: 1, max: 3, chance: 1 },
  { itemId: 'old_boots', min: 1, max: 1, chance: 0.12 },
  { itemId: 'map_fragment', min: 1, max: 1, chance: 0.08, minSkill: 25 },
  { itemId: 'sealed_crate', min: 1, max: 1, chance: 0.05, minSkill: 45 },
  { itemId: 'bottle_message', min: 1, max: 1, chance: 0.06, minSkill: 35 }
];

export function createInitialResourceTiles(): Record<string, ResourceTile> {
  const tiles: Record<string, ResourceTile> = {};
  const add = (resource: ResourceTile) => {
    tiles[key(resource.areaId, resource.x, resource.z, resource.resourceKind)] = resource;
  };

  for (let i = 0; i < 28; i += 1) {
    const x = -12 + ((i * 5) % 24);
    const z = -10 + ((i * 7) % 20);
    if (Math.abs(x) < 3 && z > 3) continue;
    add(tile('forest', x, z, 'tree', 'Tree', 22 + (i % 4) * 3, commonTreeYields, i % 5, 3 + (i % 2)));
  }

  [
    [-11, -9],
    [-6, -1],
    [-1, 7],
    [4, -9],
    [9, -1],
    [12, 7]
  ].forEach(([x, z], index) => add(tile('town', x, z, 'tree', 'Tree', 25, commonTreeYields, index, 3)));

  [
    [5, -2],
    [-7, 3],
    [8, -3],
    [6, -6],
    [7, -6],
    [8, -6],
    [9, -6],
    [6, -7],
    [7, -7],
    [8, -7],
    [9, -7]
  ].forEach(([x, z], index) => add(tile('forest', x, z, 'ore', 'Rock Face', 28 + (index % 4) * 4, oreYields, index % 4, 3)));

  for (let x = 9; x <= 13; x += 1) {
    for (let z = 8; z <= 11; z += 1) {
      add(tile('road', x, z, 'water', 'Water', 18, fishYields, (x + z) % 3, 99));
    }
  }
  for (let x = -13; x <= 13; x += 1) {
    for (let z = 8; z <= 11; z += 1) {
      add(tile('housing', x, z, 'water', 'Water', 18, fishYields, (x + z) % 3, 99));
    }
  }

  return tiles;
}

export function resourceTileKey(areaId: AreaId, x: number, z: number, kind: ResourceKind): string {
  return key(areaId, x, z, kind);
}

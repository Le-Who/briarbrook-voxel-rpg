import type { AreaId, ResourceKind, ResourceTile, ResourceYieldEntry } from '../game/types';
import { resourceNodeDefs, resourcePlacements } from './resources';

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
  maxHarvests = 3,
  metadata: Partial<Pick<ResourceTile, 'classification' | 'protected' | 'tileId' | 'entityId' | 'visualState'>> = {}
): ResourceTile {
  return {
    areaId,
    x: Math.round(x),
    z: Math.round(z),
    resourceKind,
    name,
    ...metadata,
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

const lightTreeYields: ResourceYieldEntry[] = [
  { itemId: 'logs', min: 2, max: 5, chance: 1 },
  { itemId: 'kindling', min: 1, max: 2, chance: 0.22 },
  { itemId: 'bark_fragment', min: 1, max: 1, chance: 0.16 }
];

const rareYewYields: ResourceYieldEntry[] = [
  { itemId: 'logs', min: 3, max: 6, chance: 1 },
  { itemId: 'yew_logs', min: 1, max: 2, chance: 0.45, minSkill: 55 },
  { itemId: 'bark_fragment', min: 1, max: 2, chance: 0.28 }
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

  resourcePlacements
    .filter((placement) => resourceNodeDefs[placement.resourceId]?.resourceType === 'tree')
    .forEach((placement, index) => {
      const definition = resourceNodeDefs[placement.resourceId];
      const yields = placement.resourceId === 'ancient_yew' ? rareYewYields : placement.area === 'forest' ? commonTreeYields : lightTreeYields;
      add(
        tile(
          placement.area,
          placement.x,
          placement.z,
          'tree',
          placement.name ?? definition.name,
          placement.difficulty ?? 22 + (index % 4) * 3,
          yields,
          placement.visualVariant ?? index % 5,
          placement.maxHarvests ?? (placement.area === 'forest' ? 3 + (index % 2) : 2),
          {
            classification: placement.classification ?? 'harvestableTree',
            protected: placement.protected ?? false,
            entityId: placement.id,
            tileId: `${placement.area}:tree:${placement.x},${placement.z}`,
            visualState: 'standing'
          }
        )
      );
    });

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

export function mergeResourceTilesWithDefaults(saved: unknown): Record<string, ResourceTile> {
  const defaults = createInitialResourceTiles();
  if (!saved || typeof saved !== 'object') return defaults;
  const result: Record<string, ResourceTile> = { ...defaults };
  Object.entries(saved as Record<string, Partial<ResourceTile>>).forEach(([tileKey, value]) => {
    if (!value || typeof value !== 'object') return;
    const fallback = defaults[tileKey];
    const areaId = value.areaId ?? fallback?.areaId;
    const x = typeof value.x === 'number' ? Math.round(value.x) : fallback?.x;
    const z = typeof value.z === 'number' ? Math.round(value.z) : fallback?.z;
    const resourceKind = value.resourceKind ?? fallback?.resourceKind;
    if (!areaId || typeof x !== 'number' || typeof z !== 'number' || !resourceKind) return;
    result[tileKey] = {
      ...(fallback ?? {
        areaId,
        x,
        z,
        resourceKind,
        name: value.name ?? 'Resource',
        depletedUntil: 0,
        currentYieldTable: [],
        hiddenQuality: 1,
        lastHarvestedAt: 0,
        visualVariant: 0,
        difficulty: 22,
        harvestsRemaining: 1,
        maxHarvests: 1
      }),
      ...value,
      areaId,
      x,
      z,
      resourceKind,
      name: value.name ?? fallback?.name ?? 'Resource',
      depletedUntil: Number(value.depletedUntil ?? fallback?.depletedUntil ?? 0),
      currentYieldTable: Array.isArray(value.currentYieldTable) && value.currentYieldTable.length ? value.currentYieldTable : (fallback?.currentYieldTable ?? []),
      hiddenQuality: Number(value.hiddenQuality ?? fallback?.hiddenQuality ?? 1),
      lastHarvestedAt: Number(value.lastHarvestedAt ?? fallback?.lastHarvestedAt ?? 0),
      visualVariant: Number(value.visualVariant ?? fallback?.visualVariant ?? 0),
      difficulty: Number(value.difficulty ?? fallback?.difficulty ?? 22),
      harvestsRemaining: Number(value.harvestsRemaining ?? fallback?.harvestsRemaining ?? fallback?.maxHarvests ?? 1),
      maxHarvests: Number(value.maxHarvests ?? fallback?.maxHarvests ?? 1),
      classification: value.classification ?? fallback?.classification,
      protected: value.protected ?? fallback?.protected ?? false,
      tileId: value.tileId ?? fallback?.tileId,
      entityId: value.entityId ?? fallback?.entityId,
      visualState: value.visualState ?? fallback?.visualState ?? 'standing'
    };
  });
  return result;
}

import type { AreaId, TreeResourceClassification } from '../game/types';

export interface SystemicTreePlacement {
  id: string;
  area: AreaId;
  x: number;
  z: number;
  resourceId: 'oak_tree' | 'pine_tree' | 'birch_tree' | 'ancient_yew';
  name?: string;
  classification: TreeResourceClassification;
  protected?: boolean;
  difficulty?: number;
  maxHarvests?: number;
  visualVariant?: number;
}

const manualForestTreeCoords = new Set(['forest:-3,0', 'forest:11,4']);

const coordKey = (area: AreaId, x: number, z: number) => `${area}:${x},${z}`;
const isTreePlacement = (placement: SystemicTreePlacement | null): placement is SystemicTreePlacement => Boolean(placement);

const forestTreePlacements: SystemicTreePlacement[] = Array.from({ length: 48 }, (_, i): SystemicTreePlacement | null => {
  const x = -17 + ((i * 7) % 35);
  const z = -15 + ((i * 11) % 31);
  if ((Math.abs(x) < 3 && z > 3) || (x > 4 && z < -5) || manualForestTreeCoords.has(coordKey('forest', x, z))) return null;
  const resourceId: SystemicTreePlacement['resourceId'] = i % 5 === 0 ? 'oak_tree' : i % 3 === 0 ? 'birch_tree' : 'pine_tree';
  return {
    id: `res_tree_forest_${String(i).padStart(2, '0')}`,
    area: 'forest' as const,
    x,
    z,
    resourceId,
    classification: 'harvestableTree' as const,
    difficulty: 20 + (i % 5) * 3,
    maxHarvests: 2 + (i % 3),
    visualVariant: i % 5
  };
}).filter(isTreePlacement);

const townTreePlacements: SystemicTreePlacement[] = Array.from({ length: 26 }, (_, i): SystemicTreePlacement | null => {
  const x = -20 + (i % 7) * 6;
  const z = -15 + Math.floor(i / 7) * 9;
  if (Math.abs(x) < 8 && Math.abs(z) < 8) return null;
  return {
    id: `res_tree_town_${String(i).padStart(2, '0')}`,
    area: 'town' as const,
    x,
    z,
    resourceId: 'oak_tree' as const,
    name: 'Town Tree',
    classification: 'protectedTownTree' as const,
    protected: true,
    difficulty: 24,
    maxHarvests: 1,
    visualVariant: i % 4
  };
}).filter(isTreePlacement);

const roadTreePlacements: SystemicTreePlacement[] = [
  [-8, 3],
  [8, -3],
  [-13, 2],
  [10, 4],
  [2, -7]
].map(([x, z], index) => ({
  id: `res_tree_road_${index + 1}`,
  area: 'road' as const,
  x,
  z,
  resourceId: index % 2 ? 'oak_tree' : 'pine_tree',
  name: 'Roadside Tree',
  classification: 'harvestableTree' as const,
  difficulty: 21 + index,
  maxHarvests: 2,
  visualVariant: index
}));

const housingTreePlacements: SystemicTreePlacement[] = [
  {
    id: 'res_tree_housing_plot_1',
    area: 'housing',
    x: 8,
    z: 0,
    resourceId: 'oak_tree',
    name: 'Plot Tree',
    classification: 'harvestableTree',
    difficulty: 22,
    maxHarvests: 2,
    visualVariant: 2
  }
];

export const systemicTreeResourcePlacements: SystemicTreePlacement[] = [
  ...forestTreePlacements,
  ...townTreePlacements,
  ...roadTreePlacements,
  ...housingTreePlacements
];

export const treeHarvestAuditCounts = {
  forestVisualTrees: forestTreePlacements.length + manualForestTreeCoords.size,
  protectedTownTrees: townTreePlacements.length,
  roadTrees: roadTreePlacements.length,
  housingTrees: housingTreePlacements.length,
  systemicPlacements: systemicTreeResourcePlacements.length
};

export function isSystemicTreeCoordinate(area: AreaId, x: number, z: number): boolean {
  return systemicTreeResourcePlacements.some((placement) => placement.area === area && placement.x === Math.round(x) && placement.z === Math.round(z));
}

import type { AreaId, ResourceNodeEntity, SkillName } from '../game/types';

export interface ResourceNodeDefinition {
  id: string;
  name: string;
  resourceType: ResourceNodeEntity['resourceType'];
  toolItemId: string;
  skill: SkillName;
  yieldItemId: string;
  yieldRange: [number, number];
  baseDuration: number;
  respawnSeconds: number;
  actionVerb: string;
  inspectText: string;
}

export interface ResourcePlacement {
  id: string;
  area: AreaId;
  resourceId: string;
  x: number;
  z: number;
  name?: string;
}

export const resourceNodeDefs: Record<string, ResourceNodeDefinition> = {
  oak_tree: {
    id: 'oak_tree',
    name: 'Oak Tree',
    resourceType: 'tree',
    toolItemId: 'axe',
    skill: 'Lumberjacking',
    yieldItemId: 'logs',
    yieldRange: [5, 8],
    baseDuration: 2.05,
    respawnSeconds: 18,
    actionVerb: 'Chopping',
    inspectText: 'Broad hardwood. Requires an axe. Yields useful timber.'
  },
  pine_tree: {
    id: 'pine_tree',
    name: 'Pine Tree',
    resourceType: 'tree',
    toolItemId: 'axe',
    skill: 'Lumberjacking',
    yieldItemId: 'logs',
    yieldRange: [4, 7],
    baseDuration: 1.95,
    respawnSeconds: 18,
    actionVerb: 'Chopping',
    inspectText: 'Straight softwood. Requires an axe. Good for quick planks.'
  },
  birch_tree: {
    id: 'birch_tree',
    name: 'Birch Tree',
    resourceType: 'tree',
    toolItemId: 'axe',
    skill: 'Lumberjacking',
    yieldItemId: 'logs',
    yieldRange: [4, 6],
    baseDuration: 1.85,
    respawnSeconds: 16,
    actionVerb: 'Chopping',
    inspectText: 'Light timber. Requires an axe. Easier for novice cutters.'
  },
  iron_vein: {
    id: 'iron_vein',
    name: 'Iron Vein',
    resourceType: 'ore',
    toolItemId: 'pickaxe',
    skill: 'Mining',
    yieldItemId: 'iron_ore',
    yieldRange: [4, 8],
    baseDuration: 2.35,
    respawnSeconds: 24,
    actionVerb: 'Mining',
    inspectText: 'Dense metal seam. Requires a pickaxe. Can produce iron ore and stone.'
  },
  copper_vein: {
    id: 'copper_vein',
    name: 'Copper Vein',
    resourceType: 'ore',
    toolItemId: 'pickaxe',
    skill: 'Mining',
    yieldItemId: 'copper_ore',
    yieldRange: [4, 7],
    baseDuration: 2.15,
    respawnSeconds: 22,
    actionVerb: 'Mining',
    inspectText: 'Soft copper seam. Requires a pickaxe. Reliable novice ore.'
  },
  wild_herb: {
    id: 'wild_herb',
    name: 'Wild Herb Patch',
    resourceType: 'herb',
    toolItemId: 'scissors',
    skill: 'Alchemy',
    yieldItemId: 'ginseng',
    yieldRange: [2, 5],
    baseDuration: 1.55,
    respawnSeconds: 16,
    actionVerb: 'Foraging',
    inspectText: 'Useful roots and leaves. Requires scissors. Alchemists prize the fresher sprigs.'
  }
};

export const resourcePlacements: ResourcePlacement[] = [
  { id: 'res_tree_1', area: 'forest', resourceId: 'oak_tree', x: -3, z: 0 },
  { id: 'res_tree_2', area: 'forest', resourceId: 'pine_tree', x: -5, z: -2 },
  { id: 'res_tree_3', area: 'forest', resourceId: 'birch_tree', x: 2, z: 2 },
  { id: 'res_tree_4', area: 'forest', resourceId: 'pine_tree', x: -10, z: 7 },
  { id: 'res_tree_5', area: 'forest', resourceId: 'oak_tree', x: 11, z: 4 },
  { id: 'res_tree_6', area: 'forest', resourceId: 'birch_tree', x: -12, z: -5 },
  { id: 'res_iron_1', area: 'forest', resourceId: 'iron_vein', x: 5, z: -2 },
  { id: 'res_copper_1', area: 'forest', resourceId: 'copper_vein', x: -7, z: 3 },
  { id: 'res_iron_2', area: 'forest', resourceId: 'iron_vein', x: 8, z: -3 },
  { id: 'res_copper_2', area: 'forest', resourceId: 'copper_vein', x: 12, z: -7 },
  { id: 'res_herb_1', area: 'forest', resourceId: 'wild_herb', x: -8, z: 8, name: 'Ginseng Patch' },
  { id: 'res_herb_2', area: 'forest', resourceId: 'wild_herb', x: 3, z: 9, name: 'Medicinal Herbs' },
  { id: 'res_herb_3', area: 'forest', resourceId: 'wild_herb', x: 13, z: 1, name: 'Riverbank Herbs' }
];

export function resolveResourceDefinition(entity: Partial<ResourceNodeEntity>): ResourceNodeDefinition {
  if (entity.resourceId && resourceNodeDefs[entity.resourceId]) return resourceNodeDefs[entity.resourceId];
  const byYield = Object.values(resourceNodeDefs).find(
    (definition) => definition.resourceType === entity.resourceType && definition.yieldItemId === entity.yieldItemId
  );
  if (byYield) return byYield;
  if (entity.resourceType === 'ore') return resourceNodeDefs.iron_vein;
  return resourceNodeDefs.oak_tree;
}

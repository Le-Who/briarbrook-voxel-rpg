import type { AreaId } from '../game/types';

export type DensityPropKind =
  | 'grass_tuft'
  | 'flower'
  | 'stone_chip'
  | 'crate'
  | 'barrel'
  | 'sign_stake'
  | 'wood_plank'
  | 'rubble'
  | 'bone_chip'
  | 'mushroom'
  | 'ore_chip'
  | 'plot_stake';

export type DensityPropRole = 'landmark' | 'affordance' | 'path_readability' | 'camera_safe';

export interface AreaDensityArtKit {
  id: string;
  area: AreaId;
  label: string;
  builders: string[];
  sharedMaterialKeys: string[];
  instancingStrategy: string;
}

export interface DensityClearanceZone {
  area: AreaId;
  x: number;
  z: number;
  radius: number;
  reason: string;
}

export interface ProceduralDensityProp {
  id: string;
  area: AreaId;
  kitId: string;
  kind: DensityPropKind;
  x: number;
  z: number;
  rotation: number;
  materialVariant: string;
  roles: DensityPropRole[];
  blocksMovement: false;
  sharedBatch: true;
  cameraSafe: true;
}

export interface AreaDensitySummary {
  area: AreaId;
  totalProps: number;
  landmarkProps: number;
  affordanceProps: number;
  pathReadabilityProps: number;
  cameraSafeProps: number;
}

export const areaDensityArtKits: AreaDensityArtKit[] = [
  kit('town-stone-path', 'town', 'Town stone path chips and curb reads', ['cobblestonePathBuilder'], ['density-cobble-light', 'density-cobble-dark'], 'instanced chips batched by color'),
  kit('timber-house-walls', 'town', 'Timber house wall trims and window boxes', ['timberWallBuilder', 'timberHouseBuilder'], ['density-timber', 'density-plaster'], 'static house meshes batched after build'),
  kit('roof-variants', 'town', 'Warm roof variants and ridges', ['roofOverhangBuilder', 'timberHouseBuilder'], ['density-roof-a', 'density-roof-b'], 'static roof meshes batched with roof cutaway tags'),
  kit('market-props', 'town', 'Market crates, barrels, produce, and stall clutter', ['marketStallBuilder', 'crateBarrelStackBuilder'], ['density-crate-oak', 'density-barrel-dark'], 'instanced prop clusters plus batched kit groups'),
  kit('forest-vegetation', 'forest', 'Foliage, flowers, roots, stumps, and forage patches', ['treeBuilder', 'flowerBushBuilder', 'stumpBuilder'], ['density-leaf-a', 'density-leaf-b', 'density-flower'], 'instanced small foliage patches'),
  kit('mine-props', 'forest', 'Mine entrance props, ore chips, planks, and rail-side clutter', ['mineEntranceBuilder', 'oreVeinBuilder', 'rockBuilder'], ['density-ore-blue', 'density-ore-copper', 'density-plank'], 'instanced ore chips and planks around static mine kit'),
  kit('crypt-props', 'crypt', 'Crypt rubble, bones, cracks, candles, and sarcophagus debris', ['cryptWallBuilder', 'cryptFloorBuilder', 'rubbleBuilder', 'dungeonColumnBuilder'], ['density-rubble-cold', 'density-bone', 'density-crack'], 'instanced rubble/bone chips with static landmark kits'),
  kit('road-props', 'road', 'Road stones, ruts, signs, fences, and warning clutter', ['stoneWallBuilder', 'fenceBuilder', 'crateBarrelStackBuilder'], ['density-road-stone', 'density-road-wood'], 'instanced path markers outside combat lanes'),
  kit('housing-plot-props', 'housing', 'Plot stakes, flowers, crates, and boundary readability props', ['fenceBuilder', 'flowerBushBuilder', 'crateBarrelStackBuilder'], ['density-plot-stake', 'density-plot-flower', 'density-plot-crate'], 'instanced nonblocking plot edge props')
];

export const densityClearanceZones: DensityClearanceZone[] = [
  { area: 'town', x: 0, z: 0, radius: 4.25, reason: 'town fountain and NPC hub readability' },
  { area: 'road', x: 0, z: 0, radius: 4.5, reason: 'road combat lane and enemy silhouettes' },
  { area: 'forest', x: 7, z: -8, radius: 2.35, reason: 'mine entrance interaction prompt' },
  { area: 'forest', x: 5, z: -2, radius: 2.2, reason: 'ore and tree gathering affordance' },
  { area: 'crypt', x: 0, z: 0, radius: 3.65, reason: 'crypt combat target and loot readability' },
  { area: 'housing', x: 0, z: 0, radius: 5.75, reason: 'build ghost placement and grid readability' }
];

export const proceduralDensityProps: ProceduralDensityProp[] = [
  p('town', 'town-stone-path', 'stone_chip', -6.4, -1.6, ['path_readability'], 'cobble-light', 0.2),
  p('town', 'town-stone-path', 'stone_chip', 6.8, -1.2, ['path_readability'], 'cobble-dark', -0.3),
  p('town', 'town-stone-path', 'stone_chip', -2.8, 6.6, ['path_readability'], 'cobble-light', 0.5),
  p('town', 'town-stone-path', 'stone_chip', 3.2, 7.4, ['path_readability'], 'cobble-moss', -0.5),
  p('town', 'market-props', 'crate', 8.7, 5.8, ['affordance'], 'crate-oak', 0.25),
  p('town', 'market-props', 'barrel', -8.9, 5.9, ['affordance'], 'barrel-dark', -0.45),
  p('town', 'market-props', 'flower', -4.8, -8.8, ['camera_safe'], 'flower-red', 0.1),
  p('town', 'market-props', 'flower', 11.4, 9.4, ['camera_safe'], 'flower-blue', -0.15),
  p('town', 'market-props', 'sign_stake', 13.7, -2.8, ['landmark', 'path_readability'], 'sign-blue', 0.38),
  p('town', 'market-props', 'barrel', -16.8, -7.8, ['affordance'], 'barrel-warm', 0.6),
  p('town', 'timber-house-walls', 'flower', -13.6, 3.3, ['camera_safe'], 'flower-cream', -0.4),
  p('town', 'roof-variants', 'wood_plank', 18.8, 10.7, ['landmark'], 'plank-worn', 0.3),

  p('road', 'road-props', 'stone_chip', -5.6, -3.8, ['path_readability'], 'road-stone', 0.4),
  p('road', 'road-props', 'stone_chip', 5.8, -4.6, ['path_readability'], 'road-stone-dark', -0.22),
  p('road', 'road-props', 'sign_stake', -8.8, 3.9, ['landmark', 'path_readability'], 'sign-warning', 0.15),
  p('road', 'road-props', 'barrel', -10.6, 2.8, ['affordance'], 'barrel-dark', -0.35),
  p('road', 'road-props', 'crate', 9.6, 4.7, ['affordance'], 'crate-oak', 0.5),
  p('road', 'road-props', 'grass_tuft', -13.6, -1.8, ['camera_safe'], 'leaf-road', 0.2),
  p('road', 'road-props', 'grass_tuft', 12.8, -0.7, ['camera_safe'], 'leaf-road-dark', -0.25),
  p('road', 'road-props', 'wood_plank', -11.3, -6.8, ['landmark'], 'plank-worn', 0.7),
  p('road', 'road-props', 'stone_chip', 11.8, 8.6, ['path_readability'], 'road-stone-light', -0.45),
  p('road', 'road-props', 'flower', -14.8, 6.4, ['camera_safe'], 'flower-cream', 0.12),

  p('forest', 'forest-vegetation', 'grass_tuft', -12.8, 12.4, ['camera_safe'], 'leaf-a', 0.2),
  p('forest', 'forest-vegetation', 'grass_tuft', -9.7, -9.4, ['camera_safe'], 'leaf-b', -0.2),
  p('forest', 'forest-vegetation', 'flower', -8.7, 8.9, ['affordance'], 'flower-blue', 0.1),
  p('forest', 'forest-vegetation', 'flower', 3.2, 10.8, ['affordance'], 'flower-red', -0.1),
  p('forest', 'forest-vegetation', 'mushroom', -13.4, 5.8, ['landmark'], 'mushroom-red', 0.25),
  p('forest', 'forest-vegetation', 'stone_chip', 12.8, -10.4, ['path_readability'], 'forest-stone', -0.32),
  p('forest', 'mine-props', 'ore_chip', 10.4, -10.8, ['landmark'], 'ore-blue', 0.5),
  p('forest', 'mine-props', 'ore_chip', 3.4, -8.6, ['affordance'], 'ore-copper', -0.45),
  p('forest', 'mine-props', 'wood_plank', 4.2, -11.4, ['path_readability'], 'plank-worn', 0.55),
  p('forest', 'mine-props', 'wood_plank', 10.5, -6.2, ['path_readability'], 'plank-dark', -0.35),
  p('forest', 'forest-vegetation', 'grass_tuft', 14.2, 4.7, ['camera_safe'], 'leaf-a', 0.4),
  p('forest', 'forest-vegetation', 'stone_chip', -15.6, -2.5, ['path_readability'], 'forest-stone-dark', -0.18),

  p('crypt', 'crypt-props', 'rubble', -8.7, -8.2, ['landmark'], 'rubble-cold', 0.2),
  p('crypt', 'crypt-props', 'rubble', 9.4, -6.8, ['landmark'], 'rubble-dark', -0.2),
  p('crypt', 'crypt-props', 'bone_chip', -9.6, -2.4, ['affordance'], 'bone-ivory', 0.6),
  p('crypt', 'crypt-props', 'bone_chip', 7.2, 6.6, ['affordance'], 'bone-aged', -0.4),
  p('crypt', 'crypt-props', 'stone_chip', -4.8, 5.8, ['path_readability'], 'crypt-stone', 0.3),
  p('crypt', 'crypt-props', 'stone_chip', 4.9, -5.7, ['path_readability'], 'crypt-stone-dark', -0.3),
  p('crypt', 'crypt-props', 'rubble', -13.1, 7.6, ['camera_safe'], 'rubble-cold', 0.45),
  p('crypt', 'crypt-props', 'rubble', 12.8, -8.8, ['camera_safe'], 'rubble-dark', -0.55),
  p('crypt', 'crypt-props', 'bone_chip', 1.6, 8.4, ['path_readability'], 'bone-ivory', 0.12),
  p('crypt', 'crypt-props', 'stone_chip', -12.6, 1.4, ['path_readability'], 'crypt-stone', -0.16),

  p('housing', 'housing-plot-props', 'plot_stake', -6.6, -5.9, ['landmark', 'path_readability'], 'plot-stake', 0.2),
  p('housing', 'housing-plot-props', 'plot_stake', 6.7, -5.6, ['landmark', 'path_readability'], 'plot-stake-dark', -0.2),
  p('housing', 'housing-plot-props', 'plot_stake', -6.8, 5.8, ['path_readability'], 'plot-stake', 0.35),
  p('housing', 'housing-plot-props', 'plot_stake', 6.8, 5.7, ['path_readability'], 'plot-stake-dark', -0.35),
  p('housing', 'housing-plot-props', 'flower', -9.8, -3.5, ['camera_safe'], 'plot-flower-red', 0.18),
  p('housing', 'housing-plot-props', 'flower', 9.4, 2.8, ['camera_safe'], 'plot-flower-blue', -0.22),
  p('housing', 'housing-plot-props', 'crate', 8.4, -7.8, ['affordance'], 'plot-crate', 0.4),
  p('housing', 'housing-plot-props', 'barrel', -9.4, 5.8, ['affordance'], 'barrel-warm', -0.4),
  p('housing', 'housing-plot-props', 'stone_chip', -10.2, 1.9, ['camera_safe'], 'plot-stone', 0.12),
  p('housing', 'housing-plot-props', 'wood_plank', 10.6, -3.8, ['landmark'], 'plank-worn', -0.5),
  p('housing', 'housing-plot-props', 'grass_tuft', -12.6, 4.8, ['camera_safe'], 'leaf-a', 0.3),
  p('housing', 'housing-plot-props', 'flower', 12.4, 5.5, ['camera_safe'], 'plot-flower-cream', -0.12)
];

export function summarizeAreaDensity(area: AreaId): AreaDensitySummary {
  const props = proceduralDensityProps.filter((prop) => prop.area === area);
  return {
    area,
    totalProps: props.length,
    landmarkProps: props.filter((prop) => prop.roles.includes('landmark')).length,
    affordanceProps: props.filter((prop) => prop.roles.includes('affordance')).length,
    pathReadabilityProps: props.filter((prop) => prop.roles.includes('path_readability')).length,
    cameraSafeProps: props.filter((prop) => prop.cameraSafe).length
  };
}

function kit(id: string, area: AreaId, label: string, builders: string[], sharedMaterialKeys: string[], instancingStrategy: string): AreaDensityArtKit {
  return { id, area, label, builders, sharedMaterialKeys, instancingStrategy };
}

function p(
  area: AreaId,
  kitId: string,
  kind: DensityPropKind,
  x: number,
  z: number,
  roles: DensityPropRole[],
  materialVariant: string,
  rotation: number
): ProceduralDensityProp {
  return {
    id: `${area}-${kitId}-${kind}-${x.toFixed(1)}-${z.toFixed(1)}`,
    area,
    kitId,
    kind,
    x,
    z,
    rotation,
    materialVariant,
    roles: roles.includes('camera_safe') ? roles : [...roles, 'camera_safe'],
    blocksMovement: false,
    sharedBatch: true,
    cameraSafe: true
  };
}

import type { CharacterAttachPoint } from '../render/EquipmentVisuals';

export type VisualPrefabSourceTool = 'procedural' | 'blockbench' | 'magicavoxel';
export type VisualPrefabFallbackFactory = 'swordBox' | 'bowBox' | 'shieldRoundBox' | 'armorShellBox' | 'backpackBox' | 'axeBox' | 'pickaxeBox' | 'torchBox' | 'quiverBox' | 'bandageWrapBox' | 'ringBox';
export type VisualPrefabLodPolicy = 'single' | 'drop-small-details' | 'procedural-only';

export interface VisualPrefabDefinition {
  id: string;
  sourceTool: VisualPrefabSourceTool;
  sourcePath: string | null;
  runtimePath: string | null;
  fallbackProceduralFactory: VisualPrefabFallbackFactory;
  attachPointDefaults: CharacterAttachPoint[];
  scale: number;
  rotationOffset: { x: number; y: number; z: number };
  iconCameraPreset: 'equipment-3q' | 'flat-orthographic' | 'tall-tool' | 'paperdoll-front';
  materialOverrides: string[];
  lodPolicy: VisualPrefabLodPolicy;
  maxRuntimeBytes: number;
}

export const visualPrefabs: VisualPrefabDefinition[] = [
  {
    id: 'weapon:sword',
    sourceTool: 'blockbench',
    sourcePath: 'assets/source/blockbench/iron_sword.bbmodel',
    runtimePath: null,
    fallbackProceduralFactory: 'swordBox',
    attachPointDefaults: ['rightHand', 'back'],
    scale: 1,
    rotationOffset: { x: 0, y: 0, z: -0.62 },
    iconCameraPreset: 'tall-tool',
    materialOverrides: ['metal', 'hilt'],
    lodPolicy: 'drop-small-details',
    maxRuntimeBytes: 90000
  },
  {
    id: 'weapon:bow',
    sourceTool: 'blockbench',
    sourcePath: 'assets/source/blockbench/simple_bow.bbmodel',
    runtimePath: null,
    fallbackProceduralFactory: 'bowBox',
    attachPointDefaults: ['rightHand', 'back'],
    scale: 1,
    rotationOffset: { x: 0.15, y: 0, z: -0.15 },
    iconCameraPreset: 'tall-tool',
    materialOverrides: ['wood', 'string'],
    lodPolicy: 'drop-small-details',
    maxRuntimeBytes: 110000
  },
  {
    id: 'shield:round',
    sourceTool: 'blockbench',
    sourcePath: 'assets/source/blockbench/cracked_shield.bbmodel',
    runtimePath: null,
    fallbackProceduralFactory: 'ringBox',
    attachPointDefaults: ['shieldArm'],
    scale: 1,
    rotationOffset: { x: 0, y: 0.18, z: 0 },
    iconCameraPreset: 'equipment-3q',
    materialOverrides: ['rim', 'face'],
    lodPolicy: 'single',
    maxRuntimeBytes: 90000
  },
  {
    id: 'armor:leather',
    sourceTool: 'blockbench',
    sourcePath: 'assets/source/blockbench/leather_armor.bbmodel',
    runtimePath: null,
    fallbackProceduralFactory: 'armorShellBox',
    attachPointDefaults: ['torso'],
    scale: 1,
    rotationOffset: { x: 0, y: 0, z: 0 },
    iconCameraPreset: 'paperdoll-front',
    materialOverrides: ['leather', 'trim'],
    lodPolicy: 'single',
    maxRuntimeBytes: 120000
  },
  {
    id: 'pack:backpack',
    sourceTool: 'blockbench',
    sourcePath: 'assets/source/blockbench/backpack.bbmodel',
    runtimePath: null,
    fallbackProceduralFactory: 'backpackBox',
    attachPointDefaults: ['back'],
    scale: 1,
    rotationOffset: { x: 0, y: 0, z: 0 },
    iconCameraPreset: 'equipment-3q',
    materialOverrides: ['leather', 'strap'],
    lodPolicy: 'single',
    maxRuntimeBytes: 80000
  },
  {
    id: 'armor:robe',
    sourceTool: 'procedural',
    sourcePath: null,
    runtimePath: null,
    fallbackProceduralFactory: 'armorShellBox',
    attachPointDefaults: ['torso'],
    scale: 1,
    rotationOffset: { x: 0, y: 0, z: 0 },
    iconCameraPreset: 'paperdoll-front',
    materialOverrides: ['cloth', 'trim'],
    lodPolicy: 'procedural-only',
    maxRuntimeBytes: 80000
  },
  {
    id: 'armor:iron',
    sourceTool: 'procedural',
    sourcePath: null,
    runtimePath: null,
    fallbackProceduralFactory: 'armorShellBox',
    attachPointDefaults: ['torso'],
    scale: 1,
    rotationOffset: { x: 0, y: 0, z: 0 },
    iconCameraPreset: 'paperdoll-front',
    materialOverrides: ['metal', 'trim'],
    lodPolicy: 'procedural-only',
    maxRuntimeBytes: 120000
  },
  {
    id: 'armor:helmet',
    sourceTool: 'procedural',
    sourcePath: null,
    runtimePath: null,
    fallbackProceduralFactory: 'armorShellBox',
    attachPointDefaults: ['head'],
    scale: 1,
    rotationOffset: { x: 0, y: 0, z: 0 },
    iconCameraPreset: 'equipment-3q',
    materialOverrides: ['metal'],
    lodPolicy: 'procedural-only',
    maxRuntimeBytes: 60000
  },
  {
    id: 'armor:boots',
    sourceTool: 'procedural',
    sourcePath: null,
    runtimePath: null,
    fallbackProceduralFactory: 'armorShellBox',
    attachPointDefaults: ['feet'],
    scale: 1,
    rotationOffset: { x: 0, y: 0, z: 0 },
    iconCameraPreset: 'equipment-3q',
    materialOverrides: ['metal', 'leather'],
    lodPolicy: 'procedural-only',
    maxRuntimeBytes: 60000
  },
  {
    id: 'trinket:ring',
    sourceTool: 'procedural',
    sourcePath: null,
    runtimePath: null,
    fallbackProceduralFactory: 'shieldRoundBox',
    attachPointDefaults: ['belt'],
    scale: 1,
    rotationOffset: { x: 0, y: 0, z: 0 },
    iconCameraPreset: 'equipment-3q',
    materialOverrides: ['metal', 'gem'],
    lodPolicy: 'procedural-only',
    maxRuntimeBytes: 30000
  },
  {
    id: 'tool:axe',
    sourceTool: 'procedural',
    sourcePath: null,
    runtimePath: null,
    fallbackProceduralFactory: 'axeBox',
    attachPointDefaults: ['rightHand', 'back'],
    scale: 1,
    rotationOffset: { x: 0.18, y: 0, z: -0.78 },
    iconCameraPreset: 'tall-tool',
    materialOverrides: ['metal', 'wood'],
    lodPolicy: 'procedural-only',
    maxRuntimeBytes: 60000
  },
  {
    id: 'tool:pickaxe',
    sourceTool: 'procedural',
    sourcePath: null,
    runtimePath: null,
    fallbackProceduralFactory: 'pickaxeBox',
    attachPointDefaults: ['rightHand', 'back'],
    scale: 1,
    rotationOffset: { x: 0.18, y: 0, z: -0.78 },
    iconCameraPreset: 'tall-tool',
    materialOverrides: ['metal', 'wood'],
    lodPolicy: 'procedural-only',
    maxRuntimeBytes: 60000
  },
  {
    id: 'tool:torch',
    sourceTool: 'magicavoxel',
    sourcePath: null,
    runtimePath: null,
    fallbackProceduralFactory: 'torchBox',
    attachPointDefaults: ['rightHand', 'belt'],
    scale: 1,
    rotationOffset: { x: 0, y: 0, z: -0.2 },
    iconCameraPreset: 'tall-tool',
    materialOverrides: ['wood', 'flame'],
    lodPolicy: 'procedural-only',
    maxRuntimeBytes: 60000
  },
  {
    id: 'ammo:quiver',
    sourceTool: 'procedural',
    sourcePath: null,
    runtimePath: null,
    fallbackProceduralFactory: 'quiverBox',
    attachPointDefaults: ['quiver'],
    scale: 1,
    rotationOffset: { x: 0.35, y: 0, z: -0.2 },
    iconCameraPreset: 'equipment-3q',
    materialOverrides: ['leather', 'arrow'],
    lodPolicy: 'procedural-only',
    maxRuntimeBytes: 60000
  },
  {
    id: 'tool:bandage-wrap',
    sourceTool: 'procedural',
    sourcePath: null,
    runtimePath: null,
    fallbackProceduralFactory: 'bandageWrapBox',
    attachPointDefaults: ['leftHand'],
    scale: 1,
    rotationOffset: { x: 0, y: 0, z: 0 },
    iconCameraPreset: 'flat-orthographic',
    materialOverrides: ['cloth'],
    lodPolicy: 'procedural-only',
    maxRuntimeBytes: 30000
  }
];

export const visualPrefabById: Record<string, VisualPrefabDefinition> = Object.fromEntries(
  visualPrefabs.map((prefab) => [prefab.id, prefab])
);

import type { AreaId, Vec3 } from '../game/types';

export interface DevScenePreset {
  id: string;
  label: string;
  area: AreaId;
  position: Vec3;
  description: string;
}

const scenes: DevScenePreset[] = [
  { id: 'combat_arena', label: 'Combat Arena', area: 'road', position: { x: 1, y: 0, z: -2 }, description: 'Road bandit encounter with room to test telegraphs and weapon cadence.' },
  { id: 'resource_grove', label: 'Resource Grove', area: 'forest', position: { x: 5, y: 0, z: -2 }, description: 'Trees, ore, herbs, and resource pressure checks in one jump.' },
  { id: 'crafting_lab', label: 'Crafting Lab', area: 'blacksmith', position: { x: -1, y: 0, z: 3 }, description: 'Forge and inventory test point for recipes, repairs, and work orders.' },
  { id: 'spell_lab', label: 'Spell Lab', area: 'crypt', position: { x: -5, y: 0, z: 3 }, description: 'Hostile targets and dungeon lighting for spell targeting and utility magic.' },
  { id: 'building_sandbox', label: 'Building Sandbox', area: 'housing', position: { x: -4, y: 0, z: 2 }, description: 'Housing plot with build mode enabled for long-term placement checks.' },
  { id: 'pathfinding_test', label: 'Pathfinding Test', area: 'town', position: { x: 2, y: 0, z: 0 }, description: 'Dense town geometry for click-to-move, portals, and NPC collision checks.' }
];

export function createDevScenePresets(): DevScenePreset[] {
  return scenes.map((scene) => ({ ...scene, position: { ...scene.position } }));
}

export function findDevScenePreset(id: string): DevScenePreset | undefined {
  return scenes.find((scene) => scene.id === id);
}

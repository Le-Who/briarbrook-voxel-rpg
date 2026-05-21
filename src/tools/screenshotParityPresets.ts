import type { AreaId, GameState, Vec3, WorldPhase } from '../game/types';

export interface ScreenshotParityPreset {
  id: string;
  referenceId: string;
  label: string;
  area: AreaId;
  playerPosition: Vec3;
  timePhase: WorldPhase;
  camera: {
    zoom: number;
    offset: Vec3;
    focus?: Vec3;
  };
  openPanels: string[];
  minimapMode?: GameState['ui']['minimapMode'];
  chatMode?: GameState['ui']['chatMode'];
  selectedTargetId?: string;
  selectedRecipeId?: string;
  selectedBuildPieceId?: string;
  selectedBuildCategory?: GameState['ui']['selectedBuildCategory'];
  skillView?: GameState['ui']['skillView'];
  skillsViewMode?: GameState['ui']['skillsViewMode'];
  secretFocusEntityId?: string;
}

const screenshotParityPresets: ScreenshotParityPreset[] = [
  preset('r1-town-square', 'R1', 'Briarbrook Town Square', 'town', { x: 0, y: 0, z: 2 }, 'day', ['inventory', 'status'], { zoom: 18.5, offset: { x: 9.2, y: 10.4, z: 9.2 } }),
  preset('r2-road-combat', 'R2', 'Old River Road Combat', 'road', { x: 0, y: 0, z: -1 }, 'dusk', [], { zoom: 17, offset: { x: 8.8, y: 10.0, z: 8.8 } }, { selectedTargetId: 'enemy_bandit_1' }),
  preset('r3-crypt-combat', 'R3', 'Forgotten Crypt Combat', 'crypt', { x: -2, y: 0, z: 1 }, 'day', ['inventory', 'spellbook'], { zoom: 15.2, offset: { x: 7.3, y: 8.7, z: 7.3 } }, { selectedTargetId: 'enemy_skel_1' }),
  preset('r3-crypt-secret', 'R3S', 'Forgotten Crypt Secret', 'crypt', { x: -4, y: 0, z: 2 }, 'dusk', [], { zoom: 11.2, offset: { x: 9.2, y: 10.4, z: 9.2 }, focus: { x: -2.8, y: 0, z: 1.8 } }, { secretFocusEntityId: 'chest_crypt_warded' }),
  preset('r4-forest-gathering', 'R4', 'Greymont Forest Gathering', 'forest', { x: 9.8, y: 0, z: 2.8 }, 'day', ['inventory'], { zoom: 16.8, offset: { x: 8.6, y: 10.2, z: 8.6 } }),
  preset('r5-smithy-crafting', 'R5', 'Broms Smithy Crafting', 'blacksmith', { x: -1, y: 0, z: 2.5 }, 'day', ['inventory', 'crafting'], { zoom: 14.2, offset: { x: 6.7, y: 8.2, z: 6.7 } }, { selectedRecipeId: 'iron_armor' }),
  preset('r6-bank-storage', 'R6', 'Briarbrook Bank Storage', 'bank', { x: 0, y: 0, z: 2.8 }, 'day', ['inventory', 'bank'], { zoom: 14.2, offset: { x: 6.7, y: 8.2, z: 6.7 } }),
  preset('r7-housing-build', 'R7', 'Player Plot Build Mode', 'housing', { x: -3, y: 0, z: 1 }, 'day', ['inventory', 'build'], { zoom: 17.2, offset: { x: 8.6, y: 10.2, z: 8.6 } }, { selectedBuildPieceId: 'small_chest', selectedBuildCategory: 'Storage' }),
  preset('r8-profession-atlas', 'R8', 'Profession Atlas', 'town', { x: 0, y: 0, z: 2 }, 'day', ['skills'], { zoom: 18.5, offset: { x: 9.2, y: 10.4, z: 9.2 } }, { skillView: 'atlas', skillsViewMode: 'atlas' }),
  preset('r9-adventure-map', 'R9', 'Adventure Map', 'forest', { x: 0, y: 0, z: 4 }, 'day', ['map', 'inventory', 'status', 'quest'], { zoom: 18, offset: { x: 9.1, y: 10.3, z: 9.1 } }, { minimapMode: 'expanded' })
];

export function createScreenshotParityPresets(): ScreenshotParityPreset[] {
  return screenshotParityPresets.map((preset) => ({
    ...preset,
    playerPosition: { ...preset.playerPosition },
    camera: {
      zoom: preset.camera.zoom,
      offset: { ...preset.camera.offset },
      focus: preset.camera.focus ? { ...preset.camera.focus } : undefined
    },
    openPanels: [...preset.openPanels]
  }));
}

export function findScreenshotParityPreset(id: string): ScreenshotParityPreset | undefined {
  return screenshotParityPresets.find((preset) => preset.id === id);
}

function preset(
  id: string,
  referenceId: string,
  label: string,
  area: AreaId,
  playerPosition: Vec3,
  timePhase: WorldPhase,
  openPanels: string[],
  camera: ScreenshotParityPreset['camera'],
  extras: Partial<ScreenshotParityPreset> = {}
): ScreenshotParityPreset {
  return { id, referenceId, label, area, playerPosition, timePhase, openPanels, camera, ...extras };
}

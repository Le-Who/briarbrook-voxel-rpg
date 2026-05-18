import { itemDefs } from '../data/items';
import { visualPrefabById } from '../data/visualPrefabs';

export interface IconRenderRequest {
  itemId: string;
  visualPrefabId: string;
  cameraPreset: string;
  transparentBackground: true;
  materialOverlays: string[];
  rarityOverlay: 'separate-layer';
  fallbackIconShape: string;
}

export function createIconRenderRequest(itemId: string): IconRenderRequest | null {
  const item = itemDefs[itemId];
  const visualPrefabId = item?.visualPrefabId;
  const prefab = visualPrefabId ? visualPrefabById[visualPrefabId] : null;
  if (!item || !visualPrefabId || !prefab) return null;
  return {
    itemId,
    visualPrefabId,
    cameraPreset: prefab.iconCameraPreset,
    transparentBackground: true,
    materialOverlays: prefab.materialOverrides,
    rarityOverlay: 'separate-layer',
    fallbackIconShape: item.icon.shape
  };
}

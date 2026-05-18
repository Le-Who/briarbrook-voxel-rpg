import { itemDefs } from '../data/items';
import type { EquipmentSlot, GameState, ItemDef, ItemStack, Vec3 } from '../game/types';

export type CharacterAttachPoint = 'head' | 'torso' | 'back' | 'rightHand' | 'leftHand' | 'belt' | 'feet' | 'quiver' | 'shieldArm';
export type EquipmentVisualSlot = EquipmentSlot | 'quiver' | 'effect' | 'action';
export type EquipmentHeldPose = 'idle' | 'slash' | 'bowDraw' | 'toolSwing' | 'cast' | 'wrap' | 'block' | 'holstered';
export type EquipmentActionVisual = 'weapon-swing' | 'bow-draw' | 'spell-windup' | 'tool-swing' | 'bandage-wrap' | 'shield-block' | 'broken-spark' | 'reagent-particles';

export interface EquipmentVisualOffset {
  x: number;
  y: number;
  z: number;
}

export interface EquipmentVisualContract {
  itemId?: string;
  equipmentSlot: EquipmentVisualSlot;
  visualPrefabId: string;
  attachPoint: CharacterAttachPoint;
  heldPose: EquipmentHeldPose;
  holsteredAttachPoint?: CharacterAttachPoint;
  scale: number;
  rotation: EquipmentVisualOffset;
  offset: EquipmentVisualOffset;
  color: string;
  materialVariant: 'cloth' | 'leather' | 'wood' | 'iron' | 'magic' | 'fire';
  showOnPaperdoll: boolean;
  showInWorld: boolean;
  paperdollClass: string;
  label: string;
  actionVisual?: EquipmentActionVisual;
}

export const characterAttachPoints: Record<CharacterAttachPoint, Vec3> = {
  head: { x: 0, y: 1.22, z: -0.02 },
  torso: { x: 0, y: 0.48, z: -0.03 },
  back: { x: 0, y: 0.56, z: 0.26 },
  rightHand: { x: 0.44, y: 0.38, z: -0.12 },
  leftHand: { x: -0.44, y: 0.38, z: -0.1 },
  belt: { x: 0.22, y: 0.16, z: -0.22 },
  feet: { x: 0, y: -0.28, z: -0.02 },
  quiver: { x: -0.23, y: 0.64, z: 0.32 },
  shieldArm: { x: -0.44, y: 0.42, z: -0.04 }
};

const zeroOffset: EquipmentVisualOffset = { x: 0, y: 0, z: 0 };

export function resolveEquipmentVisuals(state: GameState): EquipmentVisualContract[] {
  const visuals: EquipmentVisualContract[] = [];
  const activeToolId = activeToolVisualItemId(state);
  const equipment = state.player.equipment;

  addEquipmentVisual(visuals, equipment.armor, 'armor');
  addEquipmentVisual(visuals, equipment.helmet, 'helmet');
  addEquipmentVisual(visuals, equipment.boots, 'boots');
  addEquipmentVisual(visuals, equipment.backpack, 'backpack');
  addEquipmentVisual(visuals, equipment.accessory, 'accessory');

  if (equipment.weapon) {
    const weaponVisual = equipmentVisualForItem(equipment.weapon.itemId, 'weapon');
    if (weaponVisual) {
      if (activeToolId && activeToolId !== equipment.weapon.itemId) {
        visuals.push({
          ...weaponVisual,
          attachPoint: 'back',
          heldPose: 'holstered',
          holsteredAttachPoint: 'rightHand',
          offset: { x: 0.12, y: 0.04, z: 0.02 },
          rotation: { x: 0.65, y: 0, z: -0.72 },
          actionVisual: undefined
        });
      } else {
        visuals.push(weaponVisual);
      }
    }
  }

  if (activeToolId) {
    const activeTool = equipmentVisualForItem(activeToolId, 'action', activeToolId === 'torch' ? 'fire' : 'wood');
    if (activeTool) {
      visuals.push({
        ...activeTool,
        attachPoint: 'rightHand',
        heldPose: activeToolId === 'torch' ? 'idle' : 'toolSwing',
        actionVisual: activeToolId === 'torch' ? undefined : 'tool-swing',
        showOnPaperdoll: false,
        paperdollClass: `${activeTool.paperdollClass} active-tool`
      });
    }
  }

  addEquipmentVisual(visuals, equipment.shield, 'shield');

  const weapon = equipment.weapon ? itemDefs[equipment.weapon.itemId] : null;
  if (weapon?.requiredAmmo && countInventoryItem(state, weapon.requiredAmmo) > 0) {
    const ammoDef = itemDefs[weapon.requiredAmmo];
    visuals.push(createVisual({
      itemId: weapon.requiredAmmo,
      equipmentSlot: 'quiver',
      visualPrefabId: 'ammo:quiver',
      attachPoint: 'quiver',
      heldPose: 'idle',
      color: ammoDef?.icon.secondary ?? '#d9bf77',
      materialVariant: 'leather',
      paperdollClass: 'ammo-quiver',
      label: ammoDef?.name ?? 'Ammunition',
      offset: { x: 0, y: 0, z: 0 },
      rotation: { x: 0.35, y: 0, z: -0.2 }
    }));
  }

  if (state.spellCasting) {
    visuals.push(createVisual({
      equipmentSlot: 'effect',
      visualPrefabId: 'effect:spell-hand-glow',
      attachPoint: 'rightHand',
      heldPose: 'cast',
      color: '#6fd4ff',
      materialVariant: 'magic',
      paperdollClass: 'effect-spell-hand-glow',
      label: 'Spell wind-up',
      actionVisual: 'spell-windup',
      showOnPaperdoll: false,
      offset: { x: 0.02, y: 0.14, z: -0.08 }
    }));
    visuals.push(createVisual({
      equipmentSlot: 'effect',
      visualPrefabId: 'effect:reagent-particles',
      attachPoint: 'belt',
      heldPose: 'cast',
      color: '#b66dff',
      materialVariant: 'magic',
      paperdollClass: 'effect-reagent-particles',
      label: 'Reagent particles',
      actionVisual: 'reagent-particles',
      showOnPaperdoll: false,
      showInWorld: true
    }));
  }

  if (state.bandage) {
    visuals.push(createVisual({
      itemId: 'bandage',
      equipmentSlot: 'action',
      visualPrefabId: 'tool:bandage-wrap',
      attachPoint: 'leftHand',
      heldPose: 'wrap',
      color: '#f1eee0',
      materialVariant: 'cloth',
      paperdollClass: 'tool-bandage-wrap',
      label: 'Bandage wrap',
      actionVisual: 'bandage-wrap',
      showOnPaperdoll: false,
      offset: { x: 0.02, y: 0.04, z: -0.02 }
    }));
  }

  if (equipment.shield && state.player.actionState.kind === 'attacking') {
    visuals.push(createVisual({
      itemId: equipment.shield.itemId,
      equipmentSlot: 'effect',
      visualPrefabId: 'effect:shield-block',
      attachPoint: 'shieldArm',
      heldPose: 'block',
      color: '#f0c957',
      materialVariant: 'magic',
      paperdollClass: 'effect-shield-block',
      label: 'Shield block read',
      actionVisual: 'shield-block',
      showOnPaperdoll: false
    }));
  }

  Object.values(equipment).forEach((stack) => {
    if (!stack?.maxDurability || (stack.durability ?? stack.maxDurability) > 0) return;
    const visual = equipmentVisualForItem(stack.itemId, 'effect');
    if (!visual) return;
    visuals.push({
      ...visual,
      visualPrefabId: 'effect:broken-spark',
      attachPoint: visual.attachPoint,
      heldPose: 'idle',
      color: '#ff8f7f',
      materialVariant: 'magic',
      paperdollClass: 'effect-broken-spark',
      label: 'Broken item warning',
      actionVisual: 'broken-spark',
      showOnPaperdoll: false
    });
  });

  return visuals;
}

export function equipmentVisualForItem(itemId: string, slotOverride?: EquipmentVisualSlot, variantOverride?: EquipmentVisualContract['materialVariant']): EquipmentVisualContract | null {
  const def = itemDefs[itemId];
  if (!def) return null;
  const slot = slotOverride ?? def.equipmentSlot ?? 'action';
  const visual = visualDefinitionForItem(def, slot);
  return createVisual({
    ...visual,
    itemId,
    equipmentSlot: slot,
    label: def.name,
    color: def.icon.primary,
    materialVariant: variantOverride ?? visual.materialVariant
  });
}

function addEquipmentVisual(visuals: EquipmentVisualContract[], stack: ItemStack | undefined, slot: EquipmentVisualSlot): void {
  if (!stack) return;
  const visual = equipmentVisualForItem(stack.itemId, slot);
  if (visual) visuals.push(visual);
}

function activeToolVisualItemId(state: GameState): string | null {
  if (state.gathering) {
    const entity = state.entities[state.gathering.entityId];
    if (entity?.kind === 'resource') return entity.toolItemId;
  }
  if (state.ui.targeting?.mode === 'tool' && state.ui.targeting.toolItemId) return state.ui.targeting.toolItemId;
  const binding = state.ui.hotbar[state.ui.activeHotbarSlot];
  if (binding?.kind === 'item' && binding.id === 'torch') return 'torch';
  return null;
}

function countInventoryItem(state: GameState, itemId: string): number {
  return state.player.inventory.slots.reduce((total, stack) => total + (stack?.itemId === itemId ? stack.quantity : 0), 0);
}

function visualDefinitionForItem(def: ItemDef, slot: EquipmentVisualSlot): Omit<EquipmentVisualContract, 'itemId' | 'equipmentSlot' | 'label' | 'color'> {
  if (def.weaponClass === 'bow' || def.weaponClass === 'crossbow') {
    return {
      visualPrefabId: 'weapon:bow',
      attachPoint: 'rightHand',
      heldPose: 'bowDraw',
      holsteredAttachPoint: 'back',
      scale: 1,
      rotation: { x: 0.15, y: 0, z: -0.15 },
      offset: { x: 0.04, y: 0.04, z: -0.04 },
      materialVariant: 'wood',
      showOnPaperdoll: true,
      showInWorld: true,
      paperdollClass: 'weapon-bow',
      actionVisual: 'bow-draw'
    };
  }
  if (def.weaponClass === 'staff') {
    return weaponDefinition('weapon:staff', 'weapon-staff', 'cast', 'magic', 'spell-windup');
  }
  if (def.weaponClass === 'axe' || def.icon.shape === 'axe') {
    return toolDefinition('tool:axe', 'tool-axe');
  }
  if (def.icon.shape === 'pickaxe') {
    return toolDefinition('tool:pickaxe', 'tool-pickaxe');
  }
  if (def.id === 'torch' || def.icon.shape === 'torch') {
    return {
      visualPrefabId: 'tool:torch',
      attachPoint: 'rightHand',
      heldPose: 'idle',
      holsteredAttachPoint: 'belt',
      scale: 1,
      rotation: { x: 0, y: 0, z: -0.2 },
      offset: { x: 0.01, y: 0.06, z: -0.02 },
      materialVariant: 'fire',
      showOnPaperdoll: slot !== 'action',
      showInWorld: true,
      paperdollClass: 'tool-torch'
    };
  }
  if (slot === 'shield' || def.equipmentSlot === 'shield' || def.icon.shape === 'shield') {
    return {
      visualPrefabId: 'shield:round',
      attachPoint: 'shieldArm',
      heldPose: 'block',
      scale: 1,
      rotation: { x: 0, y: 0.18, z: 0 },
      offset: zeroOffset,
      materialVariant: 'iron',
      showOnPaperdoll: true,
      showInWorld: true,
      paperdollClass: 'shield-round',
      actionVisual: 'shield-block'
    };
  }
  if (slot === 'armor' || def.equipmentSlot === 'armor') {
    const robe = def.id.includes('robe');
    const iron = def.id.includes('iron');
    return {
      visualPrefabId: robe ? 'armor:robe' : iron ? 'armor:iron' : 'armor:leather',
      attachPoint: 'torso',
      heldPose: 'idle',
      scale: 1,
      rotation: zeroOffset,
      offset: { x: 0, y: 0.02, z: -0.04 },
      materialVariant: robe ? 'cloth' : iron ? 'iron' : 'leather',
      showOnPaperdoll: true,
      showInWorld: true,
      paperdollClass: robe ? 'armor-robe' : iron ? 'armor-iron' : 'armor-leather'
    };
  }
  if (slot === 'helmet' || def.equipmentSlot === 'helmet') {
    return armorAttachment('armor:helmet', 'armor-helmet', 'head', 'iron');
  }
  if (slot === 'boots' || def.equipmentSlot === 'boots') {
    return armorAttachment('armor:boots', 'armor-boots', 'feet', 'leather');
  }
  if (slot === 'backpack' || def.equipmentSlot === 'backpack') {
    return armorAttachment('pack:backpack', 'pack-backpack', 'back', 'leather');
  }
  if (slot === 'accessory' || def.equipmentSlot === 'accessory') {
    return armorAttachment('trinket:ring', 'trinket-ring', 'belt', 'iron');
  }
  return weaponDefinition('weapon:sword', 'weapon-sword', 'slash', 'iron', 'weapon-swing');
}

function weaponDefinition(
  visualPrefabId: string,
  paperdollClass: string,
  heldPose: EquipmentHeldPose,
  materialVariant: EquipmentVisualContract['materialVariant'],
  actionVisual?: EquipmentActionVisual
): Omit<EquipmentVisualContract, 'itemId' | 'equipmentSlot' | 'label' | 'color'> {
  return {
    visualPrefabId,
    attachPoint: 'rightHand',
    heldPose,
    holsteredAttachPoint: 'back',
    scale: 1,
    rotation: { x: 0, y: 0, z: -0.62 },
    offset: { x: 0.04, y: 0.06, z: -0.04 },
    materialVariant,
    showOnPaperdoll: true,
    showInWorld: true,
    paperdollClass,
    actionVisual
  };
}

function toolDefinition(visualPrefabId: string, paperdollClass: string): Omit<EquipmentVisualContract, 'itemId' | 'equipmentSlot' | 'label' | 'color'> {
  return {
    visualPrefabId,
    attachPoint: 'rightHand',
    heldPose: 'toolSwing',
    holsteredAttachPoint: 'back',
    scale: 1,
    rotation: { x: 0.18, y: 0, z: -0.78 },
    offset: { x: 0.02, y: 0.05, z: -0.04 },
    materialVariant: 'wood',
    showOnPaperdoll: false,
    showInWorld: true,
    paperdollClass,
    actionVisual: 'tool-swing'
  };
}

function armorAttachment(
  visualPrefabId: string,
  paperdollClass: string,
  attachPoint: CharacterAttachPoint,
  materialVariant: EquipmentVisualContract['materialVariant']
): Omit<EquipmentVisualContract, 'itemId' | 'equipmentSlot' | 'label' | 'color'> {
  return {
    visualPrefabId,
    attachPoint,
    heldPose: 'idle',
    scale: 1,
    rotation: zeroOffset,
    offset: zeroOffset,
    materialVariant,
    showOnPaperdoll: true,
    showInWorld: true,
    paperdollClass
  };
}

function createVisual(args: Partial<EquipmentVisualContract> & Pick<EquipmentVisualContract, 'equipmentSlot' | 'visualPrefabId' | 'attachPoint' | 'heldPose' | 'color' | 'materialVariant' | 'paperdollClass' | 'label'>): EquipmentVisualContract {
  return {
    scale: 1,
    rotation: zeroOffset,
    offset: zeroOffset,
    showOnPaperdoll: true,
    showInWorld: true,
    ...args
  };
}

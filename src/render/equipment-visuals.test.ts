import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { CharacterPanel } from '../ui/CharacterPanel';
import { resolveEquipmentVisuals } from './EquipmentVisuals';

describe('equipment visual contract', () => {
  it('maps equipped gear to stable paperdoll and world attach points', () => {
    const state = createInitialGameState();
    const visuals = resolveEquipmentVisuals(state);

    expect(visuals).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: 'iron_sword', equipmentSlot: 'weapon', attachPoint: 'rightHand', visualPrefabId: 'weapon:sword', showInWorld: true, showOnPaperdoll: true }),
      expect.objectContaining({ itemId: 'cracked_shield', equipmentSlot: 'shield', attachPoint: 'shieldArm', visualPrefabId: 'shield:round', showInWorld: true, showOnPaperdoll: true }),
      expect.objectContaining({ itemId: 'leather_armor', equipmentSlot: 'armor', attachPoint: 'torso', visualPrefabId: 'armor:leather', showInWorld: true, showOnPaperdoll: true }),
      expect.objectContaining({ itemId: 'backpack', equipmentSlot: 'backpack', attachPoint: 'back', visualPrefabId: 'pack:backpack', showInWorld: true, showOnPaperdoll: true })
    ]));
  });

  it('moves gathering tools into the hand and holsters the equipped weapon', () => {
    const state = createInitialGameState();
    const tree = Object.values(state.entities).find((entity) => entity.kind === 'resource' && entity.toolItemId === 'axe');
    if (!tree || tree.kind !== 'resource') throw new Error('starter tree resource missing');
    state.gathering = { entityId: tree.id, actionLabel: 'Chop tree', startedAt: 1, duration: 2, remaining: 1 };
    state.player.actionState.kind = 'gathering';

    const visuals = resolveEquipmentVisuals(state);

    expect(visuals).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: 'axe', attachPoint: 'rightHand', visualPrefabId: 'tool:axe', heldPose: 'toolSwing', actionVisual: 'tool-swing' }),
      expect.objectContaining({ itemId: 'iron_sword', attachPoint: 'back', heldPose: 'holstered' })
    ]));
  });

  it('shows ranged and action-specific readable attachments', () => {
    const state = createInitialGameState();
    state.player.equipment.weapon = state.player.inventory.slots.find((stack) => stack?.itemId === 'simple_bow') ?? undefined;
    state.spellCasting = { id: 'cast-test', spellId: 'magic_arrow', target: { kind: 'self' }, remaining: 0.5, total: 1 };
    state.bandage = { target: { kind: 'self' }, startedAt: 1, duration: 4, remaining: 2, interrupted: false };

    const visuals = resolveEquipmentVisuals(state);

    expect(visuals).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: 'simple_bow', attachPoint: 'rightHand', visualPrefabId: 'weapon:bow', heldPose: 'bowDraw', actionVisual: 'bow-draw' }),
      expect.objectContaining({ itemId: 'arrow', attachPoint: 'quiver', visualPrefabId: 'ammo:quiver' }),
      expect.objectContaining({ visualPrefabId: 'effect:spell-hand-glow', attachPoint: 'rightHand', actionVisual: 'spell-windup' }),
      expect.objectContaining({ itemId: 'bandage', visualPrefabId: 'tool:bandage-wrap', attachPoint: 'leftHand', actionVisual: 'bandage-wrap' })
    ]));
  });

  it('renders paperdoll gear silhouettes from the same visual vocabulary', () => {
    const state = createInitialGameState();
    state.ui.panels.character = true;

    const html = CharacterPanel(state);

    expect(html).toContain('paperdoll-preview-gear');
    expect(html).toContain('paperdoll-gear weapon-sword');
    expect(html).toContain('paperdoll-gear shield-round');
    expect(html).toContain('paperdoll-gear armor-leather');
    expect(html).toContain('paperdoll-gear pack-backpack');
  });
});

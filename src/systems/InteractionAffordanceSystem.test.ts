import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { contextActionsForTarget, describeInteraction, interactionPrompt } from './InteractionAffordanceSystem';

describe('interaction affordances', () => {
  it('uses one primary prompt for common interactables', () => {
    const state = createInitialGameState();

    expect(interactionPrompt(state, { kind: 'entity', entityId: 'portal_bank' })).toBe('Bank Door - Enter (E)');
    expect(interactionPrompt(state, { kind: 'entity', entityId: 'npc_brom_town' })).toBe('Brom - Talk (E)');
    expect(interactionPrompt(state, { kind: 'entity', entityId: 'enemy_bandit_1' })).toBe('Highway Bandit — Target');
    expect(interactionPrompt(state, { kind: 'entity', entityId: 'res_tree_1' })).toBe('Oak Tree — Chop');
    expect(interactionPrompt(state, { kind: 'entity', entityId: 'res_copper_1' })).toBe('Copper Vein — Mine');
  });

  it('uses the 117 reference prompt contract for service and plot-facing targets', () => {
    const state = createInitialGameState();

    expect(interactionPrompt(state, { kind: 'entity', entityId: 'npc_eldon_bank' })).toBe('Banker — Open Bank');
    expect(interactionPrompt(state, { kind: 'entity', entityId: 'npc_brom_smithy' })).toBe('Brom — Craft/Repair');
  });

  it('orders compact context actions by primary action first', () => {
    const state = createInitialGameState();

    expect(contextActionsForTarget(state, { kind: 'entity', entityId: 'enemy_bandit_1' }).map((action) => action.label)).toEqual([
      'Target',
      'Attack',
      'Cast Spell',
      'Inspect',
      'Mark on Map'
    ]);
    expect(contextActionsForTarget(state, { kind: 'entity', entityId: 'res_tree_1' }).map((action) => action.label)).toEqual([
      'Chop with Axe',
      'Inspect',
      'Mark on Map'
    ]);
  });

  it('explains valid and invalid tool targeting', () => {
    const state = createInitialGameState();
    state.ui.targeting = { mode: 'tool', toolItemId: 'axe', prompt: 'Select a tree.' };

    const tree = describeInteraction(state, { kind: 'entity', entityId: 'res_tree_1' });
    expect(tree?.valid).toBe(true);
    expect(tree?.prompt).toBe('Oak Tree — Chop');

    state.ui.targeting = { mode: 'tool', toolItemId: 'pickaxe', prompt: 'Select a vein.' };
    const copper = describeInteraction(state, { kind: 'entity', entityId: 'res_copper_1' });
    expect(copper?.valid).toBe(true);
    expect(copper?.prompt).toBe('Copper Vein — Mine');

    state.ui.targeting = { mode: 'tool', toolItemId: 'axe', prompt: 'Select a tree.' };
    const ore = describeInteraction(state, { kind: 'entity', entityId: 'res_iron_1' });
    expect(ore?.valid).toBe(false);
    expect(ore?.prompt).toBe('Iron Vein - A pickaxe would work better.');
  });
});

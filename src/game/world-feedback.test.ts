import { describe, expect, it } from 'vitest';
import { audioCueTypes } from '../audio/AudioHooks';
import { createInitialGameState } from './GameState';
import type { ContainerEntity, EnemyEntity, ResourceNodeEntity } from './types';
import { worldCursorKindForHover, worldLabelForEntity } from './WorldFeedback';

describe('world feedback policy', () => {
  it('shows enemy name and HP only for selected or hovered enemies', () => {
    const state = createInitialGameState();
    const enemy = state.entities.enemy_bandit_1 as EnemyEntity;

    expect(worldLabelForEntity(state, enemy, { hoveredEntityId: null, distanceToPlayer: 2 })).toBeNull();

    state.player.activeTargetId = enemy.id;
    const label = worldLabelForEntity(state, enemy, { hoveredEntityId: null, distanceToPlayer: 2 });

    expect(label?.title).toBe('Highway Bandit');
    expect(label?.healthPercent).toBeGreaterThan(0);
    expect(label?.className).toContain('selected-enemy-label');
  });

  it('keeps resource labels off in normal mode but exposes tool hover feedback', () => {
    const state = createInitialGameState();
    const tree = state.entities.res_tree_1 as ResourceNodeEntity;

    expect(worldLabelForEntity(state, tree, { hoveredEntityId: tree.id, distanceToPlayer: 1 })).toBeNull();
    expect(worldCursorKindForHover(state, { entity: tree })).toBe('inspect');

    state.ui.activeHotbarSlot = 6;
    const label = worldLabelForEntity(state, tree, { hoveredEntityId: tree.id, distanceToPlayer: 1 });

    expect(label?.title).toBe('Chop tree');
    expect(label?.detail).toBe('Iron Axe ready');
    expect(worldCursorKindForHover(state, { entity: tree })).toBe('harvest');
  });

  it('uses explicit inspect and danger feedback for containers', () => {
    const state = createInitialGameState();
    const chest = state.entities.chest_crypt_warded as ContainerEntity;

    chest.trap!.detected = true;
    expect(worldCursorKindForHover(state, { entity: chest })).toBe('danger');

    const label = worldLabelForEntity(state, chest, { hoveredEntityId: chest.id, distanceToPlayer: 2 });
    expect(label?.detail).toBe('Trap revealed');
    expect(label?.className).toContain('danger-label');
  });

  it('registers non-asset audio hooks for the interaction vocabulary', () => {
    expect(audioCueTypes).toEqual(
      expect.arrayContaining([
        'ui_click',
        'window_open',
        'window_close',
        'item_pickup',
        'skill_gain',
        'spell_cast',
        'spell_fizzle',
        'hit',
        'block',
        'parry',
        'tree_chop',
        'mining_hit',
        'chest_unlock',
        'chest_open',
        'trap_trigger',
        'market_transaction'
      ])
    );
  });
});

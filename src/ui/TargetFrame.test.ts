import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { TargetFrame } from './TargetFrame';

describe('TargetFrame combat readability', () => {
  it('shows enemy cast progress when the selected target is winding up a spell', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'crypt';
    state.player.activeTargetId = 'enemy_cultist_1';
    const caster = state.entities.enemy_cultist_1;
    if (!caster || caster.kind !== 'enemy') throw new Error('missing caster');
    state.combat.telegraphs.push({
      id: 'telegraph_test_cast',
      sourceId: caster.id,
      kind: 'cast',
      area: 'crypt',
      origin: { ...caster.position },
      targetPosition: { ...state.player.position },
      startedAt: state.clock,
      duration: 1.1,
      remaining: 0.55,
      radius: caster.attackRange,
      color: '#b66dff'
    });

    const html = TargetFrame(state);

    expect(html).toContain('enemy-cast-progress');
    expect(html).toContain('Casting');
    expect(html).toContain('50%');
  });
});

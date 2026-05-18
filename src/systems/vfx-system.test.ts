import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import {
  VFX_TIER_BUDGET,
  pruneVisualEffects,
  pushVisualEffect,
  queueGatheringEffect,
  queueSpellRoleEffect,
  queueWeaponImpactEffect,
  queueWeaponSwingEffect
} from './VfxSystem';

describe('disciplined VFX pass', () => {
  it('defines tier budgets and caps active transient effects', () => {
    const state = createInitialGameState();

    for (let i = 0; i < VFX_TIER_BUDGET[1].maxActive + 6; i += 1) {
      pushVisualEffect(state, { kind: 'hit_impact', tier: 1, position: state.player.position, color: '#ff6262', duration: 1 });
    }

    expect(VFX_TIER_BUDGET[0].label).toContain('UI-only');
    expect(state.visualEffects.filter((effect) => effect.tier === 1)).toHaveLength(VFX_TIER_BUDGET[1].maxActive);
  });

  it('maps weapon classes to readable facing-aligned combat effects', () => {
    const state = createInitialGameState();
    const target = { x: state.player.position.x + 1, y: 0, z: state.player.position.z };

    queueWeaponSwingEffect(state, 'fencing', target);
    queueWeaponImpactEffect(state, 'mace', target, { crit: true, armor: 12 });

    expect(state.visualEffects[0]).toMatchObject({ kind: 'pierce_thrust', tier: 1 });
    expect(state.visualEffects.map((effect) => effect.kind)).toEqual(expect.arrayContaining(['mace_impact', 'armor_sparks', 'crit_cue']));
    expect(state.visualEffects[0].yaw).toBeCloseTo(Math.PI / 2, 4);
  });

  it('uses distinct gathering and magic roles', () => {
    const state = createInitialGameState();

    queueGatheringEffect(state, 'tree', state.player.position, 'success');
    queueGatheringEffect(state, 'ore', state.player.position, 'success');
    queueGatheringEffect(state, 'water', state.player.position, 'success');
    queueGatheringEffect(state, 'herb', state.player.position, 'success');
    queueGatheringEffect(state, 'tree', state.player.position, 'depleted');
    queueSpellRoleEffect(state, 'reveal', state.player.position);
    queueSpellRoleEffect(state, 'recall', state.player.position);
    queueSpellRoleEffect(state, 'fizzle', state.player.position);

    expect(state.visualEffects.map((effect) => effect.kind)).toEqual(
      expect.arrayContaining(['wood_chips', 'ore_sparks', 'water_ripple', 'herb_sparkle', 'depleted_cue', 'reveal_pulse', 'rune_circle', 'fizzle_smoke'])
    );
  });

  it('prunes expired effects from the simulation state', () => {
    const state = createInitialGameState();
    pushVisualEffect(state, { kind: 'hit_impact', tier: 1, position: state.player.position, color: '#ff6262', duration: 0.25 });

    state.clock = 0.3;
    pruneVisualEffects(state);

    expect(state.visualEffects).toHaveLength(0);
  });
});

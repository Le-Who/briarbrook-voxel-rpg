import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { Simulation } from '../game/Simulation';
import { updateEnemyCombat } from './CombatSystem';
import { AreaManager } from '../world/AreaManager';

describe('modern action combat layer', () => {
  it('uses enemy telegraphs before resolving dangerous attacks', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'road';
    state.player.position = { x: 2.7, y: 0, z: -2 };
    const enemy = state.entities.enemy_bandit_1;
    if (!enemy || enemy.kind !== 'enemy') throw new Error('enemy missing');
    enemy.position = { x: 2, y: 0, z: -2 };
    enemy.attackTimer = 0;
    const healthBefore = state.player.health;

    updateEnemyCombat(state, areaManager, 1 / 30);

    const banditTelegraph = state.combat.telegraphs.find((telegraph) => telegraph.sourceId === enemy.id);
    expect(banditTelegraph).toMatchObject({ sourceId: enemy.id, kind: 'slash' });
    expect(state.player.health).toBe(healthBefore);

    updateEnemyCombat(state, areaManager, 1.2);

    expect(state.combat.telegraphs.some((telegraph) => telegraph.sourceId === enemy.id)).toBe(false);
    expect(state.player.health).toBeLessThan(healthBefore);
  });

  it('lets the player spend stamina on a defensive action before impact', () => {
    const simulation = new Simulation(createInitialGameState());
    const staminaBefore = simulation.state.player.stamina;

    simulation.dispatch({ type: 'DEFENSIVE_ACTION' });
    simulation.update(1 / 30);

    expect(simulation.state.player.stamina).toBeLessThan(staminaBefore);
    expect(simulation.state.combat.defenseUntil).toBeGreaterThan(simulation.state.clock);
    expect(simulation.state.player.actionState.kind).toBe('moving');
  });

  it('runs weapon abilities through skill and stamina gates', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'road';
    state.player.position = { x: 1.2, y: 0, z: -2 };
    state.player.activeTargetId = 'enemy_bandit_1';
    const enemy = state.entities.enemy_bandit_1;
    if (!enemy || enemy.kind !== 'enemy') throw new Error('enemy missing');
    enemy.position = { x: 2, y: 0, z: -2 };
    const simulation = new Simulation(state);
    const healthBefore = enemy.health;
    const staminaBefore = state.player.stamina;

    simulation.dispatch({ type: 'USE_WEAPON_ABILITY', abilityId: 'quick_slash' });
    simulation.update(1 / 30);

    expect(enemy.health).toBeLessThan(healthBefore);
    expect(state.player.stamina).toBeLessThan(staminaBefore);
    expect(state.combat.abilityCooldowns.quick_slash).toBeGreaterThan(state.clock);
  });

  it('lets enemy mages reveal hidden players before ordinary attacks', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'crypt';
    state.player.position = { x: -3.4, y: 0, z: 4 };
    state.player.combatProfile.hidden = true;
    state.player.combatProfile.hiddenUntil = 99;
    const mage = state.entities.enemy_cultist_1;
    if (!mage || mage.kind !== 'enemy') throw new Error('mage missing');
    mage.position = { x: -3, y: 0, z: 4 };
    mage.attackTimer = 0;

    updateEnemyCombat(state, areaManager, 1 / 30);

    expect(state.player.combatProfile.hidden).toBe(false);
    expect(state.floatingTexts.some((text) => text.text === 'Reveal')).toBe(true);
    expect(state.combat.telegraphs.some((telegraph) => telegraph.sourceId === mage.id)).toBe(false);
  });
});

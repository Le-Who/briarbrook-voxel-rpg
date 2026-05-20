import { afterEach, describe, expect, it, vi } from 'vitest';
import { combatEncounterDefinitions, combatRoleContracts } from '../data/combatEncounters';
import { createInitialGameState, createStack } from '../game/GameState';
import type { EnemyEntity } from '../game/types';
import { AreaManager } from '../world/AreaManager';
import { meleeAttack, rangedAttack, updateEnemyCombat } from './CombatSystem';
import { castSpellIntent, updateSpellCasting } from './SpellSystem';

function enemiesIn(state = createInitialGameState(), area: EnemyEntity['area']): EnemyEntity[] {
  return Object.values(state.entities).filter((entity): entity is EnemyEntity => entity.kind === 'enemy' && entity.area === area);
}

function enemy(state = createInitialGameState(), id: string): EnemyEntity {
  const entity = state.entities[id];
  if (!entity || entity.kind !== 'enemy') throw new Error(`missing test enemy ${id}`);
  return entity;
}

describe('combat encounter roles and readable AI', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines all encounter roles with readable counters and tuned first encounters', () => {
    expect(Object.keys(combatRoleContracts).sort()).toEqual(['archer', 'brute', 'caster', 'grunt', 'guard', 'skirmisher', 'support', 'trapkeeper']);
    expect(combatRoleContracts.brute).toMatchObject({ telegraphKind: 'cone', warningColor: 'red' });
    expect(combatRoleContracts.caster.counters).toContain('interrupt');
    expect(combatRoleContracts.guard.counters).toEqual(expect.arrayContaining(['flank', 'magic']));
    expect(combatRoleContracts.trapkeeper.counters).toContain('Detect Hidden');

    expect(combatEncounterDefinitions.road_bandit_pair.roles).toEqual(['grunt', 'archer']);
    expect(combatEncounterDefinitions.forest_wolf_scout.roles).toContain('skirmisher');
    expect(combatEncounterDefinitions.mine_skeleton_patrol.roles).toEqual(expect.arrayContaining(['grunt', 'brute']));
    expect(combatEncounterDefinitions.crypt_shield_caster_room.roles).toEqual(expect.arrayContaining(['guard', 'caster']));
  });

  it('spawns first encounters with the expected teaching roles', () => {
    const state = createInitialGameState();
    const roadRoles = enemiesIn(state, 'road').map((candidate) => candidate.combatRole);
    const forestRoles = enemiesIn(state, 'forest').map((candidate) => candidate.combatRole);
    const cryptRoles = enemiesIn(state, 'crypt').map((candidate) => candidate.combatRole);

    expect(roadRoles).toEqual(expect.arrayContaining(['grunt', 'archer', 'brute']));
    expect(forestRoles).toContain('skirmisher');
    expect(cryptRoles).toEqual(expect.arrayContaining(['guard', 'caster', 'brute']));
    expect(enemiesIn(state, 'crypt').some((candidate) => candidate.name === 'Shield Skeleton')).toBe(true);
  });

  it('lets ranged pressure interrupt caster telegraphs before spell impact', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'crypt';
    state.player.position = { x: -8, y: 0, z: 4 };
    state.player.equipment.weapon = createStack('simple_bow');
    state.player.activeTargetId = 'enemy_cultist_1';
    const caster = enemy(state, 'enemy_cultist_1');
    caster.position = { x: -3, y: 0, z: 4 };
    caster.attackTimer = 0;

    updateEnemyCombat(state, areaManager, 1 / 30);

    expect(state.combat.telegraphs.find((telegraph) => telegraph.sourceId === caster.id)).toMatchObject({ kind: 'cast' });

    rangedAttack(state, caster.id);

    expect(state.combat.telegraphs.some((telegraph) => telegraph.sourceId === caster.id)).toBe(false);
    expect(state.floatingTexts.some((text) => text.text === 'Interrupted')).toBe(true);
    expect(caster.attackTimer).toBeGreaterThan(0.8);
  });

  it('makes shield enemies strong from the front while flanks and magic stay valid', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = createInitialGameState();
    state.player.currentArea = 'crypt';
    state.player.equipment.weapon = createStack('iron_sword');
    state.player.skills.Magery.value = 80;
    state.player.skills['Evaluating Intelligence'].value = 70;
    state.player.mana = 80;
    state.player.spellbook.knownSpellIds = [...new Set([...state.player.spellbook.knownSpellIds, 'magic_arrow'])];
    const guard = enemy(state, 'enemy_skel_3');
    guard.name = 'Shield Skeleton';
    guard.combatRole = 'guard';
    guard.position = { x: 0, y: 0, z: 0 };
    guard.facing = { ...guard.facing!, facingYaw: 0, desiredFacingYaw: 0 };
    guard.health = guard.maxHealth = 50;
    state.player.activeTargetId = guard.id;

    state.player.position = { x: 0, y: 0, z: 1.2 };
    meleeAttack(state, guard.id);

    expect(guard.health).toBe(50);
    expect(state.floatingTexts.some((text) => text.text === 'Shielded')).toBe(true);

    state.floatingTexts = [];
    state.player.position = { x: 1.2, y: 0, z: 0 };
    meleeAttack(state, guard.id);

    expect(guard.health).toBeLessThan(50);

    const afterFlank = guard.health;
    castSpellIntent(state, 'magic_arrow', { kind: 'entity', entityId: guard.id });
    updateSpellCasting(state, 2);

    expect(guard.health).toBeLessThan(afterFlank);
  });

  it('keeps ranged AI at preferred distance and avoids known trap fields', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'road';
    state.player.position = { x: 0, y: 0, z: 0 };
    const archer = enemy(state, 'enemy_bandit_2');
    archer.position = { x: 1.3, y: 0, z: 0 };
    archer.attackTimer = 0.7;

    const before = Math.hypot(archer.position.x - state.player.position.x, archer.position.z - state.player.position.z);
    updateEnemyCombat(state, areaManager, 1);
    const after = Math.hypot(archer.position.x - state.player.position.x, archer.position.z - state.player.position.z);

    expect(after).toBeGreaterThan(before);

    const brute = enemy(state, 'enemy_brigand_1');
    brute.position = { x: 3, y: 0, z: 0 };
    brute.attackTimer = 0.7;
    state.world.magicFields.push({
      id: 'field_test_trap',
      kind: 'trap',
      area: 'road',
      position: { x: 2, y: 0, z: 0 },
      createdAt: state.clock,
      remaining: 20,
      power: 10
    });

    updateEnemyCombat(state, areaManager, 0.4);

    expect(Math.round(brute.position.x)).not.toBe(2);
  });

  it('lets support enemies heal allies instead of adding burst damage', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'road';
    state.player.position = { x: 0, y: 0, z: 0 };
    const support = enemy(state, 'enemy_bandit_2');
    const ally = enemy(state, 'enemy_bandit_1');
    support.combatRole = 'support';
    support.aiStyle = 'mage';
    support.position = { x: 4, y: 0, z: 0 };
    support.attackTimer = 0;
    ally.position = { x: 3.2, y: 0, z: 0 };
    ally.health = 12;
    const before = ally.health;

    updateEnemyCombat(state, areaManager, 1 / 30);

    expect(ally.health).toBeGreaterThan(before);
    expect(state.floatingTexts.some((text) => text.text.startsWith('+'))).toBe(true);
    expect(state.combat.telegraphs.some((telegraph) => telegraph.sourceId === support.id)).toBe(false);
  });

  it('lets trapkeepers create avoidable trap pressure instead of unavoidable spikes', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'road';
    state.player.position = { x: 0, y: 0, z: 0 };
    const trapkeeper = enemy(state, 'enemy_brigand_1');
    trapkeeper.combatRole = 'trapkeeper';
    trapkeeper.aiStyle = 'archer';
    trapkeeper.position = { x: 4, y: 0, z: 0 };
    trapkeeper.attackTimer = 0;

    updateEnemyCombat(state, areaManager, 1 / 30);

    expect(state.world.magicFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'trap',
          area: 'road',
          power: expect.any(Number)
        })
      ])
    );
    expect(Math.max(...state.world.magicFields.map((field) => field.power))).toBeLessThanOrEqual(7);
  });
});

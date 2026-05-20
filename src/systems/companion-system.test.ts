import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import type { EnemyEntity, NpcEntity, Vec3 } from '../game/types';
import { AreaManager } from '../world/AreaManager';
import { activeCompanions, dismissCompanion, hireCompanion, setCompanionCommand, updateCompanions } from './CompanionSystem';

function npc(state = createInitialGameState(), id: string): NpcEntity {
  const entity = state.entities[id];
  if (!entity || (entity.kind !== 'npc' && entity.kind !== 'social')) throw new Error(`missing test npc ${id}`);
  return entity;
}

function enemy(state = createInitialGameState(), id: string): EnemyEntity {
  const entity = state.entities[id];
  if (!entity || entity.kind !== 'enemy') throw new Error(`missing test enemy ${id}`);
  return entity;
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

describe('party companions and mercenary-lite support', () => {
  it('hires a temporary NPC companion without turning them into a blocker or inventory system', () => {
    const state = createInitialGameState();
    const hired = hireCompanion(state, 'npc_liora_town', { role: 'guard', temporary: true, outingSeconds: 300 });
    const liora = npc(state, 'npc_liora_town');

    expect(hired).toBe(true);
    expect(state.world.partyMemberIds).toEqual(['npc_liora_town']);
    expect(activeCompanions(state).map((candidate) => candidate.id)).toEqual(['npc_liora_town']);
    expect(liora.blocksMovement).toBe(false);
    expect(liora.companion).toMatchObject({
      role: 'guard',
      command: 'follow',
      temporary: true,
      health: expect.any(Number),
      mana: expect.any(Number)
    });
    expect(liora.companion?.expiresAt).toBeCloseTo(300);
    expect(state.chat.at(-1)).toMatchObject({ channel: 'Party', speaker: 'Liora' });
  });

  it('supports follow, hold, assist, passive, and dismiss commands as shallow party controls', () => {
    const state = createInitialGameState();
    hireCompanion(state, 'npc_aric_town', { role: 'scout' });

    expect(setCompanionCommand(state, 'npc_aric_town', 'hold')).toBe(true);
    expect(npc(state, 'npc_aric_town').companion?.command).toBe('hold');
    expect(setCompanionCommand(state, 'npc_aric_town', 'assist')).toBe(true);
    expect(npc(state, 'npc_aric_town').companion?.command).toBe('assist');
    expect(setCompanionCommand(state, 'npc_aric_town', 'passive')).toBe(true);
    expect(npc(state, 'npc_aric_town').companion?.command).toBe('passive');

    expect(dismissCompanion(state, 'npc_aric_town')).toBe(true);
    expect(state.world.partyMemberIds).toEqual([]);
    expect(npc(state, 'npc_aric_town').companion).toBeUndefined();
    expect(npc(state, 'npc_aric_town').blocksMovement).toBe(true);
  });

  it('regroups companions across area changes without standing on portals or trap fields', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'road';
    state.player.position = { x: -8, y: 0, z: 0 };
    state.world.magicFields.push({
      id: 'field_test_trap',
      kind: 'trap',
      area: 'road',
      position: { x: -7, y: 0, z: 0 },
      createdAt: state.clock,
      remaining: 20,
      power: 8
    });
    hireCompanion(state, 'npc_liora_town', { role: 'guard' });
    const liora = npc(state, 'npc_liora_town');
    liora.area = 'town';
    liora.position = { x: 40, y: 0, z: 40 };

    updateCompanions(state, areaManager, 0.5);

    expect(liora.area).toBe('road');
    expect(liora.blocksMovement).toBe(false);
    expect(dist(liora.position, state.player.position)).toBeLessThan(4);
    expect(Math.round(liora.position.x) === -8 && Math.round(liora.position.z) === 0).toBe(false);
    expect(dist(liora.position, state.world.magicFields[0].position)).toBeGreaterThan(0.85);
  });

  it('assists modestly without killing enemies or stealing loot, and healer revive stays basic', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'road';
    state.player.position = { x: 0, y: 0, z: 0 };
    state.player.activeTargetId = 'enemy_bandit_1';
    const bandit = enemy(state, 'enemy_bandit_1');
    bandit.area = 'road';
    bandit.position = { x: 2, y: 0, z: 0 };
    bandit.health = 4;
    bandit.maxHealth = 32;

    hireCompanion(state, 'npc_aric_town', { role: 'archer' });
    const aric = npc(state, 'npc_aric_town');
    aric.area = 'road';
    aric.position = { x: -1, y: 0, z: 0 };
    setCompanionCommand(state, aric.id, 'assist');

    updateCompanions(state, areaManager, 1);

    expect(bandit.health).toBeLessThan(4);
    expect(bandit.health).toBeGreaterThanOrEqual(1);
    expect(bandit.state).not.toBe('dead');
    expect(Object.values(state.entities).some((entity) => entity.kind === 'loot' && entity.name.includes('Bandit'))).toBe(false);

    hireCompanion(state, 'npc_durnok_town', { role: 'healer' });
    const durnok = npc(state, 'npc_durnok_town');
    durnok.area = 'road';
    durnok.position = { x: 1, y: 0, z: 0 };
    state.player.downed = { active: true, since: state.clock, respawnAt: state.clock + 4 };
    state.player.health = 0;

    updateCompanions(state, areaManager, 1);

    expect(state.player.downed.active).toBe(false);
    expect(state.player.health).toBeGreaterThan(0);
    expect(durnok.companion?.mana).toBeLessThan(durnok.companion?.maxMana ?? 0);
  });
});

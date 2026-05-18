import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { deriveMasteryMilestones, deriveProfessionAtlas, skillLedgerRows } from './ProfessionSystem';

describe('profession system', () => {
  it('keeps the skill ledger as filtered use-based truth', () => {
    const state = createInitialGameState();
    state.clock = 300;
    state.player.skills.Mining.lastSuccessfulUseAt = 295;

    const smithRows = skillLedgerRows(state, {
      group: 'All',
      trainable: 'trainable',
      recent: 'all',
      profession: 'town_smith',
      search: ''
    });
    const recentRows = skillLedgerRows(state, {
      group: 'All',
      trainable: 'all',
      recent: 'recent',
      profession: 'all',
      search: ''
    });

    expect(smithRows.map((row) => row.id)).toEqual(expect.arrayContaining(['Mining', 'Blacksmithing']));
    expect(smithRows.every((row) => row.trainable)).toBe(true);
    expect(smithRows.find((row) => row.id === 'Mining')).toMatchObject({
      trainedBy: expect.stringContaining('harvest'),
      usedBy: expect.stringContaining('Town Smith')
    });
    expect(recentRows.map((row) => row.id)).toContain('Mining');
  });

  it('derives atlas nodes from profession lenses without class locks', () => {
    const state = createInitialGameState();

    const atlas = deriveProfessionAtlas(state, 'treasure_hunter', 'skill:Lockpicking');

    expect(atlas.lens?.name).toBe('Treasure Hunter');
    expect(atlas.classlessNote).toContain('lens');
    expect(atlas.nodes.find((node) => node.id === 'skill:Cartography')?.highlighted).toBe(true);
    expect(atlas.nodes.find((node) => node.id === 'activity:treasure_chest')?.label).toBe('Treasure Chest');
    expect(atlas.nodes.find((node) => node.id === 'skill:Animal Taming')?.implemented).toBe(false);
    expect(atlas.nodes.find((node) => node.id === 'skill:Lockpicking')?.pinned).toBe(true);
  });

  it('earns mastery milestones from practiced state instead of point spending', () => {
    const state = createInitialGameState();
    state.player.skills.Magery.realValue = 25;
    state.player.skills.Magery.value = 25;
    state.player.skills.Meditation.realValue = 20;
    state.player.skills.Meditation.value = 20;
    state.player.spellbook.knownSpellIds = ['magic_arrow', 'heal', 'night_sight', 'detect_magic', 'cure', 'harm'];

    const milestones = deriveMasteryMilestones(state);
    const hedgeMage = milestones.find((milestone) => milestone.id === 'hedge_mage');
    const townSmith = milestones.find((milestone) => milestone.id === 'town_smith');

    expect(hedgeMage).toMatchObject({
      earned: true,
      reward: expect.stringContaining('spell failure preview')
    });
    expect(townSmith?.earned).toBe(false);
    expect(townSmith?.requirements.map((requirement) => requirement.label)).toContain('Repair 5 items');
  });
});

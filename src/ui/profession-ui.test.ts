import { describe, expect, it } from 'vitest';
import { deriveProfessionContractProgress, professionContracts } from '../data/professions';
import { createInitialGameState } from '../game/GameState';
import { Simulation } from '../game/Simulation';
import { JournalPanel } from './JournalPanel';
import { SkillsPanel } from './SkillsPanel';

describe('profession UI', () => {
  it('renders the skill ledger as the default skills view', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;

    const html = SkillsPanel(state);

    expect(html).toContain('Skill Ledger');
    expect(html).toContain('Trained by');
    expect(html).toContain('Used by');
    expect(html).toContain('Trainable');
    expect(html).toContain('Not yet trainable');
  });

  it('renders the profession atlas as a planning map, not a passive tree', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillsViewMode = 'atlas';
    state.ui.skillProfessionFilter = 'treasure_hunter';
    state.ui.pinnedProfessionGoalId = 'skill:Lockpicking';

    const html = SkillsPanel(state);

    expect(html).toContain('Profession Atlas');
    expect(html).toContain('Treasure Hunter');
    expect(html).toContain('Cartography');
    expect(html).toContain('Treasure Map');
    expect(html).toContain('Relationship Map');
    expect(html).toContain('locked paths');
    expect(html).toContain('profession-atlas-redesign');
    expect(html).toContain('data-action="atlas-search"');
    expect(html).toContain('data-atlas-zoom="fit"');
    expect(html).toContain('data-node-type="resource"');
    expect(html).toContain('data-node-type="output"');
    expect(html).toContain('data-node-type="service"');
    expect(html).toContain('data-node-type="future"');
    expect(html).toContain('atlas-node-detail');
    expect(html).toContain('not-trainable');
    expect(html).toContain('pinned');
  });

  it('meets the R8 atlas contract for lenses, controls, node types, and future visibility', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillView = 'atlas';
    state.ui.professionFilter = 'treasure_hunter';

    const html = SkillsPanel(state);

    for (const lens of ['Armsman', 'Ranger', 'Hedge Mage', 'Treasure Hunter', 'Field Medic', 'Town Smith', 'Builder', 'Provisioner']) {
      expect(html).toContain(lens);
    }
    for (const nodeType of ['skill', 'tool', 'resource', 'activity', 'output', 'service', 'milestone', 'future']) {
      expect(html).toContain(`data-node-type="${nodeType}"`);
    }
    expect(html).toContain('data-action="atlas-search"');
    expect(html).toContain('data-atlas-zoom="-0.1"');
    expect(html).toContain('data-atlas-zoom="0.1"');
    expect(html).toContain('data-atlas-zoom="fit"');
    expect(html).toContain('data-atlas-zoom="reset"');
    expect(html).toContain('data-pin-profession-goal="treasure_hunter"');
    expect(html).toContain('data-atlas-future="hide"');
    expect(html).toContain('profession contracts');

    state.ui.professionAtlasShowFuture = false;
    const hiddenFutureHtml = SkillsPanel(state);

    expect(hiddenFutureHtml).toContain('data-atlas-future="show"');
    expect(hiddenFutureHtml).not.toContain('data-node-type="future"');
    expect(hiddenFutureHtml).toContain('Survey Contracts locked');
  });

  it('shows selected atlas node details and pins them into the journal', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.panels.journal = true;
    state.ui.skillView = 'atlas';
    state.ui.professionFilter = 'treasure_hunter';
    state.ui.selectedProfessionNodeId = 'skill_lockpicking';
    state.ui.pinnedProfessionGoalId = 'skill_lockpicking';

    const skillsHtml = SkillsPanel(state);
    const journalHtml = JournalPanel(state);

    expect(skillsHtml).toContain('atlas-detail-card');
    expect(skillsHtml).toContain('Lockpicking');
    expect(skillsHtml).toContain('Trained by');
    expect(skillsHtml).toContain('data-pin-profession-goal="skill_lockpicking"');
    expect(journalHtml).toContain('Pinned Profession Goal');
    expect(journalHtml).toContain('Lockpicking');
  });

  it('renders mastery milestones and journal pinned profession goals', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillsViewMode = 'milestones';

    const skillsHtml = SkillsPanel(state);

    expect(skillsHtml).toContain('Mastery Milestones');
    expect(skillsHtml).toContain('Hedge Mage');
    expect(skillsHtml).toContain('Practice, no point spending');

    state.ui.panels.journal = true;
    state.ui.pinnedProfessionGoalId = 'profession:builder';
    const journalHtml = JournalPanel(state);

    expect(journalHtml).toContain('Pinned Profession Goal');
    expect(journalHtml).toContain('Builder');
  });

  it('defines classless profession contracts with objectives, skills, and non-passive rewards', () => {
    expect(professionContracts.map((contract) => contract.id)).toEqual([
      'ranger',
      'smith',
      'treasure_hunter',
      'field_medic',
      'hedge_mage',
      'builder',
      'trader'
    ]);

    for (const contract of professionContracts) {
      expect(contract.skills.length).toBeGreaterThanOrEqual(3);
      expect(contract.skills.length).toBeLessThanOrEqual(6);
      expect(contract.objectives.length).toBeGreaterThanOrEqual(3);
      expect(contract.teaches.length).toBeGreaterThan(20);
      expect(contract.classless).toBe(true);
      expect(contract.rewards.some((reward) => reward.type === 'passive_bonus')).toBe(false);
      expect(contract.rewards.map((reward) => reward.type)).toEqual(expect.arrayContaining(['milestone']));
    }
  });

  it('derives profession contract progress from played state instead of class selection', () => {
    const state = createInitialGameState();
    state.world.discoveredAreas.push('housing');
    state.world.placedBuildings.push({
      id: 'placed_workbench_test',
      kind: 'building',
      area: 'housing',
      name: 'Workbench',
      position: { x: 0, y: 0, z: 0 },
      blocksMovement: true,
      pieceId: 'carpenter_bench_home',
      rotation: 0,
      ownerId: 'player',
      functionType: 'crafting'
    });
    state.dev.telemetry.resourceYields.wood = 24;
    state.player.skills.Carpentry.realValue = 12;
    state.player.skills.Carpentry.value = 12;

    const builder = deriveProfessionContractProgress(state, 'builder');

    expect(builder.contract.title).toBe('Builder Contract');
    expect(builder.objectives.some((objective) => objective.done)).toBe(true);
    expect(builder.nextObjective?.label).toContain('functional housing');
    expect(builder.progress).toBeGreaterThan(0);
    expect(builder.rewardSummary).toContain('station efficiency');
  });

  it('allows profession contracts to be accepted, swapped, abandoned, and pinned to journal', () => {
    const state = createInitialGameState();
    const simulation = new Simulation(state);

    simulation.dispatch({ type: 'ACCEPT_PROFESSION_CONTRACT', contractId: 'ranger' });
    simulation.update(1 / 30);
    expect(state.ui.activeProfessionContractId).toBe('ranger');
    expect(state.ui.prompt).toBe('Profession goal accepted.');
    expect(state.ui.prompt).not.toContain('classless');

    simulation.dispatch({ type: 'ACCEPT_PROFESSION_CONTRACT', contractId: 'trader' });
    simulation.update(1 / 30);
    expect(state.ui.activeProfessionContractId).toBe('trader');

    simulation.dispatch({ type: 'PIN_PROFESSION_GOAL', goalId: 'contract:trader' });
    simulation.update(1 / 30);
    state.ui.panels.journal = true;
    expect(JournalPanel(state)).toContain('Trader Contract');

    simulation.dispatch({ type: 'ABANDON_PROFESSION_CONTRACT', contractId: 'trader' });
    simulation.update(1 / 30);
    expect(state.ui.activeProfessionContractId).toBeNull();
  });

  it('shows profession contract progress and pin controls in the Profession Atlas', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillView = 'atlas';
    state.ui.professionFilter = 'trader';
    state.ui.activeProfessionContractId = 'trader';
    state.ui.pinnedProfessionGoalId = 'contract:trader';

    const html = SkillsPanel(state);

    expect(html).toContain('Profession Contracts');
    expect(html).toContain('Trader Contract');
    expect(html).toContain('data-profession-contract="trader"');
    expect(html).toContain('data-abandon-profession-contract="trader"');
    expect(html).toContain('data-pin-profession-goal="contract:trader"');
    expect(html).toContain('Contract progress');
    expect(html).toContain('work order tier');
    expect(html).not.toContain('Choose Class');
    expect(html).not.toContain('Spend Point');
  });
});

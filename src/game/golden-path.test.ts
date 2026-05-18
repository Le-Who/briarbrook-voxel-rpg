import { afterEach, describe, expect, it, vi } from 'vitest';
import { beginnerSpellIds } from '../data/spells';
import { placeBuilding, updateBuildGhost } from '../systems/BuildingSystem';
import { startCraft, updateCrafting } from '../systems/CraftingSystem';
import { claimStarterPlot } from '../systems/HousingSystem';
import { gatherResource, interactEntity, updateGathering } from '../systems/InteractionSystem';
import { addItem, getItemCount } from '../systems/InventorySystem';
import { completeQuest } from '../systems/QuestSystem';
import { AreaManager } from '../world/AreaManager';
import { createInitialGameState } from './GameState';
import { Simulation } from './Simulation';

describe('golden path product hardening', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts as a novice road kit instead of a stocked demo character', () => {
    const state = createInitialGameState();

    expect(state.player.level).toBe(1);
    expect(state.player.gold).toBeLessThanOrEqual(100);
    expect(state.player.bank.slots.every((slot) => slot == null)).toBe(true);
    expect(state.player.equipment.armor?.itemId).toBe('leather_armor');
    expect(state.player.equipment.accessory).toBeUndefined();
    expect(state.player.spellbook.knownSpellIds).toEqual(beginnerSpellIds);
    expect(getItemCount(state.player.inventory, 'iron_bar')).toBe(0);
    expect(getItemCount(state.player.inventory, 'stone_block')).toBe(0);
    expect(getItemCount(state.player.inventory, 'black_pearl')).toBe(0);
  });

  it('connects early gathering, banking, crafting, magic, combat, and housing loops without dev tools', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const state = createInitialGameState();
    const simulation = new Simulation(state);
    const areaManager = new AreaManager();

    state.player.currentArea = 'forest';
    for (const id of ['res_tree_1', 'res_tree_2']) {
      const tree = state.entities[id];
      if (!tree || tree.kind !== 'resource') throw new Error(`missing test resource ${id}`);
      state.player.position = { ...tree.position };
      gatherResource(state, id);
      updateGathering(state, 10);
    }
    expect(getItemCount(state.player.inventory, 'logs')).toBeGreaterThanOrEqual(10);
    expect(state.quests.prepare_for_road.objectives.find((objective) => objective.type === 'collect')?.progress).toBeGreaterThanOrEqual(10);

    const logsSlot = state.player.inventory.slots.findIndex((slot) => slot?.itemId === 'logs');
    simulation.dispatch({ type: 'MOVE_ITEM', from: 'inventory', to: 'bank', slot: logsSlot });
    simulation.update(1 / 30);
    expect(getItemCount(state.player.bank, 'logs')).toBeGreaterThan(0);
    expect(state.quests.prepare_for_road.objectives.find((objective) => objective.type === 'bank')?.progress).toBe(1);

    const ore = state.entities.res_iron_1;
    if (!ore || ore.kind !== 'resource') throw new Error('missing ore resource');
    state.player.position = { ...ore.position };
    gatherResource(state, ore.id);
    updateGathering(state, 10);
    expect(getItemCount(state.player.inventory, 'iron_ore')).toBeGreaterThanOrEqual(4);

    startCraft(state, 'smelt_iron', 1);
    updateCrafting(state, 10);
    expect(getItemCount(state.player.inventory, 'iron_bar')).toBeGreaterThanOrEqual(2);

    state.player.currentArea = 'road';
    state.player.position = { x: 2, y: 0, z: -1.5 };
    const bandit = state.entities.enemy_bandit_1;
    if (!bandit || bandit.kind !== 'enemy') throw new Error('missing road enemy');
    const ashBefore = getItemCount(state.player.inventory, 'sulfurous_ash');
    const manaBefore = state.player.mana;
    const healthBefore = bandit.health;
    simulation.dispatch({ type: 'CAST_SPELL', spellId: 'magic_arrow', entityId: bandit.id });
    for (let i = 0; i < 20; i += 1) simulation.update(1 / 30);
    expect(getItemCount(state.player.inventory, 'sulfurous_ash')).toBeLessThan(ashBefore);
    expect(state.player.mana).toBeLessThan(manaBefore);
    expect(bandit.health).toBeLessThan(healthBefore);

    state.player.currentArea = 'housing';
    state.player.position = { x: -4, y: 0, z: -3 };
    expect(claimStarterPlot(state)).toBe(true);
    addItem(state.player.inventory, 'wood', 8);
    state.buildMode.selectedPieceId = 'sign_home';
    updateBuildGhost(state, areaManager, { x: 0, y: 0, z: 0 });
    expect(placeBuilding(state, areaManager)).toBe(true);
    expect(state.world.placedBuildings.some((building) => building.pieceId === 'sign_home')).toBe(true);
  });

  it('unlocks first-session quest leads in act order instead of handing out the crypt early', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();

    state.player.position = { x: -1, y: 0, z: 5 };
    interactEntity(state, areaManager, 'npc_mira_town');
    expect(state.player.activeQuestIds).toEqual(['prepare_for_road']);

    forceCompleteQuest(state, 'prepare_for_road');
    expect(state.player.activeQuestIds).toEqual(expect.arrayContaining(['ore_for_brom', 'mages_errand', 'patch_yourself_up']));
    expect(state.player.activeQuestIds).not.toContain('trouble_on_road');
    expect(state.player.activeQuestIds).not.toContain('bones_beneath');

    forceCompleteQuest(state, 'ore_for_brom');
    expect(state.player.activeQuestIds).not.toContain('trouble_on_road');
    forceCompleteQuest(state, 'mages_errand');
    expect(state.player.activeQuestIds).not.toContain('trouble_on_road');
    forceCompleteQuest(state, 'patch_yourself_up');
    expect(state.player.activeQuestIds).toContain('trouble_on_road');

    forceCompleteQuest(state, 'trouble_on_road');
    expect(state.player.activeQuestIds).toContain('bones_beneath');
    expect(state.player.activeQuestIds).not.toContain('place_to_call_yours');

    forceCompleteQuest(state, 'bones_beneath');
    expect(state.player.activeQuestIds).toContain('place_to_call_yours');
  });

  it('keeps build mode tied to the housing plot instead of teleporting from town', () => {
    const state = createInitialGameState();
    const simulation = new Simulation(state);

    expect(state.player.currentArea).toBe('town');
    simulation.dispatch({ type: 'TOGGLE_BUILD_MODE' });
    simulation.update(1 / 30);

    expect(state.player.currentArea).toBe('town');
    expect(state.buildMode.active).toBe(false);
    expect(state.ui.panels.build).toBe(false);
    expect(state.ui.prompt).toContain('housing plot');
  });
});

function forceCompleteQuest(state: ReturnType<typeof createInitialGameState>, questId: string): void {
  if (!state.player.activeQuestIds.includes(questId)) state.player.activeQuestIds.push(questId);
  state.quests[questId].objectives.forEach((objective) => {
    objective.progress = objective.required;
  });
  state.quests[questId].status = 'ready';
  completeQuest(state, questId);
}

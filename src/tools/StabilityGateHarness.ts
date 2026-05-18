import { beginnerSpellIds } from '../data/spells';
import { createInitialGameState, createStack } from '../game/GameState';
import { loadGame, saveGame } from '../game/SaveLoad';
import { Simulation } from '../game/Simulation';
import type { GameAction } from '../game/Actions';
import type { GameState, SkillGainMode } from '../game/types';
import { claimStarterPlot } from '../systems/HousingSystem';
import { addItem } from '../systems/InventorySystem';
import { devGiveSpell, devResetResources, devSetSkillValue, devSpawnItem } from '../systems/DevToolsSystem';
import { updateBuildGhost, placeBuilding } from '../systems/BuildingSystem';
import { AreaManager } from '../world/AreaManager';
import { createContentRegistry } from './ContentRegistry';
import { validateContent } from './ContentValidation';

export const stabilityGateMajorPanels = [
  'inventory',
  'spellbook',
  'skills',
  'journal',
  'market',
  'crafting',
  'character',
  'help',
  'status',
  'quest',
  'guide',
  'treasureMap',
  'combatActions',
  'build'
] as const;

export interface StabilityGateCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface StabilityGateReport {
  ok: boolean;
  checks: StabilityGateCheck[];
  state: GameState;
  loaded?: GameState;
}

export function createStabilityGateNewGame(): GameState {
  return createInitialGameState();
}

export function giveStabilityGateKit(state: GameState): void {
  devSpawnItem(state, 'iron_bar', 10);
  devSpawnItem(state, 'logs', 10);
  devSpawnItem(state, 'rough_treasure_map', 1);
  devSpawnItem(state, 'bandage', 10);
  devGiveSpell(state, 'fireball');
  devGiveSpell(state, 'cure');
  devSetSkillValue(state, 'Swordsmanship', 55);
  devSetSkillValue(state, 'Magery', 55);
  devSetSkillValue(state, 'Lumberjacking', 55);
  devResetResources(state);
}

export function openEveryStabilityGatePanel(state: GameState): void {
  stabilityGateMajorPanels.forEach((panel) => {
    state.ui.panels[panel] = true;
  });
}

export function prepareStabilityGateState(areaManager = new AreaManager()): GameState {
  const state = createStabilityGateNewGame();
  giveStabilityGateKit(state);
  openEveryStabilityGatePanel(state);
  prepareSaveLoadRoundTripState(state, areaManager);
  return state;
}

export function validateStabilityGateContent(state: GameState): StabilityGateCheck {
  const result = validateContent(createContentRegistry(state), state.clock);
  return {
    id: 'content-validation',
    ok: result.ok,
    detail: result.ok ? 'Content registry passes validation.' : result.errors.slice(0, 3).join('; ')
  };
}

export function runStabilityGateSaveLoadRoundTrip(state: GameState): { loaded: GameState; checks: StabilityGateCheck[] } {
  saveGame(state);
  const loaded = loadGame();
  const checks: StabilityGateCheck[] = [
    check('player-position-area', loaded.player.currentArea === state.player.currentArea && closeVec(loaded.player.position, state.player.position), 'Player area and position survive save/load.'),
    check('inventory', hasInventoryItem(loaded, 'iron_ore') && hasInventoryItem(loaded, 'rough_treasure_map'), 'Inventory survives save/load.'),
    check('bank', loaded.player.bank.slots.some((slot) => slot?.itemId === 'logs' && slot.quantity >= 4), 'Bank inventory survives save/load.'),
    check('equipment', loaded.player.equipment.weapon?.itemId === 'iron_sword' && loaded.player.equipment.armor?.itemId === 'leather_armor', 'Equipment survives save/load.'),
    check('skill-values-modes', loaded.player.skills.Magery.value >= 55 && loaded.player.skills.Magery.mode === 'lock', 'Skill values and modes survive save/load.'),
    check('spellbook', beginnerSpellIds.every((spellId) => loaded.player.spellbook.knownSpellIds.includes(spellId)) && loaded.player.spellbook.knownSpellIds.includes('fireball'), 'Known spells survive save/load.'),
    check('hotbar', loaded.ui.hotbar[4]?.kind === 'spell' && loaded.ui.hotbar[4].id === 'fireball', 'Hotbar assignments survive save/load.'),
    check('quest-journal', (loaded.quests.prepare_for_road?.objectives[0]?.progress ?? 0) >= 1 && loaded.ui.journalTab === 'skills', 'Quest and journal progress survive save/load.'),
    check('housing', loaded.world.placedBuildings.some((building) => building.pieceId === 'small_chest'), 'Placed housing objects survive save/load.'),
    check('ui-preferences', loaded.ui.uiScale === 1.15 && loaded.ui.reducedMotion === true, 'UI scale and reduced motion survive save/load.')
  ];
  return { loaded, checks };
}

export function runStabilityGateCommonActions(state: GameState): StabilityGateCheck[] {
  const simulation = new Simulation(state);
  const checks: StabilityGateCheck[] = [];

  dispatchAndDrain(simulation, { type: 'BEGIN_TARGETING', mode: 'tool', toolItemId: 'axe', prompt: 'Select a tree.' });
  dispatchAndDrain(simulation, { type: 'TOGGLE_PANEL', panel: 'inventory', open: true });
  checks.push(check('targeting-survives-inventory', simulation.state.ui.targeting?.mode === 'tool', 'Opening inventory does not cancel targeting.'));

  dispatchAndDrain(simulation, { type: 'CANCEL_TARGETING' });
  checks.push(check('escape-cancel-targeting', simulation.state.ui.targeting === null, 'Cancel clears targeting mode.'));

  dispatchAndDrain(simulation, { type: 'SET_HOTBAR_SLOT', slot: 0, binding: { kind: 'spell', id: 'magic_arrow' } });
  dispatchAndDrain(simulation, { type: 'USE_HOTBAR', slot: 0 });
  checks.push(check('hotbar-dispatch', simulation.state.ui.activeHotbarSlot === 0, 'Hotbar slot 1 dispatches without clearing UI.'));

  dispatchAndDrain(simulation, { type: 'TOGGLE_PAUSE', paused: true });
  const tickBeforePause = simulation.state.realtime.tick;
  simulation.update(1);
  checks.push(check('pause-freezes-simulation', simulation.state.paused && simulation.state.realtime.tick === tickBeforePause && simulation.state.ui.panels.help, 'Paused/help mode freezes fixed simulation and keeps help visible.'));

  dispatchAndDrain(simulation, { type: 'TOGGLE_PAUSE', paused: false });
  dispatchAndDrain(simulation, { type: 'TOGGLE_DEV_OVERLAY' });
  const targetBeforeDev = simulation.state.player.targetPosition;
  simulation.update(1 / 6);
  checks.push(check('dev-overlay-isolated', simulation.state.dev.overlay && simulation.state.player.targetPosition === targetBeforeDev, 'Dev overlay can be open without injecting movement.'));

  return checks;
}

export function runStabilityGateSoak(seconds = 20 * 60): StabilityGateCheck {
  const state = prepareStabilityGateState(new AreaManager());
  const simulation = new Simulation(state);
  const updates = Math.ceil(seconds * 6);
  for (let i = 0; i < updates; i += 1) {
    if (i % 900 === 0) {
      simulation.dispatch({ type: 'TOGGLE_PANEL', panel: i % 1800 === 0 ? 'inventory' : 'spellbook', open: true });
      simulation.dispatch({ type: 'SET_HOTBAR_SLOT', slot: 0, binding: { kind: 'spell', id: 'magic_arrow' } });
    }
    simulation.update(1 / 6);
    if (!Number.isFinite(simulation.state.clock) || !Number.isFinite(simulation.state.player.health)) {
      return check('twenty-minute-soak', false, 'Simulation produced a non-finite clock or health value.');
    }
  }
  return check(
    'twenty-minute-soak',
    simulation.state.realtime.actionQueue.length === 0 && simulation.state.player.health > 0 && simulation.state.ui.panels.inventory === true,
    `${seconds} seconds of simulated normal play completed without queued-action softlocks.`
  );
}

export function runStabilityGateHarness(): StabilityGateReport {
  const areaManager = new AreaManager();
  const state = prepareStabilityGateState(areaManager);
  const contentCheck = validateStabilityGateContent(state);
  const { loaded, checks: saveLoadChecks } = runStabilityGateSaveLoadRoundTrip(state);
  const actionChecks = runStabilityGateCommonActions(loaded);
  const soakCheck = runStabilityGateSoak();
  const panelCheck = check(
    'open-major-panels',
    stabilityGateMajorPanels.every((panel) => state.ui.panels[panel]),
    'All major panels can be opened for layout validation.'
  );
  const checks = [contentCheck, panelCheck, ...saveLoadChecks, ...actionChecks, soakCheck];
  return {
    ok: checks.every((entry) => entry.ok),
    checks,
    state,
    loaded
  };
}

function prepareSaveLoadRoundTripState(state: GameState, areaManager: AreaManager): void {
  state.player.currentArea = 'housing';
  state.player.position = { x: -4, y: 0, z: -3 };
  state.player.movement.tile = { x: -4, z: -3 };
  state.player.inventory.slots[0] = createStack('iron_ore', 3);
  state.player.inventory.slots[1] = createStack('rough_treasure_map', 1);
  state.player.bank.slots[0] = createStack('logs', 4);
  state.player.skills.Magery.mode = 'lock' as SkillGainMode;
  state.player.spellbook.knownSpellIds = Array.from(new Set([...state.player.spellbook.knownSpellIds, 'fireball']));
  state.ui.hotbar[4] = { kind: 'spell', id: 'fireball' };
  state.ui.journalTab = 'skills';
  state.ui.uiScale = 1.15;
  state.ui.reducedMotion = true;
  state.quests.prepare_for_road.objectives[0].progress = Math.max(1, state.quests.prepare_for_road.objectives[0].progress);

  addItem(state.player.inventory, 'wood', 14);
  addItem(state.player.inventory, 'stone_block', 10);
  claimStarterPlot(state);
  state.buildMode.active = true;
  state.buildMode.selectedPieceId = 'small_chest';
  updateBuildGhost(state, areaManager, { x: -3, y: 0, z: -2 });
  placeBuilding(state, areaManager);
}

function dispatchAndDrain(simulation: Simulation, action: GameAction): void {
  simulation.dispatch(action);
  simulation.update(1 / 6);
}

function check(id: string, ok: boolean, detail: string): StabilityGateCheck {
  return { id, ok, detail };
}

function hasInventoryItem(state: GameState, itemId: string): boolean {
  return state.player.inventory.slots.some((slot) => slot?.itemId === itemId);
}

function closeVec(a: GameState['player']['position'], b: GameState['player']['position']): boolean {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001 && Math.abs(a.z - b.z) < 0.001;
}

import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { buildPieces } from '../data/items';
import { getHousingPieceDefinition } from '../data/housing';
import { BuildPanel } from '../ui/BuildPanel';
import { updateBuildGhost } from '../systems/BuildingSystem';
import { claimStarterPlot } from '../systems/HousingSystem';
import { addItem } from '../systems/InventorySystem';
import { applyScreenshotParityPreset } from '../tools/screenshotParity';
import { AreaManager } from '../world/AreaManager';
import { housingBuildReferencePlan } from './HousingBuildReferencePlan';

const starterFunctionalPieces = ['small_chest', 'basic_workbench', 'torch', 'bedroll_home', 'resource_crate', 'small_trophy_hook'];

describe('R7 housing build mode reference contract', () => {
  it('defines a practical build-mode target for the R7 reference', () => {
    expect(housingBuildReferencePlan.referenceId).toBe('R7');
    expect(housingBuildReferencePlan.scene).toEqual(expect.arrayContaining(['visible plot boundary', 'modest fence', 'road approach', 'water and dock', 'starter objects']));
    expect(housingBuildReferencePlan.feedback).toEqual(expect.arrayContaining(['valid ghost', 'invalid ghost', 'footprint', 'collision warning', 'material shortage warning', 'orientation arrow']));
    expect(housingBuildReferencePlan.buildTabs).toEqual(['Walls', 'Floors', 'Doors', 'Roofs', 'Decor', 'Utility/Storage']);
    expect(housingBuildReferencePlan.starterFunctionalPieces).toEqual(starterFunctionalPieces);
  });

  it('sets R7 screenshot parity to a real useful build-mode state', () => {
    const state = createInitialGameState();
    const areaManager = new AreaManager();

    expect(applyScreenshotParityPreset(state, areaManager, 'r7-housing-build')).toBe(true);

    expect(state.player.currentArea).toBe('housing');
    expect(state.buildMode.active).toBe(true);
    expect(state.ui.panels.build).toBe(true);
    expect(state.ui.panels.inventory).toBe(true);
    expect(state.buildMode.selectedPieceId).toBe('small_chest');
    expect(state.buildMode.valid).toBe(true);
    expect(state.buildMode.message).toContain('Ready');

    const html = BuildPanel(state);
    expect(html).toContain('Utility/Storage');
    expect(html).toContain('data-build-category="Storage"');
    for (const pieceId of starterFunctionalPieces) {
      const piece = buildPieces.find((candidate) => candidate.id === pieceId);
      expect(piece, pieceId).toBeTruthy();
      expect(html).toContain(piece!.name);
    }
    expect(html).toContain('data-placement-state="valid"');
    expect(html).toContain('data-placement-footprint');
    expect(html).toContain('data-action="rotate-building"');
    expect(html).toContain('data-action="cancel-build-placement"');
  });

  it('keeps starter housing useful but constrained', () => {
    for (const pieceId of starterFunctionalPieces) {
      expect(getHousingPieceDefinition(pieceId).minTier, pieceId).toBe(0);
    }

    const state = createInitialGameState();
    const areaManager = new AreaManager();
    state.player.currentArea = 'housing';
    state.player.position = { x: -4, y: 0, z: -3 };
    claimStarterPlot(state);

    state.buildMode.selectedPieceId = 'small_chest';
    updateBuildGhost(state, areaManager, { x: 8, y: 0, z: 0 });
    expect(state.buildMode.valid).toBe(false);
    expect(state.buildMode.message).toContain('outside the fenced plot');

    state.buildMode.selectedPieceId = 'resource_crate';
    updateBuildGhost(state, areaManager, { x: 0, y: 0, z: 1 });
    expect(state.buildMode.valid).toBe(false);
    expect(state.buildMode.message).toContain('You need');

    addItem(state.player.inventory, 'wood', 8);
    addItem(state.player.inventory, 'stone_block', 4);
    state.buildMode.selectedPieceId = 'small_chest';
    updateBuildGhost(state, areaManager, { x: -2, y: 0, z: 1 });
    expect(state.buildMode.valid).toBe(false);
    expect(state.buildMode.message).toContain('occupies');
  });
});

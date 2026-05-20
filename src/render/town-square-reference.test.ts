import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { worldLabelForEntity } from '../game/WorldFeedback';
import { Minimap } from '../ui/Minimap';
import { deriveSpatialContext } from '../ui/SpatialUX';
import { briarbrookTownSquareReference } from './TownSquareVisualPlan';

describe('R1 Briarbrook town square reference contract', () => {
  it('defines the hub landmarks required by the R1 target', () => {
    const plan = briarbrookTownSquareReference;

    expect(plan.referenceId).toBe('R1');
    expect(plan.centralLandmark.id).toBe('fountain');
    expect(plan.serviceEntrances.map((entry) => entry.id)).toEqual(['bank', 'smithy', 'market']);
    expect(plan.exitSigns.map((entry) => entry.id)).toEqual(expect.arrayContaining(['forest', 'old-road', 'ferry']));
    expect(plan.npcBudget.visibleSquareMin).toBeGreaterThanOrEqual(4);
    expect(plan.npcBudget.visibleSquareMax).toBeLessThanOrEqual(8);
    expect(plan.dressing.flowerBeds.length).toBeGreaterThanOrEqual(6);
    expect(plan.dressing.lamps.length).toBeLessThanOrEqual(8);
  });

  it('keeps live town labels sparse while exposing service and exit markers on the minimap', () => {
    const state = createInitialGameState();
    state.ui.panels.guide = false;
    state.ui.minimapMode = 'standard';

    const visibleTownLabels = Object.values(state.entities)
      .filter((entity) => entity.area === 'town')
      .filter((entity) => {
        const distanceToPlayer = Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z);
        return Boolean(worldLabelForEntity(state, entity, { hoveredEntityId: null, distanceToPlayer }));
      });

    expect(visibleTownLabels.length).toBeGreaterThanOrEqual(4);
    expect(visibleTownLabels.length).toBeLessThanOrEqual(8);

    const spatial = deriveSpatialContext(state);
    const serviceLabels = spatial.layers.find((layer) => layer.id === 'services')?.markers.map((marker) => marker.label) ?? [];
    const entranceLabels = spatial.layers.find((layer) => layer.id === 'entrances')?.markers.map((marker) => marker.label) ?? [];

    expect(serviceLabels).toEqual(expect.arrayContaining(['Bank Sign', 'Smithy Smoke', 'Market Sign']));
    expect(entranceLabels).toEqual(expect.arrayContaining(['Forest Road', 'Old River Road', 'Housing Plot Ferry']));

    const minimapHtml = Minimap(state);
    expect(minimapHtml).toContain('data-map-marker="landmark:bank-sign"');
    expect(minimapHtml).toContain('data-map-marker="landmark:smith-smoke"');
    expect(minimapHtml).toContain('data-map-marker="landmark:market-sign"');
    expect(minimapHtml).toContain('data-map-marker="portal:portal_forest"');
    expect(minimapHtml).toContain('data-map-marker="portal:portal_road"');
  });
});

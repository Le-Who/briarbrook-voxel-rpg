import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../../game/GameState';
import { createGameUISnapshot } from '../bridge/selectors';
import { uiPanelRegistry } from '../bridge/uiPanelRegistry';
import { PlanningWorkspacesSurfaces } from '../windows/PlanningWorkspaces';

describe('React planning workspaces', () => {
  it('marks Profession Atlas and Adventure Map surfaces as React-owned', () => {
    expect(uiPanelRegistry.skills).toBe('react');
    expect(uiPanelRegistry.map).toBe('react');
  });

  it('renders Profession Atlas as a full planning workspace with pathway cards', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillView = 'atlas';
    state.ui.skillsViewMode = 'atlas';
    state.ui.skillProfessionFilter = 'ranger';

    const html = renderToStaticMarkup(<PlanningWorkspacesSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="skills"');
    expect(html).toContain('data-planning-workspace="profession-atlas"');
    expect(html).toContain('data-atlas-renderer="pathway-cards"');
    expect(html).toContain('Profession Atlas');
    expect(html).toContain('Pin Goal');
  });

  it('renders Adventure Map as a planning workspace with collision-safe marker labels', () => {
    const state = createInitialGameState();
    state.ui.panels.map = true;
    state.ui.minimapMode = 'expanded';
    state.world.discoveredAreas = ['town', 'bank', 'blacksmith', 'forest', 'road', 'housing'];

    const html = renderToStaticMarkup(<PlanningWorkspacesSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="map"');
    expect(html).toContain('data-planning-workspace="adventure-map"');
    expect(html).toContain('data-map-label-mode="icons-and-clusters"');
    expect(html).toContain('data-map-cluster="services"');
    expect(html).toContain('data-map-layer-toggle="services"');
  });
});

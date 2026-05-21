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
    expect(html).toContain('data-bb-fixed="header"');
    expect(html).toContain('data-bb-fixed="toolbar"');
    expect(html).toContain('data-bb-scroll="true"');
    expect(html).toContain('data-bb-layout="detail-pane"');
    expect(html).toContain('data-bb-fixed="footer"');
  });

  it('matches the REF_138 three-zone Profession Atlas shell without the old Skills tab chrome', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillView = 'atlas';
    state.ui.skillsViewMode = 'atlas';
    state.ui.skillProfessionFilter = 'ranger';

    const html = renderToStaticMarkup(<PlanningWorkspacesSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-atlas-layout="reference-138"');
    expect(html).toContain('data-atlas-zone="lenses"');
    expect(html).toContain('data-atlas-zone="contracts"');
    expect(html).toContain('data-atlas-zone="pathways"');
    expect(html).toContain('data-atlas-zone="detail"');
    expect(html).toContain('data-atlas-pathway-grid="cards"');
    expect(html).toContain('data-atlas-relationship-cues="directional"');
    expect(html).toContain('data-atlas-empty-darkness="false"');
    expect(html).toContain('data-atlas-card="next-step"');
    for (const section of ['goal', 'unlocks', 'skill-mix', 'activities', 'outputs', 'next-step', 'actions']) {
      expect(html).toContain(`data-atlas-detail-section="${section}"`);
    }
    for (const lens of ['Armsman', 'Ranger', 'Hedge Mage', 'Treasure Hunter', 'Field Medic', 'Town Smith', 'Builder', 'Provisioner']) {
      expect(html).toContain(lens);
    }
    expect(html).not.toContain('class="bb-panel-tabs bb-planning-tabs"');
  });

  it('uses production copy in the Profession Atlas instead of development status labels', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillView = 'atlas';
    state.ui.skillsViewMode = 'atlas';
    state.ui.skillProfessionFilter = 'ranger';

    const html = renderToStaticMarkup(<PlanningWorkspacesSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('Available');
    expect(html).toContain('Locked');
    expect(html).toContain('Practice in the world');
    expect(html).toContain('Hide Locked');
    expect(html).not.toContain('Implemented');
    expect(html).not.toContain('Future');
    expect(html).not.toContain('World practice');
    expect(html).not.toContain('full skills migration');
    expect(html).not.toContain('implemented or trainable');
  });

  it('honors the Town Smith profession lens alias used by saved state and screenshot presets', () => {
    const state = createInitialGameState();
    state.ui.panels.skills = true;
    state.ui.skillView = 'atlas';
    state.ui.skillsViewMode = 'atlas';
    state.ui.skillProfessionFilter = 'town_smith';

    const html = renderToStaticMarkup(<PlanningWorkspacesSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-atlas-layout="reference-138"');
    expect(html).toContain('<h3 class="bb-text bb-text--md bb-text--accent" data-ui-text="true">Town Smith</h3>');
    expect(html).toContain('Blacksmithing');
    expect(html).not.toContain('Blade, shield, stamina');
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
    expect(html).not.toContain('data-map-marker="service:town"');
    expect(html).toContain('data-map-layer-toggle="services"');
    expect(html).toContain('data-bb-fixed="header"');
    expect(html).toContain('data-bb-fixed="toolbar"');
    expect(html).toContain('data-bb-layout="detail-pane"');
  });
});

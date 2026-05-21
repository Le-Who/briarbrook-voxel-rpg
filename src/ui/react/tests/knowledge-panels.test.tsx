import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../../game/GameState';
import { createGameUISnapshot } from '../bridge/selectors';
import { uiPanelRegistry } from '../bridge/uiPanelRegistry';
import { KnowledgePanelsSurfaces } from '../windows/KnowledgePanelsSurfaces';

describe('React spellbook, crafting, market, and journal surfaces', () => {
  it('marks the dense knowledge panels as React-owned', () => {
    expect(uiPanelRegistry.spellbook).toBe('react');
    expect(uiPanelRegistry.crafting).toBe('react');
    expect(uiPanelRegistry.market).toBe('react');
    expect(uiPanelRegistry.journal).toBe('react');
  });

  it('renders spell cards as compact summaries with detail text in the detail pane', () => {
    const state = createInitialGameState();
    state.ui.panels.spellbook = true;
    state.ui.selectedSpellId = 'magic_arrow';

    const html = renderToStaticMarkup(<KnowledgePanelsSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="spellbook"');
    expect(html).toContain('data-dense-menu-layout="spellbook"');
    expect(html).toContain('data-spellbook-controls="left"');
    expect(html).toContain('data-spell-list="compact-rows"');
    expect(html).toContain('data-spell-row="summary"');
    expect(html).toContain('data-spell-detail-section="stats"');
    expect(html).toContain('data-spell-detail-section="reagents"');
    expect(html).toContain('data-react-window-draggable="true"');
    expect(html).toContain('data-window-drag-handle="true"');
    expect(html).toContain('data-spell-card="magic_arrow"');
    expect(html).toContain('data-spell-detail="magic_arrow"');
    expect(html).toContain('data-bb-layout="split-pane"');
    expect(html).toContain('data-bb-fixed="header"');
    expect(html).toContain('data-bb-fixed="toolbar"');
    expect(html).toContain('data-bb-scroll="true"');
    expect(html).toContain('data-bb-layout="detail-pane"');
    expect(html).toContain('data-bb-fixed="footer"');
    expect(html).not.toContain('class="spell-card-meta"');
    expect(html).not.toContain('bb-spell-card-grid');
    expect(html).not.toContain('Drag window');
  });

  it('renders crafting with a station dropdown and fixed action footer', () => {
    const state = createInitialGameState();
    state.ui.panels.crafting = true;

    const html = renderToStaticMarkup(<KnowledgePanelsSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="crafting"');
    expect(html).toContain('data-dense-menu-layout="crafting"');
    for (const section of ['requirements', 'output', 'queue', 'repairs', 'work-orders']) {
      expect(html).toContain(`data-crafting-detail-section="${section}"`);
    }
    expect(html).toContain('data-react-window-draggable="true"');
    expect(html).toContain('data-window-drag-handle="true"');
    expect(html).toContain('aria-label="Crafting station"');
    expect(html).toContain('data-crafting-footer="true"');
    expect(html).toContain('data-bb-scroll="true"');
    expect(html).toContain('data-bb-fixed="footer"');
    expect(html).not.toContain('class="craft-stations"');
    expect(html).not.toContain('Drag window');
  });

  it('renders market work orders as list plus detail, not dense columns', () => {
    const state = createInitialGameState();
    state.ui.panels.market = true;

    const html = renderToStaticMarkup(<KnowledgePanelsSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="market"');
    expect(html).toContain('data-dense-menu-layout="market"');
    expect(html).toContain('data-market-detail-section="requirements"');
    expect(html).toContain('data-market-detail-section="actions"');
    expect(html).toContain('data-react-window-draggable="true"');
    expect(html).toContain('data-window-drag-handle="true"');
    expect(html).toContain('data-market-order=');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-market-detail="true"');
    expect(html).toContain('data-bb-layout="detail-pane"');
    expect(html).toContain('data-bb-scroll="true"');
    expect(html).toContain('Work Orders');
    expect(html).not.toContain('class="market-columns"');
    expect(html).not.toContain('Drag window');
  });

  it('renders journal as section list, entries, and detail pane', () => {
    const state = createInitialGameState();
    state.ui.panels.journal = true;

    const html = renderToStaticMarkup(<KnowledgePanelsSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="journal"');
    expect(html).toContain('data-dense-menu-layout="journal"');
    expect(html).toContain('data-journal-entry-list="true"');
    expect(html).toContain('data-react-window-draggable="true"');
    expect(html).toContain('data-window-drag-handle="true"');
    expect(html).toContain('data-journal-layout="split"');
    expect(html).toContain('data-journal-detail="true"');
    expect(html).toContain('data-bb-scroll="true"');
    expect(html).toContain('data-bb-layout="detail-pane"');
    expect(html).not.toContain('Drag window');
  });
});

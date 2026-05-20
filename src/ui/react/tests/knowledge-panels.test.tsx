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
    expect(html).toContain('data-spell-card="magic_arrow"');
    expect(html).toContain('data-spell-detail="magic_arrow"');
    expect(html).toContain('data-bb-layout="split-pane"');
    expect(html).not.toContain('class="spell-card-meta"');
  });

  it('renders crafting with a station dropdown and fixed action footer', () => {
    const state = createInitialGameState();
    state.ui.panels.crafting = true;

    const html = renderToStaticMarkup(<KnowledgePanelsSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="crafting"');
    expect(html).toContain('aria-label="Crafting station"');
    expect(html).toContain('data-crafting-footer="true"');
    expect(html).not.toContain('class="craft-stations"');
  });

  it('renders market work orders as list plus detail, not dense columns', () => {
    const state = createInitialGameState();
    state.ui.panels.market = true;

    const html = renderToStaticMarkup(<KnowledgePanelsSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="market"');
    expect(html).toContain('data-market-detail="true"');
    expect(html).toContain('Work Orders');
    expect(html).not.toContain('class="market-columns"');
  });

  it('renders journal as section list, entries, and detail pane', () => {
    const state = createInitialGameState();
    state.ui.panels.journal = true;

    const html = renderToStaticMarkup(<KnowledgePanelsSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="journal"');
    expect(html).toContain('data-journal-layout="split"');
    expect(html).toContain('data-journal-detail="true"');
  });
});

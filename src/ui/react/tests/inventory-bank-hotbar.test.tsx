import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../../game/GameState';
import { InventoryBankHotbarSurfaces } from '../windows/InventoryBankHotbarSurfaces';
import { createGameUISnapshot } from '../bridge/selectors';
import { uiPanelRegistry } from '../bridge/uiPanelRegistry';

describe('React inventory, bank, and hotbar surfaces', () => {
  it('marks inventory, bank, and hotbar as React-owned panels', () => {
    expect(uiPanelRegistry.inventory).toBe('react');
    expect(uiPanelRegistry.bank).toBe('react');
    expect(uiPanelRegistry.hotbar).toBe('react');
  });

  it('renders inventory with primitives, scrollable slots, and fixed footer without cell metadata', () => {
    const state = createInitialGameState();
    state.ui.panels.inventory = true;
    state.ui.selectedInventorySlot = 0;

    const html = renderToStaticMarkup(<InventoryBankHotbarSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="inventory"');
    expect(html).toContain('data-bb-layout="window"');
    expect(html).toContain('data-bb-scroll="true"');
    expect(html).toContain('class="bb-slot-grid');
    expect(html).toContain('data-inventory-footer="true"');
    expect(html).toContain('data-item-drop-target="inventory:0"');
    expect(html).not.toContain('item-inspector');
    expect(html).not.toContain('data-inventory-layout="resizable-grid"');
  });

  it('renders bank storage actions and slot drop targets only when bank is open', () => {
    const state = createInitialGameState();
    state.ui.panels.bank = true;

    const html = renderToStaticMarkup(<InventoryBankHotbarSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="bank"');
    expect(html).toContain('Deposit Resources');
    expect(html).toContain('Take All');
    expect(html).toContain('data-item-drop-target="bank:0"');
  });

  it('renders ten readable hotbar slots with assignment and drop contracts', () => {
    const state = createInitialGameState();
    const html = renderToStaticMarkup(<InventoryBankHotbarSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="hotbar"');
    expect((html.match(/data-hotbar-drop=/g) ?? [])).toHaveLength(10);
    expect(html).toContain('data-hotbar-key="1"');
    expect(html).toContain('data-hotbar-key="0"');
    expect(html).toContain('aria-label="Hotbar"');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { bbTokens } from '../theme/tokens';
import {
  ActionFooter,
  Badge,
  DataList,
  DetailPane,
  EmptyState,
  GameWindow,
  IconButton,
  PanelTabs,
  PanelToolbar,
  ScrollArea,
  SlotGrid,
  SplitPane,
  StatusRow,
  Text
} from '../components/primitives';

describe('React layout primitives', () => {
  it('exports the Briarbrook token contract used by React panels', () => {
    expect(bbTokens.spacing).toMatchObject({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 });
    expect(bbTokens.breakpoints).toEqual({ compact: 1366, normal: 1600, wide: 1920 });
    expect(bbTokens.zIndex.tooltip).toBeGreaterThan(bbTokens.zIndex.modal);
  });

  it('composes complex windows from header, scroll body and footer primitives', () => {
    const markup = renderToStaticMarkup(
      <GameWindow
        title="Inventory"
        subtitle="Pack"
        actions={<IconButton label="Close">x</IconButton>}
        footer={<ActionFooter><button type="button">Use</button></ActionFooter>}
      >
        <ScrollArea>
          <SlotGrid columns="auto">
            <button type="button">A</button>
            <button type="button">B</button>
          </SlotGrid>
        </ScrollArea>
      </GameWindow>
    );

    expect(markup).toContain('class="bb-game-window');
    expect(markup).toContain('class="bb-panel-header');
    expect(markup).toContain('class="bb-scroll-area');
    expect(markup).toContain('class="bb-slot-grid');
    expect(markup).toContain('class="bb-action-footer');
  });

  it('keeps tabs, split panes and detail text in structured layout containers', () => {
    const onSelect = vi.fn();
    const markup = renderToStaticMarkup(
      <SplitPane
        start={<DataList items={[{ id: 'one', label: 'One' }]} />}
        end={<DetailPane title="Details"><Text tone="muted">Long text lives here.</Text></DetailPane>}
      >
        <PanelToolbar>
          <PanelTabs
            activeId="all"
            tabs={[
              { id: 'all', label: 'All' },
              { id: 'known', label: 'Known' }
            ]}
            onSelect={onSelect}
          />
        </PanelToolbar>
        <StatusRow label="State" value={<Badge tone="success">Ready</Badge>} />
        <EmptyState title="No selection" description="Choose an item to inspect." />
      </SplitPane>
    );

    expect(markup).toContain('class="bb-split-pane');
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('class="bb-detail-pane');
    expect(markup).toContain('class="bb-status-row');
    expect(markup).toContain('class="bb-empty-state');
  });
});

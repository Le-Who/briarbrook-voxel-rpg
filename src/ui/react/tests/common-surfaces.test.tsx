import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../../game/GameState';
import { createGameUISnapshot } from '../bridge/selectors';
import { uiPanelRegistry } from '../bridge/uiPanelRegistry';
import { CommonSurfaces } from '../windows/CommonSurfaces';

describe('React common UI surfaces', () => {
  it('marks Build Mode, Chat, Help, and Settings as React-owned', () => {
    expect(uiPanelRegistry.build).toBe('react');
    expect(uiPanelRegistry.chat).toBe('react');
    expect(uiPanelRegistry.help).toBe('react');
    expect(uiPanelRegistry.settings).toBe('react');
  });

  it('renders Build Mode as a dedicated build layout with a single warning surface', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'housing';
    state.ui.panels.build = true;
    state.buildMode.active = true;
    state.buildMode.valid = false;
    state.buildMode.message = 'Blocked by existing object.';

    const html = renderToStaticMarkup(<CommonSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="build"');
    expect(html).toContain('data-build-layout="dedicated"');
    expect(html).toContain('data-build-zone="catalog"');
    expect(html).toContain('data-build-zone="placement"');
    expect(html).toContain('data-build-zone="materials"');
    expect(html.match(/data-build-warning="true"/g)).toHaveLength(1);
  });

  it('renders Chat as a React scroll surface with collapse and unread state', () => {
    const state = createInitialGameState();
    state.ui.chatMode = 'collapsed';
    state.chat.push({ id: 'react-chat-system', channel: 'System', text: 'Bank closes at dusk.', tone: 'system', createdAt: 10 });

    const html = renderToStaticMarkup(<CommonSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="chat"');
    expect(html).toContain('data-chat-collapsed="true"');
    expect(html).toContain('data-chat-unread="');
  });

  it('renders Help and Settings with readable current setting rows and keybinding view', () => {
    const state = createInitialGameState();
    state.ui.panels.help = true;
    state.ui.uiScale = 1.15;
    state.ui.frameRateCapMode = '120';
    state.ui.movementMode = 'keyboardMouse';

    const html = renderToStaticMarkup(<CommonSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="help"');
    expect(html).toContain('data-react-panel="settings"');
    expect(html).toContain('data-settings-section="movement"');
    expect(html).toContain('data-settings-section="camera"');
    expect(html).toContain('data-settings-section="accessibility"');
    expect(html).toContain('data-keybinding-view="true"');
    expect(html).not.toContain('class="help-body"');
  });

  it('groups first-hour spell, tool, and housing guidance into scannable help sections', () => {
    const state = createInitialGameState();
    state.ui.panels.help = true;

    const html = renderToStaticMarkup(<CommonSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-help-section="first-hour"');
    expect(html).toContain('data-help-section="spell-tool-housing"');
    expect(html).toContain('data-help-item="spell-targeting"');
    expect(html).toContain('data-help-item="tool-targeting"');
    expect(html).toContain('data-help-item="housing-build"');
  });
});

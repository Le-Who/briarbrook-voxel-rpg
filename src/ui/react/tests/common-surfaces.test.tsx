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

  it('renders Build Mode as a spatial world overlay with palette, inspector, and action bar', () => {
    const state = createInitialGameState();
    state.player.currentArea = 'housing';
    state.ui.panels.build = true;
    state.buildMode.active = true;
    state.buildMode.valid = false;
    state.buildMode.message = 'Blocked by existing object.';

    const html = renderToStaticMarkup(<CommonSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="build"');
    expect(html).toContain('data-build-layout="spatial"');
    expect(html).toContain('data-build-zone="palette"');
    expect(html).toContain('data-build-zone="world"');
    expect(html).toContain('data-build-zone="inspector"');
    expect(html).toContain('data-build-zone="actions"');
    expect(html).toContain('data-build-world-overlay="true"');
    expect(html).toContain('data-build-ghost-projection="world"');
    expect(html).toContain('data-build-footprint=');
    expect(html).toContain('data-build-rotation=');
    expect(html).toContain('data-build-snap-state=');
    expect(html).toContain('data-bb-fixed="header"');
    expect(html).toContain('data-bb-fixed="toolbar"');
    expect(html).toContain('data-bb-scroll="true"');
    expect(html).toContain('data-bb-layout="detail-pane"');
    expect(html).toContain('data-bb-fixed="footer"');
    expect(html).toContain('Place');
    expect(html).toContain('Rotate');
    expect(html).toContain('Cancel');
    expect(html).toContain('Undo');
    expect(html).toContain('Move Last');
    expect(html).toContain('Snap');
    expect(html).not.toContain('bb-build-grid-preview');
    expect(html).not.toContain('Ghost</span>');
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

  it('renders expanded Chat with fixed chrome, scrollable log, and fixed input footer', () => {
    const state = createInitialGameState();
    state.ui.chatMode = 'expanded';
    state.chat.push({ id: 'react-chat-system', channel: 'System', text: 'Bank closes at dusk.', tone: 'system', createdAt: 10 });

    const html = renderToStaticMarkup(<CommonSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('data-react-panel="chat"');
    expect(html).toContain('data-bb-fixed="header"');
    expect(html).toContain('data-bb-fixed="toolbar"');
    expect(html).toContain('data-bb-scroll="true"');
    expect(html).toContain('data-bb-fixed="footer"');
    expect(html).toContain('data-chat-layout="player-chat"');
    expect(html).toContain('Local');
    expect(html).toContain('Party');
    expect(html).toContain('Guild');
    expect(html).toContain('Trade');
    expect(html).toContain('System');
    expect(html).toContain('data-chat-message-tone="system"');
    expect(html).not.toContain('Opacity');
    expect(html).not.toContain('Chat message cap');
    expect(html).not.toContain('TOGGLE_CHAT_CHANNEL');
    expect(html).not.toContain('Combat');
  });

  it('renders compact Chat as a smaller player chat frame with the same safe controls', () => {
    const state = createInitialGameState();
    state.ui.chatMode = 'compact';
    state.chat.push({ id: 'react-chat-system', channel: 'System', text: 'Bank closes at dusk.', tone: 'system', createdAt: 10 });

    const html = renderToStaticMarkup(<CommonSurfaces snapshot={createGameUISnapshot(state)} dispatchAction={() => ({ accepted: true })} />);

    expect(html).toContain('bb-react-chat--compact');
    expect(html).toContain('height:210px');
    expect(html).toContain('data-chat-layout="player-chat"');
    expect(html).toContain('data-chat-scroll="true"');
    expect(html).toContain('data-chat-input="true"');
    expect(html).not.toContain('Opacity');
    expect(html).not.toContain('Chat message cap');
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
    expect(html).toContain('data-bb-fixed="header"');
    expect(html).toContain('data-bb-scroll="true"');
    expect(html).toContain('data-bb-fixed="footer"');
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

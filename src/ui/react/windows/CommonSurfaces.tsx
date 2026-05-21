import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type HTMLAttributes, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode } from 'react';
import { buildPieces, itemDefs } from '../../../data/items';
import { bindingSummary } from '../../../game/InputActionMap';
import type { GameAction } from '../../../game/Actions';
import type { BuildPieceDef, CameraSmoothingMode, ChatMessage, ChatPanelMode, FrameRateCapMode, IconDescriptor, MovementMode, RecipeRequirement } from '../../../game/types';
import { renderIcon } from '../../../render/IconRenderer';
import { itemIconCategory, type IconVisualCategory } from '../../IconVisualSystem';
import type { GameUICommandResult } from '../bridge/commands';
import type { GameUISnapshot } from '../bridge/selectors';
import { useReactPanelRender } from '../components/renderMetrics';
import { ActionFooter, Badge, DetailPane, EmptyState, IconButton, PanelHeader, PanelTabs, PanelToolbar, ScrollArea, StatusRow, Text } from '../components/primitives';
import { useGameCommand, useGameSnapshot } from '../hooks/useGameSnapshot';
import { reactWindowDefinitions, resolveReactWindowLayout, type ReactWindowId, type ReactWindowRect } from './windowManagerV2';

type DispatchAction = (action: GameAction) => GameUICommandResult;
type BuildCategory = BuildPieceDef['category'];
type ChatChannel = ChatMessage['channel'];

const buildTabGroups: Array<{ id: BuildCategory; label: string; categories: BuildCategory[] }> = [
  { id: 'Walls', label: 'Walls', categories: ['Walls', 'Fences'] },
  { id: 'Floors', label: 'Floors', categories: ['Floors'] },
  { id: 'Doors', label: 'Doors', categories: ['Doors'] },
  { id: 'Roofs', label: 'Roofs', categories: ['Roofs'] },
  { id: 'Decor', label: 'Decor', categories: ['Decor'] },
  { id: 'Storage', label: 'Utility', categories: ['Storage', 'Crafting', 'Utility', 'Garden', 'Trophies'] }
];

const chatTabs: ChatChannel[] = ['Local', 'Party', 'Guild', 'Global', 'System'];
const chatTabLabels: Record<ChatChannel, string> = {
  Local: 'Local',
  Party: 'Party',
  Guild: 'Guild',
  Global: 'Trade',
  System: 'System',
  Rumors: 'System'
};
const movementModes: MovementMode[] = ['keyboard', 'mouse', 'keyboardMouse'];
const cameraSmoothingModes: CameraSmoothingMode[] = ['low', 'medium', 'high'];
const frameRateModes: FrameRateCapMode[] = ['60', '120', 'custom'];
const fallbackIcon: IconDescriptor = { shape: 'block', primary: '#8f8d84', secondary: '#5b5b59' };

export function CommonSurfaceLayer({ planningWorkspaceOpen = false }: { planningWorkspaceOpen?: boolean }): ReactElement {
  const snapshot = useGameSnapshot((next) => next);
  const commands = useGameCommand();
  return <CommonSurfaces snapshot={snapshot} dispatchAction={commands.dispatchAction} planningWorkspaceOpen={planningWorkspaceOpen} />;
}

export function CommonSurfaces({ snapshot, dispatchAction, planningWorkspaceOpen = false }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction; planningWorkspaceOpen?: boolean }): ReactElement {
  const showBuild = !planningWorkspaceOpen && (snapshot.buildMode.active || snapshot.windows.panels.build);
  const showHelpSettings = Boolean(snapshot.windows.panels.help || snapshot.windows.panels.settings);

  return (
    <>
      {showBuild ? <BuildWorkspace snapshot={snapshot} dispatchAction={dispatchAction} /> : null}
      <ChatSurface snapshot={snapshot} dispatchAction={dispatchAction} planningWorkspaceOpen={planningWorkspaceOpen} />
      {showHelpSettings ? <HelpSettingsWindow snapshot={snapshot} dispatchAction={dispatchAction} /> : null}
    </>
  );
}

function BuildWorkspace({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('build');
  const activeGroup = buildTabGroups.find((group) => group.categories.includes(snapshot.buildMode.selectedCategory)) ?? buildTabGroups[0];
  const pieces = buildPieces.filter((piece) => activeGroup.categories.includes(piece.category));
  const selected = buildPieces.find((piece) => piece.id === snapshot.buildMode.selectedPieceId) ?? pieces[0] ?? buildPieces[0];
  const warning = buildWarning(snapshot, selected);
  const footprint = `${selected.size.x} x ${selected.size.z}`;

  return (
    <section className="bb-build-workspace" data-react-panel="build" data-ui-window="true" data-build-layout="spatial" aria-label="Build Mode">
      <aside className="bb-build-palette" data-build-zone="palette">
        <PanelHeader
          className="bb-build-palette-header"
          title="Build Mode"
          subtitle="Player Plot"
          actions={<IconButton label="Close build mode" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_BUILD_MODE', active: false })}>x</IconButton>}
        />
        <PanelTabs
          className="bb-build-tabs"
          tabs={buildTabGroups.map((group) => ({ id: group.id, label: group.label }))}
          activeId={activeGroup.id}
          onSelect={(id) => {
            const nextGroup = buildTabGroups.find((group) => group.id === id) ?? activeGroup;
            const nextPiece = buildPieces.find((piece) => nextGroup.categories.includes(piece.category)) ?? selected;
            dispatchAction({ type: 'SET_BUILD_PIECE', pieceId: nextPiece.id, category: nextGroup.id });
          }}
        />
        <ScrollArea className="bb-build-piece-scroll">
          <div className="bb-build-piece-grid">
            {pieces.map((piece) => (
              <button
                className={`bb-build-piece-card ${piece.id === selected.id ? 'is-selected' : ''}`.trim()}
                type="button"
                key={piece.id}
                data-build-piece={piece.id}
                onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_BUILD_PIECE', pieceId: piece.id, category: piece.category })}
              >
                <IconGlyph icon={piece.icon} label={piece.name} category="housing-item" />
                <span>{piece.name}</span>
                <small>{piece.size.x}x{piece.size.z}</small>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>
      <main
        className={`bb-build-world-overlay ${snapshot.buildMode.valid ? 'is-valid' : 'is-invalid'}`.trim()}
        data-build-zone="world"
        data-build-world-overlay="true"
        data-build-ghost-projection="world"
        data-build-footprint={footprint}
        data-build-rotation={snapshot.buildMode.rotation}
        data-build-snap-state={snapshot.buildMode.snapToGrid ? 'on' : 'off'}
      >
        <PanelToolbar className="bb-build-world-controls">
          <Badge tone={snapshot.buildMode.active ? 'success' : 'warning'}>{snapshot.buildMode.active ? 'Active' : 'Inactive'}</Badge>
          <Text tone="muted">Place on the plot grid</Text>
          <Text tone="muted">Footprint {footprint}</Text>
          <Text tone="muted">Rotation {snapshot.buildMode.rotation} deg</Text>
        </PanelToolbar>
        <div className="bb-build-world-state">
          <Text as="strong" tone="accent">{selected.name}</Text>
          <span>{snapshot.buildMode.snapToGrid ? 'Snap on' : 'Snap off'}</span>
          {warning ? (
            <div className="bb-build-warning" data-build-warning="true" role="status">
              {warning}
            </div>
          ) : (
            <div className="bb-build-ready" data-build-warning="false">Placement ready.</div>
          )}
        </div>
      </main>
      <DetailPane className="bb-build-inspector" data-build-zone="inspector" title={selected.name}>
        <ScrollArea>
          <Text as="p" size="sm" tone="muted">{selected.description}</Text>
          <StatusRow label="Category" value={selected.category} />
          <StatusRow label="Blocks movement" value={selected.blocksMovement ? 'Yes' : 'No'} />
          <Text as="strong" tone="accent">Material cost</Text>
          <div className="bb-build-cost-list">
            {selected.cost.map((cost) => <BuildCostRow key={cost.itemId} requirement={cost} snapshot={snapshot} />)}
          </div>
          <StatusRow label="Footprint" value={footprint} />
          <StatusRow label="Snap" value={snapshot.buildMode.snapToGrid ? 'On grid' : 'Free'} />
          <StatusRow label="Rotation" value={`${snapshot.buildMode.rotation} deg`} />
          <StatusRow label="Requirement" value={warning || 'Ready'} />
        </ScrollArea>
      </DetailPane>
      <ActionFooter className="bb-build-actions" data-build-zone="actions">
        <button type="button" className="primary" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'PLACE_BUILDING' })}>Place</button>
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'ROTATE_BUILDING', delta: 90 })}>Rotate</button>
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_BUILD_MODE', active: false })}>Cancel</button>
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'UNDO_LAST_BUILDING' })}>Undo</button>
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'BEGIN_MOVE_LAST_BUILDING' })}>Move Last</button>
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_BUILD_SNAP' })}>Snap {snapshot.buildMode.snapToGrid ? 'On' : 'Off'}</button>
      </ActionFooter>
    </section>
  );
}

function BuildCostRow({ requirement, snapshot }: { requirement: RecipeRequirement; snapshot: GameUISnapshot }): ReactElement {
  const def = itemDefs[requirement.itemId];
  const have = inventoryCount(snapshot, requirement.itemId);
  const ready = have >= requirement.quantity;
  return (
    <div className={`bb-build-cost-row ${ready ? 'is-ready' : 'is-missing'}`.trim()}>
      <IconGlyph icon={def?.icon ?? fallbackIcon} label={def?.name ?? requirement.itemId} category={def ? itemIconCategory(def) : 'resource'} />
      <span>{def?.name ?? requirement.itemId}</span>
      <b>{have}/{requirement.quantity}</b>
    </div>
  );
}

function ChatSurface({ snapshot, dispatchAction, planningWorkspaceOpen }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction; planningWorkspaceOpen: boolean }): ReactElement {
  useReactPanelRender('chat');
  const effectiveMode = planningWorkspaceOpen && snapshot.chat.mode === 'expanded' ? 'compact' : snapshot.chat.mode;
  const unreadCount = snapshot.chat.messages.slice(-12).filter((message) => message.channel === 'System' || message.channel === 'Rumors' || message.tone === 'danger').length;

  if (effectiveMode === 'collapsed') {
    return (
      <button
        className={`bb-react-chat-collapsed ${unreadCount ? 'has-unread' : ''}`.trim()}
        type="button"
        data-react-panel="chat"
        data-chat-collapsed="true"
        data-chat-unread={unreadCount}
        aria-label="Open chat"
        onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_CHAT_MODE', mode: 'compact' })}
      >
        <span>Chat</span>
        {unreadCount ? <b>{unreadCount}</b> : null}
      </button>
    );
  }

  return <ChatWindow snapshot={snapshot} dispatchAction={dispatchAction} effectiveMode={effectiveMode === 'combatHidden' ? 'compact' : effectiveMode} unreadCount={unreadCount} />;
}

function ChatWindow({ snapshot, dispatchAction, effectiveMode, unreadCount }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction; effectiveMode: Exclude<ChatPanelMode, 'collapsed' | 'combatHidden'>; unreadCount: number }): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottom = useRef(true);
  const hiddenChannels = useMemo(() => new Set(snapshot.chat.hiddenChannels), [snapshot.chat.hiddenChannels]);
  const messages = useMemo(() => {
    const retained = snapshot.chat.messages.slice(-snapshot.chat.retention);
    return retained.filter((message) => chatMessageMatchesTab(message, snapshot.chat.tab, hiddenChannels)).slice(effectiveMode === 'compact' ? -32 : -80);
  }, [effectiveMode, hiddenChannels, snapshot.chat.messages, snapshot.chat.retention, snapshot.chat.tab]);
  const drag = useDraggableRect('chat', dispatchAction);
  const activeTab = chatTabs.includes(snapshot.chat.tab) ? snapshot.chat.tab : 'System';
  const activeLabel = chatTabLabels[activeTab];
  const style = chatWindowStyle(drag.style, effectiveMode, snapshot.chat.opacity);

  useEffect(() => {
    if (shouldStickToBottom.current && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages.length, snapshot.chat.tab]);

  return (
    <section className={`bb-react-chat bb-react-chat--${effectiveMode}`} data-react-panel="chat" data-ui-window="true" data-chat-layout="player-chat" data-chat-mode={snapshot.chat.mode} data-chat-autoscroll="bottom-only" style={style}>
      <header className="bb-panel-header bb-react-chat-header" data-bb-fixed="header" {...drag.headerProps}>
        <div className="bb-panel-header__title">
          <Text as="h2" size="lg" tone="accent">Chat</Text>
          <Text size="sm" tone="muted">{activeLabel}{unreadCount ? ` - ${unreadCount} unread` : ''}</Text>
        </div>
        <div className="bb-panel-header__actions" data-no-window-drag="true">
          <ChatModeButton mode={effectiveMode === 'expanded' ? 'compact' : 'expanded'} label={effectiveMode === 'expanded' ? 'Compact' : 'Expand'} activeMode={snapshot.chat.mode} dispatchAction={dispatchAction} />
          <ChatModeButton mode="collapsed" label="-" activeMode={snapshot.chat.mode} dispatchAction={dispatchAction} ariaLabel="Collapse chat" />
        </div>
      </header>
      {snapshot.chat.showTabs ? (
        <PanelTabs
          className="bb-react-chat-tabs"
          tabs={chatTabs.map((tab) => ({ id: tab, label: chatTabLabels[tab] }))}
          activeId={activeTab}
          onSelect={(id) => dispatchAction({ type: 'SET_CHAT_TAB', channel: id as ChatChannel })}
        />
      ) : null}
      <div
        className="bb-scroll-area bb-react-chat-log"
        ref={logRef}
        data-bb-scroll="true"
        data-ui-scroll="true"
        data-chat-scroll="true"
        data-total-rows={messages.length}
        onScroll={(event) => {
          const element = event.currentTarget;
          shouldStickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 12;
        }}
      >
        {messages.map((message) => <ChatLine key={message.id} message={message} />)}
        {messages.length === 0 ? <EmptyState title="No messages" description="This channel has no visible messages." /> : null}
      </div>
      <form className="bb-react-chat-input" data-bb-fixed="footer" data-chat-focus="isolated" data-chat-input="true" onSubmit={(event) => submitChat(event, inputRef, dispatchAction)}>
        <input ref={inputRef} name="chat" autoComplete="off" aria-label="Chat message" placeholder="Say something..." onKeyDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}

function HelpSettingsWindow({ snapshot, dispatchAction }: { snapshot: GameUISnapshot; dispatchAction: DispatchAction }): ReactElement {
  useReactPanelRender('help');
  return (
    <section className="bb-react-help-settings bb-game-window" data-bb-layout="window" data-react-panel="help" data-ui-window="true" style={windowStyle('help')}>
      <PanelHeader
        title={snapshot.windows.panels.settings ? 'Settings' : 'Help / Settings'}
        subtitle={`UI ${Math.round(snapshot.settings.uiScale * 100)}% - ${movementLabel(snapshot.settings.movementMode)}`}
        actions={<IconButton label="Close help" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_PANEL', panel: 'help', open: false })}>x</IconButton>}
      />
      <div className="bb-game-window__body">
        <div className="bb-help-settings-grid">
          <ScrollArea className="bb-react-help-panel">
            <HelpSection title="First Ten Minutes" id="first-hour">
              <HelpRow label="Route" value="Mira, kit, Skills, tools, bank, road, crypt clue, work order, housing." />
              <HelpRow label="Move" value={movementHelp(snapshot.settings.movementMode)} />
              <HelpRow label="Interact" value={snapshot.settings.movementMode === 'mouse' ? 'Click target' : 'E or click target'} />
              <HelpRow label="Hotbar" value="1-0" />
            </HelpSection>
            <HelpSection title="Spell / Tool / Housing" id="spell-tool-housing">
              <HelpRow label="Spells" value="Select a known spell, then Target/Cast or drag it to the hotbar." data-help-item="spell-targeting" />
              <HelpRow label="Tools" value="Use axe or pickaxe, then click a matching tree or rock face." data-help-item="tool-targeting" />
              <HelpRow label="Housing" value="Take the ferry, enter Build Mode, keep the ghost inside the plot, then Place." data-help-item="housing-build" />
            </HelpSection>
            <HelpSection title="Panels" id="panels">
              <HelpRow label="Inventory" value="I" />
              <HelpRow label="Skills" value="K" />
              <HelpRow label="Spellbook" value="M" />
              <HelpRow label="Journal" value="J" />
              <HelpRow label="Pause / Help" value="Esc" />
            </HelpSection>
            <HelpSection title="Current UI" id="current-ui">
              <HelpRow label="Tooltips" value={`${snapshot.settings.tooltipMode}, ${snapshot.settings.tooltipDelayMs}ms delay`} />
              <HelpRow label="Frame cap" value={frameRateLabel(snapshot.settings.frameRateCapMode, snapshot.settings.customFrameRateCap)} />
              <HelpRow label="Camera" value={`${snapshot.settings.cameraSmoothing} smoothing${snapshot.settings.cameraRelativeMovement ? ', relative movement' : ''}`} />
            </HelpSection>
          </ScrollArea>
          <ScrollArea className="bb-react-settings-panel" data-react-panel="settings" data-settings-persist="simulation-ui-state">
            <Text as="strong" tone="accent">Settings</Text>
            <SettingsSection title="Movement" id="movement">
              <ButtonGroup options={movementModes} active={snapshot.settings.movementMode} labelFor={movementLabel} onSelect={(mode) => dispatchAction({ type: 'SET_MOVEMENT_MODE', mode })} />
            </SettingsSection>
            <SettingsSection title="Camera" id="camera">
              <ButtonGroup options={cameraSmoothingModes} active={snapshot.settings.cameraSmoothing} labelFor={titleCase} onSelect={(mode) => dispatchAction({ type: 'SET_CAMERA_SMOOTHING', mode })} />
              <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_CAMERA_RELATIVE_MOVEMENT' })}>{snapshot.settings.cameraRelativeMovement ? 'World Axis' : 'Camera Relative'}</button>
            </SettingsSection>
            <SettingsSection title="Interface" id="interface">
              <Stepper label="UI Scale" value={`${Math.round(snapshot.settings.uiScale * 100)}%`} onDown={(event) => dispatchClick(event, dispatchAction, { type: 'SET_UI_SCALE', scale: snapshot.settings.uiScale - 0.05 })} onUp={(event) => dispatchClick(event, dispatchAction, { type: 'SET_UI_SCALE', scale: snapshot.settings.uiScale + 0.05 })} />
              <Stepper label="Font Size" value={`${Math.round(snapshot.settings.fontScale * 100)}%`} onDown={(event) => dispatchClick(event, dispatchAction, { type: 'SET_FONT_SCALE', scale: snapshot.settings.fontScale - 0.05 })} onUp={(event) => dispatchClick(event, dispatchAction, { type: 'SET_FONT_SCALE', scale: snapshot.settings.fontScale + 0.05 })} />
              <Stepper label="Tooltip Delay" value={`${snapshot.settings.tooltipDelayMs}ms`} onDown={(event) => dispatchClick(event, dispatchAction, { type: 'SET_TOOLTIP_DELAY', delayMs: snapshot.settings.tooltipDelayMs - 100 })} onUp={(event) => dispatchClick(event, dispatchAction, { type: 'SET_TOOLTIP_DELAY', delayMs: snapshot.settings.tooltipDelayMs + 100 })} />
              <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_TOOLTIP_MODE', mode: snapshot.settings.tooltipMode === 'advanced' ? 'compact' : 'advanced' })}>{snapshot.settings.tooltipMode === 'advanced' ? 'Compact Tooltips' : 'Advanced Tooltips'}</button>
            </SettingsSection>
            <SettingsSection title="FPS Cap" id="performance">
              <ButtonGroup options={frameRateModes} active={snapshot.settings.frameRateCapMode} labelFor={(mode) => (mode === 'custom' ? 'Custom' : `${mode} FPS`)} onSelect={(mode) => dispatchAction({ type: 'SET_FRAME_RATE_CAP_MODE', mode })} />
              <label className="bb-settings-number">
                Custom
                <input type="number" min={30} max={240} step={5} value={snapshot.settings.customFrameRateCap} onChange={(event) => dispatchAction({ type: 'SET_CUSTOM_FRAME_RATE_CAP', fps: Number(event.target.value) })} />
              </label>
            </SettingsSection>
            <SettingsSection title="Accessibility" id="accessibility">
              <ToggleButton active={snapshot.settings.reducedMotion} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_REDUCED_MOTION' })}>Reduced Motion</ToggleButton>
              <ToggleButton active={snapshot.settings.colorblindStatusColors} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_COLORBLIND_STATUS' })}>Status Colors</ToggleButton>
              <ToggleButton active={snapshot.settings.showDamageNumbers} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_DAMAGE_NUMBERS' })}>Damage Numbers</ToggleButton>
              <ToggleButton active={snapshot.settings.showSkillGainToasts} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_SKILL_GAIN_TOASTS' })}>Skill Toasts</ToggleButton>
            </SettingsSection>
            <SettingsSection title="Layout" id="layout">
              <StatusRow label="Preset" value={snapshot.settings.windowLayoutPreset} />
              <ToggleButton active={snapshot.settings.lockUILayout} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_LOCK_UI_LAYOUT' })}>Lock Layout</ToggleButton>
              <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'RESET_UI_LAYOUT' })}>Reset Layout</button>
            </SettingsSection>
            <SettingsSection title="Keybindings" id="keybindings">
              <div className="bb-keybinding-view" data-keybinding-view="true">
                {snapshot.settings.inputBindings.filter((binding) => binding.context === 'gameplay' || binding.context === 'ui').slice(0, 10).map((binding) => (
                  <StatusRow key={`${binding.context}:${binding.actionId}`} label={binding.label} value={bindingSummary(binding) || 'Unbound'} />
                ))}
              </div>
            </SettingsSection>
          </ScrollArea>
        </div>
      </div>
      <ActionFooter>
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SAVE_GAME' })}>Save</button>
        <button type="button" onClick={(event) => dispatchClick(event, dispatchAction, { type: 'TOGGLE_PAUSE' })}>{snapshot.windows.panels.help ? 'Pause / Resume' : 'Pause'}</button>
      </ActionFooter>
    </section>
  );
}

function ChatModeButton({ mode, label, activeMode, dispatchAction, ariaLabel }: { mode: ChatPanelMode; label: string; activeMode: ChatPanelMode; dispatchAction: DispatchAction; ariaLabel?: string }): ReactElement {
  return <button className={activeMode === mode ? 'is-active' : ''} type="button" aria-label={ariaLabel ?? label} onClick={(event) => dispatchClick(event, dispatchAction, { type: 'SET_CHAT_MODE', mode })}>{label}</button>;
}

function chatWindowStyle(baseStyle: CSSProperties, mode: Exclude<ChatPanelMode, 'collapsed' | 'combatHidden'>, opacity: number): CSSProperties {
  const next: CSSProperties = { ...baseStyle, ['--chat-opacity' as string]: opacity };
  if (mode !== 'compact') return next;
  const baseHeight = typeof baseStyle.height === 'number' ? baseStyle.height : Number(baseStyle.height) || 310;
  const compactHeight = Math.min(baseHeight, 210);
  const top = typeof baseStyle.top === 'number' ? baseStyle.top : Number(baseStyle.top);
  next.height = compactHeight;
  if (Number.isFinite(top)) next.top = top + Math.max(0, baseHeight - compactHeight);
  return next;
}

function ChatLine({ message }: { message: ChatMessage }): ReactElement {
  const tone = chatMessageTone(message);
  return (
    <div className={`bb-react-chat-line bb-react-chat-line--${tone}`} data-chat-channel={message.channel} data-chat-message-channel={message.channel} data-chat-message-tone={tone}>
      <time>{chatTimestamp(message.createdAt)}</time>
      <span>{message.speaker ? `${message.speaker}:` : chatTabLabels[message.channel]}</span>
      <p>{message.text}</p>
    </div>
  );
}

function chatMessageMatchesTab(message: ChatMessage, tab: ChatChannel, hiddenChannels: Set<ChatChannel>): boolean {
  if (hiddenChannels.has(message.channel)) return false;
  if (tab === 'Local') return message.channel === 'Local' || message.channel === 'System' || message.channel === 'Rumors';
  if (tab === 'System') return message.channel === 'System' || message.channel === 'Rumors';
  if (tab === 'Rumors') return message.channel === 'Rumors' || message.channel === 'System';
  return message.channel === tab;
}

function chatMessageTone(message: ChatMessage): NonNullable<ChatMessage['tone']> {
  if (message.tone) return message.tone;
  if (message.channel === 'Global') return 'trade';
  if (message.channel === 'Party' || message.channel === 'Guild') return 'party';
  if (message.channel === 'System' || message.channel === 'Rumors') return 'system';
  return 'normal';
}

function chatTimestamp(createdAt: number): string {
  const totalSeconds = Math.max(0, Math.floor(createdAt));
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
}

function HelpRow({ label, value, ...props }: { label: string; value: string } & HTMLAttributes<HTMLDivElement>): ReactElement {
  return <StatusRow label={label} value={value} {...props} />;
}

function HelpSection({ title, id, children }: { title: string; id: string; children: ReactNode }): ReactElement {
  return (
    <section className="bb-help-section" data-help-section={id}>
      <Text as="strong" tone="accent">{title}</Text>
      <div className="bb-help-section__rows">{children}</div>
    </section>
  );
}

function SettingsSection({ title, id, children }: { title: string; id: string; children: ReactNode }): ReactElement {
  return (
    <section className="bb-settings-section" data-settings-section={id}>
      <Text as="strong" tone="accent">{title}</Text>
      <div>{children}</div>
    </section>
  );
}

function ButtonGroup<T extends string>({ options, active, labelFor, onSelect }: { options: T[]; active: T; labelFor: (option: T) => string; onSelect: (option: T) => void }): ReactElement {
  return (
    <div className="bb-settings-button-group">
      {options.map((option) => (
        <button className={option === active ? 'is-active' : ''} type="button" key={option} onClick={() => onSelect(option)}>{labelFor(option)}</button>
      ))}
    </div>
  );
}

function Stepper({ label, value, onDown, onUp }: { label: string; value: string; onDown: (event: MouseEvent<HTMLButtonElement>) => void; onUp: (event: MouseEvent<HTMLButtonElement>) => void }): ReactElement {
  return (
    <div className="bb-settings-stepper">
      <span>{label}</span>
      <b>{value}</b>
      <button type="button" onClick={onDown}>-</button>
      <button type="button" onClick={onUp}>+</button>
    </div>
  );
}

function ToggleButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: (event: MouseEvent<HTMLButtonElement>) => void }): ReactElement {
  return <button className={active ? 'is-active' : ''} type="button" onClick={onClick}>{children}</button>;
}

function IconGlyph({ icon, label, category }: { icon: IconDescriptor; label: string; category: IconVisualCategory }): ReactElement {
  return <span className="bb-react-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: renderIcon(icon, label, category) }} />;
}

function buildWarning(snapshot: GameUISnapshot, selected: BuildPieceDef): string | null {
  if (snapshot.player.currentArea !== 'housing') return 'Travel to your housing plot before building.';
  const missing = selected.cost
    .map((requirement) => ({ requirement, have: inventoryCount(snapshot, requirement.itemId), name: itemDefs[requirement.itemId]?.name ?? requirement.itemId }))
    .filter(({ requirement, have }) => have < requirement.quantity);
  if (missing.length) return `Missing ${missing.map(({ requirement, have, name }) => `${requirement.quantity - have} ${name}`).join(', ')}.`;
  if (!snapshot.buildMode.valid) return snapshot.buildMode.message || 'Placement is blocked.';
  return null;
}

function inventoryCount(snapshot: GameUISnapshot, itemId: string): number {
  return snapshot.inventory.slots.reduce((sum, stack) => sum + (stack?.itemId === itemId ? stack.quantity : 0), 0);
}

function submitChat(event: FormEvent<HTMLFormElement>, inputRef: React.RefObject<HTMLInputElement | null>, dispatchAction: DispatchAction): void {
  event.preventDefault();
  event.stopPropagation();
  const input = inputRef.current;
  const text = input?.value ?? '';
  const result = dispatchAction({ type: 'SEND_CHAT', text });
  if (input && result.accepted) input.value = '';
}

function dispatchClick(event: MouseEvent<HTMLElement>, dispatchAction: DispatchAction, action: GameAction): void {
  event.preventDefault();
  event.stopPropagation();
  dispatchAction(action);
}

function useDraggableRect(id: ReactWindowId, dispatchAction: DispatchAction): { style: CSSProperties; headerProps: { onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void; onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void; onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void; onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void } } {
  const [rect, setRect] = useState<ReactWindowRect | null>(null);
  const activeDrag = useRef<{ pointerId: number; startX: number; startY: number; origin: ReactWindowRect } | null>(null);
  const currentRect = rect ?? defaultWindowRect(id);
  const style = rectStyle(id, currentRect);

  const finishDrag = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = activeDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextRect = clampRect(id, { ...drag.origin, x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY });
    setRect(nextRect);
    activeDrag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dispatchAction({ type: 'SET_WINDOW_LAYOUT', windowId: id as GameAction extends { type: 'SET_WINDOW_LAYOUT'; windowId: infer W } ? W : never, layout: { x: nextRect.x, y: nextRect.y, width: nextRect.width, height: nextRect.height } });
  };

  return {
    style,
    headerProps: {
      onPointerDown: (event) => {
        if (event.button !== 0 || isInteractiveTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        activeDrag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: currentRect };
      },
      onPointerMove: (event) => {
        const drag = activeDrag.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        setRect(clampRect(id, { ...drag.origin, x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY }));
      },
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag
    }
  };
}

function windowStyle(id: ReactWindowId): CSSProperties {
  return rectStyle(id, defaultWindowRect(id));
}

function rectStyle(id: ReactWindowId, rect: ReactWindowRect): CSSProperties {
  return {
    position: 'fixed',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    zIndex: reactWindowDefinitions[id].zLayer
  };
}

function defaultWindowRect(id: ReactWindowId): ReactWindowRect {
  const viewport = typeof window === 'undefined' ? { width: 1366, height: 768 } : { width: window.innerWidth, height: window.innerHeight };
  return resolveReactWindowLayout(id, null, viewport);
}

function clampRect(id: ReactWindowId, rect: ReactWindowRect): ReactWindowRect {
  const viewport = typeof window === 'undefined' ? { width: 1366, height: 768 } : { width: window.innerWidth, height: window.innerHeight };
  return resolveReactWindowLayout(id, rect, viewport);
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('button, input, textarea, select, a, [data-no-window-drag="true"]'));
}

function movementLabel(mode: MovementMode): string {
  if (mode === 'keyboard') return 'Keyboard';
  if (mode === 'mouse') return 'Mouse';
  return 'Keyboard + Mouse';
}

function movementHelp(mode: MovementMode): string {
  if (mode === 'mouse') return 'Click ground';
  if (mode === 'keyboardMouse') return 'WASD, arrows, or click ground';
  return 'WASD or arrows';
}

function frameRateLabel(mode: FrameRateCapMode, custom: number): string {
  return mode === 'custom' ? `${custom} FPS` : `${mode} FPS`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

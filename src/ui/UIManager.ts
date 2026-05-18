import { buildPieces, itemDefs } from '../data/items';
import { spellDefs } from '../data/spells';
import type { GameAction } from '../game/Actions';
import type { EquipmentSlot, GameState, HotbarBinding, Vec3 } from '../game/types';
import { worldLabelForEntity } from '../game/WorldFeedback';
import type { VoxelRenderer } from '../render/VoxelRenderer';
import { calculateDerivedStats } from '../systems/EquipmentSystem';
import { calculateWeight } from '../systems/InventorySystem';
import { inspectTargetForTool } from '../systems/ResourceSystem';
import { emitAudioHook } from '../audio/AudioHooks';
import { BankPanel } from './BankPanel';
import { BuildPanel } from './BuildPanel';
import { CharacterPanel } from './CharacterPanel';
import { CombatActionsPanel } from './CombatActionsPanel';
import { ChatPanel } from './ChatPanel';
import { CraftingPanel } from './CraftingPanel';
import { DevOverlay } from './DevOverlay';
import { GuidePanel } from './GuidePanel';
import { Hotbar } from './Hotbar';
import { HelpPanel } from './HelpPanel';
import { InventoryPanel } from './InventoryPanel';
import { JournalPanel } from './JournalPanel';
import { MarketBoardPanel } from './MarketBoardPanel';
import { MerchantPanel } from './MerchantPanel';
import { Minimap } from './Minimap';
import { QuestTracker } from './QuestTracker';
import { SkillsPanel } from './SkillsPanel';
import { SpellbookPanel } from './SpellbookPanel';
import { TargetFrame } from './TargetFrame';
import { TreasureMapPanel } from './TreasureMapPanel';
import { TradePanel } from './TradePanel';
import {
  evaluateDrop,
  hotbarBindingFromPayload,
  parseContainerDropTarget,
  payloadFromElement,
  payloadFromHotbarSource,
  type DragPayload,
  type DropTarget,
  type ItemContainerId
} from './DragPayload';
import { isEditableTarget, isScrollableTarget, WindowManager } from './WindowManager';

type Dispatch = (action: GameAction) => void;

declare global {
  interface Window {
    resetUiLayout?: () => void;
    briarbrookUI?: {
      resetUiLayout: () => void;
    };
  }
}

interface PendingHotbarDrag {
  pointerId: number;
  payload: DragPayload;
  startX: number;
  startY: number;
  sourceElement: HTMLElement;
  active: boolean;
  layer: HTMLElement | null;
  ghost: HTMLElement | null;
  status: HTMLElement | null;
  currentTarget: DropTarget | null;
}

type HotbarMenu =
  | { mode: 'assign'; payload: DragPayload; x: number; y: number }
  | { mode: 'slot'; slot: number; binding: HotbarBinding | null; x: number; y: number };

export function shouldShowMarketQuickButton(state: GameState): boolean {
  const gatheredGoods =
    Object.values(state.dev.telemetry.resourceYields).some((amount) => amount > 0) ||
    Boolean(state.quests.prepare_for_road?.objectives.some((objective) => objective.type === 'gather' && objective.progress > 0)) ||
    (state.player.skills.Lumberjacking?.lastGainAt ?? 0) > 0 ||
    (state.player.skills.Mining?.lastGainAt ?? 0) > 0;
  const economyTouched =
    state.dev.telemetry.marketTransactions > 0 ||
    state.dev.telemetry.workOrdersCompleted > 0 ||
    state.world.economy.transactionLog.some((entry) => entry.kind === 'market' || entry.kind === 'work_order');
  return state.player.completedQuestIds.includes('prepare_for_road') || state.world.discoveredAreas.includes('road') || gatheredGoods || economyTouched;
}

export class UIManager {
  private hud: HTMLDivElement;
  private labels: HTMLDivElement;
  private windowManager: WindowManager;
  private lastHud = '';
  private currentState: GameState | null = null;
  private uiPointerDown = false;
  private pendingHud: string | null = null;
  private hotbarDrag: PendingHotbarDrag | null = null;
  private hotbarAssignMenu: HotbarMenu | null = null;
  private highlightedDropTarget: HTMLElement | null = null;
  private openWindowSnapshot = new Set<string>();
  private windowSnapshotReady = false;

  constructor(private root: HTMLDivElement, private dispatch: Dispatch) {
    this.root.innerHTML = '<div class="hud-layer"></div><div class="label-layer"></div>';
    this.hud = this.root.querySelector('.hud-layer') as HTMLDivElement;
    this.labels = this.root.querySelector('.label-layer') as HTMLDivElement;
    this.windowManager = new WindowManager(this.root);
    const resetUiLayout = () => {
      this.windowManager.resetLayout(this.hud);
      this.closeHotbarAssignMenu();
    };
    window.resetUiLayout = resetUiLayout;
    window.briarbrookUI = { resetUiLayout };
    this.bindEvents();
  }

  render(state: GameState, renderer: VoxelRenderer): void {
    this.currentState = state;
    this.root.style.setProperty('--ui-scale', String(state.ui.uiScale ?? 1));
    this.root.classList.toggle('reduced-motion', Boolean(state.ui.reducedMotion));
    this.emitWindowAudioHooks(state);
    const hudHtml = this.renderHud(state);
    const active = document.activeElement;
    const editingUiField =
      active instanceof HTMLElement &&
      this.root.contains(active) &&
      (active.isContentEditable || active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement);
    if (!editingUiField && hudHtml !== this.lastHud) {
      if (this.uiPointerDown) {
        this.pendingHud = hudHtml;
      } else {
        this.replaceHud(hudHtml);
      }
    }
    this.labels.innerHTML = this.renderLabels(state, renderer);
  }

  private replaceHud(html: string): void {
    this.hud.innerHTML = html;
    this.lastHud = html;
    this.pendingHud = null;
    this.windowManager.decorate(this.hud);
    this.renderLocalOverlays();
  }

  private updateInputDebug(patch: Partial<GameState['dev']['input']> = {}): void {
    const windowDebug = this.windowManager.debugState(this.hud);
    const state = this.currentState;
    const pointerCapture = patch.pointerCapture === undefined ? this.hotbarPointerCaptureStatus() ?? windowDebug.pointerCapture : patch.pointerCapture;
    this.dispatch({
      type: 'UPDATE_INPUT_DEBUG',
      patch: {
        topmostWindow: windowDebug.topmostWindow,
        focusedWindow: windowDebug.topmostWindow,
        pointerCapture,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        uiScale: state?.ui.uiScale ?? 1,
        ...patch
      }
    });
  }

  private preventBrowserDefault(event: Event, reason: string): void {
    if (!event.cancelable) return;
    event.preventDefault();
    this.updateInputDebug({ lastPreventedDefault: reason });
  }

  private hotbarPointerCaptureStatus(): string | null {
    return this.hotbarDrag ? `hotbar:${this.hotbarDrag.pointerId}` : null;
  }

  private renderHud(state: GameState): string {
    return `${this.playerStatus(state)}
      ${TargetFrame(state)}
      ${Minimap(state)}
      ${HelpPanel(state)}
      ${CombatActionsPanel(state)}
      ${InventoryPanel(state)}
      ${JournalPanel(state)}
      ${MarketBoardPanel(state)}
      ${TreasureMapPanel(state)}
      ${this.statusPanel(state)}
      ${QuestTracker(state)}
      ${GuidePanel(state)}
      ${CharacterPanel(state)}
      ${SkillsPanel(state)}
      ${SpellbookPanel(state)}
      ${BankPanel(state)}
      ${TradePanel(state)}
      ${MerchantPanel(state)}
      ${CraftingPanel(state)}
      ${BuildPanel(state)}
      ${ChatPanel(state)}
      ${Hotbar(state)}
      ${this.actionProgress(state)}
      ${this.contextMenu(state)}
      ${this.damageIndicator(state)}
      ${this.areaFade(state)}
      ${DevOverlay(state)}
      <div class="prompt">${state.ui.prompt}</div>`;
  }

  private areaFade(state: GameState): string {
    const remaining = Math.max(0, state.ui.fadeUntil - state.clock);
    if (remaining <= 0) return '';
    const opacity = Math.min(0.72, remaining / 0.45);
    return `<div class="area-fade" style="opacity:${opacity.toFixed(2)}"></div>`;
  }

  private actionProgress(state: GameState): string {
    const casting = state.spellCasting;
    if (casting) {
      const spell = spellDefs[casting.spellId];
      const pct = Math.max(0, Math.min(100, 100 - (casting.remaining / casting.total) * 100));
      return `<div class="action-progress spell-progress"><b>${spell?.displayName ?? 'Casting'}</b><span>${Math.round(pct)}%</span><i style="width:${pct}%"></i></div>`;
    }
    const bandage = state.bandage;
    if (bandage) {
      const pct = Math.max(0, Math.min(100, 100 - (bandage.remaining / bandage.duration) * 100));
      return `<div class="action-progress bandage-progress"><b>Bandage</b><span>${Math.round(pct)}%</span><i style="width:${pct}%"></i></div>`;
    }
    const gathering = state.gathering;
    if (!gathering) {
      const action = state.player.actionState;
      if (action.kind === 'interacting' && action.duration > 0 && action.endsAt > state.clock) {
        const pct = Math.max(0, Math.min(100, ((state.clock - action.startedAt) / action.duration) * 100));
        const label = action.source?.startsWith('lockpick:') ? 'Lockpicking' : action.source?.startsWith('remove-trap:') ? 'Remove Trap' : action.source === 'detect-hidden' ? 'Detect Hidden' : 'Action';
        return `<div class="action-progress"><b>${label}</b><span>${Math.round(pct)}%</span><i style="width:${pct}%"></i></div>`;
      }
      return '';
    }
    const pct = Math.max(0, Math.min(100, 100 - (gathering.remaining / gathering.duration) * 100));
    return `<div class="action-progress"><b>${gathering.actionLabel}</b><span>${Math.round(pct)}%</span><i style="width:${pct}%"></i></div>`;
  }

  private contextMenu(state: GameState): string {
    const menu = state.ui.contextMenu;
    if (!menu) return '';
    const target = menu.target?.kind === 'entity' ? state.entities[menu.target.entityId] : null;
    const hostile = target?.kind === 'enemy';
    const social = target?.kind === 'npc' || target?.kind === 'social';
    const container = target?.kind === 'container';
    const options = [
      social ? ['talk', 'Talk'] : null,
      social ? ['trade', 'Trade'] : null,
      hostile ? ['attack', 'Attack'] : null,
      container ? ['detect_hidden', 'Detect Hidden'] : null,
      container && target.trap?.armed && target.trap.detected ? ['remove_trap', 'Remove Trap'] : null,
      container && target.locked ? ['lockpick', 'Lockpick'] : null,
      container ? ['snoop', 'Snoop'] : null,
      container ? ['steal', 'Steal'] : null,
      ['inspect', 'Inspect'],
      ['use_tool', 'Use Tool'],
      ['cast_spell', 'Cast Spell'],
      target ? ['follow', 'Follow'] : null,
      ['mark', 'Mark on Map']
    ].filter(Boolean) as Array<[string, string]>;
    return `<section class="context-menu" style="left:${menu.x}px;top:${menu.y}px">
      ${target ? `<b>${target.name}</b>` : `<b>Ground</b>`}
      ${options.map(([command, label]) => `<button data-context-command="${command}">${label}</button>`).join('')}
    </section>`;
  }

  private damageIndicator(state: GameState): string {
    const age = state.clock - state.combat.lastDamagedAt;
    if (age < 0 || age > 0.7) return '';
    const opacity = Math.max(0, 1 - age / 0.7).toFixed(2);
    return `<div class="damage-indicator" style="opacity:${opacity}"></div>`;
  }

  private playerStatus(state: GameState): string {
    const stats = calculateDerivedStats(state);
    const pct = (value: number, max: number) => Math.round(Math.max(0, Math.min(100, (value / max) * 100)));
    const flags = [
      state.player.combatProfile.hidden ? 'Hidden' : '',
      state.player.combatProfile.poison ? 'Poisoned' : '',
      state.bandage ? 'Bandaging' : '',
      state.player.downed.active ? 'Downed' : '',
      state.combat.defenseUntil > state.clock ? 'Defending' : '',
      state.realtime.pendingAction ? 'Queued' : '',
      state.player.actionState.kind !== 'idle' && state.player.actionState.kind !== 'hidden' ? state.player.actionState.kind : ''
    ].filter(Boolean);
    return `<section class="player-status">
      <div class="portrait"><div class="voxel-portrait"></div><b>Lv. ${state.player.level}</b></div>
      <div class="bars">
        <strong>${state.player.name}</strong>
        <div class="bar hp"><i style="width:${pct(state.player.health, stats.maxHealth)}%"></i><span>${Math.round(state.player.health)}/${stats.maxHealth}</span></div>
        <div class="bar mana"><i style="width:${pct(state.player.mana, stats.maxMana)}%"></i><span>${Math.round(state.player.mana)}/${stats.maxMana}</span></div>
        <div class="bar stamina"><i style="width:${pct(state.player.stamina, stats.maxStamina)}%"></i><span>${Math.round(state.player.stamina)}/${stats.maxStamina}</span></div>
        ${flags.length ? `<div class="combat-flags">${flags.map((flag) => `<span>${flag}</span>`).join('')}</div>` : ''}
        ${state.player.downed.active ? `<button class="respawn-button" data-action="respawn">Respawn</button>` : ''}
      </div>
      <div class="quick-buttons">
          ${([
            ['character', 'C'],
            ['skills', 'K'],
            ['inventory', 'I'],
            ['spellbook', 'M'],
            ['combatActions', 'A'],
            ['journal', 'J'],
            shouldShowMarketQuickButton(state) ? ['market', 'Market'] : null,
            ['help', '?']
          ].filter(Boolean) as Array<[string, string]>)
            .map(([panel, label]) => `<button data-action="toggle-panel" data-panel="${panel}">${label}</button>`)
            .join('')}
          ${state.player.currentArea === 'housing' || state.buildMode.active ? '<button data-action="toggle-build">Build</button>' : ''}
        </div>
    </section>`;
  }

  private statusPanel(state: GameState): string {
    if (!state.ui.panels.status) return '';
    const attrs = state.player.attributes;
    return `<section class="panel status-panel">
      <header><span>Status</span><button data-action="toggle-panel" data-panel="status">x</button></header>
      <div class="status-row"><span>World Time</span><b>${state.world.time.hour.toString().padStart(2, '0')}:${state.world.time.minute.toString().padStart(2, '0')}</b></div>
      <div class="status-row"><span>Phase</span><b>${state.world.time.phase}</b></div>
      <div class="status-row"><span>Events</span><b>${state.world.activeEvents.length}</b></div>
      ${Object.entries(attrs).map(([name, value]) => `<div class="status-row"><span>${name}</span><b>${value}</b></div>`).join('')}
      <div class="status-row muted"><span>Weight</span><b>${calculateWeight(state).toFixed(0)}/${calculateDerivedStats(state).carryCapacity.toFixed(0)}</b></div>
    </section>`;
  }

  private renderLabels(state: GameState, renderer: VoxelRenderer): string {
    const labels: string[] = [];
    const hoveredEntityId = state.ui.hoverTarget?.kind === 'entity' ? state.ui.hoverTarget.entityId : null;
    const add = (position: Vec3, html: string, cls = '') => {
      const screen = renderer.worldToScreen(position);
      if (!screen.visible) return;
      labels.push(`<div class="world-label ${cls}" style="left:${screen.x}px;top:${screen.y}px">${html}</div>`);
    };

    add({ ...state.player.position, y: state.player.position.y + 1.45 }, `<b>${this.attr(state.player.name)}</b>`, 'player-label');
    Object.values(state.entities).forEach((entity) => {
      if (entity.area !== state.player.currentArea) return;
      if (entity.kind === 'enemy' && entity.state === 'dead') return;
      if (entity.kind === 'resource' && entity.depleted) return;
      const distanceToPlayer = Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z);
      const decision = worldLabelForEntity(state, entity, { hoveredEntityId, distanceToPlayer });
      if (!decision) return;
      const labelY = entity.kind === 'enemy' ? 1.7 : entity.kind === 'resource' ? 2.05 : entity.kind === 'loot' ? 0.8 : 1.45;
      const html = this.renderWorldLabel(decision);
      add({ ...entity.position, y: entity.position.y + labelY }, html, decision.className);
    });
    if (state.ui.targeting?.toolItemId && state.ui.hoverTarget?.kind === 'tile') {
      const label = inspectTargetForTool(state, state.ui.targeting.toolItemId, state.ui.hoverTarget);
      if (label) {
        add({ ...state.ui.hoverTarget.position, y: state.ui.hoverTarget.position.y + 1.1 }, `<b>${label}</b>`, 'resource-label inspector-label target-hint');
      }
    }
    state.floatingTexts.forEach((text) => {
      if (Math.hypot(text.position.x - state.player.position.x, text.position.z - state.player.position.z) > 11) return;
      add(text.position, `<span style="color:${text.color}">${text.text}</span>`, 'floating-label');
    });
    return labels.join('');
  }

  private renderWorldLabel(decision: NonNullable<ReturnType<typeof worldLabelForEntity>>): string {
    const title = decision.healthPercent == null ? `<b>${this.attr(decision.title)}</b>` : `<span>${this.attr(decision.title)}</span>`;
    const detail = decision.detail ? `<small>${this.attr(decision.detail)}</small>` : '';
    const health = decision.healthPercent == null ? '' : `<i><b style="width:${Math.round(decision.healthPercent)}%"></b></i>`;
    return `${title}${detail}${health}`;
  }

  private emitWindowAudioHooks(state: GameState): void {
    const next = this.windowKeys(state);
    if (!this.windowSnapshotReady) {
      this.openWindowSnapshot = next;
      this.windowSnapshotReady = true;
      return;
    }
    next.forEach((key) => {
      if (!this.openWindowSnapshot.has(key)) emitAudioHook('window_open', { id: key });
    });
    this.openWindowSnapshot.forEach((key) => {
      if (!next.has(key)) emitAudioHook('window_close', { id: key });
    });
    this.openWindowSnapshot = next;
  }

  private windowKeys(state: GameState): Set<string> {
    const keys = new Set<string>();
    Object.entries(state.ui.panels).forEach(([key, open]) => {
      if (open) keys.add(key);
    });
    if (state.ui.trade) keys.add('trade');
    if (state.ui.merchant) keys.add('merchant');
    if (state.buildMode.active) keys.add('build');
    if (state.paused) keys.add('pause');
    return keys;
  }

  private bindEvents(): void {
    this.root.addEventListener(
      'contextmenu',
      (event) => {
        const target = event.target as HTMLElement | null;
        if (!target || isEditableTarget(target)) return;
        const slot = target.closest<HTMLElement>('[data-hotbar-drop]');
        if (slot?.dataset.hotbarDrop != null) {
          this.preventBrowserDefault(event, 'ui:hotbar-contextmenu');
          event.stopPropagation();
          this.openHotbarSlotMenu(Number(slot.dataset.hotbarDrop), event.clientX, event.clientY);
          return;
        }
        const source = target.closest<HTMLElement>('[data-hotbar-source]');
        const payload = source ? payloadFromElement(source, this.currentState ?? undefined) : null;
        if (payload) {
          this.preventBrowserDefault(event, 'ui:assign-contextmenu');
          event.stopPropagation();
          this.openHotbarAssignMenu(payload, event.clientX, event.clientY);
          return;
        }
        if (target.closest('.panel, .hotbar, .context-menu')) {
          this.preventBrowserDefault(event, 'ui:contextmenu');
        }
      },
      true
    );

    this.root.addEventListener(
      'dragstart',
      (event) => {
        if (!isEditableTarget(event.target)) this.preventBrowserDefault(event, 'ui:native-dragstart');
      },
      true
    );

    this.root.addEventListener(
      'selectstart',
      (event) => {
        if (!isEditableTarget(event.target)) this.preventBrowserDefault(event, 'ui:selectstart');
      },
      true
    );

    this.root.addEventListener(
      'wheel',
      (event) => {
        if (!isScrollableTarget(event.target)) this.preventBrowserDefault(event, 'ui:wheel');
      },
      { passive: false }
    );

    this.root.addEventListener(
      'pointerdown',
      (event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        this.uiPointerDown = true;
        if (this.hotbarAssignMenu && !target.closest('.hotbar-assign-menu')) this.closeHotbarAssignMenu();
        if (this.windowManager.handlePointerDown(event)) {
          this.updateInputDebug({
            mode: 'uiDragging',
            lastRawInput: 'ui:pointerdown',
            lastIntent: 'UI_DRAG_START:window',
            pointerCapture: this.windowManager.pointerCaptureStatus()
          });
          return;
        }
        this.beginHotbarDrag(event);
      },
      true
    );

    const releasePointer = () => {
      window.setTimeout(() => {
        this.uiPointerDown = false;
        if (this.pendingHud != null) this.replaceHud(this.pendingHud);
      }, 0);
    };
    window.addEventListener('pointermove', (event) => {
      if (this.windowManager.handlePointerMove(event)) {
        this.updateInputDebug({ mode: 'uiDragging', lastRawInput: 'ui:pointermove', lastIntent: 'UI_DRAG_MOVE:window', pointerCapture: this.windowManager.pointerCaptureStatus() });
        return;
      }
      this.updateHotbarDrag(event);
    });
    window.addEventListener('pointerup', (event) => {
      const endedWindowDrag = this.windowManager.handlePointerEnd(event);
      if (endedWindowDrag) {
        this.updateInputDebug({ mode: 'normal', lastRawInput: 'ui:pointerup', lastIntent: 'UI_DRAG_END:window', pointerCapture: null });
      }
      this.finishHotbarDrag(event, false);
      releasePointer();
    });
    window.addEventListener('pointercancel', (event) => {
      const canceledWindowDrag = this.windowManager.handlePointerEnd(event);
      if (canceledWindowDrag) {
        this.updateInputDebug({ mode: 'normal', lastRawInput: 'ui:pointercancel', lastIntent: 'UI_DRAG_CANCEL:window', pointerCapture: null });
      }
      this.finishHotbarDrag(event, true);
      releasePointer();
    });

    window.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape') return;
        const canceledDrag = this.cancelActiveDrag();
        const closedWindow = canceledDrag ? false : this.closeTopmostWindow();
        if (!canceledDrag && !closedWindow) return;
        this.preventBrowserDefault(event, 'ui:escape');
        event.stopImmediatePropagation();
      },
      true
    );
    window.addEventListener('resize', () => {
      this.windowManager.decorate(this.hud);
      this.updateInputDebug({ lastRawInput: 'ui:resize', lastIntent: 'UI_VIEWPORT_RESIZE' });
    });

    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest<HTMLElement>('button');
      if (!button) return;
      this.preventBrowserDefault(event, 'ui:button-click');
      emitAudioHook('ui_click', { id: button.dataset.action ?? button.dataset.hotbar ?? button.dataset.contextCommand ?? button.textContent?.trim().slice(0, 24) });
      this.updateInputDebug({ lastRawInput: 'ui:click', lastIntent: 'UI_CLICK' });

      const assignSlot = button.dataset.hotbarAssignSlot;
      if (assignSlot != null && this.hotbarAssignMenu) {
        const binding = this.hotbarAssignMenu.mode === 'assign' ? hotbarBindingFromPayload(this.hotbarAssignMenu.payload) : null;
        if (binding) this.dispatch({ type: 'SET_HOTBAR_SLOT', slot: Number(assignSlot), binding });
        this.closeHotbarAssignMenu();
        return;
      }
      const clearHotbarSlot = button.dataset.hotbarClearSlot;
      if (clearHotbarSlot != null) {
        this.dispatch({ type: 'CLEAR_HOTBAR_SLOT', slot: Number(clearHotbarSlot) });
        this.closeHotbarAssignMenu();
        return;
      }
      const selectedSpellSlot = button.dataset.hotbarSelectedSpellSlot;
      if (selectedSpellSlot != null) {
        this.dispatch({ type: 'SET_HOTBAR_SLOT', slot: Number(selectedSpellSlot), binding: { kind: 'spell', id: this.currentState?.ui.selectedSpellId ?? 'magic_arrow' } });
        this.closeHotbarAssignMenu();
        return;
      }
      const selectedItemSlot = button.dataset.hotbarSelectedItemSlot;
      if (selectedItemSlot != null) {
        const selectedSlot = this.currentState?.ui.selectedInventorySlot;
        const stack = selectedSlot == null ? null : this.currentState?.player.inventory.slots[selectedSlot];
        const item = stack ? this.hotbarBindingForItem(stack.itemId) : null;
        if (item) this.dispatch({ type: 'SET_HOTBAR_SLOT', slot: Number(selectedItemSlot), binding: item });
        this.closeHotbarAssignMenu();
        return;
      }

      const area = button.dataset.area;
      if (area) {
        this.dispatch({ type: 'SELECT_INVENTORY_SLOT', slot: null });
        this.dispatch({ type: 'SELECT_BANK_SLOT', slot: null });
        this.dispatch({ type: 'ENTER_AREA', areaId: area as GameState['player']['currentArea'] });
        return;
      }
      const hotbar = button.dataset.hotbar;
      if (hotbar != null) {
        this.dispatch({ type: 'USE_HOTBAR', slot: Number(hotbar) });
        return;
      }
      const invSlot = button.dataset.invSlot;
      if (invSlot != null) {
        const slot = Number(invSlot);
        const targeting = this.currentState?.ui.targeting;
        if (targeting?.mode === 'tool' && targeting.toolItemId) {
          this.dispatch({ type: 'USE_TOOL_ON_TARGET', toolItemId: targeting.toolItemId, target: { kind: 'inventory', owner: 'inventory', slot } });
          return;
        }
        this.dispatch({ type: 'SELECT_INVENTORY_SLOT', slot: this.currentState?.ui.selectedInventorySlot === slot ? null : slot });
        return;
      }
      const bankSlot = button.dataset.bankSlot;
      if (bankSlot != null) {
        const slot = Number(bankSlot);
        this.dispatch({ type: 'SELECT_BANK_SLOT', slot: this.currentState?.ui.selectedBankSlot === slot ? null : slot });
        return;
      }
      const tradeSlot = button.dataset.tradeSlot;
      if (tradeSlot != null) {
        this.dispatch({ type: 'MOVE_ITEM', from: 'trade-player', to: 'inventory', slot: Number(tradeSlot) });
        return;
      }
      const buySlot = button.dataset.buySlot;
      if (buySlot != null) {
        this.dispatch({ type: 'BUY_MERCHANT_ITEM', slot: Number(buySlot) });
        return;
      }
      const trainSkill = button.dataset.trainSkill;
      if (trainSkill) {
        this.dispatch({ type: 'TRAIN_SKILL', skillId: trainSkill });
        return;
      }
      const chatTab = button.dataset.chatTab;
      if (chatTab) {
        this.dispatch({ type: 'SET_CHAT_TAB', channel: chatTab as GameState['ui']['chatTab'] });
        return;
      }
      const marketCategory = button.dataset.marketCategory;
      if (marketCategory) {
        this.dispatch({ type: 'SET_MARKET_FILTER', category: marketCategory as GameState['ui']['marketCategory'] });
        return;
      }
      const journalTab = button.dataset.journalTab;
      if (journalTab) {
        this.dispatch({ type: 'SET_JOURNAL_TAB', tab: journalTab as GameState['ui']['journalTab'] });
        return;
      }
      const skillView = button.dataset.skillView;
      if (skillView === 'ledger' || skillView === 'atlas' || skillView === 'mastery') {
        this.dispatch({ type: 'SET_SKILL_VIEW', view: skillView });
        return;
      }
      const skillsView = button.dataset.skillsView;
      if (skillsView === 'ledger' || skillsView === 'atlas' || skillsView === 'milestones') {
        this.dispatch({ type: 'SET_SKILLS_VIEW_MODE', mode: skillsView });
        return;
      }
      const skillTrainableFilter = button.dataset.skillTrainableFilter;
      if (skillTrainableFilter === 'all' || skillTrainableFilter === 'trainable' || skillTrainableFilter === 'not_trainable') {
        this.dispatch({ type: 'SET_SKILL_TRAINABLE_FILTER', filter: skillTrainableFilter });
        return;
      }
      const skillRecentFilter = button.dataset.skillRecentFilter;
      if (skillRecentFilter === 'all' || skillRecentFilter === 'recent') {
        this.dispatch({ type: 'SET_SKILL_RECENT_FILTER', filter: skillRecentFilter });
        return;
      }
      const professionFilter = button.dataset.professionFilter;
      if (professionFilter) {
        this.dispatch({ type: 'SET_PROFESSION_FILTER', professionId: professionFilter });
        return;
      }
      const skillProfessionFilter = button.dataset.skillProfessionFilter;
      if (skillProfessionFilter) {
        this.dispatch({ type: 'SET_SKILL_PROFESSION_FILTER', filter: skillProfessionFilter as GameState['ui']['skillProfessionFilter'] });
        return;
      }
      const atlasZoom = button.dataset.atlasZoom;
      if (atlasZoom) {
        if (atlasZoom === 'reset') this.dispatch({ type: 'SET_PROFESSION_ATLAS_ZOOM', zoom: 1 });
        else this.dispatch({ type: 'SET_PROFESSION_ATLAS_ZOOM', zoom: (this.currentState?.ui.professionAtlasZoom ?? 1) + Number(atlasZoom) });
        return;
      }
      const atlasSkill = button.dataset.atlasSkill;
      if (atlasSkill) {
        this.dispatch({ type: 'SET_SKILL_VIEW', view: 'ledger' });
        this.dispatch({ type: 'SET_SKILL_GROUP', group: 'All' });
        this.dispatch({ type: 'SET_SKILL_SEARCH', search: atlasSkill });
        return;
      }
      const atlasSpell = button.dataset.atlasSpell;
      if (atlasSpell) {
        this.dispatch({ type: 'TOGGLE_PANEL', panel: 'spellbook', open: true });
        this.dispatch({ type: 'SELECT_SPELL', spellId: atlasSpell });
        this.dispatch({ type: 'SET_SKILL_VIEW', view: 'atlas' });
        return;
      }
      const atlasRecipe = button.dataset.atlasRecipe;
      if (atlasRecipe) {
        this.dispatch({ type: 'TOGGLE_PANEL', panel: 'crafting', open: true });
        this.dispatch({ type: 'SELECT_RECIPE', recipeId: atlasRecipe });
        return;
      }
      const atlasAction = button.dataset.atlasAction;
      if (atlasAction) {
        this.dispatch({ type: 'SHOW_PROMPT', message: button.dataset.description ?? atlasAction });
        return;
      }
      if (button.dataset.pinProfessionGoal) {
        this.dispatch({ type: 'PIN_PROFESSION_GOAL', goalId: button.dataset.pinProfessionGoal });
        return;
      }
      if (button.dataset.professionGoal) {
        this.dispatch({ type: 'PIN_PROFESSION_GOAL', goalId: button.dataset.professionGoal });
        return;
      }
      const recipe = button.dataset.recipe;
      if (recipe) {
        this.dispatch({ type: 'SELECT_RECIPE', recipeId: recipe });
        return;
      }
      const craftStation = button.dataset.craftStation;
      if (craftStation) {
        this.dispatch({ type: 'SET_CRAFT_STATION', stationType: craftStation as GameState['ui']['selectedStationType'] });
        return;
      }
      const spellCircle = button.dataset.spellCircle;
      if (spellCircle) {
        this.dispatch({ type: 'SET_SPELLBOOK_CIRCLE', circle: spellCircle === 'all' ? 'all' : Number(spellCircle) });
        return;
      }
      const spellbookCircle = button.dataset.spellbookCircle;
      if (spellbookCircle) {
        this.dispatch({ type: 'SET_SPELLBOOK_CIRCLE_FILTER', circle: spellbookCircle === 'all' ? 'all' : Number(spellbookCircle) });
        return;
      }
      const spellbookFilter = button.dataset.spellbookFilter;
      if (spellbookFilter === 'known' || spellbookFilter === 'all' || spellbookFilter === 'unknown') {
        this.dispatch({ type: 'SET_SPELLBOOK_FILTER', filter: spellbookFilter });
        return;
      }
      const spellbookKnowledge = button.dataset.spellbookKnowledge;
      if (spellbookKnowledge === 'known' || spellbookKnowledge === 'all' || spellbookKnowledge === 'unknown') {
        this.dispatch({ type: 'SET_SPELLBOOK_KNOWLEDGE_FILTER', filter: spellbookKnowledge });
        return;
      }
      const spellbookRole = button.dataset.spellbookRole;
      if (spellbookRole) {
        this.dispatch({ type: 'SET_SPELLBOOK_ROLE_FILTER', role: spellbookRole as GameState['ui']['spellbookRoleFilter'] });
        return;
      }
      const spellbookView = button.dataset.spellbookView;
      if (spellbookView === 'grid' || spellbookView === 'list' || spellbookView === 'circle') {
        this.dispatch({ type: 'SET_SPELLBOOK_VIEW_MODE', mode: spellbookView });
        return;
      }
      const spell = button.dataset.spell;
      if (spell) {
        this.dispatch({ type: 'SELECT_SPELL', spellId: spell });
        return;
      }
      const buildPiece = button.dataset.buildPiece;
      if (buildPiece) {
        this.dispatch({ type: 'SET_BUILD_PIECE', pieceId: buildPiece });
        return;
      }
      const buildCategory = button.dataset.buildCategory;
      if (buildCategory) {
        const first = buildPieces.find((piece) => piece.category === buildCategory)?.id;
        this.dispatch({ type: 'SET_BUILD_PIECE', pieceId: first ?? 'stone_wall', category: buildCategory as GameState['ui']['selectedBuildCategory'] });
        return;
      }
      const housingStorage = button.dataset.housingStorage;
      if (housingStorage) {
        this.dispatch({ type: 'SELECT_HOUSING_STORAGE', storageId: housingStorage });
        return;
      }
      const housingWithdraw = button.dataset.housingWithdraw;
      if (housingWithdraw) {
        const [storageId, slot] = housingWithdraw.split(':');
        this.dispatch({ type: 'WITHDRAW_HOUSING_SLOT', storageId, slot: Number(slot) });
        return;
      }
      const housingStorageUpgrade = button.dataset.housingStorageUpgrade;
      if (housingStorageUpgrade) {
        this.dispatch({ type: 'UPGRADE_HOUSING_STORAGE', storageId: housingStorageUpgrade });
        return;
      }
      const housingGarden = button.dataset.housingGarden;
      if (housingGarden) {
        this.dispatch({ type: 'HARVEST_HOUSING_GARDEN', buildingId: housingGarden });
        return;
      }
      const homeCraftStation = button.dataset.homeCraftStation;
      if (homeCraftStation) {
        this.dispatch({ type: 'SET_CRAFT_STATION', stationType: homeCraftStation as GameState['ui']['selectedStationType'] });
        this.dispatch({ type: 'TOGGLE_PANEL', panel: 'crafting', open: true });
        this.dispatch({ type: 'TOGGLE_PANEL', panel: 'inventory', open: true });
        return;
      }
      const skillGroup = button.dataset.skillGroup;
      if (skillGroup) {
        this.dispatch({ type: 'SET_SKILL_GROUP', group: skillGroup });
        return;
      }
      const skillMode = button.dataset.skillMode;
      if (skillMode) {
        this.dispatch({ type: 'SET_SKILL_MODE', skillId: skillMode, mode: (button.dataset.mode ?? 'lock') as GameState['player']['skills'][string]['mode'] });
        return;
      }
      const bardSkill = button.dataset.bardSkill;
      if (bardSkill === 'Peacemaking' || bardSkill === 'Provocation' || bardSkill === 'Discordance') {
        this.dispatch({ type: 'USE_BARD_SKILL', skillId: bardSkill });
        return;
      }
      const weaponAbility = button.dataset.weaponAbility;
      if (weaponAbility) {
        this.dispatch({ type: 'USE_WEAPON_ABILITY', abilityId: weaponAbility });
        return;
      }
      const repairSlot = button.dataset.repairSlot;
      if (repairSlot) {
        this.dispatch({ type: 'REPAIR_EQUIPPED_ITEM', slot: repairSlot as EquipmentSlot });
        return;
      }
      const workOrder = button.dataset.workOrder;
      if (workOrder) {
        this.dispatch({ type: 'COMPLETE_WORK_ORDER', orderId: workOrder });
        return;
      }
      const marketOrder = button.dataset.marketOrder;
      if (marketOrder) {
        this.dispatch({ type: 'FULFILL_MARKET_ORDER', orderId: marketOrder });
        return;
      }
      const completeQuest = button.dataset.completeQuest;
      if (completeQuest) {
        this.dispatch({ type: 'COMPLETE_QUEST', questId: completeQuest });
        return;
      }
      const devScene = button.dataset.devScene;
      if (devScene) {
        this.dispatch({ type: 'DEV_TELEPORT_SCENE', sceneId: devScene });
        return;
      }
      const devArea = button.dataset.devArea;
      if (devArea) {
        this.dispatch({ type: 'DEV_TELEPORT_AREA', areaId: devArea as GameState['player']['currentArea'] });
        return;
      }
      const devSpawnItem = button.dataset.devSpawnItem;
      if (devSpawnItem) {
        this.dispatch({ type: 'DEV_SPAWN_ITEM', itemId: devSpawnItem, quantity: 10 });
        return;
      }
      const devSpawnEnemy = button.dataset.devSpawnEnemy;
      if (devSpawnEnemy === 'Undead' || devSpawnEnemy === 'Bandit' || devSpawnEnemy === 'Beast' || devSpawnEnemy === 'Cultist') {
        this.dispatch({ type: 'DEV_SPAWN_ENEMY', enemyType: devSpawnEnemy });
        return;
      }
      const devAddGold = button.dataset.devAddGold;
      if (devAddGold) {
        this.dispatch({ type: 'DEV_ADD_GOLD', amount: Number(devAddGold) });
        return;
      }
      if (button.dataset.devResetResources) {
        this.dispatch({ type: 'DEV_RESET_RESOURCES' });
        return;
      }
      if (button.dataset.devStabilityKit) {
        this.dispatch({ type: 'DEV_SPAWN_ITEM', itemId: 'iron_bar', quantity: 10 });
        this.dispatch({ type: 'DEV_SPAWN_ITEM', itemId: 'logs', quantity: 10 });
        this.dispatch({ type: 'DEV_SPAWN_ITEM', itemId: 'rough_treasure_map', quantity: 1 });
        this.dispatch({ type: 'DEV_GIVE_SPELL', spellId: 'fireball' });
        this.dispatch({ type: 'DEV_GIVE_SPELL', spellId: 'cure' });
        this.dispatch({ type: 'DEV_SET_SKILL', skillId: 'Swordsmanship', value: 55 });
        this.dispatch({ type: 'DEV_SET_SKILL', skillId: 'Magery', value: 55 });
        this.dispatch({ type: 'DEV_RESET_RESOURCES' });
        this.dispatch({ type: 'SHOW_PROMPT', message: 'Stability gate kit added.' });
        return;
      }
      if (button.dataset.devOpenPanels) {
        ['inventory', 'spellbook', 'skills', 'journal', 'market', 'crafting', 'character', 'help', 'status', 'quest', 'guide', 'treasureMap', 'combatActions', 'build'].forEach((panel) => {
          this.dispatch({ type: 'TOGGLE_PANEL', panel, open: true });
        });
        return;
      }
      if (button.dataset.devCompleteQuestStep) {
        this.dispatch({ type: 'DEV_COMPLETE_QUEST_STEP' });
        return;
      }
      const devGiveSpell = button.dataset.devGiveSpell;
      if (devGiveSpell) {
        this.dispatch({ type: 'DEV_GIVE_SPELL', spellId: devGiveSpell });
        return;
      }
      const devTimePhase = button.dataset.devTimePhase;
      if (devTimePhase === 'dawn' || devTimePhase === 'day' || devTimePhase === 'dusk' || devTimePhase === 'night') {
        this.dispatch({ type: 'DEV_SIMULATE_TIME', phase: devTimePhase });
        return;
      }
      const devSkill = button.dataset.devSkill;
      if (devSkill) {
        this.dispatch({ type: 'DEV_SET_SKILL', skillId: devSkill, value: Number(button.dataset.value ?? 75) });
        return;
      }

      const action = button.dataset.action;
      const contextCommand = button.dataset.contextCommand;
      if (contextCommand) {
        this.dispatch({ type: 'CONTEXT_ACTION', command: contextCommand as 'talk' | 'trade' | 'attack' | 'inspect' | 'use_tool' | 'cast_spell' | 'detect_hidden' | 'remove_trap' | 'lockpick' | 'snoop' | 'steal' | 'follow' | 'mark' });
        return;
      }
      if (!action) return;
      this.handleAction(action, button);
    });

    this.root.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (form.dataset.action !== 'send-chat') return;
      this.preventBrowserDefault(event, 'ui:chat-submit');
      const input = form.querySelector<HTMLInputElement>('input[name="chat"]');
      this.dispatch({ type: 'SEND_CHAT', text: input?.value ?? '' });
      if (input) input.value = '';
    });

    this.root.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.dataset.action === 'trade-gold') {
        this.dispatch({ type: 'SET_TRADE_GOLD', side: 'player', amount: Number(target.value) });
      }
    });

    this.root.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.dataset.action === 'skill-search') {
        this.dispatch({ type: 'SET_SKILL_SEARCH', search: target.value });
        if (this.currentState) {
          this.replaceHud(this.renderHud(this.currentState));
          const search = this.root.querySelector<HTMLInputElement>('.skill-search');
          if (search) {
            search.focus();
            search.setSelectionRange(search.value.length, search.value.length);
          }
        }
      }
      if (target.dataset.action === 'market-search') {
        this.dispatch({ type: 'SET_MARKET_SEARCH', search: target.value });
        if (this.currentState) {
          this.replaceHud(this.renderHud(this.currentState));
          const search = this.root.querySelector<HTMLInputElement>('.market-search');
          if (search) {
            search.focus();
            search.setSelectionRange(search.value.length, search.value.length);
          }
        }
      }
      if (target.dataset.action === 'spell-search') {
        this.dispatch({ type: 'SET_SPELL_SEARCH', search: target.value });
        if (this.currentState) {
          this.replaceHud(this.renderHud(this.currentState));
          const search = this.root.querySelector<HTMLInputElement>('.spell-search');
          if (search) {
            search.focus();
            search.setSelectionRange(search.value.length, search.value.length);
          }
        }
      }
      if (target.dataset.action === 'spellbook-search') {
        this.dispatch({ type: 'SET_SPELLBOOK_SEARCH', search: target.value });
        if (this.currentState) {
          this.replaceHud(this.renderHud(this.currentState));
          const search = this.root.querySelector<HTMLInputElement>('.spellbook-search');
          if (search) {
            search.focus();
            search.setSelectionRange(search.value.length, search.value.length);
          }
        }
      }
    });

  }

  private beginHotbarDrag(event: PointerEvent): void {
    if (event.button !== 0 || isEditableTarget(event.target)) return;
    const target = event.target as HTMLElement | null;
    const sourceElement = target?.closest<HTMLElement>('[data-hotbar-source]');
    if (!sourceElement) return;
    const payload = payloadFromElement(sourceElement, this.currentState ?? undefined);
    if (!payload) return;
    sourceElement.setPointerCapture?.(event.pointerId);
    this.hotbarDrag = {
      pointerId: event.pointerId,
      payload,
      startX: event.clientX,
      startY: event.clientY,
      sourceElement,
      active: false,
      layer: null,
      ghost: null,
      status: null,
      currentTarget: null
    };
    this.updateInputDebug({ lastRawInput: 'ui:pointerdown', lastIntent: 'UI_DRAG_ARM:hotbar', pointerCapture: this.hotbarPointerCaptureStatus() });
  }

  private updateHotbarDrag(event: PointerEvent): boolean {
    const drag = this.hotbarDrag;
    if (!drag || drag.pointerId !== event.pointerId) return false;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active && distance < 6) return false;
    if (!drag.active) {
      drag.active = true;
      drag.sourceElement.classList.add('drag-source-active');
      const layer = this.createDragLayer(drag.payload, drag.sourceElement);
      drag.layer = layer.layer;
      drag.ghost = layer.ghost;
      drag.status = layer.status;
      document.body.appendChild(layer.layer);
      this.root.classList.add('hotbar-dragging');
      this.updateInputDebug({
        mode: drag.payload.kind === 'spell' ? 'spellDragging' : 'itemDragging',
        lastRawInput: 'ui:pointerdown',
        lastIntent: 'UI_DRAG_START',
        dragPayload: `${drag.payload.kind}:${drag.payload.displayName}`,
        pointerCapture: this.hotbarPointerCaptureStatus()
      });
    }
    this.moveDragGhost(drag.ghost, event.clientX, event.clientY);
    const target = this.dropTargetAt(event.clientX, event.clientY);
    drag.currentTarget = target;
    this.updateDropFeedback(target, evaluateDrop(drag.payload, target, this.currentState ?? undefined));
    this.updateInputDebug({ lastRawInput: 'ui:pointermove', lastIntent: 'UI_DRAG_MOVE', pointerCapture: this.hotbarPointerCaptureStatus() });
    this.preventBrowserDefault(event, 'ui:hotbar-drag');
    return true;
  }

  private finishHotbarDrag(event: PointerEvent, canceled: boolean): boolean {
    const drag = this.hotbarDrag;
    if (!drag || drag.pointerId !== event.pointerId) return false;
    const wasActive = drag.active;
    if (wasActive && !canceled) {
      const target = this.dropTargetAt(event.clientX, event.clientY);
      const evaluation = evaluateDrop(drag.payload, target, this.currentState ?? undefined);
      if (evaluation.ok && target) this.dispatchDrop(drag.payload, target);
      else if (evaluation.reason) this.dispatch({ type: 'SHOW_PROMPT', message: evaluation.reason });
      this.updateInputDebug({ lastRawInput: 'ui:pointerup', lastIntent: 'UI_DRAG_END', pointerCapture: this.hotbarPointerCaptureStatus() });
    }
    this.cleanupHotbarDrag();
    if (wasActive) this.preventBrowserDefault(event, 'ui:hotbar-drop');
    return wasActive;
  }

  private cancelActiveDrag(): boolean {
    const canceledHotbar = Boolean(this.hotbarDrag?.active);
    const canceledWindow = this.windowManager.cancelDrag();
    if (this.hotbarDrag) this.cleanupHotbarDrag();
    return canceledHotbar || canceledWindow;
  }

  private cleanupHotbarDrag(): void {
    if (!this.hotbarDrag) return;
    this.hotbarDrag.sourceElement.classList.remove('drag-source-active');
    this.hotbarDrag.layer?.remove();
    this.hotbarDrag.ghost?.remove();
    this.hotbarDrag = null;
    this.root.classList.remove('hotbar-dragging');
    this.highlightDropTarget(null, false);
    this.updateInputDebug({ mode: 'normal', dragPayload: null, pointerCapture: null });
  }

  private createDragLayer(payload: DragPayload, sourceElement: HTMLElement): { layer: HTMLElement; ghost: HTMLElement; status: HTMLElement } {
    const layer = document.createElement('div');
    layer.className = 'drag-layer';
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.innerHTML = sourceElement.innerHTML || `<span>${this.attr(payload.displayName)}</span>`;
    const status = document.createElement('div');
    status.className = 'drag-status';
    status.textContent = payload.displayName;
    layer.appendChild(ghost);
    layer.appendChild(status);
    return { layer, ghost, status };
  }

  private moveDragGhost(ghost: HTMLElement | null, x: number, y: number): void {
    if (!ghost) return;
    const layer = ghost.parentElement ?? ghost;
    layer.style.left = `${x + 12}px`;
    layer.style.top = `${y + 12}px`;
  }

  private dropTargetAt(x: number, y: number): DropTarget | null {
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!element) return null;
    const hotbar = element.closest<HTMLElement>('[data-hotbar-drop]');
    if (hotbar?.dataset.hotbarDrop != null) return { kind: 'hotbarSlot', slot: Number(hotbar.dataset.hotbarDrop), element: hotbar };
    const itemDrop = element.closest<HTMLElement>('[data-item-drop-target]');
    const parsed = parseContainerDropTarget(itemDrop?.dataset.itemDropTarget);
    if (itemDrop && parsed) return { kind: 'containerSlot', container: parsed.container, slot: parsed.slot, element: itemDrop };
    const equipment = element.closest<HTMLElement>('[data-equipment-slot]');
    if (equipment?.dataset.equipmentSlot) return { kind: 'equipmentSlot', slot: equipment.dataset.equipmentSlot as EquipmentSlot, element: equipment };
    const trade = element.closest<HTMLElement>('[data-trade-offer-drop]');
    if (trade) return { kind: 'tradeOffer', slot: trade.dataset.tradeOfferDrop ? Number(trade.dataset.tradeOfferDrop) : undefined, element: trade };
    return null;
  }

  private updateDropFeedback(target: DropTarget | null, evaluation: { ok: boolean; reason?: string }): void {
    this.highlightDropTarget(target?.element ?? null, !evaluation.ok);
    const status = this.hotbarDrag?.status;
    if (!status) return;
    status.textContent = evaluation.ok ? 'Release to drop' : evaluation.reason ?? 'Invalid drop';
    status.classList.toggle('invalid', !evaluation.ok);
  }

  private highlightDropTarget(element: HTMLElement | null, invalid: boolean): void {
    if (this.highlightedDropTarget === element) {
      this.highlightedDropTarget?.classList.toggle('drop-invalid', invalid);
      return;
    }
    this.highlightedDropTarget?.classList.remove('drag-over', 'drop-invalid');
    this.highlightedDropTarget = element;
    this.highlightedDropTarget?.classList.add('drag-over');
    this.highlightedDropTarget?.classList.toggle('drop-invalid', invalid);
  }

  private dispatchDrop(payload: DragPayload, target: DropTarget): void {
    if (target.kind === 'hotbarSlot') {
      if (payload.kind === 'hotbarSlot' && payload.sourceSlotId != null) {
        this.dispatch({ type: 'MOVE_HOTBAR_SLOT', from: payload.sourceSlotId, to: target.slot });
        return;
      }
      const binding = hotbarBindingFromPayload(payload);
      if (binding) this.dispatch({ type: 'SET_HOTBAR_SLOT', slot: target.slot, binding });
      return;
    }
    if (target.kind === 'containerSlot' && payload.kind === 'item' && payload.sourceSlotId != null) {
      this.dispatch({ type: 'MOVE_ITEM', from: payload.sourceWindowId as ItemContainerId, to: target.container, slot: payload.sourceSlotId, targetSlot: target.slot });
      this.dispatch({ type: 'SHOW_PROMPT', message: target.container === 'trade-player' ? 'Item added to your trade offer.' : 'Item moved.' });
      return;
    }
    if (target.kind === 'tradeOffer' && payload.kind === 'item' && payload.sourceSlotId != null) {
      this.dispatch({ type: 'MOVE_ITEM', from: 'inventory', to: 'trade-player', slot: payload.sourceSlotId, targetSlot: target.slot });
      this.dispatch({ type: 'SHOW_PROMPT', message: 'Item added to your trade offer.' });
      return;
    }
    if (target.kind === 'equipmentSlot' && payload.kind === 'item' && payload.sourceWindowId === 'inventory' && payload.sourceSlotId != null) {
      this.dispatch({ type: 'EQUIP_ITEM', slot: payload.sourceSlotId });
      this.dispatch({ type: 'SHOW_PROMPT', message: 'Item equipped.' });
    }
  }

  private openHotbarAssignMenu(payload: DragPayload, x: number, y: number): void {
    if (!hotbarBindingFromPayload(payload)) return;
    this.hotbarAssignMenu = {
      mode: 'assign',
      payload,
      x: Math.min(window.innerWidth - 188, Math.max(8, x)),
      y: Math.min(window.innerHeight - 258, Math.max(8, y))
    };
    this.renderLocalOverlays();
  }

  private openHotbarSlotMenu(slot: number, x: number, y: number): void {
    const binding = this.currentState?.ui.hotbar[slot] ?? null;
    this.hotbarAssignMenu = {
      mode: 'slot',
      slot,
      binding,
      x: Math.min(window.innerWidth - 216, Math.max(8, x)),
      y: Math.min(window.innerHeight - 220, Math.max(8, y))
    };
    this.renderLocalOverlays();
  }

  private closeHotbarAssignMenu(): void {
    this.hotbarAssignMenu = null;
    this.hud.querySelector('.hotbar-assign-menu')?.remove();
  }

  private renderLocalOverlays(): void {
    this.hud.querySelector('.hotbar-assign-menu')?.remove();
    if (!this.hotbarAssignMenu) return;
    const menu = document.createElement('section');
    menu.className = 'hotbar-assign-menu';
    menu.style.left = `${this.hotbarAssignMenu.x}px`;
    menu.style.top = `${this.hotbarAssignMenu.y}px`;
    if (this.hotbarAssignMenu.mode === 'assign') {
      const binding = hotbarBindingFromPayload(this.hotbarAssignMenu.payload);
      const label = binding ? `${binding.kind}: ${this.hotbarAssignMenu.payload.displayName}` : 'Selection';
      menu.innerHTML = `<b>Assign to hotbar</b><span>${this.attr(label)}</span><div>${Array.from({ length: 10 }, (_, index) => `<button data-hotbar-assign-slot="${index}">${index === 9 ? 0 : index + 1}</button>`).join('')}</div>`;
    } else {
      const slot = this.hotbarAssignMenu.slot;
      const selectedItem = this.selectedInventoryHotbarBinding();
      menu.innerHTML = `<b>Hotbar ${slot === 9 ? 0 : slot + 1}</b><span>${this.attr(this.bindingLabel(this.hotbarAssignMenu.binding) ?? 'Empty')}</span><div class="hotbar-slot-actions">
        ${this.hotbarAssignMenu.binding ? `<button data-hotbar-clear-slot="${slot}">Clear Slot</button>` : ''}
        <button data-hotbar-selected-spell-slot="${slot}">Assign Selected Spell</button>
        ${selectedItem ? `<button data-hotbar-selected-item-slot="${slot}">Assign Selected Item</button>` : ''}
      </div>`;
    }
    this.hud.appendChild(menu);
  }

  private selectedInventoryHotbarBinding(): HotbarBinding | null {
    const selectedSlot = this.currentState?.ui.selectedInventorySlot;
    const stack = selectedSlot == null ? null : this.currentState?.player.inventory.slots[selectedSlot];
    return stack ? this.hotbarBindingForItem(stack.itemId) : null;
  }

  private hotbarBindingForItem(itemId: string): HotbarBinding | null {
    const def = itemDefs[itemId];
    if (!def) return null;
    return { kind: def.type === 'tool' ? 'tool' : 'item', id: itemId };
  }

  private bindingLabel(binding: HotbarBinding | null): string | null {
    if (!binding) return null;
    if (binding.kind === 'spell') return spellDefs[binding.id]?.displayName ?? binding.id;
    if (binding.kind === 'item' || binding.kind === 'tool') return itemDefs[binding.id]?.name ?? binding.id;
    return binding.id;
  }

  private closeTopmostWindow(): boolean {
    const state = this.currentState;
    if (!state || state.ui.targeting || state.ui.contextMenu || state.ui.selectedInventorySlot != null || state.ui.selectedBankSlot != null) return false;
    const key = this.windowManager.topmostWindowKey(this.hud);
    if (!key) return false;
    if (key === 'build') {
      this.dispatch({ type: 'TOGGLE_BUILD_MODE', active: false });
      return true;
    }
    if (key === 'merchant') {
      this.dispatch({ type: 'CLOSE_MERCHANT' });
      return true;
    }
    if (key === 'trade') {
      this.dispatch({ type: 'CANCEL_TRADE' });
      return true;
    }
    if (key === 'help' && state.paused) {
      this.dispatch({ type: 'TOGGLE_PAUSE', paused: false });
      return true;
    }
    if (state.ui.panels[key]) {
      this.dispatch({ type: 'TOGGLE_PANEL', panel: key, open: false });
      return true;
    }
    return false;
  }

  private attr(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
  }

  private handleAction(action: string, element: HTMLElement): void {
    switch (action) {
      case 'toggle-panel':
        this.dispatch({ type: 'TOGGLE_PANEL', panel: element.dataset.panel ?? 'inventory' });
        break;
      case 'toggle-build':
        this.dispatch({ type: 'TOGGLE_BUILD_MODE' });
        break;
      case 'hide':
        this.dispatch({ type: 'HIDE' });
        break;
      case 'bandage':
        this.dispatch({ type: 'START_BANDAGE', target: { kind: 'self' } });
        break;
      case 'apply-poison':
        this.dispatch({ type: 'APPLY_POISON' });
        break;
      case 'defensive-action':
        this.dispatch({ type: 'DEFENSIVE_ACTION' });
        break;
      case 'clear-selected-item':
        this.dispatch({ type: 'SELECT_INVENTORY_SLOT', slot: null });
        break;
      case 'save-game':
        this.dispatch({ type: 'SAVE_GAME' });
        break;
      case 'reset-game':
        this.dispatch({ type: 'RESET_GAME' });
        this.windowManager.resetLayout(this.hud);
        break;
      case 'toggle-pause':
        this.dispatch({ type: 'TOGGLE_PAUSE' });
        break;
      case 'ui-scale-up':
        this.dispatch({ type: 'SET_UI_SCALE', scale: (this.currentState?.ui.uiScale ?? 1) + 0.05 });
        this.updateInputDebug({ lastIntent: 'UI_SETTING:scale-up', uiScale: Math.min(1.25, Number(((this.currentState?.ui.uiScale ?? 1) + 0.05).toFixed(2))) });
        break;
      case 'ui-scale-down':
        this.dispatch({ type: 'SET_UI_SCALE', scale: (this.currentState?.ui.uiScale ?? 1) - 0.05 });
        this.updateInputDebug({ lastIntent: 'UI_SETTING:scale-down', uiScale: Math.max(0.8, Number(((this.currentState?.ui.uiScale ?? 1) - 0.05).toFixed(2))) });
        break;
      case 'toggle-reduced-motion':
        this.dispatch({ type: 'TOGGLE_REDUCED_MOTION' });
        break;
      case 'reset-ui-layout':
        this.windowManager.resetLayout(this.hud);
        this.closeHotbarAssignMenu();
        this.updateInputDebug({ lastIntent: 'UI_RESET_LAYOUT' });
        break;
      case 'decipher-map':
        this.dispatch({ type: 'DECIPHER_TREASURE_MAP' });
        break;
      case 'pin-map':
        this.dispatch({ type: 'PIN_TREASURE_MAP' });
        break;
      case 'respawn':
        this.dispatch({ type: 'RESPAWN' });
        break;
      case 'toggle-dev-overlay':
        this.dispatch({ type: 'TOGGLE_DEV_OVERLAY' });
        break;
      case 'dev-export-telemetry':
        this.dispatch({ type: 'DEV_EXPORT_TELEMETRY' });
        break;
      case 'use-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'USE_ITEM', slot }));
        break;
      case 'equip-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'EQUIP_ITEM', slot }));
        break;
      case 'split-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'SPLIT_STACK', slot }));
        break;
      case 'deposit-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'MOVE_ITEM', from: 'inventory', to: 'bank', slot }));
        break;
      case 'withdraw-selected':
        this.withSelectedBank((slot) => this.dispatch({ type: 'MOVE_ITEM', from: 'bank', to: 'inventory', slot }));
        break;
      case 'offer-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'MOVE_ITEM', from: 'inventory', to: 'trade-player', slot }));
        break;
      case 'take-all-bank':
        for (let i = 0; i < (this.currentState?.player.bank.capacity ?? 0); i += 1) this.dispatch({ type: 'MOVE_ITEM', from: 'bank', to: 'inventory', slot: i });
        break;
      case 'cancel-trade':
        this.dispatch({ type: 'CANCEL_TRADE' });
        break;
      case 'close-merchant':
        this.dispatch({ type: 'CLOSE_MERCHANT' });
        break;
      case 'sell-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'SELL_MERCHANT_ITEM', slot }));
        break;
      case 'train-skill':
        if (element.dataset.skillId) this.dispatch({ type: 'TRAIN_SKILL', skillId: element.dataset.skillId });
        break;
      case 'lock-trade':
        this.dispatch({ type: 'LOCK_TRADE', side: 'player' });
        break;
      case 'craft-selected':
        this.dispatch({ type: 'START_CRAFT', recipeId: this.currentRecipe(), quantity: this.currentState?.ui.craftQuantity ?? 1 });
        break;
      case 'cast-selected-spell':
        this.dispatch({ type: 'CAST_SPELL', spellId: this.currentState?.ui.selectedSpellId ?? 'magic_arrow' });
        break;
      case 'assign-selected-spell': {
        const spellId = this.currentState?.ui.selectedSpellId ?? 'magic_arrow';
        const payload = payloadFromHotbarSource(`spell:${spellId}`, this.currentState ?? undefined);
        const rect = element.getBoundingClientRect();
        if (payload) this.openHotbarAssignMenu(payload, rect.left, rect.bottom + 4);
        break;
      }
      case 'meditate':
        this.dispatch({ type: 'USE_SKILL_ON_TARGET', skillId: 'Meditation', target: { kind: 'self' } });
        break;
      case 'craft-qty-down':
        this.dispatch({ type: 'SET_CRAFT_QUANTITY', quantity: (this.currentState?.ui.craftQuantity ?? 1) - 1 });
        break;
      case 'craft-qty-up':
        this.dispatch({ type: 'SET_CRAFT_QUANTITY', quantity: (this.currentState?.ui.craftQuantity ?? 1) + 1 });
        break;
      case 'place-building':
        this.dispatch({ type: 'PLACE_BUILDING' });
        break;
      case 'claim-plot':
        this.dispatch({ type: 'CLAIM_STARTER_PLOT' });
        break;
      case 'upgrade-housing':
        this.dispatch({ type: 'UPGRADE_HOUSING_TIER' });
        break;
      case 'undo-building':
        this.dispatch({ type: 'UNDO_LAST_BUILDING' });
        break;
      case 'move-last-building':
        this.dispatch({ type: 'BEGIN_MOVE_LAST_BUILDING' });
        break;
      case 'deposit-housing-selected':
        this.withSelectedInventory((slot) => this.dispatch({ type: 'DEPOSIT_HOUSING_SELECTED', slot }));
        break;
      case 'rest-at-home':
        this.dispatch({ type: 'REST_AT_HOME' });
        break;
    }
  }

  private withSelectedInventory(fn: (slot: number) => void): void {
    const slot = this.currentState?.ui.selectedInventorySlot;
    if (slot != null) fn(slot);
  }

  private withSelectedBank(fn: (slot: number) => void): void {
    const slot = this.currentState?.ui.selectedBankSlot;
    if (slot != null) fn(slot);
  }

  private currentRecipe(): string {
    return this.currentState?.ui.selectedRecipeId ?? 'iron_armor';
  }
}

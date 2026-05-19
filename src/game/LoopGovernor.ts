import type { GameState } from './types';

export type ActivityMode =
  | 'ActiveGameplay'
  | 'Combat'
  | 'Gathering/CraftingAction'
  | 'MenuOpenButWorldVisible'
  | 'Paused'
  | 'InventoryOnly/Planning'
  | 'BackgroundTab'
  | 'Loading/Transition';

export interface LoopCadence {
  simulationHz: number;
  renderHz: number;
  uiHz: number;
  minimapHz: number;
  raycastHz: number;
  animationPolicy: 'full' | 'reduced' | 'paused' | 'background';
}

export interface LoopDirtyFlags {
  worldDirty: boolean;
  entitiesDirty: boolean;
  inventoryDirty: boolean;
  equipmentDirty: boolean;
  hotbarDirty: boolean;
  skillsDirty: boolean;
  spellbookDirty: boolean;
  chatDirty: boolean;
  journalDirty: boolean;
  marketDirty: boolean;
  minimapDirty: boolean;
  tooltipDirty: boolean;
  windowLayoutDirty: boolean;
}

export interface LoopGovernorSnapshot {
  activityMode: ActivityMode;
  cadence: LoopCadence;
  dirtyFlags: LoopDirtyFlags;
  visiblePanelCount: number;
  backgrounded: boolean;
  lastReason: string;
}

export interface LoopDecision {
  mode: ActivityMode;
  cadence: LoopCadence;
  dirtyFlags: LoopDirtyFlags;
  runInput: boolean;
  runSimulation: boolean;
  runRender: boolean;
  runUi: boolean;
  minimapDirty: boolean;
  tooltipDirty: boolean;
  reason: string;
  snapshot: LoopGovernorSnapshot;
}

type TimedSubsystem = 'input' | 'simulation' | 'render' | 'ui' | 'minimap';

const cadenceByMode: Record<ActivityMode, LoopCadence> = {
  ActiveGameplay: { simulationHz: 60, renderHz: 60, uiHz: 30, minimapHz: 4, raycastHz: 30, animationPolicy: 'full' },
  Combat: { simulationHz: 60, renderHz: 60, uiHz: 30, minimapHz: 4, raycastHz: 30, animationPolicy: 'full' },
  'Gathering/CraftingAction': { simulationHz: 30, renderHz: 45, uiHz: 20, minimapHz: 2, raycastHz: 20, animationPolicy: 'reduced' },
  MenuOpenButWorldVisible: { simulationHz: 12, renderHz: 20, uiHz: 20, minimapHz: 2, raycastHz: 10, animationPolicy: 'reduced' },
  Paused: { simulationHz: 0, renderHz: 4, uiHz: 10, minimapHz: 0, raycastHz: 4, animationPolicy: 'paused' },
  'InventoryOnly/Planning': { simulationHz: 5, renderHz: 15, uiHz: 20, minimapHz: 1, raycastHz: 8, animationPolicy: 'reduced' },
  BackgroundTab: { simulationHz: 1, renderHz: 1, uiHz: 1, minimapHz: 0, raycastHz: 1, animationPolicy: 'background' },
  'Loading/Transition': { simulationHz: 30, renderHz: 30, uiHz: 30, minimapHz: 4, raycastHz: 15, animationPolicy: 'reduced' }
};

const cleanDirtyFlags: LoopDirtyFlags = {
  worldDirty: false,
  entitiesDirty: false,
  inventoryDirty: false,
  equipmentDirty: false,
  hotbarDirty: false,
  skillsDirty: false,
  spellbookDirty: false,
  chatDirty: false,
  journalDirty: false,
  marketDirty: false,
  minimapDirty: false,
  tooltipDirty: false,
  windowLayoutDirty: false
};

export function createInitialLoopGovernorSnapshot(): LoopGovernorSnapshot {
  return {
    activityMode: 'ActiveGameplay',
    cadence: { ...cadenceByMode.ActiveGameplay },
    dirtyFlags: { ...cleanDirtyFlags },
    visiblePanelCount: 0,
    backgrounded: false,
    lastReason: 'initial'
  };
}

export function mergeLoopGovernorSnapshot(snapshot?: Partial<LoopGovernorSnapshot>): LoopGovernorSnapshot {
  const initial = createInitialLoopGovernorSnapshot();
  if (!snapshot) return initial;
  return {
    ...initial,
    ...snapshot,
    cadence: { ...initial.cadence, ...(snapshot.cadence ?? {}) },
    dirtyFlags: { ...initial.dirtyFlags, ...(snapshot.dirtyFlags ?? {}) }
  };
}

export class LoopGovernor {
  private lastRunAt: Partial<Record<TimedSubsystem, number>> = {};
  private previousSignatures: Record<keyof LoopDirtyFlags, string> | null = null;
  private previousMode: ActivityMode | null = null;
  private snapshot = createInitialLoopGovernorSnapshot();

  decide(time: number, state: GameState, options: { pendingActions: boolean; documentHidden: boolean }): LoopDecision {
    const mode = options.documentHidden ? 'BackgroundTab' : activityModeForState(state);
    const cadence = cadenceByMode[mode];
    const signatures = dirtySignatures(state);
    const dirtyFlags = this.previousSignatures ? compareDirtyFlags(this.previousSignatures, signatures) : allDirtyFlags();
    const modeChanged = this.previousMode !== mode;
    const hasDirty = modeChanged || Object.values(dirtyFlags).some(Boolean);
    const pending = options.pendingActions;

    const runInput = due(time, this.lastRunAt.input, cadence.renderHz) || pending || modeChanged;
    const runSimulation = pending || (cadence.simulationHz > 0 && due(time, this.lastRunAt.simulation, cadence.simulationHz));
    const runRender = hasDirty || due(time, this.lastRunAt.render, cadence.renderHz);
    const runUi = hasDirty || pending || due(time, this.lastRunAt.ui, cadence.uiHz);
    const cadenceMinimapDue = state.ui.minimapMode === 'compact' || state.ui.minimapMode === 'hidden' ? false : due(time, this.lastRunAt.minimap, cadence.minimapHz);
    const minimapDirty = dirtyFlags.minimapDirty || modeChanged || cadenceMinimapDue;
    const tooltipDirty = dirtyFlags.tooltipDirty || dirtyFlags.inventoryDirty || dirtyFlags.skillsDirty || dirtyFlags.spellbookDirty || modeChanged;
    const reason = reasonForDecision({ modeChanged, pending, hasDirty, runSimulation, runRender, runUi });

    this.previousSignatures = signatures;
    this.previousMode = mode;
    this.snapshot = {
      activityMode: mode,
      cadence: { ...cadence },
      dirtyFlags: { ...dirtyFlags },
      visiblePanelCount: visiblePanelCount(state),
      backgrounded: options.documentHidden,
      lastReason: reason
    };

    return {
      mode,
      cadence,
      dirtyFlags,
      runInput,
      runSimulation,
      runRender,
      runUi,
      minimapDirty,
      tooltipDirty,
      reason,
      snapshot: this.snapshot
    };
  }

  markRan(subsystem: TimedSubsystem, time: number): void {
    this.lastRunAt[subsystem] = time;
  }

  currentSnapshot(): LoopGovernorSnapshot {
    return this.snapshot;
  }
}

function activityModeForState(state: GameState): ActivityMode {
  if (state.paused) return 'Paused';
  if (state.ui.fadeUntil > state.clock || state.player.actionState.kind === 'transitioning') return 'Loading/Transition';
  if (state.combat.meleeCooldown > 0 || state.combat.rangedCooldown > 0 || state.combat.magicCooldown > 0 || state.player.activeTargetId) return 'Combat';
  if (state.gathering || state.craftQueue.some((job) => job.remaining > 0) || state.spellCasting || state.bandage) return 'Gathering/CraftingAction';
  if (playerIsActivelyMoving(state)) return 'ActiveGameplay';
  if (planningPanelsOpen(state)) return 'InventoryOnly/Planning';
  if (visiblePanelCount(state) > 0 || state.buildMode.active || state.ui.contextMenu || state.ui.targeting) return 'MenuOpenButWorldVisible';
  return 'ActiveGameplay';
}

function playerIsActivelyMoving(state: GameState): boolean {
  return (
    state.player.actionState.kind === 'moving' ||
    Boolean(state.player.targetPosition) ||
    Boolean(state.player.movement.intent && state.player.movement.intentUntil >= state.clock) ||
    Math.hypot(state.player.movement.velocity.x, state.player.movement.velocity.z) > 0.05
  );
}

function planningPanelsOpen(state: GameState): boolean {
  return Boolean(
    state.ui.panels.inventory ||
      state.ui.panels.skills ||
      state.ui.panels.spellbook ||
      state.ui.panels.journal ||
      state.ui.panels.market ||
      state.ui.panels.crafting ||
      state.ui.panels.character ||
      state.ui.panels.help
  );
}

function visiblePanelCount(state: GameState): number {
  return Object.values(state.ui.panels).filter(Boolean).length + (state.ui.trade ? 1 : 0) + (state.ui.merchant ? 1 : 0);
}

function dirtySignatures(state: GameState): Record<keyof LoopDirtyFlags, string> {
  const inventory = state.player.inventory.slots.map((stack) => (stack ? `${stack.itemId}:${stack.quantity}:${stack.durability ?? ''}` : '-')).join('|');
  const equipment = Object.entries(state.player.equipment)
    .map(([slot, stack]) => `${slot}:${stack?.itemId ?? '-'}:${stack?.durability ?? ''}`)
    .join('|');
  const skillSignature = Object.entries(state.player.skills)
    .map(([id, skill]) => `${id}:${skill.value.toFixed(1)}:${skill.mode}:${skill.lastGainAt}`)
    .join('|');
  const panels = Object.entries(state.ui.panels)
    .filter(([, open]) => open)
    .map(([id]) => id)
    .sort()
    .join('|');
  const tile = `${state.player.currentArea}:${Math.round(state.player.position.x)},${Math.round(state.player.position.z)}`;
  return {
    worldDirty: `${state.player.currentArea}:${state.world.time.phase}:${state.clock.toFixed(1)}:${state.ui.fadeUntil}`,
    entitiesDirty: `${state.realtime.tick}:${state.player.position.x.toFixed(2)},${state.player.position.z.toFixed(2)}:${state.player.actionState.kind}:${Object.keys(state.entities).length}:${state.visualEffects.length}:${state.floatingTexts.length}`,
    inventoryDirty: `${inventory}:${state.ui.selectedInventorySlot ?? '-'}:${state.ui.selectedBankSlot ?? '-'}`,
    equipmentDirty: equipment,
    hotbarDirty: `${state.ui.activeHotbarSlot}:${state.ui.hotbar.map((binding) => (binding ? `${binding.kind}:${binding.id}` : '-')).join('|')}`,
    skillsDirty: `${state.ui.panels.skills}:${state.ui.skillView}:${state.ui.skillsViewMode}:${state.player.selectedSkillGroup}:${state.ui.skillSearch}:${state.ui.skillProfessionFilter}:${state.ui.professionFilter}:${state.ui.professionAtlasZoom}:${state.ui.professionAtlasSearch}:${state.ui.selectedProfessionNodeId}:${state.ui.pinnedProfessionGoalId}:${skillSignature}`,
    spellbookDirty: `${state.ui.panels.spellbook}:${state.ui.selectedSpellId}:${state.ui.spellbookSearch}:${state.ui.spellbookCircleFilter}:${state.ui.spellbookRoleFilter}:${state.ui.spellbookKnowledgeFilter}:${state.ui.spellbookViewMode}:${state.player.mana.toFixed(0)}:${state.combat.magicCooldown.toFixed(1)}`,
    chatDirty: `${state.ui.chatTab}:${state.ui.chatMode}:${state.ui.showChatTabs}:${state.ui.chatHiddenChannels.join(',')}:${state.ui.chatOpacity}:${state.ui.chatMessageRetention}:${state.chat.length}:${state.chat.at(-1)?.id ?? '-'}`,
    journalDirty: `${state.ui.panels.journal}:${state.ui.journalTab}:${state.ui.pinnedRumorId}:${state.ui.pinnedProfessionGoalId}:${Object.values(state.quests).map((quest) => `${quest.id}:${quest.status}:${quest.objectives.map((objective) => objective.progress).join(',')}`).join('|')}`,
    marketDirty: `${state.ui.panels.market}:${state.ui.marketCategory}:${state.ui.marketView}:${state.ui.marketSearch}:${state.world.economy.transactionLog.length}`,
    minimapDirty: `${state.ui.minimapMode}:${state.ui.mapHiddenLayers.join(',')}:${tile}:${state.ui.mapWaypoint?.areaId ?? '-'}:${state.ui.mapWaypoint?.position.x ?? '-'}:${state.ui.mapWaypoint?.position.z ?? '-'}:${state.world.discoveredAreas.join('|')}:${state.world.activeEvents.map((event) => `${event.id}:${event.discovered}:${event.endsAt > state.clock}`).join('|')}`,
    tooltipDirty: `${state.ui.tooltipMode}:${state.ui.tooltipDelayMs}:${targetKey(state.ui.hoverTarget)}:${targetKey(state.ui.selectedTarget)}`,
    windowLayoutDirty: `${panels}:${JSON.stringify(state.ui.windowLayouts)}:${state.ui.uiScale}:${state.ui.fontScale}:${state.ui.hudDensity}`
  };
}

function compareDirtyFlags(previous: Record<keyof LoopDirtyFlags, string>, next: Record<keyof LoopDirtyFlags, string>): LoopDirtyFlags {
  return {
    worldDirty: previous.worldDirty !== next.worldDirty,
    entitiesDirty: previous.entitiesDirty !== next.entitiesDirty,
    inventoryDirty: previous.inventoryDirty !== next.inventoryDirty,
    equipmentDirty: previous.equipmentDirty !== next.equipmentDirty,
    hotbarDirty: previous.hotbarDirty !== next.hotbarDirty,
    skillsDirty: previous.skillsDirty !== next.skillsDirty,
    spellbookDirty: previous.spellbookDirty !== next.spellbookDirty,
    chatDirty: previous.chatDirty !== next.chatDirty,
    journalDirty: previous.journalDirty !== next.journalDirty,
    marketDirty: previous.marketDirty !== next.marketDirty,
    minimapDirty: previous.minimapDirty !== next.minimapDirty,
    tooltipDirty: previous.tooltipDirty !== next.tooltipDirty,
    windowLayoutDirty: previous.windowLayoutDirty !== next.windowLayoutDirty
  };
}

function allDirtyFlags(): LoopDirtyFlags {
  return Object.fromEntries(Object.keys(cleanDirtyFlags).map((key) => [key, true])) as unknown as LoopDirtyFlags;
}

function due(time: number, lastRunAt: number | undefined, hz: number): boolean {
  if (hz <= 0) return false;
  if (lastRunAt == null) return true;
  return time - lastRunAt >= 1000 / hz;
}

function targetKey(target: GameState['ui']['hoverTarget']): string {
  if (!target) return 'none';
  if (target.kind === 'tile') return `tile:${target.areaId}:${Math.round(target.position.x)},${Math.round(target.position.z)}`;
  if ('entityId' in target) return `${target.kind}:${target.entityId}`;
  if (target.kind === 'inventory') return `${target.owner}:${target.slot}`;
  return target.kind;
}

function reasonForDecision(flags: { modeChanged: boolean; pending: boolean; hasDirty: boolean; runSimulation: boolean; runRender: boolean; runUi: boolean }): string {
  if (flags.modeChanged) return 'mode changed';
  if (flags.pending) return 'pending actions';
  if (flags.hasDirty) return 'dirty state';
  const ran = [
    flags.runSimulation ? 'simulation cadence' : '',
    flags.runRender ? 'render cadence' : '',
    flags.runUi ? 'ui cadence' : ''
  ].filter(Boolean);
  return ran.join(', ') || 'sleep';
}

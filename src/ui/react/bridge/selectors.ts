import { areas } from '../../../data/areas';
import { itemDefs } from '../../../data/items';
import { professionClusters, professionContracts } from '../../../data/professions';
import { skillDefinitions } from '../../../data/skillDefinitions';
import { spellDefs } from '../../../data/spells';
import {
  getActiveHotbarSlot,
  getInteractPrompt,
  getItemUseState,
  getSpellCastability,
  getWindowLayout
} from '../../../game/UIStateSelectors';
import { calculateDerivedStats } from '../../../systems/EquipmentSystem';
import { calculateWeight } from '../../../systems/InventorySystem';
import type {
  EquipmentSlot,
  GameState,
  HotbarBinding,
  ItemStack,
  ManagedWindowId,
  TargetRef,
  UIWindowLayout
} from '../../../game/types';

export type ReadonlyItemStack = Readonly<ItemStack>;

export interface HotbarSlotModel {
  slot: number;
  binding: HotbarBinding | null;
  label: string;
  valid: boolean;
}

export interface SkillLedgerRow {
  id: string;
  name: string;
  group: string;
  value: number;
  mode: string;
  recentGainAt: number;
}

export interface ProfessionAtlasModel {
  filter: string;
  search: string;
  zoom: number;
  showFuture: boolean;
  selectedNodeId: string | null;
  activeContractId: string | null;
  pinnedGoalId: string | null;
  clusters: ReadonlyArray<{
    id: string;
    title: string;
    summary: string;
    skillIds: ReadonlyArray<string>;
    contractCount: number;
  }>;
}

export interface AdventureMapModel {
  currentArea: GameState['player']['currentArea'];
  currentAreaName: string;
  discoveredAreas: ReadonlyArray<GameState['player']['currentArea']>;
  waypoint: GameState['ui']['mapWaypoint'];
  hiddenLayers: ReadonlyArray<string>;
  mode: GameState['ui']['minimapMode'];
}

export interface BuildModeModel {
  active: boolean;
  selectedPieceId: string;
  selectedCategory: GameState['ui']['selectedBuildCategory'];
  rotation: number;
  snapToGrid: boolean;
  ghostPosition: Readonly<GameState['buildMode']['ghostPosition']>;
  valid: boolean;
  message: string;
}

export interface WindowLayoutModel {
  id: ManagedWindowId;
  open: boolean;
  focused: boolean;
  layout: UIWindowLayout;
}

export interface GameUISnapshot {
  clock: number;
  player: Readonly<Pick<GameState['player'], 'id' | 'name' | 'level' | 'xp' | 'xpToNext' | 'gold' | 'currentArea'>>;
  vitals: Readonly<{
    health: number;
    mana: number;
    stamina: number;
  }>;
  target: TargetRef;
  inventory: Readonly<{
    slots: ReadonlyArray<ReadonlyItemStack | null>;
    selectedSlot: number | null;
    capacity: number;
    used: number;
    weight: number;
    carryCapacity: number;
    gold: number;
  }>;
  equipment: Readonly<Record<string, ReadonlyItemStack | null>>;
  bank: Readonly<{
    slots: ReadonlyArray<ReadonlyItemStack | null>;
    selectedSlot: number | null;
    open: boolean;
    capacity: number;
    used: number;
    gold: number;
  }>;
  hotbar: Readonly<{
    slots: ReadonlyArray<HotbarSlotModel>;
    activeSlot: ReturnType<typeof getActiveHotbarSlot>;
    assigningSpellId: string | null;
    cooldowns: Readonly<{
      melee: number;
      ranged: number;
      magic: number;
    }>;
  }>;
  spells: Readonly<{
    knownSpellIds: ReadonlyArray<string>;
    selectedSpellId: string;
    search: string;
    knowledgeFilter: GameState['ui']['spellbookKnowledgeFilter'];
    circleFilter: GameState['ui']['spellbookCircleFilter'];
    roleFilter: GameState['ui']['spellbookRoleFilter'];
    viewMode: GameState['ui']['spellbookViewMode'];
  }>;
  crafting: Readonly<{
    open: boolean;
    selectedRecipeId: string;
    selectedStationType: GameState['ui']['selectedStationType'];
    quantity: number;
    queue: ReadonlyArray<Readonly<GameState['craftQueue'][number]>>;
  }>;
  market: Readonly<{
    open: boolean;
    category: GameState['ui']['marketCategory'];
    view: GameState['ui']['marketView'];
    search: string;
    workOrders: ReadonlyArray<Readonly<GameState['world']['economy']['workOrders'][number]>>;
    marketOrders: ReadonlyArray<Readonly<GameState['world']['economy']['marketOrders'][number]>>;
    demandSignals: ReadonlyArray<Readonly<GameState['world']['economy']['demandSignals'][number]>>;
  }>;
  skills: Readonly<{
    rows: ReadonlyArray<SkillLedgerRow>;
    search: string;
    view: GameState['ui']['skillView'];
  }>;
  professions: ProfessionAtlasModel;
  journal: Readonly<{
    tab: GameState['ui']['journalTab'];
    pinnedRumorId: string | null;
    pinnedWorkOrderId: string | null;
    acceptedQuestIds: ReadonlyArray<string>;
    completedQuestIds: ReadonlyArray<string>;
    activeQuests: ReadonlyArray<Readonly<GameState['quests'][string]>>;
    completedQuests: ReadonlyArray<Readonly<GameState['quests'][string]>>;
    rumors: ReadonlyArray<Readonly<GameState['world']['activeEvents'][number]>>;
    discoveredAreas: ReadonlyArray<GameState['player']['currentArea']>;
    resolvedEventLog: ReadonlyArray<string>;
  }>;
  map: AdventureMapModel;
  chat: Readonly<{
    messages: ReadonlyArray<GameState['chat'][number]>;
    tab: GameState['ui']['chatTab'];
    mode: GameState['ui']['chatMode'];
    hiddenChannels: ReadonlyArray<GameState['chat'][number]['channel']>;
    opacity: number;
    retention: number;
    showTabs: boolean;
  }>;
  buildMode: BuildModeModel;
  windows: Readonly<{
    panels: Readonly<Record<string, boolean>>;
    focusOrder: ReadonlyArray<ManagedWindowId>;
    layouts: ReadonlyArray<WindowLayoutModel>;
  }>;
  settings: Readonly<{
    uiScale: number;
    fontScale: number;
    tooltipDelayMs: number;
    tooltipMode: GameState['ui']['tooltipMode'];
    hudDensity: GameState['ui']['hudDensity'];
    movementMode: GameState['ui']['movementMode'];
    lockUILayout: boolean;
    reducedMotion: boolean;
    colorblindStatusColors: boolean;
    showDamageNumbers: boolean;
    showSkillGainToasts: boolean;
    frameRateCapMode: GameState['ui']['frameRateCapMode'];
    customFrameRateCap: number;
    cameraSmoothing: GameState['ui']['cameraSmoothing'];
    cameraRelativeMovement: boolean;
    windowLayoutPreset: GameState['ui']['windowLayoutPreset'];
    inputBindings: ReadonlyArray<Readonly<GameState['ui']['inputBindings'][number]>>;
  }>;
  perfDebug: GameState['dev']['overlay'] extends true ? Readonly<GameState['dev']['renderStats']> | null : Readonly<GameState['dev']['renderStats']> | null;
}

const managedWindowIds: ManagedWindowId[] = ['inventory', 'spellbook', 'skills', 'journal', 'market', 'help', 'chat', 'map'];
const actionBindingIds = new Set(['attack', 'ranged', 'utility', 'hide', 'defend', 'interact', 'build']);

export function createGameUISnapshot(state: GameState): GameUISnapshot {
  const derivedStats = calculateDerivedStats(state);
  return Object.freeze({
    clock: state.clock,
    player: Object.freeze({
      id: state.player.id,
      name: state.player.name,
      level: state.player.level,
      xp: state.player.xp,
      xpToNext: state.player.xpToNext,
      gold: state.player.gold,
      currentArea: state.player.currentArea
    }),
    vitals: Object.freeze({
      health: state.player.health,
      mana: state.player.mana,
      stamina: state.player.stamina
    }),
    target: selectCurrentTarget(state),
    inventory: Object.freeze({
      slots: selectInventorySlots(state),
      selectedSlot: state.ui.selectedInventorySlot,
      capacity: state.player.inventory.capacity,
      used: state.player.inventory.slots.filter(Boolean).length,
      weight: calculateWeight(state),
      carryCapacity: derivedStats.carryCapacity,
      gold: state.player.gold
    }),
    equipment: selectEquipmentSlots(state),
    bank: Object.freeze({
      slots: selectBankSlots(state),
      selectedSlot: state.ui.selectedBankSlot,
      open: Boolean(state.ui.panels.bank),
      capacity: state.player.bank.capacity,
      used: state.player.bank.slots.filter(Boolean).length,
      gold: state.player.bankGold
    }),
    hotbar: Object.freeze({
      slots: selectHotbarSlots(state),
      activeSlot: selectActiveHotbarSlot(state),
      assigningSpellId: state.ui.hotbarAssignSpellId,
      cooldowns: Object.freeze({
        melee: state.combat.meleeCooldown,
        ranged: state.combat.rangedCooldown,
        magic: state.combat.magicCooldown
      })
    }),
    spells: Object.freeze({
      knownSpellIds: Object.freeze([...state.player.spellbook.knownSpellIds]),
      selectedSpellId: state.ui.selectedSpellId,
      search: state.ui.spellbookSearch,
      knowledgeFilter: state.ui.spellbookKnowledgeFilter,
      circleFilter: state.ui.spellbookCircleFilter,
      roleFilter: state.ui.spellbookRoleFilter,
      viewMode: state.ui.spellbookViewMode
    }),
    crafting: Object.freeze({
      open: Boolean(state.ui.panels.crafting),
      selectedRecipeId: state.ui.selectedRecipeId,
      selectedStationType: state.ui.selectedStationType,
      quantity: state.ui.craftQuantity,
      queue: Object.freeze(state.craftQueue.map((job) => Object.freeze({ ...job })))
    }),
    market: Object.freeze({
      open: Boolean(state.ui.panels.market),
      category: state.ui.marketCategory,
      view: state.ui.marketView,
      search: state.ui.marketSearch,
      workOrders: Object.freeze(state.world.economy.workOrders.map((order) => Object.freeze({ ...order }))),
      marketOrders: Object.freeze(state.world.economy.marketOrders.map((order) => Object.freeze({ ...order }))),
      demandSignals: Object.freeze((state.world.economy.demandSignals ?? []).map((signal) => Object.freeze({ ...signal })))
    }),
    skills: Object.freeze({
      rows: selectSkillLedgerRows(state),
      search: state.ui.skillSearch,
      view: state.ui.skillView
    }),
    professions: selectProfessionAtlasModel(state),
    journal: Object.freeze({
      tab: state.ui.journalTab,
      pinnedRumorId: state.ui.pinnedRumorId,
      pinnedWorkOrderId: state.ui.pinnedWorkOrderId,
    acceptedQuestIds: Object.freeze([...state.player.activeQuestIds]),
      completedQuestIds: Object.freeze([...state.player.completedQuestIds]),
      activeQuests: Object.freeze(state.player.activeQuestIds.map((id) => state.quests[id]).filter(Boolean).map((quest) => Object.freeze({ ...quest, objectives: quest.objectives.map((objective) => Object.freeze({ ...objective })) }))),
      completedQuests: Object.freeze(state.player.completedQuestIds.map((id) => state.quests[id]).filter(Boolean).map((quest) => Object.freeze({ ...quest, objectives: quest.objectives.map((objective) => Object.freeze({ ...objective })) }))),
      rumors: Object.freeze(state.world.activeEvents.filter((event) => event.discovered || state.world.discoveredRumorIds.includes(event.id)).map((event) => Object.freeze({ ...event }))),
      discoveredAreas: Object.freeze([...state.world.discoveredAreas]),
      resolvedEventLog: Object.freeze([...(state.world.resolvedEventLog ?? [])])
    }),
    map: selectAdventureMapModel(state),
    chat: Object.freeze({
      messages: Object.freeze(state.chat.slice(-state.ui.chatMessageRetention).map((message) => Object.freeze({ ...message }))),
      tab: state.ui.chatTab,
      mode: state.ui.chatMode,
      hiddenChannels: Object.freeze([...state.ui.chatHiddenChannels]),
      opacity: state.ui.chatOpacity,
      retention: state.ui.chatMessageRetention,
      showTabs: state.ui.showChatTabs
    }),
    buildMode: selectBuildModeModel(state),
    windows: Object.freeze({
      panels: Object.freeze({ ...state.ui.panels }),
      focusOrder: Object.freeze([...state.ui.windowFocusOrder]),
      layouts: Object.freeze(managedWindowIds.map((id) => selectWindowLayout(state, id)))
    }),
    settings: Object.freeze({
      uiScale: state.ui.uiScale,
      fontScale: state.ui.fontScale,
      tooltipDelayMs: state.ui.tooltipDelayMs,
      tooltipMode: state.ui.tooltipMode,
      hudDensity: state.ui.hudDensity,
      movementMode: state.ui.movementMode,
      lockUILayout: state.ui.lockUILayout,
      reducedMotion: state.ui.reducedMotion,
      colorblindStatusColors: state.ui.colorblindStatusColors,
      showDamageNumbers: state.ui.showDamageNumbers,
      showSkillGainToasts: state.ui.showSkillGainToasts,
      frameRateCapMode: state.ui.frameRateCapMode,
      customFrameRateCap: state.ui.customFrameRateCap,
      cameraSmoothing: state.ui.cameraSmoothing,
      cameraRelativeMovement: state.ui.cameraRelativeMovement,
      windowLayoutPreset: state.ui.windowLayoutPreset,
      inputBindings: Object.freeze(state.ui.inputBindings.map((binding) => Object.freeze({ ...binding })))
    }),
    perfDebug: state.dev.overlay ? Object.freeze({ ...state.dev.renderStats }) : null
  });
}

export function selectInventorySlots(state: GameState): ReadonlyArray<ReadonlyItemStack | null> {
  return readonlySlots(state.player.inventory.slots);
}

export function selectEquipmentSlots(state: GameState): Readonly<Record<string, ReadonlyItemStack | null>> {
  const entries = Object.entries(state.player.equipment).map(([slot, stack]) => [slot, readonlyStack(stack ?? null)] as const);
  return Object.freeze(Object.fromEntries(entries));
}

export function selectHotbarSlots(state: GameState): ReadonlyArray<HotbarSlotModel> {
  return Object.freeze(
    state.ui.hotbar.map((binding, slot) =>
      Object.freeze({
        slot,
        binding: binding ? Object.freeze({ ...binding }) : null,
        label: hotbarBindingLabel(binding),
        valid: isHotbarBindingValid(binding)
      })
    )
  );
}

export function selectActiveHotbarSlot(state: GameState): ReturnType<typeof getActiveHotbarSlot> {
  return Object.freeze(getActiveHotbarSlot(state.player, state.ui));
}

export function selectSpellCastability(state: GameState, spellId: string): ReturnType<typeof getSpellCastability> {
  return Object.freeze(getSpellCastability(state, spellId));
}

export function selectItemUseState(state: GameState, itemInstanceId: string): ReturnType<typeof getItemUseState> {
  const itemUseState = getItemUseState(state, itemInstanceId);
  return Object.freeze({
    ...itemUseState,
    stack: readonlyStack(itemUseState.stack)
  });
}

export function selectBankSlots(state: GameState): ReadonlyArray<ReadonlyItemStack | null> {
  return readonlySlots(state.player.bank.slots);
}

export function selectCurrentTarget(state: GameState): TargetRef {
  return cloneTarget(state.ui.selectedTarget ?? state.ui.hoverTarget);
}

export function selectInteractPrompt(state: GameState): string | null {
  return getInteractPrompt(state);
}

export function selectSkillLedgerRows(state: GameState): ReadonlyArray<SkillLedgerRow> {
  return Object.freeze(
    skillDefinitions.map((skill) => {
      const progress = state.player.skills[skill.id];
      return Object.freeze({
        id: skill.id,
        name: skill.displayName,
        group: skill.group,
        value: progress?.value ?? 0,
        mode: progress?.mode ?? 'balanced',
        recentGainAt: progress?.lastGainAt ?? 0
      });
    })
  );
}

export function selectProfessionAtlasModel(state: GameState): ProfessionAtlasModel {
  return Object.freeze({
    filter: state.ui.skillProfessionFilter,
    search: state.ui.professionAtlasSearch,
    zoom: state.ui.professionAtlasZoom,
    showFuture: state.ui.professionAtlasShowFuture,
    selectedNodeId: state.ui.selectedProfessionNodeId,
    activeContractId: state.ui.activeProfessionContractId,
    pinnedGoalId: state.ui.pinnedProfessionGoalId,
    clusters: Object.freeze(
      professionClusters.map((cluster) =>
        Object.freeze({
          id: cluster.id,
          title: cluster.title,
          summary: cluster.summary,
          skillIds: Object.freeze([...cluster.skills]),
          contractCount: professionContracts.filter((contract) => contract.professionId === cluster.id).length
        })
      )
    )
  });
}

export function selectAdventureMapModel(state: GameState): AdventureMapModel {
  return Object.freeze({
    currentArea: state.player.currentArea,
    currentAreaName: areas[state.player.currentArea]?.name ?? state.player.currentArea,
    discoveredAreas: Object.freeze([...state.world.discoveredAreas]),
    waypoint: state.ui.mapWaypoint ? Object.freeze({ ...state.ui.mapWaypoint, position: { ...state.ui.mapWaypoint.position } }) : null,
    hiddenLayers: Object.freeze([...state.ui.mapHiddenLayers]),
    mode: state.ui.minimapMode
  });
}

export function selectBuildModeModel(state: GameState): BuildModeModel {
  return Object.freeze({
    active: state.buildMode.active,
    selectedPieceId: state.buildMode.selectedPieceId,
    selectedCategory: state.ui.selectedBuildCategory,
    rotation: state.buildMode.rotation,
    snapToGrid: state.buildMode.snapToGrid,
    ghostPosition: Object.freeze({ ...state.buildMode.ghostPosition }),
    valid: state.buildMode.valid,
    message: state.buildMode.message
  });
}

export function selectChatMessages(state: GameState): ReadonlyArray<GameState['chat'][number]> {
  return Object.freeze(state.chat.slice(-state.ui.chatMessageRetention).map((message) => Object.freeze({ ...message })));
}

export function selectWindowLayout(state: GameState, windowId: ManagedWindowId, viewport?: { width: number; height: number }): WindowLayoutModel {
  const focused = state.ui.windowFocusOrder[state.ui.windowFocusOrder.length - 1] === windowId;
  return Object.freeze({
    id: windowId,
    open: Boolean(state.ui.panels[windowId]),
    focused,
    layout: Object.freeze(getWindowLayout(state, windowId, viewport))
  });
}

function readonlySlots(slots: Array<ItemStack | null>): ReadonlyArray<ReadonlyItemStack | null> {
  return Object.freeze(slots.map((stack) => readonlyStack(stack)));
}

function readonlyStack(stack: ItemStack | null): ReadonlyItemStack | null {
  return stack ? Object.freeze({ ...stack }) : null;
}

function cloneTarget(target: TargetRef): TargetRef {
  if (!target) return null;
  if (target.kind === 'tile') return { ...target, position: { ...target.position } };
  return { ...target };
}

function hotbarBindingLabel(binding: HotbarBinding | null): string {
  if (!binding) return 'Empty';
  if (binding.kind === 'action') return `Action: ${binding.id}`;
  if (binding.kind === 'spell') return spellDefs[binding.id]?.displayName ?? binding.id;
  if (binding.kind === 'skill') return skillDefinitions.find((skill) => skill.id === binding.id)?.displayName ?? binding.id;
  return itemDefs[binding.id]?.name ?? binding.id;
}

function isHotbarBindingValid(binding: HotbarBinding | null): boolean {
  if (!binding) return true;
  if (binding.kind === 'action') return actionBindingIds.has(binding.id);
  if (binding.kind === 'spell') return Boolean(spellDefs[binding.id]);
  if (binding.kind === 'skill') return skillDefinitions.some((skill) => skill.id === binding.id);
  return Boolean(itemDefs[binding.id]);
}

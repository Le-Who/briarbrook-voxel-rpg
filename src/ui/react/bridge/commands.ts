import type { GameAction } from '../../../game/Actions';
import type {
  AudioVolumeCategory,
  BuildPieceDef,
  HotbarBinding,
  ManagedWindowId,
  MapWaypointSource,
  MovementMode,
  TooltipDetailMode,
  UIWindowLayout,
  Vec3
} from '../../../game/types';

export interface GameUICommandResult {
  accepted: boolean;
  action?: GameAction;
  reason?: string;
}

export interface GameUICommandDispatcher {
  dispatchAction: (action: GameAction) => GameUICommandResult;
}

export interface GameUICommands {
  equipItem: (slot: number) => GameUICommandResult;
  unequipItem: () => GameUICommandResult;
  useHotbarSlot: (slot: number) => GameUICommandResult;
  assignHotbar: (slot: number, binding: HotbarBinding | null) => GameUICommandResult;
  castSpell: (spellId: string, entityId?: string) => GameUICommandResult;
  moveItem: (from: 'inventory' | 'bank' | 'trade-player', to: 'inventory' | 'bank' | 'trade-player', slot: number, targetSlot?: number) => GameUICommandResult;
  transferToBank: (slot: number) => GameUICommandResult;
  craftRecipe: (recipeId: string, quantity?: number) => GameUICommandResult;
  startBuildPlacement: (pieceId: string, category?: BuildPieceDef['category']) => GameUICommandResult;
  placeHousingObject: () => GameUICommandResult;
  pinProfessionGoal: (goalId: string | null) => GameUICommandResult;
  pinMapMarker: (areaId: GameAction extends { type: 'SET_MAP_WAYPOINT'; areaId: infer A } ? A : never, position: Vec3, label?: string, source?: MapWaypointSource) => GameUICommandResult;
  sendChat: (text: string) => GameUICommandResult;
  setMovementMode: (mode: MovementMode) => GameUICommandResult;
  setUISetting: (setting: UISettingCommand) => GameUICommandResult;
  updateWindowLayout: (windowId: ManagedWindowId, layout: UIWindowLayout) => GameUICommandResult;
}

export type UISettingCommand =
  | { key: 'uiScale'; value: number }
  | { key: 'fontScale'; value: number }
  | { key: 'tooltipDelayMs'; value: number }
  | { key: 'tooltipMode'; value: TooltipDetailMode }
  | { key: 'audioVolume'; category: AudioVolumeCategory; value: number };

export function createGameUICommands(dispatcher: GameUICommandDispatcher): GameUICommands {
  const dispatch = (action: GameAction) => dispatcher.dispatchAction(action);
  return {
    equipItem: (slot) => dispatch({ type: 'EQUIP_ITEM', slot }),
    unequipItem: () => ({ accepted: false, reason: 'No Simulation action exists for unequip yet.' }),
    useHotbarSlot: (slot) => dispatch({ type: 'USE_HOTBAR', slot }),
    assignHotbar: (slot, binding) => dispatch({ type: 'SET_HOTBAR_SLOT', slot, binding }),
    castSpell: (spellId, entityId) => dispatch({ type: 'CAST_SPELL', spellId, entityId }),
    moveItem: (from, to, slot, targetSlot) => dispatch({ type: 'MOVE_ITEM', from, to, slot, targetSlot }),
    transferToBank: (slot) => dispatch({ type: 'MOVE_ITEM', from: 'inventory', to: 'bank', slot }),
    craftRecipe: (recipeId, quantity = 1) => dispatch({ type: 'START_CRAFT', recipeId, quantity }),
    startBuildPlacement: (pieceId, category) => dispatch({ type: 'SET_BUILD_PIECE', pieceId, category }),
    placeHousingObject: () => dispatch({ type: 'PLACE_BUILDING' }),
    pinProfessionGoal: (goalId) => dispatch({ type: 'PIN_PROFESSION_GOAL', goalId }),
    pinMapMarker: (areaId, position, label, source = 'manual') => dispatch({ type: 'SET_MAP_WAYPOINT', areaId, position, label, source }),
    sendChat: (text) => dispatch({ type: 'SEND_CHAT', text }),
    setMovementMode: (mode) => dispatch({ type: 'SET_MOVEMENT_MODE', mode }),
    setUISetting: (setting) => dispatch(uiSettingAction(setting)),
    updateWindowLayout: (windowId, layout) => dispatch({ type: 'SET_WINDOW_LAYOUT', windowId, layout })
  };
}

function uiSettingAction(setting: UISettingCommand): GameAction {
  switch (setting.key) {
    case 'uiScale':
      return { type: 'SET_UI_SCALE', scale: setting.value };
    case 'fontScale':
      return { type: 'SET_FONT_SCALE', scale: setting.value };
    case 'tooltipDelayMs':
      return { type: 'SET_TOOLTIP_DELAY', delayMs: setting.value };
    case 'tooltipMode':
      return { type: 'SET_TOOLTIP_MODE', mode: setting.value };
    case 'audioVolume':
      return { type: 'SET_AUDIO_VOLUME', category: setting.category, volume: setting.value };
    default:
      setting satisfies never;
      return { type: 'SHOW_PROMPT', message: 'Unsupported UI setting.' };
  }
}

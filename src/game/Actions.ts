import type { AreaId, BuildPieceDef, ChatMessage, EconomyOrderCategory, EnemyEntity, EquipmentSlot, HotbarBinding, InputDebugState, SkillGainMode, StationType, TargetRef, Vec3, WorldPhase } from './types';

export type GameAction =
  | { type: 'MOVE_BY'; dx: number; dz: number }
  | { type: 'MOVE_TO'; position: Vec3 }
  | { type: 'STOP_MOVE' }
  | { type: 'ENTER_AREA'; areaId: AreaId }
  | { type: 'SELECT_ENTITY'; entityId: string | null }
  | { type: 'CYCLE_TARGET'; direction: 1 | -1 }
  | { type: 'INTERACT_ENTITY'; entityId: string }
  | { type: 'ATTACK_ENTITY'; entityId?: string }
  | { type: 'USE_RANGED'; entityId?: string }
  | { type: 'USE_WEAPON_ABILITY'; abilityId: string; entityId?: string }
  | { type: 'DEFENSIVE_ACTION' }
  | { type: 'CAST_SPELL'; spellId: string; entityId?: string }
  | { type: 'BEGIN_TARGETING'; mode: 'tool' | 'skill' | 'spell'; prompt: string; toolItemId?: string; skillId?: string; spellId?: string }
  | { type: 'CANCEL_TARGETING' }
  | { type: 'OPEN_CONTEXT_MENU'; target: TargetRef; x: number; y: number }
  | { type: 'CLOSE_CONTEXT_MENU' }
  | { type: 'CONTEXT_ACTION'; command: 'talk' | 'trade' | 'attack' | 'inspect' | 'use_tool' | 'cast_spell' | 'detect_hidden' | 'remove_trap' | 'lockpick' | 'snoop' | 'steal' | 'follow' | 'mark' }
  | { type: 'TARGET_ENTITY'; entityId: string }
  | { type: 'TARGET_TILE'; areaId: AreaId; position: Vec3 }
  | { type: 'USE_TOOL_ON_TARGET'; toolItemId: string; target: TargetRef }
  | { type: 'USE_SKILL_ON_TARGET'; skillId: string; target: TargetRef }
  | { type: 'USE_SPELL_ON_TARGET'; spellId: string; target: TargetRef }
  | { type: 'START_BANDAGE'; target?: TargetRef }
  | { type: 'APPLY_POISON'; slot?: number }
  | { type: 'HIDE' }
  | { type: 'USE_BARD_SKILL'; skillId: 'Peacemaking' | 'Provocation' | 'Discordance'; target?: TargetRef }
  | { type: 'GATHER_RESOURCE'; entityId: string }
  | { type: 'PICKUP_ITEM'; entityId: string }
  | { type: 'USE_ITEM'; slot: number }
  | { type: 'SPLIT_STACK'; slot: number }
  | { type: 'EQUIP_ITEM'; slot: number }
  | { type: 'MOVE_ITEM'; from: 'inventory' | 'bank' | 'trade-player'; to: 'inventory' | 'bank' | 'trade-player'; slot: number; targetSlot?: number }
  | { type: 'OPEN_BANK' }
  | { type: 'OPEN_TRADE'; partnerId: string }
  | { type: 'BUY_MERCHANT_ITEM'; slot: number }
  | { type: 'SELL_MERCHANT_ITEM'; slot: number }
  | { type: 'TRAIN_SKILL'; skillId: string }
  | { type: 'CLOSE_MERCHANT' }
  | { type: 'SET_TRADE_GOLD'; side: 'player'; amount: number }
  | { type: 'LOCK_TRADE'; side: 'player' | 'partner' }
  | { type: 'CANCEL_TRADE' }
  | { type: 'START_CRAFT'; recipeId: string; quantity: number }
  | { type: 'COMPLETE_CRAFT'; jobId: string }
  | { type: 'REPAIR_EQUIPPED_ITEM'; slot: EquipmentSlot }
  | { type: 'COMPLETE_WORK_ORDER'; orderId: string }
  | { type: 'FULFILL_MARKET_ORDER'; orderId: string }
  | { type: 'TOGGLE_BUILD_MODE'; active?: boolean }
  | { type: 'SET_BUILD_PIECE'; pieceId: string; category?: BuildPieceDef['category'] }
  | { type: 'SET_BUILD_GHOST'; position: Vec3 }
  | { type: 'ROTATE_BUILDING'; delta: number }
  | { type: 'TOGGLE_BUILD_SNAP' }
  | { type: 'PLACE_BUILDING' }
  | { type: 'CLAIM_STARTER_PLOT' }
  | { type: 'UPGRADE_HOUSING_TIER' }
  | { type: 'UNDO_LAST_BUILDING' }
  | { type: 'BEGIN_MOVE_LAST_BUILDING' }
  | { type: 'SELECT_HOUSING_STORAGE'; storageId: string }
  | { type: 'DEPOSIT_HOUSING_SELECTED'; slot: number; storageId?: string }
  | { type: 'WITHDRAW_HOUSING_SLOT'; storageId: string; slot: number }
  | { type: 'UPGRADE_HOUSING_STORAGE'; storageId: string }
  | { type: 'REST_AT_HOME' }
  | { type: 'HARVEST_HOUSING_GARDEN'; buildingId: string }
  | { type: 'ACCEPT_QUEST'; questId: string }
  | { type: 'COMPLETE_QUEST'; questId: string }
  | { type: 'TOGGLE_PANEL'; panel: string; open?: boolean }
  | { type: 'HOVER_TARGET'; target: TargetRef }
  | { type: 'SELECT_TARGET'; target: TargetRef }
  | { type: 'SELECT_INVENTORY_SLOT'; slot: number | null }
  | { type: 'SELECT_BANK_SLOT'; slot: number | null }
  | { type: 'SELECT_RECIPE'; recipeId: string }
  | { type: 'SET_CRAFT_STATION'; stationType: StationType | 'all' }
  | { type: 'SET_MARKET_FILTER'; category: EconomyOrderCategory | 'all' }
  | { type: 'SET_MARKET_SEARCH'; search: string }
  | { type: 'SET_TREASURE_MAP'; mapId: string }
  | { type: 'DECIPHER_TREASURE_MAP'; mapId?: string }
  | { type: 'PIN_TREASURE_MAP'; mapId?: string }
  | { type: 'SELECT_SPELL'; spellId: string }
  | { type: 'SET_SPELL_SEARCH'; search: string }
  | { type: 'SET_SPELLBOOK_CIRCLE'; circle: number | 'all' }
  | { type: 'SET_SPELLBOOK_FILTER'; filter: 'known' | 'all' | 'unknown' }
  | { type: 'SET_SPELLBOOK_VIEW'; view: 'grid' | 'list' }
  | { type: 'SET_JOURNAL_TAB'; tab: 'quests' | 'rumors' | 'skills' | 'spells' | 'locations' | 'tutorials' | 'workOrders' }
  | { type: 'SET_CRAFT_QUANTITY'; quantity: number }
  | { type: 'SET_SKILL_MODE'; skillId: string; mode: SkillGainMode }
  | { type: 'SET_SKILL_GROUP'; group: string }
  | { type: 'SET_SKILL_SEARCH'; search: string }
  | { type: 'SET_SKILL_VIEW'; view: 'ledger' | 'atlas' | 'mastery' }
  | { type: 'SET_PROFESSION_FILTER'; professionId: string }
  | { type: 'SET_PROFESSION_ATLAS_ZOOM'; zoom: number }
  | { type: 'PIN_PROFESSION_GOAL'; goalId: string | null }
  | { type: 'TOGGLE_DEV_TRAVEL' }
  | { type: 'TOGGLE_DEV_OVERLAY' }
  | { type: 'DEV_TELEPORT_SCENE'; sceneId: string }
  | { type: 'DEV_TELEPORT_AREA'; areaId: AreaId }
  | { type: 'DEV_SPAWN_ITEM'; itemId?: string; quantity?: number }
  | { type: 'DEV_SPAWN_ENEMY'; enemyType?: EnemyEntity['enemyType'] }
  | { type: 'DEV_SET_SKILL'; skillId: string; value: number }
  | { type: 'DEV_ADD_GOLD'; amount?: number }
  | { type: 'DEV_RESET_RESOURCES' }
  | { type: 'DEV_COMPLETE_QUEST_STEP' }
  | { type: 'DEV_GIVE_SPELL'; spellId?: string }
  | { type: 'DEV_SIMULATE_TIME'; phase: WorldPhase }
  | { type: 'DEV_EXPORT_TELEMETRY' }
  | { type: 'UPDATE_INPUT_DEBUG'; patch: Partial<InputDebugState> }
  | { type: 'SET_CHAT_TAB'; channel: ChatMessage['channel'] }
  | { type: 'SEND_CHAT'; text: string }
  | { type: 'USE_HOTBAR'; slot: number }
  | { type: 'SET_HOTBAR_SLOT'; slot: number; binding: HotbarBinding | null }
  | { type: 'CLEAR_HOTBAR_SLOT'; slot: number }
  | { type: 'MOVE_HOTBAR_SLOT'; from: number; to: number }
  | { type: 'SHOW_PROMPT'; message: string }
  | { type: 'SET_UI_SCALE'; scale: number }
  | { type: 'TOGGLE_REDUCED_MOTION' }
  | { type: 'TOGGLE_PAUSE'; paused?: boolean }
  | { type: 'SAVE_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'RESPAWN' };

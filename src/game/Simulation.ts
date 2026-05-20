import { areas } from '../data/areas';
import { clampAudioVolume } from '../audio/AudioSettings';
import { buildPieces, itemDefs } from '../data/items';
import { professionContractById } from '../data/professions';
import { recipes } from '../data/recipes';
import { spellDefs } from '../data/spells';
import { updateSocialNpcs } from '../systems/AISystem';
import { refreshPlayerActionState, setPlayerActionState } from '../systems/ActionStateSystem';
import { beginMoveLastBuilding, claimPlotAndRefreshBuild, placeBuilding, undoLastBuilding, updateBuildGhost } from '../systems/BuildingSystem';
import { addChat, addSystemMessage, updateAmbientChat } from '../systems/ChatSystem';
import { dismissCompanion, hireCompanion, setCompanionCommand, updateCompanions } from '../systems/CompanionSystem';
import { applyPoisonToWeapon, attemptHide, startBandage, updateBandage, useBardSkill } from '../systems/CombatAbilitySystem';
import { meleeAttack, rangedAttack, updateEnemyCombat, updateProjectiles, weaponCooldown } from '../systems/CombatSystem';
import { attemptSnoopContainer, attemptStealFromContainer, begNearby, handleInnocentAttack, inspectCrimeScene, updateReputation } from '../systems/CrimeSystem';
import { startCraft, updateCrafting } from '../systems/CraftingSystem';
import { calculateDerivedStats } from '../systems/EquipmentSystem';
import { completeWorkOrder, fulfillMarketOrder, repairEquippedItem, updateEconomy } from '../systems/EconomySystem';
import { releaseFacingLock, updateAllFacing } from '../systems/FacingSystem';
import {
  devAddGold,
  devCompleteQuestStep,
  devExportTelemetry,
  devGiveSpell,
  devResetResources,
  devSetSkillValue,
  devSimulateTime,
  devSpawnEnemy,
  devSpawnItem,
  devTeleportToArea,
  devTeleportToScene
} from '../systems/DevToolsSystem';
import { addItem, equipItem, hasItems, moveStackBetween, offerTradeItem, removeItems, removeTradeOffer, splitStack, useItem } from '../systems/InventorySystem';
import { triggerWorldEvent, updateLivingWorld } from '../systems/LivingWorldSystem';
import { buyMerchantItem, closeMerchant, sellMerchantItem, trainSkill } from '../systems/MerchantSystem';
import { depositSelectedToHousingStorage, harvestHousingGarden, restAtHome, selectHousingStorage, upgradeHousingStorage, upgradeHousingTier, withdrawFromHousingStorage } from '../systems/HousingSystem';
import { gatherResource, interactEntity, openTrade, updateGathering, updateResources } from '../systems/InteractionSystem';
import { pickupLoot, updateLoot } from '../systems/LootSystem';
import { movePlayerBy, setMoveTarget, updatePlayerMovement } from '../systems/MovementSystem';
import { completeQuest, recordQuestEvent, refreshQuestProgress } from '../systems/QuestSystem';
import { isTargetingTool, targetingPromptForTool, updateResourceTiles, useToolOnTarget } from '../systems/ResourceSystem';
import { castSpellIntent, meditate, updateSpellCasting } from '../systems/SpellSystem';
import { recordPlaytestMilestone, recordUiReset, recordWindowOpened } from '../systems/TelemetrySystem';
import { combineMapFragments, decipherTreasureMap, detectHiddenPulse, digWithShovel, openTreasureMap, pinTreasureMap, removeTrapFromTarget } from '../systems/TreasureSystem';
import { cancelApproachIntent, clearInvalidAreaTargets, clearMovementState, transitionPlayerToArea } from '../systems/TransitionSystem';
import { performDefensiveAction, useWeaponAbility } from '../systems/WeaponAbilitySystem';
import { AreaManager } from '../world/AreaManager';
import type { GameAction } from './Actions';
import { createId, createInitialGameState } from './GameState';
import { actionLabelForId, createDefaultInputBindings, findInputBindingConflicts, keyLabel, rebindInputAction } from './InputActionMap';
import { sanitizeCustomFrameRateCap } from './LoopGovernor';
import { clearSave, saveGame } from './SaveLoad';
import type { GameState, MovementMode, TargetRef, Vec3 } from './types';
import { sanitizeUiStateReferences } from './UIStateSelectors';
import { setSkillMode } from '../systems/SkillSystem';
import { updateWindowFocusOrder } from '../ui/WindowManager';
import { applyUiLayoutPresetSettings } from '../ui/UILayoutPresets';

export class Simulation {
  readonly areaManager = new AreaManager();
  private listeners = new Set<() => void>();
  private accumulator = 0;
  private readonly maxSubSteps = 5;

  constructor(public state: GameState) {
    refreshQuestProgress(this.state);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(action: GameAction): void {
    this.state.realtime.actionQueue.push({
      id: createId('action'),
      actorId: 'player',
      action: action as unknown as { type: string; [key: string]: unknown },
      createdAt: this.state.clock
    });
  }

  private applyAction(action: GameAction, fromBuffer = false): void {
    switch (action.type) {
      case 'MOVE_BY':
        if (this.state.ui.movementMode === 'mouse') {
          this.state.ui.prompt = 'Keyboard movement disabled in Mouse Only mode.';
          break;
        }
        recordPlaytestMilestone(this.state, 'timeToFirstMovement');
        this.recordMovementCommand('direct');
        cancelApproachIntent(this.state, 'Movement command cancelled approach.');
        movePlayerBy(this.state, this.areaManager, action.dx, action.dz);
        break;
      case 'MOVE_TO':
        if (this.state.ui.movementMode === 'keyboard') {
          clearClickPathUnlessApproaching(this.state);
          this.state.ui.prompt = 'Mouse movement disabled in Keyboard Only mode.';
          break;
        }
        recordPlaytestMilestone(this.state, 'timeToFirstMovement');
        this.recordMovementCommand('click');
        cancelApproachIntent(this.state, 'Movement command cancelled approach.');
        setMoveTarget(this.state, this.areaManager, action.position);
        break;
      case 'STOP_MOVE':
        cancelApproachIntent(this.state, 'Manual stop cancelled approach.', 'Action cancelled.');
        clearMovementState(this.state);
        this.state.spellCasting = null;
        this.state.gathering = null;
        releaseFacingLock(this.state.player);
        setPlayerActionState(this.state, 'idle', 0, 'manual-stop');
        break;
      case 'ENTER_AREA':
        this.enterArea(action.areaId);
        break;
      case 'SELECT_ENTITY':
        this.state.player.activeTargetId = action.entityId;
        this.state.ui.selectedTarget = action.entityId ? { kind: 'entity', entityId: action.entityId } : null;
        this.state.ui.prompt = action.entityId ? 'Target selected.' : 'Target cleared.';
        break;
      case 'CYCLE_TARGET':
        this.cycleTarget(action.direction);
        break;
      case 'INTERACT_ENTITY':
        if (!fromBuffer && this.bufferEntityAction(action, action.entityId, 2.1, `Approaching ${this.state.entities[action.entityId]?.name ?? 'target'}...`)) break;
        {
          const areaBefore = this.state.player.currentArea;
          interactEntity(this.state, this.areaManager, action.entityId);
          recordPlaytestMilestone(this.state, 'timeToFirstSuccessfulInteraction');
          if (this.state.player.currentArea === areaBefore) setPlayerActionState(this.state, 'interacting', 0.35, action.entityId);
        }
        break;
      case 'ATTACK_ENTITY':
        {
          const targetId = action.entityId ?? this.state.player.activeTargetId;
          if (handleInnocentAttack(this.state, targetId)) break;
          if (!fromBuffer && this.bufferWeaponAttack(action, targetId)) break;
        }
        if (this.state.combat.meleeCooldown <= 0) {
          meleeAttack(this.state, action.entityId);
          this.state.combat.meleeCooldown = weaponCooldown(this.state);
          this.state.combat.lastAttackAt = this.state.clock;
          setPlayerActionState(this.state, 'attacking', 0.38, action.entityId ?? this.state.player.activeTargetId ?? undefined);
        }
        break;
      case 'USE_RANGED':
        if (!fromBuffer && this.bufferRangedAttack(action, action.entityId ?? this.state.player.activeTargetId)) break;
        if (this.state.combat.rangedCooldown <= 0) {
          rangedAttack(this.state, action.entityId);
          this.state.combat.rangedCooldown = 1.1;
          this.state.combat.lastAttackAt = this.state.clock;
          setPlayerActionState(this.state, 'attacking', 0.34, action.entityId ?? this.state.player.activeTargetId ?? undefined);
        }
        break;
      case 'USE_WEAPON_ABILITY':
        useWeaponAbility(this.state, action.abilityId, action.entityId);
        break;
      case 'DEFENSIVE_ACTION':
        performDefensiveAction(this.state);
        break;
      case 'CAST_SPELL':
        if (this.state.combat.magicCooldown <= 0) {
          const spell = spellDefs[action.spellId];
          const spellTarget = action.entityId ? ({ kind: 'entity', entityId: action.entityId } as const) : this.state.player.activeTargetId ? ({ kind: 'entity', entityId: this.state.player.activeTargetId } as const) : null;
          if (!fromBuffer && spell && spellTarget && spell.targetType === 'entity' && this.isTargetOutOfRange(spellTarget, spell.range)) {
            this.state.ui.prompt = 'Out of range.';
            break;
          }
          const previousCastId = this.state.spellCasting?.id ?? null;
          castSpellIntent(this.state, action.spellId, action.entityId ? { kind: 'entity', entityId: action.entityId } : null);
          if (this.state.spellCasting && this.state.spellCasting.id !== previousCastId) {
            this.state.combat.magicCooldown = spellDefs[action.spellId]?.cooldown ?? 1.2;
            this.state.combat.lastAttackAt = this.state.clock;
            setPlayerActionState(this.state, 'casting', this.state.spellCasting.remaining, action.spellId);
          }
        }
        break;
      case 'BEGIN_TARGETING':
        this.state.ui.targeting = { mode: action.mode, prompt: action.prompt, toolItemId: action.toolItemId, skillId: action.skillId, spellId: action.spellId };
        this.state.ui.prompt = action.prompt;
        break;
      case 'CANCEL_TARGETING':
        cancelApproachIntent(this.state, 'Escape cancelled approach.', 'Targeting cancelled.');
        this.state.spellCasting = null;
        this.state.ui.targeting = null;
        this.state.ui.hoverTarget = null;
        this.state.ui.prompt = 'Targeting cancelled.';
        break;
      case 'OPEN_CONTEXT_MENU':
        this.state.ui.contextMenu = { target: action.target, x: action.x, y: action.y };
        this.state.ui.selectedTarget = action.target;
        break;
      case 'CLOSE_CONTEXT_MENU':
        this.state.ui.contextMenu = null;
        break;
      case 'CONTEXT_ACTION':
        this.handleContextAction(action.command);
        break;
      case 'TARGET_ENTITY':
        this.handleTarget({ kind: 'entity', entityId: action.entityId });
        break;
      case 'TARGET_TILE':
        this.handleTarget({ kind: 'tile', areaId: action.areaId, position: action.position });
        break;
      case 'USE_TOOL_ON_TARGET':
        if (action.toolItemId === 'shovel') {
          digWithShovel(this.state, this.areaManager, action.target);
          this.state.ui.targeting = null;
          break;
        }
        if (!fromBuffer && this.bufferTargetAction(action, action.target, 4.6, 'Approaching resource...')) break;
        useToolOnTarget(this.state, this.areaManager, action.toolItemId, action.target);
        this.state.ui.targeting = null;
        break;
      case 'USE_SKILL_ON_TARGET':
        if (action.skillId === 'Meditation' || action.skillId === 'Focus') {
          meditate(this.state);
        } else if (action.skillId === 'Peacemaking' || action.skillId === 'Provocation' || action.skillId === 'Discordance') {
          useBardSkill(this.state, action.skillId, action.target);
        } else if (action.skillId === 'Detect Hidden') {
          detectHiddenPulse(this.state, action.target);
        } else if (action.skillId === 'Remove Trap') {
          removeTrapFromTarget(this.state, action.target);
        } else if (action.skillId === 'Snooping') {
          attemptSnoopContainer(this.state, action.target);
        } else if (action.skillId === 'Stealing') {
          attemptStealFromContainer(this.state, action.target);
        } else if (action.skillId === 'Forensic Evaluation') {
          inspectCrimeScene(this.state, action.target);
        } else if (action.skillId === 'Begging') {
          begNearby(this.state);
        } else {
          this.state.ui.prompt = `${action.skillId} needs a trained action.`;
        }
        this.state.ui.targeting = null;
        break;
      case 'USE_SPELL_ON_TARGET':
        {
          const spell = spellDefs[action.spellId];
          if (!fromBuffer && spell && spell.targetType === 'entity' && this.isTargetOutOfRange(action.target, spell.range)) {
            this.state.ui.prompt = 'Out of range.';
            break;
          }
        }
        castSpellIntent(this.state, action.spellId, action.target);
        this.state.ui.targeting = null;
        break;
      case 'START_BANDAGE':
        startBandage(this.state, action.target ?? { kind: 'self' });
        break;
      case 'APPLY_POISON':
        applyPoisonToWeapon(this.state, action.slot);
        break;
      case 'HIDE':
        attemptHide(this.state);
        break;
      case 'USE_BARD_SKILL':
        useBardSkill(this.state, action.skillId, action.target ?? null);
        break;
      case 'GATHER_RESOURCE':
        if (!fromBuffer && this.bufferEntityAction(action, action.entityId, 2, `Approaching ${this.state.entities[action.entityId]?.name ?? 'resource'}...`)) break;
        gatherResource(this.state, action.entityId);
        break;
      case 'PICKUP_ITEM':
        pickupLoot(this.state, action.entityId);
        break;
      case 'USE_ITEM':
        this.useInventorySlot(action.slot);
        break;
      case 'SPLIT_STACK':
        if (!splitStack(this.state.player.inventory, action.slot)) addSystemMessage(this.state, 'No room to split that stack.');
        break;
      case 'EQUIP_ITEM':
        equipItem(this.state, action.slot);
        break;
      case 'MOVE_ITEM':
        if (action.from === 'inventory' && action.to === 'trade-player') {
          offerTradeItem(this.state, action.slot, action.targetSlot);
        } else if (action.from === 'trade-player' && action.to === 'inventory') {
          removeTradeOffer(this.state, action.slot);
        } else {
          const movedStack = action.from === 'inventory' && action.to === 'bank' ? this.state.player.inventory.slots[action.slot] : null;
          moveStackBetween(this.state, action.from, action.to, action.slot, action.targetSlot);
          if (movedStack && action.to === 'bank') {
            recordQuestEvent(this.state, { type: 'bank', itemId: movedStack.itemId, quantity: movedStack.quantity });
          }
        }
        refreshQuestProgress(this.state);
        break;
      case 'OPEN_BANK':
        this.state.ui.panels.bank = true;
        this.state.ui.panels.inventory = true;
        recordWindowOpened(this.state, 'bank');
        recordWindowOpened(this.state, 'inventory');
        break;
      case 'OPEN_TRADE':
        openTrade(this.state, action.partnerId);
        recordWindowOpened(this.state, 'trade');
        break;
      case 'HIRE_COMPANION':
        if (!fromBuffer && this.bufferEntityAction(action, action.entityId, 2.1, `Approaching ${this.state.entities[action.entityId]?.name ?? 'companion'}...`)) break;
        hireCompanion(this.state, action.entityId);
        break;
      case 'SET_COMPANION_COMMAND':
        setCompanionCommand(this.state, action.entityId, action.command);
        break;
      case 'DISMISS_COMPANION':
        dismissCompanion(this.state, action.entityId);
        break;
      case 'BUY_MERCHANT_ITEM':
        buyMerchantItem(this.state, action.slot);
        break;
      case 'SELL_MERCHANT_ITEM':
        sellMerchantItem(this.state, action.slot);
        break;
      case 'TRAIN_SKILL':
        trainSkill(this.state, action.skillId);
        break;
      case 'CLOSE_MERCHANT':
        closeMerchant(this.state);
        break;
      case 'SET_TRADE_GOLD':
        if (this.state.ui.trade) {
          const amount = Math.max(0, Math.min(this.state.player.gold, Math.floor(action.amount)));
          this.state.ui.trade.playerGold = amount;
          this.state.ui.trade.playerLocked = false;
          this.state.ui.trade.partnerLocked = false;
        }
        break;
      case 'LOCK_TRADE':
        this.lockTrade(action.side);
        break;
      case 'CANCEL_TRADE':
        this.cancelTrade();
        break;
      case 'START_CRAFT':
        startCraft(this.state, action.recipeId, action.quantity);
        break;
      case 'COMPLETE_CRAFT':
        this.forceCompleteCraft(action.jobId);
        break;
      case 'REPAIR_EQUIPPED_ITEM':
        repairEquippedItem(this.state, action.slot);
        break;
      case 'COMPLETE_WORK_ORDER':
        completeWorkOrder(this.state, action.orderId);
        break;
      case 'FULFILL_MARKET_ORDER':
        fulfillMarketOrder(this.state, action.orderId);
        break;
      case 'TOGGLE_BUILD_MODE':
        {
          const nextActive = action.active ?? !this.state.buildMode.active;
          if (nextActive && this.state.player.currentArea !== 'housing') {
            this.state.buildMode.active = false;
            this.state.ui.panels.build = false;
            this.state.ui.prompt = 'Travel to your housing plot before building.';
            addSystemMessage(this.state, this.state.ui.prompt);
            break;
          }
          this.state.buildMode.active = nextActive;
        }
        this.state.ui.panels.build = this.state.buildMode.active;
        if (this.state.buildMode.active && this.state.player.currentArea === 'housing') claimPlotAndRefreshBuild(this.state, this.areaManager);
        updateBuildGhost(this.state, this.areaManager, this.state.buildMode.active ? { ...this.state.player.position, x: this.state.player.position.x + 2 } : this.state.player.position);
        setPlayerActionState(this.state, this.state.buildMode.active ? 'building' : 'idle', this.state.buildMode.active ? 0.2 : 0, 'build-mode');
        break;
      case 'SET_BUILD_PIECE':
        this.state.buildMode.selectedPieceId = action.pieceId;
        this.state.ui.selectedBuildCategory = action.category ?? buildPieces.find((piece) => piece.id === action.pieceId)?.category ?? this.state.ui.selectedBuildCategory;
        updateBuildGhost(this.state, this.areaManager, this.state.buildMode.ghostPosition);
        break;
      case 'SET_BUILD_GHOST':
        updateBuildGhost(this.state, this.areaManager, action.position);
        break;
      case 'ROTATE_BUILDING':
        this.state.buildMode.rotation = (this.state.buildMode.rotation + action.delta + 360) % 360;
        break;
      case 'TOGGLE_BUILD_SNAP':
        this.state.buildMode.snapToGrid = !this.state.buildMode.snapToGrid;
        updateBuildGhost(this.state, this.areaManager, this.state.buildMode.ghostPosition);
        break;
      case 'PLACE_BUILDING':
        if (placeBuilding(this.state, this.areaManager)) saveGame(this.state);
        setPlayerActionState(this.state, 'building', 0.25, 'place-building');
        break;
      case 'CLAIM_STARTER_PLOT':
        claimPlotAndRefreshBuild(this.state, this.areaManager);
        break;
      case 'UPGRADE_HOUSING_TIER':
        if (upgradeHousingTier(this.state)) saveGame(this.state);
        updateBuildGhost(this.state, this.areaManager, this.state.buildMode.ghostPosition);
        break;
      case 'UNDO_LAST_BUILDING':
        if (undoLastBuilding(this.state, this.areaManager)) saveGame(this.state);
        break;
      case 'BEGIN_MOVE_LAST_BUILDING':
        beginMoveLastBuilding(this.state, this.areaManager);
        break;
      case 'SELECT_HOUSING_STORAGE':
        selectHousingStorage(this.state, action.storageId);
        break;
      case 'DEPOSIT_HOUSING_SELECTED':
        if (depositSelectedToHousingStorage(this.state, action.slot, action.storageId)) saveGame(this.state);
        break;
      case 'WITHDRAW_HOUSING_SLOT':
        if (withdrawFromHousingStorage(this.state, action.storageId, action.slot)) saveGame(this.state);
        break;
      case 'UPGRADE_HOUSING_STORAGE':
        if (upgradeHousingStorage(this.state, action.storageId)) saveGame(this.state);
        break;
      case 'REST_AT_HOME':
        restAtHome(this.state);
        break;
      case 'HARVEST_HOUSING_GARDEN':
        if (harvestHousingGarden(this.state, action.buildingId)) saveGame(this.state);
        break;
      case 'ACCEPT_QUEST':
        if (!this.state.player.activeQuestIds.includes(action.questId)) this.state.player.activeQuestIds.push(action.questId);
        refreshQuestProgress(this.state);
        break;
      case 'COMPLETE_QUEST':
        completeQuest(this.state, action.questId);
        break;
      case 'TOGGLE_PANEL':
        this.state.ui.panels[action.panel] = action.open ?? !this.state.ui.panels[action.panel];
        if (action.panel === 'skills' && this.state.ui.panels[action.panel]) this.state.ui.skillsViewMode = 'ledger';
        if (this.state.ui.panels[action.panel]) {
          recordQuestEvent(this.state, { type: 'open_panel', panel: action.panel });
          recordWindowOpened(this.state, action.panel);
        }
        break;
      case 'HOVER_TARGET':
        this.state.ui.hoverTarget = action.target;
        break;
      case 'SELECT_TARGET':
        this.state.ui.selectedTarget = action.target;
        break;
      case 'SELECT_INVENTORY_SLOT':
        this.state.ui.selectedInventorySlot = action.slot;
        this.state.ui.selectedTarget = action.slot == null ? null : { kind: 'inventory', owner: 'inventory', slot: action.slot };
        break;
      case 'SELECT_BANK_SLOT':
        this.state.ui.selectedBankSlot = action.slot;
        this.state.ui.selectedTarget = action.slot == null ? null : { kind: 'inventory', owner: 'bank', slot: action.slot };
        break;
      case 'SELECT_RECIPE':
        this.state.ui.selectedRecipeId = action.recipeId;
        break;
      case 'SET_CRAFT_STATION': {
        this.state.ui.selectedStationType = action.stationType;
        const first = recipes.find((recipe) => action.stationType === 'all' || recipe.stationType === action.stationType);
        if (first) this.state.ui.selectedRecipeId = first.id;
        break;
      }
      case 'SET_MARKET_FILTER':
        this.state.ui.marketCategory = action.category;
        break;
      case 'SET_MARKET_VIEW':
        this.state.ui.marketView = action.view;
        break;
      case 'SET_MARKET_SEARCH':
        this.state.ui.marketSearch = action.search.slice(0, 40);
        break;
      case 'SET_TREASURE_MAP':
        this.state.ui.selectedTreasureMapId = action.mapId;
        break;
      case 'DECIPHER_TREASURE_MAP':
        decipherTreasureMap(this.state, action.mapId ?? this.state.ui.selectedTreasureMapId);
        break;
      case 'PIN_TREASURE_MAP':
        pinTreasureMap(this.state, action.mapId ?? this.state.ui.selectedTreasureMapId);
        break;
      case 'SET_MAP_WAYPOINT': {
        const area = areas[action.areaId];
        const label = (action.label?.trim() || area?.name || 'Map waypoint').slice(0, 64);
        this.state.ui.mapWaypoint = {
          areaId: action.areaId,
          position: { x: Math.round(action.position.x), y: 0, z: Math.round(action.position.z) },
          label,
          source: action.source ?? 'manual',
          setAt: this.state.clock
        };
        this.state.ui.prompt =
          action.areaId === this.state.player.currentArea
            ? `Waypoint set: ${label}.`
            : `Waypoint set in ${area.name}. Follow discovered entrances to reach it.`;
        break;
      }
      case 'CLEAR_MAP_WAYPOINT':
        this.state.ui.mapWaypoint = null;
        this.state.ui.prompt = 'Waypoint cleared.';
        break;
      case 'SET_MINIMAP_MODE':
        this.state.ui.minimapMode = action.mode;
        this.state.ui.panels.map = action.mode === 'expanded';
        this.state.ui.prompt = `Map mode: ${action.mode}.`;
        break;
      case 'TOGGLE_MAP_LAYER': {
        const hidden = new Set(this.state.ui.mapHiddenLayers);
        if (hidden.has(action.layerId)) hidden.delete(action.layerId);
        else hidden.add(action.layerId);
        this.state.ui.mapHiddenLayers = Array.from(hidden);
        break;
      }
      case 'SELECT_SPELL':
        this.state.ui.selectedSpellId = action.spellId;
        break;
      case 'SET_SPELL_SEARCH':
        this.state.ui.spellSearch = action.search.slice(0, 40);
        this.state.ui.spellbookSearch = action.search.slice(0, 48);
        break;
      case 'SET_SPELLBOOK_CIRCLE':
        this.state.ui.spellbookCircle = action.circle;
        this.state.ui.spellbookCircleFilter = action.circle;
        break;
      case 'SET_SPELLBOOK_FILTER':
        this.state.ui.spellbookFilter = action.filter;
        this.state.ui.spellbookKnowledgeFilter = action.filter;
        break;
      case 'SET_SPELLBOOK_VIEW':
        this.state.ui.spellbookView = action.view;
        this.state.ui.spellbookViewMode = action.view;
        break;
      case 'SET_JOURNAL_TAB':
        this.state.ui.journalTab = action.tab;
        break;
      case 'PIN_RUMOR':
        if (action.eventId && this.state.world.activeEvents.some((event) => event.id === action.eventId)) {
          this.state.ui.pinnedRumorId = this.state.ui.pinnedRumorId === action.eventId ? null : action.eventId;
          this.state.world.discoveredRumorIds = Array.from(new Set([...this.state.world.discoveredRumorIds, action.eventId]));
          this.state.ui.panels.journal = true;
          this.state.ui.prompt = this.state.ui.pinnedRumorId ? 'Rumor pinned to Journal.' : 'Rumor unpinned.';
        } else {
          this.state.ui.pinnedRumorId = null;
          this.state.ui.prompt = 'Rumor unpinned.';
        }
        break;
      case 'PIN_WORK_ORDER':
        if (action.orderId && this.state.world.economy.workOrders.some((order) => order.id === action.orderId && order.status === 'open')) {
          this.state.ui.pinnedWorkOrderId = this.state.ui.pinnedWorkOrderId === action.orderId ? null : action.orderId;
          this.state.ui.journalTab = 'workOrders';
          this.state.ui.panels.journal = true;
          this.state.ui.prompt = this.state.ui.pinnedWorkOrderId ? 'Work order pinned to Journal.' : 'Work order unpinned.';
        } else {
          this.state.ui.pinnedWorkOrderId = null;
          this.state.ui.prompt = 'Work order unpinned.';
        }
        break;
      case 'SET_SPELLBOOK_SEARCH':
        this.state.ui.spellbookSearch = action.search.slice(0, 48);
        this.state.ui.spellSearch = action.search.slice(0, 40);
        break;
      case 'SET_SPELLBOOK_KNOWLEDGE_FILTER':
        this.state.ui.spellbookKnowledgeFilter = action.filter;
        this.state.ui.spellbookFilter = action.filter;
        break;
      case 'SET_SPELLBOOK_CIRCLE_FILTER':
        this.state.ui.spellbookCircleFilter = action.circle;
        this.state.ui.spellbookCircle = action.circle;
        break;
      case 'SET_SPELLBOOK_ROLE_FILTER':
        this.state.ui.spellbookRoleFilter = action.role;
        break;
      case 'SET_SPELLBOOK_VIEW_MODE':
        this.state.ui.spellbookViewMode = action.mode;
        if (action.mode === 'grid' || action.mode === 'list') this.state.ui.spellbookView = action.mode;
        break;
      case 'BEGIN_HOTBAR_ASSIGNMENT':
        if (!this.state.player.spellbook.knownSpellIds.includes(action.spellId)) {
          this.state.ui.prompt = 'Unknown spell.';
          break;
        }
        this.state.ui.hotbarAssignSpellId = action.spellId;
        this.state.ui.prompt = 'Press 1-0 to assign this spell to the hotbar.';
        break;
      case 'CANCEL_HOTBAR_ASSIGNMENT':
        this.state.ui.hotbarAssignSpellId = null;
        break;
      case 'SET_CRAFT_QUANTITY':
        this.state.ui.craftQuantity = Math.max(1, Math.min(20, Math.floor(action.quantity)));
        break;
      case 'SET_SKILL_MODE':
        setSkillMode(this.state, action.skillId, action.mode);
        break;
      case 'SET_SKILL_GROUP':
        this.state.player.selectedSkillGroup = action.group;
        break;
      case 'SET_SKILL_SEARCH':
        this.state.ui.skillSearch = action.search;
        break;
      case 'SET_SKILL_VIEW':
        this.state.ui.skillView = action.view;
        this.state.ui.skillsViewMode = action.view === 'mastery' ? 'milestones' : action.view;
        break;
      case 'SET_PROFESSION_FILTER':
        this.state.ui.professionFilter = action.professionId;
        this.state.ui.skillProfessionFilter = action.professionId as typeof this.state.ui.skillProfessionFilter;
        this.state.ui.selectedProfessionNodeId = null;
        break;
      case 'SET_SKILLS_VIEW_MODE':
        this.state.ui.skillsViewMode = action.mode;
        this.state.ui.skillView = action.mode === 'milestones' ? 'mastery' : action.mode;
        break;
      case 'SET_SKILL_TRAINABLE_FILTER':
        this.state.ui.skillTrainableFilter = action.filter;
        break;
      case 'SET_SKILL_RECENT_FILTER':
        this.state.ui.skillRecentFilter = action.filter;
        break;
      case 'SET_SKILL_PROFESSION_FILTER':
        this.state.ui.skillProfessionFilter = action.filter;
        this.state.ui.professionFilter = action.filter;
        this.state.ui.selectedProfessionNodeId = null;
        break;
      case 'SET_PROFESSION_ATLAS_ZOOM':
        this.state.ui.professionAtlasZoom = Math.max(0.75, Math.min(1.35, Number(action.zoom.toFixed(2))));
        break;
      case 'SET_PROFESSION_ATLAS_SEARCH':
        this.state.ui.professionAtlasSearch = action.search;
        break;
      case 'SET_PROFESSION_ATLAS_SHOW_FUTURE':
        this.state.ui.professionAtlasShowFuture = action.show;
        break;
      case 'SET_PROFESSION_ATLAS_NODE':
        this.state.ui.selectedProfessionNodeId = action.nodeId;
        break;
      case 'ACCEPT_PROFESSION_CONTRACT':
        if (professionContractById(action.contractId)) {
          this.state.ui.activeProfessionContractId = action.contractId;
          this.state.ui.skillView = 'atlas';
          this.state.ui.skillsViewMode = 'atlas';
          this.state.ui.professionFilter = professionContractById(action.contractId)?.professionId ?? this.state.ui.professionFilter;
          this.state.ui.prompt = 'Profession contract accepted. Skills remain classless.';
        }
        break;
      case 'ABANDON_PROFESSION_CONTRACT':
        if (this.state.ui.activeProfessionContractId === action.contractId) {
          this.state.ui.activeProfessionContractId = null;
          if (this.state.ui.pinnedProfessionGoalId === `contract:${action.contractId}`) this.state.ui.pinnedProfessionGoalId = null;
          this.state.ui.prompt = 'Profession contract abandoned. No skills were locked.';
        }
        break;
      case 'PIN_PROFESSION_GOAL':
        this.state.ui.pinnedProfessionGoalId = this.state.ui.pinnedProfessionGoalId === action.goalId ? null : action.goalId;
        this.state.ui.journalTab = 'tutorials';
        this.state.ui.panels.journal = true;
        this.state.ui.prompt = this.state.ui.pinnedProfessionGoalId ? 'Profession goal pinned to Journal.' : 'Profession goal unpinned.';
        break;
      case 'TOGGLE_DEV_TRAVEL':
        this.state.ui.devTravel = !this.state.ui.devTravel;
        this.state.ui.prompt = this.state.ui.devTravel ? 'Dev travel enabled.' : 'Dev travel hidden.';
        break;
      case 'TOGGLE_DEV_OVERLAY':
        this.state.dev.overlay = !this.state.dev.overlay;
        this.state.ui.prompt = this.state.dev.overlay ? 'Dev overlay enabled.' : 'Dev overlay hidden.';
        break;
      case 'DEV_TELEPORT_SCENE':
        devTeleportToScene(this.state, this.areaManager, action.sceneId);
        break;
      case 'DEV_APPLY_SCREENSHOT_PARITY':
        this.applyScreenshotParityPreset(action.presetId);
        break;
      case 'DEV_CLEAR_SCREENSHOT_PARITY':
        this.clearScreenshotParityPreset();
        break;
      case 'DEV_TELEPORT_AREA':
        devTeleportToArea(this.state, this.areaManager, action.areaId);
        break;
      case 'DEV_SPAWN_ITEM':
        devSpawnItem(this.state, action.itemId, action.quantity);
        break;
      case 'DEV_SPAWN_ENEMY':
        devSpawnEnemy(this.state, action.enemyType);
        break;
      case 'DEV_SET_SKILL':
        devSetSkillValue(this.state, action.skillId, action.value);
        break;
      case 'DEV_ADD_GOLD':
        devAddGold(this.state, action.amount);
        break;
      case 'DEV_RESET_RESOURCES':
        devResetResources(this.state);
        break;
      case 'DEV_COMPLETE_QUEST_STEP':
        devCompleteQuestStep(this.state);
        break;
      case 'DEV_GIVE_SPELL':
        devGiveSpell(this.state, action.spellId);
        break;
      case 'DEV_SIMULATE_TIME':
        devSimulateTime(this.state, action.phase);
        break;
      case 'DEV_TRIGGER_WORLD_EVENT':
        triggerWorldEvent(this.state, action.eventType);
        break;
      case 'DEV_EXPORT_TELEMETRY':
        devExportTelemetry(this.state);
        break;
      case 'UPDATE_INPUT_DEBUG':
        this.state.dev.input = { ...this.state.dev.input, ...action.patch };
        break;
      case 'TOGGLE_FACING_DEBUG':
        this.state.dev.facingDebug[action.key] = !this.state.dev.facingDebug[action.key];
        this.state.ui.prompt = `${action.key} ${this.state.dev.facingDebug[action.key] ? 'enabled' : 'hidden'}.`;
        break;
      case 'SET_CHAT_TAB':
        this.state.ui.chatTab = action.channel;
        this.state.ui.chatHiddenChannels = this.state.ui.chatHiddenChannels.filter((channel) => channel !== action.channel);
        if (this.state.ui.chatMode === 'collapsed') this.state.ui.chatMode = 'compact';
        break;
      case 'SET_CHAT_MODE':
        this.state.ui.chatMode = action.mode;
        break;
      case 'TOGGLE_CHAT_CHANNEL': {
        const hidden = new Set(this.state.ui.chatHiddenChannels);
        if (hidden.has(action.channel)) hidden.delete(action.channel);
        else hidden.add(action.channel);
        this.state.ui.chatHiddenChannels = Array.from(hidden);
        if (hidden.has(this.state.ui.chatTab)) {
          this.state.ui.chatTab = (['Local', 'Party', 'Guild', 'Global', 'System', 'Rumors'] as const).find((channel) => !hidden.has(channel)) ?? 'Local';
        }
        break;
      }
      case 'SET_CHAT_OPACITY':
        this.state.ui.chatOpacity = Math.max(0.45, Math.min(1, action.opacity));
        break;
      case 'SET_CHAT_RETENTION':
        this.state.ui.chatMessageRetention = Math.round(Math.max(40, Math.min(240, action.limit)));
        if (this.state.chat.length > this.state.ui.chatMessageRetention) this.state.chat.splice(0, this.state.chat.length - this.state.ui.chatMessageRetention);
        break;
      case 'SEND_CHAT':
        if (action.text.trim()) {
          addChat(this.state, action.text.trim(), { speaker: 'Valen', channel: this.state.ui.chatTab === 'System' || this.state.ui.chatTab === 'Rumors' ? 'Local' : this.state.ui.chatTab });
          if (this.state.ui.chatMode === 'collapsed') this.state.ui.chatMode = 'compact';
        }
        break;
      case 'SHOW_PROMPT':
        this.state.ui.prompt = action.message;
        break;
      case 'USE_HOTBAR':
        this.useHotbar(action.slot);
        break;
      case 'SET_ACTIVE_HOTBAR_SLOT':
        if (action.slot >= 0 && action.slot < this.state.ui.hotbar.length) {
          this.state.ui.activeHotbarSlot = action.slot;
          this.state.ui.prompt = `Hotbar ${action.slot === 9 ? 0 : action.slot + 1} selected.`;
        }
        break;
      case 'SET_HOTBAR_SLOT':
        if (action.slot >= 0 && action.slot < this.state.ui.hotbar.length) {
          this.state.ui.hotbar[action.slot] = action.binding;
          this.state.ui.hotbarAssignSpellId = null;
          this.state.ui.prompt = action.binding ? `Hotbar ${action.slot === 9 ? 0 : action.slot + 1} updated.` : `Hotbar ${action.slot === 9 ? 0 : action.slot + 1} cleared.`;
          if (action.binding) recordPlaytestMilestone(this.state, 'timeToAssignHotbar');
        }
        break;
      case 'CLEAR_HOTBAR_SLOT':
        if (action.slot >= 0 && action.slot < this.state.ui.hotbar.length) {
          this.state.ui.hotbar[action.slot] = null;
          this.state.ui.prompt = `Hotbar ${action.slot === 9 ? 0 : action.slot + 1} cleared.`;
        }
        break;
      case 'MOVE_HOTBAR_SLOT':
        if (action.from >= 0 && action.from < this.state.ui.hotbar.length && action.to >= 0 && action.to < this.state.ui.hotbar.length && action.from !== action.to) {
          const fromBinding = this.state.ui.hotbar[action.from];
          this.state.ui.hotbar[action.from] = this.state.ui.hotbar[action.to];
          this.state.ui.hotbar[action.to] = fromBinding;
          this.state.ui.prompt = `Hotbar ${action.from === 9 ? 0 : action.from + 1} moved to ${action.to === 9 ? 0 : action.to + 1}.`;
        }
        break;
      case 'SET_UI_SCALE':
        this.state.ui.uiScale = Math.max(0.8, Math.min(1.25, Number(action.scale.toFixed(2))));
        this.state.ui.prompt = `UI scale ${Math.round(this.state.ui.uiScale * 100)}%.`;
        break;
      case 'SET_FONT_SCALE':
        this.state.ui.fontScale = Math.max(0.9, Math.min(1.25, Number(action.scale.toFixed(2))));
        this.state.ui.prompt = `Font size ${Math.round(this.state.ui.fontScale * 100)}%.`;
        break;
      case 'SET_TOOLTIP_DELAY':
        this.state.ui.tooltipDelayMs = Math.max(0, Math.min(800, Math.round(action.delayMs)));
        this.state.ui.prompt = `Tooltip delay ${this.state.ui.tooltipDelayMs}ms.`;
        break;
      case 'SET_TOOLTIP_MODE':
        this.state.ui.tooltipMode = action.mode;
        this.state.ui.prompt = action.mode === 'advanced' ? 'Advanced tooltips enabled.' : 'Compact tooltips enabled.';
        break;
      case 'SET_ADVANCED_TOOLTIP_MODIFIER':
        this.state.ui.advancedTooltipModifier = action.modifier;
        this.state.ui.prompt = `Advanced tooltip modifier: ${action.modifier}.`;
        break;
      case 'TOGGLE_REDUCED_MOTION':
        this.state.ui.reducedMotion = !this.state.ui.reducedMotion;
        this.state.ui.prompt = this.state.ui.reducedMotion ? 'Reduced motion enabled.' : 'Reduced motion disabled.';
        break;
      case 'TOGGLE_COLORBLIND_STATUS':
        this.state.ui.colorblindStatusColors = !this.state.ui.colorblindStatusColors;
        this.state.ui.prompt = this.state.ui.colorblindStatusColors ? 'Colorblind-friendly status colors enabled.' : 'Default status colors enabled.';
        break;
      case 'TOGGLE_DAMAGE_NUMBERS':
        this.state.ui.showDamageNumbers = !this.state.ui.showDamageNumbers;
        this.state.ui.prompt = this.state.ui.showDamageNumbers ? 'Damage numbers shown.' : 'Damage numbers hidden.';
        break;
      case 'TOGGLE_SKILL_GAIN_TOASTS':
        this.state.ui.showSkillGainToasts = !this.state.ui.showSkillGainToasts;
        this.state.ui.prompt = this.state.ui.showSkillGainToasts ? 'Skill gain toasts shown.' : 'Skill gain toasts hidden.';
        break;
      case 'TOGGLE_CHAT_TABS':
        this.state.ui.showChatTabs = !this.state.ui.showChatTabs;
        this.state.ui.prompt = this.state.ui.showChatTabs ? 'Chat tabs shown.' : 'Chat tabs hidden.';
        break;
      case 'SET_AUDIO_VOLUME':
        this.state.ui.audio.volumes[action.category] = clampAudioVolume(action.volume);
        this.state.ui.prompt = `${action.category} volume ${Math.round(this.state.ui.audio.volumes[action.category] * 100)}%.`;
        break;
      case 'TOGGLE_MUTE_WHEN_UNFOCUSED':
        this.state.ui.audio.muteWhenUnfocused = !this.state.ui.audio.muteWhenUnfocused;
        this.state.ui.prompt = this.state.ui.audio.muteWhenUnfocused ? 'Audio mutes when unfocused.' : 'Audio keeps playing when unfocused.';
        break;
      case 'TOGGLE_VISUAL_AUDIO_CUES':
        this.state.ui.audio.visualAudioCues = !this.state.ui.audio.visualAudioCues;
        this.state.ui.prompt = this.state.ui.audio.visualAudioCues ? 'Visual audio substitutes enabled.' : 'Visual audio substitutes hidden.';
        break;
      case 'TOGGLE_LOCK_UI_LAYOUT':
        this.state.ui.lockUILayout = !this.state.ui.lockUILayout;
        this.state.ui.prompt = this.state.ui.lockUILayout ? 'UI layout locked.' : 'UI layout unlocked.';
        break;
      case 'SET_HUD_DENSITY':
        this.state.ui.hudDensity = action.density;
        break;
      case 'SET_FRAME_RATE_CAP_MODE':
        this.state.ui.frameRateCapMode = action.mode;
        this.state.ui.prompt = `Frame-rate cap: ${frameRateCapLabel(action.mode, this.state.ui.customFrameRateCap)}.`;
        break;
      case 'SET_CUSTOM_FRAME_RATE_CAP':
        this.state.ui.customFrameRateCap = sanitizeCustomFrameRateCap(action.fps);
        this.state.ui.frameRateCapMode = 'custom';
        this.state.ui.prompt = `Frame-rate cap: ${this.state.ui.customFrameRateCap} FPS.`;
        break;
      case 'BEGIN_KEYBIND_CAPTURE':
        this.state.ui.keybindingCapture = { actionId: action.actionId, context: action.context };
        this.state.ui.prompt = `Press a key for ${actionLabelForId(action.actionId)}.`;
        break;
      case 'SET_INPUT_BINDING':
        this.state.ui.inputBindings = rebindInputAction(this.state.ui.inputBindings, action.actionId, action.context, action.key);
        this.state.ui.keybindingCapture = null;
        {
          const conflicts = findInputBindingConflicts(this.state.ui.inputBindings);
          const conflict = conflicts.find((candidate) => candidate.context === action.context && candidate.key === action.key);
          this.state.ui.prompt = conflict
            ? `Binding conflict: ${conflict.labels.join(' / ')} share ${keyLabel(action.key)}.`
            : `${actionLabelForId(action.actionId)} set to ${keyLabel(action.key)}.`;
        }
        break;
      case 'RESET_INPUT_BINDINGS':
        this.state.ui.inputBindings = createDefaultInputBindings();
        this.state.ui.keybindingCapture = null;
        this.state.ui.prompt = 'Keybindings reset to defaults.';
        break;
      case 'SET_MOVEMENT_MODE':
        this.state.ui.movementMode = action.mode;
        applyMovementModeTransition(this.state, action.mode);
        this.state.ui.prompt = `Movement mode: ${movementModeLabel(action.mode)}.`;
        break;
      case 'SET_CAMERA_SMOOTHING':
        this.state.ui.cameraSmoothing = action.mode;
        this.state.ui.prompt = `Camera smoothing: ${action.mode}.`;
        break;
      case 'TOGGLE_CAMERA_RELATIVE_MOVEMENT':
        this.state.ui.cameraRelativeMovement = !this.state.ui.cameraRelativeMovement;
        this.state.ui.prompt = this.state.ui.cameraRelativeMovement ? 'Camera-relative movement enabled.' : 'World-axis movement enabled.';
        break;
      case 'SET_WINDOW_LAYOUT':
        if (this.state.ui.lockUILayout) {
          this.state.ui.prompt = 'UI layout is locked.';
          break;
        }
        this.state.ui.windowLayouts[action.windowId] = action.layout;
        this.state.ui.windowLayoutPreset = 'default';
        break;
      case 'FOCUS_WINDOW':
        this.state.ui.windowFocusOrder = updateWindowFocusOrder(this.state.ui.windowFocusOrder ?? [], action.windowId);
        break;
      case 'RESET_UI_LAYOUT':
        this.state.ui.windowLayouts = {};
        this.state.ui.windowLayoutPreset = 'default';
        this.state.ui.prompt = 'UI layout reset.';
        recordUiReset(this.state);
        break;
      case 'APPLY_UI_LAYOUT_PRESET':
        applyUiLayoutPresetSettings(this.state, action.preset);
        this.state.ui.prompt = `${action.preset} UI layout.`;
        recordUiReset(this.state);
        break;
      case 'SET_COMBAT_APPROACH_MODE':
        this.state.player.combatPreferences.approachMode = action.mode;
        this.state.ui.prompt = `Auto-approach: ${this.combatApproachLabel(action.mode)}.`;
        break;
      case 'TOGGLE_AUTO_ATTACK_ON_TARGET_SELECT':
        this.state.player.combatPreferences.autoAttackOnTargetSelect = !this.state.player.combatPreferences.autoAttackOnTargetSelect;
        this.state.ui.prompt = this.state.player.combatPreferences.autoAttackOnTargetSelect ? 'Auto-attack on target select enabled.' : 'Auto-attack on target select disabled.';
        break;
      case 'TOGGLE_STOP_MOVEMENT_WHEN_CASTING':
        this.state.player.combatPreferences.stopMovementWhenCasting = !this.state.player.combatPreferences.stopMovementWhenCasting;
        this.state.ui.prompt = this.state.player.combatPreferences.stopMovementWhenCasting ? 'Casting stops movement.' : 'Casting keeps current movement.';
        break;
      case 'TOGGLE_PAUSE':
        this.state.paused = action.paused ?? !this.state.paused;
        this.state.ui.panels.help = this.state.paused ? true : this.state.ui.panels.help;
        this.state.ui.prompt = this.state.paused ? 'Paused. Help is open.' : 'Back to Briarbrook.';
        break;
      case 'SAVE_GAME':
        saveGame(this.state);
        addSystemMessage(this.state, 'Game saved.');
        break;
      case 'RESET_GAME':
        clearSave();
        this.state = createInitialGameState();
        break;
      case 'RESPAWN':
        this.respawnPlayer();
        break;
      default:
        action satisfies never;
    }
    sanitizeUiStateReferences(this.state);
    refreshQuestProgress(this.state);
  }

  update(dt: number): void {
    if (this.state.paused) {
      this.state.realtime.renderAlpha = 1;
      if (this.state.realtime.actionQueue.length) {
        this.processActionQueue();
        this.emit();
      }
      return;
    }
    this.state.realtime.lastFrameDelta = dt;
    this.accumulator += Math.min(0.25, dt);
    let steps = 0;
    while (this.accumulator >= this.state.realtime.fixedDelta && steps < this.maxSubSteps) {
      this.stepFixed(this.state.realtime.fixedDelta);
      this.accumulator -= this.state.realtime.fixedDelta;
      steps += 1;
    }
    if (steps === this.maxSubSteps) this.accumulator = 0;
    this.state.realtime.renderAlpha = this.state.realtime.fixedDelta > 0 ? Math.max(0, Math.min(1, this.accumulator / this.state.realtime.fixedDelta)) : 1;
    if (steps > 0) this.emit();
  }

  private stepFixed(dt: number): void {
    this.state.clock += dt;
    this.state.realtime.tick += 1;
    this.processActionQueue();
    this.state.combat.meleeCooldown = Math.max(0, this.state.combat.meleeCooldown - dt);
    this.state.combat.rangedCooldown = Math.max(0, this.state.combat.rangedCooldown - dt);
    this.state.combat.magicCooldown = Math.max(0, this.state.combat.magicCooldown - dt);
    Object.entries(this.state.combat.hitFlashes).forEach(([id, until]) => {
      if (until <= this.state.clock) delete this.state.combat.hitFlashes[id];
    });
    this.updateActionBuffer();
    updatePlayerMovement(this.state, this.areaManager, dt);
    this.updateActionBuffer();
    updateEnemyCombat(this.state, this.areaManager, dt);
    updateProjectiles(this.state, dt);
    updateCrafting(this.state, dt);
    updateSpellCasting(this.state, dt);
    updateBandage(this.state, dt);
    updateGathering(this.state, dt);
    updateResources(this.state, dt);
    updateLoot(this.state, dt);
    updateResourceTiles(this.state);
    updateLivingWorld(this.state, this.areaManager, dt);
    updateEconomy(this.state);
    updateReputation(this.state);
    updateSocialNpcs(this.state, dt);
    updateCompanions(this.state, this.areaManager, dt);
    updateAmbientChat(this.state, dt);
    this.regenerate(dt);
    this.updateTargetLock();
    updateAllFacing(this.state, dt);
    clearInvalidAreaTargets(this.state);
    sanitizeUiStateReferences(this.state);
    refreshPlayerActionState(this.state);
    refreshQuestProgress(this.state);
  }

  private processActionQueue(): void {
    let guard = 0;
    while (this.state.realtime.actionQueue.length && guard < 80) {
      guard += 1;
      const queued = this.state.realtime.actionQueue.shift();
      if (!queued) continue;
      this.applyAction(queued.action as unknown as GameAction);
      this.state.realtime.actionHistory.unshift({
        id: queued.id,
        actorId: queued.actorId,
        type: queued.action.type,
        createdAt: queued.createdAt,
        processedAt: this.state.clock
      });
      this.state.realtime.actionHistory = this.state.realtime.actionHistory.slice(0, 24);
    }
  }

  private applyScreenshotParityPreset(presetId: string): void {
    void import('../tools/screenshotParity')
      .then(({ applyScreenshotParityPreset }) => {
        applyScreenshotParityPreset(this.state, this.areaManager, presetId);
        sanitizeUiStateReferences(this.state);
        refreshQuestProgress(this.state);
        this.emit();
      })
      .catch(() => {
        this.state.ui.prompt = `Unable to load screenshot parity preset: ${presetId}.`;
        this.emit();
      });
  }

  private clearScreenshotParityPreset(): void {
    void import('../tools/screenshotParity')
      .then(({ clearScreenshotParityPreset }) => {
        clearScreenshotParityPreset(this.state);
        sanitizeUiStateReferences(this.state);
        refreshQuestProgress(this.state);
        this.emit();
      })
      .catch(() => {
        this.state.ui.prompt = 'Unable to load screenshot parity tools.';
        this.emit();
      });
  }

  private updateActionBuffer(): void {
    const pending = this.state.realtime.pendingAction;
    if (!pending) return;
    const invalidReason = this.pendingActionInvalidReason(pending);
    if (invalidReason) {
      this.cancelBufferedAction(invalidReason);
      return;
    }
    const targetPosition = this.resolveTargetPosition(pending.target);
    if (!targetPosition) {
      this.cancelBufferedAction('Target is no longer available.');
      return;
    }
    const dist = this.distance(this.state.player.position, targetPosition);
    if (dist <= pending.range) {
      this.state.realtime.pendingAction = null;
      this.state.player.targetPosition = null;
      this.state.player.movement.path = [];
      this.state.player.movement.waypoint = null;
      this.applyAction(pending.action as unknown as GameAction, true);
      return;
    }
    if (!this.state.player.targetPosition) {
      const pathStarted = setMoveTarget(this.state, this.areaManager, this.approachPoint(targetPosition, Math.max(0.8, pending.range * 0.78)));
      if (!pathStarted) {
        this.cancelBufferedAction('Path blocked.');
        return;
      }
      this.state.ui.prompt = pending.label;
    }
  }

  private bufferWeaponAttack(action: GameAction, entityId: string | null | undefined): boolean {
    if (!entityId) return false;
    const target = this.state.entities[entityId];
    if (!target || target.kind !== 'enemy') return false;
    const intent = this.currentWeaponIntent();
    const dist = this.distance(this.state.player.position, target.position);
    if (dist <= intent.range) return false;
    if (!this.canAutoApproach(intent.kind)) {
      this.state.ui.prompt = intent.kind === 'ranged' ? 'Bow attacks require distance and line of sight.' : 'Auto-approach is disabled.';
      return true;
    }
    return this.bufferEntityAction(action, entityId, intent.range, intent.kind === 'ranged' ? 'Moving into bow range.' : 'Moving into range.');
  }

  private bufferRangedAttack(action: GameAction, entityId: string | null | undefined): boolean {
    if (!entityId) return false;
    const target = this.state.entities[entityId];
    if (!target || target.kind !== 'enemy') return false;
    const range = this.rangedAttackRange();
    if (this.distance(this.state.player.position, target.position) <= range) return false;
    if (!this.canAutoApproach('ranged')) {
      this.state.ui.prompt = this.state.player.combatPreferences.approachMode === 'manual' ? 'Auto-approach is disabled.' : 'Bow attacks require distance and line of sight.';
      return true;
    }
    return this.bufferEntityAction(action, entityId, range, 'Moving into bow range.');
  }

  private currentWeaponIntent(): { kind: 'melee' | 'ranged'; range: number } {
    const weapon = this.state.player.equipment.weapon;
    const definition = weapon ? itemDefs[weapon.itemId] : null;
    const weaponClass = definition?.weaponClass;
    if (weaponClass === 'bow' || weaponClass === 'crossbow') {
      return { kind: 'ranged', range: definition?.range ?? 8 };
    }
    return { kind: 'melee', range: definition?.range ?? 1.45 };
  }

  private rangedAttackRange(): number {
    const equipped = this.currentWeaponIntent();
    if (equipped.kind === 'ranged') return equipped.range;
    const inventoryBow = this.state.player.inventory.slots
      .map((slot) => (slot ? itemDefs[slot.itemId] : null))
      .find((definition) => definition?.weaponClass === 'bow' || definition?.weaponClass === 'crossbow');
    return inventoryBow?.range ?? 8;
  }

  private canAutoApproach(intent: 'melee' | 'ranged' | 'spell'): boolean {
    const mode = this.state.player.combatPreferences.approachMode;
    if (mode === 'manual') return false;
    if (intent === 'spell') return false;
    if (mode === 'melee_only') return intent === 'melee';
    return mode === 'assist' || mode === 'aggressive';
  }

  private bufferEntityAction(action: GameAction, entityId: string | null | undefined, range: number, label: string): boolean {
    if (!entityId) return false;
    return this.bufferTargetAction(action, { kind: 'entity', entityId }, range, label);
  }

  private bufferTargetAction(action: GameAction, target: TargetRef, range: number, label: string): boolean {
    const targetPosition = this.resolveTargetPosition(target);
    if (!targetPosition) return false;
    if (this.distance(this.state.player.position, targetPosition) <= range) return false;
    this.state.realtime.pendingAction = {
      action: action as unknown as { type: string; [key: string]: unknown },
      target,
      range,
      createdAt: this.state.clock,
      expiresAt: this.state.clock + 8,
      label
    };
    const pathStarted = setMoveTarget(this.state, this.areaManager, this.approachPoint(targetPosition, Math.max(0.8, range * 0.78)));
    if (!pathStarted) {
      this.cancelBufferedAction('Path blocked.');
      return true;
    }
    this.state.ui.prompt = label.startsWith('Approaching') ? `You are too far away. ${label}` : label;
    return true;
  }

  private isTargetOutOfRange(target: TargetRef, range: number): boolean {
    const position = this.resolveTargetPosition(target);
    return Boolean(position && this.distance(this.state.player.position, position) > range);
  }

  private pendingActionInvalidReason(pending: NonNullable<GameState['realtime']['pendingAction']>): string | null {
    if (pending.expiresAt <= this.state.clock) return 'Cannot reach target.';
    const target = pending.target;
    if (!target) return 'Target is no longer available.';
    if (target.kind === 'tile') return target.areaId === this.state.player.currentArea ? null : 'Target is no longer available.';
    if (target.kind === 'entity' || target.kind === 'ground-item' || target.kind === 'friendly' || target.kind === 'hostile') {
      const entity = this.state.entities[target.entityId];
      if (!entity || entity.area !== this.state.player.currentArea) return 'Target is no longer available.';
      if ('state' in entity && entity.state === 'dead') return 'Target is no longer available.';
    }
    return null;
  }

  private cancelBufferedAction(reason: string): void {
    cancelApproachIntent(this.state, reason, reason);
    this.state.player.activeTargetId = null;
    setPlayerActionState(this.state, 'idle', 0, 'approach-cancelled');
  }

  private recordMovementCommand(source: string): void {
    this.state.dev.stability.lastMovementCommandAt = this.state.clock;
    this.state.dev.stability.lastMovementCommandSource = source;
  }

  private combatApproachLabel(mode: GameState['player']['combatPreferences']['approachMode']): string {
    if (mode === 'melee_only') return 'Melee Only';
    return mode[0].toUpperCase() + mode.slice(1);
  }

  private resolveTargetPosition(target: TargetRef): Vec3 | null {
    if (!target) return null;
    if (target.kind === 'tile') return target.position;
    if (target.kind === 'entity' || target.kind === 'ground-item' || target.kind === 'friendly' || target.kind === 'hostile') return this.state.entities[target.entityId]?.position ?? null;
    if (target.kind === 'self') return this.state.player.position;
    return null;
  }

  private approachPoint(target: Vec3, distanceFromTarget: number): Vec3 {
    const dx = this.state.player.position.x - target.x;
    const dz = this.state.player.position.z - target.z;
    const len = Math.hypot(dx, dz) || 1;
    return { x: target.x + (dx / len) * distanceFromTarget, y: 0, z: target.z + (dz / len) * distanceFromTarget };
  }

  private distance(a: Vec3, b: Vec3): number {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  private cycleTarget(direction: 1 | -1): void {
    const enemies = Object.values(this.state.entities)
      .filter((entity) => entity.kind === 'enemy' && entity.area === this.state.player.currentArea && entity.state !== 'dead')
      .sort((a, b) => this.distance(a.position, this.state.player.position) - this.distance(b.position, this.state.player.position));
    if (!enemies.length) {
      this.state.player.activeTargetId = null;
      this.state.ui.prompt = 'No hostile targets nearby.';
      return;
    }
    const current = enemies.findIndex((enemy) => enemy.id === this.state.player.activeTargetId);
    const next = current < 0 ? 0 : (current + direction + enemies.length) % enemies.length;
    this.state.player.activeTargetId = enemies[next].id;
    this.state.ui.selectedTarget = { kind: 'entity', entityId: enemies[next].id };
    this.state.ui.prompt = `Target: ${enemies[next].name}.`;
  }

  private updateTargetLock(): void {
    const id = this.state.player.activeTargetId;
    const target = id ? this.state.entities[id] : null;
    if (!target || target.kind !== 'enemy' || target.state === 'dead' || target.area !== this.state.player.currentArea || this.distance(target.position, this.state.player.position) > 18) {
      this.state.player.activeTargetId = null;
    }
  }

  private handleContextAction(command: NonNullable<GameAction & { type: 'CONTEXT_ACTION' }>['command']): void {
    const menu = this.state.ui.contextMenu;
    this.state.ui.contextMenu = null;
    const target = menu?.target ?? this.state.ui.selectedTarget;
    if (!target) return;
    const entityId = target.kind === 'entity' ? target.entityId : null;
    const entity = entityId ? this.state.entities[entityId] : null;
    if (command === 'target' && entityId) {
      this.applyAction({ type: 'SELECT_ENTITY', entityId });
    } else if (command === 'attack' && entityId) {
      this.applyAction({ type: 'SELECT_ENTITY', entityId });
      this.applyAction({ type: 'ATTACK_ENTITY', entityId });
    } else if ((command === 'talk' || command === 'interact' || command === 'open' || command === 'pick_lock') && entityId) {
      this.applyAction({ type: 'INTERACT_ENTITY', entityId });
    } else if (command === 'gather' && entityId) {
      this.applyAction({ type: 'GATHER_RESOURCE', entityId });
    } else if (command === 'loot' && entityId) {
      this.applyAction({ type: 'PICKUP_ITEM', entityId });
    } else if (command === 'trade' && entityId) {
      if (entity?.kind === 'npc' || entity?.kind === 'social') this.applyAction({ type: 'OPEN_TRADE', partnerId: entityId });
    } else if (command === 'disarm') {
      this.applyAction({ type: 'USE_SKILL_ON_TARGET', skillId: 'Remove Trap', target });
    } else if (command === 'use_tool') {
      const tool = this.selectedToolItemId();
      if (tool) this.applyAction({ type: 'USE_TOOL_ON_TARGET', toolItemId: tool, target });
      else this.state.ui.prompt = 'Select a tool first.';
    } else if (command === 'cast_spell') {
      this.applyAction({ type: 'USE_SPELL_ON_TARGET', spellId: this.state.ui.selectedSpellId, target });
    } else if (command === 'detect_hidden') {
      this.applyAction({ type: 'USE_SKILL_ON_TARGET', skillId: 'Detect Hidden', target });
    } else if (command === 'remove_trap') {
      this.applyAction({ type: 'USE_SKILL_ON_TARGET', skillId: 'Remove Trap', target });
    } else if (command === 'lockpick' && entityId) {
      this.applyAction({ type: 'INTERACT_ENTITY', entityId });
    } else if (command === 'snoop') {
      this.applyAction({ type: 'USE_SKILL_ON_TARGET', skillId: 'Snooping', target });
    } else if (command === 'steal') {
      this.applyAction({ type: 'USE_SKILL_ON_TARGET', skillId: 'Stealing', target });
    } else if (command === 'follow' && entity) {
      this.bufferEntityAction({ type: 'HIRE_COMPANION', entityId: entity.id }, entity.id, 2.1, `Following ${entity.name}...`);
    } else if (command === 'mark') {
      this.state.ui.prompt = 'Marked on the local map.';
    } else if (command === 'inspect') {
      this.state.ui.prompt = entity ? `${entity.name}: ${entity.kind}.` : 'Marked ground.';
    }
  }

  private selectedToolItemId(): string | null {
    const slot = this.state.ui.selectedInventorySlot;
    const stack = slot == null ? null : this.state.player.inventory.slots[slot];
    if (stack && isTargetingTool(stack.itemId)) return stack.itemId;
    return null;
  }

  private respawnPlayer(): void {
    if (!this.state.player.downed.active) return;
    this.state.player.downed = { active: false, since: 0, respawnAt: 0 };
    this.state.player.health = Math.max(1, Math.round(75 + this.state.player.attributes.Constitution * 1.1));
    this.state.player.mana = Math.max(10, this.state.player.mana);
    this.state.player.stamina = Math.max(8, this.state.player.stamina);
    this.state.player.position = this.areaManager.getSpawn(this.state.player.currentArea);
    this.state.player.targetPosition = null;
    this.state.player.movement.velocity = { x: 0, z: 0 };
    this.state.player.movement.path = [];
    this.state.player.movement.waypoint = null;
    this.state.ui.prompt = 'You recover at a safe shrine.';
  }

  private enterArea(areaId: GameState['player']['currentArea']): void {
    transitionPlayerToArea(this.state, this.areaManager, areaId);
    this.state.ui.selectedInventorySlot = null;
    this.state.ui.selectedBankSlot = null;
    this.state.ui.trade = null;
    this.state.ui.merchant = null;
    this.state.ui.panels.trade = false;
    this.state.ui.panels.merchant = false;
    this.state.ui.panels.bank = false;
    this.state.ui.panels.crafting = false;
    this.state.ui.panels.build = false;
    this.state.ui.panels.character = false;
    this.state.ui.panels.skills = false;
    this.state.buildMode.active = false;
    this.state.ui.fadeUntil = this.state.clock + 0.45;
    this.state.ui.prompt = `Entered ${areas[areaId].name}.`;
    this.state.world.discoveredAreas = Array.from(new Set([...this.state.world.discoveredAreas, areaId]));
    recordQuestEvent(this.state, { type: 'enter_area', areaId });
    if (areaId === 'bank') {
      this.state.ui.panels.bank = true;
      this.state.ui.panels.character = true;
      this.state.ui.panels.skills = true;
      this.state.ui.panels.inventory = true;
    } else if (areaId === 'blacksmith') {
      this.state.ui.panels.crafting = true;
      this.state.ui.panels.inventory = true;
      this.state.ui.selectedStationType = 'forge';
    } else if (areaId === 'housing') {
      this.state.buildMode.active = true;
      this.state.ui.panels.build = true;
      claimPlotAndRefreshBuild(this.state, this.areaManager);
      updateBuildGhost(this.state, this.areaManager, { ...this.state.player.position, x: this.state.player.position.x + 2 });
    }
    addSystemMessage(this.state, `Welcome to ${areas[areaId].name}!`);
  }

  private lockTrade(side: 'player' | 'partner'): void {
    const trade = this.state.ui.trade;
    if (!trade) return;
    if (side === 'player') {
      trade.playerLocked = true;
      window.setTimeout(() => {
        if (!this.state.ui.trade) return;
        this.state.ui.trade.partnerLocked = true;
        this.completeTradeIfReady();
        this.emit();
      }, 450);
    } else {
      trade.partnerLocked = true;
    }
    this.completeTradeIfReady();
  }

  private completeTradeIfReady(): void {
    const trade = this.state.ui.trade;
    if (!trade || !trade.playerLocked || !trade.partnerLocked) return;
    const partner = this.state.entities[trade.partnerId];
    const playerCosts = this.aggregateTradeSlots(trade.playerSlots);
    const partnerCosts = this.aggregateTradeSlots(trade.partnerSlots);
    const partnerInventory = partner && (partner.kind === 'npc' || partner.kind === 'social') ? partner.tradeInventory : undefined;
    const partnerGold = partner && (partner.kind === 'npc' || partner.kind === 'social') ? partner.tradeGold ?? 0 : 0;

    if (!hasItems(this.state.player.inventory, playerCosts) || this.state.player.gold < trade.playerGold) {
      trade.playerLocked = false;
      trade.partnerLocked = false;
      addSystemMessage(this.state, 'Trade failed: your offer is no longer available.');
      return;
    }
    if (partnerInventory && !hasItems(partnerInventory, partnerCosts)) {
      trade.playerLocked = false;
      trade.partnerLocked = false;
      addSystemMessage(this.state, 'Trade failed: the partner offer changed.');
      return;
    }
    if (partnerGold < trade.partnerGold) {
      trade.playerLocked = false;
      trade.partnerLocked = false;
      addSystemMessage(this.state, 'Trade failed: partner gold is no longer available.');
      return;
    }

    playerCosts.forEach((cost) => removeItems(this.state.player.inventory, cost.itemId, cost.quantity));
    partnerCosts.forEach((cost) => addItem(this.state.player.inventory, cost.itemId, cost.quantity));
    if (partnerInventory) {
      partnerCosts.forEach((cost) => removeItems(partnerInventory, cost.itemId, cost.quantity));
      playerCosts.forEach((cost) => addItem(partnerInventory, cost.itemId, cost.quantity));
    }
    this.state.player.gold = this.state.player.gold - trade.playerGold + trade.partnerGold;
    if (partner && (partner.kind === 'npc' || partner.kind === 'social')) {
      partner.tradeGold = Math.max(0, (partner.tradeGold ?? 0) - trade.partnerGold + trade.playerGold);
    }
    playerCosts.forEach((cost) => addSystemMessage(this.state, `You traded away ${itemDefs[cost.itemId]?.name ?? cost.itemId} x${cost.quantity}.`));
    partnerCosts.forEach((cost) => addSystemMessage(this.state, `You receive ${itemDefs[cost.itemId]?.name ?? cost.itemId} x${cost.quantity}.`));
    addSystemMessage(this.state, 'Trade complete.');
    this.state.ui.trade = null;
    this.state.ui.panels.trade = false;
  }

  private cancelTrade(): void {
    if (!this.state.ui.trade) return;
    this.state.ui.trade = null;
    this.state.ui.panels.trade = false;
    addSystemMessage(this.state, 'Trade cancelled.');
  }

  private aggregateTradeSlots(slots: NonNullable<GameState['ui']['trade']>['playerSlots']): Array<{ itemId: string; quantity: number }> {
    const totals = new Map<string, number>();
    slots.forEach((stack) => {
      if (!stack) return;
      totals.set(stack.itemId, (totals.get(stack.itemId) ?? 0) + stack.quantity);
    });
    return Array.from(totals.entries()).map(([itemId, quantity]) => ({ itemId, quantity }));
  }

  private forceCompleteCraft(jobId: string): void {
    const job = this.state.craftQueue.find((candidate) => candidate.id === jobId);
    if (job) job.remaining = 0;
  }

  private useHotbar(slot: number): void {
    this.state.ui.activeHotbarSlot = slot;
    const binding = this.state.ui.hotbar[slot];
    if (!binding) return;
    if (binding.kind === 'action') {
      if (binding.id === 'attack') this.dispatch({ type: 'ATTACK_ENTITY' });
      else if (binding.id === 'ranged') this.dispatch({ type: 'USE_RANGED' });
      else if (binding.id === 'hide') this.dispatch({ type: 'HIDE' });
      else if (binding.id === 'defend') this.dispatch({ type: 'DEFENSIVE_ACTION' });
      else if (binding.id === 'build') this.dispatch({ type: 'TOGGLE_BUILD_MODE' });
      else if (binding.id === 'interact') {
        const nearby = this.areaManager.nearestInteractable(this.state, 2.2);
        if (nearby) this.dispatch({ type: 'INTERACT_ENTITY', entityId: nearby });
        else this.state.ui.prompt = 'Nothing nearby to interact with.';
      } else if (binding.id === 'utility') {
        const nearby = this.areaManager.nearestInteractable(this.state, 2.2);
        if (nearby) this.dispatch({ type: 'INTERACT_ENTITY', entityId: nearby });
        else if (this.state.player.currentArea === 'housing' || this.state.buildMode.active) this.dispatch({ type: 'TOGGLE_BUILD_MODE' });
        else this.dispatch({ type: 'TOGGLE_PANEL', panel: 'inventory', open: true });
      }
      return;
    }
    if (binding.kind === 'spell') {
      this.dispatch({ type: 'CAST_SPELL', spellId: binding.id });
      return;
    }
    if (binding.kind === 'tool') {
      this.beginToolTargeting(binding.id);
      return;
    }
    if (binding.kind === 'skill') {
      this.useHotbarSkill(binding.id);
      return;
    }
    const inventorySlot = this.findInventorySlot(binding.id);
    if (inventorySlot == null) {
      this.state.ui.prompt = `${itemDefs[binding.id]?.name ?? binding.id} is not in your pack.`;
      return;
    }
    this.useInventorySlot(inventorySlot);
  }

  private findInventorySlot(itemId: string): number | null {
    const index = this.state.player.inventory.slots.findIndex((stack) => stack?.itemId === itemId);
    return index >= 0 ? index : null;
  }

  private useHotbarSkill(skillId: string): void {
    if (skillId === 'Hiding' || skillId === 'Stealth') {
      this.dispatch({ type: 'HIDE' });
    } else if (skillId === 'Healing' || skillId === 'Anatomy') {
      this.dispatch({ type: 'START_BANDAGE', target: { kind: 'self' } });
    } else if (skillId === 'Meditation' || skillId === 'Focus') {
      this.dispatch({ type: 'USE_SKILL_ON_TARGET', skillId: 'Meditation', target: { kind: 'self' } });
    } else if (skillId === 'Detect Hidden') {
      this.dispatch({ type: 'USE_SKILL_ON_TARGET', skillId: 'Detect Hidden', target: { kind: 'self' } });
    } else if (skillId === 'Remove Trap') {
      this.state.ui.targeting = { mode: 'skill', skillId: 'Remove Trap', prompt: 'Select a revealed trap or trapped container.' };
      this.state.ui.prompt = this.state.ui.targeting.prompt;
    } else if (skillId === 'Snooping') {
      this.state.ui.targeting = { mode: 'skill', skillId: 'Snooping', prompt: 'Select a container to inspect.' };
      this.state.ui.prompt = this.state.ui.targeting.prompt;
    } else if (skillId === 'Stealing') {
      this.state.ui.targeting = { mode: 'skill', skillId: 'Stealing', prompt: 'Select a protected container to steal from.' };
      this.state.ui.prompt = this.state.ui.targeting.prompt;
    } else if (skillId === 'Forensic Evaluation') {
      this.state.ui.targeting = { mode: 'skill', skillId: 'Forensic Evaluation', prompt: 'Select a recent crime scene or corpse.' };
      this.state.ui.prompt = this.state.ui.targeting.prompt;
    } else if (skillId === 'Begging') {
      this.dispatch({ type: 'USE_SKILL_ON_TARGET', skillId: 'Begging', target: { kind: 'self' } });
    } else if (skillId === 'Cartography') {
      this.dispatch({ type: 'DECIPHER_TREASURE_MAP' });
    } else if (skillId === 'Peacemaking' || skillId === 'Provocation' || skillId === 'Discordance') {
      this.dispatch({ type: 'USE_BARD_SKILL', skillId });
    } else if (skillId === 'Lumberjacking') {
      this.beginToolTargeting('axe');
    } else if (skillId === 'Mining') {
      this.beginToolTargeting('pickaxe');
    } else {
      this.state.ui.prompt = `${skillId} is passive or needs a specific world action.`;
    }
  }

  private useInventorySlot(slot: number): void {
    const stack = this.state.player.inventory.slots[slot];
    if (!stack) return;
    if (stack.itemId === 'beginner_spellbook') {
      this.state.ui.panels.spellbook = !this.state.ui.panels.spellbook;
      if (this.state.ui.panels.spellbook) recordQuestEvent(this.state, { type: 'open_panel', panel: 'spellbook' });
      return;
    }
    if (stack.itemId === 'map_fragment') {
      combineMapFragments(this.state);
      return;
    }
    if (stack.itemId === 'rough_treasure_map') {
      openTreasureMap(this.state);
      return;
    }
    if (stack.itemId === 'bandage') {
      startBandage(this.state, { kind: 'self' });
      return;
    }
    if (stack.itemId === 'poison_potion') {
      applyPoisonToWeapon(this.state, slot);
      return;
    }
    if (stack.itemId === 'lute' || stack.itemId === 'drum' || stack.itemId === 'harp') {
      this.state.ui.panels.combatActions = true;
      recordQuestEvent(this.state, { type: 'open_panel', panel: 'combatActions' });
      this.state.ui.prompt = 'Choose a bard action.';
      return;
    }
    if (isTargetingTool(stack.itemId)) {
      this.beginToolTargeting(stack.itemId);
      return;
    }
    useItem(this.state, slot);
  }

  private beginToolTargeting(toolItemId: string): void {
    this.state.ui.targeting = { mode: 'tool', toolItemId, prompt: targetingPromptForTool(toolItemId) };
    this.state.ui.prompt = targetingPromptForTool(toolItemId);
  }

  private handleTarget(target: NonNullable<GameState['ui']['selectedTarget']>): void {
    const targeting = this.state.ui.targeting;
    this.state.ui.selectedTarget = target;
    if (!targeting) return;
    if (targeting.mode === 'tool' && targeting.toolItemId) {
      if (targeting.toolItemId === 'shovel') digWithShovel(this.state, this.areaManager, target);
      else useToolOnTarget(this.state, this.areaManager, targeting.toolItemId, target);
    } else if (targeting.mode === 'skill' && targeting.skillId) {
      if (targeting.skillId === 'Peacemaking' || targeting.skillId === 'Provocation' || targeting.skillId === 'Discordance') {
        useBardSkill(this.state, targeting.skillId, target);
      } else if (targeting.skillId === 'Detect Hidden') {
        detectHiddenPulse(this.state, target);
      } else if (targeting.skillId === 'Remove Trap') {
        removeTrapFromTarget(this.state, target);
      } else if (targeting.skillId === 'Snooping') {
        attemptSnoopContainer(this.state, target);
      } else if (targeting.skillId === 'Stealing') {
        attemptStealFromContainer(this.state, target);
      } else if (targeting.skillId === 'Forensic Evaluation') {
        inspectCrimeScene(this.state, target);
      } else {
        this.state.ui.prompt = `${targeting.skillId} cannot use that target.`;
      }
    } else if (targeting.mode === 'spell' && targeting.spellId) {
      castSpellIntent(this.state, targeting.spellId, target);
    }
    this.state.ui.targeting = null;
  }

  private regenerate(dt: number): void {
    const player = this.state.player;
    const dexterity = player.attributes.Dexterity ?? player.attributes.Agility;
    const maxHealth = 75 + player.attributes.Constitution * 2.5;
    const maxMana = 45 + player.attributes.Intelligence * 2.9;
    const maxStamina = 16 + dexterity * 0.55;
    const armorId = player.equipment.armor?.itemId ?? '';
    const staminaRegen = armorId.includes('iron') ? 0.52 : armorId.includes('leather') ? 0.86 : 0.75;
    const manaRegen = armorId.includes('robe') ? 0.72 : armorId.includes('iron') ? 0.38 : 0.55;
    player.health = Math.min(maxHealth, player.health + dt * 0.35);
    player.mana = Math.min(maxMana, player.mana + dt * manaRegen);
    player.stamina = Math.min(maxStamina, player.stamina + dt * staminaRegen);
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

function applyMovementModeTransition(state: GameState, mode: MovementMode): void {
  if (mode === 'mouse') {
    state.player.movement.intent = null;
    state.player.movement.intentUntil = 0;
    state.player.movement.velocity = { x: 0, z: 0 };
    return;
  }
  if (mode === 'keyboard') {
    clearClickPathUnlessApproaching(state);
  }
}

function clearClickPathUnlessApproaching(state: GameState): void {
  if (state.realtime.pendingAction) return;
  state.player.targetPosition = null;
  state.player.movement.path = [];
  state.player.movement.waypoint = null;
}

function movementModeLabel(mode: MovementMode): string {
  if (mode === 'keyboard') return 'Keyboard Only';
  if (mode === 'mouse') return 'Mouse Only';
  return 'Keyboard + Mouse';
}

function frameRateCapLabel(mode: GameState['ui']['frameRateCapMode'], customFrameRateCap: number): string {
  if (mode === 'custom') return `${sanitizeCustomFrameRateCap(customFrameRateCap)} FPS`;
  return `${mode} FPS`;
}

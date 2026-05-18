import { createDefaultHotbar, createIdleActionState, createInitialDevState, createInitialGameState, createInventory, createStack } from './GameState';
import { createInitialEconomyState } from '../data/economy';
import { createInitialHousingState, getHousingPieceDefinition, starterPlotId } from '../data/housing';
import { itemDefs } from '../data/items';
import { tutorialQuestIds } from '../data/quests';
import { resolveResourceDefinition } from '../data/resources';
import { createInitialResourceTiles } from '../data/resourceMaps';
import { beginnerSpellIds } from '../data/spells';
import { createInitialSkills } from '../data/skills';
import { createInitialTreasureState } from '../data/treasure';
import { createInitialRenderStats } from '../render/RenderBudgets';
import { ensureFacingState } from '../systems/FacingSystem';
import type { BuildingEntity, EnemyEntity, GameState, HousingStorageState, ItemType, PortalEntity, ResourceNodeEntity } from './types';

export const CURRENT_SAVE_VERSION = 3;
const SAVE_KEY = 'briarbrook.voxel-rpg.save.v1';

export function saveGame(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(sanitizeForSave(state)));
}

export function loadGame(): GameState {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return createInitialGameState();
  }
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (!validateSaveSchema(parsed)) {
      return createInitialGameState();
    }
    parsed.saveVersion ??= 1;
    if (parsed.saveVersion < CURRENT_SAVE_VERSION) parsed.saveVersion = CURRENT_SAVE_VERSION;
    parsed.combat ??= {
      meleeCooldown: 0,
      rangedCooldown: 0,
      magicCooldown: 0,
      abilityCooldowns: {},
      defenseUntil: 0,
      riposteUntil: 0,
      lastAttackAt: 0,
      lastDamagedAt: 0,
      hitFlashes: {},
      telegraphs: []
    };
    parsed.combat.hitFlashes ??= {};
    parsed.combat.abilityCooldowns ??= {};
    parsed.combat.defenseUntil ??= 0;
    parsed.combat.riposteUntil ??= 0;
    parsed.combat.telegraphs = [];
    parsed.bandage ??= null;
    parsed.spellCasting ??= null;
    parsed.spellEffects ??= [];
    parsed.gathering ??= null;
    parsed.realtime ??= {
      tickRate: 30,
      fixedDelta: 1 / 30,
      renderAlpha: 1,
      tick: 0,
      lastFrameDelta: 0,
      actionQueue: [],
      actionHistory: [],
      pendingAction: null,
      statusEffects: {}
    };
    parsed.realtime.tickRate = parsed.realtime.tickRate || 30;
    parsed.realtime.fixedDelta = 1 / parsed.realtime.tickRate;
    parsed.realtime.renderAlpha = 1;
    parsed.realtime.tick ??= 0;
    parsed.realtime.lastFrameDelta = 0;
    parsed.realtime.actionQueue = [];
    parsed.realtime.actionHistory ??= [];
    parsed.realtime.pendingAction = null;
    parsed.realtime.statusEffects ??= {};
    parsed.player.skillCap ??= 700;
    parsed.player.selectedSkillGroup ??= 'Combat';
    parsed.player.attributes.Dexterity ??= parsed.player.attributes.Agility ?? 10;
    parsed.player.attributes.Agility = parsed.player.attributes.Dexterity;
    parsed.player.statModes ??= {
      Strength: 'raise',
      Agility: 'raise',
      Dexterity: 'raise',
      Intelligence: 'raise',
      Constitution: 'raise',
      Luck: 'raise'
    };
    parsed.player.statModes.Dexterity ??= parsed.player.statModes.Agility ?? 'raise';
    parsed.player.spellbook ??= { itemId: 'beginner_spellbook', knownSpellIds: beginnerSpellIds };
    parsed.player.spellbook.knownSpellIds = Array.from(new Set([...(parsed.player.spellbook.knownSpellIds ?? []), ...beginnerSpellIds]));
    parsed.player.combatProfile ??= { hidden: false, hiddenUntil: 0, poison: null, bardCooldowns: {}, lastStealthCheckAt: 0 };
    parsed.player.combatProfile.hidden ??= false;
    parsed.player.combatProfile.hiddenUntil ??= 0;
    parsed.player.combatProfile.poison ??= null;
    parsed.player.combatProfile.bardCooldowns ??= {};
    parsed.player.combatProfile.lastStealthCheckAt ??= 0;
    parsed.player.reputation ??= {
      status: 'lawful',
      townStanding: 10,
      fame: 0,
      karma: 0,
      recentCriminalUntil: 0,
      aggressionCount: 0,
      murderCount: 0,
      finesOwed: 0,
      warningAcknowledged: {},
      lastCrimeAt: -999
    };
    parsed.player.reputation.status ??= 'lawful';
    parsed.player.reputation.townStanding ??= 10;
    parsed.player.reputation.fame ??= 0;
    parsed.player.reputation.karma ??= 0;
    parsed.player.reputation.recentCriminalUntil ??= 0;
    parsed.player.reputation.aggressionCount ??= 0;
    parsed.player.reputation.murderCount ??= 0;
    parsed.player.reputation.finesOwed ??= 0;
    parsed.player.reputation.warningAcknowledged ??= {};
    parsed.player.reputation.lastCrimeAt ??= -999;
    parsed.player.downed ??= { active: false, since: 0, respawnAt: 0 };
    parsed.player.downed.active ??= false;
    parsed.player.downed.since ??= 0;
    parsed.player.downed.respawnAt ??= 0;
    parsed.player.movement ??= {
      velocity: { x: 0, z: 0 },
      intent: null,
      intentUntil: 0,
      path: [],
      waypoint: null,
      tile: { x: Math.round(parsed.player.position.x), z: Math.round(parsed.player.position.z) },
      maxSpeed: 4.8
    };
    parsed.player.movement.velocity ??= { x: 0, z: 0 };
    parsed.player.movement.intent ??= null;
    parsed.player.movement.intentUntil ??= 0;
    parsed.player.movement.path ??= [];
    parsed.player.movement.waypoint ??= null;
    parsed.player.movement.tile = { x: Math.round(parsed.player.position.x), z: Math.round(parsed.player.position.z) };
    parsed.player.movement.maxSpeed ??= 4.8;
    ensureFacingState(parsed.player);
    parsed.player.combatPreferences ??= {
      approachMode: 'assist',
      autoAttackOnTargetSelect: false,
      stopMovementWhenCasting: true
    };
    parsed.player.combatPreferences.approachMode ??= 'assist';
    parsed.player.combatPreferences.autoAttackOnTargetSelect ??= false;
    parsed.player.combatPreferences.stopMovementWhenCasting ??= true;
    parsed.player.actionState ??= createIdleActionState(parsed.clock);
    parsed.ui.merchant ??= null;
    parsed.ui.hoverTarget = null;
    parsed.ui.selectedTarget = null;
    parsed.ui.targeting = null;
    parsed.ui.contextMenu = null;
    parsed.ui.selectedSpellId ??= 'magic_arrow';
    parsed.ui.spellSearch ??= '';
    parsed.ui.spellbookCircle ??= 'all';
    parsed.ui.spellbookFilter ??= 'known';
    parsed.ui.spellbookView ??= 'grid';
    parsed.ui.journalTab ??= 'quests';
    parsed.ui.skillView ??= 'ledger';
    parsed.ui.professionFilter ??= 'all';
    parsed.ui.professionAtlasZoom ??= 1;
    parsed.ui.pinnedProfessionGoalId ??= null;
    parsed.ui.spellbookSearch ??= '';
    parsed.ui.spellbookKnowledgeFilter ??= 'known';
    parsed.ui.spellbookCircleFilter ??= 'all';
    parsed.ui.spellbookRoleFilter ??= 'all';
    parsed.ui.spellbookViewMode ??= 'grid';
    parsed.ui.hotbarAssignSpellId = null;
    parsed.ui.selectedTreasureMapId ??= 'greymont_cache';
    parsed.ui.selectedHousingStorageId ??= null;
    parsed.ui.marketCategory ??= 'all';
    parsed.ui.marketSearch ??= '';
    parsed.ui.skillSearch ??= '';
    parsed.ui.skillsViewMode ??= 'ledger';
    parsed.ui.skillTrainableFilter ??= 'all';
    parsed.ui.skillRecentFilter ??= 'all';
    parsed.ui.skillProfessionFilter ??= 'all';
    parsed.ui.professionAtlasZoom ??= 1;
    parsed.ui.pinnedProfessionGoalId ??= null;
    parsed.ui.devTravel ??= false;
    parsed.ui.fadeUntil ??= 0;
    parsed.ui.selectedStationType ??= 'forge';
    parsed.ui.panels.merchant ??= false;
    parsed.ui.panels.spellbook ??= false;
    parsed.ui.panels.combatActions ??= false;
    parsed.ui.panels.guide ??= parsed.player.currentArea === 'town';
    parsed.ui.panels.help ??= false;
    parsed.ui.panels.journal ??= false;
    parsed.ui.panels.market ??= false;
    parsed.ui.panels.treasureMap ??= false;
    parsed.ui.panels.status ??= false;
    parsed.ui.hotbar ??= createDefaultHotbar();
    parsed.ui.hotbar = Array.from({ length: 10 }, (_, index) => parsed.ui.hotbar[index] ?? createDefaultHotbar()[index] ?? null);
    parsed.ui.uiScale ??= 1;
    parsed.ui.reducedMotion ??= false;
    parsed.ui.cameraSmoothing ??= 'medium';
    parsed.ui.windowLayouts ??= {};
    parsed.ui.windowLayoutPreset ??= 'default';
    parsed.ui.windowFocusOrder ??= [];
    parsed.ui.craftQuantity ??= 1;
    parsed.buildMode ??= {
      active: false,
      selectedPieceId: 'stone_wall',
      rotation: 0,
      snapToGrid: true,
      ghostPosition: { x: 0, y: 0, z: 0 },
      valid: false,
      message: 'Select a piece.',
      moveBuildingId: null
    };
    parsed.buildMode.moveBuildingId ??= null;
    const initialSkills = createInitialSkills();
    for (const [name, skill] of Object.entries(initialSkills)) {
      parsed.player.skills[name] ??= skill;
      const existing = parsed.player.skills[name];
      existing.id ??= name;
      existing.name = skill.name;
      existing.realValue ??= existing.value ?? skill.realValue;
      if (existing.realValue < skill.realValue) existing.realValue = skill.realValue;
      existing.bonusValue ??= 0;
      existing.value = Number((existing.realValue + existing.bonusValue).toFixed(1));
      existing.xp ??= 0;
      existing.gainProgress ??= existing.xp;
      existing.cap ??= skill.cap;
      existing.mode ??= skill.mode;
      existing.lastGainAt ??= 0;
      existing.lastSuccessfulUseAt ??= 0;
      existing.ggsTimer ??= 0;
    }
    migrateLegacySkill(parsed, 'Magic', 'Magery');
    migrateLegacySkill(parsed, 'Woodcutting', 'Lumberjacking');
    migrateLegacySkill(parsed, 'Defense', 'Parrying');
    migrateLegacySkill(parsed, 'First Aid', 'Healing');
    const fresh = createInitialGameState();
    const hasTutorialChain = tutorialQuestIds.every((questId) => parsed.quests?.[questId]);
    if (!hasTutorialChain) {
      parsed.quests = { ...fresh.quests, ...(parsed.quests ?? {}) };
      tutorialQuestIds.forEach((questId) => {
        parsed.quests[questId] = fresh.quests[questId];
      });
      parsed.player.activeQuestIds = parsed.player.completedQuestIds.includes('prepare_for_road') ? [] : ['prepare_for_road'];
    } else {
      for (const [id, quest] of Object.entries(fresh.quests)) {
        parsed.quests[id] ??= quest;
      }
      for (const questId of tutorialQuestIds) {
        if (parsed.quests[questId] && parsed.quests[questId].status !== 'complete') parsed.quests[questId] = mergeQuestProgress(parsed.quests[questId], fresh.quests[questId]);
      }
      parsed.player.activeQuestIds = parsed.player.activeQuestIds.filter((questId) => parsed.quests[questId] && !parsed.player.completedQuestIds.includes(questId));
      if (!parsed.player.completedQuestIds.includes('prepare_for_road') && !parsed.player.activeQuestIds.includes('prepare_for_road')) parsed.player.activeQuestIds.unshift('prepare_for_road');
      if (!parsed.player.completedQuestIds.length && tutorialQuestIds.every((questId) => parsed.player.activeQuestIds.includes(questId))) parsed.player.activeQuestIds = ['prepare_for_road'];
    }
    if (tutorialQuestIds.some((questId) => parsed.player.activeQuestIds.includes(questId))) {
      parsed.ui.panels.quest = false;
      parsed.ui.panels.guide = true;
    }
    for (const [id, entity] of Object.entries(fresh.entities)) {
      parsed.entities[id] ??= entity;
    }
    Object.values(parsed.entities ?? {}).forEach((entity) => {
      if (entity.kind === 'enemy' || entity.kind === 'npc' || entity.kind === 'social') ensureFacingState(entity);
      if (entity.kind === 'enemy') {
        const enemy = entity as EnemyEntity;
        const freshEnemy = fresh.entities[enemy.id];
        if (freshEnemy?.kind === 'enemy') {
          enemy.name = freshEnemy.name;
          enemy.enemyType = freshEnemy.enemyType;
          enemy.lootTable = freshEnemy.lootTable;
        }
        enemy.patrolTimer ??= Math.random() * 6;
        enemy.magicResist ??= freshEnemy?.kind === 'enemy' ? freshEnemy.magicResist : 8;
        enemy.poisonResist ??= freshEnemy?.kind === 'enemy' ? freshEnemy.poisonResist : enemy.enemyType === 'Undead' ? 90 : 15;
        enemy.weaponSkill ??= freshEnemy?.kind === 'enemy' ? freshEnemy.weaponSkill : 35;
        enemy.defenseSkill ??= freshEnemy?.kind === 'enemy' ? freshEnemy.defenseSkill : 32;
        enemy.aiStyle ??= freshEnemy?.kind === 'enemy' ? freshEnemy.aiStyle : 'melee';
        enemy.combatRole ??= freshEnemy?.kind === 'enemy' ? freshEnemy.combatRole : enemy.aiStyle === 'archer' ? 'archer' : enemy.aiStyle === 'mage' ? 'caster' : 'grunt';
        enemy.poison ??= null;
        enemy.pacifiedUntil ??= 0;
        enemy.discordUntil ??= 0;
        enemy.discordAmount ??= 0;
        enemy.provokedTargetId ??= null;
      }
      if (entity.kind === 'npc' || entity.kind === 'social') {
        const freshNpc = fresh.entities[entity.id];
        if (freshNpc && (freshNpc.kind === 'npc' || freshNpc.kind === 'social')) {
          entity.craftStation = freshNpc.craftStation;
          entity.training = freshNpc.training;
          if (entity.role === 'merchant' || freshNpc.training) {
            entity.tradeInventory = freshNpc.tradeInventory;
            entity.tradeGold = Math.max(entity.tradeGold ?? 0, freshNpc.tradeGold ?? 0);
          }
        }
      }
      if (entity.kind === 'resource') {
        const resource = entity as ResourceNodeEntity;
        const definition = resolveResourceDefinition(resource);
        resource.resourceId = definition.id;
        resource.name = resource.name || definition.name;
        resource.resourceType = definition.resourceType;
        resource.toolItemId = definition.toolItemId;
        resource.skill = definition.skill;
        resource.yieldItemId = definition.yieldItemId;
        resource.yieldRange = definition.yieldRange;
        resource.baseDuration = definition.baseDuration;
        resource.respawnSeconds = definition.respawnSeconds;
        resource.inspectText = definition.inspectText;
      }
      if (entity.kind === 'portal') {
        const portal = entity as PortalEntity;
        const freshPortal = fresh.entities[portal.id];
        if (freshPortal?.kind === 'portal') {
          portal.name = freshPortal.name;
          portal.destination = freshPortal.destination;
          portal.spawn = freshPortal.spawn;
          portal.position = freshPortal.position;
        }
      }
    });
    if ((parsed.player.inventory.capacity ?? 0) < 36) {
      parsed.player.inventory.capacity = 36;
      parsed.player.inventory.slots = Array.from({ length: 36 }, (_, index) => parsed.player.inventory.slots[index] ?? null);
    }
    if ((parsed.player.bank.capacity ?? 0) < 24) {
      parsed.player.bank.capacity = 24;
      parsed.player.bank.slots = Array.from({ length: 24 }, (_, index) => parsed.player.bank.slots[index] ?? null);
    }
    parsed.player.equipment.shield ??= createStack('iron_shield');
    for (const stack of [...parsed.player.inventory.slots, ...Object.values(parsed.player.equipment), ...parsed.player.bank.slots]) {
      if (!stack) continue;
      const def = itemDefs[stack.itemId];
      if (!def?.durability || def.stackable) continue;
      stack.durability ??= def.durability;
      stack.maxDurability ??= def.durability;
    }
    const migrationQuantities: Record<string, number> = {
      arrow: 35,
      poison_potion: 1,
      logs: 6,
      copper_bar: 4,
      kindling: 6,
      bark_fragment: 4,
      clean_cloth: 6
    };
    for (const itemId of ['simple_bow', 'fishing_pole', 'beginner_spellbook', 'black_pearl', 'blood_moss', 'garlic', 'ginseng', 'mandrake_root', 'nightshade', 'spider_silk', 'sulfurous_ash', 'bandage', 'poison_potion', 'arrow', 'dagger', 'lute', 'clean_cloth', 'scissors', 'logs', 'copper_bar', 'kindling', 'bark_fragment']) {
      if (!parsed.player.inventory.slots.some((slot) => slot?.itemId === itemId)) {
        const empty = parsed.player.inventory.slots.findIndex((slot) => !slot);
        const quantity = itemId === 'beginner_spellbook' || itemId === 'simple_bow' || itemId === 'fishing_pole' || itemId === 'dagger' || itemId === 'lute' || itemId === 'scissors' ? 1 : (migrationQuantities[itemId] ?? 8);
        if (empty >= 0) parsed.player.inventory.slots[empty] = createStack(itemId, quantity);
      }
    }
    parsed.world.resourceTiles ??= createInitialResourceTiles();
    parsed.world.magicFields ??= [];
    parsed.world.recallMark ??= null;
    parsed.world.time ??= {
      dayLengthSeconds: 96,
      day: 0,
      timeOfDay: 0,
      hour: 0,
      minute: 0,
      phase: 'night',
      visibilityModifier: 0.62,
      stealthModifier: 1.18
    };
    parsed.world.time.dayLengthSeconds ||= 96;
    parsed.world.activeEvents ??= [];
    parsed.world.discoveredRumorIds ??= [];
    parsed.world.resourcePressure ??= {};
    parsed.world.economy ??= createInitialEconomyState();
    parsed.world.housing = migrateHousingState(parsed);
    const initialTreasure = createInitialTreasureState();
    parsed.world.treasure ??= initialTreasure;
    parsed.world.treasure.maps = { ...initialTreasure.maps, ...(parsed.world.treasure.maps ?? {}) };
    parsed.world.treasure.secrets = { ...initialTreasure.secrets, ...(parsed.world.treasure.secrets ?? {}) };
    parsed.world.treasure.excavationCooldowns ??= {};
    parsed.world.economy.workOrders ??= createInitialEconomyState().workOrders;
    parsed.world.economy.marketOrders ??= createInitialEconomyState().marketOrders;
    parsed.world.economy.transactionLog ??= [];
    parsed.world.economy.lastDailySeed ??= 0;
    parsed.world.economy.localDemand ??= createInitialEconomyState().localDemand;
    parsed.world.economy.priceTrends ??= {};
    parsed.world.crimeEvents ??= [];
    const initialDev = createInitialDevState(parsed.clock ?? 0);
    parsed.dev ??= initialDev;
    parsed.dev.overlay = false;
    parsed.dev.selectedSceneId ??= initialDev.selectedSceneId;
    parsed.dev.contentValidation ??= initialDev.contentValidation;
    parsed.dev.contentValidation.ok ??= true;
    parsed.dev.contentValidation.errors ??= [];
    parsed.dev.contentValidation.warnings ??= [];
    parsed.dev.contentValidation.checkedAt ??= parsed.clock ?? 0;
    parsed.dev.telemetry ??= initialDev.telemetry;
    parsed.dev.telemetry.startedAt ??= parsed.clock ?? 0;
    parsed.dev.telemetry.firstHourPathCompletionTime ??= null;
    parsed.dev.telemetry.damageDealtBySource ??= {};
    parsed.dev.telemetry.damageTaken ??= 0;
    parsed.dev.telemetry.skillEvents ??= {};
    parsed.dev.telemetry.skillGains ??= {};
    parsed.dev.telemetry.resourceYields ??= {};
    parsed.dev.telemetry.resourceOutflow ??= {};
    parsed.dev.telemetry.itemsSold ??= {};
    parsed.dev.telemetry.itemsConsumed ??= {};
    parsed.dev.telemetry.bandagesApplied ??= 0;
    parsed.dev.telemetry.combatBandagesApplied ??= 0;
    parsed.dev.telemetry.repairsCompleted ??= 0;
    parsed.dev.telemetry.workOrdersCompleted ??= 0;
    parsed.dev.telemetry.marketTransactions ??= 0;
    parsed.dev.telemetry.goldEarned ??= 0;
    parsed.dev.telemetry.goldSpent ??= 0;
    parsed.dev.telemetry.potionConsumption ??= {};
    parsed.dev.telemetry.deathCount ??= 0;
    parsed.dev.telemetry.stuckRecoveryEvents ??= 0;
    parsed.dev.telemetry.transitionFallbacks ??= parsed.dev.stability?.safeSpawnFallbackCount ?? 0;
    parsed.dev.telemetry.tooltipRemounts ??= 0;
    parsed.dev.telemetry.uiResetUsage ??= 0;
    parsed.dev.telemetry.actionCancellations ??= {};
    parsed.dev.telemetry.questCompletionTime ??= {};
    parsed.dev.telemetry.priceTrends ??= {};
    parsed.dev.telemetryExportJson = '';
    parsed.dev.renderStats = {
      ...initialDev.renderStats,
      ...(parsed.dev.renderStats ?? {}),
      budget: {
        ...('budget' in initialDev.renderStats ? initialDev.renderStats.budget : createInitialRenderStats().budget),
        ...((parsed.dev.renderStats as ReturnType<typeof createInitialRenderStats> | undefined)?.budget ?? {})
      }
    };
    parsed.dev.input ??= initialDev.input;
    parsed.dev.input.mode ??= 'normal';
    parsed.dev.input.lastRawInput ??= 'none';
    parsed.dev.input.lastIntent ??= 'none';
    parsed.dev.input.focusedWindow ??= 'none';
    parsed.dev.input.focusedElement ??= 'none';
    parsed.dev.input.topmostWindow ??= 'none';
    parsed.dev.input.dragPayload ??= null;
    parsed.dev.input.pointerCapture ??= null;
    parsed.dev.input.lastPreventedDefault ??= 'none';
    parsed.dev.input.targetMode ??= null;
    parsed.dev.input.viewport ??= 'unknown';
    parsed.dev.input.uiScale ??= parsed.ui?.uiScale ?? 1;
    parsed.dev.renderStats.frame ??= 0;
    parsed.dev.renderStats.entityCount ??= 0;
    parsed.dev.renderStats.visibleEntityCount ??= 0;
    parsed.dev.renderStats.roughDrawCalls ??= 0;
    parsed.dev.renderStats.triangles ??= 0;
    parsed.dev.stability ??= initialDev.stability;
    parsed.dev.stability.lastMovementCommandAt ??= parsed.clock ?? 0;
    parsed.dev.stability.lastMovementCommandSource ??= 'none';
    parsed.dev.stability.lastActionCancellationReason ??= 'none';
    parsed.dev.stability.currentPortalId ??= null;
    parsed.dev.stability.lastTransition ??= null;
    parsed.dev.stability.safeSpawnFallbackCount ??= 0;
    parsed.dev.facingDebug ??= initialDev.facingDebug;
    parsed.dev.facingDebug.showFacingArrows ??= false;
    parsed.dev.facingDebug.showDesiredFacingArrows ??= false;
    parsed.dev.facingDebug.showVelocityVectors ??= false;
    parsed.dev.facingDebug.showLookAtLines ??= false;
    for (const building of parsed.world.placedBuildings ?? []) {
      const piece = getHousingPieceDefinition(building.pieceId);
      building.plotId ??= parsed.world.housing.ownedPlotId ?? starterPlotId;
      building.ownerId ??= parsed.player.id;
      building.functionType ??= piece.functionType;
      building.placedAt ??= parsed.clock ?? 0;
      if (piece.storage && !building.storageId) building.storageId = `storage_${building.id}`;
      if (piece.storage && building.storageId && !parsed.world.housing.storages[building.storageId]) {
        parsed.world.housing.storages[building.storageId] = createHousingStorageFromBuilding(building, piece.storage.slots, piece.storage.maxWeight, piece.storage.acceptedItemTypes, piece.storage.acceptedItemIds);
      }
      parsed.entities[building.id] = building as BuildingEntity;
    }
    sanitizeLoadedTransientState(parsed);
    return {
      ...parsed,
      floatingTexts: [],
      projectiles: [],
      paused: false
    };
  } catch {
    return createInitialGameState();
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function validateSaveSchema(value: unknown): value is GameState {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!isRecord(value.player) || !isRecord(value.ui) || !isRecord(value.world) || !isRecord(value.entities) || !isRecord(value.quests)) return false;
  const player = value.player;
  if (typeof player.id !== 'string' || !isRecord(player.inventory) || !isRecord(player.equipment) || !isRecord(player.skills)) return false;
  return true;
}

function sanitizeForSave(state: GameState): GameState {
  const initialDev = createInitialDevState(state.clock);
  const movement = state.player.movement;
  return {
    ...state,
    saveVersion: CURRENT_SAVE_VERSION,
    floatingTexts: [],
    projectiles: [],
    gathering: null,
    bandage: null,
    spellCasting: null,
    player: {
      ...state.player,
      activeTargetId: null,
      targetPosition: null,
      movement: {
        ...movement,
        velocity: { x: 0, z: 0 },
        intent: null,
        intentUntil: 0,
        path: [],
        waypoint: null,
        tile: { x: Math.round(state.player.position.x), z: Math.round(state.player.position.z) }
      },
      actionState: createIdleActionState(state.clock)
    },
    ui: {
      ...state.ui,
      hoverTarget: null,
      selectedTarget: null,
      targeting: null,
      contextMenu: null,
      hotbarAssignSpellId: null
    },
    realtime: {
      ...state.realtime,
      actionQueue: [],
      actionHistory: [],
      pendingAction: null,
      lastFrameDelta: 0,
      renderAlpha: 1
    },
    dev: {
      ...state.dev,
      overlay: false,
      telemetryExportJson: '',
      renderStats: { ...initialDev.renderStats },
      input: { ...initialDev.input },
      stability: { ...initialDev.stability },
      facingDebug: { ...initialDev.facingDebug }
    },
    paused: false
  };
}

function sanitizeLoadedTransientState(state: GameState): void {
  state.floatingTexts = [];
  state.projectiles = [];
  state.gathering = null;
  state.bandage = null;
  state.spellCasting = null;
  state.paused = false;
  state.player.activeTargetId = null;
  state.player.targetPosition = null;
  state.player.movement.velocity = { x: 0, z: 0 };
  state.player.movement.intent = null;
  state.player.movement.intentUntil = 0;
  state.player.movement.path = [];
  state.player.movement.waypoint = null;
  state.player.movement.tile = { x: Math.round(state.player.position.x), z: Math.round(state.player.position.z) };
  state.player.actionState = createIdleActionState(state.clock ?? 0);
  state.ui.hoverTarget = null;
  state.ui.selectedTarget = null;
  state.ui.targeting = null;
  state.ui.contextMenu = null;
  state.ui.hotbarAssignSpellId = null;
  state.realtime.actionQueue = [];
  state.realtime.actionHistory = [];
  state.realtime.pendingAction = null;
  state.realtime.lastFrameDelta = 0;
  state.realtime.renderAlpha = 1;
  const initialDev = createInitialDevState(state.clock ?? 0);
  state.dev.overlay = false;
  state.dev.telemetryExportJson = '';
  state.dev.renderStats = { ...initialDev.renderStats };
  state.dev.input = { ...initialDev.input };
  state.dev.stability = { ...initialDev.stability };
  state.dev.facingDebug = { ...initialDev.facingDebug };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function migrateLegacySkill(state: GameState, from: string, to: string): void {
  const legacy = state.player.skills[from];
  const target = state.player.skills[to];
  if (!legacy || !target) return;
  const legacyValue = legacy.realValue ?? legacy.value ?? 0;
  if (legacyValue > target.realValue) {
    target.realValue = Number(legacyValue.toFixed(1));
    target.value = Number((target.realValue + target.bonusValue).toFixed(1));
    target.gainProgress = legacy.gainProgress ?? legacy.xp ?? target.gainProgress;
  }
}

function mergeQuestProgress(saved: GameState['quests'][string], fresh: GameState['quests'][string]): GameState['quests'][string] {
  const objectives = fresh.objectives.map((objective) => {
    const previous = saved.objectives.find(
      (candidate) =>
        candidate.type === objective.type &&
        candidate.label === objective.label &&
        candidate.itemId === objective.itemId &&
        candidate.recipeId === objective.recipeId &&
        candidate.spellId === objective.spellId &&
        candidate.areaId === objective.areaId &&
        candidate.enemyName === objective.enemyName &&
        candidate.npcName === objective.npcName &&
        candidate.containerId === objective.containerId
    );
    return previous ? { ...objective, progress: Math.min(objective.required, previous.progress) } : objective;
  });
  return {
    ...fresh,
    status: saved.status === 'complete' ? 'complete' : 'active',
    objectives
  };
}

function migrateHousingState(state: GameState): GameState['world']['housing'] {
  const initial = createInitialHousingState();
  const saved = state.world.housing ?? initial;
  const housing = {
    ownedPlotId: saved.ownedPlotId ?? null,
    plots: { ...initial.plots, ...(saved.plots ?? {}) },
    storages: saved.storages ?? {},
    gardens: saved.gardens ?? {},
    lastRestedAt: saved.lastRestedAt ?? -999
  };
  const starter = housing.plots[starterPlotId];
  starter.boundary ??= initial.plots[starterPlotId].boundary;
  starter.permissions ??= initial.plots[starterPlotId].permissions;
  starter.lastPlacementId ??= null;
  starter.homeAnchor ??= null;
  starter.tier ??= 0;
  starter.claimedAt ??= null;
  if (state.world.placedBuildings?.length && !housing.ownedPlotId) {
    housing.ownedPlotId = starterPlotId;
    starter.ownerId = state.player.id;
    starter.claimedAt ??= state.clock ?? 0;
  }
  for (const [id, storage] of Object.entries(housing.storages)) {
    const capacity = Math.max(1, storage.inventory?.capacity ?? storage.inventory?.slots?.length ?? 1);
    storage.id = storage.id ?? id;
    storage.name ??= 'Home Storage';
    storage.inventory = {
      capacity,
      slots: Array.from({ length: capacity }, (_, index) => storage.inventory?.slots?.[index] ?? null)
    };
    storage.maxWeight ??= 40;
    storage.upgradeLevel ??= 0;
  }
  return housing;
}

function createHousingStorageFromBuilding(
  building: BuildingEntity,
  slots: number,
  maxWeight: number,
  acceptedItemTypes?: ItemType[],
  acceptedItemIds?: string[]
): HousingStorageState {
  return {
    id: building.storageId ?? `storage_${building.id}`,
    buildingId: building.id,
    name: building.name,
    inventory: createInventory(slots),
    acceptedItemTypes,
    acceptedItemIds,
    maxWeight,
    upgradeLevel: 0
  };
}

import { itemDefs } from '../data/items';
import { areas } from '../data/areas';
import { recipes } from '../data/recipes';
import { questPrerequisitesMet } from '../data/quests';
import { resolveResourceDefinition } from '../data/resources';
import { emitAudioHook } from '../audio/AudioHooks';
import type { GameState, PortalEntity } from '../game/types';
import type { AreaManager } from '../world/AreaManager';
import { updateBuildGhost } from './BuildingSystem';
import { addChat, addSystemMessage } from './ChatSystem';
import { calculateDerivedStats } from './EquipmentSystem';
import { pickupLoot } from './LootSystem';
import { addFloatingText } from './LootSystem';
import { completeQuest, recordQuestEvent, refreshQuestProgress } from './QuestSystem';
import { addItem } from './InventorySystem';
import { openMerchant } from './MerchantSystem';
import { attemptSkillUse } from './SkillSystem';
import { refreshPlayerActionState, setPlayerActionState } from './ActionStateSystem';
import { registerResourceHarvest, resourceYieldModifier } from './LivingWorldSystem';
import { degradeToolForGathering, findUsableTool } from './EconomySystem';
import { recordResourceYield } from './TelemetrySystem';
import { interactContainer } from './ContainerSystem';

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function distToPlayer(state: GameState, entityId: string): number {
  const entity = state.entities[entityId];
  if (!entity) return Number.POSITIVE_INFINITY;
  return Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z);
}

function approachPoint(state: GameState, entityId: string) {
  const entity = state.entities[entityId];
  const dx = state.player.position.x - entity.position.x;
  const dz = state.player.position.z - entity.position.z;
  const len = Math.hypot(dx, dz) || 1;
  return {
    x: entity.position.x + (dx / len) * 1.25,
    y: 0,
    z: entity.position.z + (dz / len) * 1.25
  };
}

export function interactEntity(state: GameState, areaManager: AreaManager, entityId: string): void {
  const entity = state.entities[entityId];
  if (!entity || entity.area !== state.player.currentArea) return;
  if (distToPlayer(state, entityId) > 2.1) {
    state.player.targetPosition = approachPoint(state, entityId);
    state.ui.prompt = `Move closer to ${entity.name}.`;
    return;
  }

  if (entity.kind === 'portal') {
    enterThroughPortal(state, areaManager, entity);
    return;
  }

  if (entity.kind === 'npc' || entity.kind === 'social') {
    const line = entity.dialogue[Math.floor(Math.random() * entity.dialogue.length)];
    addChat(state, line, { speaker: entity.name, tone: entity.role === 'merchant' ? 'trade' : 'normal' });
    recordQuestEvent(state, { type: 'talk', npcName: entity.name });
    handleQuestContact(state, entity.name);
    const serviceClosed =
      (entity.serviceAvailable === false &&
        (entity.role === 'banker' || entity.role === 'blacksmith' || entity.role === 'merchant' || Boolean(entity.craftStation) || Boolean(entity.training))) ||
      (entity.role === 'banker' && entity.area !== 'bank') ||
      (entity.role === 'blacksmith' && entity.area !== 'blacksmith');
    if (serviceClosed) {
      state.ui.prompt = `${entity.name} is not offering services right now.`;
      return;
    }
    if (entity.role === 'banker') {
      state.ui.panels.bank = true;
      state.ui.panels.inventory = true;
    }
    if (entity.role === 'blacksmith') {
      state.ui.panels.crafting = true;
      state.ui.panels.inventory = true;
      state.ui.selectedStationType = entity.craftStation ?? 'forge';
    }
    if (entity.craftStation) {
      state.ui.panels.crafting = true;
      state.ui.panels.inventory = true;
      state.ui.selectedStationType = entity.craftStation;
      state.ui.selectedRecipeId = recipes.find((recipe) => recipe.stationType === entity.craftStation)?.id ?? state.ui.selectedRecipeId;
    }
    if (entity.role === 'merchant' || entity.training) {
      openMerchant(state, entity.id);
    } else if (entity.kind === 'social' && entity.tradeInventory) {
      openTrade(state, entity.id);
    }
    if (entity.id === 'npc_sela_town') {
      const stats = calculateDerivedStats(state);
      state.player.health = Math.min(stats.maxHealth, state.player.health + 25);
      state.player.mana = Math.min(stats.maxMana, state.player.mana + 12);
      addSystemMessage(state, 'Sela tends your wounds.');
    }
    return;
  }

  if (entity.kind === 'resource') {
    gatherResource(state, entity.id);
    return;
  }

  if (entity.kind === 'loot') {
    pickupLoot(state, entity.id);
    return;
  }

  if (entity.kind === 'container') {
    interactContainer(state, entity);
  }
}

function enterThroughPortal(state: GameState, areaManager: AreaManager, portal: PortalEntity): void {
  const destination = portal.destination;
  state.player.currentArea = destination;
  state.player.position = portal.spawn ? { ...portal.spawn } : areaManager.getSpawn(destination);
  state.player.targetPosition = null;
  state.player.movement.intent = null;
  state.player.movement.velocity = { x: 0, z: 0 };
  state.player.movement.path = [];
  state.player.movement.waypoint = null;
  state.player.movement.tile = { x: Math.round(state.player.position.x), z: Math.round(state.player.position.z) };
  state.player.activeTargetId = null;
  state.realtime.pendingAction = null;
  state.gathering = null;
  state.spellCasting = null;
  state.bandage = null;
  state.ui.hoverTarget = null;
  state.ui.selectedTarget = null;
  state.ui.targeting = null;
  state.ui.selectedInventorySlot = null;
  state.ui.selectedBankSlot = null;
  state.ui.trade = null;
  state.ui.merchant = null;
  state.ui.panels.trade = false;
  state.ui.panels.merchant = false;
  state.ui.panels.bank = false;
  state.ui.panels.crafting = false;
  state.ui.panels.build = false;
  state.ui.panels.character = false;
  state.ui.panels.skills = false;
  state.buildMode.active = false;
  state.ui.fadeUntil = state.clock + 0.45;
  state.world.discoveredAreas = Array.from(new Set([...state.world.discoveredAreas, destination]));
  recordQuestEvent(state, { type: 'enter_area', areaId: destination });

  if (destination === 'bank') {
    state.ui.panels.bank = true;
    state.ui.panels.character = true;
    state.ui.panels.skills = true;
    state.ui.panels.inventory = true;
  } else if (destination === 'blacksmith') {
    state.ui.panels.crafting = true;
    state.ui.panels.inventory = true;
    state.ui.selectedStationType = 'forge';
  } else if (destination === 'housing') {
    state.buildMode.active = true;
    state.ui.panels.build = true;
    updateBuildGhost(state, areaManager, { ...state.player.position, x: state.player.position.x + 2 });
  }

  state.ui.prompt = `Entered ${areas[destination].name} through ${portal.name}.`;
  addSystemMessage(state, `You pass through ${portal.name} to ${areas[destination].name}.`);
}

function handleQuestContact(state: GameState, giver: string): void {
  const ready = Object.values(state.quests).find((quest) => quest.giver === giver && quest.status === 'ready' && state.player.activeQuestIds.includes(quest.id));
  if (ready) {
    completeQuest(state, ready.id);
    return;
  }
  const available = Object.values(state.quests).find(
    (quest) =>
      quest.giver === giver &&
      quest.status !== 'complete' &&
      !state.player.activeQuestIds.includes(quest.id) &&
      !state.player.completedQuestIds.includes(quest.id) &&
      questPrerequisitesMet(quest.id, state.player.completedQuestIds)
  );
  if (available) {
    state.player.activeQuestIds.push(available.id);
    refreshQuestProgress(state);
    addSystemMessage(state, `Quest accepted: ${available.title}.`);
  }
}

export function gatherResource(state: GameState, entityId: string): void {
  const entity = state.entities[entityId];
  if (!entity || entity.kind !== 'resource') return;
  if (entity.depleted) {
    state.ui.prompt = `${entity.name} is depleted.`;
    return;
  }
  if (distToPlayer(state, entityId) > 2) {
    state.player.targetPosition = approachPoint(state, entityId);
    state.ui.prompt = `Move closer to ${entity.name}.`;
    return;
  }
  const tool = findUsableTool(state, entity.toolItemId);
  if (!tool) {
    state.ui.prompt = `Requires a usable ${itemDefs[entity.toolItemId]?.name ?? entity.toolItemId}.`;
    return;
  }
  if (state.gathering?.entityId === entity.id) return;
  const skillValue = state.player.skills[entity.skill]?.value ?? 0;
  const definition = resolveResourceDefinition(entity);
  const baseDuration = entity.baseDuration ?? definition.baseDuration;
  const duration = Math.max(0.9, baseDuration - skillValue * 0.012);
  state.player.targetPosition = null;
  state.gathering = {
    entityId: entity.id,
    actionLabel: `${definition.actionVerb} ${entity.name}`,
    startedAt: state.clock,
    duration,
    remaining: duration
  };
  setPlayerActionState(state, 'gathering', duration, entity.id);
  state.ui.prompt = `${state.gathering.actionLabel}...`;
  emitAudioHook(gatheringCue(entity.resourceType), { id: entity.id, area: entity.area, position: entity.position });
}

function completeGathering(state: GameState, entity: Extract<GameState['entities'][string], { kind: 'resource' }>): void {
  const definition = resolveResourceDefinition(entity);
  const skillValue = state.player.skills[entity.skill]?.value ?? 0;
  let amount = randomInt(entity.yieldRange[0], entity.yieldRange[1]);
  amount += Math.floor(skillValue / 25);
  if (Math.random() < (skillValue % 25) / 25) amount += 1;
  amount = Math.max(1, Math.round(amount * resourceYieldModifier(state, entity.area)));

  if (!addItem(state.player.inventory, entity.yieldItemId, amount)) {
    state.ui.prompt = 'Your pack is full.';
    state.gathering = null;
    refreshPlayerActionState(state);
    return;
  }
  const rewardName = itemDefs[entity.yieldItemId]?.name ?? entity.yieldItemId;
  const rareChance = Math.min(0.34, 0.03 + state.player.attributes.Luck * 0.006 + skillValue * 0.001);
  const stoneChance = entity.resourceType === 'ore' ? 0.65 + skillValue * 0.002 : 0;

  const extraRewards: string[] = [];
  if (entity.resourceType === 'ore' && Math.random() < stoneChance && addItem(state.player.inventory, 'stone_block', randomInt(1, 3))) {
    extraRewards.push('Stone Block');
  }
  if (entity.resourceType === 'ore' && Math.random() < rareChance && addItem(state.player.inventory, 'glimmer_gem', 1)) {
    extraRewards.push('Glimmer Gem');
  }

  entity.depleted = true;
  entity.blocksMovement = false;
  entity.respawnTimer = entity.respawnSeconds ?? definition.respawnSeconds;
  attemptSkillUse(state, entity.skill, {
    verb: 'harvest-resource',
    difficulty: entity.resourceType === 'ore' ? 30 : 22,
    success: true,
    targetId: entity.id,
    itemId: entity.yieldItemId,
    relatedSkills: entity.resourceType === 'ore' ? ['Arms Lore'] : entity.resourceType === 'herb' ? ['Taste Identification'] : ['Carpentry']
  });
  recordQuestEvent(state, { type: 'gather', skillId: entity.skill, itemId: entity.yieldItemId, quantity: amount });
  recordResourceYield(state, entity.yieldItemId, amount);
  refreshQuestProgress(state);
  addSystemMessage(state, `You receive: ${rewardName} x${amount}.`);
  extraRewards.forEach((reward) => addSystemMessage(state, `You also find: ${reward}.`));
  addFloatingText(state, `+${amount} ${rewardName}`, entity.position, '#e8f5be');
  emitAudioHook(gatheringCue(entity.resourceType), { id: entity.id, area: entity.area, position: entity.position, intensity: amount });
  if (extraRewards.length) addFloatingText(state, extraRewards.join(' + '), { ...entity.position, x: entity.position.x + 0.25 }, '#78d7ff');
  degradeToolForGathering(state, entity.toolItemId);
  registerResourceHarvest(state, entity.area);
  state.gathering = null;
  refreshPlayerActionState(state);
}

export function updateGathering(state: GameState, dt: number): void {
  const gathering = state.gathering;
  if (!gathering) return;
  const entity = state.entities[gathering.entityId];
  if (!entity || entity.kind !== 'resource' || entity.depleted || entity.area !== state.player.currentArea) {
    state.gathering = null;
    refreshPlayerActionState(state);
    return;
  }
  if (distToPlayer(state, entity.id) > 2.35) {
    addSystemMessage(state, 'Gathering interrupted: moved too far away.');
    state.gathering = null;
    refreshPlayerActionState(state);
    return;
  }
  gathering.remaining = Math.max(0, gathering.remaining - dt);
  const percent = Math.round(100 - (gathering.remaining / gathering.duration) * 100);
  state.ui.prompt = `${gathering.actionLabel}... ${percent}%`;
  if (gathering.remaining <= 0) completeGathering(state, entity);
}

export function updateResources(state: GameState, dt: number): void {
  for (const entity of Object.values(state.entities)) {
    if (entity.kind !== 'resource' || !entity.depleted) continue;
    entity.respawnTimer -= dt;
    if (entity.respawnTimer <= 0) {
      entity.depleted = false;
      entity.blocksMovement = true;
    }
  }
}

export function openTrade(state: GameState, partnerId: string): void {
  const partner = state.entities[partnerId];
  if (!partner || (partner.kind !== 'npc' && partner.kind !== 'social')) return;
  state.ui.trade = {
    partnerId,
    playerSlots: Array.from({ length: 8 }, () => null),
    partnerSlots: partner.tradeInventory?.slots.slice(0, 8).map((slot) => (slot ? { ...slot } : null)) ?? [],
    playerGold: 0,
    partnerGold: partner.kind === 'social' ? Math.min(partner.tradeGold ?? 0, 25) : 0,
    playerLocked: false,
    partnerLocked: false
  };
  state.ui.merchant = null;
  state.ui.panels.merchant = false;
  state.ui.panels.trade = true;
  state.ui.panels.inventory = true;
  state.ui.prompt = `Trading with ${partner.name}.`;
  addSystemMessage(state, `You have invited ${partner.name} to trade.`);
}

function gatheringCue(resourceType: 'tree' | 'ore' | 'fish' | 'herb'): 'tree_chop' | 'mining_hit' | 'item_pickup' {
  if (resourceType === 'ore') return 'mining_hit';
  if (resourceType === 'tree') return 'tree_chop';
  return 'item_pickup';
}

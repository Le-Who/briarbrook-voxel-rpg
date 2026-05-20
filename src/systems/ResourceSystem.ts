import { itemDefs } from '../data/items';
import { text } from '../content/Strings';
import { emitAudioHook } from '../audio/AudioHooks';
import { resourceTileKey } from '../data/resourceMaps';
import { createId } from '../game/GameState';
import type { GameState, ResourceKind, ResourceTile, TargetRef, Vec3 } from '../game/types';
import { AreaManager } from '../world/AreaManager';
import { actionSucceeded, invalidAction, resourceGained } from './ActionFeedbackSystem';
import { facePlayerTowardTarget } from './FacingSystem';
import { addItem, removeItems } from './InventorySystem';
import { addFloatingText } from './LootSystem';
import { recordQuestEvent, refreshQuestProgress } from './QuestSystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';
import { recordResourceYield } from './TelemetrySystem';
import { queueGatheringEffect } from './VfxSystem';

const toolConfig: Record<string, { kind: ResourceKind; skill: string; verb: string; invalid: string; fail: string; depleted: string; protected: string; range: number }> = {
  axe: {
    kind: 'tree',
    skill: 'Lumberjacking',
    verb: 'chop',
    invalid: text('error.treeRequired'),
    fail: 'You fail to produce usable wood.',
    depleted: 'Tree recovering.',
    protected: 'Town tree is protected.',
    range: 5.2
  },
  pickaxe: {
    kind: 'ore',
    skill: 'Mining',
    verb: 'mine',
    invalid: text('error.noOreHere'),
    fail: 'You loosen only useless stone dust.',
    depleted: 'The vein is depleted.',
    protected: 'This resource is protected.',
    range: 5.2
  },
  shovel: {
    kind: 'ore',
    skill: 'Mining',
    verb: 'dig',
    invalid: text('error.nothingBuriedHere'),
    fail: 'You find nothing useful.',
    depleted: 'The vein is depleted.',
    protected: 'This resource is protected.',
    range: 5.2
  },
  fishing_pole: {
    kind: 'water',
    skill: 'Fishing',
    verb: 'fish',
    invalid: text('error.waterRequired'),
    fail: 'The fish are not biting.',
    depleted: 'This spot needs time to settle.',
    protected: 'This spot is protected.',
    range: 10
  }
};

export function targetingPromptForTool(toolItemId: string): string {
  if (toolItemId === 'axe') return text('prompt.selectTree');
  if (toolItemId === 'shovel') return text('prompt.selectSuspiciousGround');
  if (toolItemId === 'pickaxe') return text('prompt.selectMineTarget');
  if (toolItemId === 'fishing_pole') return text('prompt.selectWater');
  return text('prompt.selectToolTarget', { tool: itemDefs[toolItemId]?.name ?? toolItemId });
}

export function isTargetingTool(itemId: string): boolean {
  return itemId in toolConfig;
}

export function useToolOnTarget(state: GameState, areaManager: AreaManager, toolItemId: string, target: TargetRef): void {
  const config = toolConfig[toolItemId];
  if (!config || !target) return;
  if (!hasTool(state, toolItemId)) {
    const message = text('error.toolRequired', {
      tool: withIndefiniteArticle(itemDefs[toolItemId]?.name ?? toolItemId),
      verb: config.verb
    });
    invalidAction(state, message, 'Equip or keep one in your pack.', { position: state.player.position });
    return;
  }

  if (toolItemId === 'axe' && target.kind === 'inventory') {
    const stack = state.player.inventory.slots[target.slot];
    if (stack?.itemId === 'logs' && removeItems(state.player.inventory, 'logs', 1)) {
      addItem(state.player.inventory, 'boards', 2);
      attemptSkillUse(state, 'Carpentry', { verb: 'craft', difficulty: 18, success: true, itemId: 'boards', relatedSkills: ['Lumberjacking'] });
      actionSucceeded(state, '+2 Boards', { position: state.player.position, floatText: '+2 Boards' });
      return;
    }
  }

  const position = resolveTargetPosition(state, target);
  if (!position) {
    invalidAction(state, config.invalid, undefined, { position: state.player.position });
    return;
  }
  const targetEntity = target.kind === 'entity' ? state.entities[target.entityId] : null;
  if (distance(state.player.position, position) > config.range) {
    state.player.targetPosition = approachPoint(state.player.position, position, Math.max(1.1, config.range - 0.6));
    state.ui.prompt = `${text('error.targetTooFar')} ${text('status.movingCloser', { action: config.verb })}`;
    return;
  }
  facePlayerTowardTarget(state, target, 'gathering', 0.45);

  const tile = resolveResourceTile(state, target, config.kind);
  if (!tile) {
    invalidAction(state, config.invalid, undefined, { position });
    return;
  }
  if (tile.protected) {
    invalidAction(state, config.protected, 'Find a forest tree.', { position: { x: tile.x, y: 0, z: tile.z }, floatText: 'Protected', color: '#d8d8d8' });
    return;
  }
  if (tile.depletedUntil > state.clock || tile.harvestsRemaining <= 0) {
    invalidAction(state, config.depleted, 'Try another node.', { position: { x: tile.x, y: 0, z: tile.z }, floatText: 'Depleted', color: '#d8d8d8' });
    queueGatheringEffect(state, config.kind, { x: tile.x, y: 0, z: tile.z }, 'depleted');
    return;
  }

  const skillValue = getSkillValue(state, config.skill);
  const successChance = Math.max(0.12, Math.min(0.92, 0.58 + (skillValue - tile.difficulty) * 0.012));
  const success = Math.random() < successChance;
  attemptSkillUse(state, config.skill, {
    verb: config.kind === 'water' ? 'fish' : 'harvest-resource',
    difficulty: tile.difficulty,
    success,
    tile: { x: tile.x, y: 0, z: tile.z },
    relatedSkills: config.kind === 'tree' ? ['Carpentry'] : config.kind === 'ore' ? ['Arms Lore'] : ['Cooking']
  });

  tile.lastHarvestedAt = state.clock;
  if (!success) {
    invalidAction(state, config.fail, undefined, { position: { x: tile.x, y: 0, z: tile.z }, floatText: 'Failed', color: '#d8d8d8' });
    queueGatheringEffect(state, config.kind, { x: tile.x, y: 0, z: tile.z }, 'active');
    return;
  }

  const rewards = rollRewards(tile, skillValue);
  if (!rewards.length) {
    invalidAction(state, config.fail, undefined, { position: { x: tile.x, y: 0, z: tile.z }, floatText: 'Failed', color: '#d8d8d8' });
    return;
  }
  for (const reward of rewards) addItem(state.player.inventory, reward.itemId, reward.quantity);
  tile.harvestsRemaining -= 1;
  if (tile.harvestsRemaining <= 0 && config.kind !== 'water') {
    tile.depletedUntil = state.clock + (config.kind === 'tree' ? 32 : 38);
    tile.visualState = config.kind === 'tree' ? 'stump' : 'depleted';
    if (targetEntity?.kind === 'resource') {
      targetEntity.depleted = true;
      targetEntity.blocksMovement = false;
      targetEntity.respawnTimer = config.kind === 'tree' ? 32 : 38;
    }
  }
  if (config.kind === 'water' && Math.random() < 0.18) tile.depletedUntil = state.clock + 12;

  const rewardText = rewards.map((reward) => `+${reward.quantity} ${itemDefs[reward.itemId]?.name ?? reward.itemId}`).join(', ');
  rewards.forEach((reward) => recordQuestEvent(state, { type: 'gather', skillId: config.skill, itemId: reward.itemId, quantity: reward.quantity }));
  rewards.forEach((reward) => recordResourceYield(state, reward.itemId, reward.quantity));
  refreshQuestProgress(state);
  resourceGained(state, rewardText, { x: tile.x, y: 0, z: tile.z }, config.kind === 'water' ? '#9ad8ff' : '#e8f5be');
  queueGatheringEffect(state, config.kind, { x: tile.x, y: 0, z: tile.z }, 'success');
  emitAudioHook(config.kind === 'ore' ? 'gather_mine' : config.kind === 'tree' ? 'gather_chop' : config.kind === 'water' ? 'gather_fish' : 'item_pickup', {
    area: state.player.currentArea,
    position: { x: tile.x, y: 0, z: tile.z },
    intensity: rewards.length
  });
}

export function updateResourceTiles(state: GameState): void {
  for (const tile of Object.values(state.world.resourceTiles)) {
    if (tile.depletedUntil > 0 && tile.depletedUntil <= state.clock) {
      tile.depletedUntil = 0;
      tile.harvestsRemaining = tile.maxHarvests;
      tile.visualState = 'standing';
      if (tile.resourceKind === 'ore') tile.hiddenQuality = 0.7 + Math.random() * 0.45;
    }
  }
}

export function inspectTargetForTool(state: GameState, toolItemId: string, target: TargetRef): string | null {
  const config = toolConfig[toolItemId];
  if (!config || !target) return null;
  const tile = resolveResourceTile(state, target, config.kind);
  if (!tile) {
    if (toolItemId === 'axe' && target.kind === 'tile' && target.areaId === 'forest') return 'Too small/shrub';
    return null;
  }
  if (tile.protected) return 'Protected Tree';
  if (tile.depletedUntil > state.clock || tile.harvestsRemaining <= 0) return tile.resourceKind === 'tree' ? 'Depleted' : `${tile.name} (depleted)`;
  return tile.name;
}

export function resourceTileAtPosition(state: GameState, position: Vec3, kind?: ResourceKind, radius = 0): ResourceTile | null {
  const x = Math.round(position.x);
  const z = Math.round(position.z);
  const kinds: ResourceKind[] = kind ? [kind] : ['tree', 'ore', 'water', 'herb'];
  for (const candidateKind of kinds) {
    const exact = state.world.resourceTiles[resourceTileKey(state.player.currentArea, x, z, candidateKind)];
    if (exact) return exact;
    const nearby = nearbyResourceTile(state, x, z, candidateKind, radius);
    if (nearby) return nearby;
  }
  return null;
}

function resolveResourceTile(state: GameState, target: TargetRef, kind: ResourceKind): ResourceTile | null {
  if (!target) return null;
  if (target.kind === 'entity') {
    const entity = state.entities[target.entityId];
    if (entity?.kind === 'resource' && ((kind === 'tree' && entity.resourceType === 'tree') || (kind === 'ore' && entity.resourceType === 'ore'))) {
      return ensureTileFromEntity(state, entity, kind);
    }
  }
  const position = resolveTargetPosition(state, target);
  if (!position) return null;
  const x = Math.round(position.x);
  const z = Math.round(position.z);
  return (
    state.world.resourceTiles[resourceTileKey(state.player.currentArea, x, z, kind)] ??
    nearbyResourceTile(state, x, z, kind, kind === 'water' ? 0 : 1)
  );
}

function nearbyResourceTile(state: GameState, x: number, z: number, kind: ResourceKind, radius: number): ResourceTile | null {
  for (const tile of Object.values(state.world.resourceTiles)) {
    if (tile.areaId !== state.player.currentArea || tile.resourceKind !== kind) continue;
    if (Math.abs(tile.x - x) <= radius && Math.abs(tile.z - z) <= radius) return tile;
  }
  return null;
}

export function resourceTileForEntity(state: GameState, entity: Extract<GameState['entities'][string], { kind: 'resource' }>): ResourceTile {
  return ensureTileFromEntity(state, entity, resourceKindForEntity(entity));
}

export function depleteResourceTileForEntity(state: GameState, entity: Extract<GameState['entities'][string], { kind: 'resource' }>): void {
  const tile = resourceTileForEntity(state, entity);
  tile.lastHarvestedAt = state.clock;
  tile.harvestsRemaining = 0;
  tile.depletedUntil = state.clock + entity.respawnSeconds;
  tile.visualState = entity.resourceType === 'tree' ? 'stump' : 'depleted';
}

export function restoreResourceTileForEntity(state: GameState, entity: Extract<GameState['entities'][string], { kind: 'resource' }>): void {
  const tile = resourceTileForEntity(state, entity);
  tile.depletedUntil = 0;
  tile.harvestsRemaining = tile.maxHarvests;
  tile.visualState = 'standing';
}

function ensureTileFromEntity(state: GameState, entity: Extract<GameState['entities'][string], { kind: 'resource' }>, kind: ResourceKind): ResourceTile {
  const tileKind = kind;
  const key = resourceTileKey(entity.area, entity.position.x, entity.position.z, tileKind);
  const existing = state.world.resourceTiles[key];
  if (existing) return existing;
  const tile: ResourceTile = {
    areaId: entity.area,
    x: Math.round(entity.position.x),
    z: Math.round(entity.position.z),
    resourceKind: tileKind,
    name: entity.protected && tileKind === 'tree' ? 'Protected Tree' : tileKind === 'tree' ? 'Tree' : 'Rock Face',
    classification: entity.classification,
    protected: entity.protected ?? false,
    tileId: `${entity.area}:${tileKind}:${Math.round(entity.position.x)},${Math.round(entity.position.z)}`,
    entityId: entity.id,
    visualState: entity.depleted ? (tileKind === 'tree' ? 'stump' : 'depleted') : 'standing',
    depletedUntil: 0,
    currentYieldTable:
      tileKind === 'tree'
        ? [
            { itemId: 'logs', min: 4, max: 8, chance: 1 },
            { itemId: 'bark_fragment', min: 1, max: 2, chance: 0.2 }
          ]
        : [
            { itemId: entity.yieldItemId, min: entity.yieldRange[0], max: entity.yieldRange[1], chance: 1 },
            { itemId: 'stone_block', min: 1, max: 3, chance: 0.5 }
          ],
    hiddenQuality: 1,
    lastHarvestedAt: 0,
    visualVariant: 0,
    difficulty: tileKind === 'tree' ? 22 : 28,
    harvestsRemaining: 3,
    maxHarvests: 3
  };
  state.world.resourceTiles[key] = tile;
  return tile;
}

function resourceKindForEntity(entity: Extract<GameState['entities'][string], { kind: 'resource' }>): ResourceKind {
  return entity.resourceType === 'fish' ? 'water' : entity.resourceType;
}

function rollRewards(tile: ResourceTile, skillValue: number): Array<{ itemId: string; quantity: number }> {
  const rewards: Array<{ itemId: string; quantity: number }> = [];
  for (const entry of tile.currentYieldTable) {
    if (entry.minSkill && skillValue < entry.minSkill) continue;
    const chance = Math.min(0.98, entry.chance * tile.hiddenQuality + Math.max(0, skillValue - (entry.minSkill ?? 0)) * 0.002);
    if (Math.random() > chance) continue;
    rewards.push({ itemId: entry.itemId, quantity: randomInt(entry.min, entry.max) });
  }
  if (!rewards.length && tile.currentYieldTable[0]) {
    const fallback = tile.currentYieldTable[0];
    rewards.push({ itemId: fallback.itemId, quantity: randomInt(fallback.min, fallback.max) });
  }
  return rewards;
}

function withIndefiniteArticle(label: string): string {
  const normalized = label.trim();
  if (!normalized) return 'a tool';
  return `${/^[aeiou]/i.test(normalized) ? 'an' : 'a'} ${normalized}`;
}

function hasTool(state: GameState, itemId: string): boolean {
  return state.player.inventory.slots.some((slot) => slot?.itemId === itemId) || Object.values(state.player.equipment).some((slot) => slot?.itemId === itemId);
}

function resolveTargetPosition(state: GameState, target: TargetRef): Vec3 | null {
  if (!target) return null;
  if (target.kind === 'tile') return target.position;
  if (target.kind === 'entity' || target.kind === 'ground-item' || target.kind === 'friendly' || target.kind === 'hostile') return state.entities[target.entityId]?.position ?? null;
  if (target.kind === 'self') return state.player.position;
  return null;
}

function approachPoint(from: Vec3, to: Vec3, distanceFromTarget: number): Vec3 {
  const dx = from.x - to.x;
  const dz = from.z - to.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: to.x + (dx / len) * distanceFromTarget, y: 0, z: to.z + (dz / len) * distanceFromTarget };
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function addResourceFloatingText(state: GameState, text: string, position: Vec3, color: string): void {
  state.floatingTexts.push({ id: createId('float'), text, position: { ...position, y: position.y + 1.2 }, color, age: 0, lifetime: 1.2 });
}

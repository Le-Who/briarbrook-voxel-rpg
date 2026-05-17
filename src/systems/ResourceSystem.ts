import { itemDefs } from '../data/items';
import { resourceTileKey } from '../data/resourceMaps';
import { createId } from '../game/GameState';
import type { GameState, ResourceKind, ResourceTile, TargetRef, Vec3 } from '../game/types';
import { AreaManager } from '../world/AreaManager';
import { addSystemMessage } from './ChatSystem';
import { addItem, removeItems } from './InventorySystem';
import { addFloatingText } from './LootSystem';
import { recordQuestEvent, refreshQuestProgress } from './QuestSystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';
import { recordResourceYield } from './TelemetrySystem';

const toolConfig: Record<string, { kind: ResourceKind; skill: string; verb: string; invalid: string; fail: string; depleted: string; range: number }> = {
  axe: {
    kind: 'tree',
    skill: 'Lumberjacking',
    verb: 'chop',
    invalid: 'You need a tree to chop this.',
    fail: 'You fail to produce usable wood.',
    depleted: 'This tree has not recovered enough usable wood.',
    range: 5.2
  },
  pickaxe: {
    kind: 'ore',
    skill: 'Mining',
    verb: 'mine',
    invalid: 'That rock is too soft to hold ore.',
    fail: 'You loosen only useless stone dust.',
    depleted: 'The vein is depleted.',
    range: 5.2
  },
  shovel: {
    kind: 'ore',
    skill: 'Mining',
    verb: 'dig',
    invalid: 'That ground is too loose to hold ore.',
    fail: 'You find nothing useful.',
    depleted: 'The vein is depleted.',
    range: 5.2
  },
  fishing_pole: {
    kind: 'water',
    skill: 'Fishing',
    verb: 'fish',
    invalid: 'You need to target water.',
    fail: 'The fish are not biting.',
    depleted: 'This spot needs time to settle.',
    range: 10
  }
};

export function targetingPromptForTool(toolItemId: string): string {
  if (toolItemId === 'axe') return 'Select a tree.';
  if (toolItemId === 'shovel') return 'Select suspicious ground or a map-marked tile.';
  if (toolItemId === 'pickaxe') return 'Select a rock face, cave wall, or ore tile.';
  if (toolItemId === 'fishing_pole') return 'Select water.';
  return `Select a target for ${itemDefs[toolItemId]?.name ?? toolItemId}.`;
}

export function isTargetingTool(itemId: string): boolean {
  return itemId in toolConfig;
}

export function useToolOnTarget(state: GameState, areaManager: AreaManager, toolItemId: string, target: TargetRef): void {
  const config = toolConfig[toolItemId];
  if (!config || !target) return;
  if (!hasTool(state, toolItemId)) {
    const message = toolItemId === 'axe' ? 'You need an axe to chop this.' : toolItemId === 'pickaxe' ? 'You need a pickaxe to mine this.' : `You need ${itemDefs[toolItemId]?.name ?? toolItemId}.`;
    state.ui.prompt = message;
    addSystemMessage(state, message);
    return;
  }

  if (toolItemId === 'axe' && target.kind === 'inventory') {
    const stack = state.player.inventory.slots[target.slot];
    if (stack?.itemId === 'logs' && removeItems(state.player.inventory, 'logs', 1)) {
      addItem(state.player.inventory, 'boards', 2);
      attemptSkillUse(state, 'Carpentry', { verb: 'craft', difficulty: 18, success: true, itemId: 'boards', relatedSkills: ['Lumberjacking'] });
      addSystemMessage(state, 'You split logs into boards.');
      addFloatingText(state, '+2 Boards', state.player.position, '#e8d79a');
      return;
    }
  }

  const position = resolveTargetPosition(state, target);
  if (!position) {
    addSystemMessage(state, config.invalid);
    return;
  }
  if (distance(state.player.position, position) > config.range) {
    state.player.targetPosition = approachPoint(state.player.position, position, Math.max(1.1, config.range - 0.6));
    state.ui.prompt = `You are too far away. Moving closer to ${config.verb}.`;
    return;
  }

  const tile = resolveResourceTile(state, target, config.kind);
  if (!tile) {
    addSystemMessage(state, config.invalid);
    state.ui.prompt = config.invalid;
    return;
  }
  if (tile.depletedUntil > state.clock || tile.harvestsRemaining <= 0) {
    addSystemMessage(state, config.depleted);
    state.ui.prompt = config.depleted;
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
    addSystemMessage(state, config.fail);
    state.ui.prompt = config.fail;
    addFloatingText(state, 'Failed', { x: tile.x, y: 0, z: tile.z }, '#d8d8d8');
    return;
  }

  const rewards = rollRewards(tile, skillValue);
  if (!rewards.length) {
    addSystemMessage(state, config.fail);
    return;
  }
  for (const reward of rewards) addItem(state.player.inventory, reward.itemId, reward.quantity);
  tile.harvestsRemaining -= 1;
  if (tile.harvestsRemaining <= 0 && config.kind !== 'water') tile.depletedUntil = state.clock + (config.kind === 'tree' ? 32 : 38);
  if (config.kind === 'water' && Math.random() < 0.18) tile.depletedUntil = state.clock + 12;

  const text = rewards.map((reward) => `+${reward.quantity} ${itemDefs[reward.itemId]?.name ?? reward.itemId}`).join(', ');
  rewards.forEach((reward) => recordQuestEvent(state, { type: 'gather', skillId: config.skill, itemId: reward.itemId, quantity: reward.quantity }));
  rewards.forEach((reward) => recordResourceYield(state, reward.itemId, reward.quantity));
  refreshQuestProgress(state);
  addSystemMessage(state, `You receive: ${text}.`);
  state.ui.prompt = `You receive: ${text}.`;
  addFloatingText(state, text, { x: tile.x, y: 0, z: tile.z }, config.kind === 'water' ? '#9ad8ff' : '#e8f5be');
}

export function updateResourceTiles(state: GameState): void {
  for (const tile of Object.values(state.world.resourceTiles)) {
    if (tile.depletedUntil > 0 && tile.depletedUntil <= state.clock) {
      tile.depletedUntil = 0;
      tile.harvestsRemaining = tile.maxHarvests;
      if (tile.resourceKind === 'ore') tile.hiddenQuality = 0.7 + Math.random() * 0.45;
    }
  }
}

export function inspectTargetForTool(state: GameState, toolItemId: string, target: TargetRef): string | null {
  const config = toolConfig[toolItemId];
  if (!config || !target) return null;
  const tile = resolveResourceTile(state, target, config.kind);
  if (!tile) return null;
  if (tile.depletedUntil > state.clock || tile.harvestsRemaining <= 0) return `${tile.name} (depleted)`;
  return tile.name;
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
    name: tileKind === 'tree' ? 'Tree' : 'Rock Face',
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

import { itemDefs } from '../data/items';
import { emitAudioHook } from '../audio/AudioHooks';
import { createId, createStack } from '../game/GameState';
import type { EnemyEntity, GameState, ItemStack, Vec3 } from '../game/types';
import { addSystemMessage } from './ChatSystem';
import { addItem } from './InventorySystem';
import { recordQuestEvent } from './QuestSystem';
import { recordGoldDelta } from './TelemetrySystem';

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function spawnLootFromEnemy(state: GameState, enemy: EnemyEntity): void {
  const gold = randomInt(enemy.goldDrop[0], enemy.goldDrop[1]);
  const goldId = createId('loot_gold');
  state.entities[goldId] = {
    id: goldId,
    kind: 'loot',
    area: enemy.area,
    name: `${gold} Gold`,
    gold,
    position: { x: enemy.position.x + 0.4, y: 0, z: enemy.position.z - 0.2 },
    expiresIn: 90,
    blocksMovement: false
  };
  enemy.lootTable.forEach((entry, index) => {
    if (Math.random() > entry.chance) return;
    const qty = randomInt(entry.min, entry.max);
    const stack = createStack(entry.itemId, qty);
    const lootId = createId(`loot_${entry.itemId}`);
    state.entities[lootId] = {
      id: lootId,
      kind: 'loot',
      area: enemy.area,
      name: itemDefs[entry.itemId]?.name ?? entry.itemId,
      item: stack,
      position: { x: enemy.position.x - 0.35 + index * 0.35, y: 0, z: enemy.position.z + 0.45 },
      expiresIn: 90,
      blocksMovement: false
    };
  });
}

export function pickupLoot(state: GameState, entityId: string): void {
  const entity = state.entities[entityId];
  if (!entity || entity.kind !== 'loot') return;
  const dist = Math.hypot(entity.position.x - state.player.position.x, entity.position.z - state.player.position.z);
  if (dist > 1.8) return;
  if (entity.gold) {
    state.player.gold += entity.gold;
    recordGoldDelta(state, entity.gold);
    recordQuestEvent(state, { type: 'loot', gold: entity.gold });
    addSystemMessage(state, `You receive loot: ${entity.gold} Gold.`);
  }
  if (entity.item) {
    const stack = entity.item as ItemStack;
    if (!addItem(state.player.inventory, stack.itemId, stack.quantity)) {
      addSystemMessage(state, 'Your pack is full.');
      return;
    }
    recordQuestEvent(state, { type: 'loot', itemId: stack.itemId, quantity: stack.quantity });
    addSystemMessage(state, `You receive loot: ${itemDefs[stack.itemId]?.name ?? stack.itemId}.`);
  }
  emitAudioHook('item_pickup', { id: entity.id, area: entity.area, position: entity.position });
  delete state.entities[entityId];
}

export function updateLoot(state: GameState, dt: number): void {
  for (const entity of Object.values(state.entities)) {
    if (entity.kind !== 'loot') continue;
    entity.expiresIn -= dt;
    if (entity.expiresIn <= 0) delete state.entities[entity.id];
  }
}

export function addFloatingText(state: GameState, text: string, position: Vec3, color = '#f6df8b'): void {
  state.floatingTexts.push({
    id: createId('float'),
    text,
    position: { ...position, y: position.y + 1.6 },
    color,
    age: 0,
    lifetime: 1.35
  });
}

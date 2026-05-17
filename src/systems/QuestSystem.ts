import { itemDefs } from '../data/items';
import type { GameState } from '../game/types';
import { addItem, getItemCount, removeItems } from './InventorySystem';
import { addSystemMessage } from './ChatSystem';
import { gainPlayerXp } from './SkillSystem';
import { recordGoldDelta, recordQuestCompletionTelemetry } from './TelemetrySystem';

export type QuestEvent =
  | { type: 'talk'; npcName: string }
  | { type: 'open_panel'; panel: string }
  | { type: 'gather'; skillId: string; itemId?: string; quantity?: number }
  | { type: 'craft'; recipeId: string; skillId?: string; itemId?: string }
  | { type: 'buy'; itemId: string; quantity?: number }
  | { type: 'cast'; spellId: string }
  | { type: 'meditate' }
  | { type: 'bandage' }
  | { type: 'bank'; itemId?: string; quantity?: number }
  | { type: 'enter_area'; areaId: GameState['player']['currentArea'] }
  | { type: 'build'; pieceId?: string }
  | { type: 'loot'; itemId?: string; quantity?: number; gold?: number }
  | { type: 'open_container'; containerId?: string }
  | { type: 'bard'; skillId: string }
  | { type: 'kill'; enemyName: string };

export function refreshQuestProgress(state: GameState): void {
  Object.values(state.quests).forEach((quest) => {
    if (!state.player.activeQuestIds.includes(quest.id) || quest.status === 'complete') return;
    quest.objectives.forEach((objective) => {
      if (objective.type === 'collect' && objective.itemId) {
        objective.progress = Math.min(objective.required, getItemCount(state.player.inventory, objective.itemId));
      }
    });
    quest.status = quest.objectives.every((objective) => objective.progress >= objective.required) ? 'ready' : 'active';
  });
}

export function recordKill(state: GameState, enemyName: string): void {
  recordQuestEvent(state, { type: 'kill', enemyName });
}

export function recordQuestEvent(state: GameState, event: QuestEvent): void {
  Object.values(state.quests).forEach((quest) => {
    if (!state.player.activeQuestIds.includes(quest.id) || quest.status === 'complete') return;
    quest.objectives.forEach((objective) => {
      if (objective.progress >= objective.required || objective.type === 'collect' || objective.type === 'deliver') return;
      if (questObjectiveMatches(objective, event)) {
        objective.progress = Math.min(objective.required, objective.progress + eventProgress(event));
      }
    });
    quest.status = quest.objectives.every((objective) => objective.progress >= objective.required) ? 'ready' : 'active';
  });
}

export function completeQuest(state: GameState, questId: string): void {
  const quest = state.quests[questId];
  if (!quest || quest.status !== 'ready') return;
  for (const objective of quest.objectives) {
    if (objective.type === 'deliver' && objective.itemId) {
      removeItems(state.player.inventory, objective.itemId, objective.required);
    }
  }
  state.player.gold += quest.rewards.gold;
  recordGoldDelta(state, quest.rewards.gold);
  recordQuestCompletionTelemetry(state, quest.id);
  gainPlayerXp(state, quest.rewards.xp);
  quest.rewards.items?.forEach((reward) => addItem(state.player.inventory, reward.itemId, reward.quantity));
  quest.status = 'complete';
  state.player.completedQuestIds.push(quest.id);
  state.player.activeQuestIds = state.player.activeQuestIds.filter((id) => id !== quest.id);
  addSystemMessage(state, `Quest complete: ${quest.title}. Rewards received.`);
  quest.rewards.items?.forEach((reward) => {
    addSystemMessage(state, `You receive ${reward.quantity} ${itemDefs[reward.itemId]?.name ?? reward.itemId}.`);
  });
  unlockFollowupQuests(state, quest.id);
}

function unlockFollowupQuests(state: GameState, questId: string): void {
  const unlocks: Record<string, string[]> = {
    prepare_for_road: ['patch_yourself_up', 'mages_errand', 'trouble_on_road'],
    ore_for_brom: ['place_to_call_yours'],
    trouble_on_road: ['bones_beneath']
  };
  for (const id of unlocks[questId] ?? []) {
    if (!state.quests[id] || state.player.completedQuestIds.includes(id) || state.player.activeQuestIds.includes(id)) continue;
    state.player.activeQuestIds.push(id);
    addSystemMessage(state, `New lead: ${state.quests[id].title}.`);
  }
}

function questObjectiveMatches(objective: GameState['quests'][string]['objectives'][number], event: QuestEvent): boolean {
  if (objective.type !== event.type) return false;
  if ('npcName' in event && objective.npcName && objective.npcName !== event.npcName) return false;
  if ('panel' in event && objective.panel && objective.panel !== event.panel) return false;
  if ('skillId' in event && objective.skillId && objective.skillId !== event.skillId) return false;
  if ('recipeId' in event && objective.recipeId && objective.recipeId !== event.recipeId) return false;
  if ('spellId' in event && objective.spellId && objective.spellId !== event.spellId) return false;
  if ('containerId' in event && objective.containerId && objective.containerId !== event.containerId) return false;
  if ('areaId' in event && objective.areaId && objective.areaId !== event.areaId) return false;
  if ('enemyName' in event && objective.enemyName && objective.enemyName !== event.enemyName) return false;
  if ('itemId' in event && objective.itemId && objective.itemId !== event.itemId) return false;
  return true;
}

function eventProgress(event: QuestEvent): number {
  if ('quantity' in event && typeof event.quantity === 'number') return Math.max(1, event.quantity);
  return 1;
}

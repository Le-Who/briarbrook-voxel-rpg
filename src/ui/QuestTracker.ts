import type { GameState } from '../game/types';

export function QuestTracker(state: GameState): string {
  if (!state.ui.panels.quest) return '';
  const quests = state.player.activeQuestIds.map((id) => state.quests[id]).filter(Boolean);
  const quest = quests.find((candidate) => candidate.status === 'ready') ?? quests[0];
  if (!quest) return '';
  const next = quest.objectives.find((objective) => objective.progress < objective.required);
  const completed = quest.objectives.filter((objective) => objective.progress >= objective.required).length;
  return `<section class="panel quest-panel">
    <header><span>Quest Focus</span><button data-action="toggle-panel" data-panel="quest">x</button></header>
    <div class="quest-entry">
      <b>${quest.title}</b>
      ${next ? `<span>${next.label} <strong>${next.progress}/${next.required}</strong></span>` : '<span>Return to the quest giver.</span>'}
      <small>${completed}/${quest.objectives.length} steps complete</small>
      ${quest.status === 'ready' ? `<button data-complete-quest="${quest.id}">Complete</button>` : ''}
      ${quests.length > 1 ? `<small>${quests.length - 1} more lead${quests.length > 2 ? 's' : ''} in Journal</small>` : ''}
    </div>
  </section>`;
}

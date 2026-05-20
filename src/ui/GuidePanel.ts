import type { GameState } from '../game/types';
import { deriveFirstHourDirector } from '../systems/FirstHourDirector';
import { skillXpThreshold } from '../systems/SkillSystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

export function GuidePanel(state: GameState): string {
  if (!state.ui.panels.guide) return '';
  const director = deriveFirstHourDirector(state);
  const next = director.nextStep ? director.milestones.findIndex((step) => step.id === director.nextStep?.id) : -1;
  const focus = director.nextStep ?? director.milestones[director.milestones.length - 1];
  const visible = director.milestones
    .map((step, index) => ({ step, index }))
    .filter(({ step, index }) => step.done || index === next || index === next + 1)
    .slice(-3);
  const skill = focus?.skillId ? state.player.skills[focus.skillId] : null;
  const skillPct = skill ? Math.max(2, Math.min(100, ((skill.gainProgress ?? skill.xp) / skillXpThreshold(skill.realValue ?? skill.value)) * 100)) : 0;
  return `<section class="panel guide-panel">
    <header><span>Next Step</span><button data-action="toggle-panel" data-panel="guide">x</button></header>
    <div class="guide-focus">
      <b>${attr(focus?.label ?? 'First-hour route complete')}</b>
      <span>${attr(focus?.detail ?? 'Keep exploring Briarbrook systems at your own pace.')}</span>
      ${director.objective ? `<small>Map: ${attr(director.objective.label)}</small>` : ''}
      ${director.hint.unlocked ? `<small class="guide-hint">${attr(director.hint.text)}</small>` : ''}
      ${skill && focus?.skillId ? `<div class="guide-skill"><small>Next ${attr(focus.skillId)} gain</small><i><b style="width:${skillPct}%"></b></i><em>${Math.round(skillPct)}%</em></div>` : ''}
    </div>
    <div class="guide-list">
      ${visible
        .map(({ step, index }) => `<div class="guide-step ${step.done ? 'done' : index === next ? 'active' : ''}"><i>${step.done ? 'OK' : index === next ? '>' : '-'}</i><span>${attr(step.label)}</span></div>`)
        .join('')}
    </div>
    <button class="journal-open" data-action="toggle-panel" data-panel="journal">Journal</button>
  </section>`;
}

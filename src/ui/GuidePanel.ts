import type { GameState } from '../game/types';
import { getItemCount } from '../systems/InventorySystem';
import { skillXpThreshold } from '../systems/SkillSystem';

interface GuideStep {
  text: string;
  why: string;
  skillId?: string;
  done: boolean;
}

export function GuidePanel(state: GameState): string {
  if (!state.ui.panels.guide) return '';
  const objectiveDone = (questId: string, type: string, labelIncludes?: string) =>
    Boolean(state.quests[questId]?.objectives.some((objective) => objective.type === type && (!labelIncludes || objective.label.includes(labelIncludes)) && objective.progress >= objective.required));
  const steps: GuideStep[] = [
    { text: 'Talk to Mira at the fountain.', why: 'Starts the road kit without opening extra panels.', done: objectiveDone('prepare_for_road', 'talk') || state.player.completedQuestIds.includes('prepare_for_road') },
    { text: 'Open Skills with K.', why: 'Shows what improves as you play.', skillId: 'Lumberjacking', done: objectiveDone('prepare_for_road', 'open_panel', 'Skills') || state.ui.panels.skills },
    { text: 'Press 7, then use your axe on a tree.', why: 'Tools gather materials and train skills.', skillId: 'Lumberjacking', done: objectiveDone('prepare_for_road', 'gather') || (state.player.skills.Lumberjacking?.realValue ?? 0) > 20 },
    { text: 'Open Inventory with I and check your kit.', why: 'Potions, bandages, tools, and reagents are already packed.', done: state.ui.panels.inventory },
    { text: 'Bank one spare resource with Eldon.', why: 'Banking protects materials and finishes the first town loop.', done: objectiveDone('prepare_for_road', 'bank') || getItemCount(state.player.bank, 'logs') > 0 || getItemCount(state.player.bank, 'iron_ore') > 0 },
    { text: 'Open Spellbook with M and cast a simple spell.', why: 'Magic teaches targeting, mana, and reagent costs.', skillId: 'Magery', done: objectiveDone('mages_errand', 'cast', 'Magic Arrow') || state.spellCasting?.spellId === 'magic_arrow' },
    { text: 'Use a bandage with 6.', why: 'Bandages are slow but teach survival before the road.', skillId: 'Healing', done: objectiveDone('patch_yourself_up', 'bandage') || Boolean(state.bandage) || getItemCount(state.player.inventory, 'bandage') < 8 },
    { text: 'Talk to Gate Warden Alric for the road hook.', why: 'The road introduces real danger with time to prepare.', done: objectiveDone('trouble_on_road', 'enter_area') || state.world.discoveredAreas.includes('road') },
    { text: 'Use Detect Magic before opening strange chests.', why: 'Dungeon secrets reward caution, not blind clicking.', skillId: 'Detect Hidden', done: objectiveDone('bones_beneath', 'open_container') },
    { text: 'Place one useful object on your plot.', why: 'Housing becomes a long-term materials sink.', skillId: 'Carpentry', done: objectiveDone('place_to_call_yours', 'build') || state.world.placedBuildings.length > 0 }
  ];
  const next = steps.findIndex((step) => !step.done);
  const focus = steps[next] ?? steps[steps.length - 1];
  const visible = steps.map((step, index) => ({ step, index })).filter(({ step, index }) => step.done || index === next || index === next + 1).slice(-5);
  const skill = focus.skillId ? state.player.skills[focus.skillId] : null;
  const skillPct = skill ? Math.max(2, Math.min(100, ((skill.gainProgress ?? skill.xp) / skillXpThreshold(skill.realValue ?? skill.value)) * 100)) : 0;
  return `<section class="panel guide-panel">
    <header><span>Next Step</span><button data-action="toggle-panel" data-panel="guide">x</button></header>
    <div class="guide-focus">
      <b>${focus.text}</b>
      <span>${focus.why}</span>
      ${skill ? `<div class="guide-skill"><small>Next ${focus.skillId} gain</small><i><b style="width:${skillPct}%"></b></i><em>${Math.round(skillPct)}%</em></div>` : ''}
    </div>
    <div class="guide-list">
      ${visible
        .map(({ step, index }) => `<div class="guide-step ${step.done ? 'done' : index === next ? 'active' : ''}"><i>${step.done ? 'OK' : index === next ? '>' : '-'}</i><span>${step.text}</span></div>`)
        .join('')}
    </div>
    <button class="journal-open" data-action="toggle-panel" data-panel="journal">Journal</button>
  </section>`;
}

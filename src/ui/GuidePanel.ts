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
  const questDone = (questId: string) => state.player.completedQuestIds.includes(questId);
  const anyHotbar = (kind: string, id: string) => state.ui.hotbar.some((binding) => binding?.kind === kind && binding.id === id);
  const steps: GuideStep[] = [
    { text: 'Talk to Mira at the fountain.', why: 'Starts the road kit without opening extra panels.', done: objectiveDone('prepare_for_road', 'talk') || questDone('prepare_for_road') },
    { text: 'Open Skills with K.', why: 'Shows what improves as you play.', skillId: 'Lumberjacking', done: objectiveDone('prepare_for_road', 'open_panel', 'Skills') || state.ui.panels.skills },
    { text: 'Open Inventory with I and check your kit.', why: 'You have an axe, pickaxe, bandages, and a beginner spellbook.', done: state.ui.panels.inventory || questDone('prepare_for_road') },
    { text: 'Press 7, then use your axe on a tree.', why: 'Tools gather materials and train skills.', skillId: 'Lumberjacking', done: objectiveDone('prepare_for_road', 'gather') || (state.player.skills.Lumberjacking?.realValue ?? 0) > 20 },
    { text: 'Use a pickaxe on a mine rock.', why: 'Mining feeds Broms forge and adds a second tool skill.', skillId: 'Mining', done: objectiveDone('ore_for_brom', 'gather') || (state.dev.telemetry.resourceYields.iron_ore ?? 0) > 0 || (state.player.skills.Mining?.realValue ?? 0) > 25 },
    { text: 'Bank one spare resource with Eldon.', why: 'Banking protects materials and finishes the first town loop.', done: objectiveDone('prepare_for_road', 'bank') || getItemCount(state.player.bank, 'logs') > 0 || getItemCount(state.player.bank, 'iron_ore') > 0 },
    { text: 'Talk to Mira again to close the road kit.', why: 'Completing the first loop opens profession and survival leads.', done: questDone('prepare_for_road') },
    { text: 'Mine a forest rock face for Brom.', why: 'Mining shows that skills improve by doing, not by picking a class.', skillId: 'Mining', done: objectiveDone('ore_for_brom', 'gather') || (state.player.skills.Mining?.realValue ?? 0) > 20 },
    { text: 'Visit Broms Smithy and smelt iron.', why: 'The forge turns raw ore into repair and crafting materials.', skillId: 'Blacksmithing', done: objectiveDone('ore_for_brom', 'craft', 'Smelt') || getItemCount(state.player.inventory, 'iron_bar') > 0 },
    { text: 'Open Spellbook with M and cast Magic Arrow.', why: 'Magic teaches targeting, mana, and reagent costs.', skillId: 'Magery', done: objectiveDone('mages_errand', 'cast', 'Magic Arrow') || state.spellCasting?.spellId === 'magic_arrow' },
    { text: 'Cast Heal or Night Sight, then meditate.', why: 'Utility magic matters before the road gets dark.', skillId: 'Meditation', done: objectiveDone('mages_errand', 'meditate') || objectiveDone('mages_errand', 'cast', 'Night Sight') },
    { text: 'Use a bandage with 6.', why: 'Bandages are slow but teach survival before the road.', skillId: 'Healing', done: objectiveDone('patch_yourself_up', 'bandage') || Boolean(state.bandage) || getItemCount(state.player.inventory, 'bandage') < 6 },
    { text: 'Drag Magic Arrow or your pickaxe to the hotbar.', why: 'The road expects quick access to tools, spells, and healing.', done: anyHotbar('spell', 'magic_arrow') && (anyHotbar('tool', 'pickaxe') || anyHotbar('tool', 'axe')) },
    { text: 'Walk through the town gate to Old River Road.', why: 'The first combat route is physical, not a debug teleport.', done: objectiveDone('trouble_on_road', 'enter_area') || state.world.discoveredAreas.includes('road') },
    { text: 'Defeat a bandit and pick up the loot.', why: 'Combat teaches target selection, stamina, telegraphs, and recovery.', skillId: 'Swordsmanship', done: objectiveDone('trouble_on_road', 'loot') || questDone('trouble_on_road') },
    { text: 'Follow the Greymont trail to the old mine.', why: 'The forest connects professions, rumors, and the crypt entrance.', skillId: 'Tracking', done: state.world.discoveredAreas.includes('forest') && (state.world.discoveredAreas.includes('crypt') || objectiveDone('bones_beneath', 'enter_area')) },
    { text: 'Use Detect Magic before opening strange chests.', why: 'Dungeon secrets reward caution, not blind clicking.', skillId: 'Detect Hidden', done: objectiveDone('bones_beneath', 'open_container') || questDone('bones_beneath') },
    { text: 'Return, sell or fulfill one work order.', why: 'The economy gives gathered loot a reason to exist.', skillId: 'Cooking', done: state.world.economy.transactionLog.some((entry) => entry.kind === 'market' || entry.kind === 'work_order') },
    { text: 'Place one useful object on your plot.', why: 'Housing becomes a long-term materials sink and persistence check.', skillId: 'Carpentry', done: objectiveDone('place_to_call_yours', 'build') || state.world.placedBuildings.length > 0 }
  ];
  const next = steps.findIndex((step) => !step.done);
  const focus = steps[next] ?? steps[steps.length - 1];
  const visible = steps.map((step, index) => ({ step, index })).filter(({ step, index }) => step.done || index === next || index === next + 1).slice(-2);
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

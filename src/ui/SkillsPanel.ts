import type { GameState, SkillGainMode } from '../game/types';
import { skillGroups, skillsForGroup } from '../data/skillDefinitions';
import { renderIcon } from '../render/IconRenderer';
import { skillXpThreshold, usedSkillTotal } from '../systems/SkillSystem';

function attr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

const modeLabel: Record<SkillGainMode, string> = {
  raise: '↑',
  lower: '↓',
  lock: '•'
};

const nextMode: Record<SkillGainMode, SkillGainMode> = {
  raise: 'lock',
  lock: 'lower',
  lower: 'raise'
};

const trainableSkills = new Set([
  'Musicianship',
  'Peacemaking',
  'Provocation',
  'Discordance',
  'Swordsmanship',
  'Fencing',
  'Mace Fighting',
  'Archery',
  'Wrestling',
  'Tactics',
  'Anatomy',
  'Parrying',
  'Healing',
  'Focus',
  'Alchemy',
  'Blacksmithing',
  'Carpentry',
  'Bowcraft/Fletching',
  'Tailoring',
  'Tinkering',
  'Inscription',
  'Cooking',
  'Cartography',
  'Arms Lore',
  'Item Identification',
  'Magery',
  'Evaluating Intelligence',
  'Meditation',
  'Resisting Spells',
  'Hiding',
  'Stealth',
  'Lockpicking',
  'Detect Hidden',
  'Remove Trap',
  'Poisoning',
  'Lumberjacking',
  'Mining',
  'Fishing'
]);

export function SkillsPanel(state: GameState): string {
  if (!state.ui.panels.skills) return '';
  const selectedGroup = state.player.selectedSkillGroup ?? 'Combat';
  const search = state.ui.skillSearch?.toLowerCase().trim() ?? '';
  const groups = ['All', ...skillGroups];
  const total = usedSkillTotal(state);
  const relevant = relevantSkills(state);
  const sourceSkills = search ? skillsForGroup('All') : skillsForGroup(selectedGroup as (typeof skillGroups)[number] | 'All');
  const visibleSkills = sourceSkills.filter((definition) => {
    if (!search) return true;
    return `${definition.displayName} ${definition.group} ${definition.description} ${definition.verbs.join(' ')}`.toLowerCase().includes(search);
  });

  return `<section class="panel skills-panel">
    <header><span>Skills</span><button data-action="toggle-panel" data-panel="skills">x</button></header>
    <div class="skill-total"><b>${total.toFixed(1)}</b><span>/ ${state.player.skillCap.toFixed(1)} total skill cap</span></div>
    <div class="skill-tabs">
      ${groups.map((group) => `<button class="${group === selectedGroup ? 'active' : ''}" data-skill-group="${attr(group)}">${group}</button>`).join('')}
    </div>
    <input class="skill-search" name="skill-search" data-action="skill-search" value="${attr(state.ui.skillSearch ?? '')}" placeholder="Search skills" />
    <div class="skills-list">
      ${
        visibleSkills
          .map((definition) => {
            const skill = state.player.skills[definition.id] ?? {
              id: definition.id,
              name: definition.displayName,
              value: 0,
              realValue: 0,
              bonusValue: 0,
              xp: 0,
              gainProgress: 0,
              cap: definition.cap,
              mode: definition.gainMode,
              lastGainAt: 0,
              lastSuccessfulUseAt: 0,
              ggsTimer: 0
            };
            const xpPct = Math.max(2, Math.min(100, ((skill.gainProgress ?? skill.xp) / skillXpThreshold(skill.realValue ?? skill.value)) * 100));
            const trainable = trainableSkills.has(definition.id);
            const isRelevant = relevant.has(definition.id);
            const tooltip = `${definition.description}\n${trainable ? `Trained by: ${definition.verbs.join(', ')}` : 'Not yet trainable in this slice.'}\nStats: ${definition.primaryStat} / ${definition.secondaryStat}\nRoles: ${definition.roles.join(', ')}`;
            return `<div class="skill-row ${isRelevant ? 'relevant' : ''}" data-hotbar-source="skill:${attr(definition.id)}" draggable="true" data-tooltip="${attr(tooltip)}" title="${attr(tooltip)}">
              ${renderIcon(definition.icon, definition.displayName)}
              <span>${definition.displayName}${isRelevant ? '<small>Relevant now</small>' : trainable ? '' : '<small>Not yet trainable</small>'}</span>
              <b>${skill.value.toFixed(1)}</b>
              <button class="skill-mode ${skill.mode}" data-skill-mode="${definition.id}" data-mode="${nextMode[skill.mode]}">${modeLabel[skill.mode]}</button>
              <div class="skillbar"><i style="width:${Math.min(100, (skill.value / skill.cap) * 100)}%"></i></div>
              <div class="skill-xp"><i style="width:${xpPct}%"></i></div>
            </div>`;
          })
          .join('') || '<p class="empty-state">No skills match.</p>'
      }
    </div>
  </section>`;
}

function relevantSkills(state: GameState): Set<string> {
  const ids = new Set<string>(['Lumberjacking', 'Healing']);
  for (const questId of state.player.activeQuestIds) {
    if (questId === 'prepare_for_road') ids.add('Lumberjacking');
    if (questId === 'ore_for_brom') {
      ids.add('Mining');
      ids.add('Blacksmithing');
    }
    if (questId === 'mages_errand') {
      ids.add('Magery');
      ids.add('Meditation');
    }
    if (questId === 'patch_yourself_up') {
      ids.add('Healing');
      ids.add('Anatomy');
    }
    if (questId === 'trouble_on_road') {
      ids.add('Swordsmanship');
      ids.add('Archery');
      ids.add('Peacemaking');
    }
    if (questId === 'bones_beneath') {
      ids.add('Detect Hidden');
      ids.add('Lockpicking');
      ids.add('Magery');
    }
    if (questId === 'place_to_call_yours') ids.add('Carpentry');
  }
  if (state.ui.panels.treasureMap || state.player.inventory.slots.some((slot) => slot?.itemId === 'map_fragment' || slot?.itemId === 'rough_treasure_map')) {
    ids.add('Cartography');
    ids.add('Detect Hidden');
    ids.add('Lockpicking');
    ids.add('Remove Trap');
  }
  return ids;
}

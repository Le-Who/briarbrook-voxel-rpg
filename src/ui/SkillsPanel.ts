import type { GameState, SkillGainMode } from '../game/types';
import { itemDefs } from '../data/items';
import { masteryMilestones, milestoneProgress, professionActivityScore, professionById, professionClusters, requirementMet, describeRequirement, skillProfessionIds } from '../data/professions';
import { recipes } from '../data/recipes';
import { skillDefinitionById, skillDefinitions, skillGroups, skillsForGroup, type SkillDefinition } from '../data/skillDefinitions';
import { spellDefs } from '../data/spells';
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

const skillFilters = ['All', 'Combat', 'Magic', 'Crafting', 'Wilderness', 'Subterfuge', 'Social/Barding', 'Trainable now', 'Recently gained', 'Locked', 'Build-relevant'];

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
  const selectedGroup = state.player.selectedSkillGroup ?? 'All';
  const search = state.ui.skillSearch?.toLowerCase().trim() ?? '';
  const total = usedSkillTotal(state);
  const view = state.ui.skillView ?? 'ledger';

  return `<section class="panel skills-panel">
    <header><span>Skills</span><button data-action="toggle-panel" data-panel="skills">x</button></header>
    <div class="skill-shell-tabs">
      ${(['ledger', 'atlas', 'mastery'] as const).map((tab) => `<button class="${view === tab ? 'active' : ''}" data-skill-view="${tab}">${tab === 'ledger' ? 'Skill Ledger' : tab === 'atlas' ? 'Profession Atlas' : 'Mastery'}</button>`).join('')}
    </div>
    ${view === 'atlas' ? renderProfessionAtlas(state) : view === 'mastery' ? renderMastery(state) : renderSkillLedger(state, selectedGroup, search, total)}
  </section>`;
}

function renderSkillLedger(state: GameState, selectedFilter: string, search: string, total: number): string {
  const relevant = relevantSkills(state);
  const sourceSkills = skillsForLedgerFilter(state, selectedFilter, relevant);
  const visibleSkills = sourceSkills.filter((definition) => {
    if (!search) return true;
    return `${definition.displayName} ${definition.group} ${definition.description} ${definition.verbs.join(' ')} ${definition.roles.join(' ')}`
      .toLowerCase()
      .includes(search);
  });

  return `<div class="skill-total"><b>${total.toFixed(1)}</b><span>/ ${state.player.skillCap.toFixed(1)} total skill cap</span></div>
    <div class="skill-tabs">
      ${skillFilters.map((group) => `<button class="${group === selectedFilter ? 'active' : ''}" data-skill-group="${attr(group)}">${group}</button>`).join('')}
    </div>
    <input class="skill-search" name="skill-search" data-action="skill-search" value="${attr(state.ui.skillSearch ?? '')}" placeholder="Search skills, roles, tools" />
    <div class="ledger-head">
      <span>Skill</span><span>Value</span><span>Mode</span><span>Progress</span><span>Status</span>
    </div>
    <div class="skills-list ledger-list">
      ${visibleSkills.map((definition) => renderSkillRow(state, definition, relevant)).join('') || '<p class="empty-state">No skills match.</p>'}
    </div>`;
}

function renderSkillRow(state: GameState, definition: SkillDefinition, relevant: Set<string>): string {
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
  const capPct = Math.min(100, (skill.value / skill.cap) * 100);
  const trainable = trainableSkills.has(definition.id);
  const isRelevant = relevant.has(definition.id);
  const recent = skill.lastGainAt > 0 && state.clock - skill.lastGainAt < 120;
  const effective = skill.bonusValue ? `${skill.realValue.toFixed(1)} -> ${skill.value.toFixed(1)}` : skill.value.toFixed(1);
  const thresholds = masteryMilestones
    .filter((milestone) => milestone.requirements.some((requirement) => requirement.type === 'skill' && requirement.skillId === definition.id))
    .map((milestone) => milestone.title)
    .slice(0, 3);
  const professions = skillProfessionIds(definition.id)
    .map((id) => professionById(id)?.title ?? id)
    .join(', ');
  const tooltip = [
    definition.description,
    `Trained by: ${definition.verbs.join(', ') || 'future interaction'}`,
    `Used by: ${professions || definition.group}`,
    `Supports: ${supportSummary(definition)}`,
    `Stats: ${definition.primaryStat} / ${definition.secondaryStat}`,
    `Thresholds: ${thresholds.length ? thresholds.join(', ') : 'No current milestone threshold'}`,
    `Roles: ${definition.roles.join(', ')}`,
    trainable ? 'Trainability: implemented in this build.' : 'Trainability: future or support-only in this build.'
  ].join('\n');
  const status = recent ? 'Recent gain' : isRelevant ? 'Build-relevant' : trainable ? 'Trainable now' : definition.roles.includes('support') ? 'Support/future' : 'Future';
  return `<div class="skill-row ledger-row ${isRelevant ? 'relevant' : ''} ${recent ? 'recent' : ''}" data-hotbar-source="skill:${attr(definition.id)}" data-drag-kind="skill" data-source-window-id="skills" data-skill-id="${attr(definition.id)}" data-display-name="${attr(definition.displayName)}" data-tooltip="${attr(tooltip)}" title="${attr(tooltip)}">
    ${renderIcon(definition.icon, definition.displayName)}
    <span class="skill-name">${definition.displayName}<small>${definition.group} · ${definition.roles.join(', ')}</small></span>
    <b class="skill-value">${effective}</b>
    <button class="skill-mode ${skill.mode}" data-skill-mode="${definition.id}" data-mode="${nextMode[skill.mode]}" title="Cycle Raise, Lock, Lower">${modeLabel[skill.mode]}</button>
    <div class="skill-progress-stack">
      <div class="skillbar"><i style="width:${capPct}%"></i></div>
      <div class="skill-xp"><i style="width:${xpPct}%"></i></div>
    </div>
    <em>${status}</em>
  </div>`;
}

function renderProfessionAtlas(state: GameState): string {
  const selected = professionById(state.ui.professionFilter) ?? [...professionClusters].sort((a, b) => professionActivityScore(state, b) - professionActivityScore(state, a))[0];
  const zoom = state.ui.professionAtlasZoom ?? 1;
  const activeSkills = relevantSkills(state);
  const activeNodeIds = new Set<string>();
  selected.nodes.forEach((node) => {
    if (node.type === 'skill' && node.ref && (activeSkills.has(node.ref) || recentlyUsedSkill(state, node.ref))) activeNodeIds.add(node.id);
    if (node.type === 'spell' && node.ref && state.player.spellbook.knownSpellIds.includes(node.ref)) activeNodeIds.add(node.id);
    if (node.type === 'tool' && node.ref && hasItem(state, node.ref)) activeNodeIds.add(node.id);
    if (node.type === 'milestone' && node.ref) {
      const milestone = masteryMilestones.find((entry) => entry.id === node.ref);
      if (milestone && milestoneProgress(state, milestone).complete) activeNodeIds.add(node.id);
    }
  });
  return `<div class="atlas-layout">
    <div class="profession-filters">
      ${professionClusters
        .map((profession) => {
          const score = professionActivityScore(state, profession);
          return `<button class="${profession.id === selected.id ? 'active' : ''}" style="--profession:${profession.color}" data-profession-filter="${profession.id}"><b>${profession.title}</b><small>${score ? `${score} active` : profession.summary}</small></button>`;
        })
        .join('')}
    </div>
    <div class="atlas-main">
      <div class="atlas-toolbar">
        <div><b>${selected.title}</b><span>${selected.summary}</span></div>
        <button data-atlas-zoom="-0.1">-</button>
        <button data-atlas-zoom="reset">Reset</button>
        <button data-atlas-zoom="0.1">+</button>
        <button data-pin-profession-goal="${selected.id}">Pin Goal</button>
      </div>
      <div class="atlas-stage-wrap">
        <div class="atlas-stage" style="--profession:${selected.color}; --atlas-zoom:${zoom}">
          <svg class="atlas-edges" viewBox="0 0 100 100" aria-hidden="true">
            ${selected.edges
              .map((edge) => {
                const from = selected.nodes.find((node) => node.id === edge.from);
                const to = selected.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return '';
                const hot = activeNodeIds.has(edge.from) || activeNodeIds.has(edge.to);
                return `<line class="${hot ? 'hot' : ''}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"><title>${edge.label}</title></line>`;
              })
              .join('')}
          </svg>
          ${selected.nodes.map((node) => renderAtlasNode(node, activeNodeIds.has(node.id), selected.color)).join('')}
        </div>
      </div>
      <div class="atlas-detail">
        <b>${selected.suggestedGoal}</b>
        <span>Edges show trains, requires, supports, unlocks, improves, consumes, and produces relationships. Scroll to pan the constellation; use zoom for dense clusters.</span>
      </div>
    </div>
  </div>`;
}

function renderAtlasNode(node: { id: string; type: string; label: string; ref?: string; description: string; x: number; y: number }, active: boolean, color: string): string {
  const dataset =
    node.type === 'skill'
      ? `data-atlas-skill="${attr(node.ref ?? node.label)}"`
      : node.type === 'spell'
        ? `data-atlas-spell="${attr(node.ref ?? '')}"`
        : node.type === 'recipe'
          ? `data-atlas-recipe="${attr(node.ref ?? '')}"`
          : node.type === 'action'
            ? `data-atlas-action="${attr(node.label)}" data-description="${attr(node.description)}"`
            : node.type === 'goal' || node.type === 'milestone'
              ? `data-atlas-action="${attr(node.label)}" data-description="${attr(node.description)}"`
              : `data-atlas-action="${attr(node.label)}" data-description="${attr(node.description)}"`;
  return `<button class="atlas-node ${node.type} ${active ? 'active' : ''}" style="--x:${node.x}; --y:${node.y}; --profession:${color}" ${dataset} title="${attr(node.description)}"><i>${node.type}</i><b>${node.label}</b></button>`;
}

function renderMastery(state: GameState): string {
  const visible = masteryMilestones.filter((milestone) => milestoneProgress(state, milestone).visible);
  return `<div class="mastery-layout">
    <div class="mastery-summary">
      <b>${visible.filter((milestone) => milestoneProgress(state, milestone).complete).length}/${masteryMilestones.length}</b>
      <span>Mastery milestones are earned from use-based skills, quests, discoveries, tools, and profession achievements. No level-point spending.</span>
    </div>
    <div class="mastery-list">
      ${visible
        .map((milestone) => {
          const progress = milestoneProgress(state, milestone);
          const profession = professionById(milestone.professionId);
          const pct = Math.round((progress.met / Math.max(1, progress.total)) * 100);
          return `<article class="mastery-card ${progress.complete ? 'complete' : ''}" style="--profession:${profession?.color ?? '#bca66a'}">
            <header><span>${profession?.title ?? milestone.professionId}</span><b>${milestone.title}</b></header>
            <p>${milestone.description}</p>
            <div class="mastery-progress"><i style="width:${pct}%"></i><span>${progress.met}/${progress.total}</span></div>
            <div class="mastery-reqs">
              ${milestone.requirements.map((requirement) => `<span class="${requirementMet(state, requirement) ? 'done' : ''}">${describeRequirement(requirement)}</span>`).join('')}
            </div>
            <small>${milestone.rewardType}: ${milestone.reward}</small>
          </article>`;
        })
        .join('')}
    </div>
  </div>`;
}

function skillsForLedgerFilter(state: GameState, selectedFilter: string, relevant: Set<string>): SkillDefinition[] {
  const normalized = selectedFilter || 'All';
  if (normalized === 'All') return skillDefinitions;
  if (skillGroups.includes(normalized as (typeof skillGroups)[number])) return skillsForGroup(normalized as (typeof skillGroups)[number]);
  if (normalized === 'Subterfuge') return skillDefinitions.filter((definition) => definition.group === 'Thieving / Subterfuge');
  if (normalized === 'Social/Barding') return skillDefinitions.filter((definition) => definition.group === 'Barding' || definition.roles.includes('social'));
  if (normalized === 'Trainable now') return skillDefinitions.filter((definition) => trainableSkills.has(definition.id));
  if (normalized === 'Recently gained') return skillDefinitions.filter((definition) => recentlyUsedSkill(state, definition.id));
  if (normalized === 'Locked') return skillDefinitions.filter((definition) => state.player.skills[definition.id]?.mode === 'lock');
  if (normalized === 'Build-relevant') return skillDefinitions.filter((definition) => relevant.has(definition.id));
  return skillDefinitions;
}

function supportSummary(definition: SkillDefinition): string {
  const supports = professionClusters
    .filter((profession) => profession.skills.includes(definition.id))
    .map((profession) => profession.title);
  return supports.length ? supports.join(', ') : definition.roles.includes('support') ? 'Related actions and profession milestones' : 'Direct actions';
}

function recentlyUsedSkill(state: GameState, skillId: string): boolean {
  const skill = state.player.skills[skillId];
  return Boolean(skill && ((skill.lastGainAt > 0 && state.clock - skill.lastGainAt < 120) || (skill.lastSuccessfulUseAt > 0 && state.clock - skill.lastSuccessfulUseAt < 180)));
}

function hasItem(state: GameState, itemId: string): boolean {
  return (
    state.player.inventory.slots.some((slot) => slot?.itemId === itemId) ||
    state.player.bank.slots.some((slot) => slot?.itemId === itemId) ||
    Object.values(state.player.equipment).some((slot) => slot?.itemId === itemId)
  );
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

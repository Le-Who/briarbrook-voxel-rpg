import type { GameState, SkillGainMode } from '../game/types';
import { itemDefs } from '../data/items';
import { masteryMilestones, milestoneProgress, professionActivityScore, professionById, professionClusters, requirementMet, describeRequirement, skillProfessionIds, type ProfessionCluster, type ProfessionEdge, type ProfessionNode } from '../data/professions';
import { recipes } from '../data/recipes';
import { skillDefinitionById, skillDefinitions, skillGroups, skillsForGroup, type SkillDefinition } from '../data/skillDefinitions';
import { spellDefs } from '../data/spells';
import { renderIcon } from '../render/IconRenderer';
import { skillXpThreshold, usedSkillTotal } from '../systems/SkillSystem';
import { buildSkillTooltip, skillIconCategory } from './IconVisualSystem';

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
const SKILL_LEDGER_WINDOW_ROWS = 72;

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
  const modeView = state.ui.skillsViewMode === 'milestones' ? 'mastery' : (state.ui.skillsViewMode ?? 'ledger');
  const view = state.ui.skillView && state.ui.skillView !== 'ledger' ? state.ui.skillView : modeView;

  return `<section class="panel skills-panel ui-contained-window" data-window-id="skills">
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

  const renderedSkills = visibleSkills.slice(0, SKILL_LEDGER_WINDOW_ROWS);

  return `<div class="skill-total"><b>${total.toFixed(1)}</b><span>/ ${state.player.skillCap.toFixed(1)} total skill cap</span></div>
    <small class="skill-ledger-note">Trainable and Not yet trainable skills are marked by status. Tooltips show Trained by and Used by details.</small>
    <div class="skill-tabs">
      ${skillFilters.map((group) => `<button class="${group === selectedFilter ? 'active' : ''}" data-skill-group="${attr(group)}">${group}</button>`).join('')}
    </div>
    <input class="skill-search" name="skill-search" data-action="skill-search" value="${attr(state.ui.skillSearch ?? '')}" placeholder="Search skills, roles, tools" />
    <div class="ledger-head">
      <span>Skill</span><span>Value</span><span>Mode</span><span>Progress</span><span>Status</span>
    </div>
    <div class="skills-list ledger-list" data-virtualized-list="skills" data-total-rows="${visibleSkills.length}" data-rendered-rows="${renderedSkills.length}">
      ${renderedSkills.map((definition) => renderSkillRow(state, definition, relevant)).join('') || '<p class="empty-state">No skills match.</p>'}
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
  const tooltip = buildSkillTooltip(definition, state, 'compact');
  const advancedTooltip = [
    buildSkillTooltip(definition, state, 'advanced'),
    `Used by: ${professions || definition.group}`,
    `Supports: ${supportSummary(definition)}`,
    `Thresholds: ${thresholds.length ? thresholds.join(', ') : 'No current milestone threshold'}`,
    trainable ? 'Trainability: implemented in this build.' : 'Trainability: future or support-only in this build.'
  ].join('\n');
  const status = recent ? 'Recent gain' : isRelevant ? 'Build-relevant' : trainable ? 'Trainable now' : definition.roles.includes('support') ? 'Support/future' : 'Future';
  const tooltipVersion = [state.ui.tooltipMode, definition.id, skill.value.toFixed(1), skill.mode, skill.lastGainAt, skill.lastSuccessfulUseAt, status].join(':');
  return `<div class="skill-row ledger-row ${isRelevant ? 'relevant' : ''} ${recent ? 'recent' : ''}" data-hotbar-source="skill:${attr(definition.id)}" data-drag-kind="skill" data-source-window-id="skills" data-skill-id="${attr(definition.id)}" data-display-name="${attr(definition.displayName)}" data-tooltip-id="skill:${attr(definition.id)}" data-tooltip-source="skills" data-tooltip-version="${attr(tooltipVersion)}" data-tooltip="${attr(tooltip)}" data-tooltip-advanced="${attr(advancedTooltip)}" title="${attr(tooltip)}">
    ${renderIcon(definition.icon, definition.displayName, skillIconCategory(definition))}
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
  const selectedProfessionId = state.ui.professionFilter !== 'all' ? state.ui.professionFilter : state.ui.skillProfessionFilter;
  const selected = professionById(selectedProfessionId) ?? [...professionClusters].sort((a, b) => professionActivityScore(state, b) - professionActivityScore(state, a))[0];
  const zoom = state.ui.professionAtlasZoom ?? 1;
  const search = state.ui.professionAtlasSearch?.trim().toLowerCase() ?? '';
  const activeNodeIds = atlasActiveNodeIds(state, selected);
  const searchNodeIds = new Set(selected.nodes.filter((node) => search && atlasSearchText(selected, node).includes(search)).map((node) => node.id));
  const selectedNode =
    selected.nodes.find((node) => node.id === state.ui.selectedProfessionNodeId) ??
    selected.nodes.find((node) => searchNodeIds.has(node.id)) ??
    selected.nodes.find((node) => activeNodeIds.has(node.id)) ??
    selected.nodes.find((node) => node.type === 'goal') ??
    selected.nodes[0];
  const pathNodeIds = selectedNode ? atlasPathNodeIds(selected, selectedNode.id) : new Set<string>();
  const pathEdgeIds = new Set(
    selected.edges
      .filter((edge) => selectedNode && (edge.from === selectedNode.id || edge.to === selectedNode.id))
      .map((edge) => atlasEdgeKey(edge))
  );
  const implementedCount = selected.nodes.filter((node) => atlasNodeImplemented(node)).length;
  const selectedPinned = selectedNode ? isAtlasNodePinned(state, selectedNode) : false;

  return `<div class="atlas-layout profession-atlas-redesign" data-atlas-selected="${attr(selectedNode?.id ?? '')}" style="--profession:${selected.color}">
    <aside class="atlas-lenses" aria-label="Profession lenses">
      <div class="atlas-info-banner"><b>Relationship Map</b><span>Not a passive tree: skills, tools, activities, outputs, services, milestones, and future loops.</span></div>
      <div class="profession-filters">
        ${professionClusters
          .map((profession) => {
            const score = professionActivityScore(state, profession);
            return `<button class="${profession.id === selected.id ? 'active' : ''}" style="--profession:${profession.color}" data-profession-filter="${profession.id}"><b>${profession.title}</b><small>${score ? `${score} active now` : `${profession.skills.length} linked skills`}</small></button>`;
          })
          .join('')}
      </div>
    </aside>
    <main class="atlas-main" aria-label="${attr(selected.title)} relationship graph">
      <div class="atlas-toolbar">
        <div class="atlas-title"><b>${selected.title}</b><span>${implementedCount}/${selected.nodes.length} implemented · ${selected.suggestedGoal}</span></div>
        <input class="atlas-search" name="atlas-search" data-action="atlas-search" value="${attr(state.ui.professionAtlasSearch ?? '')}" placeholder="Search node" />
        <div class="atlas-zoom-controls" aria-label="Atlas zoom">
          <button data-atlas-zoom="-0.1" aria-label="Zoom out">-</button>
          <button data-atlas-zoom="fit">Fit</button>
          <button data-atlas-zoom="reset">Reset</button>
          <button data-atlas-zoom="0.1" aria-label="Zoom in">+</button>
        </div>
        <button data-pin-profession-goal="${selected.id}" class="${state.ui.pinnedProfessionGoalId === selected.id ? 'active' : ''}">Pin Lens</button>
      </div>
      <div class="atlas-stage-wrap" data-atlas-pan="scroll" tabindex="0">
        <div class="atlas-stage" style="--profession:${selected.color}; --atlas-zoom:${zoom}">
          <svg class="atlas-edges" viewBox="0 0 100 100" aria-hidden="true">
            ${selected.edges
              .map((edge) => {
                const from = selected.nodes.find((node) => node.id === edge.from);
                const to = selected.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return '';
                const edgeKey = atlasEdgeKey(edge);
                const hot = activeNodeIds.has(edge.from) || activeNodeIds.has(edge.to);
                const path = pathEdgeIds.has(edgeKey);
                return `<line class="${hot ? 'hot' : ''} ${path ? 'path' : ''}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"><title>${attr(edge.label)}</title></line>`;
              })
              .join('')}
          </svg>
          ${selected.nodes
            .map((node) =>
              renderAtlasNode(state, node, {
                active: activeNodeIds.has(node.id),
                selected: selectedNode?.id === node.id,
                path: pathNodeIds.has(node.id),
                searchMatch: searchNodeIds.has(node.id),
                color: selected.color
              })
            )
            .join('')}
        </div>
      </div>
      ${renderAtlasLoopCards(selected, selectedNode, pathNodeIds, searchNodeIds)}
    </main>
    <aside class="atlas-node-detail" aria-live="polite">
      ${selectedNode ? renderAtlasDetail(state, selected, selectedNode, selectedPinned) : `<div class="atlas-empty-detail"><b>Select a profession lens to see its loop.</b></div>`}
    </aside>
  </div>`;
}

function renderAtlasNode(
  state: GameState,
  node: ProfessionNode,
  flags: { active: boolean; selected: boolean; path: boolean; searchMatch: boolean; color: string }
): string {
  const meta = atlasNodeMeta(node);
  const dataset = atlasNodeDataset(node);
  const pinned = isAtlasNodePinned(state, node);
  const implemented = atlasNodeImplemented(node);
  return `<button class="atlas-node atlas-kind-${meta.kind} ${node.type} ${flags.active ? 'active' : ''} ${flags.selected ? 'selected' : ''} ${flags.path ? 'path' : ''} ${flags.searchMatch ? 'search-match' : ''} ${pinned ? 'pinned' : ''} ${implemented ? '' : 'not-trainable'}" style="--x:${node.x}; --y:${node.y}; --profession:${flags.color}" data-atlas-node="${attr(node.id)}" data-node-type="${meta.kind}" ${dataset} aria-pressed="${flags.selected ? 'true' : 'false'}" title="${attr(node.description)}"><i aria-hidden="true">${meta.icon}</i><b>${node.label}</b><small>${meta.label}</small></button>`;
}

type AtlasDisplayKind = 'skill' | 'tool' | 'resource' | 'activity' | 'output' | 'service' | 'milestone' | 'future';

const atlasKindMeta: Record<AtlasDisplayKind, { label: string; icon: string }> = {
  skill: { label: 'Skill', icon: 'S' },
  tool: { label: 'Tool', icon: 'T' },
  resource: { label: 'Resource', icon: 'R' },
  activity: { label: 'Activity', icon: 'A' },
  output: { label: 'Output', icon: 'O' },
  service: { label: 'Service', icon: 'N' },
  milestone: { label: 'Milestone', icon: 'M' },
  future: { label: 'Future', icon: '?' }
};

function atlasNodeMeta(node: ProfessionNode): { kind: AtlasDisplayKind; label: string; icon: string } {
  if (!atlasNodeImplemented(node)) return { kind: 'future', label: node.type === 'skill' ? 'Future skill' : 'Future', icon: '?' };
  if (node.type === 'skill') return { kind: 'skill', ...atlasKindMeta.skill };
  if (node.type === 'tool') return { kind: 'tool', ...atlasKindMeta.tool };
  if (node.type === 'resource') return { kind: 'resource', ...atlasKindMeta.resource };
  if (node.type === 'station' || node.type === 'service') return { kind: 'service', label: 'Service / Station', icon: atlasKindMeta.service.icon };
  if (node.type === 'recipe' || node.type === 'output') return { kind: 'output', label: 'Output Item', icon: atlasKindMeta.output.icon };
  if (node.type === 'action' || node.type === 'spell') return { kind: 'activity', label: node.type === 'spell' ? 'Spell Activity' : 'Activity', icon: atlasKindMeta.activity.icon };
  return { kind: 'milestone', label: node.type === 'goal' ? 'Starter Goal' : 'Milestone', icon: atlasKindMeta.milestone.icon };
}

function atlasNodeDataset(node: ProfessionNode): string {
  if (node.type === 'skill') return `data-atlas-skill="${attr(node.ref ?? node.label)}"`;
  if (node.type === 'spell') return `data-atlas-spell="${attr(node.ref ?? '')}"`;
  if (node.type === 'recipe') return `data-atlas-recipe="${attr(node.ref ?? '')}"`;
  return `data-atlas-action="${attr(node.label)}" data-description="${attr(node.description)}"`;
}

function atlasNodeImplemented(node: ProfessionNode): boolean {
  if (node.type === 'skill') return trainableSkills.has(node.ref ?? node.label);
  if (node.type === 'tool') return Boolean(node.ref && itemDefs[node.ref]);
  if (node.type === 'spell') return Boolean(node.ref && spellDefs[node.ref]);
  if (node.type === 'recipe') return Boolean(node.ref && recipes.some((recipe) => recipe.id === node.ref));
  if (node.type === 'future') return false;
  if (node.type === 'milestone') return Boolean(node.ref && masteryMilestones.some((milestone) => milestone.id === node.ref));
  return !/future|later|not yet/i.test(node.description);
}

function atlasActiveNodeIds(state: GameState, profession: ProfessionCluster): Set<string> {
  const activeSkills = relevantSkills(state);
  const activeNodeIds = new Set<string>();
  profession.nodes.forEach((node) => {
    if (node.type === 'skill' && node.ref && (activeSkills.has(node.ref) || recentlyUsedSkill(state, node.ref))) activeNodeIds.add(node.id);
    if (node.type === 'spell' && node.ref && state.player.spellbook.knownSpellIds.includes(node.ref)) activeNodeIds.add(node.id);
    if (node.type === 'tool' && node.ref && hasItem(state, node.ref)) activeNodeIds.add(node.id);
    if (node.type === 'recipe' && node.ref === state.ui.selectedRecipeId) activeNodeIds.add(node.id);
    if (node.type === 'milestone' && node.ref) {
      const milestone = masteryMilestones.find((entry) => entry.id === node.ref);
      if (milestone && milestoneProgress(state, milestone).complete) activeNodeIds.add(node.id);
    }
  });
  return activeNodeIds;
}

function atlasSearchText(profession: ProfessionCluster, node: ProfessionNode): string {
  const connected = connectedAtlasNodes(profession, node.id).map((candidate) => candidate.label);
  return `${node.label} ${node.type} ${node.description} ${node.ref ?? ''} ${connected.join(' ')}`.toLowerCase();
}

function atlasPathNodeIds(profession: ProfessionCluster, nodeId: string): Set<string> {
  const ids = new Set<string>([nodeId]);
  profession.edges.forEach((edge) => {
    if (edge.from === nodeId) ids.add(edge.to);
    if (edge.to === nodeId) ids.add(edge.from);
  });
  return ids;
}

function atlasEdgeKey(edge: Pick<ProfessionEdge, 'from' | 'to'>): string {
  return `${edge.from}->${edge.to}`;
}

function connectedAtlasNodes(profession: ProfessionCluster, nodeId: string): ProfessionNode[] {
  const ids = atlasPathNodeIds(profession, nodeId);
  ids.delete(nodeId);
  return profession.nodes.filter((node) => ids.has(node.id));
}

function isAtlasNodePinned(state: GameState, node: ProfessionNode): boolean {
  return state.ui.pinnedProfessionGoalId === node.id || state.ui.pinnedProfessionGoalId === node.ref || state.ui.pinnedProfessionGoalId === `${node.type}:${node.ref ?? node.label}`;
}

function renderAtlasLoopCards(profession: ProfessionCluster, selectedNode: ProfessionNode | undefined, pathNodeIds: Set<string>, searchNodeIds: Set<string>): string {
  if (searchNodeIds.size === 0 && (profession.nodes.length <= 4 || !selectedNode)) {
    return `<div class="atlas-loop-list"><article><b>Select a profession lens to see its loop.</b><span>Starter goals, tools, skills, activities, and outputs will fill this space.</span></article></div>`;
  }
  const edges = selectedNode ? profession.edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id) : profession.edges;
  const cards = edges.slice(0, 4).map((edge) => {
    const from = profession.nodes.find((node) => node.id === edge.from);
    const to = profession.nodes.find((node) => node.id === edge.to);
    const highlighted = pathNodeIds.has(edge.from) && pathNodeIds.has(edge.to);
    return `<article class="${highlighted ? 'active' : ''}"><b>${attr(edge.label)}</b><span>${attr(from?.label ?? edge.from)} -> ${attr(to?.label ?? edge.to)}</span></article>`;
  });
  const searchSummary = searchNodeIds.size ? `<article class="search-result"><b>${searchNodeIds.size} search match${searchNodeIds.size === 1 ? '' : 'es'}</b><span>${profession.nodes.filter((node) => searchNodeIds.has(node.id)).map((node) => attr(node.label)).join(', ')}</span></article>` : '';
  return `<div class="atlas-loop-list">${searchSummary}${cards.join('')}</div>`;
}

function renderAtlasDetail(state: GameState, profession: ProfessionCluster, node: ProfessionNode, pinned: boolean): string {
  const meta = atlasNodeMeta(node);
  const connected = connectedAtlasNodes(profession, node.id);
  const trainedBy = atlasTrainedBy(node, profession);
  const usedBy = atlasUsedBy(node, profession);
  const requirements = atlasRequirements(node);
  const related = connected.filter((candidate) => ['tool', 'recipe', 'station', 'spell'].includes(candidate.type)).map((candidate) => candidate.label);
  const progress = atlasProgress(state, node);
  const implemented = atlasNodeImplemented(node);
  return `<div class="atlas-detail-card atlas-kind-${meta.kind}">
    <header><span>${meta.label}</span><b>${attr(node.label)}</b><small>${implemented ? 'Implemented / trainable where applicable' : 'Future / not yet trainable'}</small></header>
    <p>${attr(node.description)}</p>
    <div class="atlas-detail-grid">
      <span>Trained by</span><b>${attr(trainedBy)}</b>
      <span>Used by</span><b>${attr(usedBy)}</b>
      <span>Requirements</span><b>${attr(requirements)}</b>
      <span>Related</span><b>${attr(related.length ? related.join(', ') : 'No direct tool or service link')}</b>
      <span>Progress</span><b>${attr(progress)}</b>
    </div>
    <div class="atlas-detail-actions">
      <button class="${pinned ? 'active' : ''}" data-pin-profession-goal="${attr(node.id)}">${pinned ? 'Unpin Goal' : 'Pin Goal'}</button>
      ${node.type === 'skill' ? `<button data-atlas-skill="${attr(node.ref ?? node.label)}">Open Skill</button>` : ''}
      ${node.type === 'spell' && node.ref ? `<button data-atlas-spell="${attr(node.ref)}">Open Spell</button>` : ''}
      ${node.type === 'recipe' && node.ref ? `<button data-atlas-recipe="${attr(node.ref)}">Open Recipe</button>` : ''}
      ${node.type !== 'skill' && node.type !== 'spell' && node.type !== 'recipe' ? `<button data-atlas-action="${attr(node.label)}" data-description="${attr(node.description)}">Inspect</button>` : ''}
    </div>
  </div>`;
}

function atlasTrainedBy(node: ProfessionNode, profession: ProfessionCluster): string {
  if (node.type === 'skill') {
    const definition = skillDefinitionById[node.ref ?? node.label];
    if (definition) return definition.verbs.join(', ');
  }
  const incoming = profession.edges.filter((edge) => edge.to === node.id && edge.type === 'trains');
  return incoming.length ? incoming.map((edge) => profession.nodes.find((candidate) => candidate.id === edge.from)?.label ?? edge.label).join(', ') : 'Use related activities in the world';
}

function atlasUsedBy(node: ProfessionNode, profession: ProfessionCluster): string {
  const edges = profession.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
  return edges.length
    ? edges
        .map((edge) => {
          const other = profession.nodes.find((candidate) => candidate.id === (edge.from === node.id ? edge.to : edge.from));
          return `${other?.label ?? edge.label} (${edge.type})`;
        })
        .join(', ')
    : profession.summary;
}

function atlasRequirements(node: ProfessionNode): string {
  if (node.type === 'recipe' && node.ref) {
    const recipe = recipes.find((candidate) => candidate.id === node.ref);
    if (recipe) return `${recipe.name}: ${recipe.requirements.map((requirement) => `${itemDefs[requirement.itemId]?.name ?? requirement.itemId} x${requirement.quantity}`).join(', ')}`;
  }
  if (node.type === 'spell' && node.ref) {
    const spell = spellDefs[node.ref];
    if (spell) return spell.reagents.length ? spell.reagents.map((requirement) => `${itemDefs[requirement.itemId]?.name ?? requirement.itemId} x${requirement.quantity}`).join(', ') : `Mana ${spell.manaCost}`;
  }
  if (node.type === 'tool' && node.ref) return itemDefs[node.ref] ? `Own or equip ${itemDefs[node.ref].name}` : 'Future tool';
  if (node.type === 'milestone' && node.ref) {
    const milestone = masteryMilestones.find((entry) => entry.id === node.ref);
    if (milestone) return milestone.requirements.map(describeRequirement).join(', ');
  }
  return 'No class lock; follow the connected world action';
}

function atlasProgress(state: GameState, node: ProfessionNode): string {
  if (node.type === 'skill') {
    const skill = state.player.skills[node.ref ?? node.label];
    const value = skill?.value ?? skillDefinitionById[node.ref ?? node.label]?.startingValue ?? 0;
    return `${value.toFixed(1)} skill · ${atlasNodeImplemented(node) ? 'trainable' : 'future'}`;
  }
  if (node.type === 'tool' && node.ref) return itemCount(state, node.ref) > 0 ? `${itemCount(state, node.ref)} owned` : 'Not in pack or bank';
  if (node.type === 'spell' && node.ref) return state.player.spellbook.knownSpellIds.includes(node.ref) ? 'Known spell' : 'Not learned';
  if (node.type === 'recipe' && node.ref) return state.ui.selectedRecipeId === node.ref ? 'Selected in crafting' : 'Recipe visible when crafting is open';
  if (node.type === 'milestone' && node.ref) {
    const milestone = masteryMilestones.find((entry) => entry.id === node.ref);
    if (milestone) {
      const progress = milestoneProgress(state, milestone);
      return `${progress.met}/${progress.total} requirements`;
    }
  }
  return atlasNodeImplemented(node) ? 'Available in this build' : 'Future loop';
}

function itemCount(state: GameState, itemId: string): number {
  const fromInventory = state.player.inventory.slots.reduce((sum, slot) => sum + (slot?.itemId === itemId ? slot.quantity : 0), 0);
  const fromBank = state.player.bank.slots.reduce((sum, slot) => sum + (slot?.itemId === itemId ? slot.quantity : 0), 0);
  const fromEquipment = Object.values(state.player.equipment).reduce((sum, slot) => sum + (slot?.itemId === itemId ? slot.quantity : 0), 0);
  return fromInventory + fromBank + fromEquipment;
}

function renderMastery(state: GameState): string {
  const visible = masteryMilestones.filter((milestone) => milestoneProgress(state, milestone).visible);
  return `<div class="mastery-layout">
    <div class="mastery-summary">
      <h3>Mastery Milestones</h3>
      <b>${visible.filter((milestone) => milestoneProgress(state, milestone).complete).length}/${masteryMilestones.length}</b>
      <span>Practice, no point spending. Mastery milestones are earned from use-based skills, quests, discoveries, tools, and profession achievements. No level-point spending.</span>
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

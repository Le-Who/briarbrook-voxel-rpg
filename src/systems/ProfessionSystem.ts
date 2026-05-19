import { skillDefinitionById, skillDefinitions, skillGroups, skillsForGroup, type SkillDefinition, type SkillGroup } from '../data/skillDefinitions';
import { professionClusters as relationshipProfessionClusters } from '../data/professions';
import type { GameState, SkillGainMode, SkillId } from '../game/types';

export type SkillsViewMode = 'ledger' | 'atlas' | 'milestones';
export type SkillTrainableFilter = 'all' | 'trainable' | 'not_trainable';
export type SkillRecentFilter = 'all' | 'recent';
export type ProfessionLensId =
  | 'all'
  | 'ranger'
  | 'hedge_mage'
  | 'treasure_hunter'
  | 'field_medic'
  | 'town_smith'
  | 'builder'
  | 'bard'
  | 'rogue'
  | 'provisioner'
  | 'battle_miner';

export interface SkillLedgerFilters {
  group: SkillGroup | 'All';
  trainable: SkillTrainableFilter;
  recent: SkillRecentFilter;
  profession: ProfessionLensId;
  search: string;
}

export interface SkillLedgerRow {
  id: SkillId;
  name: string;
  value: number;
  effectiveValue: number;
  gainMode: SkillGainMode;
  group: SkillGroup;
  recent: boolean;
  trainable: boolean;
  trainedBy: string;
  usedBy: string;
  description: string;
  definition: SkillDefinition;
}

export interface ProfessionLens {
  id: Exclude<ProfessionLensId, 'all'>;
  name: string;
  skills: SkillId[];
  starterGoals: string[];
  loops: string[];
}

export type AtlasNodeKind = 'skill' | 'resource' | 'output' | 'activity' | 'service' | 'milestone' | 'profession';

export interface ProfessionAtlasNode {
  id: string;
  kind: AtlasNodeKind;
  label: string;
  detail: string;
  x: number;
  y: number;
  implemented: boolean;
  highlighted: boolean;
  pinned: boolean;
  professions: Array<Exclude<ProfessionLensId, 'all'>>;
}

export interface ProfessionAtlasLink {
  from: string;
  to: string;
  highlighted: boolean;
}

export interface ProfessionAtlas {
  lens: ProfessionLens | null;
  classlessNote: string;
  nodes: ProfessionAtlasNode[];
  links: ProfessionAtlasLink[];
}

export interface MasteryRequirement {
  label: string;
  current: number;
  required: number;
  done: boolean;
}

export interface MasteryMilestone {
  id: string;
  title: string;
  professionId: Exclude<ProfessionLensId, 'all'>;
  reward: string;
  earned: boolean;
  progress: number;
  requirements: MasteryRequirement[];
}

export const TRAINABLE_SKILLS = new Set<SkillId>([
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

export const professionLenses: ProfessionLens[] = [
  {
    id: 'ranger',
    name: 'Ranger',
    skills: ['Archery', 'Tracking', 'Camping', 'Lumberjacking', 'Animal Lore', 'Animal Taming'],
    starterGoals: ['Fletch arrows from boards.', 'Track road danger before engaging.', 'Keep one camp kit ready.'],
    loops: ['Archery -> Arrows -> Road Safety', 'Tracking -> Rumors -> Wilderness Routes']
  },
  {
    id: 'hedge_mage',
    name: 'Hedge Mage',
    skills: ['Magery', 'Meditation', 'Evaluating Intelligence', 'Inscription', 'Alchemy'],
    starterGoals: ['Cast two first-circle spells.', 'Recover mana with Meditation.', 'Keep reagents stocked.'],
    loops: ['Magery -> Reagents -> Spellcasting', 'Meditation -> Mana -> Longer Routes']
  },
  {
    id: 'treasure_hunter',
    name: 'Treasure Hunter',
    skills: ['Cartography', 'Detect Hidden', 'Lockpicking', 'Remove Trap', 'Mining', 'Item Identification'],
    starterGoals: ['Combine map fragments.', 'Reveal a hidden container.', 'Open a locked cache safely.'],
    loops: ['Cartography -> Treasure Map -> Detect Hidden', 'Lockpicking -> Remove Trap -> Rare Loot']
  },
  {
    id: 'field_medic',
    name: 'Field Medic',
    skills: ['Healing', 'Anatomy', 'Alchemy', 'Cooking', 'Focus'],
    starterGoals: ['Use a bandage under pressure.', 'Carry health potions.', 'Sell spare bandages to orders.'],
    loops: ['Healing -> Bandages -> Combat Recovery', 'Alchemy -> Potions -> Road Safety']
  },
  {
    id: 'town_smith',
    name: 'Town Smith',
    skills: ['Mining', 'Blacksmithing', 'Arms Lore', 'Item Identification', 'Tinkering'],
    starterGoals: ['Mine ore.', 'Smelt bars.', 'Repair a damaged equipped item.'],
    loops: ['Mining -> Ore -> Bars -> Blacksmithing', 'Arms Lore -> Repair -> Work Orders']
  },
  {
    id: 'builder',
    name: 'Builder',
    skills: ['Lumberjacking', 'Carpentry', 'Mining', 'Tinkering', 'Tailoring'],
    starterGoals: ['Make boards from logs.', 'Visit the housing plot.', 'Place a floor or torch.'],
    loops: ['Lumberjacking -> Boards -> Carpentry', 'Stone -> Building Pieces -> Housing']
  },
  {
    id: 'bard',
    name: 'Bard',
    skills: ['Musicianship', 'Peacemaking', 'Provocation', 'Discordance', 'Begging'],
    starterGoals: ['Carry an instrument.', 'Calm one foe.', 'Use bard control before melee.'],
    loops: ['Musicianship -> Bard Songs -> Safer Fights']
  },
  {
    id: 'rogue',
    name: 'Rogue',
    skills: ['Hiding', 'Stealth', 'Snooping', 'Stealing', 'Lockpicking', 'Remove Trap', 'Poisoning'],
    starterGoals: ['Hide near cover.', 'Reveal a trap before touching it.', 'Open a lock without brute force.'],
    loops: ['Hiding -> Stealth -> Safer Positioning', 'Lockpicking -> Trap Work -> Loot']
  },
  {
    id: 'provisioner',
    name: 'Provisioner',
    skills: ['Cooking', 'Fishing', 'Alchemy', 'Tailoring', 'Camping'],
    starterGoals: ['Cook travel food.', 'Keep potions stocked.', 'Deliver healing supplies.'],
    loops: ['Fishing -> Cooking -> Food Orders', 'Cloth -> Bandages -> Field Supply']
  },
  {
    id: 'battle_miner',
    name: 'Battle Miner',
    skills: ['Mining', 'Mace Fighting', 'Tactics', 'Parrying', 'Blacksmithing'],
    starterGoals: ['Mine ore before the road.', 'Fight with heavy gear.', 'Repair between routes.'],
    loops: ['Mining -> Metal -> Heavy Gear', 'Tactics -> Road Combat -> Repair Demand']
  }
];

const atlasNodeDefinitions: Array<Omit<ProfessionAtlasNode, 'highlighted' | 'pinned'>> = [
  node('profession:builder', 'profession', 'Builder', 'A lens for housing, boards, and build orders.', 70, 70, true, ['builder']),
  node('skill:Lumberjacking', 'skill', 'Lumberjacking', 'Harvest logs from trees.', 240, 70, true, ['builder', 'ranger']),
  node('resource:logs', 'resource', 'Logs', 'Raw wood from trees.', 410, 70, true, ['builder', 'ranger']),
  node('output:boards', 'output', 'Boards', 'Refined building material.', 570, 70, true, ['builder']),
  node('skill:Carpentry', 'skill', 'Carpentry', 'Crafts furniture and housing pieces.', 740, 70, true, ['builder']),
  node('activity:housing', 'activity', 'Housing', 'Persistent plot, storage, and upgrades.', 910, 70, true, ['builder']),
  node('service:work_orders', 'service', 'Work Orders', 'Town demand for useful goods.', 1080, 70, true, ['builder', 'town_smith', 'field_medic', 'provisioner']),

  node('profession:treasure_hunter', 'profession', 'Treasure Hunter', 'A lens for maps, secrets, and locked loot.', 70, 230, true, ['treasure_hunter']),
  node('skill:Cartography', 'skill', 'Cartography', 'Reads map clues and cache regions.', 250, 230, true, ['treasure_hunter']),
  node('item:treasure_map', 'output', 'Treasure Map', 'Map fragments become routes.', 420, 230, true, ['treasure_hunter']),
  node('skill:Detect Hidden', 'skill', 'Detect Hidden', 'Reveals hidden seams and traps.', 590, 230, true, ['treasure_hunter', 'rogue']),
  node('skill:Lockpicking', 'skill', 'Lockpicking', 'Opens chests and doors.', 760, 230, true, ['treasure_hunter', 'rogue']),
  node('skill:Remove Trap', 'skill', 'Remove Trap', 'Disarms revealed traps.', 930, 230, true, ['treasure_hunter', 'rogue']),
  node('activity:treasure_chest', 'activity', 'Treasure Chest', 'Locked or warded object with reward risk.', 1100, 230, true, ['treasure_hunter', 'rogue']),
  node('output:rare_loot', 'output', 'Rare Loot', 'Gems, maps, lore, and equipment.', 1270, 230, true, ['treasure_hunter']),

  node('profession:town_smith', 'profession', 'Town Smith', 'A lens for ore, bars, repair, and metal orders.', 70, 390, true, ['town_smith', 'battle_miner']),
  node('skill:Mining', 'skill', 'Mining', 'Extract ore and stone.', 250, 390, true, ['town_smith', 'battle_miner', 'builder']),
  node('resource:ore', 'resource', 'Ore', 'Raw metal from veins.', 420, 390, true, ['town_smith', 'battle_miner']),
  node('output:iron_bars', 'output', 'Iron Bars', 'Smelted metal for tools and armor.', 590, 390, true, ['town_smith', 'battle_miner']),
  node('skill:Blacksmithing', 'skill', 'Blacksmithing', 'Forge and repair metal gear.', 760, 390, true, ['town_smith', 'battle_miner']),
  node('service:repair', 'service', 'Repair', 'Consumes materials and improves work previews.', 930, 390, true, ['town_smith', 'battle_miner']),
  node('milestone:town_smith', 'milestone', 'Town Smith', 'Milestone earned through mining and repair.', 1100, 390, true, ['town_smith']),

  node('profession:field_medic', 'profession', 'Field Medic', 'A lens for bandages, anatomy, and survival supply.', 70, 550, true, ['field_medic']),
  node('skill:Healing', 'skill', 'Healing', 'Bandage recovery and triage.', 250, 550, true, ['field_medic']),
  node('skill:Anatomy', 'skill', 'Anatomy', 'Improves bandage and weapon reads.', 420, 550, true, ['field_medic']),
  node('activity:bandage', 'activity', 'Bandage', 'Slow recovery that can slip under pressure.', 590, 550, true, ['field_medic']),
  node('milestone:field_medic', 'milestone', 'Field Medic', 'Milestone from combat bandage practice.', 760, 550, true, ['field_medic']),

  node('profession:hedge_mage', 'profession', 'Hedge Mage', 'A lens for spellcasting, mana, and reagents.', 70, 710, true, ['hedge_mage']),
  node('skill:Magery', 'skill', 'Magery', 'Core spellcasting strength.', 250, 710, true, ['hedge_mage']),
  node('skill:Meditation', 'skill', 'Meditation', 'Mana recovery and sustained routes.', 420, 710, true, ['hedge_mage']),
  node('resource:reagents', 'resource', 'Reagents', 'Consumable spell materials.', 590, 710, true, ['hedge_mage']),
  node('activity:spellcasting', 'activity', 'Spellcasting', 'Damage, utility, healing, and control.', 760, 710, true, ['hedge_mage']),
  node('milestone:hedge_mage', 'milestone', 'Hedge Mage', 'Milestone from practiced magic and known spells.', 930, 710, true, ['hedge_mage']),

  node('profession:ranger', 'profession', 'Ranger', 'A lens for wilderness travel and ranged safety.', 70, 870, true, ['ranger']),
  node('skill:Archery', 'skill', 'Archery', 'Bow accuracy and ranged pressure.', 250, 870, true, ['ranger']),
  node('skill:Tracking', 'skill', 'Tracking', 'Reads trails and monster signs.', 420, 870, false, ['ranger']),
  node('skill:Animal Taming', 'skill', 'Animal Taming', 'Future companion loop.', 590, 870, false, ['ranger'])
];

const atlasLinkDefinitions = [
  link('profession:builder', 'skill:Lumberjacking'),
  link('skill:Lumberjacking', 'resource:logs'),
  link('resource:logs', 'output:boards'),
  link('output:boards', 'skill:Carpentry'),
  link('skill:Carpentry', 'activity:housing'),
  link('activity:housing', 'service:work_orders'),
  link('profession:treasure_hunter', 'skill:Cartography'),
  link('skill:Cartography', 'item:treasure_map'),
  link('item:treasure_map', 'skill:Detect Hidden'),
  link('skill:Detect Hidden', 'skill:Lockpicking'),
  link('skill:Lockpicking', 'skill:Remove Trap'),
  link('skill:Remove Trap', 'activity:treasure_chest'),
  link('activity:treasure_chest', 'output:rare_loot'),
  link('profession:town_smith', 'skill:Mining'),
  link('skill:Mining', 'resource:ore'),
  link('resource:ore', 'output:iron_bars'),
  link('output:iron_bars', 'skill:Blacksmithing'),
  link('skill:Blacksmithing', 'service:repair'),
  link('service:repair', 'milestone:town_smith'),
  link('profession:field_medic', 'skill:Healing'),
  link('skill:Healing', 'skill:Anatomy'),
  link('skill:Anatomy', 'activity:bandage'),
  link('activity:bandage', 'milestone:field_medic'),
  link('profession:hedge_mage', 'skill:Magery'),
  link('skill:Magery', 'skill:Meditation'),
  link('skill:Meditation', 'resource:reagents'),
  link('resource:reagents', 'activity:spellcasting'),
  link('activity:spellcasting', 'milestone:hedge_mage'),
  link('profession:ranger', 'skill:Archery'),
  link('skill:Archery', 'skill:Tracking'),
  link('skill:Tracking', 'skill:Animal Taming')
];

function node(
  id: string,
  kind: AtlasNodeKind,
  label: string,
  detail: string,
  x: number,
  y: number,
  implemented: boolean,
  professions: Array<Exclude<ProfessionLensId, 'all'>>
): Omit<ProfessionAtlasNode, 'highlighted' | 'pinned'> {
  return { id, kind, label, detail, x, y, implemented, professions };
}

function link(from: string, to: string): { from: string; to: string } {
  return { from, to };
}

export function isSkillTrainable(skillId: SkillId): boolean {
  return TRAINABLE_SKILLS.has(skillId);
}

export function professionLensById(id: ProfessionLensId): ProfessionLens | null {
  return id === 'all' ? null : (professionLenses.find((lens) => lens.id === id) ?? null);
}

export function skillLedgerRows(state: GameState, filters: SkillLedgerFilters): SkillLedgerRow[] {
  const search = filters.search.toLowerCase().trim();
  const lens = professionLensById(filters.profession);
  const source = search || filters.profession !== 'all' ? skillsForGroup('All') : skillsForGroup(filters.group);
  return source
    .map((definition) => {
      const skill = state.player.skills[definition.id];
      const value = skill?.realValue ?? skill?.value ?? definition.startingValue;
      const effective = skill?.value ?? value;
      const lastAt = Math.max(skill?.lastGainAt ?? 0, skill?.lastSuccessfulUseAt ?? 0);
      const recent = lastAt > 0 && state.clock - lastAt <= 180;
      const trainable = isSkillTrainable(definition.id);
      const professions = professionLenses.filter((profession) => profession.skills.includes(definition.id)).map((profession) => profession.name);
      return {
        id: definition.id,
        name: definition.displayName,
        value,
        effectiveValue: effective,
        gainMode: skill?.mode ?? definition.gainMode,
        group: definition.group,
        recent,
        trainable,
        trainedBy: definition.verbs.join(', '),
        usedBy: professions.join(', ') || 'General play',
        description: definition.description,
        definition
      };
    })
    .filter((row) => {
      if (filters.trainable === 'trainable' && !row.trainable) return false;
      if (filters.trainable === 'not_trainable' && row.trainable) return false;
      if (filters.recent === 'recent' && !row.recent) return false;
      if (lens && !lens.skills.includes(row.id)) return false;
      if (!search) return true;
      return `${row.name} ${row.group} ${row.description} ${row.trainedBy} ${row.usedBy}`.toLowerCase().includes(search);
    });
}

export function deriveProfessionAtlas(state: GameState, lensId: ProfessionLensId = 'all', pinnedGoalId: string | null = null): ProfessionAtlas {
  const lens = professionLensById(lensId);
  const activeSkillIds = activeQuestSkillIds(state);
  const nodes = atlasNodeDefinitions.map((definition) => {
    const skillId = definition.id.startsWith('skill:') ? definition.id.slice('skill:'.length) : null;
    const highlighted = Boolean(
      (lens && definition.professions.includes(lens.id)) ||
        (skillId && activeSkillIds.has(skillId)) ||
        (pinnedGoalId && definition.id === pinnedGoalId)
    );
    const implemented = definition.kind === 'skill' && skillId ? isSkillTrainable(skillId) : definition.implemented;
    return {
      ...definition,
      implemented,
      highlighted,
      pinned: definition.id === pinnedGoalId
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return {
    lens,
    classlessNote: 'Profession selection is only a lens for planning; it never locks skills or grants class abilities.',
    nodes,
    links: atlasLinkDefinitions.map((definition) => ({
      ...definition,
      highlighted: Boolean(nodeById.get(definition.from)?.highlighted && nodeById.get(definition.to)?.highlighted)
    }))
  };
}

export function deriveMasteryMilestones(state: GameState): MasteryMilestone[] {
  return [
    milestone('treasure_hunter_initiate', 'Treasure Hunter Initiate', 'treasure_hunter', 'Can pin treasure clues to the journal and minimap.', [
      skillReq(state, 'Cartography', 20),
      skillReq(state, 'Lockpicking', 15),
      countReq('Find first buried cache', Object.values(state.world.treasure.maps).some((map) => map.found) ? 1 : 0, 1)
    ]),
    milestone('field_medic', 'Field Medic', 'field_medic', 'Bandage preview becomes more precise under pressure.', [
      skillReq(state, 'Healing', 25),
      skillReq(state, 'Anatomy', 20),
      countReq('Bandage in combat 5 times', state.dev.telemetry.combatBandagesApplied ?? 0, 5)
    ]),
    milestone('hedge_mage', 'Hedge Mage', 'hedge_mage', 'Improved spell failure preview and novice mage work orders.', [
      skillReq(state, 'Magery', 25),
      skillReq(state, 'Meditation', 20),
      countReq('Know 6 spells', state.player.spellbook.knownSpellIds.length, 6)
    ]),
    milestone('town_smith', 'Town Smith', 'town_smith', 'Better repair cost preview.', [
      skillReq(state, 'Mining', 25),
      skillReq(state, 'Blacksmithing', 25),
      countReq('Repair 5 items', state.dev.telemetry.repairsCompleted ?? 0, 5)
    ]),
    milestone('builder_initiate', 'Builder Initiate', 'builder', 'Housing goals can be pinned as build reminders.', [
      skillReq(state, 'Carpentry', 10),
      countReq('Place 1 housing object', state.world.placedBuildings.length, 1),
      countReq('Complete 1 work order', state.dev.telemetry.workOrdersCompleted, 1)
    ]),
    milestone('battle_miner', 'Battle Miner', 'battle_miner', 'Mining and combat loops are highlighted together on the atlas.', [
      skillReq(state, 'Mining', 25),
      skillReq(state, 'Tactics', 20),
      countReq('Defeat 1 road enemy', state.quests.trouble_on_road?.objectives.find((objective) => objective.type === 'kill')?.progress ?? 0, 1)
    ])
  ];
}

export function describeProfessionGoal(goalId: string | null | undefined): { label: string; detail: string } | null {
  if (!goalId) return null;
  if (goalId.startsWith('profession:')) {
    const id = goalId.slice('profession:'.length);
    const lens = professionLenses.find((candidate) => candidate.id === id);
    const cluster = relationshipProfessionClusters.find((candidate) => candidate.id === id);
    if (lens) return { label: lens.name, detail: lens.starterGoals[0] ?? 'Use this as a planning lens.' };
    if (cluster) return { label: cluster.title, detail: cluster.suggestedGoal };
    return null;
  }
  const cluster = relationshipProfessionClusters.find((candidate) => candidate.id === goalId);
  if (cluster) return { label: cluster.title, detail: cluster.suggestedGoal };
  const clusterNode = relationshipProfessionClusters.flatMap((candidate) => candidate.nodes).find((candidate) => candidate.id === goalId);
  if (clusterNode) return { label: clusterNode.label, detail: clusterNode.description };
  const node = atlasNodeDefinitions.find((candidate) => candidate.id === goalId);
  if (node) return { label: node.label, detail: node.detail };
  const title = goalId
    .split(/[:_]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
  return title ? { label: title, detail: 'Pinned profession goal.' } : null;
}

function activeQuestSkillIds(state: GameState): Set<SkillId> {
  const ids = new Set<SkillId>();
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
      ids.add('Cartography');
      ids.add('Detect Hidden');
      ids.add('Lockpicking');
      ids.add('Remove Trap');
    }
    if (questId === 'place_to_call_yours') ids.add('Carpentry');
  }
  return ids;
}

function skillReq(state: GameState, skillId: SkillId, required: number): MasteryRequirement {
  const skill = state.player.skills[skillId];
  const current = skill?.realValue ?? skill?.value ?? skillDefinitionById[skillId]?.startingValue ?? 0;
  return countReq(`${skillDefinitionById[skillId]?.displayName ?? skillId} ${required}`, current, required);
}

function countReq(label: string, current: number, required: number): MasteryRequirement {
  return {
    label,
    current,
    required,
    done: current >= required
  };
}

function milestone(
  id: string,
  title: string,
  professionId: Exclude<ProfessionLensId, 'all'>,
  reward: string,
  requirements: MasteryRequirement[]
): MasteryMilestone {
  const done = requirements.filter((requirement) => requirement.done).length;
  return {
    id,
    title,
    professionId,
    reward,
    earned: done === requirements.length,
    progress: done / requirements.length,
    requirements
  };
}

export { skillGroups };

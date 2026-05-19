import { itemDefs } from './items';
import { recipes } from './recipes';
import { skillDefinitionById } from './skillDefinitions';
import { spellDefs } from './spells';
import type { GameState, SkillId } from '../game/types';

export type ProfessionId =
  | 'armsman'
  | 'ranger'
  | 'hedge_mage'
  | 'treasure_hunter'
  | 'smith_artisan'
  | 'builder'
  | 'healer'
  | 'bard'
  | 'rogue'
  | 'naturalist';

export type ProfessionNodeType = 'skill' | 'action' | 'tool' | 'station' | 'spell' | 'recipe' | 'resource' | 'output' | 'service' | 'milestone' | 'goal' | 'future';
export type ProfessionEdgeType = 'trains' | 'requires' | 'supports' | 'unlocks' | 'improves' | 'consumes' | 'produces';
export type MasteryRewardType = 'clarity' | 'recipe' | 'utility' | 'active' | 'quality_of_life';

export interface ProfessionNode {
  id: string;
  type: ProfessionNodeType;
  label: string;
  ref?: string;
  description: string;
  x: number;
  y: number;
}

export interface ProfessionEdge {
  from: string;
  to: string;
  type: ProfessionEdgeType;
  label: string;
}

export interface ProfessionCluster {
  id: ProfessionId;
  title: string;
  summary: string;
  color: string;
  skills: SkillId[];
  nodes: ProfessionNode[];
  edges: ProfessionEdge[];
  suggestedGoal: string;
}

export type MasteryRequirement =
  | { type: 'skill'; skillId: SkillId; value: number }
  | { type: 'quest'; questId: string }
  | { type: 'spellKnown'; spellId: string }
  | { type: 'recipeCrafted'; recipeId: string }
  | { type: 'workOrdersCompleted'; count: number }
  | { type: 'housingPlaced'; count: number }
  | { type: 'itemOwned'; itemId: string; quantity: number }
  | { type: 'areaDiscovered'; areaId: GameState['player']['currentArea'] }
  | { type: 'secretFound'; secretId: string };

export interface MasteryMilestone {
  id: string;
  professionId: ProfessionId;
  title: string;
  description: string;
  requirements: MasteryRequirement[];
  rewardType: MasteryRewardType;
  reward: string;
  visibleWhen: MasteryRequirement[];
  unlockMessage: string;
}

const n = (id: string, type: ProfessionNodeType, label: string, description: string, x: number, y: number, ref?: string): ProfessionNode => ({
  id,
  type,
  label,
  description,
  x,
  y,
  ref
});

const e = (from: string, to: string, type: ProfessionEdgeType, label: string): ProfessionEdge => ({ from, to, type, label });

export const professionClusters: ProfessionCluster[] = [
  {
    id: 'armsman',
    title: 'Armsman',
    summary: 'Blade, shield, stamina, anatomy, tactics, and repair discipline.',
    color: '#cfa45a',
    skills: ['Swordsmanship', 'Tactics', 'Anatomy', 'Parrying', 'Focus', 'Blacksmithing'],
    suggestedGoal: 'Survive road pressure and keep gear repaired.',
    nodes: [
      n('armsman_goal', 'goal', 'Road Duelist', 'Hold the line, read telegraphs, and leave with repaired gear.', 50, 18),
      n('skill_swordsmanship', 'skill', 'Swordsmanship', 'Primary melee accuracy and damage.', 24, 42, 'Swordsmanship'),
      n('skill_tactics', 'skill', 'Tactics', 'Support skill that improves weapon consistency.', 54, 42, 'Tactics'),
      n('skill_anatomy', 'skill', 'Anatomy', 'Supports weapon hits and bandage outcomes.', 80, 48, 'Anatomy'),
      n('skill_parrying', 'skill', 'Parrying', 'Shield timing and defensive actions.', 50, 68, 'Parrying'),
      n('action_parry', 'action', 'Defend', 'Use the defensive hotbar/action when a wind-up is visible.', 34, 68, 'defend'),
      n('tool_sword', 'tool', 'Iron Sword', 'Starter blade that trains Swordsmanship by use.', 12, 65, 'iron_sword'),
      n('station_forge', 'station', 'Forge', 'Repair and craft metal tools at a forge station.', 72, 72, 'forge'),
      n('milestone_road_duelist', 'milestone', 'Road Duelist', 'Defeat a bandit after learning to recover.', 56, 86, 'road_duelist')
    ],
    edges: [
      e('tool_sword', 'skill_swordsmanship', 'trains', 'trains'),
      e('skill_swordsmanship', 'skill_tactics', 'supports', 'feeds'),
      e('skill_anatomy', 'skill_swordsmanship', 'improves', 'reads'),
      e('action_parry', 'skill_parrying', 'trains', 'trains'),
      e('station_forge', 'milestone_road_duelist', 'supports', 'keeps gear ready')
    ]
  },
  {
    id: 'ranger',
    title: 'Ranger',
    summary: 'Bow, tracking, lumber, arrows, forest movement, and field scouting.',
    color: '#7fae5a',
    skills: ['Archery', 'Tactics', 'Lumberjacking', 'Bowcraft/Fletching', 'Tracking', 'Camping'],
    suggestedGoal: 'Turn forest resources into safe ranged pressure.',
    nodes: [
      n('ranger_goal', 'goal', 'Greymont Scout', 'Harvest wood, craft ammunition, and read the forest route.', 50, 16),
      n('skill_archery', 'skill', 'Archery', 'Ranged accuracy and pressure.', 22, 44, 'Archery'),
      n('tool_bow', 'tool', 'Simple Bow', 'Starter ranged weapon that consumes arrows.', 8, 66, 'simple_bow'),
      n('skill_lumberjacking', 'skill', 'Lumberjacking', 'Harvests logs and supports axe work.', 48, 46, 'Lumberjacking'),
      n('recipe_arrows', 'recipe', 'Arrow Bundle', 'Turns boards into ammunition.', 72, 62, 'arrow_bundle'),
      n('skill_tracking', 'skill', 'Tracking', 'Reads trails and wilderness leads.', 82, 40, 'Tracking'),
      n('milestone_greymont_scout', 'milestone', 'Greymont Scout', 'Bring forest materials back to town.', 48, 84, 'greymont_scout')
    ],
    edges: [
      e('tool_bow', 'skill_archery', 'trains', 'trains'),
      e('skill_lumberjacking', 'recipe_arrows', 'produces', 'boards'),
      e('recipe_arrows', 'skill_archery', 'supports', 'ammo'),
      e('skill_tracking', 'ranger_goal', 'supports', 'route'),
      e('skill_lumberjacking', 'milestone_greymont_scout', 'unlocks', 'materials')
    ]
  },
  {
    id: 'hedge_mage',
    title: 'Hedge Mage',
    summary: 'Spellbook, reagents, meditation, offensive and utility magic.',
    color: '#7aa6ff',
    skills: ['Magery', 'Meditation', 'Evaluating Intelligence', 'Resisting Spells', 'Inscription'],
    suggestedGoal: 'Use one combat spell and one utility spell without running dry.',
    nodes: [
      n('hedge_goal', 'goal', 'Hedge Mage', 'Cast, recover, and use utility before danger.', 50, 14),
      n('skill_magery', 'skill', 'Magery', 'General spell reliability.', 26, 42, 'Magery'),
      n('skill_meditation', 'skill', 'Meditation', 'Mana recovery by active practice.', 54, 62, 'Meditation'),
      n('spell_magic_arrow', 'spell', 'Magic Arrow', 'Low-circle combat spell.', 10, 66, 'magic_arrow'),
      n('spell_heal', 'spell', 'Heal', 'Early survival spell.', 42, 82, 'heal'),
      n('spell_detect_magic', 'spell', 'Detect Magic', 'Reveals magical containers and secrets.', 78, 46, 'detect_magic'),
      n('tool_spellbook', 'tool', 'Spellbook', 'Known spells are practiced, not point-spent.', 34, 22, 'beginner_spellbook'),
      n('milestone_hedge_mage', 'milestone', 'Hedge Mage', 'Know several spells and recover mana deliberately.', 76, 78, 'hedge_mage')
    ],
    edges: [
      e('tool_spellbook', 'skill_magery', 'requires', 'casts'),
      e('spell_magic_arrow', 'skill_magery', 'trains', 'trains'),
      e('spell_heal', 'skill_magery', 'trains', 'trains'),
      e('skill_meditation', 'skill_magery', 'supports', 'sustains'),
      e('spell_detect_magic', 'milestone_hedge_mage', 'unlocks', 'utility')
    ]
  },
  {
    id: 'treasure_hunter',
    title: 'Treasure Hunter',
    summary: 'Maps, hidden caches, locks, traps, and cautious dungeon rewards.',
    color: '#d7bd62',
    skills: ['Cartography', 'Lockpicking', 'Detect Hidden', 'Remove Trap', 'Mining', 'Item Identification'],
    suggestedGoal: 'Find a clue, reveal risk, and open a cache safely.',
    nodes: [
      n('treasure_goal', 'goal', 'Treasure Hunter Initiate', 'Turn clues into safe loot.', 50, 16),
      n('service_rumor_board', 'service', 'Rumor Board', 'Town leads and rumors point toward map fragments and caches.', 8, 24, 'rumor_board'),
      n('skill_cartography', 'skill', 'Cartography', 'Deciphers maps and supports route clues.', 18, 40, 'Cartography'),
      n('resource_map_fragment', 'resource', 'Map Fragment', 'A clue piece that can become a rough treasure map.', 8, 58, 'map_fragment'),
      n('skill_detect_hidden', 'skill', 'Detect Hidden', 'Finds hidden caches and suspicious terrain.', 52, 34, 'Detect Hidden'),
      n('output_treasure_map', 'output', 'Treasure Map', 'Map fragments and deciphered clues point to a search area.', 40, 58, 'rough_treasure_map'),
      n('skill_lockpicking', 'skill', 'Lockpicking', 'Opens locked containers.', 78, 50, 'Lockpicking'),
      n('skill_remove_trap', 'skill', 'Remove Trap', 'Disarms known traps.', 64, 72, 'Remove Trap'),
      n('tool_lockpick', 'tool', 'Lockpick', 'Consumable tool for locks.', 92, 72, 'lockpick'),
      n('action_decipher', 'action', 'Decipher Map', 'Use Cartography on a rough treasure map.', 20, 72, 'decipher-map'),
      n('future_survey_contracts', 'future', 'Survey Contracts', 'Future repeatable route and cache commissions.', 86, 28, 'survey_contracts'),
      n('milestone_cache', 'milestone', 'First Cache', 'Open one safe hidden reward.', 48, 88, 'treasure_hunter_initiate')
    ],
    edges: [
      e('service_rumor_board', 'resource_map_fragment', 'produces', 'leads'),
      e('resource_map_fragment', 'action_decipher', 'consumes', 'clue'),
      e('action_decipher', 'skill_cartography', 'trains', 'trains'),
      e('skill_cartography', 'output_treasure_map', 'produces', 'deciphers'),
      e('output_treasure_map', 'skill_detect_hidden', 'supports', 'search area'),
      e('skill_detect_hidden', 'skill_remove_trap', 'supports', 'reveals'),
      e('tool_lockpick', 'skill_lockpicking', 'requires', 'uses'),
      e('skill_cartography', 'future_survey_contracts', 'supports', 'future work'),
      e('skill_remove_trap', 'milestone_cache', 'supports', 'safer loot'),
      e('skill_cartography', 'milestone_cache', 'unlocks', 'cache route')
    ]
  },
  {
    id: 'smith_artisan',
    title: 'Town Smith',
    summary: 'Ore, forge, repairs, work orders, and maker identity.',
    color: '#c77748',
    skills: ['Mining', 'Blacksmithing', 'Arms Lore', 'Item Identification', 'Tinkering'],
    suggestedGoal: 'Convert ore into bars and fulfill a metal order.',
    nodes: [
      n('artisan_goal', 'goal', 'Briarbrook Artisan', 'Make resources matter through orders and repairs.', 50, 14),
      n('skill_mining', 'skill', 'Mining', 'Extracts ore and stone.', 20, 42, 'Mining'),
      n('tool_pickaxe', 'tool', 'Pickaxe', 'Targets rock faces and mine terrain.', 8, 68, 'pickaxe'),
      n('station_forge_artisan', 'station', 'Forge', 'Smelt, repair, and craft metal.', 48, 48, 'forge'),
      n('recipe_smelt_iron', 'recipe', 'Smelt Iron', 'Turns iron ore into bars.', 72, 36, 'smelt_iron'),
      n('skill_blacksmithing', 'skill', 'Blacksmithing', 'Metal craft and repair skill.', 78, 64, 'Blacksmithing'),
      n('milestone_artisan', 'milestone', 'Artisan Mark', 'Fulfill orders with your own materials.', 50, 86, 'briarbrook_artisan')
    ],
    edges: [
      e('tool_pickaxe', 'skill_mining', 'trains', 'trains'),
      e('skill_mining', 'recipe_smelt_iron', 'produces', 'ore'),
      e('station_forge_artisan', 'recipe_smelt_iron', 'requires', 'station'),
      e('recipe_smelt_iron', 'skill_blacksmithing', 'supports', 'materials'),
      e('skill_blacksmithing', 'milestone_artisan', 'unlocks', 'orders')
    ]
  },
  {
    id: 'builder',
    title: 'Builder',
    summary: 'Logs, boards, furniture, storage, stations, and housing persistence.',
    color: '#a97949',
    skills: ['Carpentry', 'Lumberjacking', 'Mining', 'Tinkering', 'Camping'],
    suggestedGoal: 'Place one useful object and make the plot persist.',
    nodes: [
      n('builder_goal', 'goal', 'Plot Steward', 'Make a persistent place with useful storage.', 50, 15),
      n('skill_carpentry', 'skill', 'Carpentry', 'Builds furniture, crates, and stations.', 50, 44, 'Carpentry'),
      n('skill_lumberjacking_builder', 'skill', 'Lumberjacking', 'Feeds boards and housing parts.', 18, 48, 'Lumberjacking'),
      n('recipe_saw_boards', 'recipe', 'Saw Boards', 'Turns logs into boards.', 20, 72, 'saw_boards'),
      n('station_workbench', 'station', 'Workbench', 'Home station for builder recipes.', 72, 40, 'carpenter_bench_home'),
      n('recipe_chest', 'recipe', 'Storage Chest', 'Useful first plot object.', 76, 68, 'storage_chest'),
      n('milestone_plot', 'milestone', 'First Useful Room', 'Place storage or a workbench and save.', 50, 88, 'plot_steward')
    ],
    edges: [
      e('skill_lumberjacking_builder', 'recipe_saw_boards', 'produces', 'logs'),
      e('recipe_saw_boards', 'skill_carpentry', 'trains', 'trains'),
      e('station_workbench', 'recipe_chest', 'requires', 'station'),
      e('skill_carpentry', 'milestone_plot', 'unlocks', 'housing utility')
    ]
  },
  {
    id: 'healer',
    title: 'Field Medic',
    summary: 'Bandages, anatomy, potions, cure, and field recovery.',
    color: '#d96b6b',
    skills: ['Healing', 'Anatomy', 'Alchemy', 'Magery', 'Meditation'],
    suggestedGoal: 'Recover once under pressure without losing the fight.',
    nodes: [
      n('healer_goal', 'goal', 'Field Medic', 'Preview recovery and keep a fight stable.', 50, 16),
      n('skill_healing', 'skill', 'Healing', 'Bandages and triage.', 24, 48, 'Healing'),
      n('skill_anatomy_healer', 'skill', 'Anatomy', 'Improves bandage understanding.', 54, 36, 'Anatomy'),
      n('action_bandage', 'action', 'Bandage', 'Delayed healing with interruption risk.', 18, 72, 'bandage'),
      n('spell_heal_healer', 'spell', 'Heal', 'Mana/reagent recovery tool.', 74, 48, 'heal'),
      n('recipe_health_potion', 'recipe', 'Health Potion', 'Alchemy route for recovery supplies.', 78, 74, 'health_potion'),
      n('milestone_field_medic', 'milestone', 'Field Medic', 'Bandage reliably after taking damage.', 50, 88, 'field_medic')
    ],
    edges: [
      e('action_bandage', 'skill_healing', 'trains', 'trains'),
      e('skill_anatomy_healer', 'skill_healing', 'supports', 'improves'),
      e('spell_heal_healer', 'skill_healing', 'supports', 'backup'),
      e('recipe_health_potion', 'milestone_field_medic', 'supports', 'stock'),
      e('skill_healing', 'milestone_field_medic', 'unlocks', 'clarity')
    ]
  },
  {
    id: 'bard',
    title: 'Bard',
    summary: 'Instrument control, crowd control, social pressure, and safer fights.',
    color: '#d8aa57',
    skills: ['Musicianship', 'Peacemaking', 'Provocation', 'Discordance', 'Begging'],
    suggestedGoal: 'Use one bard action to turn a road fight safer.',
    nodes: [
      n('bard_goal', 'goal', 'Road Performer', 'Control pressure without becoming a class.', 50, 16),
      n('skill_musicianship', 'skill', 'Musicianship', 'Instrument baseline for bard actions.', 28, 42, 'Musicianship'),
      n('skill_peacemaking', 'skill', 'Peacemaking', 'Calms hostile pressure.', 60, 34, 'Peacemaking'),
      n('skill_discordance', 'skill', 'Discordance', 'Weakens enemy rhythm and armor.', 80, 58, 'Discordance'),
      n('tool_lute', 'tool', 'Lute', 'Starter instrument for bard attempts.', 18, 70, 'lute'),
      n('milestone_bard', 'milestone', 'Road Performer', 'Use music to survive a dangerous road.', 54, 86, 'road_performer')
    ],
    edges: [
      e('tool_lute', 'skill_musicianship', 'requires', 'instrument'),
      e('skill_musicianship', 'skill_peacemaking', 'supports', 'enables'),
      e('skill_musicianship', 'skill_discordance', 'supports', 'enables'),
      e('skill_peacemaking', 'milestone_bard', 'unlocks', 'safer road')
    ]
  },
  {
    id: 'rogue',
    title: 'Rogue',
    summary: 'Stealth, locks, traps, snooping, and risk-managed loot.',
    color: '#8d8a96',
    skills: ['Hiding', 'Stealth', 'Snooping', 'Stealing', 'Lockpicking', 'Remove Trap', 'Poisoning'],
    suggestedGoal: 'Open riskier containers only after revealing the danger.',
    nodes: [
      n('rogue_goal', 'goal', 'Careful Hands', 'Inspect, reveal, then open.', 50, 14),
      n('skill_hiding', 'skill', 'Hiding', 'Breaks line of sight.', 20, 42, 'Hiding'),
      n('skill_lockpicking_rogue', 'skill', 'Lockpicking', 'Opens locks.', 54, 44, 'Lockpicking'),
      n('skill_remove_trap_rogue', 'skill', 'Remove Trap', 'Disarms traps.', 74, 60, 'Remove Trap'),
      n('tool_lockpick_rogue', 'tool', 'Lockpick', 'Tool for lock attempts.', 42, 70, 'lockpick'),
      n('milestone_rogue', 'milestone', 'Careful Hands', 'Open a container after checking danger.', 52, 88, 'careful_hands')
    ],
    edges: [
      e('tool_lockpick_rogue', 'skill_lockpicking_rogue', 'requires', 'uses'),
      e('skill_remove_trap_rogue', 'skill_lockpicking_rogue', 'supports', 'safer'),
      e('skill_hiding', 'rogue_goal', 'supports', 'avoidance'),
      e('skill_lockpicking_rogue', 'milestone_rogue', 'unlocks', 'loot')
    ]
  },
  {
    id: 'naturalist',
    title: 'Provisioner',
    summary: 'Fishing, herbs, food, potions, animals, and future wilderness supply.',
    color: '#65a77a',
    skills: ['Fishing', 'Alchemy', 'Animal Lore', 'Animal Taming', 'Veterinary', 'Herding'],
    suggestedGoal: 'Gather food and reagents now; animal loops come later.',
    nodes: [
      n('naturalist_goal', 'goal', 'Trail Naturalist', 'Read living resources and prepare supplies.', 50, 16),
      n('skill_fishing', 'skill', 'Fishing', 'Food and water finds.', 20, 44, 'Fishing'),
      n('skill_alchemy_naturalist', 'skill', 'Alchemy', 'Herbs into potions.', 48, 54, 'Alchemy'),
      n('skill_animal_lore', 'skill', 'Animal Lore', 'Future animal understanding.', 78, 40, 'Animal Lore'),
      n('tool_scissors', 'tool', 'Scissors', 'Harvests herb patches.', 36, 76, 'scissors'),
      n('milestone_naturalist', 'milestone', 'Trail Naturalist', 'Bring food or herbs back from the wild.', 54, 88, 'trail_naturalist')
    ],
    edges: [
      e('tool_scissors', 'skill_alchemy_naturalist', 'trains', 'herbs'),
      e('skill_fishing', 'naturalist_goal', 'supports', 'food'),
      e('skill_alchemy_naturalist', 'milestone_naturalist', 'unlocks', 'supplies'),
      e('skill_animal_lore', 'naturalist_goal', 'supports', 'future')
    ]
  }
];

export const masteryMilestones: MasteryMilestone[] = [
  {
    id: 'road_duelist',
    professionId: 'armsman',
    title: 'Road Duelist',
    description: 'Prove you can survive the first road fight with weapon skills and recovery.',
    requirements: [
      { type: 'skill', skillId: 'Swordsmanship', value: 35 },
      { type: 'skill', skillId: 'Tactics', value: 30 },
      { type: 'quest', questId: 'trouble_on_road' }
    ],
    rewardType: 'clarity',
    reward: 'Combat panel highlights enemy wind-up and recovery options more clearly.',
    visibleWhen: [{ type: 'areaDiscovered', areaId: 'road' }],
    unlockMessage: 'Road Duelist: you understand the first road fight.'
  },
  {
    id: 'greymont_scout',
    professionId: 'ranger',
    title: 'Greymont Scout',
    description: 'Use forest resources to support travel and ranged pressure.',
    requirements: [
      { type: 'skill', skillId: 'Lumberjacking', value: 22 },
      { type: 'itemOwned', itemId: 'logs', quantity: 8 },
      { type: 'areaDiscovered', areaId: 'forest' }
    ],
    rewardType: 'quality_of_life',
    reward: 'Forest resource routes are suggested in the guide and journal.',
    visibleWhen: [{ type: 'areaDiscovered', areaId: 'forest' }],
    unlockMessage: 'Greymont Scout: you can turn the forest into supplies.'
  },
  {
    id: 'hedge_mage',
    professionId: 'hedge_mage',
    title: 'Hedge Mage',
    description: 'Practice combat and utility magic without replacing skill growth.',
    requirements: [
      { type: 'skill', skillId: 'Magery', value: 25 },
      { type: 'skill', skillId: 'Meditation', value: 20 },
      { type: 'spellKnown', spellId: 'detect_magic' }
    ],
    rewardType: 'clarity',
    reward: 'Spellbook details emphasize fizzle, reagent, and recovery information.',
    visibleWhen: [{ type: 'spellKnown', spellId: 'magic_arrow' }],
    unlockMessage: 'Hedge Mage: spell practice is becoming reliable.'
  },
  {
    id: 'treasure_hunter_initiate',
    professionId: 'treasure_hunter',
    title: 'Treasure Hunter Initiate',
    description: 'Read a clue and open safer reward paths through detection and locks.',
    requirements: [
      { type: 'skill', skillId: 'Cartography', value: 20 },
      { type: 'skill', skillId: 'Lockpicking', value: 15 },
      { type: 'secretFound', secretId: 'crypt_treasure_room' }
    ],
    rewardType: 'utility',
    reward: 'Can pin treasure map hints to the journal/minimap in later slices.',
    visibleWhen: [{ type: 'itemOwned', itemId: 'rough_treasure_map', quantity: 1 }],
    unlockMessage: 'Treasure Hunter Initiate: clues now point somewhere real.'
  },
  {
    id: 'briarbrook_artisan',
    professionId: 'smith_artisan',
    title: 'Briarbrook Artisan',
    description: 'Turn mined materials into useful town output.',
    requirements: [
      { type: 'skill', skillId: 'Blacksmithing', value: 20 },
      { type: 'workOrdersCompleted', count: 1 }
    ],
    rewardType: 'recipe',
    reward: 'Tier 1 work orders become a clear next target.',
    visibleWhen: [{ type: 'skill', skillId: 'Blacksmithing', value: 15 }],
    unlockMessage: 'Briarbrook Artisan: your work is noticed.'
  },
  {
    id: 'plot_steward',
    professionId: 'builder',
    title: 'Plot Steward',
    description: 'Place a useful object and prove housing persistence.',
    requirements: [
      { type: 'skill', skillId: 'Carpentry', value: 10 },
      { type: 'housingPlaced', count: 1 }
    ],
    rewardType: 'quality_of_life',
    reward: 'Journal pins the next practical housing material target.',
    visibleWhen: [{ type: 'areaDiscovered', areaId: 'housing' }],
    unlockMessage: 'Plot Steward: the plot remembers your work.'
  },
  {
    id: 'field_medic',
    professionId: 'healer',
    title: 'Field Medic',
    description: 'Use body knowledge and bandages under pressure.',
    requirements: [
      { type: 'skill', skillId: 'Healing', value: 25 },
      { type: 'skill', skillId: 'Anatomy', value: 20 },
      { type: 'quest', questId: 'patch_yourself_up' }
    ],
    rewardType: 'clarity',
    reward: 'Bandage outcome preview is easier to understand.',
    visibleWhen: [{ type: 'skill', skillId: 'Healing', value: 20 }],
    unlockMessage: 'Field Medic: your hands are steadier.'
  },
  {
    id: 'road_performer',
    professionId: 'bard',
    title: 'Road Performer',
    description: 'Use music as survival pressure, not a class lock.',
    requirements: [
      { type: 'skill', skillId: 'Musicianship', value: 8 },
      { type: 'skill', skillId: 'Peacemaking', value: 5 },
      { type: 'quest', questId: 'trouble_on_road' }
    ],
    rewardType: 'active',
    reward: 'Bard actions are surfaced more clearly in combat actions.',
    visibleWhen: [{ type: 'itemOwned', itemId: 'lute', quantity: 1 }],
    unlockMessage: 'Road Performer: the road heard your tune.'
  },
  {
    id: 'careful_hands',
    professionId: 'rogue',
    title: 'Careful Hands',
    description: 'Inspect risk before forcing a container.',
    requirements: [
      { type: 'skill', skillId: 'Lockpicking', value: 15 },
      { type: 'skill', skillId: 'Remove Trap', value: 10 },
      { type: 'areaDiscovered', areaId: 'crypt' }
    ],
    rewardType: 'utility',
    reward: 'Trap and lock details get clearer wording.',
    visibleWhen: [{ type: 'areaDiscovered', areaId: 'crypt' }],
    unlockMessage: 'Careful Hands: locks are no longer just guesses.'
  },
  {
    id: 'trail_naturalist',
    professionId: 'naturalist',
    title: 'Trail Naturalist',
    description: 'Bring food, herbs, or river supplies back from the wild.',
    requirements: [
      { type: 'skill', skillId: 'Fishing', value: 8 },
      { type: 'skill', skillId: 'Alchemy', value: 5 },
      { type: 'itemOwned', itemId: 'ginseng', quantity: 4 }
    ],
    rewardType: 'clarity',
    reward: 'Natural resource categories are easier to compare.',
    visibleWhen: [{ type: 'areaDiscovered', areaId: 'forest' }],
    unlockMessage: 'Trail Naturalist: the wild is becoming readable.'
  },
  {
    id: 'crypt_caution',
    professionId: 'treasure_hunter',
    title: 'Crypt Caution',
    description: 'Use magic or detection before taking dungeon rewards.',
    requirements: [
      { type: 'spellKnown', spellId: 'detect_magic' },
      { type: 'areaDiscovered', areaId: 'crypt' },
      { type: 'quest', questId: 'bones_beneath' }
    ],
    rewardType: 'quality_of_life',
    reward: 'Dungeon reward-room warnings are surfaced in detail panels.',
    visibleWhen: [{ type: 'areaDiscovered', areaId: 'crypt' }],
    unlockMessage: 'Crypt Caution: you learned to check before opening.'
  },
  {
    id: 'market_helper',
    professionId: 'smith_artisan',
    title: 'Market Helper',
    description: 'Fulfill town demand without depending on debug supplies.',
    requirements: [
      { type: 'workOrdersCompleted', count: 1 },
      { type: 'skill', skillId: 'Cooking', value: 10 }
    ],
    rewardType: 'quality_of_life',
    reward: 'Market/work-order rows call out required items more clearly.',
    visibleWhen: [{ type: 'areaDiscovered', areaId: 'town' }],
    unlockMessage: 'Market Helper: the town economy has a rhythm.'
  }
];

export function professionById(id: string | null | undefined): ProfessionCluster | undefined {
  return professionClusters.find((profession) => profession.id === id);
}

export function masteryMilestonesForProfession(professionId: ProfessionId): MasteryMilestone[] {
  return masteryMilestones.filter((milestone) => milestone.professionId === professionId);
}

export function skillProfessionIds(skillId: string): ProfessionId[] {
  return professionClusters.filter((cluster) => cluster.skills.includes(skillId)).map((cluster) => cluster.id);
}

export function describeRequirement(requirement: MasteryRequirement): string {
  if (requirement.type === 'skill') return `${requirement.skillId} ${requirement.value.toFixed(1)}`;
  if (requirement.type === 'quest') return `Complete ${requirement.questId.replaceAll('_', ' ')}`;
  if (requirement.type === 'spellKnown') return `Know ${spellDefs[requirement.spellId]?.displayName ?? requirement.spellId}`;
  if (requirement.type === 'recipeCrafted') return `Craft ${recipes.find((recipe) => recipe.id === requirement.recipeId)?.name ?? requirement.recipeId}`;
  if (requirement.type === 'workOrdersCompleted') return `Complete ${requirement.count} work order${requirement.count === 1 ? '' : 's'}`;
  if (requirement.type === 'housingPlaced') return `Place ${requirement.count} housing object${requirement.count === 1 ? '' : 's'}`;
  if (requirement.type === 'itemOwned') return `Carry ${itemDefs[requirement.itemId]?.name ?? requirement.itemId} x${requirement.quantity}`;
  if (requirement.type === 'areaDiscovered') return `Discover ${requirement.areaId}`;
  return `Find ${requirement.secretId.replaceAll('_', ' ')}`;
}

export function requirementMet(state: GameState, requirement: MasteryRequirement): boolean {
  if (requirement.type === 'skill') return (state.player.skills[requirement.skillId]?.realValue ?? 0) >= requirement.value;
  if (requirement.type === 'quest') return state.player.completedQuestIds.includes(requirement.questId);
  if (requirement.type === 'spellKnown') return state.player.spellbook.knownSpellIds.includes(requirement.spellId);
  if (requirement.type === 'recipeCrafted') return state.dev.telemetry.itemsConsumed[recipes.find((recipe) => recipe.id === requirement.recipeId)?.inputs[0]?.itemId ?? ''] > 0;
  if (requirement.type === 'workOrdersCompleted') return state.dev.telemetry.workOrdersCompleted >= requirement.count;
  if (requirement.type === 'housingPlaced') return state.world.placedBuildings.length >= requirement.count;
  if (requirement.type === 'itemOwned') {
    const inInventory = state.player.inventory.slots.reduce((total, slot) => total + (slot?.itemId === requirement.itemId ? slot.quantity : 0), 0);
    const inBank = state.player.bank.slots.reduce((total, slot) => total + (slot?.itemId === requirement.itemId ? slot.quantity : 0), 0);
    return inInventory + inBank >= requirement.quantity;
  }
  if (requirement.type === 'areaDiscovered') return state.world.discoveredAreas.includes(requirement.areaId);
  const secret = state.world.treasure.secrets[requirement.secretId];
  return Boolean(secret && (secret.opened || secret.disarmed || secret.triggered || secret.revealedUntil > state.clock));
}

export function milestoneProgress(state: GameState, milestone: MasteryMilestone): { met: number; total: number; complete: boolean; visible: boolean } {
  const total = milestone.requirements.length;
  const met = milestone.requirements.filter((requirement) => requirementMet(state, requirement)).length;
  const visible = milestone.visibleWhen.length === 0 || milestone.visibleWhen.some((requirement) => requirementMet(state, requirement)) || met > 0;
  return { met, total, complete: met >= total, visible };
}

export function professionActivityScore(state: GameState, profession: ProfessionCluster): number {
  let score = 0;
  for (const skillId of profession.skills) {
    const skill = state.player.skills[skillId];
    if (!skill) continue;
    if (skill.lastGainAt > 0 && state.clock - skill.lastGainAt < 120) score += 3;
    if (skill.lastSuccessfulUseAt > 0 && state.clock - skill.lastSuccessfulUseAt < 180) score += 2;
    if (skill.realValue > (skillDefinitionById[skillId]?.startingValue ?? 0)) score += 1;
  }
  score += masteryMilestonesForProfession(profession.id).filter((milestone) => milestoneProgress(state, milestone).complete).length * 4;
  return score;
}

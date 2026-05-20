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
  | 'naturalist'
  | 'trader';

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
    skills: ['Archery', 'Tactics', 'Lumberjacking', 'Bowcraft/Fletching', 'Tracking', 'Survival', 'Camping'],
    suggestedGoal: 'Turn forest resources into safe ranged pressure.',
    nodes: [
      n('ranger_goal', 'goal', 'Greymont Scout', 'Harvest wood, craft ammunition, and read the forest route.', 50, 16),
      n('skill_archery', 'skill', 'Archery', 'Ranged accuracy and pressure.', 22, 44, 'Archery'),
      n('tool_bow', 'tool', 'Simple Bow', 'Starter ranged weapon that consumes arrows.', 8, 66, 'simple_bow'),
      n('skill_lumberjacking', 'skill', 'Lumberjacking', 'Harvests logs and supports axe work.', 48, 46, 'Lumberjacking'),
      n('recipe_arrows', 'recipe', 'Arrow Bundle', 'Turns boards into ammunition.', 72, 62, 'arrow_bundle'),
      n('skill_tracking', 'skill', 'Tracking', 'Reads trails and wilderness leads.', 82, 40, 'Tracking'),
      n('skill_survival', 'skill', 'Survival', 'Keeps routes, camps, and hazards manageable.', 76, 54, 'Survival'),
      n('milestone_greymont_scout', 'milestone', 'Greymont Scout', 'Bring forest materials back to town.', 48, 84, 'greymont_scout')
    ],
    edges: [
      e('tool_bow', 'skill_archery', 'trains', 'trains'),
      e('skill_lumberjacking', 'recipe_arrows', 'produces', 'boards'),
      e('recipe_arrows', 'skill_archery', 'supports', 'ammo'),
      e('skill_tracking', 'ranger_goal', 'supports', 'route'),
      e('skill_survival', 'ranger_goal', 'supports', 'field safety'),
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
      n('action_mine_vein', 'action', 'Mine Vein', 'Use a pickaxe on ore-bearing stone.', 12, 54, 'mine-vein'),
      n('skill_mining', 'skill', 'Mining', 'Extracts ore and stone.', 28, 42, 'Mining'),
      n('tool_pickaxe', 'tool', 'Pickaxe', 'Targets rock faces and mine terrain.', 8, 72, 'pickaxe'),
      n('resource_iron_ore', 'resource', 'Iron Ore', 'Raw metal from mines and rocky outcrops.', 46, 38, 'iron_ore'),
      n('station_forge_artisan', 'station', 'Forge', 'Smelt, repair, and craft metal.', 54, 60, 'forge'),
      n('recipe_smelt_iron', 'recipe', 'Smelt Iron', 'Turns iron ore into bars.', 68, 36, 'smelt_iron'),
      n('output_iron_bars', 'output', 'Iron Bars', 'Refined metal used for tools, armor, and repairs.', 78, 52, 'iron_bar'),
      n('skill_blacksmithing', 'skill', 'Blacksmithing', 'Metal craft and repair skill.', 86, 68, 'Blacksmithing'),
      n('service_smith_contracts', 'service', 'Smith Contracts', 'Profession contracts turn repairs and orders into local demand.', 72, 84, 'smith_contracts'),
      n('future_guild_contracts', 'future', 'Guild Contracts', 'Future larger-scale metal commissions and specialist orders.', 92, 24, 'guild_contracts'),
      n('milestone_artisan', 'milestone', 'Artisan Mark', 'Fulfill orders with your own materials.', 50, 88, 'briarbrook_artisan')
    ],
    edges: [
      e('tool_pickaxe', 'action_mine_vein', 'requires', 'uses'),
      e('action_mine_vein', 'skill_mining', 'trains', 'trains'),
      e('skill_mining', 'resource_iron_ore', 'produces', 'ore'),
      e('resource_iron_ore', 'recipe_smelt_iron', 'consumes', 'smelts'),
      e('station_forge_artisan', 'recipe_smelt_iron', 'requires', 'station'),
      e('recipe_smelt_iron', 'output_iron_bars', 'produces', 'bars'),
      e('output_iron_bars', 'skill_blacksmithing', 'supports', 'materials'),
      e('skill_blacksmithing', 'service_smith_contracts', 'unlocks', 'orders'),
      e('skill_blacksmithing', 'future_guild_contracts', 'supports', 'future work'),
      e('service_smith_contracts', 'milestone_artisan', 'unlocks', 'orders')
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
      n('recipe_health_potion', 'recipe', 'Health Potion', 'Alchemy route for recovery supplies.', 78, 74, 'brew_heal_potion'),
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
  },
  {
    id: 'trader',
    title: 'Trader',
    summary: 'Work orders, appraisal, demand reading, bank access, and local service trust.',
    color: '#d4b46f',
    skills: ['Item Identification', 'Arms Lore', 'Begging', 'Cooking', 'Tailoring', 'Inscription'],
    suggestedGoal: 'Read demand, appraise useful goods, and fulfill one local order.',
    nodes: [
      n('trader_goal', 'goal', 'Market Broker', 'Turn local demand into useful deliveries without becoming a class.', 50, 14),
      n('service_market_board', 'service', 'Market Board', 'Work orders and demand signals.', 18, 40, 'market_board'),
      n('skill_item_identification_trader', 'skill', 'Item Identification', 'Reveals value and risk on unusual goods.', 42, 38, 'Item Identification'),
      n('skill_arms_lore_trader', 'skill', 'Arms Lore', 'Appraises gear condition and repair value.', 62, 52, 'Arms Lore'),
      n('service_bank_access', 'service', 'Bank Access', 'Lets town orders pull from safe stored stock.', 76, 34, 'bank'),
      n('output_vendor_contract', 'output', 'Vendor Contract', 'Treasure and trade output that feeds service work.', 32, 66, 'vendor_contract'),
      n('milestone_trader_broker', 'milestone', 'Market Broker', 'Fulfill orders and read demand.', 60, 86, 'trader_broker')
    ],
    edges: [
      e('service_market_board', 'trader_goal', 'supports', 'demand'),
      e('skill_item_identification_trader', 'output_vendor_contract', 'supports', 'appraises'),
      e('skill_arms_lore_trader', 'service_market_board', 'supports', 'gear value'),
      e('service_bank_access', 'service_market_board', 'supports', 'stored stock'),
      e('output_vendor_contract', 'milestone_trader_broker', 'unlocks', 'orders'),
      e('service_market_board', 'milestone_trader_broker', 'unlocks', 'work order tier')
    ]
  }
];

export type ProfessionContractId = 'ranger' | 'smith' | 'treasure_hunter' | 'field_medic' | 'hedge_mage' | 'builder' | 'trader';
export type ProfessionContractRewardType = 'reputation' | 'recipe_access' | 'milestone' | 'title_cosmetic' | 'work_order_tier' | 'station_efficiency' | 'ui_preview' | 'passive_bonus';

export interface ProfessionContractObjective {
  id: string;
  label: string;
  required: number;
  skills: SkillId[];
}

export interface ProfessionContractReward {
  type: ProfessionContractRewardType;
  label: string;
}

export interface ProfessionContract {
  id: ProfessionContractId;
  title: string;
  professionId: ProfessionId;
  teaches: string;
  skills: SkillId[];
  objectives: ProfessionContractObjective[];
  rewards: ProfessionContractReward[];
  classless: true;
}

export interface ProfessionContractObjectiveProgress extends ProfessionContractObjective {
  current: number;
  done: boolean;
}

export interface ProfessionContractProgress {
  contract: ProfessionContract;
  active: boolean;
  complete: boolean;
  progress: number;
  objectives: ProfessionContractObjectiveProgress[];
  nextObjective: ProfessionContractObjectiveProgress | null;
  rewardSummary: string;
}

export const professionContracts: ProfessionContract[] = [
  {
    id: 'ranger',
    title: 'Ranger Contract',
    professionId: 'ranger',
    teaches: 'Scout roads, harvest field supplies, craft arrows, and turn wilderness risk into safer ranged travel.',
    skills: ['Archery', 'Tracking', 'Survival', 'Lumberjacking', 'Bowcraft/Fletching'],
    objectives: [
      contractObjective('ranger_scout_roads', 'Scout Old River Road', 1, ['Tracking', 'Survival']),
      contractObjective('ranger_hunt_animals', 'Hunt animals or recover leather', 2, ['Archery', 'Survival']),
      contractObjective('ranger_craft_arrows', 'Craft or stock 50 arrows', 50, ['Bowcraft/Fletching', 'Lumberjacking'])
    ],
    rewards: [
      { type: 'reputation', label: 'Briarbrook road reputation' },
      { type: 'milestone', label: 'Greymont Scout milestone' },
      { type: 'recipe_access', label: 'Arrow bundle route preview' }
    ],
    classless: true
  },
  {
    id: 'smith',
    title: 'Smith Contract',
    professionId: 'smith_artisan',
    teaches: 'Mine ore, repair gear, and craft practical tools for town orders without locking into a smith class.',
    skills: ['Mining', 'Blacksmithing', 'Arms Lore', 'Item Identification', 'Tinkering'],
    objectives: [
      contractObjective('smith_mine_ore', 'Mine or carry 8 iron ore', 8, ['Mining']),
      contractObjective('smith_repair_gear', 'Repair 1 damaged item', 1, ['Blacksmithing', 'Arms Lore']),
      contractObjective('smith_craft_tools', 'Craft tools or spend iron bars', 1, ['Blacksmithing', 'Tinkering'])
    ],
    rewards: [
      { type: 'ui_preview', label: 'Better repair cost preview' },
      { type: 'milestone', label: 'Briarbrook Artisan milestone' },
      { type: 'station_efficiency', label: 'station efficiency: small forge queue clarity boost' }
    ],
    classless: true
  },
  {
    id: 'treasure_hunter',
    title: 'Treasure Hunter Contract',
    professionId: 'treasure_hunter',
    teaches: 'Map, reveal, pick locks, and disarm traps so treasure risk is solved by play, not class choice.',
    skills: ['Cartography', 'Detect Hidden', 'Lockpicking', 'Remove Trap', 'Item Identification'],
    objectives: [
      contractObjective('treasure_map_progress', 'Assemble or carry treasure clues', 1, ['Cartography']),
      contractObjective('treasure_reveal_secret', 'Reveal a hidden cache or trap', 1, ['Detect Hidden', 'Item Identification']),
      contractObjective('treasure_lock_or_trap', 'Pick a lock or disarm a trap', 1, ['Lockpicking', 'Remove Trap'])
    ],
    rewards: [
      { type: 'ui_preview', label: 'Clearer treasure-map clue preview' },
      { type: 'milestone', label: 'Treasure Hunter Initiate milestone' },
      { type: 'title_cosmetic', label: 'Treasure Seeker title hook' }
    ],
    classless: true
  },
  {
    id: 'field_medic',
    title: 'Field Medic Contract',
    professionId: 'healer',
    teaches: 'Heal under pressure, keep bandages stocked, and prepare poison cures as a practical support lane.',
    skills: ['Healing', 'Anatomy', 'Alchemy', 'Magery', 'Focus'],
    objectives: [
      contractObjective('medic_heal_combat', 'Apply 1 bandage in combat', 1, ['Healing', 'Anatomy']),
      contractObjective('medic_craft_bandages', 'Craft or carry 12 bandages', 12, ['Healing', 'Tailoring']),
      contractObjective('medic_cure_poison', 'Learn Cure or carry a cure potion', 1, ['Alchemy', 'Magery'])
    ],
    rewards: [
      { type: 'ui_preview', label: 'Better bandage outcome preview' },
      { type: 'milestone', label: 'Field Medic milestone' },
      { type: 'recipe_access', label: 'Cure potion route reminder' }
    ],
    classless: true
  },
  {
    id: 'hedge_mage',
    title: 'Hedge Mage Contract',
    professionId: 'hedge_mage',
    teaches: 'Gather reagents, cast utility, and identify magical risk while remaining fully classless.',
    skills: ['Magery', 'Meditation', 'Evaluating Intelligence', 'Item Identification', 'Inscription', 'Alchemy'],
    objectives: [
      contractObjective('mage_gather_reagents', 'Gather or carry 6 reagents', 6, ['Alchemy', 'Magery']),
      contractObjective('mage_cast_utility', 'Cast utility magic or know Detect Magic', 1, ['Magery', 'Meditation']),
      contractObjective('mage_identify_magic', 'Identify magical risk or raise Item Identification', 1, ['Item Identification', 'Evaluating Intelligence'])
    ],
    rewards: [
      { type: 'ui_preview', label: 'Spell failure and reagent preview clarity' },
      { type: 'milestone', label: 'Hedge Mage milestone' },
      { type: 'work_order_tier', label: 'work order tier: novice mage supply requests' }
    ],
    classless: true
  },
  {
    id: 'builder',
    title: 'Builder Contract',
    professionId: 'builder',
    teaches: 'Gather materials, place functional housing objects, and turn the plot into a workshop path.',
    skills: ['Lumberjacking', 'Carpentry', 'Mining', 'Tinkering', 'Tailoring'],
    objectives: [
      contractObjective('builder_gather_materials', 'Gather or carry 24 build materials', 24, ['Lumberjacking', 'Mining']),
      contractObjective('builder_place_object', 'Place 1 housing object', 1, ['Carpentry']),
      contractObjective('builder_functional_housing', 'Place 2 functional housing objects', 2, ['Carpentry', 'Tinkering'])
    ],
    rewards: [
      { type: 'milestone', label: 'Plot Steward milestone' },
      { type: 'recipe_access', label: 'Home workshop recipe reminders' },
      { type: 'station_efficiency', label: 'station efficiency: small home crafting duration boost' }
    ],
    classless: true
  },
  {
    id: 'trader',
    title: 'Trader Contract',
    professionId: 'trader',
    teaches: 'Fulfill work orders, appraise goods, and manage local demand without adding an auction-house class.',
    skills: ['Item Identification', 'Arms Lore', 'Begging', 'Cooking', 'Tailoring', 'Inscription'],
    objectives: [
      contractObjective('trader_fulfill_order', 'Fulfill 1 work order', 1, ['Cooking', 'Tailoring', 'Inscription']),
      contractObjective('trader_appraise_goods', 'Appraise goods or identify item value', 1, ['Item Identification', 'Arms Lore']),
      contractObjective('trader_manage_demand', 'Complete a market transaction or read demand', 1, ['Begging', 'Item Identification'])
    ],
    rewards: [
      { type: 'work_order_tier', label: 'work order tier: better service-board sorting' },
      { type: 'milestone', label: 'Market Broker milestone' },
      { type: 'title_cosmetic', label: 'Broker title hook' }
    ],
    classless: true
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
  },
  {
    id: 'trader_broker',
    professionId: 'trader',
    title: 'Market Broker',
    description: 'Read demand and fulfill service work without becoming a trade class.',
    requirements: [
      { type: 'workOrdersCompleted', count: 1 },
      { type: 'skill', skillId: 'Item Identification', value: 10 },
      { type: 'areaDiscovered', areaId: 'bank' }
    ],
    rewardType: 'quality_of_life',
    reward: 'Work-order tier previews and demand labels become clearer.',
    visibleWhen: [{ type: 'areaDiscovered', areaId: 'town' }],
    unlockMessage: 'Market Broker: you can read Briarbrook demand.'
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

export function professionContractById(id: string | null | undefined): ProfessionContract | undefined {
  return professionContracts.find((contract) => contract.id === id);
}

export function deriveProfessionContractProgress(state: GameState, contractId: ProfessionContractId): ProfessionContractProgress {
  const contract = professionContractById(contractId);
  if (!contract) throw new Error(`Unknown profession contract: ${contractId}`);
  const objectives = contract.objectives.map((objective) => {
    const current = contractObjectiveCurrent(state, objective.id);
    return {
      ...objective,
      current,
      done: current >= objective.required
    };
  });
  const done = objectives.filter((objective) => objective.done).length;
  return {
    contract,
    active: state.ui.activeProfessionContractId === contract.id,
    complete: done === objectives.length,
    progress: done / objectives.length,
    objectives,
    nextObjective: objectives.find((objective) => !objective.done) ?? null,
    rewardSummary: contract.rewards.map((reward) => `${reward.type.replaceAll('_', ' ')}: ${reward.label}`).join(' · ')
  };
}

export function deriveProfessionContractProgresses(state: GameState): ProfessionContractProgress[] {
  return professionContracts.map((contract) => deriveProfessionContractProgress(state, contract.id));
}

function contractObjective(id: string, label: string, required: number, skills: SkillId[]): ProfessionContractObjective {
  return { id, label, required, skills };
}

function contractObjectiveCurrent(state: GameState, id: string): number {
  switch (id) {
    case 'ranger_scout_roads':
      return state.world.discoveredAreas.includes('road') || state.player.currentArea === 'road' ? 1 : 0;
    case 'ranger_hunt_animals':
      return itemTotal(state, 'leather') + (state.dev.telemetry.skillEvents.Archery ?? 0);
    case 'ranger_craft_arrows':
      return itemTotal(state, 'arrow');
    case 'smith_mine_ore':
      return itemTotal(state, 'iron_ore') + (state.dev.telemetry.resourceYields.iron_ore ?? 0);
    case 'smith_repair_gear':
      return state.dev.telemetry.repairsCompleted ?? 0;
    case 'smith_craft_tools':
      return (state.dev.telemetry.resourceOutflow.iron_bar ?? 0) > 0 ? 1 : 0;
    case 'treasure_map_progress':
      return itemTotal(state, 'rough_treasure_map') + itemTotal(state, 'map_fragment') + Number(Object.values(state.world.treasure.maps).some((map) => map.fragmentCount > 0 || map.decipheredPrecision > 0 || map.found));
    case 'treasure_reveal_secret':
      return Object.values(state.world.treasure.secrets).some((secret) => secret.revealedUntil > state.clock || secret.opened || secret.disarmed || secret.triggered) ? 1 : 0;
    case 'treasure_lock_or_trap':
      return Math.max(state.dev.telemetry.skillEvents.Lockpicking ?? 0, state.dev.telemetry.skillEvents['Remove Trap'] ?? 0, Object.values(state.world.treasure.secrets).some((secret) => secret.opened || secret.disarmed) ? 1 : 0);
    case 'medic_heal_combat':
      return state.dev.telemetry.combatBandagesApplied ?? 0;
    case 'medic_craft_bandages':
      return itemTotal(state, 'bandage') + (state.dev.telemetry.resourceOutflow.clean_cloth ?? 0);
    case 'medic_cure_poison':
      return state.player.spellbook.knownSpellIds.includes('cure') || itemTotal(state, 'cure_potion') > 0 ? 1 : 0;
    case 'mage_gather_reagents':
      return itemTotal(state, 'ginseng') + itemTotal(state, 'garlic') + itemTotal(state, 'sulfurous_ash') + itemTotal(state, 'spider_silk');
    case 'mage_cast_utility':
      return state.player.spellbook.knownSpellIds.includes('detect_magic') || state.player.spellbook.knownSpellIds.includes('night_sight') || (state.dev.telemetry.skillEvents.Magery ?? 0) > 0 ? 1 : 0;
    case 'mage_identify_magic':
      return (state.dev.telemetry.skillEvents['Item Identification'] ?? 0) > 0 || (state.player.skills['Item Identification']?.realValue ?? 0) >= 10 ? 1 : 0;
    case 'builder_gather_materials':
      return itemTotal(state, 'wood') + itemTotal(state, 'stone_block') + (state.dev.telemetry.resourceYields.wood ?? 0) + (state.dev.telemetry.resourceYields.stone_block ?? 0);
    case 'builder_place_object':
      return state.world.placedBuildings.filter((building) => building.area === 'housing').length;
    case 'builder_functional_housing':
      return state.world.placedBuildings.filter((building) => building.area === 'housing' && Boolean(building.functionType)).length;
    case 'trader_fulfill_order':
      return state.dev.telemetry.workOrdersCompleted ?? 0;
    case 'trader_appraise_goods':
      return Math.max(state.dev.telemetry.skillEvents['Item Identification'] ?? 0, state.dev.telemetry.skillEvents['Arms Lore'] ?? 0, (state.player.skills['Item Identification']?.realValue ?? 0) >= 10 ? 1 : 0);
    case 'trader_manage_demand':
      return Math.max(state.dev.telemetry.marketTransactions ?? 0, state.world.economy.demandSignals.length ? 1 : 0);
    default:
      return 0;
  }
}

function itemTotal(state: GameState, itemId: string): number {
  const inventory = state.player.inventory.slots.reduce((total, slot) => total + (slot?.itemId === itemId ? slot.quantity : 0), 0);
  const bank = state.player.bank.slots.reduce((total, slot) => total + (slot?.itemId === itemId ? slot.quantity : 0), 0);
  const equipment = Object.values(state.player.equipment).reduce((total, slot) => total + (slot?.itemId === itemId ? slot.quantity : 0), 0);
  return inventory + bank + equipment;
}

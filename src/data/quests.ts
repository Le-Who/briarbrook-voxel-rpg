import type { QuestState } from '../game/types';

export const tutorialQuestIds = [
  'prepare_for_road',
  'ore_for_brom',
  'mages_errand',
  'patch_yourself_up',
  'trouble_on_road',
  'bones_beneath',
  'place_to_call_yours'
];

export const tutorialQuestPrerequisites: Partial<Record<string, string[]>> = {
  ore_for_brom: ['prepare_for_road'],
  mages_errand: ['prepare_for_road'],
  patch_yourself_up: ['prepare_for_road'],
  trouble_on_road: ['ore_for_brom', 'mages_errand', 'patch_yourself_up'],
  bones_beneath: ['trouble_on_road'],
  place_to_call_yours: ['bones_beneath']
};

export function questPrerequisitesMet(questId: string, completedQuestIds: string[]): boolean {
  return (tutorialQuestPrerequisites[questId] ?? []).every((id) => completedQuestIds.includes(id));
}

export const createInitialQuests = (): Record<string, QuestState> => ({
  prepare_for_road: {
    id: 'prepare_for_road',
    title: 'Prepare for the Road',
    giver: 'Mira',
    description: 'Mira walks Valen through the basic road kit before sending him beyond Briarbrook.',
    objectives: [
      { type: 'talk', label: 'Talk to Mira at the fountain', npcName: 'Mira', required: 1, progress: 0 },
      { type: 'open_panel', label: 'Open Skills with K', panel: 'skills', required: 1, progress: 0 },
      { type: 'gather', label: 'Use your axe on any tree', skillId: 'Lumberjacking', required: 1, progress: 0 },
      { type: 'collect', label: 'Carry 10 Logs', itemId: 'logs', required: 10, progress: 0 },
      { type: 'bank', label: 'Bank one spare resource with Eldon', required: 1, progress: 0 }
    ],
    rewards: {
      gold: 35,
      xp: 80,
      items: [
        { itemId: 'bandage', quantity: 4 },
        { itemId: 'boards', quantity: 8 },
        { itemId: 'sulfurous_ash', quantity: 4 }
      ]
    },
    status: 'active'
  },
  ore_for_brom: {
    id: 'ore_for_brom',
    title: 'Ore for Brom',
    giver: 'Brom',
    description: 'Brom needs Valen to mine a vein, smelt bars, and try the forge.',
    objectives: [
      { type: 'gather', label: 'Use a pickaxe on any mine rock', skillId: 'Mining', required: 1, progress: 0 },
      { type: 'collect', label: 'Carry 8 Iron Ore', itemId: 'iron_ore', required: 8, progress: 0 },
      { type: 'craft', label: 'Smelt Iron Bars at Broms forge', recipeId: 'smelt_iron', required: 1, progress: 0 },
      { type: 'craft', label: 'Craft or repair one simple iron tool', skillId: 'Blacksmithing', required: 1, progress: 0 }
    ],
    rewards: { gold: 55, xp: 90, items: [{ itemId: 'iron_bar', quantity: 4 }] },
    status: 'active'
  },
  mages_errand: {
    id: 'mages_errand',
    title: 'A Mages Errand',
    giver: 'Orren',
    description: 'Orren explains reagents, spell targeting, healing magic, and meditation.',
    objectives: [
      { type: 'buy', label: 'Buy sulfurous ash from Orren', itemId: 'sulfurous_ash', required: 1, progress: 0 },
      { type: 'open_panel', label: 'Open the Spellbook with M', panel: 'spellbook', required: 1, progress: 0 },
      { type: 'cast', label: 'Cast Magic Arrow', spellId: 'magic_arrow', required: 1, progress: 0 },
      { type: 'cast', label: 'Cast Heal', spellId: 'heal', required: 1, progress: 0 },
      { type: 'cast', label: 'Cast Night Sight before the road', spellId: 'night_sight', required: 1, progress: 0 },
      { type: 'meditate', label: 'Meditate to recover mana', required: 1, progress: 0 }
    ],
    rewards: {
      gold: 30,
      xp: 85,
      items: [
        { itemId: 'ginseng', quantity: 4 },
        { itemId: 'garlic', quantity: 4 },
        { itemId: 'black_pearl', quantity: 3 }
      ]
    },
    status: 'active'
  },
  patch_yourself_up: {
    id: 'patch_yourself_up',
    title: 'Patch Yourself Up',
    giver: 'Sela',
    description: 'Sela teaches Valen that bandages train Healing and Anatomy, especially under pressure.',
    objectives: [
      { type: 'bandage', label: 'Use a bandage on yourself', required: 1, progress: 0 },
      { type: 'open_panel', label: 'Open Combat Actions with A', panel: 'combatActions', required: 1, progress: 0 }
    ],
    rewards: { gold: 25, xp: 70, items: [{ itemId: 'health_potion', quantity: 2 }] },
    status: 'active'
  },
  trouble_on_road: {
    id: 'trouble_on_road',
    title: 'Trouble on the Road',
    giver: 'Gate Warden Alric',
    description: 'The road encounter teaches target frames, melee, archery, potions, and loot.',
    objectives: [
      { type: 'enter_area', label: 'Walk to Old River Road', areaId: 'road', required: 1, progress: 0 },
      { type: 'kill', label: 'Defeat a Highway Bandit', enemyName: 'Highway Bandit', required: 1, progress: 0 },
      { type: 'kill', label: 'Defeat the Bandit Archer', enemyName: 'Bandit Archer', required: 1, progress: 0 },
      { type: 'bard', label: 'Use Peacemaking, Provocation or Discordance on a foe', required: 1, progress: 0 },
      { type: 'loot', label: 'Pick up road loot', required: 1, progress: 0 }
    ],
    rewards: { gold: 75, xp: 130, items: [{ itemId: 'mana_potion', quantity: 2 }] },
    status: 'active'
  },
  bones_beneath: {
    id: 'bones_beneath',
    title: 'Bones Beneath Briarbrook',
    giver: 'Mira',
    description: 'The first dungeon asks Valen to enter the old mine, fight skeletons, and loot safely.',
    objectives: [
      { type: 'enter_area', label: 'Enter the Forgotten Crypt through the mine', areaId: 'crypt', required: 1, progress: 0 },
      { type: 'kill', label: 'Defeat 3 Skeletal Warriors', enemyName: 'Skeletal Warrior', required: 3, progress: 0 },
      { type: 'kill', label: 'Defeat the Mage Cultist', enemyName: 'Mage Cultist', required: 1, progress: 0 },
      { type: 'cast', label: 'Cast Detect Magic near the warded chest', spellId: 'detect_magic', required: 1, progress: 0 },
      { type: 'open_container', label: 'Open the Warded Reliquary', containerId: 'chest_crypt_warded', required: 1, progress: 0 },
      { type: 'loot', label: 'Collect crypt loot', required: 1, progress: 0 }
    ],
    rewards: { gold: 120, xp: 180, items: [{ itemId: 'silver_ring', quantity: 1 }] },
    status: 'active'
  },
  place_to_call_yours: {
    id: 'place_to_call_yours',
    title: 'A Place to Call Yours',
    giver: 'Joryn',
    description: 'Joryn points Valen toward the river plot and the first persistent house piece.',
    objectives: [
      { type: 'enter_area', label: 'Travel to the housing plot', areaId: 'housing', required: 1, progress: 0 },
      { type: 'build', label: 'Place one camp sign, plant pot, bedroll, chest, or campfire', required: 1, progress: 0 }
    ],
    rewards: {
      gold: 40,
      xp: 100,
      items: [
        { itemId: 'stone_block', quantity: 12 },
        { itemId: 'wood', quantity: 12 },
        { itemId: 'torch', quantity: 4 }
      ]
    },
    status: 'active'
  }
});

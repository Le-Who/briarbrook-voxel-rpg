import type { EconomyOrderCategory, EconomyState, MarketOrderState, WorkOrderState } from '../game/types';

export const marketCategories: Array<EconomyOrderCategory | 'all'> = ['all', 'metal', 'wood', 'healing', 'reagents', 'food', 'combat', 'banking', 'building', 'treasure', 'housing', 'misc'];

export const localDemandDefaults: EconomyState['localDemand'] = {
  metal: 1.1,
  wood: 1.08,
  healing: 1.14,
  reagents: 1.12,
  food: 1.06,
  combat: 1.1,
  banking: 1.04,
  building: 1.16,
  treasure: 1.2,
  housing: 1.18
};

export const vendorProfiles: Record<
  string,
  {
    role: string;
    buys: EconomyOrderCategory[];
    sells: EconomyOrderCategory[];
    buyModifier: number;
    sellModifier: number;
  }
> = {
  npc_brom_town: { role: 'blacksmith', buys: ['metal', 'combat'], sells: ['metal', 'combat'], buyModifier: 1.12, sellModifier: 1.08 },
  npc_brom_smithy: { role: 'blacksmith', buys: ['metal', 'combat'], sells: ['metal', 'combat'], buyModifier: 1.12, sellModifier: 1.08 },
  npc_corrin_town: { role: 'carpenter', buys: ['wood', 'housing', 'building'], sells: ['wood', 'housing'], buyModifier: 1.1, sellModifier: 1.06 },
  npc_orren_town: { role: 'mage vendor', buys: ['reagents', 'treasure'], sells: ['reagents'], buyModifier: 1.08, sellModifier: 1.1 },
  npc_ysolda_town: { role: 'alchemist', buys: ['healing', 'reagents'], sells: ['healing', 'reagents'], buyModifier: 1.12, sellModifier: 1.12 },
  npc_tavia_town: { role: 'tailor', buys: ['healing', 'housing'], sells: ['healing', 'housing'], buyModifier: 1.06, sellModifier: 1.08 },
  npc_torren_town: { role: 'provisioner', buys: ['food', 'combat'], sells: ['food'], buyModifier: 1.08, sellModifier: 1.05 },
  npc_tavern_town: { role: 'tavern', buys: ['food'], sells: ['food', 'treasure'], buyModifier: 1.14, sellModifier: 1.05 },
  npc_eldon_town: { role: 'banker', buys: ['banking', 'treasure'], sells: ['banking'], buyModifier: 1.02, sellModifier: 1.04 },
  npc_eldon_bank: { role: 'banker', buys: ['banking', 'treasure'], sells: ['banking'], buyModifier: 1.02, sellModifier: 1.04 },
  npc_rusk_town: { role: 'fletcher', buys: ['combat', 'wood'], sells: ['combat'], buyModifier: 1.1, sellModifier: 1.08 },
  npc_pavel_town: { role: 'tinker', buys: ['banking', 'combat'], sells: ['banking', 'combat'], buyModifier: 1.1, sellModifier: 1.1 }
};

export const workOrderTemplates: WorkOrderState[] = [
  {
    id: 'wo_brom_iron_bars',
    issuerNpcId: 'npc_brom_town',
    requester: 'Brom',
    category: 'metal',
    title: 'Smithy Ingot Reserve',
    description: 'Brom wants steady iron bars for repairs and militia tools.',
    itemId: 'iron_bar',
    quantity: 20,
    requiredItems: [{ itemId: 'iron_bar', quantity: 20 }],
    delivered: 0,
    rewardGold: 232,
    rewardSkillHints: ['Mining', 'Blacksmithing'],
    reputationGain: 2,
    skill: 'Blacksmithing',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'daily',
    difficultyTier: 2,
    status: 'open'
  },
  {
    id: 'wo_corrin_boards',
    issuerNpcId: 'npc_corrin_town',
    requester: 'Corrin',
    category: 'wood',
    title: 'Dry Board Delivery',
    description: 'The carpenter needs boards for furniture, fences, and plot repairs.',
    itemId: 'boards',
    quantity: 24,
    requiredItems: [{ itemId: 'boards', quantity: 24 }],
    delivered: 0,
    rewardGold: 168,
    rewardSkillHints: ['Carpentry', 'Lumberjacking'],
    reputationGain: 2,
    skill: 'Carpentry',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'daily',
    difficultyTier: 1,
    status: 'open'
  },
  {
    id: 'wo_sela_bandages',
    issuerNpcId: 'npc_sela_town',
    requester: 'Sela',
    category: 'healing',
    title: 'Guardhouse Bandage Stock',
    description: 'Sela burns through bandages after patrol injuries.',
    itemId: 'bandage',
    quantity: 8,
    requiredItems: [{ itemId: 'bandage', quantity: 8 }],
    delivered: 0,
    rewardGold: 108,
    rewardItems: [{ itemId: 'health_potion', quantity: 1 }],
    rewardSkillHints: ['Healing', 'Anatomy'],
    reputationGain: 1,
    skill: 'Healing',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'daily',
    difficultyTier: 1,
    status: 'open'
  },
  {
    id: 'wo_orren_reagents',
    issuerNpcId: 'npc_orren_town',
    requester: 'Orren',
    category: 'reagents',
    title: 'Reagent Bundle',
    description: 'The mage vendor needs common reagents bundled for students.',
    itemId: 'sulfurous_ash',
    quantity: 10,
    requiredItems: [
      { itemId: 'sulfurous_ash', quantity: 10 },
      { itemId: 'ginseng', quantity: 6 }
    ],
    delivered: 0,
    rewardGold: 156,
    rewardSkillHints: ['Magery', 'Inscription'],
    reputationGain: 1,
    skill: 'Inscription',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'daily',
    difficultyTier: 1,
    status: 'open'
  },
  {
    id: 'wo_ysolda_herbs',
    issuerNpcId: 'npc_ysolda_town',
    requester: 'Ysolda',
    category: 'reagents',
    title: 'Alchemist Herb Stock',
    description: 'Ysolda needs nightshade and blood moss for antidotes and field tonics.',
    itemId: 'nightshade',
    quantity: 8,
    requiredItems: [
      { itemId: 'nightshade', quantity: 8 },
      { itemId: 'blood_moss', quantity: 6 }
    ],
    delivered: 0,
    rewardGold: 146,
    rewardItems: [{ itemId: 'cure_potion', quantity: 1 }],
    rewardSkillHints: ['Alchemy', 'Item Identification'],
    reputationGain: 1,
    skill: 'Alchemy',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'daily',
    difficultyTier: 1,
    status: 'open'
  },
  {
    id: 'wo_torren_fish_bread',
    issuerNpcId: 'npc_torren_town',
    requester: 'Marshal Torren',
    category: 'food',
    title: 'Road Rations',
    description: 'Road patrols need bread and fish before leaving town.',
    itemId: 'fresh_bread',
    quantity: 10,
    requiredItems: [
      { itemId: 'fresh_bread', quantity: 10 },
      { itemId: 'raw_fish', quantity: 4 }
    ],
    delivered: 0,
    rewardGold: 118,
    rewardSkillHints: ['Cooking', 'Fishing'],
    reputationGain: 1,
    skill: 'Cooking',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'daily',
    difficultyTier: 1,
    status: 'open'
  },
  {
    id: 'wo_guard_arrows',
    issuerNpcId: 'npc_guard_west_town',
    requester: 'Gate Warden Alric',
    category: 'combat',
    title: 'Arrow Bundles For Patrol',
    description: 'The west gate wants arrows before the next bandit sweep.',
    itemId: 'arrow',
    quantity: 40,
    requiredItems: [{ itemId: 'arrow', quantity: 40 }],
    delivered: 0,
    rewardGold: 148,
    rewardSkillHints: ['Bowcraft/Fletching', 'Archery'],
    reputationGain: 2,
    skill: 'Bowcraft/Fletching',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'daily',
    difficultyTier: 1,
    status: 'open'
  },
  {
    id: 'wo_eldon_lockboxes',
    issuerNpcId: 'npc_eldon_town',
    requester: 'Eldon',
    category: 'banking',
    title: 'Lockbox Repair Kits',
    description: 'The banker pays for repair kits and gears to keep lockboxes moving.',
    itemId: 'repair_kit',
    quantity: 2,
    requiredItems: [
      { itemId: 'repair_kit', quantity: 2 },
      { itemId: 'gear', quantity: 2 }
    ],
    delivered: 0,
    rewardGold: 155,
    rewardSkillHints: ['Tinkering', 'Lockpicking'],
    reputationGain: 1,
    skill: 'Tinkering',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'rotating',
    difficultyTier: 2,
    status: 'open'
  },
  {
    id: 'wo_tavern_meals',
    issuerNpcId: 'npc_tavern_town',
    requester: 'Marella',
    category: 'food',
    title: 'Cooked Meal Rush',
    description: 'The tavern buys cooked bread and carrots before market night.',
    itemId: 'fresh_bread',
    quantity: 8,
    requiredItems: [
      { itemId: 'fresh_bread', quantity: 8 },
      { itemId: 'carrot', quantity: 6 }
    ],
    delivered: 0,
    rewardGold: 122,
    rewardSkillHints: ['Cooking'],
    reputationGain: 1,
    skill: 'Cooking',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'daily',
    difficultyTier: 1,
    status: 'open'
  },
  {
    id: 'wo_builder_stone',
    issuerNpcId: 'npc_dockhand_town',
    requester: 'Joryn',
    category: 'building',
    title: 'Plot Stone Blocks',
    description: 'The dock builder needs stone for plot piers and retaining walls.',
    itemId: 'stone_block',
    quantity: 18,
    requiredItems: [{ itemId: 'stone_block', quantity: 18 }],
    delivered: 0,
    rewardGold: 144,
    rewardSkillHints: ['Mining', 'Carpentry'],
    reputationGain: 1,
    skill: 'Mining',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'daily',
    difficultyTier: 1,
    status: 'open'
  },
  {
    id: 'wo_explorer_maps',
    issuerNpcId: 'npc_rohan_town',
    requester: 'Rohan',
    category: 'treasure',
    title: 'Explorer Map Fragments',
    description: 'Rohan trades gold for map fragments and crypt clues.',
    itemId: 'map_fragment',
    quantity: 2,
    requiredItems: [{ itemId: 'map_fragment', quantity: 2 }],
    delivered: 0,
    rewardGold: 132,
    rewardItems: [{ itemId: 'lockpick', quantity: 2 }],
    rewardSkillHints: ['Cartography', 'Detect Hidden'],
    reputationGain: 2,
    skill: 'Cartography',
    expiresAt: 120,
    expiresAtWorldTime: 120,
    repeatPolicy: 'rotating',
    difficultyTier: 2,
    status: 'open'
  },
  {
    id: 'wo_pavel_lockpicks',
    issuerNpcId: 'npc_pavel_town',
    requester: 'Pavel',
    category: 'banking',
    title: 'Lockpick Batch',
    description: 'The tinker wants a small batch of lockpicks for safe boxes.',
    itemId: 'lockpick',
    quantity: 8,
    requiredItems: [{ itemId: 'lockpick', quantity: 8 }],
    delivered: 0,
    rewardGold: 134,
    rewardSkillHints: ['Tinkering', 'Remove Trap'],
    reputationGain: 1,
    skill: 'Tinkering',
    expiresAt: 96,
    expiresAtWorldTime: 96,
    repeatPolicy: 'daily',
    difficultyTier: 1,
    status: 'open'
  }
];

export const marketOrderTemplates: MarketOrderState[] = [
  { id: 'mo_buy_logs', kind: 'buy', poster: 'Pyrel', issuerId: 'sim_pyrel', source: 'simulated_player', category: 'wood', itemId: 'logs', quantity: 6, unitPrice: 6, expiresAt: 60, demandMultiplier: 1.08, status: 'open' },
  { id: 'mo_buy_ore', kind: 'buy', poster: 'Brom', issuerId: 'npc_brom_town', source: 'npc', category: 'metal', itemId: 'iron_ore', quantity: 8, unitPrice: 8, expiresAt: 60, demandMultiplier: 1.1, status: 'open' },
  { id: 'mo_buy_bandage', kind: 'buy', poster: 'Guard Captain', issuerId: 'npc_guard_west_town', source: 'npc', category: 'healing', itemId: 'bandage', quantity: 5, unitPrice: 11, expiresAt: 60, demandMultiplier: 1.14, status: 'open' },
  { id: 'mo_buy_boards', kind: 'buy', poster: 'Corrin', issuerId: 'npc_corrin_town', source: 'npc', category: 'wood', itemId: 'boards', quantity: 10, unitPrice: 7, expiresAt: 70, demandMultiplier: 1.1, status: 'open' },
  { id: 'mo_buy_fish', kind: 'buy', poster: 'Marella', issuerId: 'npc_tavern_town', source: 'npc', category: 'food', itemId: 'raw_fish', quantity: 6, unitPrice: 6, expiresAt: 72, demandMultiplier: 1.08, status: 'open' },
  { id: 'mo_buy_map_fragments', kind: 'buy', poster: 'Rohan', issuerId: 'npc_rohan_town', source: 'npc', category: 'treasure', itemId: 'map_fragment', quantity: 1, unitPrice: 24, expiresAt: 82, demandMultiplier: 1.2, status: 'open' },
  { id: 'mo_sell_reagents', kind: 'sell', poster: 'Orren', issuerId: 'npc_orren_town', source: 'npc', category: 'reagents', itemId: 'black_pearl', quantity: 5, unitPrice: 14, expiresAt: 60, demandMultiplier: 1.12, status: 'open' },
  { id: 'mo_sell_lockpicks', kind: 'sell', poster: 'Pavel', issuerId: 'npc_pavel_town', source: 'npc', category: 'banking', itemId: 'lockpick', quantity: 5, unitPrice: 9, expiresAt: 60, demandMultiplier: 1.04, status: 'open' },
  { id: 'mo_sell_potions', kind: 'sell', poster: 'Ysolda', issuerId: 'npc_ysolda_town', source: 'npc', category: 'healing', itemId: 'health_potion', quantity: 2, unitPrice: 22, expiresAt: 60, demandMultiplier: 1.14, status: 'open' },
  { id: 'mo_sell_torches', kind: 'sell', poster: 'Kippa', issuerId: 'sim_kippa', source: 'simulated_player', category: 'combat', itemId: 'torch', quantity: 4, unitPrice: 8, expiresAt: 64, demandMultiplier: 1.05, status: 'open' }
];

export function createInitialEconomyState(): EconomyState {
  return {
    workOrders: workOrderTemplates.map((order) => ({ ...order, requiredItems: order.requiredItems?.map((item) => ({ ...item })), rewardItems: order.rewardItems?.map((item) => ({ ...item })) })),
    marketOrders: marketOrderTemplates.map((order) => ({ ...order })),
    transactionLog: [],
    lastDailySeed: 0,
    localDemand: { ...localDemandDefaults },
    priceTrends: {}
  };
}

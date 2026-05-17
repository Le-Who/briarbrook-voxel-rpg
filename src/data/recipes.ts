import type { Recipe, RecipeOutput, RecipeRequirement, StationType } from '../game/types';

interface RecipeConfig {
  id: string;
  name: string;
  skill: string;
  stationType: StationType;
  minSkill: number;
  difficulty: number;
  duration: number;
  inputs: RecipeRequirement[];
  outputs: RecipeOutput[];
  exceptionalChance?: number;
  qualityTier?: Recipe['qualityTier'];
  failureMode?: Recipe['failureMode'];
  toolRequired?: string;
}

const recipe = (config: RecipeConfig): Recipe => {
  const primary = config.outputs[0];
  return {
    ...config,
    exceptionalChance: config.exceptionalChance ?? 0.04,
    qualityTier: config.qualityTier ?? 'standard',
    failureMode: config.failureMode ?? 'partial-refund',
    outputItemId: primary.itemId,
    outputQuantity: primary.quantity,
    level: Math.max(1, Math.round(config.minSkill / 2)),
    requirements: config.inputs
  };
};

export const stationLabels: Record<StationType, string> = {
  forge: 'Forge + Anvil',
  carpentry: 'Carpenter Bench',
  fletching: 'Fletching Table',
  alchemy: 'Alchemy Table',
  scribe: 'Scribe Desk',
  tailor: 'Tailor Loom',
  cooking: 'Cooking Fire',
  tinkering: 'Tinkering Bench'
};

export const recipes: Recipe[] = [
  recipe({
    id: 'smelt_iron',
    name: 'Smelt Iron Bars',
    skill: 'Mining',
    stationType: 'forge',
    minSkill: 1,
    difficulty: 18,
    duration: 4,
    inputs: [{ itemId: 'iron_ore', quantity: 4 }],
    outputs: [{ itemId: 'iron_bar', quantity: 2, materialType: 'iron' }]
  }),
  recipe({
    id: 'smelt_copper',
    name: 'Smelt Copper Bars',
    skill: 'Mining',
    stationType: 'forge',
    minSkill: 1,
    difficulty: 15,
    duration: 4,
    inputs: [{ itemId: 'copper_ore', quantity: 4 }],
    outputs: [{ itemId: 'copper_bar', quantity: 2, materialType: 'copper' }]
  }),
  recipe({
    id: 'iron_sword',
    name: 'Iron Sword',
    skill: 'Blacksmithing',
    stationType: 'forge',
    minSkill: 10,
    difficulty: 28,
    duration: 6,
    inputs: [
      { itemId: 'iron_bar', quantity: 4 },
      { itemId: 'leather', quantity: 1 }
    ],
    outputs: [{ itemId: 'iron_sword', quantity: 1, materialType: 'iron' }],
    exceptionalChance: 0.08
  }),
  recipe({
    id: 'iron_axe',
    name: 'Iron Axe',
    skill: 'Blacksmithing',
    stationType: 'forge',
    minSkill: 8,
    difficulty: 24,
    duration: 5,
    inputs: [
      { itemId: 'iron_bar', quantity: 3 },
      { itemId: 'wood', quantity: 2 }
    ],
    outputs: [{ itemId: 'axe', quantity: 1, materialType: 'iron' }]
  }),
  recipe({
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    skill: 'Blacksmithing',
    stationType: 'forge',
    minSkill: 8,
    difficulty: 24,
    duration: 5,
    inputs: [
      { itemId: 'iron_bar', quantity: 3 },
      { itemId: 'wood', quantity: 2 }
    ],
    outputs: [{ itemId: 'pickaxe', quantity: 1, materialType: 'iron' }]
  }),
  recipe({
    id: 'iron_armor',
    name: 'Iron Armor',
    skill: 'Blacksmithing',
    stationType: 'forge',
    minSkill: 20,
    difficulty: 42,
    duration: 8,
    inputs: [
      { itemId: 'iron_bar', quantity: 16 },
      { itemId: 'leather', quantity: 6 }
    ],
    outputs: [{ itemId: 'iron_armor', quantity: 1, materialType: 'iron' }],
    exceptionalChance: 0.06,
    qualityTier: 'fine'
  }),
  recipe({
    id: 'iron_helmet',
    name: 'Iron Helmet',
    skill: 'Blacksmithing',
    stationType: 'forge',
    minSkill: 14,
    difficulty: 34,
    duration: 6,
    inputs: [
      { itemId: 'iron_bar', quantity: 7 },
      { itemId: 'leather', quantity: 2 }
    ],
    outputs: [{ itemId: 'iron_helmet', quantity: 1, materialType: 'iron' }]
  }),
  recipe({
    id: 'iron_boots',
    name: 'Iron Boots',
    skill: 'Blacksmithing',
    stationType: 'forge',
    minSkill: 14,
    difficulty: 32,
    duration: 6,
    inputs: [
      { itemId: 'iron_bar', quantity: 6 },
      { itemId: 'leather', quantity: 3 }
    ],
    outputs: [{ itemId: 'iron_boots', quantity: 1, materialType: 'iron' }]
  }),
  recipe({
    id: 'iron_shield',
    name: 'Iron Shield',
    skill: 'Blacksmithing',
    stationType: 'forge',
    minSkill: 16,
    difficulty: 36,
    duration: 7,
    inputs: [
      { itemId: 'iron_bar', quantity: 8 },
      { itemId: 'boards', quantity: 2 }
    ],
    outputs: [{ itemId: 'iron_shield', quantity: 1, materialType: 'iron' }]
  }),
  recipe({
    id: 'saw_boards',
    name: 'Saw Boards',
    skill: 'Carpentry',
    stationType: 'carpentry',
    minSkill: 0,
    difficulty: 12,
    duration: 3,
    inputs: [{ itemId: 'logs', quantity: 2 }],
    outputs: [{ itemId: 'boards', quantity: 4, materialType: 'common wood' }]
  }),
  recipe({
    id: 'crate_kit',
    name: 'Crate Kit',
    skill: 'Carpentry',
    stationType: 'carpentry',
    minSkill: 5,
    difficulty: 18,
    duration: 4,
    inputs: [{ itemId: 'boards', quantity: 3 }],
    outputs: [{ itemId: 'crate_kit', quantity: 1, materialType: 'common wood' }]
  }),
  recipe({
    id: 'storage_chest',
    name: 'Storage Chest',
    skill: 'Carpentry',
    stationType: 'carpentry',
    minSkill: 12,
    difficulty: 28,
    duration: 6,
    inputs: [
      { itemId: 'boards', quantity: 6 },
      { itemId: 'iron_bar', quantity: 1 }
    ],
    outputs: [{ itemId: 'storage_chest', quantity: 1, materialType: 'common wood' }]
  }),
  recipe({
    id: 'wood_door_kit',
    name: 'Wood Door Kit',
    skill: 'Carpentry',
    stationType: 'carpentry',
    minSkill: 10,
    difficulty: 24,
    duration: 5,
    inputs: [
      { itemId: 'boards', quantity: 4 },
      { itemId: 'gear', quantity: 1 }
    ],
    outputs: [{ itemId: 'wood_door_kit', quantity: 1, materialType: 'common wood' }]
  }),
  recipe({
    id: 'wooden_chair',
    name: 'Wooden Chair',
    skill: 'Carpentry',
    stationType: 'carpentry',
    minSkill: 8,
    difficulty: 20,
    duration: 5,
    inputs: [{ itemId: 'boards', quantity: 3 }],
    outputs: [{ itemId: 'furniture_chair', quantity: 1, materialType: 'common wood' }]
  }),
  recipe({
    id: 'arrow_bundle',
    name: 'Arrow Bundle',
    skill: 'Bowcraft/Fletching',
    stationType: 'fletching',
    minSkill: 0,
    difficulty: 12,
    duration: 3,
    inputs: [
      { itemId: 'boards', quantity: 1 },
      { itemId: 'kindling', quantity: 1 }
    ],
    outputs: [{ itemId: 'arrow', quantity: 25 }]
  }),
  recipe({
    id: 'bolt_bundle',
    name: 'Bolt Bundle',
    skill: 'Bowcraft/Fletching',
    stationType: 'fletching',
    minSkill: 8,
    difficulty: 20,
    duration: 4,
    inputs: [
      { itemId: 'boards', quantity: 1 },
      { itemId: 'iron_bar', quantity: 1 }
    ],
    outputs: [{ itemId: 'bolt', quantity: 18 }]
  }),
  recipe({
    id: 'oak_bow',
    name: 'Oak Bow',
    skill: 'Bowcraft/Fletching',
    stationType: 'fletching',
    minSkill: 14,
    difficulty: 30,
    duration: 6,
    inputs: [
      { itemId: 'oak_logs', quantity: 2 },
      { itemId: 'spider_silk', quantity: 2 }
    ],
    outputs: [{ itemId: 'oak_bow', quantity: 1, materialType: 'oak' }],
    exceptionalChance: 0.08
  }),
  recipe({
    id: 'crossbow',
    name: 'Light Crossbow',
    skill: 'Bowcraft/Fletching',
    stationType: 'fletching',
    minSkill: 20,
    difficulty: 38,
    duration: 7,
    inputs: [
      { itemId: 'boards', quantity: 4 },
      { itemId: 'gear', quantity: 1 },
      { itemId: 'iron_bar', quantity: 2 }
    ],
    outputs: [{ itemId: 'crossbow', quantity: 1, materialType: 'wood and iron' }]
  }),
  recipe({
    id: 'cut_bandages',
    name: 'Cut Bandages',
    skill: 'Tailoring',
    stationType: 'tailor',
    minSkill: 0,
    difficulty: 10,
    duration: 2,
    inputs: [{ itemId: 'clean_cloth', quantity: 2 }],
    outputs: [{ itemId: 'bandage', quantity: 8 }]
  }),
  recipe({
    id: 'mage_robe',
    name: 'Mage Robe',
    skill: 'Tailoring',
    stationType: 'tailor',
    minSkill: 12,
    difficulty: 26,
    duration: 5,
    inputs: [
      { itemId: 'clean_cloth', quantity: 6 },
      { itemId: 'spider_silk', quantity: 2 }
    ],
    outputs: [{ itemId: 'cloth_robe', quantity: 1, materialType: 'cloth' }]
  }),
  recipe({
    id: 'leather_armor',
    name: 'Leather Armor',
    skill: 'Tailoring',
    stationType: 'tailor',
    minSkill: 16,
    difficulty: 32,
    duration: 6,
    inputs: [
      { itemId: 'leather', quantity: 8 },
      { itemId: 'clean_cloth', quantity: 2 }
    ],
    outputs: [{ itemId: 'leather_armor', quantity: 1, materialType: 'leather' }],
    exceptionalChance: 0.08
  }),
  recipe({
    id: 'sewn_backpack',
    name: 'Sewn Backpack',
    skill: 'Tailoring',
    stationType: 'tailor',
    minSkill: 8,
    difficulty: 22,
    duration: 4,
    inputs: [
      { itemId: 'leather', quantity: 3 },
      { itemId: 'clean_cloth', quantity: 2 }
    ],
    outputs: [{ itemId: 'backpack', quantity: 1, materialType: 'leather' }]
  }),
  recipe({
    id: 'brew_heal_potion',
    name: 'Health Potion',
    skill: 'Alchemy',
    stationType: 'alchemy',
    minSkill: 0,
    difficulty: 16,
    duration: 4,
    inputs: [
      { itemId: 'ginseng', quantity: 2 },
      { itemId: 'garlic', quantity: 1 }
    ],
    outputs: [{ itemId: 'health_potion', quantity: 2 }]
  }),
  recipe({
    id: 'brew_mana_potion',
    name: 'Mana Potion',
    skill: 'Alchemy',
    stationType: 'alchemy',
    minSkill: 8,
    difficulty: 22,
    duration: 4,
    inputs: [
      { itemId: 'black_pearl', quantity: 1 },
      { itemId: 'mandrake_root', quantity: 1 }
    ],
    outputs: [{ itemId: 'mana_potion', quantity: 2 }]
  }),
  recipe({
    id: 'brew_refresh_potion',
    name: 'Refresh Potion',
    skill: 'Alchemy',
    stationType: 'alchemy',
    minSkill: 6,
    difficulty: 20,
    duration: 4,
    inputs: [
      { itemId: 'blood_moss', quantity: 1 },
      { itemId: 'ginseng', quantity: 1 }
    ],
    outputs: [{ itemId: 'refresh_potion', quantity: 2 }]
  }),
  recipe({
    id: 'brew_cure_potion',
    name: 'Cure Potion',
    skill: 'Alchemy',
    stationType: 'alchemy',
    minSkill: 12,
    difficulty: 28,
    duration: 5,
    inputs: [
      { itemId: 'garlic', quantity: 2 },
      { itemId: 'ginseng', quantity: 1 }
    ],
    outputs: [{ itemId: 'cure_potion', quantity: 1 }]
  }),
  recipe({
    id: 'brew_poison_potion',
    name: 'Lesser Poison',
    skill: 'Alchemy',
    stationType: 'alchemy',
    minSkill: 15,
    difficulty: 32,
    duration: 5,
    inputs: [
      { itemId: 'nightshade', quantity: 2 },
      { itemId: 'spider_silk', quantity: 1 }
    ],
    outputs: [{ itemId: 'poison_potion', quantity: 1 }]
  }),
  recipe({
    id: 'brew_explosion_potion',
    name: 'Explosion Potion',
    skill: 'Alchemy',
    stationType: 'alchemy',
    minSkill: 22,
    difficulty: 42,
    duration: 6,
    inputs: [
      { itemId: 'sulfurous_ash', quantity: 2 },
      { itemId: 'black_pearl', quantity: 1 }
    ],
    outputs: [{ itemId: 'explosion_potion', quantity: 1 }]
  }),
  recipe({
    id: 'blank_scrolls',
    name: 'Prepare Blank Scrolls',
    skill: 'Inscription',
    stationType: 'scribe',
    minSkill: 0,
    difficulty: 12,
    duration: 3,
    inputs: [
      { itemId: 'clean_cloth', quantity: 1 },
      { itemId: 'bark_fragment', quantity: 1 }
    ],
    outputs: [{ itemId: 'parchment_scroll', quantity: 4 }]
  }),
  recipe({
    id: 'magic_arrow_scroll',
    name: 'Magic Arrow Scroll',
    skill: 'Inscription',
    stationType: 'scribe',
    minSkill: 8,
    difficulty: 22,
    duration: 4,
    inputs: [
      { itemId: 'parchment_scroll', quantity: 1 },
      { itemId: 'sulfurous_ash', quantity: 1 }
    ],
    outputs: [{ itemId: 'spell_scroll_magic_arrow', quantity: 1 }]
  }),
  recipe({
    id: 'blank_rune',
    name: 'Blank Rune',
    skill: 'Inscription',
    stationType: 'scribe',
    minSkill: 16,
    difficulty: 34,
    duration: 5,
    inputs: [
      { itemId: 'stone_block', quantity: 1 },
      { itemId: 'black_pearl', quantity: 1 }
    ],
    outputs: [{ itemId: 'recall_rune', quantity: 1 }]
  }),
  recipe({
    id: 'bake_bread',
    name: 'Fresh Bread',
    skill: 'Cooking',
    stationType: 'cooking',
    minSkill: 0,
    difficulty: 10,
    duration: 3,
    inputs: [
      { itemId: 'carrot', quantity: 2 },
      { itemId: 'kindling', quantity: 1 }
    ],
    outputs: [{ itemId: 'fresh_bread', quantity: 3 }]
  }),
  recipe({
    id: 'cook_fish_steak',
    name: 'Fish Steak',
    skill: 'Cooking',
    stationType: 'cooking',
    minSkill: 6,
    difficulty: 18,
    duration: 3,
    inputs: [
      { itemId: 'raw_fish', quantity: 2 },
      { itemId: 'kindling', quantity: 1 }
    ],
    outputs: [{ itemId: 'fish_steak', quantity: 2 }]
  }),
  recipe({
    id: 'trail_rations',
    name: 'Trail Rations',
    skill: 'Cooking',
    stationType: 'cooking',
    minSkill: 10,
    difficulty: 22,
    duration: 4,
    inputs: [
      { itemId: 'fresh_bread', quantity: 1 },
      { itemId: 'carrot', quantity: 2 }
    ],
    outputs: [{ itemId: 'trail_rations', quantity: 2 }]
  }),
  recipe({
    id: 'lockpicks',
    name: 'Lockpicks',
    skill: 'Tinkering',
    stationType: 'tinkering',
    minSkill: 0,
    difficulty: 12,
    duration: 3,
    inputs: [{ itemId: 'copper_bar', quantity: 1 }],
    outputs: [{ itemId: 'lockpick', quantity: 8, materialType: 'copper' }]
  }),
  recipe({
    id: 'small_gears',
    name: 'Small Gears',
    skill: 'Tinkering',
    stationType: 'tinkering',
    minSkill: 8,
    difficulty: 22,
    duration: 4,
    inputs: [{ itemId: 'copper_bar', quantity: 2 }],
    outputs: [{ itemId: 'gear', quantity: 3, materialType: 'copper' }]
  }),
  recipe({
    id: 'lantern_item',
    name: 'Lantern',
    skill: 'Tinkering',
    stationType: 'tinkering',
    minSkill: 12,
    difficulty: 28,
    duration: 5,
    inputs: [
      { itemId: 'gear', quantity: 1 },
      { itemId: 'torch', quantity: 1 },
      { itemId: 'iron_bar', quantity: 1 }
    ],
    outputs: [{ itemId: 'lantern_item', quantity: 1, materialType: 'iron' }]
  })
];

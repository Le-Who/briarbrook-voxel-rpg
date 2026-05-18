import type { BuildPieceDef, HousingFunctionType, HousingState, HousingTier, ItemType, RecipeRequirement, StationType } from '../game/types';

export interface HousingTierDefinition {
  tier: HousingTier;
  name: string;
  description: string;
  placementLimit: number;
  requirements: {
    items: RecipeRequirement[];
    gold: number;
    completedQuestId?: string;
    completedWorkOrders?: number;
  };
}

export interface HousingStorageDefinition {
  slots: number;
  maxWeight: number;
  acceptedItemTypes?: ItemType[];
  acceptedItemIds?: string[];
}

export interface HousingPieceDefinition {
  pieceId: string;
  functionType: HousingFunctionType;
  minTier: HousingTier;
  storage?: HousingStorageDefinition;
  stationTypes?: StationType[];
  utility?: 'rest' | 'home_anchor' | 'notice_board' | 'repair' | 'training';
  garden?: {
    yieldItemId: string;
    quantity: number;
    cooldown: number;
  };
  trophy?: string;
}

export const starterPlotId = 'plot_briarbrook_starter';

export const housingTierDefinitions: HousingTierDefinition[] = [
  {
    tier: 0,
    name: 'Camp',
    description: 'A claimed patch with bedrolls, a small chest, a campfire, and a few identity pieces.',
    placementLimit: 8,
    requirements: { items: [], gold: 0 }
  },
  {
    tier: 1,
    name: 'Workshop Plot',
    description: 'Basic storage, workbench convenience, signs, lights, and fenced workshop layout.',
    placementLimit: 18,
    requirements: {
      items: [
        { itemId: 'wood', quantity: 8 },
        { itemId: 'stone_block', quantity: 6 }
      ],
      gold: 50,
      completedQuestId: 'prepare_for_road'
    }
  },
  {
    tier: 2,
    name: 'Cottage',
    description: 'Walls, roof, door, specialized home stations, larger storage, and stronger visual identity.',
    placementLimit: 32,
    requirements: {
      items: [
        { itemId: 'boards', quantity: 14 },
        { itemId: 'iron_bar', quantity: 8 },
        { itemId: 'stone_block', quantity: 12 }
      ],
      gold: 140,
      completedQuestId: 'ore_for_brom',
      completedWorkOrders: 1
    }
  },
  {
    tier: 3,
    name: 'Homestead Later',
    description: 'Future vendor stalls, guest permissions, larger gardens, and advanced logistics hooks.',
    placementLimit: 48,
    requirements: {
      items: [
        { itemId: 'boards', quantity: 28 },
        { itemId: 'iron_bar', quantity: 16 },
        { itemId: 'vendor_contract', quantity: 1 }
      ],
      gold: 320,
      completedWorkOrders: 3
    }
  }
];

export const reagentItemIds = ['black_pearl', 'blood_moss', 'garlic', 'ginseng', 'mandrake_root', 'nightshade', 'spider_silk', 'sulfurous_ash'];

export const housingPieceDefinitions: Record<string, HousingPieceDefinition> = {
  small_chest: {
    pieceId: 'small_chest',
    functionType: 'storage',
    minTier: 0,
    storage: { slots: 8, maxWeight: 40 }
  },
  crate: {
    pieceId: 'crate',
    functionType: 'storage',
    minTier: 0,
    storage: { slots: 4, maxWeight: 25 }
  },
  reinforced_chest: {
    pieceId: 'reinforced_chest',
    functionType: 'storage',
    minTier: 1,
    storage: { slots: 14, maxWeight: 80 }
  },
  resource_crate: {
    pieceId: 'resource_crate',
    functionType: 'storage',
    minTier: 1,
    storage: { slots: 10, maxWeight: 90, acceptedItemTypes: ['resource'] }
  },
  reagent_shelf: {
    pieceId: 'reagent_shelf',
    functionType: 'storage',
    minTier: 1,
    storage: { slots: 10, maxWeight: 12, acceptedItemIds: reagentItemIds }
  },
  weapon_rack: {
    pieceId: 'weapon_rack',
    functionType: 'storage',
    minTier: 1,
    storage: { slots: 4, maxWeight: 36, acceptedItemTypes: ['weapon', 'tool'] }
  },
  armor_stand: {
    pieceId: 'armor_stand',
    functionType: 'storage',
    minTier: 1,
    storage: { slots: 4, maxWeight: 46, acceptedItemTypes: ['armor'] }
  },
  basic_workbench: {
    pieceId: 'basic_workbench',
    functionType: 'crafting',
    minTier: 1,
    stationTypes: ['carpentry', 'tinkering']
  },
  carpenter_bench_home: {
    pieceId: 'carpenter_bench_home',
    functionType: 'crafting',
    minTier: 1,
    stationTypes: ['carpentry', 'fletching']
  },
  small_forge_home: {
    pieceId: 'small_forge_home',
    functionType: 'crafting',
    minTier: 2,
    stationTypes: ['forge']
  },
  alchemy_table_home: {
    pieceId: 'alchemy_table_home',
    functionType: 'crafting',
    minTier: 2,
    stationTypes: ['alchemy']
  },
  scribe_desk_home: {
    pieceId: 'scribe_desk_home',
    functionType: 'crafting',
    minTier: 2,
    stationTypes: ['scribe']
  },
  cooking_hearth_home: {
    pieceId: 'cooking_hearth_home',
    functionType: 'crafting',
    minTier: 1,
    stationTypes: ['cooking']
  },
  bedroll_home: {
    pieceId: 'bedroll_home',
    functionType: 'utility',
    minTier: 0,
    utility: 'rest'
  },
  campfire_home: {
    pieceId: 'campfire_home',
    functionType: 'utility',
    minTier: 0,
    stationTypes: ['cooking']
  },
  torch: {
    pieceId: 'torch',
    functionType: 'utility',
    minTier: 0
  },
  home_marker: {
    pieceId: 'home_marker',
    functionType: 'utility',
    minTier: 0,
    utility: 'home_anchor'
  },
  notice_board_home: {
    pieceId: 'notice_board_home',
    functionType: 'utility',
    minTier: 1,
    utility: 'notice_board'
  },
  repair_station_home: {
    pieceId: 'repair_station_home',
    functionType: 'utility',
    minTier: 1,
    utility: 'repair'
  },
  training_dummy_home: {
    pieceId: 'training_dummy_home',
    functionType: 'utility',
    minTier: 1,
    utility: 'training'
  },
  lamp_post_home: {
    pieceId: 'lamp_post_home',
    functionType: 'boundary',
    minTier: 1
  },
  herb_planter_home: {
    pieceId: 'herb_planter_home',
    functionType: 'garden',
    minTier: 1,
    garden: { yieldItemId: 'ginseng', quantity: 1, cooldown: 72 }
  },
  garden_patch_home: {
    pieceId: 'garden_patch_home',
    functionType: 'garden',
    minTier: 1,
    garden: { yieldItemId: 'carrot', quantity: 2, cooldown: 96 }
  },
  skull_trophy_home: {
    pieceId: 'skull_trophy_home',
    functionType: 'trophy',
    minTier: 1,
    trophy: 'Undead trophy'
  },
  bandit_banner_home: {
    pieceId: 'bandit_banner_home',
    functionType: 'trophy',
    minTier: 1,
    trophy: 'Road victory banner'
  },
  ore_sample_display: {
    pieceId: 'ore_sample_display',
    functionType: 'trophy',
    minTier: 1,
    trophy: 'Rare ore memory'
  },
  treasure_map_display: {
    pieceId: 'treasure_map_display',
    functionType: 'trophy',
    minTier: 1,
    trophy: 'Treasure clue display'
  },
  small_trophy_hook: {
    pieceId: 'small_trophy_hook',
    functionType: 'trophy',
    minTier: 0,
    trophy: 'First camp memory'
  },
  door: {
    pieceId: 'door',
    functionType: 'boundary',
    minTier: 1
  },
  roof: {
    pieceId: 'roof',
    functionType: 'boundary',
    minTier: 1
  },
  rug_home: {
    pieceId: 'rug_home',
    functionType: 'decor',
    minTier: 1
  },
  wall_tapestry_home: {
    pieceId: 'wall_tapestry_home',
    functionType: 'decor',
    minTier: 1
  },
  plant_pot_home: {
    pieceId: 'plant_pot_home',
    functionType: 'decor',
    minTier: 0
  },
  sign_home: {
    pieceId: 'sign_home',
    functionType: 'decor',
    minTier: 0
  }
};

export function getHousingPieceDefinition(pieceId: string): HousingPieceDefinition {
  const explicit = housingPieceDefinitions[pieceId];
  if (explicit) return explicit;
  const boundaryCategories: BuildPieceDef['category'][] = ['Walls', 'Floors', 'Fences', 'Doors', 'Roofs'];
  return {
    pieceId,
    functionType: boundaryCategories.some((category) => pieceId.includes(category.toLowerCase().slice(0, -1))) ? 'boundary' : 'decor',
    minTier: pieceId === 'stone_wall' || pieceId === 'wooden_wall' || pieceId === 'window_wall' || pieceId === 'roof' || pieceId === 'door' ? 2 : 1
  };
}

export function createInitialHousingState(): HousingState {
  return {
    ownedPlotId: null,
    plots: {
      [starterPlotId]: {
        id: starterPlotId,
        name: "Valen's Camp",
        ownerId: null,
        tier: 0,
        claimedAt: null,
        boundary: { minX: -5, maxX: 5, minZ: -4, maxZ: 5 },
        permissions: {
          ownerCanBuild: true
        },
        lastPlacementId: null,
        homeAnchor: null
      }
    },
    storages: {},
    gardens: {},
    lastRestedAt: -999
  };
}

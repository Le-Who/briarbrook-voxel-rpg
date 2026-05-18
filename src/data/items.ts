import type { BuildPieceDef, ItemDef } from '../game/types';

export const itemDefs: Record<string, ItemDef> = {
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    type: 'weapon',
    stackable: false,
    maxStack: 1,
    weight: 4,
    value: 50,
    equipmentSlot: 'weapon',
    statModifiers: { minDamage: 5, maxDamage: 9 },
    weaponClass: 'sword',
    baseDamageMin: 8,
    baseDamageMax: 14,
    swingSpeed: 1.55,
    range: 1.65,
    staminaCost: 6,
    twoHanded: false,
    durability: 75,
    skillUsed: 'Swordsmanship',
    supportSkill: 'Tactics',
    specialMoves: ['quick_slash', 'cleave'],
    icon: { shape: 'blade', primary: '#d8d4c7', secondary: '#8f6a39' }
  },
  simple_bow: {
    id: 'simple_bow',
    name: 'Simple Bow',
    type: 'weapon',
    stackable: false,
    maxStack: 1,
    weight: 2.5,
    value: 35,
    equipmentSlot: 'weapon',
    range: 8,
    weaponClass: 'bow',
    baseDamageMin: 6,
    baseDamageMax: 12,
    swingSpeed: 1.25,
    staminaCost: 5,
    requiredAmmo: 'arrow',
    twoHanded: true,
    durability: 60,
    skillUsed: 'Archery',
    supportSkill: 'Tactics',
    specialMoves: ['aimed_shot'],
    icon: { shape: 'bow', primary: '#a66b2e', secondary: '#e1c786' }
  },
  oak_bow: {
    id: 'oak_bow',
    name: 'Oak Bow',
    type: 'weapon',
    stackable: false,
    maxStack: 1,
    weight: 2.2,
    value: 52,
    equipmentSlot: 'weapon',
    range: 8.5,
    weaponClass: 'bow',
    baseDamageMin: 7,
    baseDamageMax: 13,
    swingSpeed: 1.18,
    staminaCost: 5,
    requiredAmmo: 'arrow',
    twoHanded: true,
    durability: 70,
    skillUsed: 'Archery',
    supportSkill: 'Tactics',
    specialMoves: ['aimed_shot'],
    icon: { shape: 'bow', primary: '#9b6a32', secondary: '#e8cf8c' }
  },
  crossbow: {
    id: 'crossbow',
    name: 'Light Crossbow',
    type: 'weapon',
    stackable: false,
    maxStack: 1,
    weight: 3.2,
    value: 68,
    equipmentSlot: 'weapon',
    range: 9,
    weaponClass: 'crossbow',
    baseDamageMin: 9,
    baseDamageMax: 16,
    swingSpeed: 1.75,
    staminaCost: 6,
    requiredAmmo: 'bolt',
    twoHanded: true,
    durability: 80,
    skillUsed: 'Archery',
    supportSkill: 'Tactics',
    specialMoves: ['aimed_shot'],
    icon: { shape: 'bow', primary: '#6e3e1c', secondary: '#c4b18a' }
  },
  dagger: {
    id: 'dagger',
    name: 'Iron Dagger',
    type: 'weapon',
    stackable: false,
    maxStack: 1,
    weight: 1.2,
    value: 28,
    equipmentSlot: 'weapon',
    weaponClass: 'fencing',
    baseDamageMin: 4,
    baseDamageMax: 9,
    swingSpeed: 1,
    range: 1.35,
    staminaCost: 3,
    twoHanded: false,
    durability: 55,
    skillUsed: 'Fencing',
    supportSkill: 'Tactics',
    specialMoves: ['lunge', 'bleeding_thrust'],
    icon: { shape: 'blade', primary: '#d8d4c7', secondary: '#574030' }
  },
  firebolt: {
    id: 'firebolt',
    name: 'Firebolt',
    type: 'misc',
    stackable: false,
    maxStack: 1,
    weight: 0,
    value: 0,
    range: 9,
    icon: { shape: 'flame', primary: '#ff9b2f', secondary: '#f33b21' }
  },
  beginner_spellbook: {
    id: 'beginner_spellbook',
    name: 'Beginner Spellbook',
    type: 'misc',
    stackable: false,
    maxStack: 1,
    weight: 1.2,
    value: 80,
    icon: { shape: 'scroll', primary: '#4f3428', secondary: '#6fd4ff' }
  },
  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    type: 'consumable',
    stackable: true,
    maxStack: 20,
    weight: 0.3,
    value: 15,
    useEffect: 'heal',
    power: 35,
    icon: { shape: 'potion', primary: '#cf2d35', secondary: '#f6d9cf' }
  },
  mana_potion: {
    id: 'mana_potion',
    name: 'Mana Potion',
    type: 'consumable',
    stackable: true,
    maxStack: 20,
    weight: 0.3,
    value: 18,
    useEffect: 'mana',
    power: 30,
    icon: { shape: 'potion', primary: '#245ee9', secondary: '#cad9ff' }
  },
  parchment_scroll: {
    id: 'parchment_scroll',
    name: 'Blank Scroll',
    type: 'misc',
    stackable: true,
    maxStack: 50,
    weight: 0.1,
    value: 4,
    icon: { shape: 'scroll', primary: '#d9bd89', secondary: '#8a5632' }
  },
  spell_scroll_magic_arrow: {
    id: 'spell_scroll_magic_arrow',
    name: 'Scroll: Magic Arrow',
    type: 'misc',
    stackable: true,
    maxStack: 20,
    weight: 0.1,
    value: 18,
    icon: { shape: 'scroll', primary: '#d9bd89', secondary: '#6fd4ff' }
  },
  recall_rune: {
    id: 'recall_rune',
    name: 'Blank Rune',
    type: 'misc',
    stackable: true,
    maxStack: 20,
    weight: 0.2,
    value: 25,
    icon: { shape: 'ore', primary: '#8b8f93', secondary: '#6fd4ff' }
  },
  bandage: {
    id: 'bandage',
    name: 'Bandage',
    type: 'consumable',
    stackable: true,
    maxStack: 50,
    weight: 0.04,
    value: 2,
    icon: { shape: 'scroll', primary: '#f1eee0', secondary: '#b8a88c' }
  },
  clean_cloth: {
    id: 'clean_cloth',
    name: 'Clean Cloth',
    type: 'resource',
    stackable: true,
    maxStack: 50,
    weight: 0.05,
    value: 1,
    icon: { shape: 'scroll', primary: '#d8d5c9', secondary: '#8d897c' }
  },
  scissors: {
    id: 'scissors',
    name: 'Scissors',
    type: 'tool',
    stackable: false,
    maxStack: 1,
    weight: 0.4,
    value: 10,
    icon: { shape: 'blade', primary: '#c7c9c8', secondary: '#7b4a28' }
  },
  poison_potion: {
    id: 'poison_potion',
    name: 'Lesser Poison',
    type: 'consumable',
    stackable: true,
    maxStack: 20,
    weight: 0.25,
    value: 22,
    power: 12,
    icon: { shape: 'potion', primary: '#67c56b', secondary: '#315c2d' }
  },
  refresh_potion: {
    id: 'refresh_potion',
    name: 'Refresh Potion',
    type: 'consumable',
    stackable: true,
    maxStack: 20,
    weight: 0.25,
    value: 16,
    useEffect: 'stamina',
    power: 20,
    icon: { shape: 'potion', primary: '#35b75b', secondary: '#d6ffe2' }
  },
  cure_potion: {
    id: 'cure_potion',
    name: 'Cure Potion',
    type: 'consumable',
    stackable: true,
    maxStack: 20,
    weight: 0.25,
    value: 24,
    useEffect: 'cure',
    icon: { shape: 'potion', primary: '#d8f0c8', secondary: '#67c56b' }
  },
  explosion_potion: {
    id: 'explosion_potion',
    name: 'Explosion Potion',
    type: 'consumable',
    stackable: true,
    maxStack: 10,
    weight: 0.35,
    value: 38,
    power: 18,
    icon: { shape: 'potion', primary: '#ff7a2d', secondary: '#f3d154' }
  },
  arrow: {
    id: 'arrow',
    name: 'Arrow',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.03,
    value: 1,
    icon: { shape: 'bow', primary: '#d9bf77', secondary: '#7a4b25' }
  },
  bolt: {
    id: 'bolt',
    name: 'Bolt',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.04,
    value: 2,
    icon: { shape: 'bow', primary: '#c4b18a', secondary: '#5c3922' }
  },
  lockpick: {
    id: 'lockpick',
    name: 'Lockpick',
    type: 'tool',
    stackable: true,
    maxStack: 50,
    weight: 0.02,
    value: 6,
    icon: { shape: 'pickaxe', primary: '#c0c2bf', secondary: '#5c3922' }
  },
  gear: {
    id: 'gear',
    name: 'Small Gear',
    type: 'resource',
    stackable: true,
    maxStack: 50,
    weight: 0.08,
    value: 8,
    icon: { shape: 'ring', primary: '#b8bab9', secondary: '#6e7271' }
  },
  lantern_item: {
    id: 'lantern_item',
    name: 'Lantern',
    type: 'building',
    stackable: true,
    maxStack: 20,
    weight: 0.6,
    value: 16,
    buildPieceId: 'torch',
    icon: { shape: 'torch', primary: '#ffbd55', secondary: '#3b3024' }
  },
  lute: {
    id: 'lute',
    name: 'Lute',
    type: 'tool',
    stackable: false,
    maxStack: 1,
    weight: 1.6,
    value: 36,
    icon: { shape: 'bow', primary: '#9b5d2d', secondary: '#e1c786' }
  },
  drum: {
    id: 'drum',
    name: 'Drum',
    type: 'tool',
    stackable: false,
    maxStack: 1,
    weight: 2.2,
    value: 34,
    icon: { shape: 'bag', primary: '#8c4d24', secondary: '#f0c957' }
  },
  harp: {
    id: 'harp',
    name: 'Harp',
    type: 'tool',
    stackable: false,
    maxStack: 1,
    weight: 1.8,
    value: 42,
    icon: { shape: 'bow', primary: '#d9bf77', secondary: '#8f5f2a' }
  },
  pickaxe: {
    id: 'pickaxe',
    name: 'Iron Pickaxe',
    type: 'tool',
    stackable: false,
    maxStack: 1,
    weight: 3,
    value: 28,
    durability: 48,
    icon: { shape: 'pickaxe', primary: '#bfc2c1', secondary: '#7a4b25' }
  },
  axe: {
    id: 'axe',
    name: 'Iron Axe',
    type: 'tool',
    stackable: false,
    maxStack: 1,
    weight: 3,
    value: 30,
    durability: 50,
    icon: { shape: 'axe', primary: '#c7c9c8', secondary: '#815027' }
  },
  fishing_pole: {
    id: 'fishing_pole',
    name: 'Fishing Pole',
    type: 'tool',
    stackable: false,
    maxStack: 1,
    weight: 1.5,
    value: 18,
    durability: 36,
    icon: { shape: 'bow', primary: '#8f5f2a', secondary: '#d9bd89' }
  },
  shovel: {
    id: 'shovel',
    name: 'Shovel',
    type: 'tool',
    stackable: false,
    maxStack: 1,
    weight: 2.5,
    value: 20,
    durability: 44,
    icon: { shape: 'pickaxe', primary: '#9da1a0', secondary: '#7a4b25' }
  },
  stone_block: {
    id: 'stone_block',
    name: 'Stone Block',
    type: 'building',
    stackable: true,
    maxStack: 99,
    weight: 0.25,
    value: 2,
    buildPieceId: 'stone_wall',
    icon: { shape: 'block', primary: '#8f8d84', secondary: '#5b5b59' }
  },
  torch: {
    id: 'torch',
    name: 'Torch',
    type: 'building',
    stackable: true,
    maxStack: 50,
    weight: 0.15,
    value: 3,
    buildPieceId: 'torch',
    icon: { shape: 'torch', primary: '#ffb13b', secondary: '#6b3b1d' }
  },
  backpack: {
    id: 'backpack',
    name: 'Backpack',
    type: 'container',
    stackable: false,
    maxStack: 1,
    weight: 0.8,
    value: 20,
    equipmentSlot: 'backpack',
    statModifiers: { carryCapacity: 25 },
    icon: { shape: 'bag', primary: '#8c4d24', secondary: '#ca8a4a' }
  },
  carrot: {
    id: 'carrot',
    name: 'Carrot',
    type: 'consumable',
    stackable: true,
    maxStack: 30,
    weight: 0.1,
    value: 1,
    useEffect: 'food',
    power: 8,
    icon: { shape: 'food', primary: '#f0772e', secondary: '#40a446' }
  },
  fresh_bread: {
    id: 'fresh_bread',
    name: 'Fresh Bread',
    type: 'quest',
    stackable: true,
    maxStack: 30,
    weight: 0.4,
    value: 3,
    icon: { shape: 'food', primary: '#c9853d', secondary: '#f1c977' }
  },
  fish_steak: {
    id: 'fish_steak',
    name: 'Fish Steak',
    type: 'consumable',
    stackable: true,
    maxStack: 30,
    weight: 0.16,
    value: 5,
    useEffect: 'food',
    power: 12,
    icon: { shape: 'food', primary: '#d3edf5', secondary: '#5ba0b8' }
  },
  trail_rations: {
    id: 'trail_rations',
    name: 'Trail Rations',
    type: 'consumable',
    stackable: true,
    maxStack: 30,
    weight: 0.25,
    value: 6,
    useEffect: 'food',
    power: 16,
    icon: { shape: 'food', primary: '#c9853d', secondary: '#67a04a' }
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.2,
    value: 2,
    icon: { shape: 'wood', primary: '#8f5f2a', secondary: '#5a3517' }
  },
  logs: {
    id: 'logs',
    name: 'Logs',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.28,
    value: 2,
    icon: { shape: 'wood', primary: '#8f5f2a', secondary: '#5a3517' }
  },
  boards: {
    id: 'boards',
    name: 'Boards',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.18,
    value: 3,
    icon: { shape: 'wood', primary: '#a06a34', secondary: '#6e3e1c' }
  },
  crate_kit: {
    id: 'crate_kit',
    name: 'Crate Kit',
    type: 'building',
    stackable: true,
    maxStack: 20,
    weight: 0.8,
    value: 10,
    buildPieceId: 'crate',
    icon: { shape: 'bag', primary: '#835026', secondary: '#b77a3e' }
  },
  storage_chest: {
    id: 'storage_chest',
    name: 'Storage Chest',
    type: 'building',
    stackable: true,
    maxStack: 10,
    weight: 1.4,
    value: 28,
    buildPieceId: 'small_chest',
    icon: { shape: 'bag', primary: '#7b4a24', secondary: '#333434' }
  },
  wood_door_kit: {
    id: 'wood_door_kit',
    name: 'Wood Door Kit',
    type: 'building',
    stackable: true,
    maxStack: 20,
    weight: 0.7,
    value: 14,
    buildPieceId: 'door',
    icon: { shape: 'bag', primary: '#8f5529', secondary: '#c99759' }
  },
  furniture_chair: {
    id: 'furniture_chair',
    name: 'Wooden Chair',
    type: 'misc',
    stackable: true,
    maxStack: 10,
    weight: 1,
    value: 18,
    icon: { shape: 'wood', primary: '#8f5f2a', secondary: '#4a281d' }
  },
  oak_logs: {
    id: 'oak_logs',
    name: 'Oak Logs',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.3,
    value: 5,
    icon: { shape: 'wood', primary: '#9b6a32', secondary: '#5a3517' }
  },
  ash_logs: {
    id: 'ash_logs',
    name: 'Ash Logs',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.3,
    value: 7,
    icon: { shape: 'wood', primary: '#b6b08a', secondary: '#6f6a52' }
  },
  yew_logs: {
    id: 'yew_logs',
    name: 'Yew Logs',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.32,
    value: 12,
    icon: { shape: 'wood', primary: '#9b4b32', secondary: '#4a281d' }
  },
  bark_fragment: {
    id: 'bark_fragment',
    name: 'Bark Fragment',
    type: 'resource',
    stackable: true,
    maxStack: 50,
    weight: 0.05,
    value: 3,
    icon: { shape: 'wood', primary: '#6b3b1d', secondary: '#9b6a32' }
  },
  kindling: {
    id: 'kindling',
    name: 'Kindling',
    type: 'resource',
    stackable: true,
    maxStack: 50,
    weight: 0.05,
    value: 1,
    icon: { shape: 'torch', primary: '#d9bd89', secondary: '#6b3b1d' }
  },
  copper_ore: {
    id: 'copper_ore',
    name: 'Copper Ore',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.3,
    value: 4,
    icon: { shape: 'ore', primary: '#bf7443', secondary: '#614034' }
  },
  dull_copper_ore: {
    id: 'dull_copper_ore',
    name: 'Dull Copper Ore',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.3,
    value: 8,
    icon: { shape: 'ore', primary: '#8b6e55', secondary: '#4f4035' }
  },
  bronze_ore: {
    id: 'bronze_ore',
    name: 'Bronze Ore',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.32,
    value: 11,
    icon: { shape: 'ore', primary: '#b37a35', secondary: '#5d3d24' }
  },
  shadow_iron_ore: {
    id: 'shadow_iron_ore',
    name: 'Shadow Iron Ore',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.35,
    value: 15,
    icon: { shape: 'ore', primary: '#3f4650', secondary: '#171b21' }
  },
  gold_ore: {
    id: 'gold_ore',
    name: 'Gold Ore',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.35,
    value: 22,
    icon: { shape: 'ore', primary: '#d7ae39', secondary: '#6b4d18' }
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Iron Ore',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.3,
    value: 6,
    icon: { shape: 'ore', primary: '#a8b1b0', secondary: '#4f5757' }
  },
  iron_bar: {
    id: 'iron_bar',
    name: 'Iron Bar',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.4,
    value: 8,
    icon: { shape: 'block', primary: '#a7aaa7', secondary: '#6e7271' }
  },
  copper_bar: {
    id: 'copper_bar',
    name: 'Copper Bar',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.35,
    value: 6,
    icon: { shape: 'block', primary: '#bf7443', secondary: '#6f3f2f' }
  },
  glimmer_gem: {
    id: 'glimmer_gem',
    name: 'Glimmer Gem',
    type: 'resource',
    stackable: true,
    maxStack: 20,
    weight: 0.05,
    value: 40,
    icon: { shape: 'ore', primary: '#49c6ff', secondary: '#6547d8' }
  },
  leather: {
    id: 'leather',
    name: 'Leather',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.15,
    value: 5,
    icon: { shape: 'scroll', primary: '#8b4f2c', secondary: '#c18455' }
  },
  black_pearl: {
    id: 'black_pearl',
    name: 'Black Pearl',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.02,
    value: 6,
    icon: { shape: 'ore', primary: '#24242c', secondary: '#6fd4ff' }
  },
  blood_moss: {
    id: 'blood_moss',
    name: 'Blood Moss',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.02,
    value: 5,
    icon: { shape: 'food', primary: '#8f1f2d', secondary: '#315c2d' }
  },
  garlic: {
    id: 'garlic',
    name: 'Garlic',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.02,
    value: 3,
    icon: { shape: 'food', primary: '#eee0b7', secondary: '#9c8b62' }
  },
  ginseng: {
    id: 'ginseng',
    name: 'Ginseng',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.02,
    value: 4,
    icon: { shape: 'food', primary: '#d9bd89', secondary: '#67c56b' }
  },
  mandrake_root: {
    id: 'mandrake_root',
    name: 'Mandrake Root',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.03,
    value: 7,
    icon: { shape: 'wood', primary: '#8f5f2a', secondary: '#67c56b' }
  },
  nightshade: {
    id: 'nightshade',
    name: 'Nightshade',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.02,
    value: 6,
    icon: { shape: 'potion', primary: '#3f284d', secondary: '#8c4bd6' }
  },
  spider_silk: {
    id: 'spider_silk',
    name: 'Spider Silk',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.01,
    value: 4,
    icon: { shape: 'scroll', primary: '#d8d5c9', secondary: '#a7d7ff' }
  },
  sulfurous_ash: {
    id: 'sulfurous_ash',
    name: 'Sulfurous Ash',
    type: 'resource',
    stackable: true,
    maxStack: 99,
    weight: 0.02,
    value: 5,
    icon: { shape: 'flame', primary: '#ff9b2f', secondary: '#5b5a55' }
  },
  raw_fish: {
    id: 'raw_fish',
    name: 'Raw Fish',
    type: 'resource',
    stackable: true,
    maxStack: 30,
    weight: 0.2,
    value: 3,
    icon: { shape: 'food', primary: '#5ba0b8', secondary: '#d3edf5' }
  },
  old_boots: {
    id: 'old_boots',
    name: 'Old Boots',
    type: 'misc',
    stackable: false,
    maxStack: 1,
    weight: 1,
    value: 1,
    icon: { shape: 'armor', primary: '#51341f', secondary: '#929697' }
  },
  map_fragment: {
    id: 'map_fragment',
    name: 'Map Fragment',
    type: 'misc',
    stackable: true,
    maxStack: 20,
    weight: 0.05,
    value: 12,
    icon: { shape: 'scroll', primary: '#d9bd89', secondary: '#5ba0b8' }
  },
  rough_treasure_map: {
    id: 'rough_treasure_map',
    name: 'Rough Treasure Map',
    type: 'misc',
    stackable: false,
    maxStack: 1,
    weight: 0.1,
    value: 45,
    icon: { shape: 'scroll', primary: '#d7bf8d', secondary: '#5ba0b8' }
  },
  crypt_lore_clue: {
    id: 'crypt_lore_clue',
    name: 'Crypt Lore Clue',
    type: 'quest',
    stackable: true,
    maxStack: 10,
    weight: 0.05,
    value: 20,
    icon: { shape: 'scroll', primary: '#d9bd89', secondary: '#6fd4ff' }
  },
  repair_kit: {
    id: 'repair_kit',
    name: 'Repair Kit',
    type: 'tool',
    stackable: true,
    maxStack: 10,
    weight: 0.4,
    value: 30,
    icon: { shape: 'block', primary: '#a7aaa7', secondary: '#6e7271' }
  },
  vendor_contract: {
    id: 'vendor_contract',
    name: 'Vendor Contract',
    type: 'misc',
    stackable: true,
    maxStack: 10,
    weight: 0.1,
    value: 55,
    icon: { shape: 'scroll', primary: '#f0c957', secondary: '#8a5632' }
  },
  wall_tapestry: {
    id: 'wall_tapestry',
    name: 'Wall Tapestry',
    type: 'building',
    stackable: true,
    maxStack: 10,
    weight: 0.5,
    value: 35,
    icon: { shape: 'scroll', primary: '#1f5a95', secondary: '#d0a449' }
  },
  sealed_crate: {
    id: 'sealed_crate',
    name: 'Sealed Crate',
    type: 'misc',
    stackable: false,
    maxStack: 1,
    weight: 3,
    value: 25,
    icon: { shape: 'bag', primary: '#835026', secondary: '#b77a3e' }
  },
  bottle_message: {
    id: 'bottle_message',
    name: 'Bottle Message',
    type: 'misc',
    stackable: true,
    maxStack: 10,
    weight: 0.2,
    value: 18,
    icon: { shape: 'potion', primary: '#5ba0b8', secondary: '#d9bd89' }
  },
  cracked_shield: {
    id: 'cracked_shield',
    name: 'Cracked Shield',
    type: 'armor',
    stackable: false,
    maxStack: 1,
    weight: 3.5,
    value: 16,
    equipmentSlot: 'shield',
    statModifiers: { armor: 3 },
    durability: 28,
    icon: { shape: 'shield', primary: '#8a8b83', secondary: '#5c3922' }
  },
  bones: {
    id: 'bones',
    name: 'Bones',
    type: 'misc',
    stackable: true,
    maxStack: 99,
    weight: 0.1,
    value: 1,
    icon: { shape: 'bone', primary: '#d8d5c9', secondary: '#8d897c' }
  },
  silver_ring: {
    id: 'silver_ring',
    name: 'Silver Ring',
    type: 'armor',
    stackable: false,
    maxStack: 1,
    weight: 0.1,
    value: 45,
    equipmentSlot: 'accessory',
    statModifiers: { Luck: 2, critChance: 2 },
    icon: { shape: 'ring', primary: '#d8d2ba', secondary: '#ffcf57' }
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'Leather Armor',
    type: 'armor',
    stackable: false,
    maxStack: 1,
    weight: 5,
    value: 62,
    equipmentSlot: 'armor',
    statModifiers: { armor: 8, dodgeChance: 2 },
    durability: 58,
    icon: { shape: 'armor', primary: '#8b4f2c', secondary: '#c18455' }
  },
  cloth_robe: {
    id: 'cloth_robe',
    name: 'Mage Robe',
    type: 'armor',
    stackable: false,
    maxStack: 1,
    weight: 1.5,
    value: 48,
    equipmentSlot: 'armor',
    statModifiers: { maxMana: 8, magicResist: 4 },
    durability: 45,
    icon: { shape: 'armor', primary: '#345d7a', secondary: '#d8d5c9' }
  },
  iron_armor: {
    id: 'iron_armor',
    name: 'Iron Armor',
    type: 'armor',
    stackable: false,
    maxStack: 1,
    weight: 10,
    value: 110,
    equipmentSlot: 'armor',
    statModifiers: { armor: 16, maxHealth: 10 },
    durability: 95,
    icon: { shape: 'armor', primary: '#b7b9b8', secondary: '#6d6f70' }
  },
  iron_helmet: {
    id: 'iron_helmet',
    name: 'Iron Helmet',
    type: 'armor',
    stackable: false,
    maxStack: 1,
    weight: 3,
    value: 55,
    equipmentSlot: 'helmet',
    statModifiers: { armor: 5 },
    durability: 58,
    icon: { shape: 'armor', primary: '#b8bab9', secondary: '#777b80' }
  },
  iron_boots: {
    id: 'iron_boots',
    name: 'Iron Boots',
    type: 'armor',
    stackable: false,
    maxStack: 1,
    weight: 3,
    value: 45,
    equipmentSlot: 'boots',
    statModifiers: { armor: 4 },
    durability: 52,
    icon: { shape: 'armor', primary: '#929697', secondary: '#51341f' }
  },
  iron_shield: {
    id: 'iron_shield',
    name: 'Iron Shield',
    type: 'armor',
    stackable: false,
    maxStack: 1,
    weight: 5,
    value: 70,
    equipmentSlot: 'shield',
    statModifiers: { armor: 9, dodgeChance: 2 },
    durability: 85,
    icon: { shape: 'shield', primary: '#a4a8a8', secondary: '#875024' }
  }
};

export const buildPieces: BuildPieceDef[] = [
  {
    id: 'stone_wall',
    name: 'Stone Wall',
    category: 'Walls',
    description: 'A sturdy stone wall.',
    cost: [{ itemId: 'stone_block', quantity: 2 }],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'block', primary: '#8f8d84', secondary: '#5b5b59' }
  },
  {
    id: 'wooden_wall',
    name: 'Wooden Wall',
    category: 'Walls',
    description: 'Timber wall for a cottage frame.',
    cost: [
      { itemId: 'boards', quantity: 2 },
      { itemId: 'wood', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'wood', primary: '#8b5729', secondary: '#563114' }
  },
  {
    id: 'half_wall',
    name: 'Half Wall',
    category: 'Walls',
    description: 'A waist-high stone divider.',
    cost: [{ itemId: 'stone_block', quantity: 1 }],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'block', primary: '#85837c', secondary: '#565652' }
  },
  {
    id: 'window_wall',
    name: 'Window Wall',
    category: 'Walls',
    description: 'A timber-framed wall with an open window.',
    cost: [
      { itemId: 'stone_block', quantity: 1 },
      { itemId: 'boards', quantity: 1 },
      { itemId: 'clean_cloth', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'wood', primary: '#8a5c31', secondary: '#6f7371' }
  },
  {
    id: 'floor',
    name: 'Wood Floor',
    category: 'Floors',
    description: 'A snapped plank floor tile.',
    cost: [{ itemId: 'boards', quantity: 2 }],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'wood', primary: '#a06a34', secondary: '#6e3e1c' }
  },
  {
    id: 'stone_floor',
    name: 'Stone Floor',
    category: 'Floors',
    description: 'Flat stone paving for a durable interior.',
    cost: [{ itemId: 'stone_block', quantity: 1 }],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'block', primary: '#88877f', secondary: '#5b5a55' }
  },
  {
    id: 'fence',
    name: 'Fence',
    category: 'Fences',
    description: 'Simple boundary fencing.',
    cost: [{ itemId: 'boards', quantity: 2 }],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'wood', primary: '#87552c', secondary: '#3b2516' }
  },
  {
    id: 'door',
    name: 'Wood Door',
    category: 'Doors',
    description: 'A walkable door marker.',
    cost: [
      { itemId: 'boards', quantity: 3 },
      { itemId: 'gear', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'bag', primary: '#8f5529', secondary: '#c99759' }
  },
  {
    id: 'roof',
    name: 'Roof Block',
    category: 'Roofs',
    description: 'Sloped roof voxel cluster.',
    cost: [
      { itemId: 'boards', quantity: 3 },
      { itemId: 'clean_cloth', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'block', primary: '#7b3d1c', secondary: '#b06b32' }
  },
  {
    id: 'torch',
    name: 'Wall Torch',
    category: 'Decor',
    description: 'Warm light for a wall or yard.',
    cost: [{ itemId: 'torch', quantity: 1 }],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'torch', primary: '#ffb13b', secondary: '#6b3b1d' }
  },
  {
    id: 'crate',
    name: 'Crate',
    category: 'Decor',
    description: 'Storage decor that blocks movement.',
    cost: [{ itemId: 'crate_kit', quantity: 1 }],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'bag', primary: '#835026', secondary: '#b77a3e' }
  },
  {
    id: 'barrel',
    name: 'Barrel',
    category: 'Decor',
    description: 'Round storage decor for a workshop corner.',
    cost: [
      { itemId: 'boards', quantity: 2 },
      { itemId: 'iron_bar', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'bag', primary: '#7d4a24', secondary: '#b77a3e' }
  },
  {
    id: 'small_chest',
    name: 'Small Chest',
    category: 'Storage',
    description: 'Eight-slot home storage with a modest weight limit.',
    cost: [
      { itemId: 'wood', quantity: 4 },
      { itemId: 'iron_bar', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'bag', primary: '#7b4a24', secondary: '#333434' }
  },
  {
    id: 'reinforced_chest',
    name: 'Reinforced Chest',
    category: 'Storage',
    description: 'Tier-one mixed storage with more slots and weight than a camp chest.',
    cost: [
      { itemId: 'storage_chest', quantity: 1 },
      { itemId: 'iron_bar', quantity: 2 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'bag', primary: '#5a3824', secondary: '#a7aaa7' }
  },
  {
    id: 'resource_crate',
    name: 'Resource Crate',
    category: 'Storage',
    description: 'Heavy crate that accepts resources but rejects finished gear.',
    cost: [
      { itemId: 'wood', quantity: 6 },
      { itemId: 'stone_block', quantity: 2 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'wood', primary: '#8f5f2a', secondary: '#4a281d' }
  },
  {
    id: 'reagent_shelf',
    name: 'Reagent Shelf',
    category: 'Storage',
    description: 'Small sorted shelf for spell reagents.',
    cost: [
      { itemId: 'wood', quantity: 3 },
      { itemId: 'parchment_scroll', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'potion', primary: '#3f284d', secondary: '#d9bd89' }
  },
  {
    id: 'weapon_rack',
    name: 'Weapon Rack',
    category: 'Storage',
    description: 'Four display slots for weapons and tools.',
    cost: [
      { itemId: 'wood', quantity: 5 },
      { itemId: 'iron_bar', quantity: 2 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'blade', primary: '#a7aaa7', secondary: '#6b3b1d' }
  },
  {
    id: 'armor_stand',
    name: 'Armor Stand',
    category: 'Storage',
    description: 'Four display slots for armor pieces.',
    cost: [
      { itemId: 'wood', quantity: 4 },
      { itemId: 'leather', quantity: 2 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'armor', primary: '#8b4f2c', secondary: '#c18455' }
  },
  {
    id: 'basic_workbench',
    name: 'Basic Workbench',
    category: 'Crafting',
    description: 'Home convenience for basic carpentry and tinkering recipes.',
    cost: [
      { itemId: 'wood', quantity: 8 },
      { itemId: 'logs', quantity: 2 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'wood', primary: '#a06a34', secondary: '#6e3e1c' }
  },
  {
    id: 'carpenter_bench_home',
    name: 'Carpenter Bench',
    category: 'Crafting',
    description: 'Home bench for carpentry and fletching convenience.',
    cost: [
      { itemId: 'boards', quantity: 6 },
      { itemId: 'gear', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'wood', primary: '#b3743c', secondary: '#4a281d' }
  },
  {
    id: 'small_forge_home',
    name: 'Small Forge + Anvil',
    category: 'Crafting',
    description: 'Cottage-tier forge for routine smelting and simple metalwork.',
    cost: [
      { itemId: 'stone_block', quantity: 8 },
      { itemId: 'iron_bar', quantity: 5 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'flame', primary: '#ff8a2f', secondary: '#55524d' }
  },
  {
    id: 'alchemy_table_home',
    name: 'Alchemy Table',
    category: 'Crafting',
    description: 'Cottage-tier table for potion work without leaving home.',
    cost: [
      { itemId: 'boards', quantity: 5 },
      { itemId: 'ginseng', quantity: 4 },
      { itemId: 'garlic', quantity: 4 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'potion', primary: '#67c56b', secondary: '#245ee9' }
  },
  {
    id: 'scribe_desk_home',
    name: 'Scribe Desk',
    category: 'Crafting',
    description: 'Cottage-tier desk for scroll and inscription work.',
    cost: [
      { itemId: 'boards', quantity: 5 },
      { itemId: 'parchment_scroll', quantity: 5 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'scroll', primary: '#d9bd89', secondary: '#4a281d' }
  },
  {
    id: 'cooking_hearth_home',
    name: 'Cooking Hearth',
    category: 'Crafting',
    description: 'A small hearth for food prep and camp meals.',
    cost: [
      { itemId: 'stone_block', quantity: 3 },
      { itemId: 'kindling', quantity: 4 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'food', primary: '#c9853d', secondary: '#ff8a2f' }
  },
  {
    id: 'bedroll_home',
    name: 'Bedroll',
    category: 'Utility',
    description: 'Rest spot that restores health, mana, and stamina on a cooldown.',
    cost: [
      { itemId: 'clean_cloth', quantity: 2 },
      { itemId: 'leather', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'scroll', primary: '#466b8f', secondary: '#d8d5c9' }
  },
  {
    id: 'campfire_home',
    name: 'Campfire',
    category: 'Utility',
    description: 'Tier-zero light and basic cooking point.',
    cost: [
      { itemId: 'stone_block', quantity: 2 },
      { itemId: 'kindling', quantity: 3 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'torch', primary: '#ffb13b', secondary: '#55524d' }
  },
  {
    id: 'home_marker',
    name: 'Home Marker',
    category: 'Utility',
    description: 'Marks the plot as a safe recall anchor for future logistics.',
    cost: [
      { itemId: 'stone_block', quantity: 2 },
      { itemId: 'parchment_scroll', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'ring', primary: '#6fd4ff', secondary: '#d9bd89' }
  },
  {
    id: 'notice_board_home',
    name: 'Notice Board',
    category: 'Utility',
    description: 'Workshop board for work-order reminders and market preparation.',
    cost: [
      { itemId: 'wood', quantity: 5 },
      { itemId: 'parchment_scroll', quantity: 2 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'scroll', primary: '#8f5f2a', secondary: '#d9bd89' }
  },
  {
    id: 'repair_station_home',
    name: 'Repair Station',
    category: 'Utility',
    description: 'Keeps repair actions visible near stored gear.',
    cost: [
      { itemId: 'wood', quantity: 4 },
      { itemId: 'repair_kit', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'block', primary: '#a7aaa7', secondary: '#6e7271' }
  },
  {
    id: 'training_dummy_home',
    name: 'Training Dummy',
    category: 'Utility',
    description: 'A visual sparring target for workshop identity.',
    cost: [
      { itemId: 'wood', quantity: 4 },
      { itemId: 'clean_cloth', quantity: 2 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'armor', primary: '#8f5f2a', secondary: '#d8d5c9' }
  },
  {
    id: 'lamp_post_home',
    name: 'Lamp Post',
    category: 'Fences',
    description: 'Boundary light for a readable night plot.',
    cost: [
      { itemId: 'wood', quantity: 2 },
      { itemId: 'torch', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'torch', primary: '#ffbd55', secondary: '#4a281d' }
  },
  {
    id: 'herb_planter_home',
    name: 'Herb Planter',
    category: 'Garden',
    description: 'Slow modest ginseng yield that supplements, not replaces, gathering.',
    cost: [
      { itemId: 'wood', quantity: 3 },
      { itemId: 'ginseng', quantity: 2 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'food', primary: '#67c56b', secondary: '#4c3d25' }
  },
  {
    id: 'garden_patch_home',
    name: 'Cooking Garden',
    category: 'Garden',
    description: 'Slow carrot patch for home cooking loops.',
    cost: [
      { itemId: 'wood', quantity: 3 },
      { itemId: 'carrot', quantity: 3 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: true,
    icon: { shape: 'food', primary: '#d9822f', secondary: '#67c56b' }
  },
  {
    id: 'small_trophy_hook',
    name: 'Small Trophy Hook',
    category: 'Trophies',
    description: 'Tier-zero memory hook for a first token or small relic.',
    cost: [
      { itemId: 'wood', quantity: 1 },
      { itemId: 'leather', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'ring', primary: '#8f5f2a', secondary: '#d8d5c9' }
  },
  {
    id: 'skull_trophy_home',
    name: 'Skull Trophy',
    category: 'Trophies',
    description: 'Undead memento that gives the plot a history.',
    cost: [{ itemId: 'bones', quantity: 4 }],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'bone', primary: '#d8d5c9', secondary: '#8d897c' }
  },
  {
    id: 'bandit_banner_home',
    name: 'Bandit Banner',
    category: 'Trophies',
    description: 'Road victory banner for a workshop wall.',
    cost: [
      { itemId: 'leather', quantity: 2 },
      { itemId: 'clean_cloth', quantity: 2 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'scroll', primary: '#8f1f2d', secondary: '#d0a449' }
  },
  {
    id: 'ore_sample_display',
    name: 'Ore Sample Display',
    category: 'Trophies',
    description: 'A small stand for rare ore samples and mining pride.',
    cost: [
      { itemId: 'stone_block', quantity: 2 },
      { itemId: 'copper_ore', quantity: 2 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'ore', primary: '#bf7443', secondary: '#614034' }
  },
  {
    id: 'treasure_map_display',
    name: 'Treasure Map Display',
    category: 'Trophies',
    description: 'Pins a recovered clue as a visible memory.',
    cost: [{ itemId: 'map_fragment', quantity: 1 }],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'scroll', primary: '#d7bf8d', secondary: '#5ba0b8' }
  },
  {
    id: 'rug_home',
    name: 'Woven Rug',
    category: 'Decor',
    description: 'Softens the workshop floor without changing power.',
    cost: [{ itemId: 'clean_cloth', quantity: 3 }],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'scroll', primary: '#1f5a95', secondary: '#d0a449' }
  },
  {
    id: 'wall_tapestry_home',
    name: 'Wall Tapestry',
    category: 'Decor',
    description: 'A crafted decoration for cottage identity.',
    cost: [{ itemId: 'wall_tapestry', quantity: 1 }],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'scroll', primary: '#1f5a95', secondary: '#d0a449' }
  },
  {
    id: 'plant_pot_home',
    name: 'Plant Pot',
    category: 'Decor',
    description: 'Low-cost visual identity for a camp corner.',
    cost: [
      { itemId: 'stone_block', quantity: 1 },
      { itemId: 'carrot', quantity: 1 }
    ],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'food', primary: '#67c56b', secondary: '#55524d' }
  },
  {
    id: 'sign_home',
    name: 'Plot Sign',
    category: 'Decor',
    description: 'A simple sign for naming the place in your head.',
    cost: [{ itemId: 'wood', quantity: 2 }],
    size: { x: 1, z: 1 },
    blocksMovement: false,
    icon: { shape: 'wood', primary: '#8f5f2a', secondary: '#d9bd89' }
  }
];

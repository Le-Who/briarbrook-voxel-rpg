import type { IconDescriptor, Projectile, RecipeRequirement } from '../game/types';

export type SpellTargetType = 'self' | 'entity' | 'tile' | 'area' | 'item' | 'corpse' | 'rune' | 'door' | 'container' | 'none';
export type SpellCategory = 'Damage' | 'Healing' | 'Buff/Debuff' | 'Control' | 'Travel' | 'Summoning' | 'Detection' | 'Illusion' | 'Utility/Crafting' | 'Environmental';
export type SpellEffectType =
  | 'damage'
  | 'heal'
  | 'create_food'
  | 'night_sight'
  | 'debuff'
  | 'cure'
  | 'protection'
  | 'strength'
  | 'poison'
  | 'telekinesis'
  | 'wall'
  | 'recall'
  | 'detect_magic'
  | 'unlock'
  | 'magic_lock'
  | 'magic_trap'
  | 'reveal'
  | 'water_walk'
  | 'dispel_field'
  | 'mark_rune';

export interface SpellDefinition {
  id: string;
  displayName: string;
  school: 'Magery';
  circle: number;
  manaCost: number;
  castTime: number;
  cooldown: number;
  minSkill: number;
  targetType: SpellTargetType;
  category: SpellCategory;
  lineOfSight: boolean;
  targetFilters: string[];
  interruptible: boolean;
  friendlyMode: 'friendly' | 'hostile' | 'neutral' | 'any';
  range: number;
  reagents: RecipeRequirement[];
  wordsOfPower?: string;
  description: string;
  effectType: SpellEffectType;
  difficulty: number;
  iconDescriptor: IconDescriptor;
  projectileKind?: Projectile['kind'];
  projectileColor?: string;
  power: number;
}

type SpellContractKeys = 'category' | 'lineOfSight' | 'targetFilters' | 'interruptible' | 'friendlyMode';
type SpellDefinitionInput = Omit<SpellDefinition, SpellContractKeys> & Partial<Pick<SpellDefinition, SpellContractKeys>>;

const reagent = (itemId: string, quantity = 1): RecipeRequirement => ({ itemId, quantity });
const icon = (shape: IconDescriptor['shape'], primary: string, secondary?: string): IconDescriptor => ({ shape, primary, secondary });

const rawSpellDefs: Record<string, SpellDefinitionInput> = {
  magic_arrow: {
    id: 'magic_arrow',
    displayName: 'Magic Arrow',
    school: 'Magery',
    circle: 1,
    manaCost: 6,
    castTime: 0.45,
    cooldown: 0.7,
    minSkill: 0,
    targetType: 'entity',
    range: 8,
    reagents: [reagent('sulfurous_ash')],
    wordsOfPower: 'In Por Ylem',
    description: 'A fast blue-white projectile for light damage.',
    effectType: 'damage',
    difficulty: 12,
    iconDescriptor: icon('flame', '#a7d7ff', '#ffffff'),
    projectileKind: 'magic_arrow',
    projectileColor: '#bde7ff',
    power: 9
  },
  heal: {
    id: 'heal',
    displayName: 'Heal',
    school: 'Magery',
    circle: 1,
    manaCost: 8,
    castTime: 0.75,
    cooldown: 1,
    minSkill: 0,
    targetType: 'self',
    range: 0,
    reagents: [reagent('ginseng'), reagent('garlic')],
    wordsOfPower: 'In Mani',
    description: 'Restores a small amount of health.',
    effectType: 'heal',
    difficulty: 14,
    iconDescriptor: icon('potion', '#62d66f', '#ffe98d'),
    projectileKind: 'heal',
    projectileColor: '#69e681',
    power: 26
  },
  create_food: {
    id: 'create_food',
    displayName: 'Create Food',
    school: 'Magery',
    circle: 1,
    manaCost: 5,
    castTime: 0.55,
    cooldown: 0.8,
    minSkill: 0,
    targetType: 'none',
    category: 'Utility/Crafting',
    lineOfSight: false,
    targetFilters: ['self', 'travel_supply'],
    friendlyMode: 'friendly',
    range: 0,
    reagents: [reagent('ginseng')],
    wordsOfPower: 'In Mani Ylem',
    description: 'Creates simple travel food.',
    effectType: 'create_food',
    difficulty: 10,
    iconDescriptor: icon('food', '#f0a340', '#f5d58b'),
    power: 2
  },
  night_sight: {
    id: 'night_sight',
    displayName: 'Night Sight',
    school: 'Magery',
    circle: 1,
    manaCost: 6,
    castTime: 0.45,
    cooldown: 1,
    minSkill: 0,
    targetType: 'self',
    category: 'Detection',
    lineOfSight: false,
    targetFilters: ['self', 'hidden_mark', 'dungeon'],
    friendlyMode: 'friendly',
    range: 0,
    reagents: [reagent('spider_silk'), reagent('sulfurous_ash')],
    wordsOfPower: 'In Lor',
    description: 'Brightens dungeon lighting for a short time.',
    effectType: 'night_sight',
    difficulty: 12,
    iconDescriptor: icon('torch', '#ffe98d', '#6fd4ff'),
    power: 45
  },
  weaken: {
    id: 'weaken',
    displayName: 'Weaken',
    school: 'Magery',
    circle: 1,
    manaCost: 7,
    castTime: 0.6,
    cooldown: 1,
    minSkill: 0,
    targetType: 'entity',
    range: 7,
    reagents: [reagent('garlic'), reagent('nightshade')],
    wordsOfPower: 'Des Mani',
    description: 'Lowers target damage briefly.',
    effectType: 'debuff',
    difficulty: 16,
    iconDescriptor: icon('shield', '#8c4bd6', '#d7c3ff'),
    power: 3
  },
  cure: {
    id: 'cure',
    displayName: 'Cure',
    school: 'Magery',
    circle: 2,
    manaCost: 9,
    castTime: 0.8,
    cooldown: 1.1,
    minSkill: 12,
    targetType: 'self',
    range: 0,
    reagents: [reagent('garlic'), reagent('ginseng')],
    wordsOfPower: 'An Nox',
    description: 'Removes poison effects.',
    effectType: 'cure',
    difficulty: 24,
    iconDescriptor: icon('potion', '#d7f5d7', '#55d65f'),
    power: 1
  },
  harm: {
    id: 'harm',
    displayName: 'Harm',
    school: 'Magery',
    circle: 2,
    manaCost: 10,
    castTime: 0.55,
    cooldown: 0.9,
    minSkill: 12,
    targetType: 'entity',
    range: 4,
    reagents: [reagent('nightshade'), reagent('spider_silk')],
    wordsOfPower: 'An Mani',
    description: 'Short-range direct damage.',
    effectType: 'damage',
    difficulty: 26,
    iconDescriptor: icon('flame', '#8855ff', '#d7c3ff'),
    projectileKind: 'magic_arrow',
    projectileColor: '#b66dff',
    power: 15
  },
  protection: {
    id: 'protection',
    displayName: 'Protection',
    school: 'Magery',
    circle: 2,
    manaCost: 12,
    castTime: 0.9,
    cooldown: 1.4,
    minSkill: 14,
    targetType: 'self',
    range: 0,
    reagents: [reagent('garlic'), reagent('ginseng'), reagent('sulfurous_ash')],
    wordsOfPower: 'Uus Sanct',
    description: 'Reduces interruption risk but slightly burdens armor.',
    effectType: 'protection',
    difficulty: 28,
    iconDescriptor: icon('shield', '#7197ff', '#dbe7ff'),
    power: 20
  },
  strength: {
    id: 'strength',
    displayName: 'Strength',
    school: 'Magery',
    circle: 2,
    manaCost: 11,
    castTime: 0.8,
    cooldown: 1.2,
    minSkill: 14,
    targetType: 'self',
    range: 0,
    reagents: [reagent('mandrake_root'), reagent('ginseng')],
    wordsOfPower: 'Uus Mani',
    description: 'Temporary strength and stamina surge.',
    effectType: 'strength',
    difficulty: 28,
    iconDescriptor: icon('blade', '#ffcf57', '#8f6a39'),
    power: 5
  },
  fireball: {
    id: 'fireball',
    displayName: 'Fireball',
    school: 'Magery',
    circle: 3,
    manaCost: 16,
    castTime: 1,
    cooldown: 1.5,
    minSkill: 25,
    targetType: 'entity',
    range: 8,
    reagents: [reagent('black_pearl'), reagent('sulfurous_ash')],
    wordsOfPower: 'Vas Flam',
    description: 'A heavy orange projectile with impact damage.',
    effectType: 'damage',
    difficulty: 40,
    iconDescriptor: icon('flame', '#ff9b2f', '#f33b21'),
    projectileKind: 'fireball',
    projectileColor: '#ff862e',
    power: 26
  },
  poison: {
    id: 'poison',
    displayName: 'Poison',
    school: 'Magery',
    circle: 3,
    manaCost: 14,
    castTime: 1,
    cooldown: 1.6,
    minSkill: 25,
    targetType: 'entity',
    range: 6,
    reagents: [reagent('nightshade')],
    wordsOfPower: 'In Nox',
    description: 'Applies poison if the target fails to resist.',
    effectType: 'poison',
    difficulty: 42,
    iconDescriptor: icon('potion', '#67c56b', '#315c2d'),
    projectileKind: 'poison',
    projectileColor: '#66d45f',
    power: 16
  },
  telekinesis: {
    id: 'telekinesis',
    displayName: 'Telekinesis',
    school: 'Magery',
    circle: 3,
    manaCost: 12,
    castTime: 0.9,
    cooldown: 1.2,
    minSkill: 22,
    targetType: 'entity',
    range: 10,
    reagents: [reagent('blood_moss'), reagent('mandrake_root')],
    wordsOfPower: 'Ort Por Ylem',
    description: 'Interacts with distant loot, switches, and simple objects.',
    effectType: 'telekinesis',
    difficulty: 36,
    iconDescriptor: icon('ring', '#6fd4ff', '#ffffff'),
    power: 1
  },
  wall_of_stone: {
    id: 'wall_of_stone',
    displayName: 'Wall of Stone',
    school: 'Magery',
    circle: 3,
    manaCost: 18,
    castTime: 1.1,
    cooldown: 2,
    minSkill: 28,
    targetType: 'area',
    range: 7,
    reagents: [reagent('blood_moss'), reagent('garlic')],
    wordsOfPower: 'In Sanct Ylem',
    description: 'Places a temporary blocking stone wall tile.',
    effectType: 'wall',
    difficulty: 44,
    iconDescriptor: icon('block', '#88877f', '#5b5a55'),
    power: 18
  },
  lightning: {
    id: 'lightning',
    displayName: 'Lightning',
    school: 'Magery',
    circle: 4,
    manaCost: 20,
    castTime: 0.85,
    cooldown: 1.7,
    minSkill: 38,
    targetType: 'entity',
    range: 9,
    reagents: [reagent('mandrake_root'), reagent('sulfurous_ash')],
    wordsOfPower: 'Por Ort Grav',
    description: 'Instant target damage with a vertical flash.',
    effectType: 'damage',
    difficulty: 56,
    iconDescriptor: icon('flame', '#f8fbff', '#6fd4ff'),
    projectileKind: 'lightning',
    projectileColor: '#dff5ff',
    power: 34
  },
  greater_heal: {
    id: 'greater_heal',
    displayName: 'Greater Heal',
    school: 'Magery',
    circle: 4,
    manaCost: 22,
    castTime: 1.35,
    cooldown: 2,
    minSkill: 38,
    targetType: 'self',
    range: 0,
    reagents: [reagent('ginseng'), reagent('garlic'), reagent('mandrake_root'), reagent('spider_silk')],
    wordsOfPower: 'In Vas Mani',
    description: 'Restores a large amount of health.',
    effectType: 'heal',
    difficulty: 58,
    iconDescriptor: icon('potion', '#55e676', '#ffe98d'),
    projectileKind: 'heal',
    projectileColor: '#91ff8f',
    power: 58
  },
  curse: {
    id: 'curse',
    displayName: 'Curse',
    school: 'Magery',
    circle: 4,
    manaCost: 18,
    castTime: 1.1,
    cooldown: 1.8,
    minSkill: 36,
    targetType: 'entity',
    range: 7,
    reagents: [reagent('garlic'), reagent('nightshade'), reagent('sulfurous_ash')],
    wordsOfPower: 'Des Sanct',
    description: 'Reduces target defenses and resistance briefly.',
    effectType: 'debuff',
    difficulty: 55,
    iconDescriptor: icon('shield', '#3f284d', '#8c4bd6'),
    power: 7
  },
  recall: {
    id: 'recall',
    displayName: 'Recall',
    school: 'Magery',
    circle: 4,
    manaCost: 24,
    castTime: 1.5,
    cooldown: 4,
    minSkill: 40,
    targetType: 'none',
    category: 'Travel',
    lineOfSight: false,
    targetFilters: ['marked_rune', 'safe_location'],
    friendlyMode: 'neutral',
    range: 0,
    reagents: [reagent('black_pearl'), reagent('blood_moss'), reagent('mandrake_root')],
    wordsOfPower: 'Kal Ort Por',
    description: 'Returns Valen to a marked safe rune point.',
    effectType: 'recall',
    difficulty: 60,
    iconDescriptor: icon('ring', '#6fd4ff', '#ffcf57'),
    power: 1
  },
  detect_magic: {
    id: 'detect_magic',
    displayName: 'Detect Magic',
    school: 'Magery',
    circle: 1,
    manaCost: 5,
    castTime: 0.5,
    cooldown: 1,
    minSkill: 0,
    targetType: 'self',
    category: 'Detection',
    lineOfSight: false,
    targetFilters: ['self', 'trap', 'field', 'magic_item'],
    interruptible: true,
    friendlyMode: 'neutral',
    range: 0,
    reagents: [reagent('spider_silk')],
    wordsOfPower: 'Wis Ort',
    description: 'Highlights magical fields, traps, and enchanted objects nearby.',
    effectType: 'detect_magic',
    difficulty: 12,
    iconDescriptor: icon('ring', '#6fd4ff', '#ffffff'),
    power: 18
  },
  unlock_minor: {
    id: 'unlock_minor',
    displayName: 'Unlock Minor',
    school: 'Magery',
    circle: 2,
    manaCost: 10,
    castTime: 0.9,
    cooldown: 1.5,
    minSkill: 14,
    targetType: 'entity',
    category: 'Utility/Crafting',
    lineOfSight: true,
    targetFilters: ['container', 'door', 'weak_lock'],
    interruptible: true,
    friendlyMode: 'neutral',
    range: 5,
    reagents: [reagent('blood_moss'), reagent('sulfurous_ash')],
    wordsOfPower: 'Ex Por',
    description: 'Opens weak locks and simple sealed containers.',
    effectType: 'unlock',
    difficulty: 30,
    iconDescriptor: icon('pickaxe', '#c0c2bf', '#6fd4ff'),
    power: 1
  },
  magic_lock: {
    id: 'magic_lock',
    displayName: 'Magic Lock',
    school: 'Magery',
    circle: 2,
    manaCost: 10,
    castTime: 0.8,
    cooldown: 1.5,
    minSkill: 16,
    targetType: 'entity',
    category: 'Utility/Crafting',
    lineOfSight: true,
    targetFilters: ['container', 'door', 'weak_lock'],
    interruptible: true,
    friendlyMode: 'neutral',
    range: 5,
    reagents: [reagent('blood_moss'), reagent('garlic')],
    wordsOfPower: 'In Por Sanct',
    description: 'Places a weak magical lock on a simple unopened container.',
    effectType: 'magic_lock',
    difficulty: 32,
    iconDescriptor: icon('shield', '#5c78a8', '#f0c957'),
    power: 1
  },
  magic_trap: {
    id: 'magic_trap',
    displayName: 'Magic Trap',
    school: 'Magery',
    circle: 2,
    manaCost: 12,
    castTime: 0.8,
    cooldown: 2,
    minSkill: 18,
    targetType: 'tile',
    category: 'Control',
    lineOfSight: true,
    targetFilters: ['tile', 'door', 'container'],
    interruptible: true,
    friendlyMode: 'neutral',
    range: 6,
    reagents: [reagent('sulfurous_ash'), reagent('spider_silk')],
    wordsOfPower: 'In Jux',
    description: 'Places a temporary warning trap field on a tile.',
    effectType: 'magic_trap',
    difficulty: 34,
    iconDescriptor: icon('flame', '#ff7a2d', '#f3d154'),
    power: 20
  },
  reveal: {
    id: 'reveal',
    displayName: 'Reveal',
    school: 'Magery',
    circle: 3,
    manaCost: 14,
    castTime: 0.85,
    cooldown: 2,
    minSkill: 24,
    targetType: 'area',
    category: 'Detection',
    lineOfSight: false,
    targetFilters: ['hidden', 'trap', 'stealth'],
    interruptible: true,
    friendlyMode: 'any',
    range: 7,
    reagents: [reagent('blood_moss'), reagent('sulfurous_ash')],
    wordsOfPower: 'Wis Quas',
    description: 'Reveals hidden actors and trap indicators nearby.',
    effectType: 'reveal',
    difficulty: 38,
    iconDescriptor: icon('torch', '#ffe98d', '#b66dff'),
    power: 7
  },
  water_walk: {
    id: 'water_walk',
    displayName: 'Water Walk',
    school: 'Magery',
    circle: 3,
    manaCost: 16,
    castTime: 1,
    cooldown: 3,
    minSkill: 28,
    targetType: 'self',
    category: 'Environmental',
    lineOfSight: false,
    targetFilters: ['self', 'water'],
    interruptible: true,
    friendlyMode: 'friendly',
    range: 0,
    reagents: [reagent('black_pearl'), reagent('blood_moss')],
    wordsOfPower: 'Rel Ylem',
    description: 'Projects a short-lived bridge-step over shallow water.',
    effectType: 'water_walk',
    difficulty: 44,
    iconDescriptor: icon('ring', '#5ba0b8', '#d3edf5'),
    power: 12
  },
  dispel_field: {
    id: 'dispel_field',
    displayName: 'Dispel Field',
    school: 'Magery',
    circle: 4,
    manaCost: 18,
    castTime: 1,
    cooldown: 2.5,
    minSkill: 36,
    targetType: 'area',
    category: 'Control',
    lineOfSight: true,
    targetFilters: ['field', 'trap', 'wall', 'magic_seal'],
    interruptible: true,
    friendlyMode: 'neutral',
    range: 7,
    reagents: [reagent('garlic'), reagent('mandrake_root'), reagent('sulfurous_ash')],
    wordsOfPower: 'An Grav',
    description: 'Removes temporary magical fields, stone walls, and visible magical seals near the target.',
    effectType: 'dispel_field',
    difficulty: 54,
    iconDescriptor: icon('shield', '#dbe7ff', '#7197ff'),
    power: 1
  },
  mark_minor_rune: {
    id: 'mark_minor_rune',
    displayName: 'Mark Minor Rune',
    school: 'Magery',
    circle: 4,
    manaCost: 20,
    castTime: 1.2,
    cooldown: 4,
    minSkill: 38,
    targetType: 'none',
    category: 'Travel',
    lineOfSight: false,
    targetFilters: ['safe_location', 'rune'],
    interruptible: true,
    friendlyMode: 'neutral',
    range: 0,
    reagents: [reagent('black_pearl'), reagent('mandrake_root'), reagent('recall_rune')],
    wordsOfPower: 'Kal Por Ylem',
    description: 'Marks the current safe location as a minor recall point.',
    effectType: 'mark_rune',
    difficulty: 58,
    iconDescriptor: icon('ring', '#ffcf57', '#6fd4ff'),
    power: 1
  }
};

function normalizeSpellDefinition(spell: SpellDefinitionInput): SpellDefinition {
  return {
    ...spell,
    category:
      spell.category ??
      (spell.effectType === 'damage'
        ? 'Damage'
        : spell.effectType === 'heal'
          ? 'Healing'
          : spell.effectType === 'wall'
            ? 'Environmental'
            : spell.effectType === 'recall'
              ? 'Travel'
              : spell.effectType === 'telekinesis'
                ? 'Utility/Crafting'
                : 'Buff/Debuff'),
    lineOfSight: spell.lineOfSight ?? (spell.targetType === 'entity' || spell.targetType === 'tile'),
    targetFilters: spell.targetFilters ?? (spell.targetType === 'entity' ? ['hostile', 'friendly'] : [spell.targetType]),
    interruptible: spell.interruptible ?? true,
    friendlyMode:
      spell.friendlyMode ??
      (spell.effectType === 'damage' || spell.effectType === 'poison' || spell.effectType === 'debuff'
        ? 'hostile'
        : spell.targetType === 'self'
          ? 'friendly'
          : 'neutral')
  };
}

export const spellDefs: Record<string, SpellDefinition> = Object.fromEntries(
  Object.entries(rawSpellDefs).map(([id, spell]) => [id, normalizeSpellDefinition(spell)])
) as Record<string, SpellDefinition>;

export const spellCircles = [1, 2, 3, 4] as const;
export const beginnerSpellIds = ['magic_arrow', 'heal', 'create_food', 'night_sight', 'detect_magic'];

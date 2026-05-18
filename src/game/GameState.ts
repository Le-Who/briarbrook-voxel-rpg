import { areas } from '../data/areas';
import { createInitialEconomyState } from '../data/economy';
import { createInitialHousingState } from '../data/housing';
import { itemDefs } from '../data/items';
import { createInitialQuests } from '../data/quests';
import { resourceNodeDefs, resourcePlacements, type ResourcePlacement } from '../data/resources';
import { createInitialResourceTiles } from '../data/resourceMaps';
import { beginnerSpellIds } from '../data/spells';
import { createInitialSkills } from '../data/skills';
import { createInitialTreasureState } from '../data/treasure';
import { createInitialRenderStats } from '../render/RenderBudgets';
import type {
  ActionState,
  ContentValidationState,
  DevToolState,
  EnemyEntity,
  Entity,
  GameState,
  HotbarBinding,
  InventoryState,
  ItemStack,
  NpcEntity,
  PortalEntity,
  ResourceNodeEntity
} from './types';

let nextId = 1;

export function createId(prefix: string): string {
  nextId += 1;
  return `${prefix}_${nextId.toString(36)}_${Math.floor(Math.random() * 9999).toString(36)}`;
}

export function createStack(itemId: string, quantity = 1): ItemStack {
  const def = itemDefs[itemId];
  if (!def) {
    throw new Error(`Unknown item id ${itemId}`);
  }
  const stack: ItemStack = { uid: createId('item'), itemId, quantity };
  if (!def.stackable && def.durability) {
    stack.durability = def.durability;
    stack.maxDurability = def.durability;
  }
  return stack;
}

export function createDefaultHotbar(): HotbarBinding[] {
  return [
    { kind: 'action', id: 'attack' },
    { kind: 'action', id: 'ranged' },
    { kind: 'spell', id: 'magic_arrow' },
    { kind: 'item', id: 'health_potion' },
    { kind: 'item', id: 'mana_potion' },
    { kind: 'item', id: 'bandage' },
    { kind: 'tool', id: 'axe' },
    { kind: 'tool', id: 'pickaxe' },
    { kind: 'spell', id: 'night_sight' },
    { kind: 'action', id: 'utility' }
  ];
}

export function createInventory(capacity: number, stacks: Array<ItemStack | null> = []): InventoryState {
  return {
    capacity,
    slots: Array.from({ length: capacity }, (_, index) => stacks[index] ?? null)
  };
}

export function createIdleActionState(clock = 0): ActionState {
  return {
    kind: 'idle',
    startedAt: clock,
    duration: 0,
    endsAt: clock,
    interruptible: true,
    visualHint: 'idle'
  };
}

export function createInitialContentValidationState(clock = 0): ContentValidationState {
  return {
    ok: true,
    errors: [],
    warnings: [],
    checkedAt: clock
  };
}

export function createInitialDevState(clock = 0): DevToolState {
  return {
    overlay: false,
    selectedSceneId: 'world',
    contentValidation: createInitialContentValidationState(clock),
    telemetry: {
      startedAt: clock,
      damageDealtBySource: {},
      damageTaken: 0,
      skillGains: {},
      resourceYields: {},
      resourceOutflow: {},
      itemsSold: {},
      itemsConsumed: {},
      workOrdersCompleted: 0,
      marketTransactions: 0,
      goldEarned: 0,
      goldSpent: 0,
      potionConsumption: {},
      deathCount: 0,
      questCompletionTime: {},
      priceTrends: {}
    },
    telemetryExportJson: '',
    renderStats: createInitialRenderStats(),
    input: {
      mode: 'normal',
      lastRawInput: 'none',
      lastIntent: 'none',
      focusedWindow: 'none',
      focusedElement: 'none',
      topmostWindow: 'none',
      dragPayload: null,
      pointerCapture: null,
      lastPreventedDefault: 'none',
      targetMode: null,
      viewport: 'unknown',
      uiScale: 1
    }
  };
}

const npc = (entity: Omit<NpcEntity, 'kind' | 'blocksMovement'> & { kind?: NpcEntity['kind']; blocksMovement?: boolean }): NpcEntity => ({
  kind: entity.kind ?? 'npc',
  blocksMovement: entity.blocksMovement ?? true,
  ...entity
});

const portal = (
  id: string,
  area: PortalEntity['area'],
  name: string,
  x: number,
  z: number,
  destination: PortalEntity['destination'],
  spawn?: PortalEntity['spawn']
): PortalEntity => ({
  id,
  kind: 'portal',
  area,
  name,
  destination,
  spawn,
  position: { x, y: 0, z },
  blocksMovement: false
});

const enemy = (
  id: string,
  area: EnemyEntity['area'],
  name: string,
  enemyType: EnemyEntity['enemyType'],
  level: number,
  x: number,
  z: number,
  health: number,
  damage: [number, number],
  aiStyle: EnemyEntity['aiStyle'] = enemyType === 'Cultist' ? 'mage' : enemyType === 'Beast' ? 'beast' : 'melee'
): EnemyEntity => ({
  id,
  kind: 'enemy',
  area,
  name,
  enemyType,
  level,
  health,
  maxHealth: health,
  damage,
  armor: enemyType === 'Undead' ? 4 : enemyType === 'Cultist' ? 1 : enemyType === 'Beast' ? 1 : 3,
  magicResist: enemyType === 'Undead' ? 4 : enemyType === 'Cultist' ? 22 : 8,
  poisonResist: enemyType === 'Undead' ? 90 : enemyType === 'Beast' ? 35 : 15,
  weaponSkill: 18 + level * 5,
  defenseSkill: enemyType === 'Beast' ? 12 + level * 5 : 20 + level * 4,
  aiStyle,
  combatRole: aiStyle === 'archer' ? 'archer' : aiStyle === 'mage' ? 'caster' : enemyType === 'Beast' ? 'skirmisher' : level >= 7 ? 'brute' : 'grunt',
  aggroRadius: enemyType === 'Undead' ? 7 : aiStyle === 'beast' ? 8 : 6,
  attackRange: aiStyle === 'archer' || aiStyle === 'mage' ? 6.5 : 1.25,
  attackCooldown: aiStyle === 'archer' ? 1.9 : aiStyle === 'mage' ? 2.2 : enemyType === 'Undead' ? 1.7 : aiStyle === 'beast' ? 1.05 : 1.45,
  attackTimer: 0,
  patrolTimer: Math.random() * 6,
  leashOrigin: { x, y: 0, z },
  state: 'idle',
  poison: null,
  pacifiedUntil: 0,
  discordUntil: 0,
  discordAmount: 0,
  provokedTargetId: null,
  position: { x, y: 0, z },
  blocksMovement: true,
  lootTable:
    enemyType === 'Undead'
      ? [
          { itemId: 'bones', min: 1, max: 3, chance: 0.9 },
          { itemId: 'cracked_shield', min: 1, max: 1, chance: 0.35 },
          { itemId: 'mana_potion', min: 1, max: 1, chance: 0.2 },
          { itemId: 'map_fragment', min: 1, max: 1, chance: 0.18 }
        ]
      : [
          { itemId: 'health_potion', min: 1, max: 2, chance: 0.45 },
          { itemId: 'leather', min: 1, max: 3, chance: 0.8 },
          { itemId: 'silver_ring', min: 1, max: 1, chance: 0.12 },
          { itemId: 'map_fragment', min: 1, max: 1, chance: 0.1 }
        ],
  goldDrop: enemyType === 'Undead' ? [6, 14] : [12, 24]
});

const resource = (placement: ResourcePlacement): ResourceNodeEntity => {
  const definition = resourceNodeDefs[placement.resourceId];
  return {
    id: placement.id,
    kind: 'resource',
    area: placement.area,
    name: placement.name ?? definition.name,
    resourceId: definition.id,
    resourceType: definition.resourceType,
    toolItemId: definition.toolItemId,
    skill: definition.skill,
    yieldItemId: definition.yieldItemId,
    yieldRange: definition.yieldRange,
    baseDuration: definition.baseDuration,
    respawnSeconds: definition.respawnSeconds,
    inspectText: definition.inspectText,
    depleted: false,
    respawnTimer: 0,
    position: { x: placement.x, y: 0, z: placement.z },
    blocksMovement: true
  };
};

export function createInitialEntities(): Record<string, Entity> {
  const entities: Record<string, Entity> = {};
  [
    npc({
      id: 'npc_eldon_town',
      area: 'town',
      name: 'Eldon',
      role: 'banker',
      position: { x: -7, y: 0, z: -3 },
      dialogue: ['Weight slows good adventurers. Put spare ore, logs, and hides in the bank chest.', 'I keep your bank separate from your pack. Move one resource here before the road.']
    }),
    npc({
      id: 'npc_brom_town',
      area: 'town',
      name: 'Brom',
      role: 'blacksmith',
      position: { x: 5, y: 0, z: -4 },
      dialogue: ['Mine a vein, smelt the ore into bars, then choose a simple iron pattern.', 'The forge teaches Mining, Blacksmithing, Arms Lore, and patience.'],
      craftStation: 'forge',
      training: [
        { skillId: 'Blacksmithing', maxSkill: 30, costPerPoint: 3 },
        { skillId: 'Mining', maxSkill: 25, costPerPoint: 2 }
      ]
    }),
    npc({
      id: 'npc_torren_town',
      area: 'town',
      name: 'Marshal Torren',
      role: 'merchant',
      position: { x: 6, y: 0, z: 2 },
      dialogue: ['Fresh bread and wares!', 'Roads are safer when folk trade fair.'],
      tradeGold: 160,
      tradeInventory: createInventory(12, [createStack('fresh_bread', 10), createStack('health_potion', 4), createStack('leather', 8), createStack('kindling', 12), createStack('raw_fish', 6), createStack('carrot', 12)]),
      craftStation: 'cooking',
      training: [{ skillId: 'Cooking', maxSkill: 25, costPerPoint: 2 }]
    }),
    npc({
      id: 'npc_mira_town',
      area: 'town',
      name: 'Mira',
      role: 'quest',
      position: { x: -1, y: 0, z: 5 },
      dialogue: ['Start with your skills journal, then gather logs and ore before leaving town.', 'The crypt road has been restless. Prepare here before chasing bones.']
    }),
    npc({
      id: 'npc_sela_town',
      area: 'town',
      name: 'Sela',
      role: 'guard',
      position: { x: -5, y: 0, z: -1 },
      dialogue: ['Bandages train Healing. Anatomy helps your hands know what to bind.', 'Need patching up? Stay near the square, but learn to tend yourself.'],
      training: [
        { skillId: 'Healing', maxSkill: 30, costPerPoint: 2 },
        { skillId: 'Anatomy', maxSkill: 25, costPerPoint: 2 }
      ]
    }),
    npc({ id: 'npc_liora_town', area: 'town', name: 'Liora', role: 'player', kind: 'social', position: { x: -3, y: 0, z: 3 }, dialogue: ['Sure, let us go.', 'I can watch your flank.'] }),
    npc({ id: 'npc_aric_town', area: 'town', name: 'Aric', role: 'player', kind: 'social', position: { x: -2, y: 0, z: -5 }, dialogue: ['Anyone up for some kobolds?', 'I will scout ahead.'] }),
    npc({ id: 'npc_durnok_town', area: 'town', name: 'Durnok', role: 'player', kind: 'social', position: { x: 4, y: 0, z: 4 }, dialogue: ['Need a healer?', 'Ore prices are wild today.'] }),
    npc({ id: 'npc_kippa_town', area: 'town', name: 'Kippa', role: 'player', kind: 'social', position: { x: 1, y: 0, z: -6 }, dialogue: ['WTS mana potions, fair price.'], tradeGold: 35, tradeInventory: createInventory(8, [createStack('silver_ring'), createStack('mana_potion', 5)]) }),
    npc({ id: 'npc_faylen_town', area: 'town', name: 'Faylen', role: 'player', kind: 'social', position: { x: 8, y: 0, z: -2 }, dialogue: ['The square is lively tonight.'] }),
    npc({ id: 'npc_meris_town', area: 'town', name: 'Meris', role: 'player', kind: 'social', position: { x: -6, y: 0, z: 5 }, dialogue: ['Leather boots, forty gold.'] }),
    npc({ id: 'npc_thallor_town', area: 'town', name: 'Thallor', role: 'player', kind: 'social', position: { x: -8, y: 0, z: 1 }, dialogue: ['Looking for two more for the caves.'] }),
    npc({ id: 'npc_pyrel_town', area: 'town', name: 'Pyrel', role: 'player', kind: 'social', position: { x: 2, y: 0, z: 7 }, dialogue: ['Buying bread in bulk.'] }),
    npc({
      id: 'npc_ysolda_town',
      area: 'town',
      name: 'Ysolda',
      role: 'merchant',
      position: { x: -16, y: 0, z: -1 },
      dialogue: ['Clean cloth and tonics, no fuss.', 'A steady hand matters more than a sharp blade.'],
      tradeGold: 120,
      tradeInventory: createInventory(12, [createStack('bandage', 10), createStack('clean_cloth', 8), createStack('health_potion', 4), createStack('ginseng', 6), createStack('garlic', 6), createStack('refresh_potion', 2), createStack('cure_potion', 1)]),
      craftStation: 'alchemy',
      training: [
        { skillId: 'Alchemy', maxSkill: 25, costPerPoint: 3 },
        { skillId: 'Healing', maxSkill: 25, costPerPoint: 2 }
      ]
    }),
    npc({
      id: 'npc_orren_town',
      area: 'town',
      name: 'Orren',
      role: 'merchant',
      position: { x: 15, y: 0, z: -7 },
      dialogue: ['Spells cost reagents. Buy ash for Magic Arrow and ginseng with garlic for Heal.', 'Open your spellbook, target carefully, and meditate when your mana runs low.'],
      tradeGold: 140,
      tradeInventory: createInventory(14, [createStack('black_pearl', 8), createStack('sulfurous_ash', 8), createStack('mandrake_root', 6), createStack('nightshade', 6), createStack('spider_silk', 6), createStack('parchment_scroll', 8), createStack('recall_rune', 1)]),
      craftStation: 'scribe',
      training: [
        { skillId: 'Inscription', maxSkill: 25, costPerPoint: 3 },
        { skillId: 'Magery', maxSkill: 30, costPerPoint: 4 }
      ]
    }),
    npc({
      id: 'npc_tavern_town',
      area: 'town',
      name: 'Marella',
      role: 'merchant',
      position: { x: -18, y: 0, z: -7 },
      dialogue: ['Stew is hot, gossip is hotter.', 'Road crews keep asking for bread.'],
      tradeGold: 90,
      tradeInventory: createInventory(10, [createStack('fresh_bread', 18), createStack('carrot', 8), createStack('mana_potion', 2), createStack('raw_fish', 8), createStack('kindling', 10)]),
      craftStation: 'cooking',
      training: [{ skillId: 'Cooking', maxSkill: 25, costPerPoint: 2 }]
    }),
    npc({ id: 'npc_rohan_town', area: 'town', name: 'Rohan', role: 'quest', position: { x: -2, y: 0, z: 11 }, dialogue: ['Stable is full, road is not.', 'If you hear hooves on the north road, step aside.'] }),
    npc({ id: 'npc_tavia_town', area: 'town', name: 'Tavia', role: 'merchant', position: { x: 15, y: 0, z: 7 }, dialogue: ['Need cloth cut clean?', 'Tailors hear every market rumor.'], tradeGold: 90, tradeInventory: createInventory(10, [createStack('clean_cloth', 12), createStack('scissors'), createStack('leather', 8), createStack('backpack')]), craftStation: 'tailor', training: [{ skillId: 'Tailoring', maxSkill: 28, costPerPoint: 3 }] }),
    npc({ id: 'npc_corrin_town', area: 'town', name: 'Corrin', role: 'merchant', position: { x: 18, y: 0, z: 9 }, dialogue: ['Split logs into boards with your axe, then the plot starts feeling like yours.', 'Good beams start as patient trees. Carpentry rewards clean materials.'], tradeGold: 120, tradeInventory: createInventory(12, [createStack('wood', 18), createStack('logs', 8), createStack('boards', 10), createStack('stone_block', 10), createStack('torch', 6), createStack('gear', 2)]), craftStation: 'carpentry', training: [{ skillId: 'Carpentry', maxSkill: 28, costPerPoint: 3 }] }),
    npc({ id: 'npc_rusk_town', area: 'town', name: 'Rusk', role: 'merchant', position: { x: -12, y: 0, z: 2 }, dialogue: ['Straight shafts, quiet strings.', 'Good arrows start at the bench.'], tradeGold: 100, tradeInventory: createInventory(10, [createStack('arrow', 40), createStack('bolt', 24), createStack('boards', 8), createStack('spider_silk', 4), createStack('simple_bow')]), craftStation: 'fletching', training: [{ skillId: 'Bowcraft/Fletching', maxSkill: 28, costPerPoint: 3 }] }),
    npc({ id: 'npc_pavel_town', area: 'town', name: 'Pavel', role: 'merchant', position: { x: 13, y: 0, z: 11 }, dialogue: ['Small parts keep big doors honest.', 'Mind the spring on that trap.'], tradeGold: 110, tradeInventory: createInventory(10, [createStack('lockpick', 10), createStack('gear', 4), createStack('copper_bar', 6), createStack('lantern_item', 2)]), craftStation: 'tinkering', training: [{ skillId: 'Tinkering', maxSkill: 28, costPerPoint: 3 }] }),
    npc({ id: 'npc_guard_west_town', area: 'town', name: 'Gate Warden Alric', role: 'guard', position: { x: -1, y: 0, z: 14 }, dialogue: ['Old River Road has bandits. Pick a target, watch its frame, and do not forget potions.', 'Forest road is open. Keep a torch ready and report bandits before chasing them.'] }),
    npc({ id: 'npc_dockhand_town', area: 'town', name: 'Joryn', role: 'quest', position: { x: -15, y: 0, z: 13 }, dialogue: ['The plot remembers what you place. Use the build menu, then save before sailing back.', 'Ferry runs when the tide behaves. The plot has good light by morning.'] }),
    npc({
      id: 'npc_eldon_bank',
      area: 'bank',
      name: 'Eldon',
      role: 'banker',
      position: { x: 0, y: 0, z: -2 },
      dialogue: ['Your chest is ready. Bank excess resources before the road.', 'Bank space is cheaper than a mule, and it keeps your pack light.']
    }),
    npc({
      id: 'npc_brom_smithy',
      area: 'blacksmith',
      name: 'Brom',
      role: 'blacksmith',
      position: { x: 0, y: 0, z: -1 },
      dialogue: ['Select a pattern and mind the timer. Smelt ore first if you need bars.', 'Iron speaks when the hammer is honest. Repair work and tool craft both train the hand.'],
      craftStation: 'forge',
      training: [
        { skillId: 'Blacksmithing', maxSkill: 30, costPerPoint: 3 },
        { skillId: 'Mining', maxSkill: 25, costPerPoint: 2 }
      ]
    }),
    npc({ id: 'npc_aric_road', area: 'road', name: 'Aric', role: 'player', kind: 'social', position: { x: -2, y: 0, z: 2 }, dialogue: ['Bandits ahead. Stay sharp.'] }),
    npc({ id: 'npc_liora_crypt', area: 'crypt', name: 'Liora', role: 'player', kind: 'social', position: { x: -7, y: 0, z: 1 }, dialogue: ['Ready when you are.', 'I got a bad feeling about this.'] }),
    portal('portal_bank', 'town', 'Bank Door', -8, -2, 'bank', { x: 0, y: 0, z: 5 }),
    portal('portal_smith', 'town', 'Smithy Door', 6, -3, 'blacksmith', { x: -5, y: 0, z: 4 }),
    portal('portal_forest', 'town', 'Forest Road', 0, 14, 'forest', { x: 0, y: 0, z: 10 }),
    portal('portal_road', 'town', 'Old River Road', 13, 4, 'road', { x: -8, y: 0, z: 0 }),
    portal('portal_plot', 'town', 'Housing Plot Ferry', -15, 13, 'housing', { x: -8, y: 0, z: 5 }),
    portal('portal_crypt', 'forest', 'Mine to Crypt', 7, -5, 'crypt', { x: -9, y: 0, z: 4 }),
    portal('portal_town_bank', 'bank', 'Town Door', 0, 6, 'town', { x: -8, y: 0, z: -2 }),
    portal('portal_town_smith', 'blacksmith', 'Town Door', -6, 5, 'town', { x: 6, y: 0, z: -3 }),
    portal('portal_town_forest', 'forest', 'Town Road', 0, 11, 'town', { x: 0, y: 0, z: 13 }),
    portal('portal_town_road', 'road', 'Town Gate', -8, 0, 'town', { x: 12, y: 0, z: 4 }),
    portal('portal_town_plot', 'housing', 'Town Ferry', -8, 5, 'town', { x: -14, y: 0, z: 12 }),
    portal('portal_forest_crypt', 'crypt', 'Forest Exit', -9, 4, 'forest', { x: 7, y: 0, z: -7 }),
    {
      id: 'crate_town_guard_supplies',
      kind: 'container',
      area: 'town',
      name: 'Guard Supply Crate',
      position: { x: -4, y: 0, z: 8 },
      blocksMovement: true,
      locked: false,
      opened: false,
      hidden: false,
      protected: true,
      ownerId: 'town_guard',
      accessRule: 'public',
      lockDifficulty: 0,
      trap: null,
      loot: [
        { itemId: 'bandage', quantity: 2 },
        { itemId: 'torch', quantity: 1 }
      ],
      gold: 6
    } as Entity,
    {
      id: 'cache_forest_tracks',
      kind: 'container',
      area: 'forest',
      name: 'Hidden Hunter Cache',
      position: { x: -9, y: 0, z: 8 },
      blocksMovement: false,
      locked: false,
      opened: false,
      hidden: true,
      lockDifficulty: 0,
      trap: null,
      loot: [
        { itemId: 'bandage', quantity: 2 },
        { itemId: 'lockpick', quantity: 2 }
      ],
      gold: 12
    } as Entity,
    {
      id: 'chest_crypt_warded',
      kind: 'container',
      area: 'crypt',
      name: 'Warded Reliquary',
      position: { x: 7, y: 0, z: 7 },
      blocksMovement: true,
      locked: true,
      opened: false,
      hidden: false,
      lockDifficulty: 32,
      trap: {
        armed: true,
        detected: false,
        difficulty: 28,
        damage: 14
      },
      loot: [
        { itemId: 'glimmer_gem', quantity: 1 },
        { itemId: 'mana_potion', quantity: 1 },
        { itemId: 'recall_rune', quantity: 1 }
      ],
      gold: 55,
      requiredSpellId: 'detect_magic'
    } as Entity,
    {
      id: 'secret_crypt_loose_wall_cache',
      kind: 'container',
      area: 'crypt',
      name: 'Loose Crypt Wall',
      position: { x: -12, y: 0, z: 6 },
      blocksMovement: false,
      locked: false,
      opened: false,
      hidden: true,
      lockDifficulty: 0,
      trap: null,
      loot: [
        { itemId: 'map_fragment', quantity: 1 },
        { itemId: 'crypt_lore_clue', quantity: 1 }
      ],
      gold: 18
    } as Entity,
    {
      id: 'chest_crypt_secret_room',
      kind: 'container',
      area: 'crypt',
      name: 'Ancient Treasure Chest',
      position: { x: 12, y: 0, z: -8 },
      blocksMovement: true,
      locked: true,
      opened: false,
      hidden: true,
      lockDifficulty: 44,
      trap: {
        armed: true,
        detected: false,
        difficulty: 34,
        damage: 18
      },
      loot: [
        { itemId: 'rough_treasure_map', quantity: 1 },
        { itemId: 'vendor_contract', quantity: 1 },
        { itemId: 'repair_kit', quantity: 1 }
      ],
      gold: 70
    } as Entity,
    ...resourcePlacements.map(resource),
    enemy('enemy_skel_1', 'crypt', 'Skeletal Warrior', 'Undead', 5, 1, 0, 40, [5, 9]),
    enemy('enemy_skel_2', 'crypt', 'Skeletal Warrior', 'Undead', 5, 5, -2, 40, [5, 9]),
    enemy('enemy_skel_3', 'crypt', 'Skeletal Warrior', 'Undead', 6, 3, 5, 48, [6, 10]),
    enemy('enemy_cultist_1', 'crypt', 'Mage Cultist', 'Cultist', 7, -3, 4, 46, [5, 8], 'mage'),
    enemy('enemy_bandit_1', 'road', 'Highway Bandit', 'Bandit', 4, 2, -2, 56, [5, 9]),
    enemy('enemy_bandit_2', 'road', 'Bandit Archer', 'Bandit', 4, 5, 1, 46, [4, 8], 'archer'),
    enemy('enemy_brigand_1', 'road', 'Brigand Swordsman', 'Bandit', 6, 7, -2, 70, [7, 11]),
    enemy('enemy_wolf_1', 'forest', 'Grey Wolf', 'Beast', 4, -4, 2, 36, [4, 8], 'beast')
  ].forEach((entity) => {
    entities[entity.id] = entity;
  });

  return entities;
}

export function createInitialGameState(): GameState {
  const inventory = createInventory(36, [
    createStack('iron_sword'),
    createStack('simple_bow'),
    createStack('beginner_spellbook'),
    createStack('health_potion', 2),
    createStack('mana_potion', 1),
    createStack('bandage', 6),
    createStack('arrow', 25),
    createStack('axe'),
    createStack('pickaxe'),
    createStack('sulfurous_ash', 4),
    createStack('ginseng', 3),
    createStack('garlic', 3),
    createStack('spider_silk', 3),
    createStack('clean_cloth', 2),
    createStack('torch', 3),
    createStack('scissors'),
    createStack('carrot', 4)
  ]);

  return {
    version: 1,
    saveVersion: 2,
    clock: 0,
    paused: false,
    player: {
      id: 'player',
      name: 'Valen',
      level: 1,
      xp: 0,
      xpToNext: 120,
      health: 115,
      mana: 60,
      stamina: 25,
      attributes: {
        Strength: 18,
        Agility: 14,
        Dexterity: 14,
        Intelligence: 14,
        Constitution: 16,
        Luck: 10
      },
      statModes: {
        Strength: 'raise',
        Agility: 'raise',
        Dexterity: 'raise',
        Intelligence: 'raise',
        Constitution: 'raise',
        Luck: 'raise'
      },
      skills: createInitialSkills(),
      skillCap: 700,
      selectedSkillGroup: 'Combat',
      inventory,
      bank: createInventory(24),
      equipment: {
        weapon: createStack('iron_sword'),
        armor: createStack('leather_armor'),
        backpack: createStack('backpack'),
        shield: createStack('cracked_shield')
      },
      gold: 95,
      bankGold: 0,
      position: { ...areas.town.spawn },
      movement: {
        velocity: { x: 0, z: 0 },
        intent: null,
        intentUntil: 0,
        path: [],
        waypoint: null,
        tile: { x: Math.round(areas.town.spawn.x), z: Math.round(areas.town.spawn.z) },
        maxSpeed: 4.8
      },
      actionState: createIdleActionState(0),
      targetPosition: null,
      currentArea: 'town',
      activeTargetId: null,
      activeQuestIds: ['prepare_for_road'],
      completedQuestIds: [],
      spellbook: {
        itemId: 'beginner_spellbook',
        knownSpellIds: beginnerSpellIds
      },
      combatProfile: {
        hidden: false,
        hiddenUntil: 0,
        poison: null,
        bardCooldowns: {},
        lastStealthCheckAt: 0
      },
      reputation: {
        status: 'lawful',
        townStanding: 10,
        fame: 0,
        karma: 0,
        recentCriminalUntil: 0,
        aggressionCount: 0,
        murderCount: 0,
        finesOwed: 0,
        warningAcknowledged: {},
        lastCrimeAt: -999
      },
      downed: {
        active: false,
        since: 0,
        respawnAt: 0
      }
    },
    entities: createInitialEntities(),
    quests: createInitialQuests(),
    craftQueue: [],
    gathering: null,
    buildMode: {
      active: false,
      selectedPieceId: 'stone_wall',
      rotation: 0,
      snapToGrid: true,
      ghostPosition: { x: 0, y: 0, z: 0 },
      valid: false,
      message: 'Select a piece.',
      moveBuildingId: null
    },
    chat: [
      { id: createId('chat'), channel: 'System', text: 'You arrive in Briarbrook with a packed road kit.', tone: 'system', createdAt: 0 },
      { id: createId('chat'), channel: 'Local', speaker: 'Mira', text: 'Welcome, Valen. Come to the fountain and I will point you toward the road.', createdAt: 0.1 },
      { id: createId('chat'), channel: 'System', text: 'Tip: WASD moves, E interacts, and 1-0 uses the hotbar.', tone: 'system', createdAt: 0.2 }
    ],
    floatingTexts: [],
    projectiles: [],
    realtime: {
      tickRate: 30,
      fixedDelta: 1 / 30,
      tick: 0,
      lastFrameDelta: 0,
      actionQueue: [],
      actionHistory: [],
      pendingAction: null,
      statusEffects: {}
    },
      combat: {
      meleeCooldown: 0,
      rangedCooldown: 0,
      magicCooldown: 0,
      abilityCooldowns: {},
      defenseUntil: 0,
      riposteUntil: 0,
      lastAttackAt: 0,
      lastDamagedAt: 0,
      hitFlashes: {},
      telegraphs: []
    },
    bandage: null,
    spellCasting: null,
    spellEffects: [],
    ui: {
      panels: {
        inventory: false,
        help: false,
        status: false,
        spellbook: false,
        combatActions: false,
        guide: true,
        journal: false,
        market: false,
        treasureMap: false,
        skills: false,
        character: false,
        bank: false,
        trade: false,
        merchant: false,
        crafting: false,
        build: false,
        quest: true
      },
      selectedInventorySlot: null,
      selectedBankSlot: null,
      hoverTarget: null,
      selectedTarget: null,
      targeting: null,
      contextMenu: null,
      selectedRecipeId: 'smelt_iron',
      selectedTreasureMapId: 'greymont_cache',
      selectedHousingStorageId: null,
      selectedSpellId: 'magic_arrow',
      spellSearch: '',
      spellbookCircle: 'all',
      spellbookFilter: 'known',
      spellbookView: 'grid',
      journalTab: 'quests',
      skillSearch: '',
      skillView: 'ledger',
      professionFilter: 'all',
      professionAtlasZoom: 1,
      pinnedProfessionGoalId: null,
      devTravel: false,
      fadeUntil: 0,
      selectedStationType: 'forge',
      craftQuantity: 1,
      selectedBuildCategory: 'Walls',
      marketCategory: 'all',
      marketSearch: '',
      chatTab: 'Local',
      activeHotbarSlot: 0,
      hotbar: createDefaultHotbar(),
      uiScale: 1,
      reducedMotion: false,
      prompt: 'Arrive in Briarbrook: talk to Mira at the fountain. Press E nearby or click her.',
      trade: null,
      merchant: null
    },
    world: {
      placedBuildings: [],
      housing: createInitialHousingState(),
      discoveredAreas: ['town'],
      resourceTiles: createInitialResourceTiles(),
      magicFields: [],
      recallMark: null,
      time: {
        dayLengthSeconds: 96,
        day: 0,
        timeOfDay: 0,
        hour: 0,
        minute: 0,
        phase: 'night',
        visibilityModifier: 0.62,
        stealthModifier: 1.18
      },
      activeEvents: [],
      discoveredRumorIds: [],
      resourcePressure: {},
      economy: createInitialEconomyState(),
      treasure: createInitialTreasureState(),
      crimeEvents: []
    },
    dev: createInitialDevState(0)
  };
}

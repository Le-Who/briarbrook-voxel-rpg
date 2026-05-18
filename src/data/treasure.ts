import type { SecretDefinition, SecretRuntimeState, TrapDefinition, TreasureMapDefinition, TreasureMapRuntimeState, TreasureState } from '../game/types';

export const treasureMapDefinitions: Record<string, TreasureMapDefinition> = {
  greymont_cache: {
    id: 'greymont_cache',
    tier: 1,
    regionHint: 'forest',
    clueText: 'Where Greymont roots crowd the old mine road, count three paces from the pale stone and dig where the moss thins.',
    approximateCoordinate: { x: 9, y: 0, z: -7 },
    approximateLocation: { x: 9, y: 0, z: -7 },
    requiredCartography: 20,
    cartographyDifficulty: 20,
    digRadius: 4,
    searchRadius: 4,
    requiredTool: 'shovel',
    possibleEncounters: ['Bandit', 'Beast'],
    lootTableId: 'tier1_forest_cache',
    hiddenModifiers: ['disturbed_ground', 'moss_thin', 'old_mine_road'],
    persistentStateKey: 'treasure_greymont_cache'
  }
};

export const secretDefinitions: Record<string, SecretDefinition> = {
  crypt_loose_wall: {
    id: 'crypt_loose_wall',
    areaId: 'crypt',
    location: { x: -12, y: 0, z: 6 },
    triggerType: 'detect_hidden',
    revealMethods: ['detect_hidden', 'reveal'],
    requiredSkill: 'Detect Hidden',
    difficulty: 26,
    revealDuration: 90,
    revealedState: 'hidden_cache',
    revealedEntityId: 'secret_crypt_loose_wall_cache',
    reward: [
      { itemId: 'map_fragment', quantity: 1 },
      { itemId: 'glimmer_gem', quantity: 1 }
    ],
    danger: 'none',
    persistenceKey: 'secret_crypt_loose_wall',
    persistentStateKey: 'secret_crypt_loose_wall'
  },
  crypt_pressure_plate: {
    id: 'crypt_pressure_plate',
    areaId: 'crypt',
    location: { x: 3, y: 0, z: -3 },
    triggerType: 'pressure_plate',
    revealMethods: ['detect_hidden', 'reveal'],
    requiredSkill: 'Detect Hidden',
    difficulty: 30,
    revealDuration: 60,
    revealedState: 'pressure_plate',
    reward: [{ itemId: 'crypt_lore_clue', quantity: 1 }],
    danger: 'ambush',
    persistenceKey: 'secret_crypt_pressure_plate',
    persistentStateKey: 'secret_crypt_pressure_plate'
  },
  crypt_sealed_alcove: {
    id: 'crypt_sealed_alcove',
    areaId: 'crypt',
    location: { x: 7, y: 0, z: 7 },
    triggerType: 'spell',
    revealMethods: ['detect_magic', 'reveal', 'spell'],
    requiredSkill: 'Item Identification',
    difficulty: 28,
    revealDuration: 100,
    revealedState: 'sealed_alcove',
    revealedEntityId: 'chest_crypt_warded',
    reward: [
      { itemId: 'glimmer_gem', quantity: 1 },
      { itemId: 'recall_rune', quantity: 1 }
    ],
    danger: 'trap',
    persistenceKey: 'secret_crypt_sealed_alcove',
    persistentStateKey: 'secret_crypt_sealed_alcove'
  },
  crypt_treasure_room: {
    id: 'crypt_treasure_room',
    areaId: 'crypt',
    location: { x: 12, y: 0, z: -8 },
    triggerType: 'spell',
    revealMethods: ['detect_hidden', 'reveal', 'detect_magic', 'spell'],
    requiredSkill: 'Lockpicking',
    difficulty: 42,
    revealDuration: 120,
    revealedState: 'treasure_room',
    revealedEntityId: 'chest_crypt_secret_room',
    reward: [
      { itemId: 'rough_treasure_map', quantity: 1 },
      { itemId: 'vendor_contract', quantity: 1 }
    ],
    danger: 'trap',
    persistenceKey: 'secret_crypt_treasure_room',
    persistentStateKey: 'secret_crypt_treasure_room'
  }
};

export const lockDefinitions = {
  simple_cache: {
    difficulty: 24,
    lockType: 'simple',
    requiredTool: 'lockpick',
    breakChance: 0.18,
    retryCooldown: 4,
    alarmChance: 0.08
  },
  warded_reliquary: {
    difficulty: 32,
    lockType: 'warded',
    requiredTool: 'lockpick',
    breakChance: 0.25,
    retryCooldown: 6,
    alarmChance: 0.16
  },
  treasure_cache: {
    difficulty: 44,
    lockType: 'ancient',
    requiredTool: 'lockpick',
    breakChance: 0.32,
    retryCooldown: 8,
    alarmChance: 0.28
  }
} as const;

export const trapDefinitions: Record<string, TrapDefinition> = {
  dart: {
    trapType: 'dart',
    detectionDifficulty: 22,
    disarmDifficulty: 26,
    damageOrEffect: 10,
    triggerShape: 'self',
    resetPolicy: 'never'
  },
  poison_dart: {
    trapType: 'poison_dart',
    detectionDifficulty: 30,
    disarmDifficulty: 34,
    damageOrEffect: 14,
    triggerShape: 'self',
    resetPolicy: 'never'
  },
  bone_alarm: {
    trapType: 'summon',
    detectionDifficulty: 28,
    disarmDifficulty: 32,
    damageOrEffect: 2,
    triggerShape: 'radius',
    resetPolicy: 'cooldown'
  }
};

export const treasureLootTables: Record<string, Array<{ itemId: string; quantity: number }>> = {
  tier1_forest_cache: [
    { itemId: 'glimmer_gem', quantity: 1 },
    { itemId: 'sulfurous_ash', quantity: 4 },
    { itemId: 'black_pearl', quantity: 3 },
    { itemId: 'repair_kit', quantity: 1 },
    { itemId: 'map_fragment', quantity: 1 },
    { itemId: 'vendor_contract', quantity: 1 },
    { itemId: 'wall_tapestry', quantity: 1 }
  ]
};

export function createInitialTreasureState(): TreasureState {
  const maps = Object.fromEntries(
    Object.keys(treasureMapDefinitions).map((id): [string, TreasureMapRuntimeState] => [
      id,
      {
        fragmentCount: 0,
        decipheredPrecision: 0,
        found: false,
        pinned: false,
        lastCheckedAt: 0
      }
    ])
  );
  const secrets = Object.fromEntries(
    Object.keys(secretDefinitions).map((id): [string, SecretRuntimeState] => [
      id,
      {
        revealedUntil: 0,
        disarmed: false,
        triggered: false,
        opened: false
      }
    ])
  );
  return { maps, secrets, excavationCooldowns: {} };
}

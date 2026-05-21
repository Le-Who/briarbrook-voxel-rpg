export const adventureReferencePlan = {
  road: {
    referenceId: 'R2',
    location: 'Old River Road',
    phase14ReferenceIds: ['REF_143_OLD_RIVER_ROAD', 'REF_140_TRAVERSABLE_ROAD_FOREST'],
    compositionZones: [
      { id: 'river-edge', label: 'River Edge', anchor: { x: 7, z: 9 }, role: 'Water, bridge, stone banks, and visible road-edge blockers.' },
      { id: 'fenced-combat-lane', label: 'Fenced Combat Lane', anchor: { x: 0, z: -1 }, role: 'Readable road spine for player, ally, target frame, and kiting.' },
      { id: 'combat-pocket', label: 'Bandit Pocket', anchor: { x: 3, z: -2 }, role: 'Clear enemy silhouettes, telegraphs, slash VFX, and ranged sightline.' },
      { id: 'checkpoint-edge', label: 'Checkpoint Edge', anchor: { x: -8, z: 1 }, role: 'Town-gate landmark, warning props, crates, and nonblocking entry.' }
    ],
    combatLane: {
      minReadableWidth: 6,
      clearCenterline: true,
      pathingProtected: true
    },
    landmarks: ['roadside checkpoint', 'bandit warning sign', 'old bridge', 'broken supply cart'],
    dressing: {
      lanternPosts: [
        { x: 1, z: 2 },
        { x: -5, z: -1 },
        { x: 7, z: 4 },
        { x: -1, z: -5 }
      ],
      lowFences: [
        { x1: -11, z1: 5, x2: -4, z2: 5 },
        { x1: 3, z1: 5, x2: 11, z2: 5 },
        { x1: -9, z1: -7, x2: -3, z2: -7 }
      ],
      embankments: [
        { x: -12, z: -1 },
        { x: 11, z: 2 },
        { x: 9, z: -5 }
      ],
      roadStones: [
        { x: -6, z: -3 },
        { x: -3, z: -2 },
        { x: 0, z: -1 },
        { x: 3, z: 0 },
        { x: 6, z: 2 },
        { x: 9, z: 4 }
      ]
    },
    combatPockets: [
      { id: 'player-kite-pocket', x: -2, z: -2, radius: 2.2 },
      { id: 'bandit-melee-pocket', x: 2, z: -2, radius: 2.4 },
      { id: 'archer-sightline-pocket', x: 5, z: 1, radius: 2.0 }
    ],
    banditEncounter: {
      playerAllyId: 'npc_aric_road',
      primaryTargetId: 'enemy_bandit_1',
      enemies: ['enemy_bandit_1', 'enemy_bandit_2', 'enemy_brigand_1'],
      composition: 'player and ally inside a readable road lane, bandits split across the bend'
    },
    feedback: ['target-frame', 'target-outline', 'slash-arc', 'damage-float', 'projectile-line'],
    dynamicLightBudget: 3
  },
  forest: {
    referenceId: 'R4',
    location: 'Greymont Forest',
    phase14ReferenceIds: ['REF_143_GREYMONT_FOREST', 'REF_140_TRAVERSABLE_ROAD_FOREST'],
    compositionZones: [
      { id: 'mine-approach', label: 'Mine Approach', anchor: { x: 7, z: -7 }, role: 'Mine landmark, ore nodes, cart, rail, lantern, and readable stone mouth.' },
      { id: 'gathering-clearing', label: 'Gathering Clearing', anchor: { x: 10, z: 4 }, role: 'Active tree/ore interaction with compact progress and open player silhouette.' },
      { id: 'town-road-bridge', label: 'Town Road Bridge', anchor: { x: 0, z: 6 }, role: 'Visible stream and bridge route back to Briarbrook.' },
      { id: 'forest-understory', label: 'Forest Understory', anchor: { x: -8, z: 8 }, role: 'Dense but readable foliage, herbs, stumps, and path edges.' }
    ],
    landmarks: ['mine entrance', 'ore nodes', 'hunter camp supplies', 'stream bridges', 'bandit tracks'],
    resourceResponses: ['Chop', 'Protected', 'Depleted', 'Too small/shrub'],
    permanentResourceLabels: false,
    harvesting: {
      primaryTreeId: 'res_tree_5',
      activeToolHotbarSlot: 6,
      oreNodeIds: ['res_iron_1', 'res_copper_1', 'res_iron_2', 'res_copper_2'],
      treeVariantMinimum: 4
    },
    pathNetwork: [
      { id: 'town-road', from: { x: 0, z: 11 }, to: { x: 0, z: 5 } },
      { id: 'mine-spur', from: { x: 0, z: 5 }, to: { x: 7, z: -5 } },
      { id: 'gathering-loop', from: { x: 0, z: 5 }, to: { x: 11, z: 4 } },
      { id: 'herb-loop', from: { x: 0, z: 6 }, to: { x: -9, z: 8 } }
    ],
    dressing: {
      logPiles: [
        { x: -7, z: -7 },
        { x: 10, z: -1 }
      ],
      forageClues: [
        { x: -9, z: 8 },
        { x: 3, z: 9 },
        { x: 6, z: -9 }
      ]
    },
    dynamicLightBudget: 2
  },
  crypt: {
    referenceId: 'R3',
    location: 'Forgotten Crypt',
    phase14ReferenceIds: ['REF_144_CRYPT_COMBAT', 'REF_144_CRYPT_SECRET'],
    compositionZones: [
      { id: 'entrance-threshold', label: 'Mine Threshold', anchor: { x: -9, z: 4 }, role: 'Readable forest-return doorway with chains, torches, and broken masonry.' },
      { id: 'combat-chamber', label: 'Combat Chamber', anchor: { x: 1, z: 0 }, role: 'Open center ring for player, ally, target frame, spell line, and enemy silhouettes.' },
      { id: 'secret-reliquary', label: 'Secret Reliquary', anchor: { x: 7, z: 7 }, role: 'Warded chest, hidden wall, false door, and non-pixel-hunt interaction labels.' },
      { id: 'altar-niche', label: 'Altar Niche', anchor: { x: 0, z: -8 }, role: 'Quiet exploration altar with candles, sarcophagus, blue glow, and readable floor path.' }
    ],
    roomShapes: [
      { id: 'entry-hall', bounds: { minX: -13, maxX: -7, minZ: 2, maxZ: 7 }, role: 'arrival and return route' },
      { id: 'central-vault', bounds: { minX: -6, maxX: 8, minZ: -5, maxZ: 5 }, role: 'combat and kiting' },
      { id: 'reliquary-wing', bounds: { minX: 4, maxX: 13, minZ: 4, maxZ: 10 }, role: 'secret and treasure inspection' },
      { id: 'altar-wing', bounds: { minX: -4, maxX: 4, minZ: -10, maxZ: -6 }, role: 'quiet exploration' }
    ],
    props: ['cracked floors', 'torch pools', 'pillars', 'bones', 'sarcophagus', 'altar', 'rubble', 'secret wall'],
    secretScene: {
      interactionEntities: ['secret_crypt_loose_wall_cache', 'chest_crypt_warded', 'secret_crypt_false_door'],
      promptCopy: ['Loose Crypt Wall - Inspect', 'Warded Reliquary - Open', 'False Crypt Door - Examine'],
      lightingHint: 'candles and cool altar glow lead the eye to non-hidden interactables'
    },
    encounter: {
      companionId: 'npc_liora_crypt',
      primaryTargetId: 'enemy_skel_1',
      enemies: ['enemy_skel_1', 'enemy_skel_2', 'enemy_skel_3', 'enemy_cultist_1']
    },
    feedback: ['target-frame', 'target-outline', 'loot-nearby-label', 'modest-spell-vfx', 'damage-float'],
    lighting: {
      torchPools: [
        { x: -8, z: -4 },
        { x: -5, z: 6 },
        { x: 5, z: -6 },
        { x: 8, z: 4 },
        { x: -12, z: 9 },
        { x: 12, z: -8 },
        { x: 0, z: 10 }
      ],
      maxDarkness: 'readable silhouettes and floor tiles remain visible outside torch pools'
    },
    darkness: {
      atmospheric: true,
      enemySilhouettesReadable: true
    },
    dynamicLightBudget: 3
  }
} as const;

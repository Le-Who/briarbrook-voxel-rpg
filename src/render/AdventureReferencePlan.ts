export const adventureReferencePlan = {
  road: {
    referenceId: 'R2',
    location: 'Old River Road',
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
      ]
    },
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
    landmarks: ['mine entrance', 'ore nodes', 'hunter camp supplies', 'stream bridges', 'bandit tracks'],
    resourceResponses: ['Chop', 'Protected', 'Depleted', 'Too small/shrub'],
    permanentResourceLabels: false,
    harvesting: {
      primaryTreeId: 'res_tree_5',
      activeToolHotbarSlot: 6,
      oreNodeIds: ['res_iron_1', 'res_copper_1', 'res_iron_2', 'res_copper_2'],
      treeVariantMinimum: 4
    },
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
    props: ['cracked floors', 'torch pools', 'pillars', 'bones', 'sarcophagus', 'altar', 'rubble', 'secret wall'],
    encounter: {
      companionId: 'npc_liora_crypt',
      primaryTargetId: 'enemy_skel_1',
      enemies: ['enemy_skel_1', 'enemy_skel_2', 'enemy_skel_3', 'enemy_cultist_1']
    },
    feedback: ['target-frame', 'target-outline', 'loot-nearby-label', 'modest-spell-vfx', 'damage-float'],
    darkness: {
      atmospheric: true,
      enemySilhouettesReadable: true
    },
    dynamicLightBudget: 3
  }
} as const;

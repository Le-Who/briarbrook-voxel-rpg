import type { AreaId, CombatTelegraph } from '../game/types';

export type CombatRoleId = 'grunt' | 'brute' | 'archer' | 'caster' | 'skirmisher' | 'guard' | 'support' | 'trapkeeper';

export interface CombatRoleContract {
  id: CombatRoleId;
  label: string;
  preferredDistance: number;
  telegraphKind: CombatTelegraph['kind'];
  warningColor: 'amber' | 'red' | 'violet';
  windupSeconds: number;
  cooldownSeconds: number;
  lesson: string;
  counters: string[];
}

export interface CombatEncounterDefinition {
  id: string;
  area: AreaId;
  label: string;
  roles: CombatRoleId[];
  lesson: string;
  maxSpikeDamage: number;
}

export const combatRoleContracts: Record<CombatRoleId, CombatRoleContract> = {
  grunt: {
    id: 'grunt',
    label: 'Grunt',
    preferredDistance: 1.15,
    telegraphKind: 'slash',
    warningColor: 'amber',
    windupSeconds: 0.55,
    cooldownSeconds: 1.45,
    lesson: 'Basic movement, target selection, and potion timing.',
    counters: ['block', 'parry', 'spacing']
  },
  brute: {
    id: 'brute',
    label: 'Brute',
    preferredDistance: 1.35,
    telegraphKind: 'cone',
    warningColor: 'red',
    windupSeconds: 1.05,
    cooldownSeconds: 2.35,
    lesson: 'Slow heavy attacks are avoided by moving before impact.',
    counters: ['sidestep', 'guard', 'snare']
  },
  archer: {
    id: 'archer',
    label: 'Archer',
    preferredDistance: 5.5,
    telegraphKind: 'shot',
    warningColor: 'amber',
    windupSeconds: 0.72,
    cooldownSeconds: 1.9,
    lesson: 'Use line of sight, closing pressure, and return fire.',
    counters: ['line of sight', 'close distance', 'bow pressure']
  },
  caster: {
    id: 'caster',
    label: 'Caster',
    preferredDistance: 5.2,
    telegraphKind: 'cast',
    warningColor: 'violet',
    windupSeconds: 1.1,
    cooldownSeconds: 2.2,
    lesson: 'Cast bars reward interrupts, target priority, and mana timing.',
    counters: ['interrupt', 'line of sight', 'Resisting Spells']
  },
  skirmisher: {
    id: 'skirmisher',
    label: 'Skirmisher',
    preferredDistance: 2.4,
    telegraphKind: 'leap',
    warningColor: 'amber',
    windupSeconds: 0.48,
    cooldownSeconds: 1.05,
    lesson: 'Kiting enemies teach facing, evasion, and recovery windows.',
    counters: ['snare', 'ranged pressure', 'keep stamina']
  },
  guard: {
    id: 'guard',
    label: 'Guard / Shield',
    preferredDistance: 1.2,
    telegraphKind: 'slash',
    warningColor: 'amber',
    windupSeconds: 0.65,
    cooldownSeconds: 1.7,
    lesson: 'Shield enemies block frontal spam and reward flanks or magic.',
    counters: ['flank', 'magic', 'stagger']
  },
  support: {
    id: 'support',
    label: 'Support',
    preferredDistance: 4.8,
    telegraphKind: 'cast',
    warningColor: 'violet',
    windupSeconds: 0.9,
    cooldownSeconds: 2.6,
    lesson: 'Support enemies make target priority matter without burst spikes.',
    counters: ['interrupt', 'focus target', 'line of sight']
  },
  trapkeeper: {
    id: 'trapkeeper',
    label: 'Trapkeeper',
    preferredDistance: 3.8,
    telegraphKind: 'shot',
    warningColor: 'red',
    windupSeconds: 0.8,
    cooldownSeconds: 2.4,
    lesson: 'Positioning, Detect Hidden, Remove Trap, and evasion matter.',
    counters: ['Detect Hidden', 'Remove Trap', 'avoid hazards']
  }
};
export const combatEncounterDefinitions: Record<string, CombatEncounterDefinition> = {
  road_bandit_pair: {
    id: 'road_bandit_pair',
    area: 'road',
    label: 'Old River Road Bandit Pair',
    roles: ['grunt', 'archer'],
    lesson: 'Select a priority target, close on archers, and use the defensive action before impact.',
    maxSpikeDamage: 9
  },
  forest_wolf_scout: {
    id: 'forest_wolf_scout',
    area: 'forest',
    label: 'Greymont Wolf Scout',
    roles: ['skirmisher'],
    lesson: 'Animals test movement and stamina without armor checks.',
    maxSpikeDamage: 8
  },
  mine_skeleton_patrol: {
    id: 'mine_skeleton_patrol',
    area: 'crypt',
    label: 'Mine Skeleton Patrol',
    roles: ['grunt', 'brute'],
    lesson: 'Undead patrols teach slow telegraphs, bandage windows, and target spacing.',
    maxSpikeDamage: 11
  },
  crypt_shield_caster_room: {
    id: 'crypt_shield_caster_room',
    area: 'crypt',
    label: 'Crypt Shield And Caster Room',
    roles: ['guard', 'caster'],
    lesson: 'Shield front pressure while the caster asks for interrupts and target priority.',
    maxSpikeDamage: 13
  }
};

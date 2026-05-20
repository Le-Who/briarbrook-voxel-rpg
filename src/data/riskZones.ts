import type { AreaId, GameState, WorldEventType, ZoneRuleDefinition, ZoneType } from '../game/types';

export const zoneRules: Record<ZoneType, ZoneRuleDefinition> = {
  guarded_town: {
    id: 'guarded_town',
    label: 'Guarded Town Zone',
    riskLabel: 'Safe / Guarded',
    canAttackPlayers: false,
    canAttackNPCs: false,
    canSteal: false,
    guardResponse: 'guarded',
    reputationImpact: -8,
    lootRules: 'protected',
    trespassRules: 'none',
    summonHelpRules: 'guard_horn'
  },
  private_interior: {
    id: 'private_interior',
    label: 'Private Interior',
    riskLabel: 'Private / Witnessed',
    canAttackPlayers: false,
    canAttackNPCs: false,
    canSteal: false,
    guardResponse: 'fine',
    reputationImpact: -5,
    lootRules: 'protected',
    trespassRules: 'warn',
    summonHelpRules: 'npc_shout'
  },
  public_interior: {
    id: 'public_interior',
    label: 'Public Interior',
    riskLabel: 'Safe / Public',
    canAttackPlayers: false,
    canAttackNPCs: false,
    canSteal: false,
    guardResponse: 'warning',
    reputationImpact: -3,
    lootRules: 'protected',
    trespassRules: 'none',
    summonHelpRules: 'npc_shout'
  },
  wilderness: {
    id: 'wilderness',
    label: 'Wilderness',
    riskLabel: 'PvE Risk',
    canAttackPlayers: false,
    canAttackNPCs: true,
    canSteal: true,
    guardResponse: 'none',
    reputationImpact: 0,
    lootRules: 'normal',
    trespassRules: 'none',
    summonHelpRules: 'none'
  },
  dungeon: {
    id: 'dungeon',
    label: 'Dungeon',
    riskLabel: 'High PvE Risk',
    canAttackPlayers: false,
    canAttackNPCs: true,
    canSteal: true,
    guardResponse: 'none',
    reputationImpact: 0,
    lootRules: 'dungeon',
    trespassRules: 'none',
    summonHelpRules: 'none'
  },
  player_plot: {
    id: 'player_plot',
    label: 'Player Plot',
    riskLabel: 'Owned / Safe',
    canAttackPlayers: false,
    canAttackNPCs: false,
    canSteal: false,
    guardResponse: 'warning',
    reputationImpact: -4,
    lootRules: 'protected',
    trespassRules: 'warn',
    summonHelpRules: 'npc_shout'
  },
  event_zone: {
    id: 'event_zone',
    label: 'Event Zone',
    riskLabel: 'Event Risk',
    canAttackPlayers: false,
    canAttackNPCs: true,
    canSteal: true,
    guardResponse: 'warning',
    reputationImpact: -1,
    lootRules: 'normal',
    trespassRules: 'none',
    summonHelpRules: 'npc_shout'
  },
  safe_area: {
    id: 'safe_area',
    label: 'PvP-disabled Safe Area',
    riskLabel: 'Safe',
    canAttackPlayers: false,
    canAttackNPCs: false,
    canSteal: false,
    guardResponse: 'warning',
    reputationImpact: -2,
    lootRules: 'protected',
    trespassRules: 'none',
    summonHelpRules: 'npc_shout'
  },
  future_risk: {
    id: 'future_risk',
    label: 'Future Risk Zone',
    riskLabel: 'PvP Disabled For Slice',
    canAttackPlayers: false,
    canAttackNPCs: true,
    canSteal: true,
    guardResponse: 'none',
    reputationImpact: -1,
    lootRules: 'future_full_loot_disabled',
    trespassRules: 'none',
    summonHelpRules: 'none'
  }
};

export const areaZoneTypes: Record<AreaId, ZoneType> = {
  town: 'guarded_town',
  bank: 'public_interior',
  blacksmith: 'public_interior',
  forest: 'wilderness',
  crypt: 'dungeon',
  road: 'wilderness',
  housing: 'player_plot'
};

export function zoneForArea(areaId: AreaId): ZoneRuleDefinition {
  return zoneRules[areaZoneTypes[areaId]];
}

const eventZoneTypes = new Set<WorldEventType>(['bandit_ambush', 'crypt_spill', 'storm', 'rare_ore']);

export function zoneForState(state: GameState, areaId: AreaId = state.player.currentArea): ZoneRuleDefinition {
  const base = zoneForArea(areaId);
  const eventZoneBase = base.id === 'wilderness' || base.id === 'dungeon' || base.id === 'future_risk';
  if (!eventZoneBase) return base;
  const activeLocalEvent = state.world.activeEvents.some(
    (event) =>
      event.area === areaId &&
      event.endsAt > state.clock &&
      eventZoneTypes.has(event.type) &&
      (event.discovered || state.world.discoveredRumorIds.includes(event.id) || event.type === 'storm')
  );
  return activeLocalEvent ? zoneRules.event_zone : base;
}

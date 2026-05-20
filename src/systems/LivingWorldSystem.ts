import { createId, createInventory, createStack } from '../game/GameState';
import type { AreaId, EnemyEntity, GameState, NpcEntity, Vec3, WorldEventState, WorldEventType, WorldPhase } from '../game/types';
import type { AreaManager } from '../world/AreaManager';
import { addChat, addSystemMessage } from './ChatSystem';
import { applyEconomyEventDemand } from './EconomySystem';

interface ScheduleSlot {
  start: number;
  end: number;
  area: AreaId;
  position: Vec3;
  behavior: string;
  available: boolean;
  dialogue: string[];
}

interface EventDefinition {
  type: WorldEventType;
  title: string;
  area: AreaId;
  duration: number;
  position: Vec3;
  rumor: string;
  rumorTruth: 'true' | 'partial';
  triggerConditions: string[];
  affectedLocations: AreaId[];
  visibleChange: string;
  rumorSources: Array<'chat' | 'npc' | 'town_board' | 'journal' | 'market_board'>;
  gameplayHooks: string[];
  economyImpact: string[];
  cleanup: string;
}

export const livingWorldEventDefinitions: Record<WorldEventType, EventDefinition> = {
  bandit_ambush: {
    type: 'bandit_ambush',
    title: 'Bandit Ambush on Old River Road',
    area: 'road',
    duration: 55,
    position: { x: -2, y: 0, z: -2 },
    rumor: 'Roadhands report a bandit ambush forming on Old River Road.',
    rumorTruth: 'true',
    triggerConditions: ['day road pressure', 'timed director cycle', 'manual event trigger'],
    affectedLocations: ['road', 'town'],
    visibleChange: 'An ambush bandit appears near the road bend.',
    rumorSources: ['chat', 'npc', 'town_board', 'journal'],
    gameplayHooks: ['protect road', 'combat encounter', 'guard supply demand'],
    economyImpact: ['guard', 'combat', 'arrow', 'bandage'],
    cleanup: 'Remove ambush spawns when defeated or when the event expires.'
  },
  merchant_caravan: {
    type: 'merchant_caravan',
    title: 'Merchant Caravan Arrives',
    area: 'town',
    duration: 70,
    position: { x: -12, y: 0, z: 12 },
    rumor: 'A merchant caravan has docked with fresh stock and better prices.',
    rumorTruth: 'true',
    triggerConditions: ['day town cycle', 'market refresh window'],
    affectedLocations: ['town', 'bank'],
    visibleChange: 'A caravan trader appears with temporary stock.',
    rumorSources: ['chat', 'npc', 'town_board', 'market_board'],
    gameplayHooks: ['buy supplies', 'sell valuables', 'restock before travel'],
    economyImpact: ['banking', 'food', 'treasure', 'vendor_contract'],
    cleanup: 'Remove caravan trader and end temporary demand after duration.'
  },
  crypt_spill: {
    type: 'crypt_spill',
    title: 'Crypt Dead Stir',
    area: 'crypt',
    duration: 65,
    position: { x: -8, y: 0, z: 4 },
    rumor: 'Cold lights at the mine mouth mean skeletons are spilling from the crypt.',
    rumorTruth: 'partial',
    triggerConditions: ['night director cycle', 'crypt pressure', 'manual event trigger'],
    affectedLocations: ['crypt', 'forest'],
    visibleChange: 'A restless skeleton appears near the crypt approach.',
    rumorSources: ['chat', 'npc', 'journal'],
    gameplayHooks: ['clear crypt pressure', 'loot undead', 'prepare magic and healing'],
    economyImpact: ['healer', 'mage', 'reagents', 'cure_potion'],
    cleanup: 'Remove skeleton pressure when defeated or when the event expires.'
  },
  lost_traveler: {
    type: 'lost_traveler',
    title: 'Lost Traveler Needs Escort',
    area: 'road',
    duration: 80,
    position: { x: -6, y: 0, z: 3 },
    rumor: 'A lost traveler is calling for help near the old road bend.',
    rumorTruth: 'true',
    triggerConditions: ['day road cycle', 'low active event count'],
    affectedLocations: ['road', 'town'],
    visibleChange: 'A lost traveler appears near the road bend.',
    rumorSources: ['chat', 'npc', 'journal'],
    gameplayHooks: ['escort later', 'road revisit', 'bandit warning'],
    economyImpact: ['food', 'guard'],
    cleanup: 'Remove traveler when the event expires.'
  },
  rare_ore: {
    type: 'rare_ore',
    title: 'Rare Ore Vein Discovered',
    area: 'forest',
    duration: 90,
    position: { x: 8, y: 0, z: -7 },
    rumor: 'Prospectors spotted a glimmering ore vein near the forest mine.',
    rumorTruth: 'partial',
    triggerConditions: ['night wilderness cycle', 'forest harvesting pressure'],
    affectedLocations: ['forest', 'blacksmith'],
    visibleChange: 'Forest mining yield pressure gets a temporary positive modifier.',
    rumorSources: ['chat', 'npc', 'town_board', 'journal', 'market_board'],
    gameplayHooks: ['discover ore', 'profit from smithy demand', 'revisit mine entrance'],
    economyImpact: ['metal', 'smithy', 'treasure'],
    cleanup: 'Let rare ore pressure decay after the event duration.'
  },
  market_day: {
    type: 'market_day',
    title: 'Briarbrook Market Day',
    area: 'town',
    duration: 96,
    position: { x: 0, y: 0, z: 2 },
    rumor: 'Market day is live in Briarbrook; vendors are carrying deeper stock.',
    rumorTruth: 'true',
    triggerConditions: ['day town cycle', 'daily market bucket'],
    affectedLocations: ['town', 'bank', 'blacksmith'],
    visibleChange: 'Town vendors get deeper working gold for the day.',
    rumorSources: ['chat', 'npc', 'town_board', 'market_board'],
    gameplayHooks: ['sell gathered goods', 'complete work orders', 'buy supplies'],
    economyImpact: ['smithy', 'healer', 'mage', 'guard', 'carpenter', 'tavern', 'banker', 'food', 'wood', 'metal'],
    cleanup: 'Demand signal expires and vendor state returns to normal refresh rules.'
  },
  storm: {
    type: 'storm',
    title: 'River Storm',
    area: 'housing',
    duration: 70,
    position: { x: -9, y: 0, z: 8 },
    rumor: 'A river storm is cutting visibility but stirring up better fishing.',
    rumorTruth: 'partial',
    triggerConditions: ['night cycle', 'river/housing region cycle'],
    affectedLocations: ['housing', 'road', 'forest'],
    visibleChange: 'Visibility drops and night danger rises while the storm is active.',
    rumorSources: ['chat', 'npc', 'journal'],
    gameplayHooks: ['prepare torches', 'avoid road danger', 'profit from fish demand'],
    economyImpact: ['torch', 'repair_kit', 'raw_fish', 'guard'],
    cleanup: 'Restore normal time modifiers after the storm expires.'
  },
  guard_patrol: {
    type: 'guard_patrol',
    title: 'Guard Patrol Route',
    area: 'road',
    duration: 72,
    position: { x: -4, y: 0, z: 1 },
    rumor: 'Gate Warden Alric is sending a patrol down Old River Road before dusk.',
    rumorTruth: 'true',
    triggerConditions: ['bandit pressure', 'day road cycle', 'guard work-order demand'],
    affectedLocations: ['road', 'town'],
    visibleChange: 'A patrol guard appears on the road with supply dialogue.',
    rumorSources: ['chat', 'npc', 'town_board', 'journal', 'market_board'],
    gameplayHooks: ['protect road', 'deliver arrows or rations', 'travel with lower risk'],
    economyImpact: ['guard', 'arrow', 'bandage', 'fresh_bread'],
    cleanup: 'Remove patrol NPC when the route window ends.'
  },
  healer_shortage: {
    type: 'healer_shortage',
    title: 'Healer Shortage',
    area: 'town',
    duration: 84,
    position: { x: -6, y: 0, z: 0 },
    rumor: 'Sela is short on bandages after night patrol injuries.',
    rumorTruth: 'true',
    triggerConditions: ['crypt pressure', 'bandit pressure', 'healer work-order demand'],
    affectedLocations: ['town', 'road', 'crypt'],
    visibleChange: 'A clinic runner appears near town services asking for supplies.',
    rumorSources: ['chat', 'npc', 'town_board', 'journal', 'market_board'],
    gameplayHooks: ['profit from healing demand', 'prepare potions', 'support patrols'],
    economyImpact: ['healer', 'healing', 'bandage', 'health_potion', 'cure_potion', 'ginseng'],
    cleanup: 'Remove clinic runner and let healing demand expire.'
  },
  mage_reagent_request: {
    type: 'mage_reagent_request',
    title: 'Mage Reagent Request',
    area: 'town',
    duration: 84,
    position: { x: 13, y: 0, z: -8 },
    rumor: 'Orren needs ash, pearl, and mandrake for student spellwork.',
    rumorTruth: 'true',
    triggerConditions: ['crypt activity', 'market day', 'mage work-order demand'],
    affectedLocations: ['town', 'forest', 'crypt'],
    visibleChange: 'A mage apprentice appears near Orrens shop with reagent requests.',
    rumorSources: ['chat', 'npc', 'town_board', 'journal', 'market_board'],
    gameplayHooks: ['gather reagents', 'sell bundles', 'prepare utility magery'],
    economyImpact: ['mage', 'reagents', 'sulfurous_ash', 'black_pearl', 'mandrake_root'],
    cleanup: 'Remove apprentice and let reagent demand expire.'
  }
};

const npcSchedules: Record<string, ScheduleSlot[]> = {
  npc_eldon_town: [
    { start: 8, end: 18, area: 'town', position: { x: -8, y: 0, z: -2 }, behavior: 'bank approach', available: false, dialogue: ['I handle real banking inside the bank. Step through the door and I will open the ledger.'] },
    { start: 18, end: 8, area: 'town', position: { x: -18, y: 0, z: -7 }, behavior: 'tavern supper', available: false, dialogue: ['Ledger is closed. Even bankers need supper.'] }
  ],
  npc_eldon_bank: [
    { start: 8, end: 18, area: 'bank', position: { x: 0, y: 0, z: -2 }, behavior: 'bank desk', available: true, dialogue: ['The bank is open. I can hold spare ore, logs, and hides.'] },
    { start: 18, end: 8, area: 'bank', position: { x: 2, y: 0, z: 4 }, behavior: 'closing ledger', available: false, dialogue: ['The bank is closed for the night. Come back after dawn.'] }
  ],
  npc_brom_town: [
    { start: 7, end: 19, area: 'town', position: { x: 6, y: 0, z: -3 }, behavior: 'smithy approach', available: false, dialogue: ['The forge work happens inside the smithy. Meet me by the anvil.'] },
    { start: 19, end: 7, area: 'town', position: { x: -17, y: 0, z: -7 }, behavior: 'tavern supper', available: false, dialogue: ['Forge is cold for the night. I will be back at the anvil tomorrow.'] }
  ],
  npc_brom_smithy: [
    { start: 7, end: 19, area: 'blacksmith', position: { x: 0, y: 0, z: -1 }, behavior: 'forge work', available: true, dialogue: ['The forge is hot. Smelt bars first, then choose a pattern.'] },
    { start: 19, end: 7, area: 'blacksmith', position: { x: -5, y: 0, z: 4 }, behavior: 'banking coals', available: false, dialogue: ['Forge is banked for the night. I will work it again at first light.'] }
  ],
  npc_orren_town: [
    { start: 9, end: 22, area: 'town', position: { x: 15, y: 0, z: -7 }, behavior: 'mage shop', available: true, dialogue: ['Reagents are stocked. Ash for force, ginseng for healing, mandrake for bigger workings.'] },
    { start: 22, end: 9, area: 'town', position: { x: 13, y: 0, z: -9 }, behavior: 'private study', available: false, dialogue: ['Shop is shut. The moons are better teachers than my ledger tonight.'] }
  ],
  npc_sela_town: [
    { start: 6, end: 23, area: 'town', position: { x: -5, y: 0, z: -1 }, behavior: 'clinic', available: true, dialogue: ['I can tend wounds, cure poison, and teach steady bandaging.'] },
    { start: 23, end: 6, area: 'town', position: { x: -6, y: 0, z: 1 }, behavior: 'night rounds', available: false, dialogue: ['I am on night rounds. Emergency care only until morning.'] }
  ],
  npc_guard_west_town: [
    { start: 0, end: 24, area: 'town', position: { x: -1, y: 0, z: 14 }, behavior: 'gate patrol', available: true, dialogue: ['Road watch changes with the light. Bandits prefer dusk.'] }
  ]
};

const socialAnchors: Array<{ id: string; morning: Vec3; evening: Vec3 }> = [
  { id: 'npc_aric_town', morning: { x: -2, y: 0, z: -5 }, evening: { x: -17, y: 0, z: -7 } },
  { id: 'npc_liora_town', morning: { x: -3, y: 0, z: 3 }, evening: { x: -16, y: 0, z: -6 } },
  { id: 'npc_durnok_town', morning: { x: 4, y: 0, z: 4 }, evening: { x: 1, y: 0, z: 2 } },
  { id: 'npc_pyrel_town', morning: { x: 2, y: 0, z: 7 }, evening: { x: -18, y: 0, z: -7 } }
];

export function updateLivingWorld(state: GameState, areaManager: AreaManager, dt: number): void {
  updateWorldTime(state);
  applyNpcSchedules(state, dt);
  updateEcology(state, areaManager, dt);
  resolveCompletedWorldEvents(state);
  expireWorldEvents(state);
  decayResourcePressure(state);
  maybeTriggerTimedEvent(state, dt);
  maybeAddWorldRumor(state, dt);
}

export function triggerWorldEvent(state: GameState, type: WorldEventType): WorldEventState {
  const existing = state.world.activeEvents.find((event) => event.type === type);
  if (existing) return existing;
  const def = livingWorldEventDefinitions[type];
  const event: WorldEventState = {
    id: createId('world_event'),
    type,
    title: def.title,
    area: def.area,
    startedAt: state.clock,
    endsAt: state.clock + def.duration,
    discovered: state.world.discoveredAreas.includes(def.area),
    rumor: def.rumor,
    position: { ...def.position },
    spawnedEntityIds: []
  };
  applyEventStart(state, event);
  state.world.activeEvents.push(event);
  state.world.discoveredRumorIds = Array.from(new Set([...state.world.discoveredRumorIds, event.id]));
  addChat(state, `${event.title}: ${event.rumor}`, { channel: 'Rumors', speaker: 'Rumor', tone: type === 'bandit_ambush' || type === 'crypt_spill' ? 'danger' : 'normal' });
  return event;
}

export function registerResourceHarvest(state: GameState, areaId: AreaId): void {
  const current = state.world.resourcePressure[areaId] ?? { harvests: 0, lastHarvestedAt: state.clock, yieldModifier: 1 };
  const stale = state.clock - current.lastHarvestedAt > 75;
  const harvests = stale ? 1 : current.harvests + 1;
  state.world.resourcePressure[areaId] = {
    harvests,
    lastHarvestedAt: state.clock,
    yieldModifier: Math.max(0.55, Number((1 - Math.max(0, harvests - 2) * 0.11).toFixed(2)))
  };
}

export function resourceYieldModifier(state: GameState, areaId: AreaId): number {
  return state.world.resourcePressure[areaId]?.yieldModifier ?? 1;
}

function updateWorldTime(state: GameState): void {
  const dayLengthSeconds = state.world.time?.dayLengthSeconds || 96;
  const wrapped = ((state.clock % dayLengthSeconds) + dayLengthSeconds) % dayLengthSeconds;
  const timeOfDay = wrapped / dayLengthSeconds;
  const day = Math.floor(state.clock / dayLengthSeconds);
  const totalMinutes = Math.floor(timeOfDay * 24 * 60);
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const phase = phaseForHour(hour);
  const stormActive = state.world.activeEvents.some((event) => event.type === 'storm' && event.endsAt > state.clock);
  const baseVisibility = phase === 'night' ? 0.58 : phase === 'dusk' ? 0.74 : phase === 'dawn' ? 0.82 : 1;
  const baseStealth = phase === 'night' ? 1.2 : phase === 'dusk' ? 1.1 : phase === 'dawn' ? 1.05 : 0.94;
  const baseDanger = phase === 'night' ? 1.1 : phase === 'dusk' ? 1.05 : 1;
  state.world.time = {
    dayLengthSeconds,
    day,
    timeOfDay,
    hour,
    minute,
    phase,
    visibilityModifier: Number((baseVisibility * (stormActive ? 0.82 : 1)).toFixed(2)),
    stealthModifier: Number((baseStealth * (stormActive ? 1.08 : 1)).toFixed(2)),
    dangerModifier: Number((baseDanger * (stormActive ? 1.12 : 1)).toFixed(2))
  };
}

function phaseForHour(hour: number): WorldPhase {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 18) return 'day';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
}

function applyNpcSchedules(state: GameState, dt: number): void {
  for (const [id, slots] of Object.entries(npcSchedules)) {
    const npc = state.entities[id];
    if (!npc || (npc.kind !== 'npc' && npc.kind !== 'social')) continue;
    const slot = slots.find((candidate) => hourInRange(state.world.time.hour, candidate.start, candidate.end)) ?? slots[0];
    applyScheduleSlot(state, npc, slot, dt);
  }
  for (const anchor of socialAnchors) {
    const npc = state.entities[anchor.id];
    if (!npc || npc.kind !== 'social' || npc.area !== 'town') continue;
    const destination = state.world.time.phase === 'night' || state.world.time.phase === 'dusk' ? anchor.evening : anchor.morning;
    npc.scheduleState = {
      scheduleId: 'social-routine',
      behavior: state.world.time.phase === 'night' || state.world.time.phase === 'dusk' ? 'tavern visit' : 'market visit',
      available: true,
      lastAppliedAt: state.clock
    };
    moveToward(npc.position, destination, dt, 0.65);
  }
}

function applyScheduleSlot(state: GameState, npc: NpcEntity, slot: ScheduleSlot, dt: number): void {
  const areaChanged = npc.area !== slot.area;
  npc.area = slot.area;
  npc.dialogue = slot.dialogue;
  npc.serviceAvailable = slot.available;
  npc.scheduleState = {
    scheduleId: npc.id,
    behavior: slot.behavior,
    available: slot.available,
    lastAppliedAt: state.clock
  };
  if (areaChanged) {
    npc.position = { ...slot.position };
  } else {
    moveToward(npc.position, slot.position, dt, slot.behavior.includes('patrol') ? 0.85 : 1.1);
  }
}

function hourInRange(hour: number, start: number, end: number): boolean {
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function applyEventStart(state: GameState, event: WorldEventState): void {
  applyEconomyEventDemand(state, event.type);
  if (event.type === 'bandit_ambush') {
    const id = `event_bandit_${event.id}`;
    state.entities[id] = createEventEnemy(id, 'road', 'Ambush Bandit', 'Bandit', event.position ?? { x: -2, y: 0, z: -2 });
    event.spawnedEntityIds.push(id);
  }
  if (event.type === 'crypt_spill') {
    const id = `event_skeleton_${event.id}`;
    state.entities[id] = createEventEnemy(id, 'crypt', 'Restless Skeleton', 'Undead', event.position ?? { x: -8, y: 0, z: 4 });
    event.spawnedEntityIds.push(id);
  }
  if (event.type === 'lost_traveler') {
    const id = `event_traveler_${event.id}`;
    state.entities[id] = {
      id,
      kind: 'social',
      area: 'road',
      name: 'Lost Traveler',
      role: 'quest',
      position: event.position ?? { x: -6, y: 0, z: 3 },
      blocksMovement: true,
      dialogue: ['Can you guide me back to Briarbrook? I heard bandits near the bend.']
    };
    event.spawnedEntityIds.push(id);
  }
  if (event.type === 'merchant_caravan') {
    const id = `event_caravan_${event.id}`;
    state.entities[id] = {
      id,
      kind: 'npc',
      area: 'town',
      name: 'Caravan Trader',
      role: 'merchant',
      position: event.position ?? { x: -12, y: 0, z: 12 },
      blocksMovement: true,
      dialogue: ['Caravan stock is fresh while the mules are watered.'],
      tradeGold: 240,
      tradeInventory: createInventory(10, [createStack('fresh_bread', 12), createStack('bandage', 10), createStack('mana_potion', 4), createStack('black_pearl', 6), createStack('lockpick', 6)]),
      serviceAvailable: true
    };
    event.spawnedEntityIds.push(id);
  }
  if (event.type === 'rare_ore') {
    const pressure = state.world.resourcePressure.forest ?? { harvests: 0, lastHarvestedAt: state.clock, yieldModifier: 1 };
    state.world.resourcePressure.forest = { ...pressure, yieldModifier: Math.max(pressure.yieldModifier, 1.18), lastHarvestedAt: state.clock };
  }
  if (event.type === 'market_day') {
    for (const entity of Object.values(state.entities)) {
      if ((entity.kind === 'npc' || entity.kind === 'social') && entity.role === 'merchant') {
        entity.tradeGold = Math.max(entity.tradeGold ?? 0, 180);
      }
    }
  }
  if (event.type === 'guard_patrol') {
    const id = `event_guard_patrol_${event.id}`;
    state.entities[id] = {
      id,
      kind: 'npc',
      area: 'road',
      name: 'Patrol Guard',
      role: 'guard',
      position: event.position ?? { x: -4, y: 0, z: 1 },
      blocksMovement: true,
      dialogue: ['Road patrol is active. Arrows, bandages, and rations keep the route open.'],
      serviceAvailable: true
    };
    event.spawnedEntityIds.push(id);
  }
  if (event.type === 'healer_shortage') {
    const id = `event_healer_runner_${event.id}`;
    state.entities[id] = {
      id,
      kind: 'social',
      area: 'town',
      name: 'Clinic Runner',
      role: 'quest',
      position: event.position ?? { x: -6, y: 0, z: 0 },
      blocksMovement: true,
      dialogue: ['Sela needs bandages, ginseng, and clean bottles before the next patrol returns.']
    };
    event.spawnedEntityIds.push(id);
  }
  if (event.type === 'mage_reagent_request') {
    const id = `event_mage_apprentice_${event.id}`;
    state.entities[id] = {
      id,
      kind: 'social',
      area: 'town',
      name: 'Mage Apprentice',
      role: 'quest',
      position: event.position ?? { x: 13, y: 0, z: -8 },
      blocksMovement: true,
      dialogue: ['Orren needs sulfurous ash, black pearl, and mandrake for a student circle.']
    };
    event.spawnedEntityIds.push(id);
  }
}

function createEventEnemy(id: string, area: AreaId, name: string, enemyType: EnemyEntity['enemyType'], position: Vec3): EnemyEntity {
  const undead = enemyType === 'Undead';
  return {
    id,
    kind: 'enemy',
    area,
    name,
    enemyType,
    level: undead ? 5 : 6,
    health: undead ? 38 : 58,
    maxHealth: undead ? 38 : 58,
    damage: undead ? [5, 9] : [6, 11],
    armor: undead ? 4 : 2,
    magicResist: undead ? 4 : 8,
    poisonResist: undead ? 90 : 15,
    weaponSkill: undead ? 34 : 40,
    defenseSkill: undead ? 32 : 35,
    aiStyle: 'melee',
    combatRole: undead ? 'grunt' : 'skirmisher',
    aggroRadius: 7,
    attackRange: 1.25,
    attackCooldown: 1.45,
    attackTimer: 0,
    patrolTimer: 0,
    leashOrigin: { ...position },
    state: 'patrol',
    poison: null,
    pacifiedUntil: 0,
    discordUntil: 0,
    discordAmount: 0,
    provokedTargetId: null,
    position: { ...position },
    blocksMovement: true,
    lootTable: [{ itemId: undead ? 'bones' : 'leather', min: 1, max: 2, chance: 0.8 }],
    goldDrop: undead ? [4, 10] : [10, 20]
  };
}

function expireWorldEvents(state: GameState): void {
  const expired = state.world.activeEvents.filter((event) => event.endsAt <= state.clock);
  if (!expired.length) return;
  for (const event of expired) {
    for (const id of event.spawnedEntityIds) delete state.entities[id];
    recordResolvedEvent(state, event, 'expired');
    addSystemMessage(state, `${event.title} has passed.`);
  }
  state.world.activeEvents = state.world.activeEvents.filter((event) => event.endsAt > state.clock);
}

function resolveCompletedWorldEvents(state: GameState): void {
  const resolved = state.world.activeEvents.filter((event) => eventCompletesFromPlayerResponse(state, event));
  if (!resolved.length) return;
  for (const event of resolved) {
    for (const id of event.spawnedEntityIds) delete state.entities[id];
    recordResolvedEvent(state, event, 'resolved');
    addSystemMessage(state, `${event.title} resolved.`);
  }
  const resolvedIds = new Set(resolved.map((event) => event.id));
  state.world.activeEvents = state.world.activeEvents.filter((event) => !resolvedIds.has(event.id));
}

function eventCompletesFromPlayerResponse(state: GameState, event: WorldEventState): boolean {
  if (event.type !== 'bandit_ambush' && event.type !== 'crypt_spill') return false;
  if (!event.spawnedEntityIds.length) return false;
  return event.spawnedEntityIds.every((id) => {
    const entity = state.entities[id];
    return !entity || (entity.kind === 'enemy' && entity.state === 'dead');
  });
}

function recordResolvedEvent(state: GameState, event: WorldEventState, reason: 'resolved' | 'expired'): void {
  state.world.resolvedEventLog ??= [];
  const label = `${event.title}: ${reason === 'resolved' ? 'player response resolved' : 'expired'} - ${event.rumor}`;
  if (!state.world.resolvedEventLog.includes(label)) state.world.resolvedEventLog.push(label);
  state.world.resolvedEventLog = state.world.resolvedEventLog.slice(-12);
}

function maybeTriggerTimedEvent(state: GameState, dt: number): void {
  const previousBucket = Math.floor((state.clock - dt) / 24);
  const bucket = Math.floor(state.clock / 24);
  if (bucket <= previousBucket || state.world.activeEvents.length >= 2) return;
  const cycle: WorldEventType[] = state.world.time.phase === 'night' ? ['crypt_spill', 'storm', 'rare_ore', 'mage_reagent_request'] : ['merchant_caravan', 'market_day', 'bandit_ambush', 'lost_traveler', 'guard_patrol', 'healer_shortage'];
  const type = cycle[(state.world.time.day + bucket) % cycle.length];
  triggerWorldEvent(state, type);
}

function maybeAddWorldRumor(state: GameState, dt: number): void {
  if (!state.world.activeEvents.length) return;
  if (Math.floor((state.clock - dt) / 19) === Math.floor(state.clock / 19)) return;
  const event = state.world.activeEvents[Math.floor(state.clock / 19) % state.world.activeEvents.length];
  addChat(state, event.rumor, { channel: 'Rumors', speaker: event.type === 'market_day' ? 'Town Crier' : 'Rumor', tone: event.type === 'bandit_ambush' || event.type === 'crypt_spill' ? 'danger' : 'normal' });
}

function decayResourcePressure(state: GameState): void {
  for (const [areaId, pressure] of Object.entries(state.world.resourcePressure) as Array<[AreaId, NonNullable<GameState['world']['resourcePressure'][AreaId]>]>) {
    if (!pressure) continue;
    if (state.clock - pressure.lastHarvestedAt < 75) continue;
    const harvests = Math.max(0, pressure.harvests - 1);
    state.world.resourcePressure[areaId] = {
      harvests,
      lastHarvestedAt: state.clock,
      yieldModifier: harvests <= 2 ? 1 : Math.max(0.55, Number((1 - (harvests - 2) * 0.11).toFixed(2)))
    };
  }
}

function updateEcology(state: GameState, areaManager: AreaManager, dt: number): void {
  for (const entity of Object.values(state.entities)) {
    if (entity.kind !== 'enemy' || entity.state === 'dead') continue;
    if (entity.enemyType === 'Beast' && entity.area === state.player.currentArea) {
      const dist = distance(entity.position, state.player.position);
      const recentlyThreatened = state.combat.lastAttackAt > state.clock - 5 || state.player.combatProfile.hidden;
      if (dist < 5 && recentlyThreatened) {
        const dx = entity.position.x - state.player.position.x;
        const dz = entity.position.z - state.player.position.z;
        const len = Math.hypot(dx, dz) || 1;
        const next = { x: entity.position.x + (dx / len) * dt * 2.5, z: entity.position.z + (dz / len) * dt * 2.5 };
        if (!areaManager.isBlocked(state, next.x, next.z, entity.id)) {
          entity.position.x = next.x;
          entity.position.z = next.z;
          entity.state = 'return';
        }
      }
    }
    if (entity.enemyType === 'Bandit' && entity.area === 'road' && entity.state === 'patrol') {
      entity.leashOrigin.x += Math.sin(state.clock * 0.18 + entity.id.length) * dt * 0.08;
    }
  }
}

function moveToward(position: Vec3, target: Vec3, dt: number, speed: number): void {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) {
    position.x = target.x;
    position.z = target.z;
    return;
  }
  const step = Math.min(dist, speed * dt);
  position.x += (dx / dist) * step;
  position.z += (dz / dist) * step;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

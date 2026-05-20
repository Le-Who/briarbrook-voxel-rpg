import { areas } from '../data/areas';
import { skillDefinitionById } from '../data/skills';
import type { AreaId, GameState, QuestState, SkillId, Vec3 } from '../game/types';

export const FIRST_HOUR_SKILL_TARGET = 12;
export const FIRST_HOUR_STALL_HINT_SECONDS = 90;

export type FirstHourSystemId = 'movement' | 'tools' | 'magic' | 'combat' | 'healing' | 'economy' | 'housing';

export interface FirstHourMilestone {
  id: string;
  label: string;
  done: boolean;
  detail: string;
  skillId?: SkillId;
}

export interface FirstHourSystemStatus {
  id: FirstHourSystemId;
  label: string;
  done: boolean;
  detail: string;
}

export interface FirstHourSkillEvent {
  skillId: SkillId;
  label: string;
  value: number;
  gained: number;
  lastAt: number;
}

export interface FirstHourObjectivePin {
  id: string;
  areaId: AreaId;
  position: Vec3;
  label: string;
  detail: string;
  className: string;
  source: 'objective';
  entityId?: string;
}

export interface FirstHourHintState {
  unlocked: boolean;
  stalledFor: number;
  unlockAfter: number;
  text: string;
}

export interface FirstHourDirectorState {
  milestones: FirstHourMilestone[];
  progress: {
    done: number;
    total: number;
  };
  nextStep: FirstHourMilestone | null;
  skills: {
    target: number;
    touchedCount: number;
    events: FirstHourSkillEvent[];
    missingSuggestions: SkillId[];
  };
  systems: FirstHourSystemStatus[];
  discoveries: string[];
  objective: FirstHourObjectivePin | null;
  hint: FirstHourHintState;
}

export const FIRST_HOUR_RECOMMENDED_SKILLS: SkillId[] = [
  'Lumberjacking',
  'Mining',
  'Healing',
  'Anatomy',
  'Magery',
  'Meditation',
  'Evaluating Intelligence',
  'Swordsmanship',
  'Tactics',
  'Archery',
  'Parrying',
  'Blacksmithing',
  'Lockpicking',
  'Detect Hidden',
  'Remove Trap',
  'Cartography',
  'Tracking',
  'Survival',
  'Carpentry'
];

function objective(quest: QuestState | undefined, type: string, labelIncludes?: string): { progress: number; required: number } | null {
  const match = quest?.objectives.find((candidate) => candidate.type === type && (!labelIncludes || candidate.label.includes(labelIncludes)));
  return match ? { progress: match.progress, required: match.required } : null;
}

function objectiveDone(quest: QuestState | undefined, type: string, labelIncludes?: string): boolean {
  const match = objective(quest, type, labelIncludes);
  return Boolean(match && match.progress >= match.required);
}

function objectiveAnyProgress(quest: QuestState | undefined, type: string, labelIncludes?: string): boolean {
  const match = objective(quest, type, labelIncludes);
  return Boolean(match && match.progress > 0);
}

function anyRecordValue(record: Record<string, number>): boolean {
  return Object.values(record).some((value) => value > 0);
}

function hasAnySkillUse(state: GameState, skillIds: SkillId[]): boolean {
  return skillIds.some((skillId) => {
    const skill = state.player.skills[skillId];
    return Boolean(skill && (skill.lastSuccessfulUseAt > 0 || skill.lastGainAt > 0 || (state.dev.telemetry.skillGains[skillId] ?? 0) > 0));
  });
}

function skillEvents(state: GameState): FirstHourSkillEvent[] {
  return Object.values(state.player.skills)
    .map((skill) => ({
      skillId: skill.id,
      label: skillDefinitionById[skill.id]?.displayName ?? skill.name,
      value: skill.value,
      gained: state.dev.telemetry.skillGains[skill.id] ?? 0,
      lastAt: Math.max(skill.lastSuccessfulUseAt, skill.lastGainAt)
    }))
    .filter((event) => event.lastAt > 0 || event.gained > 0)
    .sort((a, b) => b.lastAt - a.lastAt || b.gained - a.gained || a.label.localeCompare(b.label));
}

function firstHourSystems(state: GameState): FirstHourSystemStatus[] {
  const prepare = state.quests.prepare_for_road;
  const mage = state.quests.mages_errand;
  const road = state.quests.trouble_on_road;
  const housing = state.quests.place_to_call_yours;
  const movementDone =
    state.player.currentArea !== 'town' ||
    state.world.discoveredAreas.some((area) => area !== 'town') ||
    objectiveDone(road, 'enter_area');
  const toolsDone =
    anyRecordValue(state.dev.telemetry.resourceYields) ||
    objectiveDone(prepare, 'gather') ||
    objectiveDone(state.quests.ore_for_brom, 'gather') ||
    hasAnySkillUse(state, ['Lumberjacking', 'Mining']);
  const magicDone =
    objectiveAnyProgress(mage, 'cast') ||
    Boolean(state.spellCasting) ||
    hasAnySkillUse(state, ['Magery', 'Meditation', 'Evaluating Intelligence']);
  const combatDone =
    anyRecordValue(state.dev.telemetry.damageDealtBySource) ||
    objectiveAnyProgress(road, 'kill') ||
    hasAnySkillUse(state, ['Swordsmanship', 'Archery', 'Tactics', 'Peacemaking', 'Provocation', 'Discordance']);
  const healingDone =
    objectiveDone(state.quests.patch_yourself_up, 'bandage') ||
    state.bandage != null ||
    anyRecordValue(state.dev.telemetry.potionConsumption) ||
    (state.dev.telemetry.itemsConsumed.bandage ?? 0) > 0 ||
    hasAnySkillUse(state, ['Healing', 'Anatomy']);
  const economyDone =
    objectiveDone(prepare, 'bank') ||
    state.dev.telemetry.marketTransactions > 0 ||
    state.dev.telemetry.workOrdersCompleted > 0 ||
    anyRecordValue(state.dev.telemetry.itemsSold) ||
    state.dev.telemetry.goldEarned > 0;
  const housingDone =
    state.buildMode.active ||
    state.world.placedBuildings.length > 0 ||
    objectiveDone(housing, 'enter_area') ||
    objectiveDone(housing, 'build') ||
    state.player.currentArea === 'housing';

  return [
    { id: 'movement', label: 'Movement', done: movementDone, detail: movementDone ? 'Left town routes are in play.' : 'Use roads and doors to connect the first loop.' },
    { id: 'tools', label: 'Tools', done: toolsDone, detail: toolsDone ? 'Resource tools have been used.' : 'Use axe and pickaxe on marked resources.' },
    { id: 'magic', label: 'Magic', done: magicDone, detail: magicDone ? 'Spell use is represented.' : 'Open the spellbook and cast a beginner spell.' },
    { id: 'combat', label: 'Combat', done: combatDone, detail: combatDone ? 'A hostile encounter has started.' : 'Target a road foe and resolve the fight.' },
    { id: 'healing', label: 'Healing', done: healingDone, detail: healingDone ? 'Recovery tools have been used.' : 'Use a bandage, heal spell, or potion.' },
    { id: 'economy', label: 'Economy', done: economyDone, detail: economyDone ? 'Banking, selling, or work orders are active.' : 'Bank goods, sell, or complete an order.' },
    { id: 'housing', label: 'Housing', done: housingDone, detail: housingDone ? 'The plot loop has started.' : 'Visit the plot and place one object.' }
  ];
}

function firstHourMilestones(state: GameState): FirstHourMilestone[] {
  const prepare = state.quests.prepare_for_road;
  const ore = state.quests.ore_for_brom;
  const mage = state.quests.mages_errand;
  const patch = state.quests.patch_yourself_up;
  const road = state.quests.trouble_on_road;
  const crypt = state.quests.bones_beneath;
  const housing = state.quests.place_to_call_yours;
  const openedOrUsedInventory =
    state.ui.panels.inventory ||
    objectiveDone(prepare, 'bank') ||
    anyRecordValue(state.dev.telemetry.itemsConsumed) ||
    anyRecordValue(state.dev.telemetry.itemsSold) ||
    state.dev.telemetry.marketTransactions > 0;
  const bankOrSellDone =
    objectiveDone(prepare, 'bank') ||
    state.dev.telemetry.marketTransactions > 0 ||
    anyRecordValue(state.dev.telemetry.itemsSold) ||
    state.dev.telemetry.goldEarned > 0;
  const forestDone = state.player.currentArea === 'forest' || state.world.discoveredAreas.includes('forest') || objectiveDone(ore, 'gather');
  const secretDone =
    Object.values(state.world.treasure.secrets).some((secret) => secret.opened || secret.disarmed || secret.revealedUntil > state.clock) ||
    objectiveDone(crypt, 'open_container') ||
    objectiveDone(crypt, 'cast', 'Detect Magic') ||
    hasAnySkillUse(state, ['Lockpicking', 'Detect Hidden', 'Remove Trap']);

  return [
    { id: 'talk_mira', label: 'Talk to Mira at the fountain', done: objectiveDone(prepare, 'talk'), detail: 'Anchor the road-kit tutorial.' },
    { id: 'open_inventory', label: 'Open Inventory and inspect the kit', done: openedOrUsedInventory, detail: 'Confirm tools, reagents, bandages, and potions.' },
    {
      id: 'equipped_gear',
      label: 'Confirm equipped weapon and armor',
      done: openedOrUsedInventory && Boolean(state.player.equipment.weapon || state.player.equipment.armor),
      detail: 'The road kit should make equipment visible before danger.',
      skillId: 'Tactics'
    },
    { id: 'open_skills', label: 'Open Skills and watch use-based gains', done: objectiveDone(prepare, 'open_panel', 'Skills') || state.ui.panels.skills, detail: 'The first hour should explain skill growth early.', skillId: 'Lumberjacking' },
    { id: 'gather_tree', label: 'Use an axe on a tree', done: objectiveDone(prepare, 'gather') || (state.dev.telemetry.resourceYields.logs ?? 0) > 0, detail: 'Starts the tool and resource loop.', skillId: 'Lumberjacking' },
    { id: 'mine_ore', label: 'Use a pickaxe on a mine rock', done: objectiveDone(ore, 'gather') || (state.dev.telemetry.resourceYields.iron_ore ?? 0) > 0, detail: 'Adds the mining and forge route.', skillId: 'Mining' },
    { id: 'bank_sell', label: 'Bank or sell one gathered resource', done: bankOrSellDone, detail: 'Turns resources into storage or gold feedback.' },
    { id: 'smithy_craft', label: 'Craft or repair at Broms Smithy', done: objectiveDone(ore, 'craft') || state.dev.telemetry.repairsCompleted > 0, detail: 'Proves ore becomes equipment care or a useful item.', skillId: 'Blacksmithing' },
    { id: 'magic_arrow', label: 'Cast Magic Arrow', done: objectiveDone(mage, 'cast', 'Magic Arrow'), detail: 'First targeted offensive spell.', skillId: 'Magery' },
    { id: 'heal_spell', label: 'Cast Heal', done: objectiveDone(mage, 'cast', 'Heal'), detail: 'Shows magic as recovery, not only damage.', skillId: 'Magery' },
    { id: 'heal_self', label: 'Use a bandage, potion, or heal under pressure', done: firstHourSystems(state).some((system) => system.id === 'healing' && system.done), detail: 'Closes the recovery loop before the road.', skillId: 'Healing' },
    { id: 'take_work_order', label: 'Check the market board for one work order', done: state.ui.panels.market || state.dev.telemetry.workOrdersCompleted > 0 || state.world.economy.transactionLog.some((entry) => entry.kind === 'work_order'), detail: 'Pins a useful resource sink before leaving town.' },
    { id: 'road_enemy', label: 'Fight a road enemy', done: objectiveAnyProgress(road, 'kill') || anyRecordValue(state.dev.telemetry.damageDealtBySource), detail: 'Tests targeting, action state, and survival.', skillId: 'Swordsmanship' },
    { id: 'forest_mine', label: 'Enter the forest or mine route', done: forestDone, detail: 'Connects town gathering to wilderness travel.', skillId: 'Tracking' },
    { id: 'crypt_clue', label: 'Discover the crypt clue near the mine', done: state.world.discoveredAreas.includes('crypt') || objectiveDone(crypt, 'enter_area') || getInventoryCount(state, 'crypt_lore_clue') > 0, detail: 'The dungeon entry should feel discovered, not teleported.' },
    { id: 'crypt_entry', label: 'Enter the crypt', done: objectiveDone(crypt, 'enter_area') || state.player.currentArea === 'crypt' || state.world.discoveredAreas.includes('crypt'), detail: 'Confirms the first dungeon route is reachable.' },
    { id: 'secret', label: 'Reveal, unlock, or open an interesting object', done: secretDone, detail: 'The dungeon needs at least one curiosity beat.', skillId: 'Detect Hidden' },
    { id: 'return_town', label: 'Return to Briarbrook after the crypt clue', done: secretDone && state.player.currentArea === 'town', detail: 'Closes the outbound loop before rewards and housing.' },
    { id: 'work_order', label: 'Complete one work order', done: state.dev.telemetry.workOrdersCompleted > 0, detail: 'Connects craft output to a clear reward.', skillId: 'Blacksmithing' },
    { id: 'housing_plot', label: 'Visit the housing plot', done: objectiveDone(housing, 'enter_area') || state.player.currentArea === 'housing' || state.world.discoveredAreas.includes('housing'), detail: 'Shows the persistent-place promise.' },
    { id: 'place_housing', label: 'Place one housing object', done: objectiveDone(housing, 'build') || state.world.placedBuildings.length > 0, detail: 'Ends the first-hour arc with ownership.', skillId: 'Carpentry' }
  ];
}

function getInventoryCount(state: GameState, itemId: string): number {
  return state.player.inventory.slots.reduce((sum, slot) => sum + (slot?.itemId === itemId ? slot.quantity : 0), 0);
}

function objectivePin(
  state: GameState,
  milestone: FirstHourMilestone,
  areaId: AreaId,
  position: Vec3,
  label = milestone.label,
  className = 'objective',
  entityId?: string
): FirstHourObjectivePin {
  const entity = entityId ? state.entities[entityId] : null;
  return {
    id: milestone.id,
    areaId: entity?.area ?? areaId,
    position: entity?.position ?? position,
    label,
    detail: milestone.detail,
    className,
    source: 'objective',
    entityId
  };
}

function nearestCurrentResource(state: GameState, type: 'tree' | 'ore'): FirstHourObjectivePin | null {
  const resource = Object.values(state.entities).find(
    (entity) => entity.kind === 'resource' && entity.area === state.player.currentArea && entity.resourceType === type && !entity.depleted && !entity.protected
  );
  if (!resource) return null;
  return {
    id: type === 'tree' ? 'gather_tree' : 'mine_ore',
    areaId: resource.area,
    position: resource.position,
    label: resource.name,
    detail: type === 'tree' ? 'Use the axe on a harvestable tree.' : 'Use the pickaxe on a rock face or vein.',
    className: 'objective',
    source: 'objective',
    entityId: resource.id
  };
}

function firstHourObjective(state: GameState, milestone: FirstHourMilestone | null): FirstHourObjectivePin | null {
  if (!milestone) return null;
  const current = state.player.currentArea;
  const self = () => objectivePin(state, milestone, current, state.player.position, milestone.label, 'objective ui');
  const townPortal = (entityId: string, label: string) => objectivePin(state, milestone, 'town', state.entities[entityId]?.position ?? state.player.position, label, 'objective portal', entityId);
  switch (milestone.id) {
    case 'talk_mira':
      return objectivePin(state, milestone, 'town', { x: -1, y: 0, z: 5 }, milestone.label, 'objective', 'npc_mira_town');
    case 'open_inventory':
    case 'equipped_gear':
    case 'open_skills':
      return self();
    case 'gather_tree':
      return nearestCurrentResource(state, 'tree') ?? (current === 'town' ? townPortal('portal_forest', 'Forest Road') : objectivePin(state, milestone, 'forest', { x: -3, y: 0, z: 0 }, 'Harvestable tree', 'objective'));
    case 'mine_ore':
    case 'forest_mine':
      return nearestCurrentResource(state, 'ore') ?? (current === 'forest' ? objectivePin(state, milestone, 'forest', { x: 7, y: 0, z: -6 }, 'Mine trail', 'objective') : townPortal('portal_forest', 'Forest Road'));
    case 'bank_sell':
      return current === 'bank'
        ? objectivePin(state, milestone, 'bank', { x: 0, y: 0, z: -2 }, 'Bank with Eldon', 'objective', 'npc_eldon_bank')
        : townPortal('portal_bank', 'Bank Door');
    case 'smithy_craft':
      return current === 'blacksmith'
        ? objectivePin(state, milestone, 'blacksmith', { x: 0, y: 0, z: -1 }, 'Broms forge', 'objective', 'npc_brom_smithy')
        : townPortal('portal_smith', 'Smithy Door');
    case 'magic_arrow':
    case 'heal_spell':
      return current === 'town' ? objectivePin(state, milestone, 'town', { x: 15, y: 0, z: -7 }, 'Orrens reagents and spell practice', 'objective', 'npc_orren_town') : self();
    case 'heal_self':
      return current === 'town' ? objectivePin(state, milestone, 'town', { x: -5, y: 0, z: -1 }, 'Practice recovery with Sela', 'objective', 'npc_sela_town') : self();
    case 'take_work_order':
    case 'work_order':
      return current === 'town' ? objectivePin(state, milestone, 'town', { x: 7, y: 0, z: 5 }, 'Market Board', 'objective', 'board_town_market') : townPortal('portal_town_road', 'Return to Briarbrook');
    case 'road_enemy':
      return current === 'road' ? objectivePin(state, milestone, 'road', { x: -2, y: 0, z: -2 }, 'Road danger', 'objective danger') : townPortal('portal_road', 'Old River Road');
    case 'crypt_clue':
    case 'crypt_entry':
    case 'secret':
      return current === 'crypt'
        ? objectivePin(state, milestone, 'crypt', { x: -12, y: 0, z: 6 }, 'Crypt clue', 'objective danger')
        : current === 'forest'
          ? objectivePin(state, milestone, 'forest', { x: 7, y: 0, z: -5 }, 'Mine to Crypt', 'objective danger', 'portal_crypt')
          : townPortal('portal_forest', 'Forest Road');
    case 'return_town':
      return current === 'crypt'
        ? objectivePin(state, milestone, 'crypt', { x: -9, y: 0, z: 4 }, 'Forest Exit', 'objective portal', 'portal_forest_crypt')
        : current === 'forest'
          ? objectivePin(state, milestone, 'forest', { x: 0, y: 0, z: 11 }, 'Town Road', 'objective portal', 'portal_town_forest')
          : objectivePin(state, milestone, 'town', state.player.position, 'Briarbrook', 'objective');
    case 'housing_plot':
    case 'place_housing':
      return current === 'housing'
        ? objectivePin(state, milestone, 'housing', { x: 0, y: 0, z: 0 }, 'Starter plot', 'objective housing')
        : townPortal('portal_plot', 'Housing Plot Ferry');
    default:
      return self();
  }
}

function lastDirectorActivityAt(state: GameState, events: FirstHourSkillEvent[]): number {
  const actionHistoryAt = state.realtime.actionHistory.reduce((latest, receipt) => Math.max(latest, receipt.processedAt), 0);
  return Math.max(
    state.dev.telemetry.startedAt,
    state.dev.stability.lastMovementCommandAt,
    state.player.actionState.startedAt,
    actionHistoryAt,
    ...events.map((event) => event.lastAt)
  );
}

function hintText(milestone: FirstHourMilestone, objective: FirstHourObjectivePin | null): string {
  const place = objective?.label ?? milestone.label;
  switch (milestone.id) {
    case 'talk_mira':
      return 'Mira stands by the fountain. Talk once to start the road kit.';
    case 'open_inventory':
      return 'Open Inventory and check the starter tools, bandages, potions, and spellbook before moving on.';
    case 'equipped_gear':
      return 'Use the equipment slots in Inventory to confirm your weapon and armor before the road.';
    case 'open_skills':
      return 'Open Skills and look for use-based gains. This is a profession map, not a class picker.';
    case 'gather_tree':
      return `Follow the objective marker to ${place}, then use the axe hotbar slot on a tree.`;
    case 'mine_ore':
    case 'forest_mine':
      return `Follow the marker to ${place}, then use the pickaxe on a rock face.`;
    case 'bank_sell':
      return 'Bank or sell one gathered resource so the player sees storage and value before combat.';
    case 'smithy_craft':
      return 'Use Broms forge to smelt ore, craft a simple item, or repair equipped gear.';
    case 'magic_arrow':
    case 'heal_spell':
      return 'Open the spellbook, pick the spell, and target carefully; reagents and mana are required.';
    case 'heal_self':
      return 'Use a bandage, health potion, or Heal before committing to the road fight.';
    case 'take_work_order':
      return 'Open the market board and note one work order that turns gathered goods into a reward.';
    case 'road_enemy':
      return 'Take Old River Road, select one bandit, and recover with a potion, bandage, or Heal if pressured.';
    case 'crypt_clue':
    case 'crypt_entry':
      return 'Use the Greymont mine route to find the crypt entrance instead of a debug jump.';
    case 'secret':
      return 'Use Detect Magic, Detect Hidden, Lockpicking, or Remove Trap before opening the suspicious object.';
    case 'return_town':
      return 'Leave the crypt through the forest route and return to Briarbrook before turning in work.';
    case 'work_order':
      return 'Deliver a matching item to a work order or sell a useful resource before the housing step.';
    case 'housing_plot':
    case 'place_housing':
      return 'Take the ferry to the plot and place one practical object inside the build area.';
    default:
      return milestone.detail;
  }
}

function firstHourHint(state: GameState, nextStep: FirstHourMilestone | null, objective: FirstHourObjectivePin | null, events: FirstHourSkillEvent[]): FirstHourHintState {
  if (!nextStep) {
    return { unlocked: false, stalledFor: 0, unlockAfter: FIRST_HOUR_STALL_HINT_SECONDS, text: '' };
  }
  const stalledFor = Math.max(0, state.clock - lastDirectorActivityAt(state, events));
  const unlocked = stalledFor >= FIRST_HOUR_STALL_HINT_SECONDS;
  return {
    unlocked,
    stalledFor,
    unlockAfter: FIRST_HOUR_STALL_HINT_SECONDS,
    text: unlocked ? hintText(nextStep, objective) : ''
  };
}

function firstHourDiscoveries(state: GameState): string[] {
  const discoveries = state.world.discoveredAreas
    .filter((areaId) => areaId !== 'town')
    .map((areaId) => `Found ${areas[areaId]?.name ?? areaId}`);
  const rumors = state.world.activeEvents
    .filter((event) => event.discovered || state.world.discoveredRumorIds.includes(event.id))
    .slice(0, 3)
    .map((event) => `Rumor: ${event.title}`);
  const secretCount = Object.values(state.world.treasure.secrets).filter((secret) => secret.opened || secret.disarmed || secret.revealedUntil > state.clock).length;
  const market = state.dev.telemetry.marketTransactions > 0 ? ['Used market board'] : [];
  const orders = state.dev.telemetry.workOrdersCompleted > 0 ? [`Completed ${state.dev.telemetry.workOrdersCompleted} work order`] : [];
  const secrets = secretCount > 0 ? [`Found ${secretCount} hidden or locked object${secretCount === 1 ? '' : 's'}`] : [];
  return [...discoveries, ...rumors, ...secrets, ...market, ...orders].slice(0, 8);
}

export function deriveFirstHourDirector(state: GameState): FirstHourDirectorState {
  const milestones = firstHourMilestones(state);
  const done = milestones.filter((milestone) => milestone.done).length;
  const events = skillEvents(state);
  const touched = new Set(events.map((event) => event.skillId));
  const nextStep = milestones.find((milestone) => !milestone.done) ?? null;
  const objective = firstHourObjective(state, nextStep);
  return {
    milestones,
    progress: {
      done,
      total: milestones.length
    },
    nextStep,
    skills: {
      target: FIRST_HOUR_SKILL_TARGET,
      touchedCount: touched.size,
      events,
      missingSuggestions: FIRST_HOUR_RECOMMENDED_SKILLS.filter((skillId) => !touched.has(skillId))
    },
    systems: firstHourSystems(state),
    discoveries: firstHourDiscoveries(state),
    objective,
    hint: firstHourHint(state, nextStep, objective, events)
  };
}

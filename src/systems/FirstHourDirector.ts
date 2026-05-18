import { areas } from '../data/areas';
import { skillDefinitionById } from '../data/skills';
import type { GameState, QuestState, SkillId } from '../game/types';

export const FIRST_HOUR_SKILL_TARGET = 12;

export type FirstHourSystemId = 'movement' | 'tools' | 'magic' | 'combat' | 'healing' | 'economy' | 'housing';

export interface FirstHourMilestone {
  id: string;
  label: string;
  done: boolean;
  detail: string;
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
}

const suggestedSkills: SkillId[] = [
  'Lumberjacking',
  'Mining',
  'Healing',
  'Anatomy',
  'Magery',
  'Meditation',
  'Swordsmanship',
  'Tactics',
  'Archery',
  'Peacemaking',
  'Lockpicking',
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
    { id: 'open_skills', label: 'Open Skills and watch use-based gains', done: objectiveDone(prepare, 'open_panel', 'Skills') || state.ui.panels.skills, detail: 'The first hour should explain skill growth early.' },
    { id: 'gather_tree', label: 'Use an axe on a tree', done: objectiveDone(prepare, 'gather') || (state.dev.telemetry.resourceYields.logs ?? 0) > 0, detail: 'Starts the tool and resource loop.' },
    { id: 'mine_ore', label: 'Use a pickaxe on a mine rock', done: objectiveDone(ore, 'gather') || (state.dev.telemetry.resourceYields.iron_ore ?? 0) > 0, detail: 'Adds the mining and forge route.' },
    { id: 'bank_sell', label: 'Bank or sell one gathered resource', done: bankOrSellDone, detail: 'Turns resources into storage or gold feedback.' },
    { id: 'magic_arrow', label: 'Cast Magic Arrow', done: objectiveDone(mage, 'cast', 'Magic Arrow'), detail: 'First targeted offensive spell.' },
    { id: 'heal_spell', label: 'Cast Heal', done: objectiveDone(mage, 'cast', 'Heal'), detail: 'Shows magic as recovery, not only damage.' },
    { id: 'heal_self', label: 'Use a bandage, potion, or heal under pressure', done: firstHourSystems(state).some((system) => system.id === 'healing' && system.done), detail: 'Closes the recovery loop before the road.' },
    { id: 'road_enemy', label: 'Fight a road enemy', done: objectiveAnyProgress(road, 'kill') || anyRecordValue(state.dev.telemetry.damageDealtBySource), detail: 'Tests targeting, action state, and survival.' },
    { id: 'forest_mine', label: 'Enter the forest or mine route', done: forestDone, detail: 'Connects town gathering to wilderness travel.' },
    { id: 'crypt_entry', label: 'Enter the crypt', done: objectiveDone(crypt, 'enter_area') || state.player.currentArea === 'crypt' || state.world.discoveredAreas.includes('crypt'), detail: 'Confirms the first dungeon route is reachable.' },
    { id: 'secret', label: 'Reveal, unlock, or open an interesting object', done: secretDone, detail: 'The dungeon needs at least one curiosity beat.' },
    { id: 'work_order', label: 'Complete one work order', done: state.dev.telemetry.workOrdersCompleted > 0, detail: 'Connects craft output to a clear reward.' },
    { id: 'housing_plot', label: 'Visit the housing plot', done: objectiveDone(housing, 'enter_area') || state.player.currentArea === 'housing' || state.world.discoveredAreas.includes('housing'), detail: 'Shows the persistent-place promise.' },
    { id: 'place_housing', label: 'Place one housing object', done: objectiveDone(housing, 'build') || state.world.placedBuildings.length > 0, detail: 'Ends the first-hour arc with ownership.' }
  ];
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
  return {
    milestones,
    progress: {
      done,
      total: milestones.length
    },
    nextStep: milestones.find((milestone) => !milestone.done) ?? null,
    skills: {
      target: FIRST_HOUR_SKILL_TARGET,
      touchedCount: touched.size,
      events,
      missingSuggestions: suggestedSkills.filter((skillId) => !touched.has(skillId))
    },
    systems: firstHourSystems(state),
    discoveries: firstHourDiscoveries(state)
  };
}

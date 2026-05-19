import { areas } from '../data/areas';
import { itemDefs } from '../data/items';
import { skillDefinitionById, createSkillState } from '../data/skillDefinitions';
import { beginnerSpellIds, spellDefs } from '../data/spells';
import { createId } from '../game/GameState';
import type { AreaId, EnemyEntity, GameState, SkillId, WorldPhase } from '../game/types';
import type { AreaManager } from '../world/AreaManager';
import { addSystemMessage } from './ChatSystem';
import { addItem } from './InventorySystem';
import { refreshQuestProgress } from './QuestSystem';
import { recordGoldDelta, exportTelemetryJson } from './TelemetrySystem';
import { findDevScenePreset } from '../tools/devScenes';
import { transitionPlayerToArea } from './TransitionSystem';

export function devTeleportToScene(state: GameState, areaManager: AreaManager, sceneId: string): void {
  const scene = findDevScenePreset(sceneId);
  if (!scene) {
    state.ui.prompt = `Missing dev scene: ${sceneId}.`;
    return;
  }
  teleportPlayer(state, areaManager, scene.area, scene.position);
  state.dev.selectedSceneId = scene.id;
  if (scene.id === 'building_sandbox') {
    state.buildMode.active = true;
    state.ui.panels.build = true;
  }
  state.ui.prompt = `Dev scene: ${scene.label}.`;
  addSystemMessage(state, `Dev scene loaded: ${scene.label}.`);
}

export function devTeleportToArea(state: GameState, areaManager: AreaManager, areaId: AreaId): void {
  teleportPlayer(state, areaManager, areaId, areaManager.getSpawn(areaId));
  state.dev.selectedSceneId = 'world';
  state.ui.prompt = `Dev teleport: ${areas[areaId].name}.`;
}

export function devSpawnItem(state: GameState, itemId = 'iron_bar', quantity = 10): boolean {
  if (!itemDefs[itemId]) {
    state.ui.prompt = `Unknown item: ${itemId}.`;
    return false;
  }
  const added = addItem(state.player.inventory, itemId, Math.max(1, Math.floor(quantity)));
  state.ui.prompt = added ? `Spawned ${itemDefs[itemId].name} x${quantity}.` : 'Inventory full.';
  return added;
}

export function devSpawnEnemy(state: GameState, enemyType: EnemyEntity['enemyType'] = 'Bandit'): EnemyEntity {
  const position = { x: state.player.position.x + 2.5, y: 0, z: state.player.position.z + 1.5 };
  const id = createId('dev_enemy');
  const enemy: EnemyEntity = {
    id,
    kind: 'enemy',
    area: state.player.currentArea,
    name: `Dev ${enemyType}`,
    enemyType,
    level: enemyType === 'Undead' ? 5 : enemyType === 'Cultist' ? 7 : 6,
    health: enemyType === 'Cultist' ? 48 : 64,
    maxHealth: enemyType === 'Cultist' ? 48 : 64,
    damage: enemyType === 'Beast' ? [4, 8] : [6, 11],
    armor: enemyType === 'Undead' ? 4 : 2,
    magicResist: enemyType === 'Cultist' ? 20 : 8,
    poisonResist: enemyType === 'Undead' ? 90 : 15,
    weaponSkill: 38,
    defenseSkill: 34,
    aiStyle: enemyType === 'Cultist' ? 'mage' : enemyType === 'Beast' ? 'beast' : 'melee',
    combatRole: enemyType === 'Cultist' ? 'caster' : enemyType === 'Beast' ? 'skirmisher' : 'grunt',
    aggroRadius: 7,
    attackRange: enemyType === 'Cultist' ? 6.5 : 1.25,
    attackCooldown: enemyType === 'Cultist' ? 2.1 : 1.45,
    attackTimer: 0,
    patrolTimer: 0,
    leashOrigin: { ...position },
    state: 'patrol',
    poison: null,
    pacifiedUntil: 0,
    discordUntil: 0,
    discordAmount: 0,
    provokedTargetId: null,
    position,
    blocksMovement: true,
    lootTable: [{ itemId: enemyType === 'Undead' ? 'bones' : 'leather', min: 1, max: 2, chance: 0.8 }],
    goldDrop: [8, 18]
  };
  state.entities[id] = enemy;
  state.ui.prompt = `Spawned ${enemy.name}.`;
  return enemy;
}

export function devSetSkillValue(state: GameState, skillId: SkillId, value: number): boolean {
  const definition = skillDefinitionById[skillId];
  if (!definition) {
    state.ui.prompt = `Unknown skill: ${skillId}.`;
    return false;
  }
  const skill = state.player.skills[skillId] ?? createSkillState(definition);
  const next = Math.max(0, Math.min(skill.cap, Number(value.toFixed(1))));
  skill.realValue = next;
  skill.value = Number((next + (skill.bonusValue ?? 0)).toFixed(1));
  skill.lastGainAt = state.clock;
  state.player.skills[skillId] = skill;
  state.ui.prompt = `Set ${skill.name} to ${skill.value.toFixed(1)}.`;
  return true;
}

export function devAddGold(state: GameState, amount = 250): void {
  const value = Math.max(1, Math.floor(amount));
  state.player.gold += value;
  recordGoldDelta(state, value);
  state.ui.prompt = `Added ${value} gold.`;
}

export function devResetResources(state: GameState): void {
  Object.values(state.entities).forEach((entity) => {
    if (entity.kind !== 'resource') return;
    entity.depleted = false;
    entity.blocksMovement = true;
    entity.respawnTimer = 0;
  });
  Object.values(state.world.resourceTiles).forEach((tile) => {
    tile.depletedUntil = 0;
    tile.harvestsRemaining = tile.maxHarvests;
    tile.lastHarvestedAt = 0;
    tile.visualState = 'standing';
  });
  state.world.resourcePressure = {};
  state.ui.prompt = 'Resources reset.';
}

export function devCompleteQuestStep(state: GameState): boolean {
  const quest = state.player.activeQuestIds.map((id) => state.quests[id]).find((candidate) => candidate && candidate.status !== 'complete');
  const objective = quest?.objectives.find((candidate) => candidate.progress < candidate.required);
  if (!quest || !objective) {
    state.ui.prompt = 'No active quest step to complete.';
    return false;
  }
  objective.progress = objective.required;
  refreshQuestProgress(state);
  state.ui.prompt = `Advanced quest: ${quest.title}.`;
  return true;
}

export function devGiveSpell(state: GameState, spellId = 'fireball'): boolean {
  const id = spellDefs[spellId] ? spellId : beginnerSpellIds[0];
  if (!id) return false;
  state.player.spellbook.knownSpellIds = Array.from(new Set([...state.player.spellbook.knownSpellIds, id]));
  state.ui.prompt = `Added spell: ${spellDefs[id].displayName}.`;
  return true;
}

export function devSimulateTime(state: GameState, phase: WorldPhase): void {
  const dayLength = state.world.time.dayLengthSeconds || 96;
  const offsets: Record<WorldPhase, number> = {
    dawn: 0.24,
    day: 0.36,
    dusk: 0.78,
    night: 0.92
  };
  const day = Math.max(0, state.world.time.day);
  state.clock = day * dayLength + dayLength * offsets[phase];
  const hourMap: Record<WorldPhase, number> = { dawn: 6, day: 12, dusk: 19, night: 22 };
  state.world.time = {
    ...state.world.time,
    timeOfDay: offsets[phase],
    hour: hourMap[phase],
    minute: 0,
    phase,
    visibilityModifier: phase === 'night' ? 0.58 : phase === 'dusk' ? 0.74 : phase === 'dawn' ? 0.82 : 1,
    stealthModifier: phase === 'night' ? 1.2 : phase === 'dusk' ? 1.1 : phase === 'dawn' ? 1.05 : 0.94
  };
  state.ui.prompt = `Time set to ${phase}.`;
}

export function devExportTelemetry(state: GameState): void {
  state.dev.telemetryExportJson = exportTelemetryJson(state);
  console.info('[telemetry]', JSON.parse(state.dev.telemetryExportJson) as unknown);
  state.ui.prompt = 'Telemetry exported to console and dev overlay.';
}

function teleportPlayer(state: GameState, areaManager: AreaManager, areaId: AreaId, position = areaManager.getSpawn(areaId)): void {
  transitionPlayerToArea(state, areaManager, areaId, { requestedSpawn: position });
  state.ui.trade = null;
  state.ui.merchant = null;
  state.ui.panels.trade = false;
  state.ui.panels.merchant = false;
  state.ui.panels.bank = false;
  state.ui.panels.crafting = false;
  state.ui.panels.build = false;
  state.buildMode.active = false;
}

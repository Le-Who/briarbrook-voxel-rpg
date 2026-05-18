import { treasureLootTables, treasureMapDefinitions } from '../data/treasure';
import { emitAudioHook } from '../audio/AudioHooks';
import { createId } from '../game/GameState';
import type { ContainerEntity, GameState, TargetRef, Vec3 } from '../game/types';
import { setPlayerActionState } from './ActionStateSystem';
import type { AreaManager } from '../world/AreaManager';
import { addSystemMessage } from './ChatSystem';
import { triggerContainerTrap } from './ContainerSystem';
import { addItem, getItemCount, removeItems } from './InventorySystem';
import { addFloatingText } from './LootSystem';
import { markSecretDisarmedByContainer, markSecretTriggeredByContainer, revealSecretsNear } from './SecretSystem';
import { attemptSkillUse, getSkillValue } from './SkillSystem';

export function combineMapFragments(state: GameState, mapId = 'greymont_cache'): boolean {
  const fragments = getItemCount(state.player.inventory, 'map_fragment');
  if (fragments < 3) {
    state.ui.prompt = `You have ${fragments}/3 map fragments.`;
    return false;
  }
  if (!removeItems(state.player.inventory, 'map_fragment', 3)) return false;
  if (!addItem(state.player.inventory, 'rough_treasure_map', 1)) {
    addItem(state.player.inventory, 'map_fragment', 3);
    addSystemMessage(state, 'Your pack is full; the map fragments remain too awkward to assemble.');
    return false;
  }
  const runtime = state.world.treasure.maps[mapId];
  runtime.fragmentCount = Math.max(runtime.fragmentCount, 3);
  runtime.lastCheckedAt = state.clock;
  attemptSkillUse(state, 'Cartography', { verb: 'craft', difficulty: 18, success: true, itemId: 'rough_treasure_map', relatedSkills: ['Inscription'] });
  state.ui.selectedTreasureMapId = mapId;
  state.ui.panels.treasureMap = true;
  state.ui.prompt = 'You assemble a rough treasure map.';
  addSystemMessage(state, 'Three map fragments form a rough treasure map.');
  return true;
}

export function openTreasureMap(state: GameState, mapId = 'greymont_cache'): void {
  state.ui.selectedTreasureMapId = mapId;
  state.ui.panels.treasureMap = true;
  state.ui.prompt = 'The parchment shows a rough route and a clue.';
}

export function decipherTreasureMap(state: GameState, mapId = state.ui.selectedTreasureMapId): void {
  const definition = treasureMapDefinitions[mapId];
  const runtime = state.world.treasure.maps[mapId];
  if (!definition || !runtime) return;
  const cartography = getSkillValue(state, 'Cartography');
  const inscription = getSkillValue(state, 'Inscription');
  const precision = Math.max(0.25, Math.min(1, 0.35 + (cartography - definition.requiredCartography) / 70 + inscription / 260));
  const success = precision >= 0.42;
  attemptSkillUse(state, 'Cartography', { verb: 'track', difficulty: definition.requiredCartography, success, itemId: 'rough_treasure_map', relatedSkills: ['Inscription'] });
  runtime.decipheredPrecision = Math.max(runtime.decipheredPrecision, Number(precision.toFixed(2)));
  runtime.lastCheckedAt = state.clock;
  state.ui.prompt = success ? 'The map sharpens into a workable route.' : 'The clue remains vague, but usable.';
  addSystemMessage(state, `${definition.regionHint} clue: ${precisionLabel(runtime.decipheredPrecision)}.`);
}

export function pinTreasureMap(state: GameState, mapId = state.ui.selectedTreasureMapId): void {
  const runtime = state.world.treasure.maps[mapId];
  if (!runtime) return;
  if (runtime.decipheredPrecision < 0.55) {
    state.ui.prompt = 'Decipher the clue further before pinning it.';
    return;
  }
  runtime.pinned = !runtime.pinned;
  state.ui.prompt = runtime.pinned ? 'Treasure mark pinned to the map.' : 'Treasure mark removed.';
}

export function digWithShovel(state: GameState, areaManager: AreaManager, target: TargetRef): boolean {
  if (!target || target.kind !== 'tile') {
    state.ui.prompt = 'Select ground to dig.';
    return false;
  }
  const requiredTool = 'shovel';
  if (getItemCount(state.player.inventory, requiredTool) <= 0 && !Object.values(state.player.equipment).some((stack) => stack?.itemId === requiredTool)) {
    state.ui.prompt = `You need a ${requiredTool} to dig here.`;
    return false;
  }
  const area = target.areaId;
  if (!['forest', 'road', 'housing'].includes(area)) {
    state.ui.prompt = 'This ground is too worked or too solid for treasure digging.';
    return false;
  }
  const position = { x: Math.round(target.position.x), y: 0, z: Math.round(target.position.z) };
  const cooldownKey = `${area}:${position.x}:${position.z}`;
  if ((state.world.treasure.excavationCooldowns[cooldownKey] ?? 0) > state.clock) {
    state.ui.prompt = 'You already disturbed this spot. Let the soil settle.';
    return false;
  }
  if (areaManager.getHeight(area, position.x, position.z) < 0) {
    state.ui.prompt = 'The shovel cannot bite into water.';
    return false;
  }
  const candidate = bestMapForDig(state, area, position);
  setPlayerActionState(state, 'interacting', candidate ? 0.9 : 0.45, 'dig:treasure');
  attemptSkillUse(state, 'Mining', { verb: 'harvest-resource', difficulty: 20, success: Boolean(candidate), tile: position, relatedSkills: ['Cartography', 'Detect Hidden'] });
  state.world.treasure.excavationCooldowns[cooldownKey] = state.clock + 4;
  if (!candidate) {
    const near = nearestMapDistance(state, area, position);
    state.ui.prompt = near < 9 ? 'The soil is disturbed nearby, but not here.' : 'The ground turns cleanly but reveals no cache.';
    return false;
  }
  spawnTreasureCache(state, candidate.mapId, position);
  return true;
}

export function detectHiddenPulse(state: GameState, target: TargetRef = null): number {
  const center = target?.kind === 'tile' ? target.position : state.player.position;
  const detect = getSkillValue(state, 'Detect Hidden');
  let revealed = 0;
  setPlayerActionState(state, 'interacting', 0.6, 'detect-hidden');
  for (const entity of Object.values(state.entities)) {
    if (entity.kind !== 'container' || entity.area !== state.player.currentArea || entity.opened) continue;
    if (distance(entity.position, center) > 7) continue;
    const difficulty = entity.trap?.difficulty ?? entity.lockDifficulty ?? 22;
    const success = detect + 18 >= difficulty || Math.random() * 100 < Math.max(25, Math.min(92, 52 + detect * 0.55 - difficulty));
    attemptSkillUse(state, 'Detect Hidden', { verb: 'detect', difficulty, success, targetId: entity.id, relatedSkills: ['Item Identification'] });
    if (!success) continue;
    if (entity.hidden) {
      entity.hidden = false;
      revealed += 1;
    }
    if (entity.trap && !entity.trap.detected) {
      entity.trap.detected = true;
      revealed += 1;
    }
  }
  revealed += revealSecretsNear(state, { method: 'detect_hidden', origin: center, radius: 7, train: false });
  state.ui.prompt = revealed ? `Detect Hidden reveals ${revealed} sign${revealed === 1 ? '' : 's'}.` : 'Detect Hidden finds no hidden seams nearby.';
  addFloatingText(state, revealed ? `Reveal ${revealed}` : 'No secrets', center, revealed ? '#6fd4ff' : '#d8d8d8');
  return revealed;
}

export function removeTrapFromTarget(state: GameState, target: TargetRef): boolean {
  const container = target?.kind === 'entity' ? state.entities[target.entityId] : null;
  if (!container || container.kind !== 'container') {
    state.ui.prompt = 'Remove Trap needs a revealed trap or trapped container.';
    return false;
  }
  if (!container.trap?.armed) {
    state.ui.prompt = `${container.name} has no active trap.`;
    return false;
  }
  if (!container.trap.detected) {
    state.ui.prompt = 'You need to reveal the trap before disarming it.';
    return false;
  }
  const removeTrap = getSkillValue(state, 'Remove Trap');
  const difficulty = container.trap.difficulty + 4;
  const success = Math.random() * 100 < Math.max(18, Math.min(90, 45 + removeTrap * 0.6 - difficulty));
  setPlayerActionState(state, 'interacting', 0.9, `remove-trap:${container.id}`);
  attemptSkillUse(state, 'Remove Trap', { verb: 'trap', difficulty, success, targetId: container.id, relatedSkills: ['Detect Hidden', 'Tinkering'] });
  if (!success) {
    if (Math.random() < 0.5) triggerContainerTrap(state, container);
    else state.ui.prompt = 'The mechanism twitches, but holds.';
    return false;
  }
  container.trap.armed = false;
  markSecretDisarmedByContainer(state, container.id);
  state.ui.prompt = 'The trap is safely disabled.';
  addSystemMessage(state, `${container.name}: trap disabled.`);
  return true;
}

export function triggerTrapWithTelekinesis(state: GameState, target: TargetRef): boolean {
  const container = target?.kind === 'entity' ? state.entities[target.entityId] : null;
  if (!container || container.kind !== 'container' || !container.trap?.armed) return false;
  container.trap.detected = true;
  container.trap.armed = false;
  markSecretTriggeredByContainer(state, container.id);
  addFloatingText(state, 'Trap Snap', container.position, '#b66dff');
  addSystemMessage(state, `${container.name} discharges at a safe distance.`);
  state.ui.prompt = 'Telekinesis snaps the trap from a safer distance.';
  emitAudioHook('trap_trigger', { id: container.id, area: container.area, position: container.position });
  return true;
}

function bestMapForDig(state: GameState, area: string, position: Vec3): { mapId: string; distance: number } | null {
  let best: { mapId: string; distance: number } | null = null;
  for (const [mapId, definition] of Object.entries(treasureMapDefinitions)) {
    const runtime = state.world.treasure.maps[mapId];
    if (!runtime || runtime.found || definition.regionHint !== area) continue;
    if (getItemCount(state.player.inventory, 'rough_treasure_map') <= 0) continue;
    const precisionRadius = Math.max(1.2, definition.searchRadius - runtime.decipheredPrecision * 2.2);
    const dist = distance(position, definition.approximateLocation);
    if (dist <= precisionRadius && (!best || dist < best.distance)) best = { mapId, distance: dist };
  }
  return best;
}

function nearestMapDistance(state: GameState, area: string, position: Vec3): number {
  return Math.min(
    ...Object.values(treasureMapDefinitions)
      .filter((definition) => definition.regionHint === area)
      .map((definition) => distance(position, definition.approximateLocation)),
    Infinity
  );
}

function spawnTreasureCache(state: GameState, mapId: string, position: Vec3): void {
  const definition = treasureMapDefinitions[mapId];
  const runtime = state.world.treasure.maps[mapId];
  const id = `treasure_${mapId}`;
  if (state.entities[id]) {
    state.ui.prompt = 'The cache is already exposed.';
    return;
  }
  const loot = treasureLootTables[definition.lootTableId] ?? [{ itemId: 'glimmer_gem', quantity: 1 }];
  const chest: ContainerEntity = {
    id,
    kind: 'container',
    area: definition.regionHint,
    name: 'Buried Treasure Cache',
    position,
    blocksMovement: true,
    locked: true,
    opened: false,
    hidden: false,
    lockDifficulty: 44,
    trap: { armed: true, detected: runtime.decipheredPrecision > 0.7, difficulty: 34, damage: 16 },
    loot,
    gold: 85
  };
  state.entities[id] = chest;
  runtime.found = true;
  addFloatingText(state, 'Buried Cache', position, '#f0c957');
  addSystemMessage(state, 'Your shovel strikes old wood. A buried cache is exposed.');
  state.ui.prompt = 'Buried cache exposed. Check the lock and trap before opening it.';
}

function precisionLabel(precision: number): string {
  if (precision >= 0.85) return 'clear landmark and tight search radius';
  if (precision >= 0.6) return 'useful landmark and smaller search radius';
  return 'vague region clue';
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

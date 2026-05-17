import { buildPieces, itemDefs } from '../data/items';
import { getHousingPieceDefinition } from '../data/housing';
import { createId } from '../game/GameState';
import type { BuildingEntity, GameState, Vec3 } from '../game/types';
import type { AreaManager } from '../world/AreaManager';
import { addSystemMessage } from './ChatSystem';
import { canBuildOnOwnedPlot, canUndoHousingPlacement, claimStarterPlot, currentHousingTier, getStarterHousingPlot, registerHousingBuilding, undoLastHousingPlacement } from './HousingSystem';
import { hasItems, removeItems } from './InventorySystem';
import { recordQuestEvent } from './QuestSystem';
import { recordItemConsumed, recordResourceOutflow } from './TelemetrySystem';

export function getSelectedBuildPiece(state: GameState) {
  return buildPieces.find((piece) => piece.id === state.buildMode.selectedPieceId) ?? buildPieces[0];
}

export function updateBuildGhost(state: GameState, areaManager: AreaManager, position: Vec3): void {
  const snapped = state.buildMode.snapToGrid ? { x: Math.round(position.x), y: 0, z: Math.round(position.z) } : { ...position, y: 0 };
  state.buildMode.ghostPosition = snapped;
  const result = validatePlacement(state, areaManager, snapped);
  state.buildMode.valid = result.valid;
  state.buildMode.message = result.message;
}

export function validatePlacement(state: GameState, areaManager: AreaManager, position = state.buildMode.ghostPosition): { valid: boolean; message: string } {
  if (state.player.currentArea !== 'housing') return { valid: false, message: 'You cannot place a wall outside your plot.' };
  const piece = getSelectedBuildPiece(state);
  const permission = canBuildOnOwnedPlot(state);
  if (!permission.ok) return { valid: false, message: permission.message };
  const plot = permission.plot ?? getStarterHousingPlot(state);
  const pieceDefinition = getHousingPieceDefinition(piece.id);
  if (plot.tier < pieceDefinition.minTier) {
    const tierName = currentHousingTier(state).name;
    return { valid: false, message: `${piece.name} needs a higher plot tier. Current tier: ${tierName}.` };
  }
  const movingId = state.buildMode.moveBuildingId;
  const isMoving = Boolean(movingId);
  const tier = currentHousingTier(state);
  const placedOnPlot = state.world.placedBuildings.filter((building) => building.plotId === plot.id || building.area === 'housing').length;
  if (!isMoving && placedOnPlot >= tier.placementLimit) return { valid: false, message: `${tier.name} supports ${tier.placementLimit} placed objects. Upgrade for more.` };
  const gx = Math.round(position.x);
  const gz = Math.round(position.z);
  if (gx < plot.boundary.minX || gx > plot.boundary.maxX || gz < plot.boundary.minZ || gz > plot.boundary.maxZ) {
    return { valid: false, message: 'You cannot place that outside the fenced plot.' };
  }
  if (areaManager.getHeight('housing', gx, gz) < 0) {
    return { valid: false, message: 'You cannot build on water.' };
  }
  if (cellOccupied(state, gx, gz, movingId ?? undefined)) {
    return { valid: false, message: 'Something already occupies that space.' };
  }
  if (areaManager.isBlocked(state, gx, gz, movingId ?? undefined)) return { valid: false, message: 'That space is blocked.' };
  if (!isMoving && !hasItems(state.player.inventory, piece.cost)) {
    return { valid: false, message: `You need ${piece.cost.map((cost) => `${cost.quantity} ${itemDefs[cost.itemId]?.name ?? cost.itemId}`).join(', ')}.` };
  }
  const playerDist = Math.hypot(gx - state.player.position.x, gz - state.player.position.z);
  if (playerDist < 0.8) return { valid: false, message: 'Move Valen before placing that there.' };
  if (piece.blocksMovement && wouldTrapPlayer(state, areaManager, gx, gz, movingId ?? undefined)) return { valid: false, message: 'Leave yourself a way out.' };
  return { valid: true, message: isMoving ? 'Ready to move.' : 'Ready to place.' };
}

function cellOccupied(state: GameState, gx: number, gz: number, ignoreEntityId?: string): boolean {
  for (const building of state.world.placedBuildings) {
    if (building.id === ignoreEntityId) continue;
    if (building.area !== state.player.currentArea) continue;
    if (Math.round(building.position.x) === gx && Math.round(building.position.z) === gz) return true;
  }
  for (const entity of Object.values(state.entities)) {
    if (entity.id === ignoreEntityId) continue;
    if (entity.area !== state.player.currentArea || entity.kind === 'building') continue;
    if ('state' in entity && entity.state === 'dead') continue;
    if (Math.round(entity.position.x) === gx && Math.round(entity.position.z) === gz) return true;
  }
  return false;
}

function wouldTrapPlayer(state: GameState, areaManager: AreaManager, gx: number, gz: number, ignoreEntityId?: string): boolean {
  const px = Math.round(state.player.position.x);
  const pz = Math.round(state.player.position.z);
  const exits = [
    [px + 1, pz],
    [px - 1, pz],
    [px, pz + 1],
    [px, pz - 1]
  ];
  return exits.every(([x, z]) => (x === gx && z === gz) || areaManager.isBlocked(state, x, z, ignoreEntityId));
}

export function placeBuilding(state: GameState, areaManager: AreaManager): boolean {
  const piece = getSelectedBuildPiece(state);
  if (!state.world.housing.ownedPlotId) claimStarterPlot(state);
  const result = validatePlacement(state, areaManager);
  state.buildMode.valid = result.valid;
  state.buildMode.message = result.message;
  if (!result.valid) {
    state.ui.prompt = result.message;
    addSystemMessage(state, result.message);
    return false;
  }
  if (state.buildMode.moveBuildingId) {
    const building = state.world.placedBuildings.find((candidate) => candidate.id === state.buildMode.moveBuildingId);
    if (!building) {
      state.buildMode.moveBuildingId = null;
      return false;
    }
    building.position = { ...state.buildMode.ghostPosition };
    building.rotation = state.buildMode.rotation;
    state.entities[building.id] = building;
    const plot = canBuildOnOwnedPlot(state).plot;
    if (plot) plot.lastPlacementId = building.id;
    state.buildMode.moveBuildingId = null;
    addSystemMessage(state, `Moved ${building.name}.`);
    updateBuildGhost(state, areaManager, state.buildMode.ghostPosition);
    return true;
  }
  piece.cost.forEach((cost) => {
    removeItems(state.player.inventory, cost.itemId, cost.quantity);
    recordItemConsumed(state, cost.itemId, cost.quantity);
    recordResourceOutflow(state, cost.itemId, cost.quantity);
  });
  const building: BuildingEntity = {
    id: createId('building'),
    kind: 'building',
    area: 'housing',
    name: piece.name,
    pieceId: piece.id,
    rotation: state.buildMode.rotation,
    position: { ...state.buildMode.ghostPosition },
    blocksMovement: piece.blocksMovement
  };
  registerHousingBuilding(state, building);
  state.world.placedBuildings.push(building);
  state.entities[building.id] = building;
  recordQuestEvent(state, { type: 'build', pieceId: piece.id });
  addSystemMessage(state, `Placed ${piece.name}.`);
  updateBuildGhost(state, areaManager, state.buildMode.ghostPosition);
  return true;
}

export function claimPlotAndRefreshBuild(state: GameState, areaManager: AreaManager): void {
  claimStarterPlot(state);
  updateBuildGhost(state, areaManager, state.buildMode.ghostPosition);
}

export function undoLastBuilding(state: GameState, areaManager: AreaManager): boolean {
  const ok = undoLastHousingPlacement(state);
  updateBuildGhost(state, areaManager, state.buildMode.ghostPosition);
  return ok;
}

export function beginMoveLastBuilding(state: GameState, areaManager: AreaManager): boolean {
  const last = state.world.placedBuildings.at(-1);
  if (!last || last.area !== 'housing') {
    state.ui.prompt = 'Place an object before using move mode.';
    addSystemMessage(state, state.ui.prompt);
    return false;
  }
  const check = canUndoHousingPlacement(state, last);
  if (!check.ok && !last.storageId) {
    state.ui.prompt = check.message;
    addSystemMessage(state, check.message);
    return false;
  }
  state.buildMode.moveBuildingId = last.id;
  state.buildMode.selectedPieceId = last.pieceId;
  state.buildMode.rotation = last.rotation;
  updateBuildGhost(state, areaManager, last.position);
  state.ui.prompt = `Move mode: choose a new valid tile for ${last.name}.`;
  addSystemMessage(state, state.ui.prompt);
  return true;
}

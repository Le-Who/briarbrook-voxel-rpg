import type { GameState } from '../game/types';
import type { PlayerCommand, SerializedSnapshot } from './protocol';

export interface ReconciliationResult {
  acceptedCommandIds: string[];
  replayCommands: PlayerCommand[];
}

export function reconcileAuthoritativeSnapshot(_state: GameState, snapshot: SerializedSnapshot, pendingCommands: PlayerCommand[]): ReconciliationResult {
  const serverTick = snapshot.serverTick;
  const acceptedCommandIds = pendingCommands.filter((command) => command.clientTick <= serverTick).map((command) => command.id);
  const accepted = new Set(acceptedCommandIds);
  return {
    acceptedCommandIds,
    replayCommands: pendingCommands.filter((command) => !accepted.has(command.id))
  };
}

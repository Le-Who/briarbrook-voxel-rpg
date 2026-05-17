import type { GameState } from '../game/types';
import type { PlayerCommand, SerializedSnapshot } from './protocol';

export class LocalClientPrediction {
  readonly pendingCommands: PlayerCommand[] = [];

  constructor(private predictedState: GameState) {}

  applyLocalCommand(command: PlayerCommand): void {
    this.pendingCommands.push(command);
    if (command.type === 'MoveTo' && command.payload.position) {
      this.predictedState.player.targetPosition = { ...command.payload.position };
    }
  }

  reconcile(snapshot: SerializedSnapshot, acknowledgedCommandIds: string[]): void {
    this.predictedState = snapshot.state;
    const acknowledged = new Set(acknowledgedCommandIds);
    for (let i = this.pendingCommands.length - 1; i >= 0; i -= 1) {
      if (acknowledged.has(this.pendingCommands[i].id)) this.pendingCommands.splice(i, 1);
    }
  }

  get state(): GameState {
    return this.predictedState;
  }
}

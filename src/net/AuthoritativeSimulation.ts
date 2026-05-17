import { Simulation } from '../game/Simulation';
import type { GameState, Vec3 } from '../game/types';
import { EventBus } from './EventBus';
import { commandToAction, type PlayerCommand, type RenderEvent, type SimulationEvent } from './protocol';

export class AuthoritativeSimulation {
  readonly simulation: Simulation;
  private readonly events = new EventBus();
  private lastPlayerPosition: Vec3;

  constructor(state: GameState) {
    this.simulation = new Simulation(state);
    this.lastPlayerPosition = { ...state.player.position };
  }

  get state(): GameState {
    return this.simulation.state;
  }

  submitCommand(command: PlayerCommand): SimulationEvent[] {
    const action = commandToAction(command);
    if (!action || command.actorId !== 'player') {
      return [
        this.events.emitSimulation({
          type: 'CommandRejected',
          commandId: command.id,
          actorId: command.actorId,
          reason: 'Invalid or unauthorized command.',
          serverTick: this.state.realtime.tick
        })
      ];
    }
    this.simulation.dispatch(action);
    return [
      this.events.emitSimulation({
        type: 'CommandAccepted',
        commandId: command.id,
        actorId: command.actorId,
        serverTick: this.state.realtime.tick
      })
    ];
  }

  update(dt: number): void {
    const before = { ...this.state.player.position };
    this.simulation.update(dt);
    const after = this.state.player.position;
    if (before.x !== after.x || before.z !== after.z || this.lastPlayerPosition.x !== after.x || this.lastPlayerPosition.z !== after.z) {
      this.events.emitSimulation({
        type: 'EntityMoved',
        entityId: 'player',
        from: before,
        to: { ...after },
        serverTick: this.state.realtime.tick
      });
      this.lastPlayerPosition = { ...after };
    }
  }

  drainEvents(): SimulationEvent[] {
    return this.events.drainSimulation();
  }

  drainRenderEvents(): RenderEvent[] {
    return this.events.drainRender();
  }
}

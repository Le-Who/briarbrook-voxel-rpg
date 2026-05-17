import { createId } from '../game/GameState';
import type { RenderEvent, SimulationEvent } from './protocol';

type SimulationEventPayload = SimulationEvent extends infer Event ? (Event extends { id: string } ? Omit<Event, 'id'> : never) : never;

export class EventBus {
  private simulationEvents: SimulationEvent[] = [];
  private renderEvents: RenderEvent[] = [];

  emitSimulation(event: SimulationEventPayload): SimulationEvent {
    const created = { id: createId('sim_evt'), ...event } as SimulationEvent;
    this.simulationEvents.push(created);
    this.renderEvents.push(...renderEventsFor(created));
    return created;
  }

  drainSimulation(): SimulationEvent[] {
    const events = this.simulationEvents;
    this.simulationEvents = [];
    return events;
  }

  drainRender(): RenderEvent[] {
    const events = this.renderEvents;
    this.renderEvents = [];
    return events;
  }
}

function renderEventsFor(event: SimulationEvent): RenderEvent[] {
  if (event.type === 'CommandRejected' || event.type === 'RejectedCommand') return [{ id: createId('render_evt'), type: 'ShowCommandError', message: event.reason }];
  if (event.type === 'EntityMoved') return [{ id: createId('render_evt'), type: 'PlayMoveIntent', entityId: event.entityId, to: event.to }];
  if (event.type === 'DamageApplied') return [{ id: createId('render_evt'), type: 'PlayHitEffect', targetId: event.targetId }];
  if (event.type === 'ItemAdded') return [{ id: createId('render_evt'), type: 'ShowPickupToast', itemId: event.itemId, quantity: event.quantity }];
  return [];
}

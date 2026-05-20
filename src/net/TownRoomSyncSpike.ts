import { createId } from '../game/GameState';
import type { AreaId, Vec3 } from '../game/types';
import { AreaManager } from '../world/AreaManager';
import type { PlayerCommand, SimulationEvent } from './protocol';

export interface RoomPlayerState {
  actorId: string;
  displayName: string;
  area: AreaId;
  position: Vec3;
  lastEmoteId: string | null;
  joinedAtTick: number;
  lastCommandTick: number;
}

export interface TownRoomSnapshot {
  roomId: string;
  serverTick: number;
  area: 'town';
  players: RoomPlayerState[];
}

export class TownRoomSyncSpike {
  private readonly areaManager = new AreaManager();
  private readonly players = new Map<string, RoomPlayerState>();
  private serverTick = 0;

  constructor(readonly roomId = 'town-presence-spike') {}

  joinPlayer(actorId: string, displayName: string, position: Vec3 = { x: 0, y: 0, z: 0 }): SimulationEvent[] {
    this.serverTick += 1;
    const safePosition = this.clampTownPosition(position);
    const player: RoomPlayerState = {
      actorId,
      displayName,
      area: 'town',
      position: safePosition,
      lastEmoteId: null,
      joinedAtTick: this.serverTick,
      lastCommandTick: this.serverTick
    };
    this.players.set(actorId, player);
    return [
      this.event({ type: 'PlayerJoined', actorId, displayName }),
      this.event({ type: 'EntitySnapshot', entityId: actorId, position: safePosition })
    ];
  }

  leavePlayer(actorId: string): SimulationEvent[] {
    if (!this.players.has(actorId)) return [];
    this.serverTick += 1;
    this.players.delete(actorId);
    return [this.event({ type: 'PlayerLeft', actorId })];
  }

  submitCommand(command: PlayerCommand): SimulationEvent[] {
    this.serverTick += 1;
    const player = this.players.get(command.actorId);
    if (!player) return [this.reject(command, 'Unknown room actor.')];
    player.lastCommandTick = this.serverTick;
    if (command.type === 'MoveIntent' || command.type === 'MoveTo') {
      if (!command.payload.position) return [this.reject(command, 'Move command missing position.')];
      const requested = command.payload.position;
      if (!this.areaManager.isInsideBounds('town', requested.x, requested.z)) return [this.reject(command, 'Move outside town room bounds.')];
      const from = { ...player.position };
      player.position = { x: requested.x, y: 0, z: requested.z };
      return [
        this.event({ type: 'CommandAccepted', commandId: command.id, actorId: command.actorId }),
        this.event({ type: 'EntityMoved', entityId: command.actorId, from, to: { ...player.position } }),
        this.event({ type: 'EntitySnapshot', entityId: command.actorId, position: { ...player.position } })
      ];
    }
    if (command.type === 'ChatMessage') {
      const text = command.payload.text?.trim().slice(0, 160);
      if (!text) return [this.reject(command, 'Empty chat message.')];
      return [
        this.event({ type: 'CommandAccepted', commandId: command.id, actorId: command.actorId }),
        this.event({ type: 'ChatBroadcast', actorId: command.actorId, text })
      ];
    }
    if (command.type === 'Emote') {
      const emoteId = command.payload.emoteId?.trim().slice(0, 32);
      if (!emoteId) return [this.reject(command, 'Missing emote id.')];
      player.lastEmoteId = emoteId;
      return [
        this.event({ type: 'CommandAccepted', commandId: command.id, actorId: command.actorId }),
        this.event({ type: 'EmoteBroadcast', actorId: command.actorId, emoteId })
      ];
    }
    return [this.reject(command, 'Town room spike only allows movement, chat, and emotes.')];
  }

  snapshot(): TownRoomSnapshot {
    return {
      roomId: this.roomId,
      serverTick: this.serverTick,
      area: 'town',
      players: Array.from(this.players.values()).map((player) => ({
        ...player,
        position: { ...player.position }
      }))
    };
  }

  private clampTownPosition(position: Vec3): Vec3 {
    if (this.areaManager.isInsideBounds('town', position.x, position.z)) return { x: position.x, y: 0, z: position.z };
    return { x: 0, y: 0, z: 0 };
  }

  private reject(command: PlayerCommand, reason: string): SimulationEvent {
    return this.event({ type: 'CommandRejected', commandId: command.id, actorId: command.actorId, reason });
  }

  private event(event: { type: SimulationEvent['type']; [key: string]: unknown }): SimulationEvent {
    return {
      id: createId('room_event'),
      serverTick: this.serverTick,
      ...event
    } as SimulationEvent;
  }
}

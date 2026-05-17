import type { GameAction } from '../game/Actions';
import type { GameState, TargetRef, Vec3 } from '../game/types';

export type PlayerCommandType =
  | 'MoveTo'
  | 'MoveBy'
  | 'MoveIntent'
  | 'InteractIntent'
  | 'ChatMessage'
  | 'Emote'
  | 'StartAttack'
  | 'CastSpell'
  | 'UseItem'
  | 'UseToolOnTile'
  | 'StartTrade'
  | 'UpdateTradeOffer'
  | 'LockTrade'
  | 'AcceptTrade'
  | 'CancelTrade';

export interface PlayerCommand {
  id: string;
  actorId: string;
  type: PlayerCommandType;
  payload: {
    position?: Vec3;
    delta?: { dx: number; dz: number };
    entityId?: string;
    spellId?: string;
    slot?: number;
    text?: string;
    emoteId?: string;
    toolItemId?: string;
    target?: TargetRef;
    partnerId?: string;
    itemInstanceIds?: string[];
    gold?: number;
  };
  clientTick: number;
  createdAt: number;
}

export type SimulationEvent =
  | { id: string; type: 'CommandAccepted'; commandId: string; actorId: string; serverTick: number }
  | { id: string; type: 'CommandRejected'; commandId: string; actorId: string; reason: string; serverTick: number }
  | { id: string; type: 'PlayerJoined'; actorId: string; displayName: string; serverTick: number }
  | { id: string; type: 'PlayerLeft'; actorId: string; serverTick: number }
  | { id: string; type: 'EntitySnapshot'; entityId: string; position: Vec3; serverTick: number }
  | { id: string; type: 'ChatBroadcast'; actorId: string; text: string; serverTick: number }
  | { id: string; type: 'TradeOpened'; tradeId: string; actorIds: string[]; serverTick: number }
  | { id: string; type: 'TradeUpdated'; tradeId: string; actorId: string; serverTick: number }
  | { id: string; type: 'EntityMoved'; entityId: string; from: Vec3; to: Vec3; serverTick: number }
  | { id: string; type: 'DamageApplied'; sourceId: string; targetId: string; amount: number; serverTick: number }
  | { id: string; type: 'ItemAdded'; containerId: string; itemInstanceId: string; itemId: string; quantity: number; serverTick: number }
  | { id: string; type: 'TradeCompleted'; tradeId: string; serverTick: number }
  | { id: string; type: 'InventoryUpdated'; actorId: string; itemInstanceIds: string[]; serverTick: number }
  | { id: string; type: 'RejectedCommand'; commandId: string; actorId: string; reason: string; serverTick: number };

export type RenderEvent =
  | { id: string; type: 'ShowCommandError'; message: string }
  | { id: string; type: 'PlayMoveIntent'; entityId: string; to: Vec3 }
  | { id: string; type: 'PlayHitEffect'; targetId: string }
  | { id: string; type: 'ShowPickupToast'; itemId: string; quantity: number };

export interface SerializedSnapshot {
  saveVersion: number;
  serverTick: number;
  state: GameState;
}

export function commandToAction(command: PlayerCommand): GameAction | null {
  switch (command.type) {
    case 'MoveTo':
    case 'MoveIntent':
      return command.payload.position ? { type: 'MOVE_TO', position: command.payload.position } : null;
    case 'MoveBy':
      return command.payload.delta ? { type: 'MOVE_BY', dx: command.payload.delta.dx, dz: command.payload.delta.dz } : null;
    case 'InteractIntent':
      return command.payload.entityId ? { type: 'INTERACT_ENTITY', entityId: command.payload.entityId } : null;
    case 'ChatMessage':
      return command.payload.text ? { type: 'SEND_CHAT', text: command.payload.text } : null;
    case 'StartAttack':
      return { type: 'ATTACK_ENTITY', entityId: command.payload.entityId };
    case 'CastSpell':
      return command.payload.spellId ? { type: 'CAST_SPELL', spellId: command.payload.spellId, entityId: command.payload.entityId } : null;
    case 'UseItem':
      return typeof command.payload.slot === 'number' ? { type: 'USE_ITEM', slot: command.payload.slot } : null;
    case 'UseToolOnTile':
      return command.payload.toolItemId && command.payload.target ? { type: 'USE_TOOL_ON_TARGET', toolItemId: command.payload.toolItemId, target: command.payload.target } : null;
    case 'StartTrade':
      return command.payload.partnerId ? { type: 'OPEN_TRADE', partnerId: command.payload.partnerId } : null;
    case 'LockTrade':
    case 'AcceptTrade':
      return { type: 'LOCK_TRADE', side: 'player' };
    case 'CancelTrade':
      return { type: 'CANCEL_TRADE' };
    default:
      return null;
  }
}

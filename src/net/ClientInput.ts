import { createId } from '../game/GameState';
import type { TargetRef, Vec3 } from '../game/types';
import type { PlayerCommand } from './protocol';

export class ClientInput {
  private clientTick = 0;

  moveTo(position: Vec3, createdAt: number): PlayerCommand {
    return this.command('MoveTo', { position }, createdAt);
  }

  moveIntent(position: Vec3, createdAt: number): PlayerCommand {
    return this.command('MoveIntent', { position }, createdAt);
  }

  interactIntent(entityId: string, createdAt: number): PlayerCommand {
    return this.command('InteractIntent', { entityId }, createdAt);
  }

  chatMessage(text: string, createdAt: number): PlayerCommand {
    return this.command('ChatMessage', { text }, createdAt);
  }

  attack(entityId: string, createdAt: number): PlayerCommand {
    return this.command('StartAttack', { entityId }, createdAt);
  }

  castSpell(spellId: string, target: TargetRef, createdAt: number): PlayerCommand {
    return this.command('CastSpell', { spellId, target }, createdAt);
  }

  startTrade(partnerId: string, createdAt: number): PlayerCommand {
    return this.command('StartTrade', { partnerId }, createdAt);
  }

  updateTradeOffer(itemInstanceIds: string[], gold: number, createdAt: number): PlayerCommand {
    return this.command('UpdateTradeOffer', { itemInstanceIds, gold }, createdAt);
  }

  lockTrade(createdAt: number): PlayerCommand {
    return this.command('LockTrade', {}, createdAt);
  }

  acceptTrade(createdAt: number): PlayerCommand {
    return this.command('AcceptTrade', {}, createdAt);
  }

  cancelTrade(createdAt: number): PlayerCommand {
    return this.command('CancelTrade', {}, createdAt);
  }

  private command(type: PlayerCommand['type'], payload: PlayerCommand['payload'], createdAt: number): PlayerCommand {
    this.clientTick += 1;
    return {
      id: createId('cmd'),
      actorId: 'player',
      type,
      payload,
      clientTick: this.clientTick,
      createdAt
    };
  }
}

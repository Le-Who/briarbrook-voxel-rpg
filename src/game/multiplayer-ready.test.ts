import { describe, expect, it } from 'vitest';
import readinessDoc from '../../MULTIPLAYER_READINESS.md?raw';
import { createInitialGameState } from './GameState';
import { AuthoritativeSimulation } from '../net/AuthoritativeSimulation';
import { LocalClientPrediction } from '../net/LocalClientPrediction';
import { SnapshotSerializer } from '../net/SnapshotSerializer';
import { TownRoomSyncSpike } from '../net/TownRoomSyncSpike';
import { commandToAction, type PlayerCommand } from '../net/protocol';

describe('multiplayer-ready architecture', () => {
  it('routes player commands through an authoritative local simulation and emits events', () => {
    const authoritative = new AuthoritativeSimulation(createInitialGameState());
    const command: PlayerCommand = {
      id: 'cmd_move_1',
      actorId: 'player',
      type: 'MoveTo',
      payload: { position: { x: 2, y: 0, z: 2 } },
      clientTick: 1,
      createdAt: 0
    };

    const events = authoritative.submitCommand(command);
    authoritative.update(1 / 30);

    expect(events.some((event) => event.type === 'CommandAccepted')).toBe(true);
    expect(authoritative.drainEvents().some((event) => event.type === 'EntityMoved' || event.type === 'CommandAccepted')).toBe(true);
  });

  it('keeps prediction local and reconciles from authoritative snapshots', () => {
    const state = createInitialGameState();
    const prediction = new LocalClientPrediction(state);

    prediction.applyLocalCommand({
      id: 'cmd_predict_1',
      actorId: 'player',
      type: 'MoveTo',
      payload: { position: { x: 4, y: 0, z: 1 } },
      clientTick: 2,
      createdAt: 0
    });
    expect(prediction.pendingCommands).toHaveLength(1);

    prediction.reconcile(SnapshotSerializer.serialize(state), ['cmd_predict_1']);
    expect(prediction.pendingCommands).toHaveLength(0);
  });

  it('serializes stable versioned snapshots without render-only objects', () => {
    const state = createInitialGameState();
    const snapshot = SnapshotSerializer.serialize(state);
    const restored = SnapshotSerializer.deserialize(snapshot);

    expect(snapshot.saveVersion).toBeGreaterThanOrEqual(2);
    expect(snapshot.state.player.id).toBe('player');
    expect(snapshot.state.player.inventory.slots[0]?.uid).toBeTruthy();
    expect(JSON.stringify(snapshot)).not.toContain('THREE');
    expect(restored.saveVersion).toBe(snapshot.saveVersion);
    expect(restored.state.world.economy.workOrders.length).toBeGreaterThanOrEqual(10);
  });

  it('documents the recommended first multiplayer prototype and blockers', () => {
    expect(readinessDoc).toContain('Shared Town Presence + Secure Trade');
    expect(readinessDoc).toContain('Decision: Colyseus spike');
    expect(readinessDoc).toContain('Nakama plan later');
    expect(readinessDoc).toContain('Custom WebSocket rejected');
    expect(readinessDoc).toContain('MVP Option Scorecard');
    expect(readinessDoc).toContain('Backend Evaluation Scorecard');
    expect(readinessDoc).toContain('TownRoomSyncSpike');
    expect(readinessDoc).toContain('No combat/resources');
    expect(readinessDoc).toContain('room server');
    expect(readinessDoc).toContain('| Trade transaction safety | Blocker for secure trade |');
    expect(readinessDoc).toContain('AuthoritativeSimulation.submitCommand');
  });

  it('maps only non-gameplay prototype client commands onto the existing local action surface', () => {
    expect(commandToAction({
      id: 'cmd_presence_move',
      actorId: 'player',
      type: 'MoveIntent',
      payload: { position: { x: 5, y: 0, z: 6 } },
      clientTick: 3,
      createdAt: 0
    })).toEqual({ type: 'MOVE_TO', position: { x: 5, y: 0, z: 6 } });

    expect(commandToAction({
      id: 'cmd_chat',
      actorId: 'player',
      type: 'ChatMessage',
      payload: { text: 'Selling ingots at the bank.' },
      clientTick: 4,
      createdAt: 0
    })).toEqual({ type: 'SEND_CHAT', text: 'Selling ingots at the bank.' });

    expect(commandToAction({
      id: 'cmd_cancel_trade',
      actorId: 'player',
      type: 'CancelTrade',
      payload: {},
      clientTick: 5,
      createdAt: 0
    })).toEqual({ type: 'CANCEL_TRADE' });

    expect(commandToAction({
      id: 'cmd_attack_blocked',
      actorId: 'player',
      type: 'StartAttack',
      payload: { entityId: 'enemy_bandit_1' },
      clientTick: 6,
      createdAt: 0
    })).toBeNull();

    expect(commandToAction({
      id: 'cmd_resource_blocked',
      actorId: 'player',
      type: 'UseToolOnTile',
      payload: { toolItemId: 'axe', target: { kind: 'tile', areaId: 'forest', position: { x: 0, y: 0, z: 0 } } },
      clientTick: 7,
      createdAt: 0
    })).toBeNull();
  });

  it('keeps the room sync spike to town presence, chat, and emotes only', () => {
    const room = new TownRoomSyncSpike('test-town-room');
    room.joinPlayer('alice', 'Alice', { x: 0, y: 0, z: 0 });
    room.joinPlayer('borin', 'Borin', { x: 2, y: 0, z: 2 });

    const moveEvents = room.submitCommand({
      id: 'cmd_alice_move',
      actorId: 'alice',
      type: 'MoveIntent',
      payload: { position: { x: 3, y: 0, z: 4 } },
      clientTick: 1,
      createdAt: 0
    });
    const chatEvents = room.submitCommand({
      id: 'cmd_borin_chat',
      actorId: 'borin',
      type: 'ChatMessage',
      payload: { text: 'Selling ingots at the bank.' },
      clientTick: 2,
      createdAt: 0
    });
    const emoteEvents = room.submitCommand({
      id: 'cmd_alice_wave',
      actorId: 'alice',
      type: 'Emote',
      payload: { emoteId: 'wave' },
      clientTick: 3,
      createdAt: 0
    });
    const rejectedGameplay = room.submitCommand({
      id: 'cmd_alice_attack',
      actorId: 'alice',
      type: 'StartAttack',
      payload: { entityId: 'enemy_bandit_1' },
      clientTick: 4,
      createdAt: 0
    });

    expect(room.snapshot().players.map((player) => player.actorId).sort()).toEqual(['alice', 'borin']);
    expect(moveEvents.some((event) => event.type === 'EntityMoved')).toBe(true);
    expect(chatEvents).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'ChatBroadcast', actorId: 'borin' })]));
    expect(emoteEvents).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'EmoteBroadcast', actorId: 'alice', emoteId: 'wave' })]));
    expect(rejectedGameplay).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'CommandRejected' })]));
  });
});

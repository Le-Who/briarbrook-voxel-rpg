import { describe, expect, it } from 'vitest';
import readinessDoc from '../../MULTIPLAYER_READINESS.md?raw';
import { createInitialGameState } from './GameState';
import { AuthoritativeSimulation } from '../net/AuthoritativeSimulation';
import { LocalClientPrediction } from '../net/LocalClientPrediction';
import { SnapshotSerializer } from '../net/SnapshotSerializer';
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
    expect(readinessDoc).toContain('room server');
    expect(readinessDoc).toContain('| Trade transaction safety | Blocker for secure trade |');
    expect(readinessDoc).toContain('AuthoritativeSimulation.submitCommand');
  });

  it('maps prototype client commands onto the existing local action surface', () => {
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
  });
});

import { createInitialGameState } from '../game/GameState';
import type { GameState } from '../game/types';
import type { SerializedSnapshot } from './protocol';

export const CURRENT_SAVE_VERSION = 2;

export class SnapshotSerializer {
  static serialize(state: GameState): SerializedSnapshot {
    const safeState: GameState = JSON.parse(
      JSON.stringify({
        ...state,
        saveVersion: CURRENT_SAVE_VERSION,
        floatingTexts: [],
        projectiles: [],
        realtime: {
          ...state.realtime,
          actionQueue: [],
          pendingAction: null,
          lastFrameDelta: 0
        }
      })
    ) as GameState;
    return {
      saveVersion: CURRENT_SAVE_VERSION,
      serverTick: safeState.realtime.tick,
      state: safeState
    };
  }

  static deserialize(snapshot: SerializedSnapshot): SerializedSnapshot {
    const base = createInitialGameState();
    const state = {
      ...base,
      ...snapshot.state,
      saveVersion: Math.max(snapshot.saveVersion, CURRENT_SAVE_VERSION),
      realtime: {
        ...base.realtime,
        ...snapshot.state.realtime,
        actionQueue: [],
        pendingAction: null,
        lastFrameDelta: 0
      }
    };
    return {
      saveVersion: Math.max(snapshot.saveVersion, CURRENT_SAVE_VERSION),
      serverTick: state.realtime.tick,
      state
    };
  }
}
